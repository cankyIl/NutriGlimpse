# App Store native verification — October 28, 2026

**Latest candidate: NutriGlimpse 1.0 (28), signed and verified.** The Mac at the owner-confirmed address is reachable. The owner completed Xcode first-launch setup; the former CoreSimulator component mismatch is resolved. Xcode 27.1 built the exact security/privacy candidate for device and simulator. No Apple upload, App Review submission, public release or physical-phone installation has occurred.

## Exact signed artifact

- Source commit: `aab527897b3a216a42eceb8112532f469cc860fd`.
- Source-package content digest: `cf4de5fb79c147b9656bd396a56e53ef959d3407c22947154fe7d72edd354e98`.
- Source ZIP SHA-256: `1f816b65ab33b0f0040239d24bf4114af0f3569f61bf6a0f772e4de9af7e8c80`.
- Final IPA: **59,404,907 bytes**, SHA-256 `520b765fdf4feb62cb87bbf7f56916b2089099e317d01165513d1b3646a9bc83`.
- Signed Hermes bundle SHA-256: `0fb177a9371ae46f2ce44a78ff6af92013caf40e671f4e19d55a6526a305c0de`.
- **282 required runtime/build inputs** match the tested source; the full source package contains 760 hash-checked files. Documents/backend/nonruntime tooling are not all mobile compilation inputs.
- Existing bundle identifier and distribution team retained. App Store distribution signature passes `codesign --verify --deep --strict`; debugging is disabled and no device-specific provisioning list is present.
- Minimum iOS 16.4; iPhone and iPad device families remain enabled.
- Eight bundled privacy manifests inspected. Root manifest contains the ten intended collected-data types, linked=true, tracking=false, and matches source. Required reasons: UserDefaults CA92.1; FileTimestamp C617.1/3B52.1; SystemBootTime 35F9.1.
- Camera and while-in-use-location purpose descriptions only. No development Bonjour/local-network keys. Temporary scan-timing strings absent.
- Both ShelfSKU11Diagnostic and ShelfSetDiagnostic compiled detectors retained. Successful compilation is not redistribution-rights clearance.
- Existing usesNonExemptEncryption=false retained. The app includes SQLCipher and encrypted backups; do not describe it as using only OS HTTPS. Final export-answer review and on-device encrypted-storage/backup acceptance remain open.

The final IPA, source archive and verification are backed up on Mac, server and laptop with matching checksums. Private evidence: `artifacts/app-store-preparation-2026-10-27/signed-final-verification.json` and `nutriglimpse-1.0-build28-final-oct28.ipa`. Older signed28 artifacts are preserved as historical evidence and are superseded by this hash. Build27 and the pre-release restore point remain intact.

## Tested source and UI scope

Security/privacy source passes825 core/service tests,18 tooling,10 report-input adapter tests,76 photo UI scenarios, needs/news/shelf checks and two deletion-helper tests. ExpoDoctor21/21 and production Hermes export pass. The final onboarding cleanup was additionally typechecked/linted and interaction-tested in production and beta: production says WELCOME, hides the diagnostic shelf shortcut and redirects the diagnostic route to ordinary Shelf Camera. Beta keeps its diagnostic affordance.

The final source also compiles as a Release iOS simulator app. **Simulator interaction check: NOT PASSED.** The dedicated fresh simulator launched the app, but it stopped at storage initialization before terms/setup; the test could not reach the privacy-policy control. No fictional profile was saved. The simulator build had signing disabled and no keychain entitlements; no database was created. This is a candidate cause, not a confirmed diagnosis. The Mac also fell below0.4GB free during the attempt. The test runner stalled while finalizing its result bundle; it was stopped and only the dedicated QA simulator was shut down. The signed device IPA is separate and unchanged.

Approval is requested to remove only the failed and superseded temporary work folders (about6GB). Then rerun with adequate space and valid simulator keychain entitlements, and resolve any remaining app issue before upload. Preserve the initial failed UI log/screenshot rather than treating compilation as acceptance. No real camera, provider quality, physical permission or Apple delivery result is claimed.

## Remaining native acceptance and immediate blocker

Physical iPhoneX/iOS16.7.16 and iPhone17: setup/save, product and shelf9+partial Finish, streaming, suitable alternatives, deduplication, permissions, cancellation/backgrounding, offline/retry, encrypted persistence/reset/backup and health-sharing choices. Supported iPad layout, final truthful screenshots, text scaling, VoiceOver and touch targets remain to be verified. No unsupported accessibility claim is made. Recheck build-number availability before upload.

The live beta's dependencies and scan behavior are unchanged; only the previously documented support/privacy routes were added. No live model call was made during these build checks.
