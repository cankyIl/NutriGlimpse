# Apple OCR and General Blood Report Audit

Date: October 18, 2026. This extends the [lipid audit](lipid-panel-ocr-audit-2026-10-18.md).

## Outcome

The reported problem is reproducible. Apple can read the reports locally, but the app's current parser is restricted to six lipid analytes and can select a historical or reference value as the current result. Comprehensive Metabolic Panels and other blood reports need a broader local extraction and review workflow. They are **not supported end to end in the installed app yet**.

I ran **64 fictional JPEG/PNG images** through both the current Apple Vision OCR settings and Apple's structured document API, on the Mac and in a separate iPhone 16 simulator: **256 baseline recognition executions**. A further 64-image Mac experiment used a 4096-pixel bound. No cloud LLM was called. Retests of a corrected wrapped-text fixture are separate from these counts and supersede its initial output.

Production source, shared app settings, backend services and TestFlight releases were not changed. Twelve audited source files still match their starting SHA-256 hashes. All new code is an isolated test harness/prototype; it must not be described as a shipped fix.

## Environment and methods

- Mac: Apple silicon, macOS 27.0.1 (26A434), Xcode 27.1 (27A9275), Swift 6.4.
- Native Mac execution and an isolated iPhone 16 simulator running iOS 27.0 (24A434). This is not a physical iPhone 16 accuracy or speed measurement.
- The existing HealthGrocery Beta0 simulator was left alone. The audit-owned simulator is recorded in apple-ios-simulator.json; its cleanup is recorded separately.
- Current OCR: ImageIO JPEG/PNG decoding, EXIF transform, maximum dimension 2048, VNRecognizeTextRequest accurate, en-US, language correction disabled, genuine candidate confidence and bounding boxes. These reproduce the inspected iOS settings. The outputs were evaluated by the frozen **actual shared app parser**.
- Structured experiment: RecognizeDocumentsRequest, en-US, language correction disabled, barcode reading disabled, same images/resolution. Raw tables, rows, columns, text and confidence were retained. Flattened output was scored against the old parser to test whether replacing OCR alone would fix it. Separately, an audit-only header-aware prototype consumed the tables.
- Higher-resolution experiment: structured recognition with maximum dimension 4096. The 1800×2400 broader-report images therefore retained original detail. This is not a production setting change.
- Mac runner launched with direct network operations denied by a process sandbox. Simulator runner contains no networking or provider calls; the simulator-wide network was not disabled. Neither run performed AFM inference.
- Fixture hashes were verified on the Mac. The 28 broader-report fixtures contain **355 printed rows**, including deliberate ambiguity, omissions and duplicates. These synthetic, adversarial cases are not a representative accuracy survey of laboratories.

The SDK emitted a sysroot warning during the simulator compile. The output binary was independently checked as IOSSIMULATOR, and its runtime metadata reports iOS 27.0, confirming that the simulator run was not merely the Mac executable. Simulator tools also printed an optional-package authorization warning; compilation, boot and all audited executions nevertheless completed. No administrator settings were changed.

## What was tested

| Area | Coverage |
| --- | --- |
| Lipid reports | 36 images: inline and tabular, historical/reference columns, footnotes, flags, wrapped labels, missing units, SI units, operators, dates, duplicate tests, image degradation and negative inputs. |
| Comprehensive Metabolic Panel | All 14 common panel rows: glucose, BUN, creatinine, sodium, potassium, chloride, carbon dioxide, calcium, total protein, albumin, total bilirubin, alkaline phosphatase, AST and ALT. PNG/JPEG, inline, reordered columns, history/reference traps, wrapping, blur, low resolution, darkness, tilt, dates, missing units/results, conflicting duplicate glucose and “Not performed.” |
| Complete Blood Count | WBC, RBC, hemoglobin, hematocrit, MCV, MCH, MCHC, RDW, platelets, differential percentages and absolute counts; ordinary and superscript units. |
| Other numeric blood tests | A1c, TSH, free T4, ferritin, B12, vitamin D, iron, transferrin saturation, CRP and eGFR; comparison signs and varied units. |
| Qualitative/other results | Negative, Nonreactive, Positive, titers, blood type/Rh, and an intentionally unknown test label. |
| Multi-page input | CMP plus a second page containing lipid and other tests, assembled as two OCR pages with distinct source-page numbers. This does not test PDF rasterization. |
| Prototype safety controls | 20 passing tests for current/reference/history selection, ambiguous columns, unknown analytes, qualitative results, comparators/titers, missing values/units, confidence, duplicate names, merged cells, superscripts, source pages, dates and explicit review. |

