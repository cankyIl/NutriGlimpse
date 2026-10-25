# Build 11: grocery landing page and current side-chat photo review

**Updated:** October 17, 2026 (America/New_York)  
**Status:** TestFlight **0.1.0 (11)** is compiled, uploaded, processed VALID and available to the existing owner group. Physical phone acceptance remains pending.

## Included

- Approved groceries → nutrition → heart-health hero: produce plus cereal, chips, pasta, sauce, cheese and butter; a realistic Nutrition Facts panel highlighting sugar green and sodium red; heart with ECG. No “Illustrative label” footer. The static artwork is decorative, not a scan or personalized rating.
- Bundled 1448 × 1086 PNG (2,072,226 bytes), proportional display with rounded corners and an accessible description. No added network request or account requirement. The full image is retained without cropping its table or cart.
- Compact introduction, bold explanatory line and white rounded selected-store card. Actual selected store/address remains dynamic; Trader Joe’s is not hard-coded. Both camera actions, navigation, news and all lower links remain.
- Side-chat DEV-25: GPT-6 Luna and Claude Haiku 5.5 review, fresh consent naming both providers, early original preview, validated candidate union and disagreement/fallback notices. Already-deployed backend stays unchanged. See [DEV-25](63-dual-model-review-preparation.md).
- Prior source toggles, nearby results, screenshots, quiet camera, My Needs, news, timing, privacy/clinical gates and both shelf detectors retained. No OTA, backend restart or paid AI/search call made for this release.

## Verification

- Full combined check: 503 core/service tests, nine tooling tests, ten input-adapter tests and 51 component scenarios with Beta 0 timing enabled. Typecheck and lint pass.
- 51 component scenarios also pass with timing off; My Needs and four news operator checks pass.
- Production home rendered through React Native Web at 390 × 844, 320 × 740 and 768 × 1024: artwork loaded offline, no horizontal overflow/runtime errors, product/shelf/store/privacy routes pass. On 390px preview both camera tiles fit above the bottom bar; smaller screens scroll. State/network/router and status/tab shell are mocked. This is not physical iPhone verification.
- iOS JavaScript export passes, including the bundled PNG. Final release source is recorded and compared with build 10: no removed files; dual-review client and approved artwork included. Native compilation, signed-package inspection and Apple processing/owner access subsequently passed as recorded below.

## Release evidence

Final bundled asset: `/path/to/NutriGlimpse/apps/mobile/assets/grocery-health-hero.png`.

`artifacts/iphone-build11-2026-10-17/` contains source hashes/archive, prior-build comparison, checks, layout screenshots, asset prompt and release helpers. Built-in image generation produced the approved artwork. The final prompt is preserved in `artwork-prompt.txt`; no app API credits were used for artwork or this verification.

## Still pending

- Physical iPhone acceptance: update from TestFlight, inspect the home illustration and camera routes, accept the fresh two-provider disclosure if desired, and exercise normal photo results/source toggles/store cards.
- Scan consistency/empty-candidate recovery (FB-36), selected-store preference (FB-37), shelf redesign (FB-35), and other active plan gates are not marked complete by this visual release.
- Temporary Beta 0 timing must be removed before Beta 1. Personal health/profile/lab transmission and personalized medical recommendations remain disabled.

## Existing release caveat

Expo Doctor reports 20/21 checks passing, with the same ten Expo patch-version differences as build 10. Dependency versions and lockfile were preserved; native compilation succeeds. This is a tracked maintenance warning, not a clean Expo Doctor result.

## Upload checkpoint — October 17, 2026

- EAS native build `c11e1da9-4c9c-48d7-a29f-ac058160be00` completed successfully.
- Signed IPA: 58,299,826 bytes; SHA-256 `4958c605dc156b5b2d3540d1a51d3331fbabc2321f79c91b718d58f7601ddf78`.
- Submission `cba3e7b9-2b5e-4520-aff4-511c9a2fca92` completed at 9:17 p.m. Eastern. No duplicate submission was made.
- Apple subsequently processed build 11 as VALID / IN_BETA_TESTING at 9:31 p.m. Eastern. Existing owner-group availability and the false non-exempt-encryption declaration are verified; no new tester invitation was sent.
- At the build-11 release checkpoint, the ledger contained fixed reservation amounts, not actual billing. **Current backend policy, October 18:** the user manages spending, and the artificial dollar cutoff (including the subsequent $10/$9 setting) is removed. New records count dispatch attempts without assigning a dollar amount. Historical entries remain intact; request limits, timeouts and no automatic paid retries remain. All 200 service tests, two operator tests, service typecheck and public health/capability checks pass. No paid model calls or iPhone rebuild were made for this correction. TestFlight build 11 remains current. Evidence: artifacts/user-managed-budget-2026-10-18/verification.json.

## Verified delivery

- Verified at October 17, 2026 09:31 PM EDT.
- EAS build: `c11e1da9-4c9c-48d7-a29f-ac058160be00` — FINISHED. Submission: `cba3e7b9-2b5e-4520-aff4-511c9a2fca92` — FINISHED.
- Apple build: `1e3ab95d-90d1-4d32-8f91-9e154746c5ad` — VALID / IN_BETA_TESTING. Existing owner group ready; no new tester invitation sent. External state: READY_FOR_BETA_SUBMISSION.
- Version 0.1.0 (11), `org.cac.healthgrocery.beta0`, arm64, iphoneos27.0, minimum iOS 16.4. IPA 58299826 bytes; SHA-256 `4958c605dc156b5b2d3540d1a51d3331fbabc2321f79c91b718d58f7601ddf78`.
- Store provisioning profile, team/expiry, ZIP integrity, permission descriptions, both shelf models, quiet-camera/timing selectors, new artwork bytes and dual-review consent/client markers verified. Encryption declaration false confirmed with Apple. Full app code-sign trust-chain validation was not performed on Linux; Apple accepted processing.
- 309 frozen source files still match the workspace; no removed build-10 source files. All side-chat files present before this change were preserved. Exact release notes verified. Backend/portfolio remain healthy; no backend restart, OTA or paid model/search call for this release.
- Project plan, feedback, design specification and dual-review/release documents mirrored to the laptop with matching SHA-256 hashes. Phone installation/acceptance is not claimed.

## October 18 native correction

The user’s iPhone screenshot exposed intrinsic-height image overflow missed by the browser preview. Build 12 explicitly clears the inherited PNG height; native Yoga reproduces the old failure and verifies corrected sizes. The full composition is preserved. Build 12 is now available to the existing owner TestFlight group; physical acceptance remains pending. [Correction and release evidence](65-build12-native-home-image-fix.md).
