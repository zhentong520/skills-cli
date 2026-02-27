#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="${ROOT_DIR}/build"
JAR_NAME="skills-cli-all.jar"
ZIP_NAME="skills-cli-release.zip"

echo "Packaging skills-cli release in ${ROOT_DIR}"

# Build fat jar
echo "Building fat jar..."
cd "${ROOT_DIR}"
./gradlew fatJar --no-daemon

# Locate built jar
JAR_PATH="$(ls ${BUILD_DIR}/libs/*all.jar 2>/dev/null || true)"
if [ -z "$JAR_PATH" ]; then
  echo "Error: fat jar not found under ${BUILD_DIR}/libs/"
  exit 1
fi

# prepare temp folder
TMPDIR="$(mktemp -d)"
mkdir -p "${TMPDIR}/skills-cli"
cp -r README.md LICENSE build.gradle.kts settings.gradle.kts src scripts .gitignore "${TMPDIR}/skills-cli/" || true
cp "${JAR_PATH}" "${TMPDIR}/skills-cli/${JAR_NAME}"

# create zip
cd "${TMPDIR}"
zip -r "${ROOT_DIR}/${ZIP_NAME}" skills-cli

# cleanup
rm -rf "${TMPDIR}"

echo "Created zip: ${ROOT_DIR}/${ZIP_NAME}"
echo "You can now upload or distribute this zip."