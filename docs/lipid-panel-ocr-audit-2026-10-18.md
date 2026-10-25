# Lipid Panel Report OCR Audit

Date: October 18, 2026  
Status: testing complete for the scopes below; defects remain open.  
Authoritative workspace: /path/to/NutriGlimpse on project-server.

The report importer is not reliable enough across the tested layouts. Reading text locally is feasible and already implemented. The most significant shared-parser defect is selecting a historical or reference value as the current result. The screen also unnecessarily makes locally extracted values depend on an online AI response.

The recommended direction is on-device document recognition, deterministic field validation, an editable review screen, and explicit confirmation before saving. No cloud LLM is needed for this extraction workflow.

**October 18 Apple/CMP update:** The Mac and iPhone simulator audit is now complete; 28 broader blood-report images were added. Read [Apple OCR and General Blood Report Audit](blood-report-apple-ocr-audit-2026-10-18.md) for the measured results and remaining implementation work.

## What actually ran

| Test layer | Execution and result |
| --- | --- |
| Actual JPEG and PNG recognition | 36 fictional images through bundled Google ML Kit text-recognition 16.0.1, using the app's Android decoding, EXIF correction, line geometry and confidence handling, then the frozen production parser. Android API 36, x86_64 emulator. |
| Current image pipeline | 3 complete, 16 partial, 14 rejected, 3 expected safety rejections. No wrong numerical field accepted in this image run. |
| Image-detail experiment | Same 36 images and parser, with proportional resizing to a maximum dimension of 2048 instead of Android power-of-two downsampling: 10 complete, 7 partial, 2 expected safe partials, 14 rejected, 3 expected safety rejections, 0 cases with incorrect fields. This is an isolated experiment, not a production change. |
| Parser layout and safety matrix | 34 controlled text/geometry cases: 23 met the intended outcome; 11 exposed gaps, including two wrong-column selections. |
| Additional camera adapter tests | 16 passed. Actual adapter code; picker/native boundaries mocked; actual OCR-page schema used. |
| Report screen interactions | 9 characterization checks passed. These reproduce current behavior, including undesirable service dependence; they are not an acceptance sign-off. |
| Existing report regression suites | 65 passed across report evidence, real-report workflow, import deduplication, revisions, shelf integration, backend validation and adapter cleanup. Provider/network operations were mocked. |
| Static checks | Mobile, service and core type checks passed. Mobile source lint passed with cache disabled. |
| Apple Vision | Now executed on Mac and an isolated iPhone 16 simulator; see the linked Apple/CMP audit. Physical-iPhone capture remains untested. |
| AFM Core or AFM Core Advanced | Documentation evaluated; neither model was benchmarked or integrated. |

All sample reports contain fictional data. No real patient document or live AI request was used. The final test APK's merged permissions were checked: it has no INTERNET permission. Earlier exploratory runs were superseded by both complete offline runs in offline-run-record.json.

The test app isolates the actual recognition library and reproduces the production image/OCR settings. It does not replace a full native Expo integration test or a physical-camera test.

## Findings that explain the reported problem

### 1 Current and historical columns can be confused

The parser joins nearby text left to right, without identifying column headings. Its regular expression allows an extra number after the unit as a reference value. Consequently, this controlled layout:

Previous | Units | Current  
119 | mg/dL | 128

is accepted as LDL 119 mg/dL. In a second case, a Reference column containing 100 is accepted instead of the Current value 128. Both cases used high-confidence OCR text and valid geometry. They are reproducible in the shared parser used by iOS and Android.

The corresponding image cases 35 and 36 are included below. When OCR confidence or layout causes rejection, that rejection does not disprove the parser defect. Improving OCR can expose the wrong-column selection more often.

Required correction: select columns using their headers and row structure. Ambiguous columns must remain unconfirmed and require review. Preserve a reference to the exact source cell for each extracted value.

Source: packages/core/src/realReportEvidence.ts, lines 64 and 85-119. Reproductions: parser-matrix-results.json, previous-then-current-column and reference-before-result-column.

### 2 Ordinary report layouts are not covered adequately

Correct text can be rejected because of numeric method footnotes after an analyte name, an asterisk flag, reference-range placement, shared unit headers or wrapped labels. An eight-pixel vertical offset with 20-pixel-high text fails the current row-association tolerance. A low-confidence reference-range cell can also discard an otherwise legible result.

These failures do not require a stronger language model. They require explicit table/column reconstruction, controlled label aliases and field-specific validation. Units and numerical characters must not be guessed to improve the success rate.

### 3 Image preparation can unnecessarily reduce small-text detail

