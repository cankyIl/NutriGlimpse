# App Store finalization - October 29, 2026

NutriGlimpse 1.0 (29) is Apple VALID and available to the existing owner TestFlight group. It is attached to the Prepare for Submission draft with manual release. The large-text home heading is corrected. Production backend and matching privacy policy are live. No App Review submission or public release.

## Signed build and source

- Source commit: 0182f18020f57e38cdc399974b45b3d95dd219d0.
- Source-package input digest: 06efe36237d86fdb2db1c4d6a0f2fa6b857b417a2b5eeb47c7cf2e53098e51d6.
- IPA SHA-256: dd161ff41b572945f894e064e699053b5089d07a6a8d41cf622dcfcf322afe17; 59,405,347 bytes.
- Apple build ID: 0d16fdf3-0139-408a-9f31-16377675b241.
- Minimum iOS 16.4; iPhone and iPad supported.
- Both compiled shelf models and side-chat features retained; model rights are not newly asserted.
- Default-size visuals are unchanged. The decorative home heading scales up to 2x to preserve whole-word wrapping; body text retains normal system scaling and the full heading remains available to accessibility.

## Verification

825 core/service, 21 tooling, 10 report-adapter and 76 photo-UI checks passed, alongside needs/news/shelf checks; eight focused runtime/privacy/expiry checks and two production-launcher checks pass. Typecheck/lint pass. All 282 native inputs, App Store signature, eight privacy manifests and ten declared data types verify. Five targeted build 29 simulator scenarios pass, including largest text on iPhone/iPad and profile persistence across installation over build 28.

Native encrypted export and share cancellation also pass. The captured fictional-profile archive decrypts with the expected passphrase, rejects a wrong passphrase and is removed from the app cache when sharing closes. Full Files-picker restore on a physical phone remains untested.

Initial native harness attempts omitted Host.swift or used an ambiguous nested text query. The unchanged host was copied and the heading locator scoped to firstMatch. Failed evidence is retained and only affected scenarios retried. The encrypted-export harness was also updated to dismiss the iOS share popover with its outside-tap behavior. No app binary change was needed for those harness corrections. Largest-text screenshots on both form factors were visually inspected.

The product model/transport test returned three alternatives, with first content at 4.775s and final result at 23.223s. The 9-cell public shelf grid streamed first cards at 5.959s, processed 9/9 cells, combined two repeat appearances into 7 products, and finalized at 90.176s. Gemini output was delivered; completion of a supplemental GPT result is not established. Healthy shelf choices suppressed outside alternatives. Nutrition/aisle claims from these model returns are not independent ground truth, and one product alternative lacked a photo.

## Production and restore

Frozen source: releases/backend-production-2026-10-29, revision 0182f18020f57e38cdc399974b45b3d95dd219d0. The production launcher runs against the existing project runtime through GROCERY_RUNTIME_ROOT, not fresh catalogs or keys. Staging used a separate port and consistent database copies; copied staging secrets were removed after shutdown. Fourteen database checkpoint copies passed integrity checks. Fifteen credential/configuration hashes were unchanged. The existing production journal files gained no new records across live calls; old records still expire after seven days.

Only congress-beta-backend.service was restarted. Portfolio, website and other user services remain active. Runtime prompt files match the reviewed release; the approved shopper prompts did not change. Public support/privacy pages, catalog, photo capabilities and selected/no-selected-store location logic pass.

Rollback: the private backend-checkpoint contains the exact former unit, database backups, source/config hashes and service state. Restore the prior unit and restart only the app service if needed; keep current keys and usage, and honor deletion intents before restoring data. The older encrypted build 27 baseline and all build 28 IPAs/source packages remain preserved.

## Apple preparation and remaining actions

All ten screenshots are processed/ordered; build 29 is attached to version 1.0, Prepare for Submission, manual release. Free/USA-only settings remain. TestFlight access is verified for the existing owner group; installation of build 29 is not claimed.

Review the final listing, ten screenshots, privacy/age answers and test coverage; publish the prepared App Privacy questionnaire in App Store Connect; authorize App Review submission. No new account, credential, payment, recording or model-replacement decision is requested.

The local browser-control tool failed to initialize with a missing-assets-path error. Apple API draft/build checks succeeded, but no App Privacy questionnaire publication was attempted through an unverified API. The prepared privacy worksheet provides the exact ten categories and purposes.

Full manual VoiceOver, per-device physical interruption/permissions and a complete native Files-picker backup/restore remain coverage limits. Build28's owner acceptance is retained; it is not substituted for observations never reported.

Private evidence: artifacts/appstore-finalization-2026-10-29. No App Review submission, public release, new tester invitation or message was sent.
