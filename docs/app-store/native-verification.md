# Native verification - build29

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



Earlier build28 evidence and corrections are preserved in [the previous native verification record](../history/AppStore-native-verification-before-build29-2026-10-29.md).
