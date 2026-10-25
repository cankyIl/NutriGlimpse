#!/usr/bin/env bash
set -e
cd "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
source ops/remote-env.sh
cd apps/mobile
exec npx expo start --web --localhost --port 8081 --max-workers 2
