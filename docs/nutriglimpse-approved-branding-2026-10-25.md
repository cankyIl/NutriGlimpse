# NutriGlimpse approved artwork integration

Date: October 25, 2026 (America/New_York). Scope: approved side-conversation hero and app-icon integration only.

## Status

Integrated into the authoritative project at `/path/to/NutriGlimpse` on `project-server` as user `developer`. **Subsequently built and released as version 0.1.0 (23), Apple VALID / IN_BETA_TESTING.** See the [release record](nutriglimpse-build23-artwork-release-2026-10-25.md). Identifiers are unchanged. Physical iPhone appearance remains to be accepted.

## Approved visual decisions

- NutriGlimpse; tagline: **Know your food. Understand your choices.** Existing native wordmark and tagline stay accessible and separate from the artwork.
- Hero: groceries occupy the left third, a detailed decorative Nutrition Facts panel occupies the center, and the right has a heart/ECG plus faceless running, swimming, exercising and walking silhouettes. The approved art replaces the previous cart. Its sample nutrient values are decorative, never used as scan evidence or clinical rules.
- Icon: approved plum background, ivory camera/lens ring and lime leaf. The original generated artwork is retained with its generation prompts and provenance.

## Integration

- `apps/mobile/assets/grocery-health-hero.png`: byte-identical approved 1672 x 941 image; SHA256 `41dc3de0bbf3fcff0ab4baefdaaa805e3bf71cad228621b576b5a472329c60ce`.
- `apps/mobile/src/app/(tabs)/index.tsx`: matching aspect ratio `1672 / 941`, `resizeMode="contain"`, full-width sizing, and updated image accessibility description. `height: undefined` remains explicit to prevent native bundled-image intrinsic height from expanding/cropping the landing page.
- `apps/mobile/assets/icon.png`: 1024 x 1024 opaque RGB PNG prepared from the accepted original using installed Expo image utilities. SHA256 `cedee0d0673699b23123943824138c571e8b23581189bdba99da556956580bf1`.
- `apps/mobile/assets/favicon.png`: matching 64 x 64 PNG. SHA256 `00789b302ab676ea97c44c42515e789a4b35b566778d237c516bbe8e7339c783`.
- `apps/mobile/app.json`: top-level icon and web favicon already point to these paths. Android now uses the same standard icon; stale adaptive-icon overrides pointing to the original Expo artwork were removed. Native prebuild regenerates icon resources; no generated shared iOS/Android project was hand-edited.
- Existing intrinsic-image-size regression in `ops/photo-ui-check.cjs` now checks the approved dimensions and aspect ratio.

The source change is limited to six files. News, report/lipid work, health sharing, streaming, store selection, camera routes and backend behavior are preserved. No model request, backend deployment/restart, OTA, credentials change, version bump or upload was performed.

## Verification

- Mobile TypeScript check: pass.
- Mobile lint: zero errors; one existing `react-hooks/exhaustive-deps` warning in `AiProductCard.tsx` for `referenceImage`, outside this change.
- Existing photo/home/product-card UI regression: **70 scenarios pass**, with native/network boundaries mocked.
- Expo iOS JavaScript export: **pass, 1405 modules**, approved hero included. This is not signed IPA compilation.
- Installed Expo native icon generators: isolated iOS 1024 RGB icon and all five Android launcher densities generated successfully. Current shared native directories were not modified.
- Production Home rendered through React Native Web at 320, 375, 402 and 768 px widths plus a 375 px / 1.3x text approximation: image loads, correct aspect ratio, no horizontal overflow or browser exceptions, all four checked routes pass. On narrow/large-text screens a short scroll reveals the entire scan cards. Browser shell and state/news/network are mocked; this is not physical iPhone or native Dynamic Type acceptance.
- Screenshots visually inspected at 375/402 px and narrow/large-text full-page layouts. Existing news component remains visible below the scan controls.

## Evidence and next release

Evidence: `artifacts/nutriglimpse-branding-integration-2026-10-25/` contains approved originals, prompts, before/after hashes, backups, the narrow diff, test logs, iOS export, isolated native icon outputs, screen render scripts and screenshots. The initial browser run needed the project's existing library path; the final run passes without a system-package change. The icon verifier was corrected to use this installed Expo version's Android `.webp` outputs.

The subsequent user request to upload was completed in build 23 using a frozen copy of current source, native prebuild, signed Mac compilation and TestFlight verification. Phone appearance and camera acceptance remain to be checked. The original integration checkpoint below artifacts records the earlier source-only stage.
