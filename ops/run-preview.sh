#!/usr/bin/env bash
set -e
cd /path/to/NutriGlimpse
source ops/remote-env.sh
cd apps/mobile
exec npx expo start --web --localhost --port 8081 --max-workers 2