See [sample metabolic panel](../artifacts/lipid-report-audit-2026-10-18/blood-reports/fixtures/b01-cmp-table-png.png) and [sample blood count](../artifacts/lipid-report-audit-2026-10-18/blood-reports/fixtures/b08-cbc-png.png). These are fictional test documents, not medical guidance.

The previous Android image experiments, 34 controlled parser cases, 16 adapter tests, nine screen characterizations, 65 existing regressions and type/lint checks remain recorded in the earlier audit. They were not relabeled as fresh Mac or physical-device tests.

## Current app: measured results

| Pipeline | Lipid result across 36 images |
| --- | --- |
| Current OCR settings on Mac → current parser | 20 complete, 6 rejected, 3 partial, 2 safe-partial, 3 safe-rejection, 2 incorrect-value |
| Current OCR settings on iOS simulator → current parser | 20 complete, 6 rejected, 3 partial, 2 safe-partial, 3 safe-rejection, 2 incorrect-value |
| Structured OCR flattened on Mac → current parser | 17 complete, 7 partial, 5 rejected, 2 safe-partial, 3 safe-rejection, 2 incorrect-value |
| Structured OCR flattened on iOS simulator → current parser | 18 complete, 5 partial, 6 rejected, 2 safe-partial, 3 safe-rejection, 2 incorrect-value |

**The two wrong-column image cases are now confirmed with Apple's real OCR.** In the iOS simulator, all six measurements became 119 from the Previous column, or 100 from the Reference column, although the actual current values were different. The current parser returned these records with an empty issues array. Improving recognition alone therefore does not make the importer safe.

The old parser rejected **27 of the 28 broader-report images**. It accepted only the mixed page containing four lipid rows, ignoring the other five tests on that page. For the combined 23-row, two-page report, it retained only the four lipid tests on source page 2. This limitation is in the application data model and parser, not a need for a cloud model.

Complete means all expected measurements and the collection date matched. Partial and rejected counts include deliberately difficult fixtures. Incorrect-value refers to numerical/analyte/unit mismatches; separate date checks are also required. Date-only error observed: Mac structured flattened: 24-blur-heavy read 2026-10-02 instead of 2026-10-01.

## Header-aware local prototype: findings and limits

The isolated prototype selects Current/Result columns from the printed headers, preserves raw test names, values, units, reference ranges and flags, and leaves every result as a draft requiring source confirmation. It does not diagnose, calculate treatment targets or update food recommendations. Unfamiliar analytes can be represented without expanding a six-item lipid enum.

| Experiment | Broader-report row comparison |
| --- | --- |
| Mac structured, 2048 bound | 282/355 rows with an exact result and unit; 262 also matched every printed label/reference/flag; 45 expected rows unmatched. |
| iOS structured, 2048 bound | 269/355 rows with an exact result and unit; 262 also matched every printed label/reference/flag; 70 expected rows unmatched. |
| Mac structured, 4096 bound | 217/355 rows with an exact result and unit; 203 also matched every printed label/reference/flag; 126 expected rows unmatched. |

These are draft extraction counts, **not accepted clinical records**. Fourteen rows belong to an intentionally ambiguous two-Result-column case where refusing to choose is expected. Missing units/results, duplicates and distorted images are also deliberate challenges. “Exact result and unit” does not mean the reference range, abnormal flag, date or source assignment is validated. The per-row JSON records all mismatches, review flags and source cells.

