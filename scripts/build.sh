#!/bin/bash

set -e
npm ci
npm run format
npm run build:docs & npm run build:dist &
wait
