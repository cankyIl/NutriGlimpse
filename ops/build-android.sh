#!/usr/bin/env bash
set -euo pipefail
cd "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
source ops/remote-env.sh
export CMAKE_BUILD_PARALLEL_LEVEL=2
cd apps/mobile
CI=1 npx expo prebuild --platform android --no-install
cd android
chmod u+x gradlew
./gradlew assembleDebug --no-daemon --max-workers=2 -PreactNativeArchitectures=arm64-v8a
