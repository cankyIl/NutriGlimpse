#!/usr/bin/env bash
set -e
cd "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
source ops/remote-env.sh
export CONGRESS_FICTIONAL_AI=1
exec node --experimental-strip-types apps/service/src/start.ts
