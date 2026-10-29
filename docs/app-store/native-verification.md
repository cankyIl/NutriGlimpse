# App Store native verification - October 28, 2026

**Latest candidate: NutriGlimpse 1.0 (28), signed and verified, not uploaded.** Xcode 27.1 compiled the security/privacy release and the keyboard follow-up. No App Review submission, public release or physical-phone installation occurred during this checkpoint.

## Exact signed artifact

- Mobile source commit: `c0c64afcd911d4f0bf377cd91f71c3e3346fa323`.
- Source-package content digest: `50f740197154c37b45d4d54801d7ec4cc6eae9a5705bf4e8de2f2bf6493f3a7a`.
- Source ZIP SHA-256: `0726be9051b58dbefd77611ac49285ab2a017b753d48be66690b5c1cd625e259`; 760 files checked.
- Latest IPA: **59,405,489 bytes**, SHA-256 `937919b95c6b094a1510033dad84d976c81d1e9a148d6d7f43deca58493eac6c`.
- Signed Hermes bundle SHA-256: `6aeb69348144dded545dfaefc03089a2eed00ff6ce8051457de36053fdfed45f`.
- All **282 required runtime/build inputs** match the tested source. Later documentation updates do not change this compiled source identity.
- App Store distribution signature passes strict verification; debugging is disabled and there is no device-specific provisioning list. Existing identity/team retained.
- Minimum iOS 16.4; iPhone and iPad support retained.
- Eight privacy manifests inspected. Root declares all ten intended data categories, linked=true, tracking=false. Required reasons: UserDefaults CA92.1; FileTimestamp C617.1/3B52.1; SystemBootTime 35F9.1.
- Only camera and while-in-use-location purpose strings; no development Bonjour/local-network keys or temporary scan-timing markers.
- Both compiled ShelfSKU11Diagnostic and ShelfSetDiagnostic models retained. Compilation does not resolve redistribution rights.
- Existing usesNonExemptEncryption=false retained for the US-only release. SQLCipher and encrypted exports are present; this is not an OS-HTTPS-only app. Final export-answer review remains part of submission review.

IPA and source backup hashes match across Mac/server/laptop. Private evidence: artifacts/app-store-preparation-2026-10-27/signed-keyboard-verification.json and nutriglimpse-1.0-build28-keyboard.ipa. The earlier520b765f archive predates the keyboard fix and is superseded, not deleted. Build 27 and the encrypted restore baseline are preserved.

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

Remaining physical iPhone X/iOS 16.7.16 and iPhone 17 acceptance: product and shelf 9 + partial Finish, streaming, suitable alternatives, deduplication, permissions, cancellation/backgrounding, offline/retry, reset, encrypted backup/restore and health-sharing choices. Full text scaling, VoiceOver and accessibility audit remain open. Recheck Apple build-number availability before upload. Live beta dependencies/scan behavior and other services remain unchanged. No live model call was made.
