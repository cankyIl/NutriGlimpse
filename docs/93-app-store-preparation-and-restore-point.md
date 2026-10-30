# App Store preparation and restore point — October 27, 2026

**Current October 29 finalization:** NutriGlimpse 1.0 (29) is Apple VALID and available to the existing owner TestFlight group. It is attached to the Prepare for Submission draft with manual release. The large-text home heading is corrected. Production backend and matching privacy policy are live. No App Review submission or public release. See [build29 evidence](94-app-store-finalization-2026-10-29.md). Earlier checkpoints below are historical.

**Requested release:** free, United States only. **Status:** preparation in progress; not submitted or publicly released. NutriGlimpse 1.0 (28) is Apple VALID / IN_BETA_TESTING, assigned to the existing owner TestFlight group. Encryption=false and English test notes are verified. Owner confirmed testing build 28 successfully on October29. This is owner acceptance; device models and individual edge-case results were not specified. The live beta backend and other services remain unchanged.

## Verified restore point

Git tag: **baseline/beta0-build 27-pre-app-store-2026-10-27**, pushed to the existing GitHub repository at commit e12d311d7d5d0467ba391f93334fc0cfff3abccf. This is the source-history marker; the private archives also preserve working documents, current runtime data and exact dependencies.

Private restore folder: `artifacts/restore-points/beta0-build 27-before-appstore-2026-10-27` on the project server. It contains the exact build 27 IPA/source, the current backend including post-build 27 fixes, consistent catalog/usage databases, Node24 and Linux dependencies, native model resources, private provider/signing configuration, manifests and service recovery instructions.

Verified in a separate restore directory: **757 source files**, three SQLite integrity checks, isolated backend HTTP200 startup, **828 core/service tests**, typecheck/lint, nine tooling tests, ten report adapter tests and photo/needs/news/shelf UI checks. No provider calls were made, so this proves restore/startup/regression behavior, not current model quality or physical camera execution.

An authenticated AES-256-GCM encrypted copy, **1,405,358,116 bytes**, is stored outside the source repository and OneDrive in the laptop's **NutriGlimpse-Private-Backups** folder. Its SHA-256 matches the server export: `49d4b9e8f0db8a579a532bbbfe4dce379fe9167ec86847a2262f6590132cfeb7`. The recovery key is separate in **NutriGlimpse-Recovery-Keys**, with access limited to the current Windows user and SYSTEM. Do not publish either private directory. The full encryption/decryption round trip passed before transfer.

Restoring is staged into a new directory, never blindly over main. Keep current keys/usage accounting and honor data deletions. Switching the app service is a separate reviewed action. An old iPhone behavior may require a new signed build number; TestFlight/Apple signing expires. External models, Apple/Cloudflare account settings, the Mac OS image and phone-local user data are outside this snapshot. Expiring shopper diagnostic data and demo media are not included.

## Current preparation status - October 28

The current detailed state is in [release-checklist.md](app-store/release-checklist.md). Public support/privacy pages and Apple draft listing/age/reviewer updates are complete. Security fixes, exact local patch provenance, privacy-manifest corrections and practical deletion/legacy-expiry behavior are implemented in the isolated candidate. Latest production checks pass825 core/service tests plus UI/tooling/report/news checks; Expo Doctor 21/21 and Hermes export pass.

The latest signed 1.0 (28) archive contains the security/privacy changes, production cleanup and a native keyboard fix. All 282 required inputs, corrected manifests and signature match the tested source; Mac/server/laptop copies are verified. The two approved failed/superseded build folders were deleted, recovering about 6.23 GB. Proper Xcode simulator signing resolved the test-only keychain initialization failure. iPhone setup/save/restart and larger-iPhone/iPad profile/privacy tests pass; iPad rotation and screenshot drafts are checked. Native testing found and fixed a keyboard covering Save. Corrected build 28 is uploaded and Apple-accepted. Its bounded automated accessibility audit passes; physical camera/backup and full manual acceptance remain. Exact hashes and boundaries are in [native-verification.md](app-store/native-verification.md).

Only fixed support/privacy routes were added to the live beta backend; public pages are verified on mobile/desktop. Corrected build 28 was uploaded; no live beta dependency upgrade, App Review submission or model request occurred. The final production backend cutover is still pending; policy wording distinguishes it from current beta behavior.

## Exact remaining owner inputs

- Google test-dataset deletion is not a mandatory release blocker on the confirmed fictional/public-only scope. The owner previously selected deletion before launch and has now questioned its necessity; retain that choice as a preference to clarify, not an Apple requirement. No dataset has been deleted. Project-log expiry is 7 days; logging-on/training-off and dataset scope are resolved.
- The October29 model decision is resolved: retain both pretrained shelf detectors and continue preparation, as explicitly directed. No replacement approval is pending. [Exact sources and remaining license uncertainty](app-store/third-party-model-licenses.md) are documented separately; this is not a declaration that third-party rights have been independently cleared.
- Review the completed listing/privacy/age answers and final device results before authorizing App Review submission. Seller/support/private review contact are complete.

Hosted-backend app verification remains explicitly deferred by the owner. The current beta's open paid endpoints have rate limits, not proof that requests originate in the official app. No manual tester-key requirement was reintroduced. Optional health-feature eligibility for an Individual account remains a review consideration; no Organization enrollment purchase is assumed.