Android currently uses power-of-two downsampling. A 1600 x 2070 report becomes 800 x 1035 because its height is slightly over 2048. This turns 30-pixel report text into roughly 15-pixel text.

In the baseline PNG, total-cholesterol units were read as mng/dL and the correctly recognized triglyceride line had confidence about 0.783. The parser therefore retained four of six analytes. The table PNG also had low-confidence unit/flag cells, causing complete rejection.

The isolated proportional-resize experiment retains more image detail while leaving the 0.8 confidence threshold and all parser checks unchanged. Its results are recorded separately. The experiment also regressed individual cases: the light-blur fixture went from complete to rejected, and the large-photo fixture went from complete to partial. More pixels are therefore not a universal fix; preprocessing needs per-engine evaluation on additional, held-out reports before adoption. Image resolution alone cannot fix wrong-column parsing. iOS already uses a different maximum-dimension thumbnail path; this Android resizing defect must not be presented as a measured iPhone defect.

### 4 Online AI is an unnecessary dependency for extraction

The iPhone native module already calls VNRecognizeTextRequest with accurate recognition, en-US and language correction disabled. Original report pixels and raw OCR text are not supplied to the report AI step. Only already reconstructed values, units, dates and issues are supplied, and the provider result must match those exact fields.

Therefore the current AI check cannot recover a value that OCR or the parser discarded. It can echo an already misassigned value as well. Yet report-import.tsx disables the photo/document buttons when backend capabilities are unavailable, waits for provider processing, and only then opens the editable result.

UI checks verified that readable local evidence remains hidden after provider failure. Remove this dependency from extraction and local saving; update report-specific copy, state transitions and privacy wording consistently. Product-photo recognition is a separate workflow and was not changed by this audit.

### 5 Recovery messages hide the actual cause

The screen replaces permission, preparation and parsing failures with the same generic report-reading message. If no supported row survives, it offers no report-value editor. If at least one row survives and the online step completes, the editor does allow adding missing analytes.

Present partial local results immediately. Offer manual entry when extraction yields no values, and distinguish blur, missing units, ambiguous columns and permission failures. Manual entries must still require the printed date, unit, comparison sign and source page.

### 6 Dates need better local handling

Labeled US numeric and ISO collection dates work in controlled tests. DOB and report-issued dates correctly do not become collection dates, and conflicting dates remain unknown. A printed month-name date such as October 1, 2026 is missed. Support explicit unambiguous formats without guessing ambiguous numeric dates.

## Image cases and observed results

The six-analyte baseline contains total cholesterol 210 mg/dL, LDL 128 mg/dL, HDL 54 mg/dL, triglycerides 140 mg/dL, ApoB 98 mg/dL and Lp(a) 42 nmol/L. The collection date is October 1, 2026. The SI fixture uses the exact separately declared values in fixture-manifest.json; these are extraction fixtures, not clinical interpretations.

Complete means every expected numeric value, unit, comparison sign, source page and date matched. Partial means at least one measurement survived but one or more expected fields or the date did not. Rejected means no result survived where usable evidence was expected, or in a deliberate image-stress case. Safe-rejection means a deliberate negative fixture was refused. Cases 24 and 30 are stress tests where refusal is acceptable. This fixture set is deliberately adversarial and is not a population accuracy estimate.

| Image case | Values read / expected | Collection date | Outcome |
| --- | --- | --- | --- |
| 01-inline-six-png | 4/6 | 2026-10-01 | partial |
| 02-inline-six-jpeg | 5/6 | 2026-10-01 | partial |
| 03-separated-table-png | 0/6 | Not extracted | rejected |
| 04-separated-table-jpeg | 0/6 | Not extracted | rejected |
| 05-inline-flags | 5/6 | 2026-10-01 | partial |
| 06-footnote-number | 0/6 | Not extracted | rejected |
| 07-asterisk-flag | 0/6 | Not extracted | rejected |
| 08-reference-before-unit | 0/6 | Not extracted | rejected |
| 09-shared-unit-header | 0/4 | Not extracted | rejected |
| 10-wrapped-labels | 0/6 | Not extracted | rejected |
| 11-previous-result-column | 0/6 | Not extracted | rejected |
| 12-offset-table | 0/6 | Not extracted | rejected |
| 13-si-units-comparator | 4/6 | 2026-10-01 | partial |
| 14-no-collection-date | 4/6 | Not extracted | partial |
| 15-month-name-date | 4/6 | Not extracted | partial |
| 16-missing-ldl-unit | 3/5 | 2026-10-01 | partial |
| 17-conflicting-date | 4/6 | Not extracted | partial |
| 18-duplicate-ldl | 0/6 | Not extracted | safe-rejection |
| 19-dob-only-date | 4/6 | Not extracted | partial |
| 20-jpeg-quality25 | 5/6 | 2026-10-01 | partial |
| 21-small-text | 0/6 | Not extracted | rejected |
| 22-low-resolution | 6/6 | Not extracted | partial |
| 23-blur-light | 6/6 | 2026-10-01 | complete |
| 24-blur-heavy | 0/6 | Not extracted | rejected |
| 25-low-contrast | 5/6 | 2026-10-01 | partial |
| 26-dark-photo | 5/6 | 2026-10-01 | partial |
| 27-tilted-five-degrees | 6/6 | 2026-10-01 | complete |
| 28-perspective | 4/6 | 2026-10-01 | partial |
| 29-exif-portrait | 5/6 | 2026-10-01 | partial |
| 30-sideways-no-exif | 0/6 | Not extracted | rejected |
| 31-glare-covers-ldl | 4/5 | 2026-10-01 | partial |
| 32-blank | 0/0 | Not extracted | safe-rejection |
| 33-unrelated-text | 0/0 | Not extracted | safe-rejection |
| 34-large-photo-downsample | 6/6 | 2026-10-01 | complete |
| 35-previous-before-current | 0/6 | Not extracted | rejected |
| 36-reference-before-current | 0/6 | Not extracted | rejected |

