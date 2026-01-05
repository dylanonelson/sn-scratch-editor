#!/bin/bash

set -e
npm run build
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Build produced uncommitted changes"
  exit 1
fi
npm run format:check
npm run test

echo "✅ Validation successful!"
