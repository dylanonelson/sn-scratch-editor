#!/bin/bash

set -e
npm run build
git status --porcelain
firebase deploy
