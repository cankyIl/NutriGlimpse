# Build 10 — sodium explanations and nearby store listings

**Date:** October 17, 2026  
**Status:** **0.1.0 (10) is available in TestFlight to the existing owner group.** Apple VALID / IN_BETA_TESTING and owner access verified. Installation and physical acceptance remain pending.

## Included scope

- DEV-22 / FB-33: the phone now uses comparison policy category-comparison-2026-10-17.3. Sodium-first alternative explanations include candidates that cross from at least 460 mg to below 460 mg at equal original serving weight. Other nutrient/dietary checks and absolute rating colors stay in place.
- DEV-23 / FB-34: every accepted alternative starts an independent nearby-store request. Each card updates separately; food facts, images and explanations stay usable. Results distinguish reported stock/pickup from unconfirmed listings. Selected-store or approximate-location sharing is explained in Privacy and the native permission purpose.
- Retained: captured-photo and early identity previews, checked nutrition before colors, up to three passing alternatives, compact provider response, product images, card-specific USDA/OFF toggle, news, My Needs, screenshots, supported quiet capture and temporary Beta 0 timing.
- Both shelf detectors retained under the user's decision. Permission/source-publication decision remains deferred, not cleared.
- Personalized medical recommendations remain disabled. No new photo/model call, quota increase, backend deployment or OTA update is part of this release.

## Verification

- 487 core/service tests, nine tooling tests, ten input adapters; typecheck and lint pass.
- 47 production-component scenarios pass with timing off and on. Includes sodium-first explanations, equal-serving safeguards and independent availability request/completion/cancellation/failure behavior.
- My Needs checks, four food-news operator tests and the Beta 0 timing release guard pass.
- iOS JavaScript/Hermes export passes.
- Expo Doctor reports 20/21 checks passing, with the existing SDK patch-version mismatch warning across ten packages. The dependency lockfile is unchanged from build 9. The exact package list is recorded in expo-doctor-warning.json; this is a tracked warning, not a fully clean Doctor result.
- Frozen source contains 305 files, all matching the inspected cloud archive; no secrets/private data included. Compared with build 9: five modified files and three new files, no removals.
- Native cloud compilation succeeds. IPA inspection verifies version 10, store distribution profile/team, arm64, both shelf models, sodium-policy/nearby-store/early-preview markers, location-purpose text, no background location and retained screenshot/quiet-capture/timing features. Apple processing is VALID, owner group is IN_BETA_TESTING and exact-build release notes are verified.
- Public health and v1/v2/v3 photo capabilities and portfolio returned HTTP 200. Backend remained running from the prior side-chat deployment; this release did not restart it.
- ZIP CRC and provisioning CMS signature pass; full app signing/issuer-chain verification was not performed on Linux. Apple accepted the signed build. No physical camera or inventory acceptance is inferred.

Evidence: artifacts/iphone-build10-2026-10-17/. Existing backend verification: [sodium policy](59-sodium-cutoff-alternatives.md), [nearby availability](60-nearby-alternative-availability.md).

## Physical acceptance still required

After TestFlight update, check pasta sauce, cereal and butter. Sodium-led comparisons should lead with less sodium. Alternatives appear only if all applicable checks pass; up to three is not a promise of exactly three for every scan. Store results must load independently and leave food-fact/source buttons usable. Check selected-store and approximate-GPS paths, retailer links, cancellation/backgrounding, and weak connectivity. Google-reported results are not guaranteed branch inventory.

Temporary Beta 0 timing must be removed before Beta 1. Native compiler/artifact checks are not physical iPhone acceptance.

## Upload checkpoint

Native build completed at 2026-10-17 19:51:53 UTC; package inspection passed at 19:52:06 UTC. EAS submission c011e98b-aba0-47e3-905a-5b9ebf931682 finished at 19:52:27 UTC. At that checkpoint Apple had not yet listed the exact build; owner availability was still pending. No duplicate upload was started.

## Exact release evidence

- EAS build: e00c593a-ff70-45c0-b1c8-24cf8dcca077
- Submission: c011e98b-aba0-47e3-905a-5b9ebf931682 (FINISHED)
- Apple build: 18f2d83c-07ef-4144-b70e-44d1f7eceece
- Version: 0.1.0 (10), bundle org.cac.healthgrocery.beta0
- IPA: 56,343,738 bytes; SHA-256 f13c937da5487e5262e655f950ffe0cd57a7b32a32f82d52383c591b4c8a1dff
- Owner access verified at: 2026-10-17T19:55:48.230Z
- Group: existing Beta 0 - Owner Testing, one existing owner; no additional invitations.
- Encryption declaration verified false; confirmed US-only beta scope unchanged.
- No frozen source file changed after submission to the cloud build.

Open TestFlight → Health & Grocery Beta 0 → Update, then verify version 0.1.0 (10). The old app may require a new scan to obtain current backend results.
