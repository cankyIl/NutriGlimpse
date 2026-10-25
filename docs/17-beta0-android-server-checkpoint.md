# Beta 0: Android and server integration checkpoint

Completed October 8, 2026 (America/New_York). Authoritative workspace: /path/to/NutriGlimpse on project-server.

## Implemented and verified
- Fixed fictional native receipt OCR: all four rows survive, including the weighted food, non-food purchase and refund. Product sugar now reads 1 g; sodium 0 mg and serving 40 g are retained. Normalization repairs only known fixture spacing and the observed NON-FO0D tag; changed numeric values remain excluded. Partial recovery is explicitly flagged.
- Added the mobile “Review a server AI example” flow for product, receipt and report. It uses previously validated GPT-6 Luna results through the backend and requires review before saving. Only the example kind is sent. No device image, OCR text or personal information is uploaded.
- The backend accepts empty requests to three fixed example routes, validates cached results, coalesces concurrent requests and uses the existing budget runner only when a cache is missing. Other personal upload routes remain disabled. Failures are generic; the client supports cancellation, bounded timeout and explicit retry.
- Android supports a local USB/ADB tunnel. HTTPS can be configured in a future build through EXPO_PUBLIC_BETA_API_URL. iOS server examples stay disabled without a configured address. Android cleartext access is limited to localhost/127.0.0.1.
- Release bundling always regenerates JavaScript so shared workspace changes cannot silently leave an old bundle.

Verification: npm run check passed TypeScript, lint, 150 application tests and three decoder/tooling tests. Two existing budget regression tests cover cap persistence and malformed-ledger refusal. HTTP checks validated all three cached examples without another paid request. Both ARM64 phone and x86_64 emulator release builds passed build/signature/manifest checks and share the same source fingerprint.

On the final API 36 Android emulator build: local receipt has all four rows; product nutrients are complete; receipt review/save works; server receipt and report render; PDF background cancellation discards the draft and retry succeeds. Force-stop during PDF reading left three temporary entries; relaunch removed them. Earlier checks in this run verified server-offline failure leaves no draft. Existing installation, encrypted-storage, secure-window and history persistence evidence remains in the emulator checkpoint.

Artifacts:
- Phone APK: artifacts/android/health-grocery-beta0-preview-arm64.apk
- SHA-256: 1cbbd912c24208cb489ab0c87b18cfa20932ea3dd5941bce9d8e4fec19878db0
- Source SHA-256: c9ed8b5666f482779f4fb5398baaef6c94ae7ed6393db28f7fe7d905e656097b
- Evidence: artifacts/remote/next-phase-check.log, next-phase-arm64-build.log, next-phase-emulator-build.log, fictional-backend-verification.json, next-cleanup.json and next-*.xml.
- Build metadata explicitly retains deviceVerified=false and personalProcessingEnabled=false.

## Budget
No additional paid calls were needed for this integration. The three prior fictional calls reserve USD 0.06 cumulatively against the user's USD 2 total authorization. Prior estimated token cost is USD 0.00087145; dashboard billing is authoritative. The runner stops at USD 1.80 reserved. Server cache reuse does not imply a fresh model call.

## Phone testing
1. Record the Android phone model and OS. Install the ARM64 APK privately using the existing preview guide. Use fictional data only.
2. For server examples over USB, establish a laptop SSH tunnel:
   ssh -N -L 3001:127.0.0.1:3001 project-server
3. With Android platform-tools and USB debugging enabled/authorized on that phone:
   adb -s PHONE_SERIAL reverse tcp:3001 tcp:3001
4. Open Product, Receipt or Report, then “Review a server AI example.” Check the values and explicit confirmation before saving. Repeated requests normally reuse the cached result.
5. Disconnect the tunnel and confirm a clear failure with no saved draft; local fictional OCR should still work. Restore the tunnel to retry.
6. Check installation/upgrade, saved history after restart, receipt quantities/refunds, two-page report, cancel/background/retry, permission denial, screen capture protection, export/restore and large text/TalkBack. Record failures without real personal information.

The tunnel is a development connection. Unsupervised remote testers need a selected private-access or dedicated HTTPS arrangement. Do not expose the loopback service publicly as-is.

## What is needed from the user
- Android and iPhone model/OS details and hands-on testing time. Emulator results do not replace camera, biometric, backup, accessibility and physical-device acceptance.
- A Mac/Xcode and iOS signing route for compiling/installing the iPhone build. Apple enrollment is needed if using TestFlight.
- A choice of private beta access or dedicated HTTPS hostname, with DNS/access control where required.
- Approved representative documents and privacy/provider-retention decisions before implementing and evaluating general real-document sanitization. The fictional filter is not a real-data redactor.
- A qualified clinical reviewer and approved interpretation/reference cases before enabling health guidance.
- Approved food/product and retailer/branch sources, including coverage and any required accounts/licenses.

No new OpenAI key or credit purchase is currently needed. Branding remains deliberately open.

## Remaining engineering limits
This is a tested fictional-data engineering preview, not a completed real-data release. Real-input integration/evaluation, source-backed coverage, clinical rule publication, iOS compilation and phone-specific fixes follow the dependencies above. Native allocation-failure/concurrency stress and broader security acceptance are not certified by these smoke tests. Prior raw npm audit findings (22: 19 high, three moderate) remain tracked; local decoder mitigation does not erase upstream advisories. Recheck and resolve release applicability before rollout. Portfolio services were preserved; backend and preview remained active and portfolio returned HTTP 200.
