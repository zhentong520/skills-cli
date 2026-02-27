Notes and integration tips
- For SpotBugs/PMD/ErrorProne, the most reliable approach is to configure and run them inside the target project's build (Gradle/Maven), and then collect their XML reports.
- In GitHub Actions, run gradle tasks like: spotbugsMain, pmdMain, compileJava (with ErrorProne plugin configured).
- skills-cli can be used as a light-weight aggregator or on small projects; for deeper logic fixes you should consider writing Refaster/Spoon transformations.