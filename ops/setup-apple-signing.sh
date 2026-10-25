#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ ! -f "$project_root/package.json" ]]; then
  printf '%s\n' 'Run this helper from its checked-out project directory.' >&2
  exit 1
fi
if [[ ! -t 0 || ! -t 1 ]]; then
  printf '%s\n' 'An interactive terminal is required. Connect with ssh -t.' >&2
  exit 1
fi
cd "$project_root/apps/mobile"
export PATH="$project_root/.tools/node-v24.15.0-linux-x64/bin:/usr/bin:/bin"
export npm_config_cache="$project_root/.tools/npm-eas-cache"
printf '%s\n' \
  'This opens the official Expo Apple signing setup for Health & Grocery.' \
  'Enter your Apple password and verification code only in this terminal, never in chat.' \
  'Choose your paid Apple Developer team (not Personal Team).' \
  'Allow creation of the app distribution certificate and provisioning profile if prompted.' \
  'Do not revoke unrelated certificates. Handle any Apple agreement directly in your account.' \
  'This step does not build, submit, publish, invite testers, or purchase a plan.'
exec npm exec --yes --package=eas-cli@25.0.0 -- eas credentials:configure-build --platform ios --profile testflight
