plugins {
    java
    application
    id("com.github.johnrengelman.shadow") version "8.1.1"
    // Add plugin IDs for docs/quality tasks if needed later
}

group = "com.example"
version = "0.2.0"

repositories {
    mavenCentral()
}

dependencies {
    implementation("info.picocli:picocli:4.7.4")
    implementation("com.google.googlejavaformat:google-java-format:1.21.0")
    implementation("com.puppycrawl.tools:checkstyle:10.13.0")
    implementation("com.fasterxml.jackson.core:jackson-databind:2.15.2")

    // Optional deps - used only if we programmatically integrate later
    implementation("com.github.spotbugs:spotbugs:4.7.3") // note: heavyweight; optional
    implementation("net.sourceforge.pmd:pmd-core:6.56.0")
    // Error Prone usually runs as a javac plugin; we include compilation-time helper only if needed
}

application {
    mainClass.set("com.example.skills.SkillsCli")
}

tasks {
    named<com.github.jengelman.gradle.plugins.shadow.tasks.ShadowJar>("shadowJar") {
        archiveBaseName.set("skills-cli")
        archiveClassifier.set("all")
        archiveVersion.set(project.version.toString())
    }
    register("fatJar") {
        dependsOn("shadowJar")
    }
}