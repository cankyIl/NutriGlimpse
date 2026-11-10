#!/usr/bin/env bash
set -euo pipefail
cd "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
source ops/remote-env.sh
export GROCERY_PHOTO_ASSESSMENT_ENABLED=true
export GROCERY_PHOTO_ASSESSMENT_CONSENT=product-photo-assessment-2026-10-16.1
export GROCERY_BUILD_STAGE=production
export GROCERY_BETA_DIAGNOSTICS=false
# Default for consented version-6 single-product clients; legacy and shelf routes are unchanged.
export GROCERY_GEMINI_ENABLED=true
export GROCERY_DUAL_PHOTO_CONSENT=product-photo-dual-2026-10-17.1
exec node --experimental-strip-types apps/service/src/startBeta.ts
