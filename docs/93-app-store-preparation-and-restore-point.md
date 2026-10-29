# App Store preparation and restore point — October 27, 2026

**Requested release:** free, United States only. **Status:** preparation in progress; not submitted or publicly released. Current TestFlight **0.1.0 (27)** and live scan behavior remain unchanged; only fixed support/privacy web routes were added.

## Verified restore point

Git tag: **baseline/beta0-build 27-pre-app-store-2026-10-27**, pushed to the existing GitHub repository at commit e12d311d7d5d0467ba391f93334fc0cfff3abccf. This is the source-history marker; the private archives also preserve working documents, current runtime data and exact dependencies.

Private restore folder: `artifacts/restore-points/beta0-build 27-before-appstore-2026-10-27` on the project server. It contains the exact build 27 IPA/source, the current backend including post-build 27 fixes, consistent catalog/usage databases, Node24 and Linux dependencies, native model resources, private provider/signing configuration, manifests and service recovery instructions.

Verified in a separate restore directory: **757 source files**, three SQLite integrity checks, isolated backend HTTP200 startup, **828 core/service tests**, typecheck/lint, nine tooling tests, ten report adapter tests and photo/needs/news/shelf UI checks. No provider calls were made, so this proves restore/startup/regression behavior, not current model quality or physical camera execution.

An authenticated AES-256-GCM encrypted copy, **1,405,358,116 bytes**, is stored outside the source repository and OneDrive in the laptop's **NutriGlimpse-Private-Backups** folder. Its SHA-256 matches the server export: `49d4b9e8f0db8a579a532bbbfe4dce379fe9167ec86847a2262f6590132cfeb7`. The recovery key is separate in **NutriGlimpse-Recovery-Keys**, with access limited to the current Windows user and SYSTEM. Do not publish either private directory. The full encryption/decryption round trip passed before transfer.

Restoring is staged into a new directory, never blindly over main. Keep current keys/usage accounting and honor data deletions. Switching the app service is a separate reviewed action. An old iPhone behavior may require a new signed build number; TestFlight/Apple signing expires. External models, Apple/Cloudflare account settings, the Mac OS image and phone-local user data are outside this snapshot. Expiring shopper diagnostic data and demo media are not included.

## Current preparation status - October 28

The current detailed state is in [release-checklist.md](app-store/release-checklist.md). Public support/privacy pages and Apple draft listing/age/reviewer updates are complete. Security fixes, exact local patch provenance, privacy-manifest corrections and practical deletion/legacy-expiry behavior are implemented in the isolated candidate. Latest production checks pass825 core/service tests plus UI/tooling/report/news checks; Expo Doctor 21/21 and Hermes export pass.

The latest signed 1.0 (28) archive contains the security/privacy changes, production cleanup and a native keyboard fix. All 282 required inputs, corrected manifests and signature match the tested source; Mac/server/laptop copies are verified. The two approved failed/superseded build folders were deleted, recovering about 6.23 GB. Proper Xcode simulator signing resolved the test-only keychain initialization failure. iPhone setup/save/restart and larger-iPhone/iPad profile/privacy tests pass; iPad rotation and screenshot drafts are checked. Native testing found and fixed a keyboard covering Save. Physical camera/backup and full accessibility acceptance remain; no upload occurred. Exact hashes and boundaries are in [native-verification.md](app-store/native-verification.md).

Only fixed support/privacy routes were added to the live beta backend; public pages are verified on mobile/desktop. No live beta dependency upgrade, new app upload, App Review submission or model request occurred. The final production backend cutover is still pending; policy wording distinguishes it from current beta behavior.

## Exact remaining owner inputs

- Confirm the fictional/public-test Google dataset is deleted before public launch, as selected by the owner. Project logs are confirmed 7 days; logging-on/training-off and dataset scope are resolved. Report only any nondefault provider/infrastructure retention settings not previously disclosed.
- Supply rights for public redistribution of the retained shelf detectors, or approve permitted replacements/release scope. No silent removal or unverified rights declaration.
- Review the completed listing/privacy/age answers and final device results before authorizing App Review submission. Seller/support/private review contact are complete.

Hosted-backend app verification remains explicitly deferred by the owner. The current beta's open paid endpoints have rate limits, not proof that requests originate in the official app. No manual tester-key requirement was reintroduced. Optional health-feature eligibility for an Individual account remains a review consideration; no Organization enrollment purchase is assumed.

Private evidence is under artifacts/app-store-preparation-2026-10-27. The previous baseline and exported binaries are preserved. See [dependency review](app-store/dependency-review.md), [privacy worksheet](app-store/privacy-answers.md), [deletion procedure](app-store/privacy-deletion-runbook.md) and [encryption/manifest inventory](app-store/encryption-and-manifest-review.md).
