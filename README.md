# skills-cli

skills-cli 是一个用于扫描 Java 项目的命令行工具原型，目标功能：
- 语法/编译检查（javac diagnostic）
- 风格检查（Checkstyle，内置 google_checks.xml）
- 格式化检查与自动修复（google-java-format；可通过 `--auto-fix` 应用）
- 可选集成 SpotBugs / PMD（优先通过目标项目的构建工具运行：Gradle 或 Maven）
- 生成报告（text / json）

Maven 支持
- 当你在项目根目录运行时，skills-cli 会自动检测是否存在 `pom.xml`（判断为 Maven 项目）。
- 若检测到 Maven 项目并且使用了 `--enable-spotbugs` 或 `--enable-pmd`，skills-cli 会尝试调用 `mvn` 并运行相应的插件目标：
  - SpotBugs: `mvn -B spotbugs:spotbugs -DskipTests`
  - PMD: `mvn -B pmd:pmd -DskipTests`
- 如果本地没有 `mvn`（未安装 Maven），skills-cli 会回退为尝试在 PATH 中查找并运行系统的 spotbugs/pmd 可执行程序（原有行为），并在报告中写明未找到 mvn。

快速开始（Gradle / Maven 通用）
1. 构建工具 jar：
   ```bash
   ./gradlew fatJar
   ```
   生成 jar：`build/libs/skills-cli-all.jar`

2. 在目标项目根目录运行检测（只读模式）：
   ```bash
   java -jar /path/to/skills-cli-all.jar --path . --report text --enable-spotbugs true --enable-pmd true
   ```

3. 如果是 Maven 项目（有 pom.xml），上述命令将尝试运行 Maven 插件并把插件输出收集到报告中。

注意与建议
- 在 CI（例如 GitHub Actions）中，建议在 Runner 上先安装或使用提供 JDK/Maven 的环境（actions/setup-java 可设置 Maven）。
- 在启用 `--auto-fix` 前请确保代码已版本控制并已 commit 以便回滚。
- ErrorProne 通常通过编译器插件（在 Gradle/Maven 中配置）；若需要，建议在目标项目的构建脚本中启用 ErrorProne，再由 CI 触发构建（skills-cli 在检测到输出时会将其收集）。

示例：在 Maven 项目中检测并启用 SpotBugs / PMD
```bash
# 在项目根目录运行
java -jar /path/to/skills-cli-all.jar --path . --report text --enable-spotbugs true --enable-pmd true
```

CI 示例（参见 `.github/workflows/scan-target.yml`）提供了 Maven 与 Gradle 两种示范用法。

扩展
- 如果你希望 skills-cli 进一步解析 Maven/Gradle 生成的 XML 报告并把每条 issue 精确映射为 skills-cli 的 Issue（含 file/line/建议修复步骤），我可以继续实现（需要把构建/插件输出 XML 文件路径固定或作为参数）。

安全与兼容
- 对于自动修复（`--auto-fix`），当前仅自动格式化（google-java-format）及少量安全修复。更多语义级自动修复需要引入 Spoon/Refaster 或 ErrorProne 的自动修复规则，属于后续增强。