Images cover PNG/JPEG, H/L and asterisk flags, method footnotes, separated and offset columns, reference/history columns, wrapped labels, shared units, missing units, SI units, comparison signs, dates, duplicate results, compression, small text, low resolution, blur, low contrast, darkness, tilt, perspective, EXIF orientation, sideways images, glare, blank pages and unrelated text.

## Controlled parser discrepancies

These cases eliminate image-recognition errors so the parser can be tested directly.

| Case | Observed result |
| --- | --- |
| numeric-label-footnote | Rejected |
| asterisk-flag | Rejected |
| range-before-unit | Rejected |
| columns-offset-8 | Rejected |
| columns-offset-12 | Rejected |
| low-confidence-reference-only | Rejected |
| shared-printed-unit | Rejected |
| previous-then-current-column | ldl 119 mg/dL |
| reference-before-result-column | ldl 100 mg/dL |
| month-name-date | Value read; printed October 1, 2026 date missed |
| split-label | Rejected |

The passing controls include supported inline and aligned-column formats, H/L flags, typographic dash/unit spacing, the 0.8 confidence boundary, missing/unsupported units, duplicate analytes, DOB/report-issued dates, conflicting/invalid dates, SI decimals, comparison operators and refusal to guess O as zero or comma decimals.

## Camera and screen checks

The 16 added camera tests cover JPEG, PNG, omitted MIME defaulting to JPEG, denied permission, cancellation, files over 20 MiB, explicit unsupported HEIC MIME, backgrounding during camera presentation, returning while backgrounded, cancellation while the camera is open, empty picker assets, native OCR failure, invalid OCR geometry, page-count mismatch, concurrent import prevention and failed temporary-file cleanup.

The nine screen checks cover an unavailable service disabling capture; waiting for provider completion; provider failure hiding locally extracted fields; unsupported report layouts producing the generic error; permission errors being replaced; saved-source reuse without new OCR; explicit confirmation before saving; future-date rejection; and adding a missed analyte while preventing an incomplete value/page from being confirmed.

The existing 65 regression tests also check source fingerprinting, deduplication, private field allowlisting, unsupported provider output, retry intent, save failures, correction revisions, same-date conflicts, interrupted operations, deletion during processing and use of confirmed reports in shelf ranking.

## Recommended Apple implementation

Use on-device document capture and table recognition, followed by local validation and explicit user review. Apple documents RecognizeDocumentsRequest for structured text, tables and lists, with cells associated to rows and columns. Verify OS/API availability and keep accurate text recognition as a fallback; do not infer successful operation on the user's phone from documentation alone. [Apple document-recognition example](https://developer.apple.com/documentation/Vision/recognize-tables-within-a-document?changes=_4), [Apple Vision overview](https://developer.apple.com/videos/play/wwdc2025/272/).

AFM Core and AFM Core Advanced are Apple's on-device foundation models. They can be evaluated as optional helpers for unusual layouts on supported devices, but generated fields must retain source-cell evidence. The user clarified that the current test phone is an iPhone 16. That device is eligible for Apple Intelligence, subject to supported OS, language/region, settings and model readiness. An iPhone 13 supports Vision OCR and compatible Core ML models but is outside Apple Intelligence's device list, so AFM must remain optional. Model-specific developer availability must be checked through the supported framework rather than assumed from a model's marketing name. [Apple model overview](https://machinelearning.apple.com/research/introducing-third-generation-of-apple-foundation-models), [Apple device requirements](https://support.apple.com/en-us/121115).