The prototype demonstrates the direction, but it is not ready to replace the production workflow:

- A table can be found correctly while unit text is wrong, such as g/aL instead of g/dL, or a caret/superscript in cell-count units being lost. Some wrong strings have high reported OCR confidence. Confidence alone is insufficient.
- Structured recognition sometimes misses a single-character H flag or a percent sign that ordinary text recognition sees. Missing flags must not be presented as proof of a normal result.
- Wrapped labels, rotated tables, qualitative tables and short one-row reports may not yield usable structured rows. Original OCR evidence must remain available for local review/manual completion.
- In the qualitative and unknown-marker images, Apple did read many of the actual words and values, but merged the header and first data row into the same cells. The initial prototype does not split those merged headers, so it returns no rows. This is a reconstruction limitation, not evidence that an LLM is needed to read “Negative” or the unknown result 7.4.
- A duplicate can be omitted by table recognition itself. Duplicate validation must compare against the source evidence rather than trusting an already incomplete table.
- “Not performed” must remain text; a blank result must never be filled from a nearby reference range. The wrapped Not performed fixture was corrected to avoid overlapping its unit column, then rerun.
- Higher resolution is an experiment with measurable tradeoffs, not an automatic remedy. Do not adopt a new resize or confidence setting on synthetic scores alone.
- In the 4096-bound baseline CMP PNG, Apple combined Test and Result into one column; the cautious prototype refused that mapping. Increasing resolution therefore reduced this prototype's aggregate completion rather than solving the general problem.

The prototype's controlled cases preserve unknown analytes and qualitative values. That does **not** establish reliable automatic extraction of every real-world blood report; the image cases expose additional work needed.

## Accepting any blood report: required application behavior

The requested scope should be **Blood reports**, with lipid, metabolic and other panels recognized within it. Intake should accept supported document/image formats without rejecting a report merely because its tests are not cholesterol tests. “Any report” means the app can retain/review the input and explain uncertain fields; it cannot honestly guarantee perfect automatic reading of arbitrary layouts, languages or handwriting.

1. Add a general local draft model: original test name; optional recognized analyte ID; raw result including qualitative text/titers/operators; printed unit, range and flag; collection-date evidence; source page/cell; confidence and review reasons. Do not coerce every result into a lipid measurement or numeric value.
2. Use capability detection: structured Vision where supported, accurate text OCR as fallback, explicit local review/manual entry when a layout is uncertain. Do not select an AI route solely from the phone's marketing name.
3. Use printed headings to distinguish current, previous and reference columns. Preserve conflicting/duplicate results and date ambiguity for review. Never invent missing units, dates or numbers.
4. Preserve unfamiliar tests as reviewable local data. Separate **report ingestion** from **clinical interpretation and food advice**; unrecognized or unconfirmed results must not affect recommendations.
5. Make capture → extraction → editable review → confirmation → local saving work without backend availability. The current service echo step cannot repair the OCR because it receives only the already extracted lipid fields.
6. Update the report screen, editor, local storage/migrations, import deduplication, privacy/deletion behavior and capability tests consistently. Keep existing confirmed lipid history intact. Provide per-field source review and clear partial/manual recovery.
7. Validate units and scale explicitly, including percentages, powers of ten, micro-symbols and unitless/qualitative results. Re-read ambiguous source regions or require confirmation instead of silently normalizing a corrupted unit.
8. Complete physical-iPhone and full-app tests before release: paper and screen photos, tilted/glare/low-light capture, offline saving, cancellation, backgrounding, restart persistence, multi-page imports, corrections and deletion. Add held-out, permission-cleared report layouts beyond this synthetic suite.

## Device capability findings

