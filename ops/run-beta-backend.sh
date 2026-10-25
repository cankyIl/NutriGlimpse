#!/usr/bin/env bash
set -euo pipefail
cd /path/to/NutriGlimpse
source ops/remote-env.sh
export GROCERY_PHOTO_ASSESSMENT_ENABLED=true
export GROCERY_PHOTO_ASSESSMENT_CONSENT=product-photo-assessment-2026-10-16.1
export GROCERY_BETA_DIAGNOSTICS=true
# Default for consented version-6 single-product clients; legacy and shelf routes are unchanged.
export GROCERY_GEMINI_ENABLED=true
export GROCERY_DUAL_PHOTO_CONSENT=product-photo-dual-2026-10-17.1
# TEMPORARY Beta 0 timing: remove both settings and hooks before Beta 1.
export GROCERY_BUILD_STAGE=beta0
export GROCERY_BETA_SCAN_TIMING=true
exec node --experimental-strip-types apps/service/src/startBeta.ts
