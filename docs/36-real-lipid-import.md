# Real lipid import: implementation, privacy and verification

**Date:** October 14, 2026  
**Increment:** Native report import and local personalization; initial beta agreement `beta-report-ai-2026-10-14.1`  
**Status:** Source integrated, automated checks and one live invented-panel request passed. Android module compilation and iOS project generation/JavaScript export passed. Swift compilation and physical iPhone/Android report-import acceptance remain pending. Complete clinical interpretation and the full polished release scope remain unfinished.

This document supersedes earlier statements that the implemented report workflow sends redacted report images or is blocked on Zero Data Retention approval. It does not supersede the full clinical requirements or claim that automated tests establish medical validity. See the [requirements](01-requirements-specification.md), [design](02-design-and-implementation-specification.md), [handoff](03-session-handoff.md) and [requirement traceability](05-requirement-traceability.md).

## 1. Accepted privacy decision

The user explicitly accepts OpenAI's default API retention through a mandatory initial beta agreement. Consent version and acceptance time are saved only in local app state. Declining leaves the beta closed; opening the agreement sends no report. Reports remain optional after acceptance, and the grocery app can be used without entering a panel. There is no consumer account or cloud health profile. Existing tester access protects the beta service and is not an OpenAI API key.

App-operated services must not persist personal request bodies, evidence, model output or report results. The explicit exception is OpenAI's disclosed processing and default retention. `store: false` does not eliminate all provider retention: default abuse-monitoring logs may include content for up to 30 days, subject to applicable exceptions, and feature-specific caching may also retain content. Zero Data Retention approval is not required for this accepted beta arrangement and has not been claimed as enabled. Deleting a local report does not delete content retained by OpenAI. See [OpenAI's API data policy](https://developers.openai.com/api/docs/guides/your-data), checked October 14, 2026.

This agreement does not authorize training opt-in, unrelated disclosures, backend result storage, automatic cloud synchronization or original-report uploads. User-initiated encrypted export remains the separately approved exception for user-managed backup/transfer files.

## 2. What the implemented workflow does

1. The user chooses a report photo or a JPEG, PNG or unlocked PDF from the native phone app. The source must fit within 20 MiB and ten pages. The browser preview does not accept personal report files.
2. The native private-input module stages the source, calculates its exact-byte fingerprint on the device and checks local saved-report/import state. Identical source bytes can reopen a saved result without another OCR or AI request. Re-encoding or photographing the same report again can produce a new identity; semantic duplicate recognition is not implemented.
3. Native OCR reads the source on the phone. The core parser reconstructs only supported lipid rows and explicit test/collection dates. It accepts complete rows and conservatively aligned columns, requires printed units and rejects unsupported or ambiguous fields. A date of birth or unlabeled date is not used as the test date.
4. The app disposes of its source copies and native working media, then persists a compact in-flight journal before sending the limited evidence to the backend. The original in the user's Photos/Files remains untouched. OCR text is not added to the saved result or network request.
5. The backend validates the strict request before provider use. OpenAI receives only the typed evidence and must return the same values, units, comparison signs, date, page associations and issue codes under a strict output schema. Server and client both reject altered, invented, omitted or extra fields.
6. A successful validated result is saved in encrypted local app state before it is presented. The user checks it against the original report and may make source-linked corrections. Valid measurements and a non-future test date must be confirmed before they influence food comparisons.
7. Confirmation saves a real panel, distinct from the fictional demonstration. The local Shelf Scan comparison reruns using the current profile and latest eligible confirmed test date. Reopening a result, changing a profile, scanning another food or importing identical source bytes does not repeat a successful AI request.

The OpenAI step is an **exact structured consistency check**, not independent verification of the OCR against an image. The model never sees the source pixels and cannot recover omitted or misread fields. Original-image LLM extraction, laboratory reference-range/flag preservation and a full clinical AI interpretation are not implemented by this increment. The confirmation screen and conservative handling of missing evidence remain essential.

## 3. Exact external-data boundary

The report endpoint accepts only the agreement version and this strict evidence shape:

| Field | Allowed content |
|---|---|
| `schemaVersion` | Literal `1` |
| `testDate` | Valid calendar date in `YYYY-MM-DD`, or null with the appropriate missing/ambiguous issue |
| `measurements` | One to six unique supported analytes: total cholesterol, LDL-C, HDL-C, triglycerides, ApoB or Lp(a) |
| Measurement value | Numeric string with at most four integer and four decimal digits; no free text |
| Unit | Explicit supported unit with analyte-specific compatibility: standard lipids use mg/dL or mmol/L; ApoB uses mg/dL or g/L; Lp(a) uses mg/dL or nmol/L |
| Comparator and provenance | `=`, `<` or `>`; source page 1–10 |
| Issues | Enumerated missing/ambiguous date, illegible value, ambiguous unit or partial-source codes |

No names, SSNs, addresses, filenames, file URIs, source handles, fingerprints, profile/preferences, arbitrary OCR text, laboratory narrative, images or PDF bytes are accepted. Source page numbers and issue codes are included in the disclosure even though they are compact metadata. The remaining measurements and date are still sensitive health information; the app does not claim anonymity.

This is an allowlist reconstruction path, not an assurance that every arbitrary image can be perfectly redacted. Failure to prepare valid supported evidence stops the request and asks for a clearer source. Future image-based product, receipt or report processing must satisfy its own privacy boundary; this route does not enable those broader payloads.

## 4. Local records, confirmation and recovery

The SQLCipher-backed local snapshot contains compact import evidence/result, timestamps, journal state, fingerprint, consent and confirmed panels. It contains no source photo/PDF attachment, thumbnail, original URI or full OCR/provider transcript. The existing encrypted, user-initiated archive can contain the compact snapshot; it does not include media or provider credentials. Physical storage, cache and backup exclusion verification remains required.

The real-report coordinator persists `in-flight` before dispatch and transitions to `completed`, `failed` or `outcome-unknown`. Restored in-flight work becomes outcome-unknown and does not automatically run. A valid returned result that cannot yet be saved remains in memory for a save-only retry; the app does not call AI again while that result is available. Successful persisted output is reusable before the user has finished reviewing it.

A failed or interrupted request requires an explicit retry. A timeout or lost connection cannot prove whether OpenAI completed the work; a chosen retry may repeat remote processing. The service therefore makes no exactly-once execution claim and keeps no durable idempotency/result cache. Device-local journal and completion checks prevent ordinary repeated views or known completed imports from generating new calls. No SDK or transport retry is automatic.

Cancellation, navigation, backgrounding, deletion and restore/reset use request cancellation and local lifecycle guards so a late response cannot silently reinstate removed work. Deleting a real panel also removes its associated import record and future local personalization influence. User-owned originals, prior user-exported files and any OpenAI-retained content remain outside that local deletion.

Exact-source reuse depends on retaining the local record. Deleting records, reinstalling or losing the device can remove the reuse evidence. The app does not retain original media as a recovery shortcut.

## 5. How a confirmed panel changes shelf comparisons

The current feature is titled **Personalized nutrient comparison** and uses the versioned, source-backed [Shelf Scan comparison policy](33-shelf-ranking-policy.md). It compares confirmed foods within the selected category and shows at most ten from the active scan. It does not assign an absolute disease-specific health grade: `absoluteRating` remains null and clinical review remains pending.

The latest confirmed **test date**, not import order, selects the panel. Fictional demonstration reports and unconfirmed imports are excluded. Same-date conflicts require explicit local selection. Unsupported units, comparison bounds or missing measurements are not treated as normal values. The policy may use supported LDL/triglyceride context for its limited nutrient priorities; it does not infer diagnoses or force a ranking change merely because a panel exists.

All selected restrictions and condition constraints still apply. Missing certification, pregnancy context and conditions requiring unsupported individual context can withhold comparison. No total-sugar value is substituted for added sugar, no unseen alternative is invented, and an earlier Pareto group does not dominate every product in every later group. Profile/panel changes rerank locally without sending the report or profile to OpenAI again.

This report integration does not finish clinical interpretation, all disease-specific food ratings, receipt feedback or retailer alternatives. Recruiting a qualified physician/RD reviewer appropriate to the approved coverage remains in the plan and runs alongside development/testing. Review should cover clinical mappings, applicability and follow-up wording; passing software tests is not clinical approval.

## 6. Service contract and bounded operation

| Route | Contract |
|---|---|
| `GET /v1/reports/capabilities` | Authenticated, no-store response with schema version, availability, reason (`ready`, `disabled` or `budget-unavailable`), agreement version and fixed model/null |
| `POST /v1/reports/extract` | Authenticated JSON `{consentVersion, evidence}`; response `{schemaVersion: 1, result: LipidEvidence}`; no report registry or durable result cache |

The POST accepts at most 8,192 UTF-8 bytes, rejects unexpected keys/content types and requires the current consent version before provider use. Existing beta bearer access is mandatory. Request handlers do not log health payloads. Responses use `Cache-Control: no-store`; independent hosting/proxy inspection remains part of operational acceptance.

The fixed model is `gpt-6-luna`. Requests use strict Structured Outputs, `store: false`, `background: false`, `stream: false`, no tools or files, a maximum of 4,096 output tokens and no automatic retry. The provider transport has a bounded deadline and response size; one report request can be in flight. A configured capability is not a promise that the next request will succeed: admission, budget and provider availability are checked at dispatch. [Structured Outputs enforce shape, not truth](https://developers.openai.com/api/docs/guides/structured-outputs); exact evidence checks remain application responsibilities.

Activation requires `GROCERY_REAL_REPORTS_ENABLED=true` and `GROCERY_REAL_REPORTS_CONSENT_VERSION=beta-report-ai-2026-10-14.1`, plus existing backend tester access, a protected server key and the existing shared testing ledger. The key is never embedded in the phone app. The helper requires Python 3 and file locking. Missing, malformed, unsafe or unavailable budget state blocks provider dispatch; it does not reset or replace previous spending records.

Every attempted dispatch first reserves $0.02 in the locked ledger shared with existing CLI tests. The aggregate guard is $1.80 inside the user's previously authorized $2 test allowance. Reservations are not refunds or actual bill measurements. Ledger records contain only kind, reserved amount and timestamp, never report evidence, fingerprints or device identities. Failed or unknown attempts keep their reservation. This bounded test allowance is not a production billing plan.

The root integration activated these exact flags in the operations configuration and installed user service. The authenticated public endpoint was checked with invented data only. Broader personal-media routes retain their existing gates.

## 7. Source and verification evidence

| Area | Implementation |
|---|---|
| Native input | `apps/mobile/src/storage/reportInput.native.ts`; `apps/mobile/modules/private-input/` Swift/Kotlin staging, local OCR and cleanup journal |
| Evidence boundary | `packages/core/src/realReportEvidence.ts` strict schema, local parser and exact-result validation |
| Durable local work | `packages/core/src/realReport.ts`; snapshot/schema/storage integration in core and mobile AppState |
| Phone experience | `apps/mobile/src/ui/BetaAgreement.tsx`, `apps/mobile/src/app/report-import.tsx`, `apps/mobile/src/ui/RealReportView.tsx`, source-linked values editor and history |
| Client transport | `apps/mobile/src/storage/realReportClient.ts`; capabilities, tester access and explicit bounded request |
| Service | `apps/service/src/realReportProvider.ts`, `server.ts` and `startBeta.ts`; strict route, provider transport and shared budget reservation |
| Local ranking | `packages/core/src/shelfRanking.ts` and [policy](33-shelf-ranking-policy.md) |

Completed checks reported by the integration owner; the final targeted independent review has no outstanding findings:

- **311 application/core/service tests plus three tooling checks; workspace typecheck and mobile lint pass without warnings. Ten native adapter tests are now included in the normal workspace check.** Focused evidence includes 28 real-report core checks and 13 new report-service tests, with strict-field rejection, exact-output matching, budget failure/concurrency, no automatic retry and local lifecycle cases.
- **Ten native adapter tests**, the JVM atomic-journal interruption fixture and **Android Kotlin/Java compilation pass**. Compilation is not physical camera/OCR/cache validation.
- **iOS project generation and JavaScript/Hermes export pass.** The generated iOS camera usage description covers reports. No Swift compilation or physical iPhone run has been completed.
- A 390 × 844 browser check covered the initial agreement, decline/accept behavior, fictional setup and native-import entry messaging. This browser check used no real report and does not validate phone media handling.
- **One live invented-panel POST returned HTTP 200 with exact evidence equality.** Unauthenticated access returned 401 and an unexpected personal-name field returned 400 without a provider call. The evidence artifact is `artifacts/lipid-import/live-fictional-check.json`.
- The shared ledger moved from three reservations to four: **$0.08 total reserved**, including the **$0.02** new attempt, below the $1.80 guard. These are reservation amounts, not the actual provider bill. No automatic API retry occurred and no real report was submitted.

An initial Python-user-agent read-only preflight encountered a non-JSON response at the public edge. Repeating the read-only preflight with the app user agent worked before any paid request. This did not trigger an AI retry or spend.

## 8. Remaining acceptance and handoff

| Required work | Current boundary |
|---|---|
| iPhone build/install | Generate/build with the Mac/Xcode path in [28-iphone-shelf-test-installation.md](28-iphone-shelf-test-installation.md). Current bundle: `HealthGrocery-iPhone-Lipid-Import-2026-10-14.zip`. Swift compilation, signing and physical installation remain pending. |
| Physical media/privacy | Exercise camera and JPEG/PNG/PDF import, varied layouts, unsupported/password-protected media, actual outbound fields, permission denial, background/cancel/force-close, picker/cache cleanup and orphan recovery on both platforms. |
| Storage and reuse | Inspect encrypted storage/backup exclusions; confirm reopen and exact-byte duplicate reuse, interrupted outcome handling, save-only recovery, deletion, archive/restore and local panel-to-shelf reranking. |
| Extraction usefulness | Measure local OCR/parser coverage against representative authorized or synthetic reports. A strict schema and exact echo do not measure source-reading accuracy. Improve incomplete layouts without widening the network payload silently. |
| Clinical completion | Implement and review full lipid explanations, reference-range/flag distinctions and supported disease/pregnancy rules. Current shelf policy stays limited and visibly under review. |
| Full product release | Complete and validate the broader approved mobile journeys, accessibility and physical performance. This increment does not establish full readiness for October 23. |

The next chat should preserve the accepted retention decision, compact local reuse and exact external-data boundary. Continue development and testing while arranging the qualified review; do not delay engineering for reviewer availability or claim complete clinical/device validation from the current evidence.
