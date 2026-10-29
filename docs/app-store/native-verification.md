# App Store native verification - October 28, 2026

NutriGlimpse 1.0 (28) is Apple VALID / IN_BETA_TESTING, assigned to the existing owner TestFlight group. Encryption=false and English test notes are verified. Owner confirmed testing build 28 successfully on October29. This is owner acceptance; device models and individual edge-case results were not specified. EAS submission `ae0b85c6-3255-4689-a9b0-5b6fe4916ff7`; Apple build `4d855796-7064-49c3-9732-e8cd7b428aa9`. Corrected IPA SHA-256 `6687b560f56a1ef5aebca9b35a9ba34bf0a5d356bad6c92a76d478cf8e1076cb`, source `533030bc2ec7e1b1cf1bf37f8c1d3ddb062459b8`. No App Review submission or public release.

## Exact signed artifact

- Mobile source commit: `533030bc2ec7e1b1cf1bf37f8c1d3ddb062459b8`.
- Source-package content digest: `db69f06b4765eb3399a4725eaef4934e458a3c52ad06269fa90219b17de7dd13`.
- Source ZIP SHA-256: `ee1fe5fd064b35d2dd0eabd97b6ced4359eb6b0a5836dd8fc870ad4dec34e8f8`; 762 files checked.
- Latest IPA: **59,405,576 bytes**, SHA-256 `6687b560f56a1ef5aebca9b35a9ba34bf0a5d356bad6c92a76d478cf8e1076cb`.
- Signed Hermes bundle SHA-256: `94b1656be459d1e735d0dfbcc79d6fb60e3e454bd675df5022657867d5fa2b0e`.
- All **282 required runtime/build inputs** match the tested source. Later documentation updates do not change this compiled source identity.
- App Store distribution signature passes strict verification; debugging is disabled and there is no device-specific provisioning list. Existing identity/team retained.
- Minimum iOS 16.4; iPhone and iPad support retained.
- Eight privacy manifests inspected. Root declares all ten intended data categories, linked=true, tracking=false. Required reasons: UserDefaults CA92.1; FileTimestamp C617.1/3B52.1; SystemBootTime 35F9.1.
- Camera, while-in-use location and SDK-required motion purpose strings are present. The app does not request/use motion or fitness data. No development Bonjour/local-network keys or temporary scan-timing markers.
- Both compiled ShelfSKU11Diagnostic and ShelfSetDiagnostic models retained. Compilation does not resolve redistribution rights.
- Existing usesNonExemptEncryption=false retained for the US-only release. SQLCipher and encrypted exports are present; this is not an OS-HTTPS-only app. Final export-answer review remains part of submission review.

IPA and source backup hashes match across Mac/server/laptop. Private evidence: artifacts/nutriglimpse-build28-2026-10-28/signed-motion-verification.json and nutriglimpse-1.0-build28-motion.ipa. Earlier28 archives, including the Apple-rejected keyboard archive, are superseded and preserved. Build 27 and the encrypted restore baseline are preserved.

## Cleanup and native issue resolved

The owner approved exactly two failed/superseded temporary build folders. Their resolved paths were checked, then deleted; **6,229,364,736 bytes** were recovered. All IPAs, source archives, logs, final working directory and rollback files were retained. approved-cleanup-oct28.json records the operation and preservation check.

Freeing disk did not itself resolve the first simulator storage failure. The test build had signing disabled. Rebuilding through Xcode with normal ad-hoc simulator signing and its generated simulated entitlements allowed SecureStore initialization; no secure-storage app workaround or device-signature change was required. Initial failure logs remain evidence. Use the normal Xcode simulator signing pipeline and disable automatic test sysdiagnose collection for these bounded UI runs, rather than manually signing restricted entitlements.

Native testing then found the numeric keyboard covering Save during setup. The shared page now dismisses the keyboard on scroll, adjusts keyboard insets and lets handled button taps through. The regression deliberately leaves the keyboard open, scrolls, saves and checks home navigation plus persisted age 52 after relaunch. Typecheck, lint, production needs/photo/shelf checks and beta needs checks pass after this small change.

## Native interaction evidence

| Target | Verified | Evidence |
|---|---|---|
| iPhone 17 simulator, iOS 27 | Setup, keyboard dismissal, Save to home and restart persistence | ui-keyboard-run-exit-code0 and results-keyboard.xcresult |
| iPhone 17 Pro Max simulator, iOS 27 | Terms/privacy access, setup, age 52 save/restart, privacy controls, My Needs persistence, production beta-banner absence | results-promax.xcresult |
| iPad Pro 13 M5 simulator, iOS 27 | Same setup/profile/privacy path; portrait/landscape navigation and return to portrait | results-ipad-retry.xcresult; results-ipad-layout.xcresult |

