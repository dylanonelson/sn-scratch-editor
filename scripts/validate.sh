#!/bin/bash

set -e
npm run build
if [[ -n $(git status --porcelain) ]]; then
  echo "❌ Error: There are uncommitted changes in the working directory."
  git status
  exit 1
fi
npm run test
npm run format:check

echo "✅ Validation successful!"