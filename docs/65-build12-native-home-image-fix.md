# Build 12: native home artwork sizing correction

**Updated:** October 18, 2026 (America/New_York)  
**Status:** Build **0.1.0 (12)** is compiled, uploaded, Apple VALID and available to the existing owner group in TestFlight. Physical iPhone acceptance of the fix remains pending.

## Report and root cause

The user's physical iPhone screenshot shows a close-up of the cart wheel, with the image overflowing horizontally and taking excessive vertical space. This is a confirmed build-11 layout defect; its prior browser preview was not sufficient native visual verification.

React Native 0.86.3's Image.ios.js prepends the bundled asset's intrinsic dimensions to the supplied styles. Our 1448 × 1086 asset supplied a 1086-point height that the percentage-width/aspect-ratio style did not clear. The bundled native Yoga engine reproduces a 1448 × 1086 layout inside 272-, 342- and 560-point containers.

## Correction

Explicitly clear the inherited image height, retaining 100% container width, the 4:3 ratio and contain mode. No artwork replacement or crop, model/prompt/backend change or redesign. The same native Yoga cases now produce 272 × 204, 342 × 256.5 and 560 × 420, respectively.

The PNG fixture loader now supplies real asset dimensions. The production Home component regression applies the native intrinsic dimensions before its styles and verifies that inherited height is cleared. The regression prevents the original one-line omission from passing unnoticed again.

The full 309-file cloud archive is frozen. Its only changes from build 11 are home image sizing and iOS build number 12. All side-chat dual-review, early preview, nearby stores, news, My Needs, camera and source-toggle features, privacy boundaries and both shelf detectors remain.

## Verification and limits

- Exact native Yoga source bundled with React Native compiled locally; three pre-fix failures and three corrected sizes reproduced. Evidence: artifacts/iphone-build12-2026-10-18/native-image-layout.jsonl.
- 503 core/service tests, nine tooling tests, ten adapter tests; 52 screen checks in each timing mode. Typecheck and lint pass.
- iOS JavaScript export passes; same PNG asset retained.
- Production home browser render at 390 × 844, 320 × 740 and 768 × 1024: full artwork, no horizontal overflow, four routes work. Updated shell includes the actual beta banner and 110px tab area. Small screens and larger text require vertical scrolling; this check does not assert all buttons fit above the fold.
- Browser rendering is not a physical iPhone test. Native Yoga verifies layout dimensions, not iOS image drawing or touch behavior. Physical phone verification remains pending.

## Release

EAS build: c883ba64-5943-484e-93b7-8c1cec491b19  
Version: 0.1.0 (12)  
Native compile, IPA inspection, upload and Apple owner eligibility: **verified**.
- EAS submission: 67d1eb45-c8e8-43ad-b841-9322368ce3d4 - FINISHED.
- Apple build: c78f112f-6c8e-4ec5-a3e3-1749d9328f87 - VALID / IN_BETA_TESTING.
- Existing owner group: verified ready; no new tester invited.
- IPA: 58,299,852 bytes; SHA256 cec58c4359637f431c70664a3fa3175a96bddcf43a01ff22127dea6365f3d2a3.
- Artwork bytes, earlier scan/side-chat markers, arm64 native binary, distribution provisioning, both shelf detector models and encryption declaration verified.
- Complete app codesign trust-chain validation is not performed on Linux; Apple VALID processing and the checked provisioning/package evidence are recorded separately.
- Source comparison: 309 files preserved; only home sizing and build number differ from build 11.
- Verified at UTC 2026-10-18T05:07:32.164Z (user-facing date: October 18, America/New_York).

No paid model calls, backend deployment, OTA update or new tester invitation were made for this fix. The user-managed API-spending policy remains in place.

## Phone acceptance

Update to build 12 when available in TestFlight, open Scan and scroll to the top. Verify that the entire cart, Nutrition Facts panel and heart/ECG fit within the rounded image area. Verify both camera tiles remain reachable by scrolling and open their expected routes. Check larger text settings as well.

References: [React Native 0.86 static image sizing](https://reactnative.dev/docs/0.86/images), [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/). Local installed Image.ios.js and bundled Yoga source establish the reproduced behavior.
