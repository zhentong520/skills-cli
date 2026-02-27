/**
 * 原型说明：
 * - 运行 maven 的常用静态分析插件来生成报告（Checkstyle/PMD/SpotBugs）
 * - 解析报告（此处为简化演示，仅用占位示例），并对每个问题构建 prompt 发送给 OpenAI
 * - OpenAI 返回一个统一 diff（unified patch），脚本尝试应用并运行 mvn test
 * - 如果测试通过则创建分支并打开 PR（使用 GITHUB_TOKEN）
 *
 * 注意：这是原型实现，生产环境请增强：
 * - 更完善的报告解析器（解析 XML/HTML 报告以收集真正的问题）
 * - 限制自动修复类型（例如只修复 style 或 compiler error）
 * - 并发/速率限制、错误回滚、审计记录
 */

import { execSync } from "child_process";
import fs from "fs";
import fetch from "node-fetch";
import { Octokit } from "@octokit/rest";

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const DRY_RUN = (process.env.DRY_RUN || "true") === "true";
const repo = process.env.GITHUB_REPOSITORY || ""; // e.g. owner/repo in GH Actions
const actor = process.env.GITHUB_ACTOR || "github-actions";

if (!OPENAI_KEY) {
  console.error("OPENAI_API_KEY is not set. Put it in repository secrets.");
  process.exit(1);
}
if (!GITHUB_TOKEN) {
  console.error("GITHUB_TOKEN is not set. Put it in repository secrets.");
  process.exit(1);
}

function run(cmd, opts = {}) {
  console.log(`$ ${cmd}`);
  return execSync(cmd, { stdio: "inherit", ...opts });
}