The app should detect capabilities at runtime, not rely only on a phone-name list. Check the OS-specific Vision API, successful model loading and SystemLanguageModel availability. Core ML is a runtime for compatible models, not a guarantee that Apple's AFM variants can run. [Apple runtime availability](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel), [Vision and Core ML](https://developer.apple.com/documentation/CoreML/classifying-images-with-vision-and-core-ml).

There is no automatic server-model fallback in the current report architecture when an Apple on-device model is unavailable. Any new fallback must be explicitly implemented. Apple's PrivateCloudComputeLanguageModel has its own device/region availability and managed entitlement requirements, so it must not be assumed to support an iPhone 13. Cloud handling of report content needs a defined privacy/consent path; the current report service only receives allowlisted structured fields. [Apple cloud-model requirements](https://developer.apple.com/documentation/foundationmodels/privatecloudcomputelanguagemodel?language=_8).

Use benchmark results to decide whether optional on-device model assistance improves field assignment on difficult layouts. Require source-backed numerical evidence regardless of the selected path. No AFM accuracy claim is supported by this audit.

Proposed flow:

1. Capture or choose the report, correct its orientation and crop/flatten the page locally.
2. Recognize text and table structure on the device.
3. Map analytes to the explicit current-result column and printed units; retain source-cell locations.
4. Show editable values immediately, with ambiguous/missing fields clearly marked.
5. Confirm the printed date, values, units, operators and source pages.
6. Save the confirmed structured record locally. Report extraction and saving must work without a backend or LLM.

## Priority and acceptance criteria

1. **High: prevent wrong-column selection.** Historical and reference values must never silently replace current values. Both controlled reproductions must pass before relying on broader OCR success.
2. **High: make extraction and confirmation fully local.** Airplane-mode capture/import/review/save should work; provider availability must not gate it.
3. **High: support representative table layouts.** Add header-aware reconstruction, safe footnote/flag handling and source-backed shared units. Keep missing/unclear fields unconfirmed.
4. **Medium: improve capture and image detail.** Validate page cropping, perspective correction, rotation and appropriately bounded resolution. Calibrate confidence per OCR engine using held-out images rather than lowering the threshold blindly.
5. **Medium: provide usable recovery.** Local partial results, manual entry and specific error messages.
6. **Verification: Apple Vision fixture tests are complete; the complete iPhone app flow remains.** Test paper and screen photos, permission denial, cancellation, offline operation, app backgrounding, restart persistence and cleanup.

No production source or shared configuration was modified by this audit. Findings are not marked fixed, and no TestFlight build was uploaded. A Mac is not needed for the shared-parser, UI-harness or Android image tests performed here. An Apple runtime is needed to execute Apple's actual OCR implementation; full physical capture still needs the iPhone.

## Evidence and reproducibility

All evidence is under /path/to/NutriGlimpse/artifacts/lipid-report-audit-2026-10-18. The laptop mirror includes this report, fictional fixtures, raw OCR, per-case JSON/CSV, logs and standalone harness sources.

- fixture-manifest.json: exact expected values and image SHA-256 hashes.
- android-ocr-results.json and image-results.json/csv: final production-equivalent offline image run.
- android-ocr-results-precise.json and image-results-precise.json/csv: isolated proportional-resize comparison.
- parser-matrix-results.json: every controlled case, expected result, observed result and discrepancy.
- camera-tests.log, screen-audit.log, existing-tests.log, typecheck.log and lint-direct.log.
- offline-run-record.json and apk-permissions.txt: emulator configuration, final APK digest and verified lack of Internet permission.
- source-hashes-before.json and source-hash-verification.json: twelve audited source files, unchanged at final verification; frozen source copies are in snapshot.
- Source references: realReportEvidence.ts lines 64 and 85-119; report-import.tsx lines 67-92 and 140-141; iOS PrivateInputModule.swift lines 316-319; Android PrivateInputModule.kt lines 281, 302 and 338.

The repository has no resolvable HEAD commit in this workspace. Source hashes, rather than a guessed commit/build number, identify the tested code. No claim is made that this audit ran the exact current TestFlight binary.

Elapsed OCR/decode time in the emulator: current pipeline median 2305 ms per image, range 1454-3367 ms; proportional experiment median 2708 ms. These are server-emulator measurements, not iPhone performance estimates.

Not exercised: AFM inference, physical-camera lighting/focus, full Expo native bridge integration, native deletion/crash recovery, PDF rasterization/encrypted PDFs, handwritten reports, non-English reports, real-laboratory validation or clinical interpretation.
