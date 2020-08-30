#!/bin/bash

set -e
npm ci
npm run build:docs & npm run build:dist
