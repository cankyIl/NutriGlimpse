> Current continuation: fictional product/receipt/report input now connects OCR/reconstruction to editable review and compact saved records. Native source bytes are fingerprinted before cleanup. Camera/document adapters remain gated before permissions. See 13-beta0-resumed-implementation.md; real-source sanitization and physical cache/OCR checks are not accepted.

# Native input checkpoint — October 6, 2026

Implemented a local Expo module under apps/mobile/modules/private-input. Android uses bundled ML Kit Latin OCR 16.0.1 and PdfRenderer. iOS source uses Vision and PDFKit. Local JPEG/PNG/PDF processing is bounded to 20 MiB, 10 PDF pages and 40 megapixels. These are provisional engineering limits.

Input sessions support cancellation, disposal and interrupted-startup cleanup. Only app-owned scratch files are removed; original Files/Photos documents are not deleted. No remote URI scheme is accepted. Recognized text stays in local memory and is not saved in history.

The experimental report policy validates OCR geometry, retains only narrowly supported report rows and renders them onto fresh white images. No original pixels, PDF layers, filenames or metadata are copied to those derivatives. Unknown text is omitted; low-confidence or unsupported content blocks the diagnostic. The policy always returns privacyVerified=false and outboundAllowed=false. It is not a validated general identifier detector, and it does not sanitize arbitrary product/receipt text. Real input/provider routes remain disabled.

Privacy > Local input test generates a fictional report on the phone, exercises OCR/reconstruction/cleanup and reports counts only. It does not open real documents. It cancels on unmount/background. This requires the updated native APK.

Verification: Android Kotlin compilation passed; standalone ARM64 APK build passed in 3m 1s; signature, bundled JavaScript and manifest gates passed. TypeScript/lint and 48 tests pass, including seven input-privacy cases and four service-hardening cases. Swift is uncompiled pending macOS. No physical-device diagnostic or outbound-payload privacy acceptance has passed.

Current APK SHA-256: cbaacf82e246a428571178d25f6901776365690e0a3c7f0a908738744f95fc0c. Logs are under artifacts/remote: input-compile.log, input-service-check.log and input-standalone-build.log.

The backend now has a global token bucket without client identifiers, connection/request/header bounds and generic malformed-request handling. Queries and GET bodies are rejected; POST processing remains disabled without reading its body. Restarted backend health and existing portfolio HTTP 200 were verified.

Remaining independent work: capture/document selection orchestration behind gates; synthetic PDF/layout/rotation fixtures; product/receipt sanitization and mock extraction; report revisions/duplicates/context; alternative comparisons; rule signature verification; storage/recovery/security/accessibility work. Phone runtime, macOS compilation, representative privacy evaluation and real provider/source/clinical acceptance remain separate requirements.

References: https://docs.expo.dev/modules/get-started/ ; https://docs.expo.dev/modules/module-api/ ; https://developers.google.com/ml-kit/vision/text-recognition/v2/android ; https://developer.android.com/reference/android/graphics/pdf/PdfRenderer ; https://developer.apple.com/documentation/vision/recognizing-text-in-images .

## Synthetic multi-page PDF diagnostic — October 6, 2026

- [x] Added a generated two-page PDF fixture to Android and Swift native input source: portrait and landscape pages, fictional identifiers and instruction-like text alongside supported report rows.
- [x] Privacy > Local input test offers separate fictional image and PDF checks. No document picker, personal file access or upload is enabled.
- [x] PDF diagnostic requires both pages to be inspected and reconstructed; incomplete page coverage fails rather than claiming success.
- [x] Coordinator returns counts only and requests owned-file cleanup on success, failure and cancellation.
- [x] TypeScript/lint, 92 application tests and tooling check pass; three added tests cover PDF MIME/two-page work, missing native support/partial coverage and cancellation between pages.
- [ ] Run both diagnostics on Android/iPhone; verify actual OCR quality and temporary-file removal.
- [ ] Compile Swift on macOS. Native source presence and Android packaging do not establish iOS correctness.
- [ ] Additional rotated-image, corrupt/password-protected/oversized PDF and real representative privacy tests.

