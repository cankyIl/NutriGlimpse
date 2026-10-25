# Beta catalog and public network checkpoint
Date: October 13, 2026 (America/New_York)

## Delivered
- Authenticated backend at https://grocery.serveforwad.com, loopback port 3002 behind existing Cloudflare Tunnel. No change to portfolio route.
- Four private tester invitation keys; phone keys use SecureStore. Browser keys remain memory-only. Each request uses a bearer header; never a query parameter. All beta routes require authentication. App service logs no request content.
- Public facts search by name or exact normalized barcode, strict response schema,15-second timeout/cancellation,20-result limit, source identity/dates/license, missing values and100g basis.
- Encrypted SQLCipher public-food cache, maximum 100 records, newer-source protection,7-day age notice, explicit save/read/delete. Database migration 2→3; older builds refuse newer storage. Public cache and tester keys excluded from personal exports; full reset clears them while rule-trust state remains protected.
- Barcode camera/manual flow links to explicit lookup. Matching stays separate from illustrative health ratings and alternatives.
- Nine generic USDA reference foods plus seven branded records:2777025,2723877,2741705,2755534,2755837,2634360,2019808. Discovery false positives were rejected; no claim of local store stock or certification.
- Authenticated fictional product/receipt/report examples over public HTTPS. Existing saved AI results only; paid generation is disabled for this entry point. Personal uploads remain disabled.
- Browser preflight supports only explicit localhost preview origins, without bypassing authentication.

## Verification
160 application tests and 3 tooling tests, typecheck/lint passed. Current-source ARM64 and x86_64 native release builds passed. Source fingerprint 4e591f2eafd458ffc05df64a22d66cfbdd5dab6eadd91a81ca88f88a3391a8e1.
ARM64 APK SHA-256 4eab46400fd65475e15d4c47b063ad1f8135b62eb3b68ff32d5332fc1e59de6b.
Emulator APK SHA-256 750d17eda5d7f60ed4404d35351ee8feb29dbf5a0051b964b472f5f779cef9db.
Evidence: artifacts/remote/beta-catalog-network-checkpoint.json; beta-network-final-check.log; beta-network-arm64-build.log; beta-network-emulator-build.log; beta-public-verification.json; beta-public-fictional-verification.json; catalog-native-*.xml; beta-public-native-receipt.xml.
Emulator acceptance: upgrade/startup, authenticated HTTPS name lookup with two distinct Quaker records, exact barcode 00030000010402, save/restart with Wi-Fi and mobile data disabled, cache deletion/restart, tester-key persistence, full reset removing tester access, public cached fictional receipt with four rows. Source display and barcode UI checked on updated builds; offline-cache implementation unchanged in final network-only update.
Initial public checks used curl --resolve with Cloudflare's verified public DNS answer; emulator launched with 1.1.1.1/1.0.0.1 to bypass the server resolver's cached NXDOMAIN. HTTPS certificate verification remained enabled.
Existing portfolio curl HTTP 200; project services active. A Python urllib portfolio request got403, retained in the earlier evidence rather than misreported as outage. Online catalog backup integrity passed.
No iOS compile, physical phone, actual cellular connection, or real personal-data acceptance is claimed. No new OpenAI calls.

## Demonstration rehearsal
1. Introduce the grocery problem and student contribution in the student's own words.
2. Open Search real food facts, look up Quaker or exact barcode 00030000010402, and show source identity,100g basis and the difference between package variants.
3. Save one record; enable airplane mode; restart and open saved foods. Explain source-age notices.
4. Return online. Review the fictional server receipt, showing that paper towels and refunds are distinguished. Clearly say the health/report examples are fictional and personal processing is locked.
5. Close with tester findings, limits and next development. Do not claim medical validation, store inventory, comprehensive grocery coverage or AI-free authorship.
The student must rehearse/record and honestly describe their own concept, design, coding and testing plus AI assistance.

## Remaining dependencies in plain language
- Log into the supplied Expo account securely on the server; no password or access token in chat.
- Confirm Apple membership is active and App Store Connect opens. Then configure signing and the app record through the account's secure login.
- Supply the iPhone for installation and home/grocery-store tests; invite the other two iPhone testers only when authorized and ready. Optional Android phone checks remain separate.
- Confirm cloud-build allowance before any paid build and complete Apple's encryption/export questions accurately because SQLCipher is present.
- Provide representative grocery package barcodes for coverage acceptance and testers' observed results.
- Before real personal reports/photos: verify the privacy/redaction pipeline, provider handling/retention and clinical rules. No account activation substitutes for those checks.
