#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ZIP_NAME="skills-cli-initial.zip"

echo "Bootstrapping repo in ${ROOT_DIR}"

git init
git add -A
git commit -m "chore: initial commit - skills-cli scaffold" || true

# create zip
cd "${ROOT_DIR}"
zip -r "${ZIP_NAME}" . -x .git/\* || true

echo "Created zip: ${ROOT_DIR}/${ZIP_NAME}"
echo "Done. You can now push to remote:"
echo "  git remote add origin git@github.com:OWNER/skills-cli.git"
echo "  git branch -M main"
echo "  git push -u origin main"