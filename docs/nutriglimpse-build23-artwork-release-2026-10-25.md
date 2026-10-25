# NutriGlimpse build 23: approved artwork release

Released October 25, 2026, 01:20 PM Eastern. **0.1.0 (23)** is Apple **VALID / IN_BETA_TESTING**, available to the existing owner TestFlight group. Installation and physical acceptance are not verified.

## Included

- Approved wide hero: groceries, Nutrition Facts panel, heart/ECG and four faceless healthy-lifestyle silhouettes. Exact approved pixels are bundled; full-width sizing and the native intrinsic-height fix retain the correct aspect ratio.
- Approved plum, lens and leaf app icon; matching web favicon and standard Android icon configuration. Native NutriGlimpse name and tagline remain.
- All current phone features retained: streamed single-product results, health/preferences sharing controls, report/lipid work, news, store selection and both shelf detector models. No prompt or backend deployment was performed for this release.

The frozen archive has **339 source paths**, all matching the server and verified on the Mac before/during compilation. Five paths differ from build 22: app.json (build number/icon settings), home screen, hero, icon and favicon. No source paths were added or removed. Final server source verification still matches the frozen release. Build used an isolated Mac directory and did not restore an older checkout over concurrent work.

## Verification

- Full project checks, **739 core/service tests**, typechecks/lint, tooling, report input, onboarding and news pass.
- **70 photo/UI scenarios in each timing mode** and **10 shelf-grid UI cases** pass. Native/network boundaries are mocked.
- iOS JavaScript export passes. Earlier branding integration includes five responsive browser layout cases and visual inspection; browser checks are not physical phone acceptance.
- Xcode 27.1 on the Mac compiled/exported the distribution IPA. Full codesign verification passes. Minimum iOS **16.4**, arm64, distribution profile, camera/location descriptions, scene lifecycle, privacy settings and required feature markers verified.
- Native 1024px opaque icon pixels exactly match the approved platform icon. Signed IPA contains the exact approved hero, both compiled shelf detectors, news and sharing/streaming code.
- Existing product-card hook warning and Mac simulator-runtime warning remain; the physical-device distribution archive succeeded. An additional optional post-build Mac audit could not reconnect after the signed IPA had already been transferred and verified. No extra access was needed for delivery.

## Release evidence

| Item | Value |
| --- | --- |
| App | 6823645787 / org.cac.healthgrocery.beta0 |
| Version/build | 0.1.0 (23) |
| Submission | 1809c2c3-6f25-407b-968e-9cd209b75583 — FINISHED |
| Apple build | df1639e5-56d1-4ce1-9e16-6708f1461c74 — VALID |
| Internal testing | IN_BETA_TESTING; existing owner group verified |
| External testing | READY_FOR_BETA_SUBMISSION; not externally approved by this release |
| Encryption declaration | usesNonExemptEncryption=false, verified |
| Release notes | en-US, saved and read back |
| IPA bytes | 59,092,042 |
| IPA SHA256 | 965993c3726aa563995496da192990abdc4d9efefa9212a1da08a163ab21aac6 |
| Source archive SHA256 | 9f88e62b1747cceb79c1cfccdcaac2ff4dc9e5e2acd74b91152097a3b9137417 |

Evidence: `artifacts/nutriglimpse-build23-2026-10-25/`. Mac: `/Users/developer/CongressAppChallenge/releases/build23`. Approval/layout evidence: [artwork integration](nutriglimpse-approved-branding-2026-10-25.md).

## Test on the phone

Open TestFlight, choose NutriGlimpse and tap Update for build 23. Check the home-screen icon, complete hero, scroll/scan controls and the existing photo and shelf flows. Physical camera acceptance remains pending. The previously documented nutrient accuracy and explanation-quality issues are not fixed by this artwork-only release.
