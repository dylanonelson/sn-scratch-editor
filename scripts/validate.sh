#!/bin/bash

set -e
npm run build
test -z "$(git status --porcelain)"
npm run test
npm run format:check

echo "✅ Validation successful!"
