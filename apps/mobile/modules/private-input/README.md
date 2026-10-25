# Private report input

This local Expo module reads a report on the device. It has no network client and does not send images, raw OCR, filenames, source URIs or fingerprints to a server. The specialized report adapter returns transient OCR to the core evidence allowlist; only that caller can build a canonical numeric/date request. OCR and all later interpretation still require user confirmation. Existing general capture privacy gates are unchanged.

## Report import contract

`prepareReportSource(camera | document, AbortSignal)` in `src/storage/reportInput.native.ts` returns `null` on picker cancellation or `{ fingerprint, read, dispose }`. No URI is exposed to the screen.

1. Create an owned session and commit its picker-cache cleanup journal before opening the system picker.
2. Stage a single JPEG, PNG or unlocked PDF into the private session while hashing its exact bytes. Limits: 20 MiB, one image up to 40 million pixels, or 1–10 PDF pages. The file fingerprint is `sha256:` plus lowercase SHA-256 of UTF-8 `health-grocery-report-source-v1` followed by one zero byte and the exact file bytes. No OCR is needed for this step.
3. The caller checks its local fingerprint ledger. A duplicate is disposed without reading again. This matches exact bytes, not visually similar or re-encoded reports.
4. `read()` runs Apple Vision or bundled ML Kit locally, returns bounded pages, and disposes the source before resolving. It is single use. Both engines expose their genuine line confidence; invalid Android confidence is omitted, never replaced by a synthetic score. OCR confidence is not a guarantee of clinical correctness.
5. `dispose()` cancels work and waits for outstanding picker/native work before deleting owned copies. Cancellation, navigation and backgrounding use this same path. System picker backgrounding is allowed while the picker is open; a result returned while still backgrounded is discarded. Native background handlers cancel staged/processing reports too. Concurrent native disposal is serialized.

Bridge methods added for this path:

- `beginSourcePickerAsync(sessionId)` records the cache baseline.
- `stageSourceAsync(sessionId, uri, mime)` returns only `{ sourceHandle, fingerprint, pageCount }`.
- `inspectStagedSourceAsync(sessionId, sourceHandle)` consumes the native source and returns OCR pages.

Native handles are opaque, session-scoped and not persisted. Raw OCR is bounded to 2,000 lines per page and 100,000 characters per report. Page rendering is bounded to 2,048 pixels on its long edge. No original, raw OCR or preview is written into the compact result store by this module.

## Temporary copies and restart cleanup

The source owner retains their original file. Only session files and new generated UUID files within the app's exact cache root / `ImagePicker` / `DocumentPicker` directories are deleted. The native baseline preserves pre-existing files and rejects symlinks outside those roots. The report adapter permits one active report picker; do not introduce a concurrent unrelated picker that writes UUID files into these shared Expo cache directories.

The baseline exists before the picker can create intermediate copies. It allows `cleanupInterruptedAsync()` at app startup to remove leftovers even if the process dies before the picker returns its URI. iOS writes the journal atomically with complete file protection. Android syncs a temporary file then renames it in the same directory before opening the picker; an interrupted pre-commit file is only an abandoned session artifact, never parsed as a committed journal.

On iOS the owned directory, source and journal have complete file protection and are excluded from backup. Android uses the app's private cache directory, which is excluded from Auto Backup; this is not a claim of an additional encryption layer. Expo creates picker copies before the module adopts them. The journal limits their lifetime but does not change the system picker's own implementation. Files may remain until the next successful launch after a force-quit or crash. Cleanup failures withhold results and prevent another import until cleanup succeeds or startup recovery runs. Flash secure erasure is not claimed.

## Verification

Executed on the Linux build host with synthetic test data:

- Ten adapter tests exercise fingerprint-before-OCR, duplicate disposal, single use, abort during creation/staging/picker, foreground transitions, oversize/cancelled files, sanitized errors and cleanup failure retry.
- The JVM journal fixture halts a child process after the temporary file is synced but before commit. It checks that no partial final journal appears, a later complete commit preserves bytes, and an existing baseline is never overwritten.
- Android Kotlin compilation includes the genuine ML Kit confidence API.

From the repository root:

```sh
source ops/remote-env.sh
node --test apps/mobile/modules/private-input/tests/reportInput.adapter.test.cjs
mkdir -p apps/mobile/modules/private-input/android/build/journal-fixture
javac -d apps/mobile/modules/private-input/android/build/journal-fixture apps/mobile/modules/private-input/android/src/main/java/expo/modules/privateinput/PrivateReportJournal.java apps/mobile/modules/private-input/tests/PrivateReportJournalCheck.java
java -cp apps/mobile/modules/private-input/android/build/journal-fixture expo.modules.privateinput.PrivateReportJournalCheck apps/mobile/modules/private-input/android/build/journal-fixture/interrupted-session
```

Then run `./gradlew :private-input:compileDebugKotlin :private-input:compileDebugJavaWithJavac --console=plain` from `apps/mobile/android`.

Not yet verified: iOS compilation; real iPhone/Android camera and document-provider import; native file-hash parity on physical devices; PDF orientation/text layout; recognition quality; actual device cancellation/restart cleanup and backup behavior. Before accepting real reports, exercise synthetic image/PDF fixtures, locked/corrupt/oversize/11-page documents, duplicate imports, cancellation at each boundary, backgrounding with/without a picker, force-quit before/after picker return, and unchanged user originals. Check both the owned session directory and exact Expo cache directories after recovery. Never use personal reports in diagnostic logs or screenshots.

API reference: [ML Kit Text.Line confidence](https://developers.google.com/android/reference/com/google/mlkit/vision/text/Text.Line), [Expo 57 document picker](https://docs.expo.dev/versions/v57.0.0/sdk/document-picker/), [Expo 57 image picker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/).
