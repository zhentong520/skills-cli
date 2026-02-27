# skills-cli

skills-cli 是一个用于扫描 Java 项目的命令行工具原型，目标功能：
- 语法/编译检查（javac diagnostic）
- 风格检查（Checkstyle，内置 google_checks.xml）
- 格式化检查与自动修复（google-java-format；可通过 `--auto-fix` 应用）
- 可选集成 SpotBugs / PMD / ErrorProne（说明与 CI 示例）
- 生成报告（text / json）

快速开始
1. 将本仓库文件保存到本地目录 `skills-cli/`
2. 构建可执行 fat jar：
   ```bash
   ./gradlew fatJar
   ```
   生成 jar：`build/libs/skills-cli-all.jar`
3. 在目标 Java 项目根目录运行检测（只读模式）：
   ```bash
   java -jar /path/to/skills-cli-all.jar --path . --report text
   ```
4. 自动修复（仅格式化等安全改动）：
   ```bash
   git add -A && git commit -m "WIP" || true
   java -jar /path/to/skills-cli-all.jar --path . --auto-fix --fix-level safe --report text
   ```

关于 SpotBugs / PMD / ErrorProne
- 推荐在目标项目中通过 Gradle/Maven 插件直接运行（最准确、最完整）。
- 我在仓库中附带了 GitHub Actions 示例（`.github/workflows/scan-target.yml`），展示如何在 CI 中同时运行：
  - Gradle SpotBugs plugin
  - PMD plugin
  - ErrorProne（通过 `net.ltgt.errorprone` 插件或在 CI 中添加 Error Prone 编译器参数）
- skills-cli 自身会尝试检测并调用系统上已安装的 `spotbugs` / `pmd` 命令（若可用）并解析输出；若未安装，CI 示例展示如何在 Runner 上安装并运行。

目录结构（主要文件）
- build.gradle.kts
- settings.gradle.kts
- src/main/java/com/example/skills/SkillsCli.java
- src/main/resources/google_checks.xml
- .github/workflows/ci.yml
- .github/workflows/scan-target.yml
- scripts/bootstrap_repo.sh
- LICENSE (MIT)
- .gitignore
- README.md (本文件)

如何把这些文件变成 Git 仓库并生成 zip（一步到位）
在含有上述文件的目录中运行：
```bash
chmod +x scripts/bootstrap_repo.sh
./scripts/bootstrap_repo.sh
```
该脚本会：
- 初始化 git 仓库
- 创建初始提交
- 生成 `skills-cli-initial.zip` 打包文件

扩展与后续计划
- 使用 Spoon / Refaster 编写可复用的自动修复规则（用于更复杂的逻辑修复）。
- 在 CI 中把 skills-cli 作为检查工具并在 PR 上注释（可用 GitHub Action）。
- 提供 VS Code / IntelliJ 插件包装以在编辑器中实时运行检查。

安全提示
- 使用 `--auto-fix` 前请务必先 commit 以便回滚。
- 某些自动修复（将来扩展）可能修改语义，请在测试环境验证。

如果你同意，我可以：
- 把这些文件打包为一个 zip 并在这儿把打包脚本与生成说明发给你（已完成：scripts/bootstrap_repo.sh）。
- 或者我可以将内容格式化为一个 Git patch（git diff）贴出；或者直接帮你把 repo 推到 GitHub（需要你提供目标 owner/repo 名称并授权我进行写入，或你允许我帮你生成 push 命令脚本）。

请选择你下一步希望我做什么（例如：生成 patch 内容，或者直接给出可复制到文件系统的全部文件，我已经把文件都列出，接下来你想要哪种交付形式？）。