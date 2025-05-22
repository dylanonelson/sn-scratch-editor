#!/bin/bash

set -e
npm run build
git status --porcelain
npm run test
npm run format:check

echo "✅ Validation successful!"