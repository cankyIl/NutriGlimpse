# Build 27: shelf upload recovery and accurate failure messages

Date: October 25, 2026, America/New_York.

## Release state

Build **0.1.0 (27)** is **available in TestFlight to the existing owner group**. Apple reports VALID / IN_BETA_TESTING; encryption=false and exact English release notes are verified. Update NutriGlimpse in TestFlight before retrying the shelf camera. Installed build 26 still has the phone-runtime defect until replaced. Installation and physical-camera acceptance of build 27 have not yet been reported.

## Changes

- Fix both shelf client cancellation guards to use `signal.aborted`. React Native's installed `abort-controller` has no `throwIfAborted()` method; the old call failed before uploading the captured grid. [Diagnosis](90-shelf-phone-runtime-upload-failure.md).
- Count failed uploads/processing separately from product information returned as incomplete. A connection/runtime failure no longer tells the shopper to move closer or exposes a JavaScript error. The screen now says the batch could not be processed and offers a new scan. Actual incomplete information suggests scanning those products individually.
- Retain the combined side-chat shelf flow: nine-cell grids, two batches in flight, smaller final batch, streamed product cards, duplicate callbacks/cancellation protection, explicit health-sharing choice and multiple concerns. Existing news, report, location, branding and photo behavior remain included.
- Include the already-live backend follow-up's phone disclosure/schema changes. Accepted alternatives can stream, meaningful neutral/red improvements retain their ratings and nutrition checks, and GPT can finish its normal deadline. No new prompt or backend deployment was needed for this release.

## Verification completed before signing

- Full `npm run check`: **817 core/service tests**, workspace typecheck and mobile lint, nine tooling checks, ten report-input adapters, 76 photo UI scenarios, needs/onboarding, 11 news tests/news UI and shelf UI checks.
- Five tests run the production shelf client with the actual React Native cancellation dependency. The previously failing 25-package path (9 + 9 + 7), streamed updates, Finish, cancellation and response association checks pass.
- UI tests reproduce the screenshot's 13-package failure (9 + 4), show zero checked with an accurate processing-failure message, hide the raw TypeError/closer-view advice, then verify a fresh scan can show genuinely incomplete information separately.
- A live public-HTTPS replay of two existing cereal grids (9 + 7) using the production session/client and React Native cancellation dependency processed **16/16 packages**, with zero failed/unresolved packages. All four provider calls completed. First product: **5.989 s**; first checked result: **10.685 s**; final: **41.108 s**. This is one fixture, not a latency guarantee.
- The Node replay bridges only cancellation at its fetch boundary because Node fetch rejects the React Native signal type. It does not execute Expo native fetch, a physical camera or CoreML. The initial harness-only mismatch and the corrected run are both retained in the evidence folder.
- On the Mac, Swift geometry checks passed 32 cases and five pixel fixtures (maximum channel difference 1/255); the native scan planner passed 33 checks. These do not establish physical-camera accuracy.
- iOS JavaScript export and Hermes bundling passed. The frozen source package contains 351 files, all matching the tested workspace. The package SHA-256 is `fb7e8e76f4f4546ad05435d0461281d04f3c4789c6e424ba5aa70241b4448719`.

## Signed package and upload

The compiled source and frozen source each matched all **351 file hashes** after the native build. The signed package passed deep/strict macOS code-signature verification, App Store distribution-profile/entitlement checks, ZIP checks and arm64/permission/scene-lifecycle checks. Minimum supported iOS is **16.4**. Both compiled shelf detectors, the approved grocery artwork and the corrected bundled shelf messages are present. Native icon files match the previously verified build 26.

- IPA size: **59,097,423 bytes**.
- IPA SHA-256: `5bbb46d8db728394d45a55382519bac11e52a8ae1a3de0e768aa34e19c252d4e`.
- EAS submission: `2c7a4cd7-962d-4036-b4f6-e35829b21b73`, **FINISHED** on October 25 at 11:33 p.m. Eastern.
- The same verified IPA was submitted once. This was a local Mac compilation; no cloud-build allowance or new plan was required.
- Apple build: `e662e6b3-f730-4d43-a606-a3c2e64f235e`, **VALID / IN_BETA_TESTING**, verified October 25 at 11:36 p.m. Eastern.
- `usesNonExemptEncryption=false`, existing owner-group availability and exact en-US testing notes are verified. External state is READY_FOR_BETA_SUBMISSION; external-tester approval/access is not claimed.

## Honest remaining limits

The live cereal test displayed **13 cards for 10 distinct cereals**; cross-batch differences in identity/variant/size still prevent complete deduplication. This is the separate ENG-03 refinement from the concurrent side-chat test. No outside alternatives were returned because the shelf already contained healthy choices. Nutrition checks were retained; tests do not imply universal recognition or nutrition accuracy.

Physical acceptance on iPhone X / iOS 16.7.16 and iPhone 17 remains pending after installing build 27. Pre-upload camera/transport diagnostics are still a separate follow-up. No additional testers have been invited in this release.

## Evidence

Private release evidence: `artifacts/nutriglimpse-build27-2026-10-25/` includes full check/export logs, live replay results/timeline, source manifests and release verification. Existing model licenses and deferred redistribution clearance are unchanged. No credentials, raw health profiles or build artifacts are committed with this document.
