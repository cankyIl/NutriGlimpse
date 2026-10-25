#!/usr/bin/env bash
# Run on the user's Mac after extracting the prepared source bundle.
# Default: read-only preflight. Mutating modes require a foreground terminal.
set -euo pipefail

mode="${1:-check}"
case "$mode" in check|geometry|scan-checks|prepare|open|run) ;; *)
  printf 'Usage: bash ops/mac-shelf-test.sh [check|geometry|scan-checks|prepare|open|run]\n' >&2
  exit 2
esac
if [[ "$(uname -s)" != "Darwin" ]]; then
  printf 'This helper runs on your Mac. It cannot compile or verify iPhone inference on Windows or Linux.\n' >&2
  exit 1
fi
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd -- "$script_dir/.." && pwd)"
mobile_dir="$project_root/apps/mobile"
resource_dir="$mobile_dir/modules/shelf-benchmark/ios/Resources"
cd "$project_root"
[[ -f package-lock.json && -f apps/mobile/app.json && -f vendor/decode-uri-component/provenance.json ]] || {
  printf 'The source bundle is incomplete. Extract a fresh prepared bundle into its own folder.\n' >&2
  exit 1
}
command -v node >/dev/null 2>&1 || { printf 'Install Node.js 24 LTS on this Mac first; this helper does not install tools.\n' >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { printf 'npm is missing. Install the complete Node.js 24 toolchain.\n' >&2; exit 1; }
command -v xcodebuild >/dev/null 2>&1 || { printf 'Install/open Xcode 26.4 or newer and finish its first-run setup.\n' >&2; exit 1; }
if ! xcode_information="$(xcodebuild -version 2>&1)"; then
  printf '%s\nOpen Xcode and complete setup. Select this Xcode in Settings > Locations > Command Line Tools.\n' "$xcode_information" >&2
  exit 1
fi
xcode_version="$(printf '%s\n' "$xcode_information" | awk '/^Xcode / {print $2; exit}')"
node - "$xcode_version" <<'NODE'
const atLeast = (actual, minimum) => {
  const a = actual.split('.').map(Number), b = minimum.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return true;
};
const xcode = process.argv[2];
if (!/^\d+(\.\d+)*$/.test(xcode) || !atLeast(xcode, '26.4')) {
  console.error('Expo SDK 57 requires Xcode 26.4 or newer. Install a compatible Xcode/macOS combination.');
  process.exit(1);
}
if (!atLeast(process.versions.node, '22.13.0')) {
  console.error('Expo SDK 57 requires Node >=22.13.0; this project requires Node >=24.');
  process.exit(1);
}
if (!atLeast(process.versions.node, '24.0.0')) {
  console.error('This project declares Node >=24. Use Node 24 LTS (tested on 24.15.0).');
  process.exit(1);
}
console.log(`Tool versions: Node ${process.versions.node}, Xcode ${xcode}.`);
NODE
if ! xcodebuild -checkFirstLaunchStatus >/dev/null 2>&1; then
  printf 'Open Xcode and complete its first-run license/component setup, then rerun this helper.\n' >&2
  exit 1
fi
node - "$resource_dir" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const resourcePath = process.argv[2];
const expected = [
  ['ShelfSetDiagnostic', 'a5f1ca3a021122e89d2fb3fbb5ee93bbc792fbe935a8152de32e6d107ffebf95'],
  ['ShelfSKU11Diagnostic', 'b7e86554a746c2f02ee0626bcde5b77038b84692c225a642a5a5ebc150f6718a'],
];
try {
  const resourceRoot = fs.realpathSync(resourcePath);
  for (const [name, sourceHash] of expected) {
    const manifest = JSON.parse(fs.readFileSync(path.join(resourceRoot, `${name}.json`), 'utf8'));
    if (manifest.modelName !== name || manifest.inputSize !== 640 ||
        JSON.stringify(manifest.prompts) !== '["product"]' ||
        manifest.trueClassCount !== 1 || manifest.scoreColumnCount !== 80 ||
        manifest.modelFingerprint !== sourceHash || manifest.sourceCheckpointSha256 !== sourceHash ||
        manifest.confidenceThreshold !== 0.25 || manifest.iouThreshold !== 0.5 ||
        JSON.stringify(manifest.zeroPaddingClassLabels) !== JSON.stringify(Array.from({length: 79}, (_, i) => `__padding_${i + 1}`))) {
      throw Error(`${name}: unexpected model metadata or threshold/class contract`);
    }
    const packageRoot = fs.realpathSync(path.join(resourceRoot, `${name}.mlpackage`));
    if (!packageRoot.startsWith(resourceRoot + path.sep) || !fs.statSync(packageRoot).isDirectory()) {
      throw Error(`${name}: model package is outside its resource folder`);
    }
    if (!Array.isArray(manifest.files) || manifest.files.length < 3) throw Error(`${name}: missing model file checksums`);
    const seen = new Set();
    let bytes = 0;
    for (const file of manifest.files) {
      if (typeof file.path !== 'string' || path.isAbsolute(file.path) || seen.has(file.path) ||
          !/^[0-9a-f]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes < 1) {
        throw Error(`${name}: invalid file checksum entry`);
      }
      seen.add(file.path);
      const filePath = fs.realpathSync(path.join(packageRoot, file.path));
      if (!filePath.startsWith(packageRoot + path.sep)) throw Error(`${name}: file path escapes package`);
      const data = fs.readFileSync(filePath);
      if (data.length !== file.bytes || crypto.createHash('sha256').update(data).digest('hex') !== file.sha256) {
        throw Error(`${name}: size or SHA256 mismatch for ${file.path}`);
      }
      bytes += data.length;
    }
    for (const required of ['Manifest.json', 'Data/com.apple.CoreML/model.mlmodel', 'Data/com.apple.CoreML/weights/weight.bin']) {
      if (!seen.has(required)) throw Error(`${name}: missing required payload ${required}`);
    }
    if (!Array.isArray(manifest.notices) || !manifest.notices.length) throw Error(`${name}: missing source/license notices`);
    for (const notice of manifest.notices) {
      if (typeof notice !== 'string' || path.basename(notice) !== notice) throw Error(`${name}: invalid notice path`);
      const noticePath = fs.realpathSync(path.join(resourceRoot, notice));
      if (!noticePath.startsWith(resourceRoot + path.sep) || !fs.statSync(noticePath).isFile()) throw Error(`${name}: missing notice ${notice}`);
    }
    console.log(`${name}: ${manifest.files.length} model files match their manifests (${bytes.toLocaleString()} bytes); 640 RGB, product class, 79 zero-score padding classes.`);
  }
  console.log('Both comparison models are present. The legacy YOLOE model is not required or selected.');
} catch (error) {
  console.error(`Prepared comparison bundle is incomplete or inconsistent: ${error.message}`);
  process.exit(1);
}
NODE
printf 'Project: %s\n' "$project_root"
if command -v pod >/dev/null 2>&1; then
  printf 'CocoaPods: %s\n' "$(pod --version)"
else
  printf 'CocoaPods is not installed. The prepare step requires it; see the installation guide.\n'
fi
if [[ "$mode" == "check" ]]; then
  printf 'Preflight passed. This is not a Swift compilation, iPhone installation, or performance result.\n'
  printf 'Optional Swift preprocessing check: bash ops/mac-shelf-test.sh geometry\n'
  printf 'Optional reader/ownership check: bash ops/mac-shelf-test.sh scan-checks\n'
  printf 'Next: bash ops/mac-shelf-test.sh prepare\n'
  exit 0
fi
if [[ ! -t 0 || ! -t 1 ]]; then
  printf 'Run geometry/scan-checks/prepare/open/run yourself in a foreground Mac Terminal. No background installation or account login is performed.\n' >&2
  exit 1
fi
if [[ "$mode" == "geometry" ]]; then
  module_dir="$mobile_dir/modules/shelf-benchmark"
  [[ -f "$module_dir/ios/ShelfLetterboxGeometry.swift" &&
     -f "$module_dir/tests/LetterboxFixtureCheck.swift" &&
     -f "$module_dir/tests/letterbox-reference.json" ]] || {
    printf 'The Swift geometry test fixtures are missing. Extract the complete comparison bundle.\n' >&2
    exit 1
  }
  geometry_dir="$(mktemp -d "${TMPDIR:-/tmp}/healthgrocery-geometry.XXXXXX")"
  trap 'rm -f -- "$geometry_dir/letterbox-check"
        rmdir -- "$geometry_dir"' EXIT
  xcrun swiftc -O "$module_dir/ios/ShelfLetterboxGeometry.swift" \
    "$module_dir/tests/LetterboxFixtureCheck.swift" -o "$geometry_dir/letterbox-check"
  "$geometry_dir/letterbox-check" "$module_dir/tests/letterbox-reference.json"
  printf 'This checks Swift geometry/pixel helpers only; it does not execute the camera, Core ML, or the app.\n'
  exit 0
fi
if [[ "$mode" == "scan-checks" ]]; then
  module_dir="$mobile_dir/modules/shelf-benchmark"
  [[ -f "$module_dir/ios/ShelfWorkAdmission.swift" &&
     -f "$module_dir/ios/ShelfScanReadPlanner.swift" &&
     -f "$module_dir/tests/ScanPlannerCheck.swift" ]] || {
    printf 'The reader test fixtures are missing. Extract the complete Shelf Scan source bundle.\n' >&2
    exit 1
  }
  scan_check_dir="$(mktemp -d "${TMPDIR:-/tmp}/healthgrocery-reader.XXXXXX")"
  trap 'rm -f -- "$scan_check_dir/reader-check"
        rmdir -- "$scan_check_dir"' EXIT
  xcrun swiftc -O "$module_dir/ios/ShelfWorkAdmission.swift" \
    "$module_dir/ios/ShelfScanReadPlanner.swift" \
    "$module_dir/tests/ScanPlannerCheck.swift" -o "$scan_check_dir/reader-check"
  "$scan_check_dir/reader-check"
  printf 'This checks helper ownership, scheduling and evidence bounds; it does not execute Apple Vision, the camera, Core ML or the app.\n'
  exit 0
fi
export EXPO_PUBLIC_BUILD_STAGE=beta0
if [[ "$mode" == "prepare" ]]; then
  command -v pod >/dev/null 2>&1 || { printf 'Install CocoaPods yourself first: https://guides.cocoapods.org/using/getting-started.html\n' >&2; exit 1; }
  printf 'Installing this bundle\047s locked dependencies, including its checked-in postinstall patch.\n'
  npm ci --no-audit --no-fund
  cd "$mobile_dir"
  if [[ ! -d ios ]]; then
    # Explicit pod install below avoids Expo trying to install missing toolchains.
    node ../../node_modules/expo/bin/cli prebuild --platform ios --no-install
  else
    printf 'Keeping the existing iOS project and its local signing settings. No --clean regeneration.\n'
  fi
  (cd ios && pod install)
fi
shopt -s nullglob
workspaces=("$mobile_dir"/ios/*.xcworkspace)
if [[ ${#workspaces[@]} -ne 1 ]]; then
  printf 'Expected one generated iOS workspace. Run prepare first; inspect the source folder if this persists.\n' >&2
  exit 1
fi
if [[ "$mode" == "prepare" || "$mode" == "open" ]]; then
  open "${workspaces[0]}"
  printf 'In Xcode: select the app target > Signing & Capabilities > your Personal Team (or active paid team).\n'
  printf 'Then select your physical iPhone, set Run to Release, disable Debug executable, and press Run.\n'
  printf 'The helper does not choose a team, log in, upload source, or buy a build.\n'
else
  [[ -f "$project_root/node_modules/expo/bin/cli" ]] || { printf 'Dependencies missing; run prepare first.\n' >&2; exit 1; }
  printf 'Building a Release app for a device you choose. Complete signing in Xcode first.\n'
  cd "$mobile_dir"
  node ../../node_modules/expo/bin/cli run:ios --device --configuration Release
fi