The Mac's SystemLanguageModel availability returned available. The iPhone simulator returned modelNotReady, while Vision OCR and document recognition still ran successfully. No model download or language-model request was triggered by this audit. This supports keeping local OCR independent of AFM readiness; it does not benchmark AFM accuracy or imply that the physical iPhone has the simulator's model state.

Apple documents structured document recognition separately from Foundation Models. Runtime capability checks and a text-OCR fallback remain appropriate. An iPhone 13 can use supported Vision/Core ML APIs without being eligible for Apple Intelligence; iPhone 16 eligibility still depends on OS/settings/model readiness. There is no automatic server fallback in this report implementation. [Apple document recognition](https://developer.apple.com/documentation/Vision/recognize-tables-within-a-document?changes=_4), [model availability](https://developer.apple.com/documentation/foundationmodels/systemlanguagemodel), [Apple Intelligence requirements](https://support.apple.com/en-us/121115).

## Per-image lipid results

| Case | Mac current | iOS current | Mac structured flattened | iOS structured flattened |
| --- | --- | --- | --- | --- |
| 01-inline-six-png | complete | complete | complete | complete |
| 02-inline-six-jpeg | complete | complete | complete | complete |
| 03-separated-table-png | complete | complete | partial | complete |
| 04-separated-table-jpeg | complete | complete | partial | partial |
| 05-inline-flags | complete | complete | complete | complete |
| 06-footnote-number | rejected | rejected | rejected | rejected |
| 07-asterisk-flag | rejected | rejected | rejected | rejected |
| 08-reference-before-unit | rejected | rejected | rejected | rejected |
| 09-shared-unit-header | rejected | rejected | rejected | rejected |
| 10-wrapped-labels | rejected | partial | partial | partial |
| 11-previous-result-column | rejected | rejected | rejected | rejected |
| 12-offset-table | partial | partial | partial | partial |
| 13-si-units-comparator | complete | complete | complete | complete |
| 14-no-collection-date | complete | complete | complete | complete |
| 15-month-name-date | partial | partial | partial | partial |
| 16-missing-ldl-unit | safe-partial | safe-partial | safe-partial | safe-partial |
| 17-conflicting-date | complete | complete | complete | complete |
| 18-duplicate-ldl | safe-rejection | safe-rejection | safe-rejection | safe-rejection |
| 19-dob-only-date | complete | complete | complete | complete |
| 20-jpeg-quality25 | complete | complete | complete | complete |
| 21-small-text | complete | complete | partial | partial |
| 22-low-resolution | complete | complete | complete | complete |
| 23-blur-light | complete | complete | complete | complete |
| 24-blur-heavy | partial | rejected | partial | rejected |
| 25-low-contrast | complete | complete | complete | complete |
| 26-dark-photo | complete | complete | complete | complete |
| 27-tilted-five-degrees | complete | complete | complete | complete |
| 28-perspective | complete | complete | complete | complete |
| 29-exif-portrait | complete | complete | complete | complete |
| 30-sideways-no-exif | complete | complete | complete | complete |
| 31-glare-covers-ldl | safe-partial | safe-partial | safe-partial | safe-partial |
| 32-blank | safe-rejection | safe-rejection | safe-rejection | safe-rejection |
| 33-unrelated-text | safe-rejection | safe-rejection | safe-rejection | safe-rejection |
| 34-large-photo-downsample | complete | complete | complete | complete |
| 35-previous-before-current | incorrect-value | incorrect-value | incorrect-value | incorrect-value |
| 36-reference-before-current | incorrect-value | incorrect-value | incorrect-value | incorrect-value |

## Per-image broader-report results

The last three columns count exact **result and unit** matches in the audit draft, not completed app imports.

| Case | Printed rows | Existing app | Mac 2048 | iOS 2048 | Mac 4096 |
| --- | --- | --- | --- | --- | --- |
| b01-cmp-table-png | 14 | Rejected | 13 | 12 | 0 |
| b02-cmp-table-jpeg | 14 | Rejected | 14 | 12 | 14 |
| b03-cmp-inline | 14 | Rejected | 14 | 14 | 14 |
| b04-cmp-reordered | 14 | Rejected | 14 | 14 | 14 |
| b05-cmp-previous-first | 14 | Rejected | 13 | 12 | 14 |
| b06-cmp-reference-first | 14 | Rejected | 14 | 12 | 14 |
| b07-cmp-wrapped | 14 | Rejected | 12 | 10 | 11 |
| b08-cbc-png | 12 | Rejected | 8 | 7 | 9 |
| b09-cbc-jpeg | 12 | Rejected | 9 | 8 | 9 |
| b10-cbc-inline | 12 | Rejected | 10 | 12 | 12 |
| b11-endocrine-iron-vitamins | 10 | Rejected | 8 | 7 | 10 |
| b12-qualitative-tests | 6 | Rejected | 0 | 0 | 0 |
| b13-unrecognized-marker | 1 | Rejected | 0 | 0 | 0 |
| b14-cmp-low-resolution | 14 | Rejected | 14 | 12 | 14 |
| b15-cmp-blur | 14 | Rejected | 12 | 12 | 10 |
| b16-cmp-dark | 14 | Rejected | 14 | 14 | 14 |
| b17-cmp-tilted | 14 | Rejected | 0 | 0 | 0 |
| b18-cmp-month-date | 14 | Rejected | 13 | 12 | 0 |
| b19-cmp-issued-date-only | 14 | Rejected | 13 | 12 | 0 |
| b20-cmp-ambiguous-columns | 14 | Rejected | 0 | 0 | 0 |
| b21-cmp-missing-units | 14 | Rejected | 13 | 12 | 0 |
| b22-cmp-conflicting-duplicate | 15 | Rejected | 6 | 15 | 13 |
| b23-cbc-symbol-units | 12 | Rejected | 6 | 6 | 8 |
| b24-si-cmp | 14 | Rejected | 14 | 12 | 0 |
| b25-mixed-report-page1 | 14 | Rejected | 13 | 12 | 0 |
| b26-mixed-report-page2 | 9 | Lipid subset only | 9 | 6 | 9 |
| b27-cmp-blank-results | 14 | Rejected | 13 | 12 | 14 |
| b28-cmp-not-performed | 14 | Rejected | 13 | 12 | 14 |

## Performance and evidence

| Lipid test path | Median decode + OCR | Observed range |
| --- | --- | --- |
| apple-vision-ocr | 127 ms | 56–44046 ms |
| apple-documents-ocr | 150 ms | 60–299 ms |
| apple-ios-vision-ocr | 1760 ms | 901–17290 ms |
| apple-ios-documents-ocr | 1212 ms | 355–2277 ms |

These are Mac/simulator timings and include cold-start effects. They are not physical-iPhone latency estimates, nor a fair end-to-end speed comparison after table reconstruction/review. No real report or live provider/model charge was involved.

Evidence is in artifacts/lipid-report-audit-2026-10-18:

- AppleVisionAudit.swift, compile logs, binary/platform hashes and runtime metadata.
- apple-vision-ocr.json, apple-ios-vision-ocr.json, apple-documents-ocr.json and apple-ios-documents-ocr.json; corresponding scored results and CSV files.
- blood-reports/fixture-manifest.json and all 28 generated images; the original 36 lipid fixtures remain unchanged.
- blood-reports/apple-blood-results.json, apple-ios-blood-results.json and apple-4096-blood-results.json: exact row comparisons, legacy rejection evidence and the combined two-page check.
- blood-table-prototype.mjs and its 20-test suite/log. This is isolated audit code, not application integration.
- source-hash-verification-apple.json, apple-runtime-record.json and apple-ios-cleanup.json.

Not exercised: physical iPhone camera, the complete Expo native bridge/UI/storage path, PDF rasterization/encryption, real patient documents, handwriting, non-English reports, lab-specific clinical interpretation, AFM accuracy or a shipped general-blood-report feature. No TestFlight build was produced.