The diagnostic continues to return privacyVerified=false and outboundAllowed=false. It exercises the PDF path with fictional content; it cannot approve real report redaction or product/receipt sanitization. Platform APIs checked: Android PdfDocument and Apple UIGraphicsPDFRenderer.


PDF diagnostic Android checkpoint: BUILD SUCCESSFUL in 2m 54s. Updated Kotlin module compilation and APK signature/bundle/manifest gates pass. SHA-256: 2579e14249745daeb86d3c3163524b6e6e122aa6312cb12ff6e45cce2dbd894b; 70331510 bytes. Logs: artifacts/remote/pdf-diagnostic-check.log and pdf-diagnostic-build.log. Backend synthetic-only health and portfolio HTTP 200 verified. Swift compilation and physical PDF/OCR/cleanup acceptance remain pending.

## Invalid native input diagnostic checkpoint — October 6, 2026

- [x] Added restricted native fixture generation for an empty file, corrupt PDF bytes and a 20 MiB + 1 byte file. Files are created only in an owned temporary session; no personal picker or arbitrary fixture path is exposed.
- [x] Android and Swift source implement bounded chunk writes and cancellation checks for the oversized fixture. Android compilation/package evidence follows; Swift remains uncompiled.
- [x] Privacy > Local input test now includes Test invalid file rejection. The coordinator creates and disposes each session separately and never reconstructs invalid input.
- [x] Only the native validation error counts as an expected rejection. Missing module support, fixture creation failure, unrelated reader errors, cancellation, unexpected acceptance or failed cleanup cannot report a passing test.
- [x] TypeScript/lint, 117 application tests and tooling check pass. Six new tests cover all three rejection cases, false-success prevention, cleanup failure, cancellation at allocation/inspection and older builds.
- [ ] Run on physical Android/iPhone and inspect actual temporary-file cleanup. Automated coordinator fixtures do not prove native parser rejection on a device.
- [ ] Add password-protected/over-page-limit PDF and rotated-image fixtures; verify OCR and cancellation behavior across device implementations.

Both diagnostic result types keep privacyVerified=false and outboundAllowed=false. The returned result contains counts only. This increment tests failure handling, not real-data sanitization approval. API reference checked: https://docs.expo.dev/modules/module-api/ with SDK 57 reference https://docs.expo.dev/versions/v57.0.0/.

Invalid input Android checkpoint: BUILD SUCCESSFUL in 2m 54s. Updated Kotlin module compiled; APK signature, bundled JavaScript and manifest checks pass. SHA-256: e33144461b90ced1701fc5dfa2f615bd02b8b1096e7b0805dd306d96ed56e329; 70345402 bytes. Logs: artifacts/remote/input-rejection-check.log and input-rejection-build.log. Backend synthetic-only and portfolio HTTP 200 confirmed. Swift compilation and actual phone parser/cleanup verification remain pending.

## Native resource cleanup checkpoint — October 6, 2026

- [x] Fictional image generation now uses the same active-work guard as inspection/PDF generation/reconstruction on Android and in Swift source. Cancellation checks surround generation/write completion.
- [x] Android bitmap and PDF-document allocation moved inside protected cleanup scopes. The active marker is released in a nested finally block even if allocation fails or resource release throws.
- [x] All 117 existing application tests, TypeScript/lint and tooling regression remain passing; no added JavaScript test is claimed to simulate native memory failure.
- [ ] Actual concurrent native calls, low-memory/allocation fault injection, background cancellation and owned-file cleanup require device/runtime acceptance.
- [ ] Swift compilation remains pending macOS access.

This is source hardening and Android compile/package evidence, not proof that a process killed by the OS can execute cleanup. Startup interrupted-session cleanup remains required. Personal uploads and clinical use remain disabled.

Native resource cleanup Android checkpoint: BUILD SUCCESSFUL in 2m 52s. Updated Kotlin compilation, APK signature, bundled JavaScript and manifest gates pass. SHA-256: ea1fb7d0cb4026f920523d666f0ea769f4c408818d5faa7c09a33e759cadc427; 70345402 bytes. Logs: artifacts/remote/native-resource-check.log and native-resource-build.log. Backend synthetic-only and portfolio HTTP 200 confirmed. Swift compilation, low-memory injection and phone runtime acceptance remain pending.