async function callOpenAI(prompt) {
  const url = "https://api.openai.com/v1/chat/completions";
  const body = {
    model: "gpt-4o-mini", // 可根据需要替换
    messages: [{ role: "user", content: prompt }],
    temperature: 0.0,
    max_tokens: 1500
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function main() {
  // 1) Build & run analysis: 生成检查报告（可按需扩展到 maven plugin 调用）
  try {
    // 先做一次编译以发现编译错误
    run("mvn -B -DskipTests=true -q package || true");
  } catch (e) {
    // 忽略，这里我们可能想收集编译错误并尝试修复
  }

  // 运行常见静态分析插件，生成报告文件
  console.log("Running static analysis tools...");
  try {
    run("mvn -B checkstyle:checkstyle pmd:pmd spotbugs:spotbugs -q || true");
  } catch (e) {
    // 忽略失败让后续脚本处理报告
  }

  // 2) 报告解析（原型：此处用简化逻辑找出 Java 编译错误或 TODOS）
  // 真实实现应解析 target/site/checkstyle.html, target/pmd.xml, target/spotbugsXml.xml 等
  const issues = [];

  // 示例占位：扫描 repo 中编译失败的文件提示或 TODO 注释作为“问题”
  // 这里只是示范，建议你用报告解析替换
  const files = execSync("git ls-files '*.java'").toString().trim().split("\n").filter(Boolean);
  for (const f of files) {
    const text = fs.readFileSync(f, "utf8");
    if (text.includes("TODO") || text.includes("FIXME")) {
      issues.push({
        file: f,
        type: "todo",
        message: "Found TODO or FIXME comment"
      });
    }
  }

  // 如果没有自动收集的问题，示范性地继续（真实仓库会有更多）
  if (issues.length === 0) {
    console.log("No TODO-style issues found by quick scan. You should parse analysis reports for real issues.");
    // 退出或继续依赖 manual mode
    // process.exit(0);
  }

  // 3) 对每个 issue 构造 prompt 让 LLM 返回补丁（要求返回 unified diff）
  // Prompt 模板（尽量在 prompt 中限制操作范围，如只修改某行、仅格式化、或修复编译错误）
  const promptTemplate = (filePath, snippet, issueMsg) => `
You are a Java expert and code fixer. Given the following file and an identified issue, produce a patch in unified diff format (git apply compatible).
- Only change the minimal code necessary to fix the issue.
- Preserve code style where possible. Run google-java-format after changes (I will apply it).
- Do not change unrelated files.
- If this issue is only a comment (TODO/FIXME), add a short suggested implementation or a clear comment explanation, but avoid modifying business logic arbitrarily.
Return ONLY the patch in unified diff format.

File: ${filePath}
Issue: ${issueMsg}

File contents (context):
\`\`\`java
${snippet}
\`\`\`
`;

  // 4) For each issue, call OpenAI and try to apply
  const appliedPatches = [];
  for (const it of issues) {
    console.log("Processing issue:", it);
    const content = fs.readFileSync(it.file, "utf8");
    // Provide a limited window around TODO for prompt size safety:
    const lines = content.split("\n");
    const idx = lines.findIndex(l => l.includes("TODO") || l.includes("FIXME"));
    const start = Math.max(0, idx - 15);
    const end = Math.min(lines.length, idx + 15);
    const snippet = lines.slice(start, end).join("\n");

    const prompt = promptTemplate(it.file, snippet, it.message);

    console.log("Calling OpenAI to generate patch for", it.file);
    let patch;
    try {
      patch = await callOpenAI(prompt);
    } catch (err) {
      console.error("OpenAI call failed:", err);
      continue;
    }

    // Basic safety: ensure patch mentions the target file path
    if (!patch.includes(it.file)) {
      console.warn("Patch does not reference file; skipping. Patch preview:", patch.slice(0, 400));
      continue;
    }

    // Write patch to file and attempt to apply
    const patchFile = `/tmp/patch-${Date.now()}.diff`;
    fs.writeFileSync(patchFile, patch, "utf8");
    try {
      run(`git apply --whitespace=fix ${patchFile}`);
    } catch (err) {
      console.error("Failed to apply patch; skipping. Error:", err);
      continue;
    }

    // Run formatter
    try {
      run(`java -jar /usr/local/bin/google-java-format.jar -r ${it.file}`);
    } catch (e) {
      console.warn("google-java-format failed or not applicable:", e);
    }

    // Run tests
    let testsOk = false;
    try {
      run("mvn -B test -q");
      testsOk = true;
    } catch (e) {
      console.warn("mvn test failed after applying patch:", e);
      // revert changes
      run("git checkout -- .");
    }

    if (testsOk) {
      appliedPatches.push({ file: it.file, patchFile });
    }
  }

  if (appliedPatches.length === 0) {
    console.log("No patches applied successfully.");
    return;
  }

  // 5) Commit, push new branch and open PR if not DRY_RUN
  const branchName = `auto-fix/${new Date().toISOString().replace(/[:.]/g, "-")}`;
  run(`git checkout -b ${branchName}`);
  run('git add -A');
  run(`git commit -m "Auto-fix: apply LLM suggested patches" || echo "no changes to commit"`);

  if (DRY_RUN) {
    console.log("DRY_RUN enabled — not pushing changes. Applied patches:", appliedPatches);
    return;
  }

  // push & create PR
  run(`git push origin HEAD:${branchName}`);

  const octokit = new Octokit({ auth: GITHUB_TOKEN });
  const [owner, repoName] = repo.split("/");
  const prTitle = `Auto-fix: LLM suggested fixes (${new Date().toISOString().split("T")[0]})`;
  const prBody = `This PR applies automatic fixes suggested by the auto-fix workflow. Please review carefully.\n\nApplied patches:\n` + appliedPatches.map(p=>`- ${p.file}`).join("\n");

  const { data: pr } = await octokit.pulls.create({
    owner,
    repo: repoName,
    title: prTitle,
    head: branchName,
    base: "main",
    body: prBody
  });
  console.log("Created PR:", pr.html_url);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});