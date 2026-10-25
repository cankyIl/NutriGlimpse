#!/usr/bin/env bash
set -e
cd /path/to/NutriGlimpse
source ops/remote-env.sh
export CONGRESS_FICTIONAL_AI=1
exec node --experimental-strip-types apps/service/src/start.ts