Private evidence is under artifacts/app-store-preparation-2026-10-27. The previous baseline and exported binaries are preserved. See [dependency review](app-store/dependency-review.md), [privacy worksheet](app-store/privacy-answers.md), [deletion procedure](app-store/privacy-deletion-runbook.md) and [encryption/manifest inventory](app-store/encryption-and-manifest-review.md).

## October28 release follow-through

EAS submission `ae0b85c6-3255-4689-a9b0-5b6fe4916ff7`; Apple build `4d855796-7064-49c3-9732-e8cd7b428aa9`. Corrected IPA SHA-256 `6687b560f56a1ef5aebca9b35a9ba34bf0a5d356bad6c92a76d478cf8e1076cb`, source `533030bc2ec7e1b1cf1bf37f8c1d3ddb062459b8`. No App Review submission or public release.

The first upload finished delivery in EAS but Apple rejected it with 90683: expo-location references motion APIs and requires NSMotionUsageDescription. The corrected archive supplies a factual SDK compatibility description without requesting or using motion/fitness data. Apple permits reusing a failed upload number. Prior artifacts and the failure evidence are preserved. Delivery success alone is not TestFlight readiness.

An automated native accessibility survey of the initial home/privacy/My Needs views on iPhone17 ProMax found one support-email label issue. A descriptive screen-reader label fixes it without changing visible text/layout; the rerun reports zero findings. The fix is included in corrected build 28. Full manual VoiceOver, larger-text and screen-by-screen acceptance remain open. Production-launcher tests pass and the cutover/rollback runbook is prepared. Use [the owner checklist](app-store/testflight28-owner-checklist.md) for actual-phone acceptance.

## October29 owner acceptance and release preparation

The owner stated: "I tested the build 28 - its good". General owner acceptance is passed. This supersedes earlier statements that owner installation/testing was unverified; it does not establish separate device models or every checklist scenario. No new build was made.

Six existing native home/My Needs/privacy images (three iPhone 1320x2868, three iPad 2064x2752) were visually reviewed and uploaded to Apple's asset library. All are RGB PNG without alpha, unchanged from the native captures. All six images are processed, placed and ordered (home, My Needs, privacy) in the existing English draft; Apple's readback verifies three per device group. Parent version remains Prepare for Submission with manual release. This earlier six-image checkpoint is superseded below: the Mac reconnected and the owner supplied existing recordings for the remaining product/shelf captures.

Twenty-two focused production-launcher, security, release-streaming, legacy-journal-expiry and public-page tests pass with no model calls. The live service is a user systemd unit (`systemctl --user`); loopback and public curl health checks returned200. No deployment or App Review submission occurred. Evidence: artifacts/owner-acceptance-2026-10-29.

## October29 recording screenshots and extended native checks

The Mac reconnected. The exact build28 source was rebuilt with normal Xcode simulator signing: all 282 required inputs, version1.0/build28, motion-purpose string and strict simulator signature verification pass. The signed TestFlight IPA is unchanged (SHA-256 6687b560f56a1ef5aebca9b35a9ba34bf0a5d356bad6c92a76d478cf8e1076cb). No new app binary, OTA update or backend deployment was made.

Five targeted XCTest scenarios pass: manual store selection returning home plus public catalog lookup/details/save; camera-unavailable recovery and shelf navigation; reset cancellation and profile persistence; largest accessibility text on iPhone17 ProMax; and largest accessibility text on iPadPro13 M5. The surveyed home/history/My Needs/privacy screens have zero automated accessibility findings. Visual review at maximum text size shows the iPhone hero heading breaking a long word across lines; navigation remains usable, but typography refinement is still worth addressing and full accessibility compliance is not claimed. These are iOS27 simulator checks, not fresh physical-camera/LLM, full manual VoiceOver or encrypted-backup round-trip acceptance.

Original harness failures are preserved: availability annotation, scrolling direction, dropped characters during rapid test input, and trying to save after the test had collapsed the details panel. The corrected harness verifies each character before searching and reopens details before saving. One simulator run also stalled on repeated keyboard-animation idle notifications; that attempt is preserved and the isolated scenario was retried after restarting the simulator. No app workaround was needed. Passing camera/privacy cases are recorded separately from the earlier aggregate failed run.

At the owner's request, build27 screen recordings supplied product, alternative, real-store shelf-camera and shelf-result frames. Viewport crops exclude the old beta banner; separate branded headings do not rewrite product contents, ratings, nutrients or controls. Source/timestamp/crop/hash details are in screenshot-provenance.md. Rendered-component comparison supports continuity with build28, but these recordings are not described as new build28 physical tests.

All ten screenshots are processed, placed and ordered in Apple's English draft: seven iPhone and three iPad. The six native home/My Needs/privacy captures are retained. The local review HTML contains the full selection. No additional recording or Mac-access action is pending. Final selection remains part of the owner package review. Parent version remains Prepare for Submission with manual release; no App Review submission occurred.

Private evidence: artifacts/appstore-native-acceptance-2026-10-29, including native-evidence/native-acceptance-summary.json, source-verification.json, XCTest logs/attachments and screenshot-upload.json. Remaining preparation: production backend cutover/verification with matching policy wording, final Apple privacy answers and owner submission review. Specific unreported physical/backup scenarios and full manual VoiceOver remain explicit coverage gaps. No live paid model request was made.