The first iPad harness attempt submitted age 5 because a digit was dropped by rapid test entry. The app correctly rejected that underage profile. The corrected harness asserts each entered digit and full Save-button visibility; it passes without further app changes. A separate settled-orientation capture resolves a screenshot taken during rotation. Original failures and transient screenshots remain in private QA evidence; they are excluded from listing drafts.

The simulator database is non-plaintext, and Documents carries the native backup-exclusion attribute. This confirms those observed simulator properties and persisted profile behavior, not real-device key accessibility or an encrypted export/restore round trip.

## Screenshot drafts and remaining acceptance

Unmodified native drafts: iPhone 1320x2868 and iPad 2064x2752, showing home, My Needs and privacy controls. Fictional age 52 only; no health concern or private report used. Layouts visually reviewed. The iPad landscape capture is QA evidence. Nothing is uploaded to Apple. Product/shelf-result screenshots still need actual flow acceptance; no fabricated model result is presented.

Earlier full source checks passed 825 core/service, 18 tooling, 10 report adapters, 76 photo UI scenarios, needs/news/shelf checks and two deletion-helper tests; Expo Doctor 21/21 and production Hermes export passed. This checkpoint adds targeted keyboard checks and the native interactions above, not a claim of repeated live-model testing.

Remaining physical iPhone X/iOS 16.7.16 and iPhone 17 acceptance: product and shelf 9 + partial Finish, streaming, suitable alternatives, deduplication, permissions, cancellation/backgrounding, offline/retry, reset, encrypted backup/restore and health-sharing choices. Full manual VoiceOver, larger-text and screen-by-screen accessibility acceptance remain open. Live beta dependencies/scan behavior and other services remain unchanged. No live model call was made.

## Corrected upload and accessibility checkpoint

The first upload finished delivery in EAS but Apple rejected it with 90683: expo-location references motion APIs and requires NSMotionUsageDescription. The corrected archive supplies a factual SDK compatibility description without requesting or using motion/fitness data. Apple permits reusing a failed upload number. Prior artifacts and the failure evidence are preserved. Delivery success alone is not TestFlight readiness. EAS submission `ae0b85c6-3255-4689-a9b0-5b6fe4916ff7`; Apple build `4d855796-7064-49c3-9732-e8cd7b428aa9`. Corrected IPA SHA-256 `6687b560f56a1ef5aebca9b35a9ba34bf0a5d356bad6c92a76d478cf8e1076cb`, source `533030bc2ec7e1b1cf1bf37f8c1d3ddb062459b8`. No App Review submission or public release.

An automated native accessibility survey of the initial home/privacy/My Needs views on iPhone17 ProMax found one support-email label issue. A descriptive screen-reader label fixes it without changing visible text/layout; the rerun reports zero findings. The fix is included in corrected build 28. Full manual VoiceOver, larger-text and screen-by-screen acceptance remain open.

Existing 825 core/service,10 report adapters,76 photo UI scenarios, needs/news/shelf/deletion checks and Expo Doctor 21/21 passed. This checkpoint passes 21 tooling checks, typecheck/lint, native compilation, all 282 input hashes, distribution signature and ten collected-data/eight-manifest verification. Unchanged setup/save/restart and iPhone/iPad privacy/profile/rotation flows retain their native evidence. Physical camera, upgrade and encrypted-backup acceptance remain open. The only mobile changes since the keyboard archive are the support-email label/import cleanup and motion declaration. The corrected archive verifies all 282 source inputs; these changes do not change scan routing or add a permission request.

Accessibility evidence archive SHA-256:10c088b478900ca533b4fbbe5fed80eb7743cc33854196b3d2c0166c2aad6ae0, matching Mac/server/laptop copies. Apple failed-upload reuse documentation: https://developer.apple.com/help/app-store-connect/reference/app-uploads/build-upload-statuses. No live paid model call was made.

## October29 owner acceptance and release preparation

The owner stated: "I tested the build 28 - its good". General owner acceptance is passed. This supersedes earlier statements that owner installation/testing was unverified; it does not establish separate device models or every checklist scenario. No new build was made.

Six existing native home/My Needs/privacy images (three iPhone 1320x2868, three iPad 2064x2752) were visually reviewed and uploaded to Apple's asset library. All are RGB PNG without alpha, unchanged from the native captures. Processing/placement readback is pending; final product/shelf-result captures still need the Mac. The Mac did not accept SSH at .67/.50/.65.

Twenty-two focused production-launcher, security, release-streaming, legacy-journal-expiry and public-page tests pass with no model calls. The live service is a user systemd unit (`systemctl --user`); loopback and public curl health checks returned200. No deployment or App Review submission occurred. Evidence: artifacts/owner-acceptance-2026-10-29.
