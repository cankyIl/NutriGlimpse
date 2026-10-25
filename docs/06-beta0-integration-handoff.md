# Beta 0 integration and review handoff

Updated October 5, 2026. This is a dependency packet, not release approval. The maintained task list is [ImplementationProjectPlanDocument](ImplementationProjectPlanDocument.md).

## Native integration gate

The Android build command `apps/mobile/android/gradlew.bat assembleDebug --no-daemon` fails before compilation: `JAVA_HOME is not set and no java command could be found in your PATH`. No APK was created. Android requires a configured compatible JDK and Android SDK, or authenticated EAS build access. iOS requires the supported macOS/EAS build and signing path; no Apple Developer enrollment or signing credentials are configured. JavaScript/Hermes export does not validate native modules.

After provisioning the build route, first verify SQLCipher/key initialization and backup exclusion. Then test startup cleanup, background/app-switcher protection, camera permission denial/recovery, barcode capture, file-provider reading and encrypted archive sharing on a physical device. Only after these foundations work should real local OCR/PDF redaction be enabled. This ordering is an integration gate; the absent redaction adapter remains unfinished engineering, not work already completed.

## Data provider gate

A bounded Open Food Facts adapter exists at `apps/service/src/catalog.ts`. Tests inject synthetic responses; no live provider requests were made and the adapter is not exposed by the service. Before activation, establish the app contact, submit the required usage information, review adoption/licensing, and test against staging. Current official documentation recommends v3.6, asks for a custom application/version/contact User-Agent, and describes database/image licensing and per-IP request limits. Its community-contributed facts do not by themselves establish certification, exact package correctness or retailer membership. See [official API documentation](https://openfoodfacts.github.io/openfoodfacts-server/api/).

USDA FoodData Central remains a candidate for generic-food reference facts; project API access is not configured. See [official API guide](https://fdc.nal.usda.gov/api-guide/). Do not combine a generic reference, a different package label and a retailer listing into an apparently exact match.

For each required retailer, the release evidence must identify the source, usage rights, product membership, last verification time, coverage by category and unknown outcomes. No provider-backed branch dataset or adequate retailer evaluation basket is currently available. The distance/radius/directions helpers are implemented and tested, but are not a live branch service.

## OpenAI and redaction gate

No OpenAI project is configured. Personal-processing routes continue returning unavailable without reading/echoing body contents. Structured extraction parsing and the report retry coordinator can be tested locally, but are not a deployed AI pipeline.

Before any real upload: implement and validate native OCR, PDF rendering, identifier detection, pixel redaction and metadata stripping; inspect actual outbound payloads on representative multi-page cases; verify temporary-media cleanup on success/failure/cancel/restart. A regex-only detector or a client-supplied “redacted” flag is not sufficient evidence. Never send the original as a fallback.

Resolve Q-05 provider retention and Q-14 hosting/operational metadata before deployment. API access alone does not establish the agreed retention behavior. Relevant official reference: [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

## Clinical-review packet

The code currently exposes synthetic outcomes. `packages/core/src/evidence.ts` supplies bounded source/rule contracts, selection gates and withdrawal behavior; the active clinical rule pack is empty. The signature-verification input is an integration contract, not an implemented production trust/signing pipeline. No source organization is represented as issuing our product ratings.

For each draft rule, the review record must include: rule ID/version, exact clinical source/version, permitted usage, population, required context, nutrient/ingredient and quantity basis, proposed category/explanation, exceptions, conflicting-condition behavior, reviewer identity/date and reference-case outcomes. Clinical numeric thresholds have not been invented to fill this packet.

| Required area | Review questions / cases to approve |
|---|---|
| Cardiovascular/high LDL | Product-level mapping versus guideline statements; evidence for nutrient comparisons; applicable lipid context |
| Diabetes/prediabetes | Quantity and preparation context; avoid claiming individual glucose prediction |
| Hypertension | Portion/comparison basis; missing-label and overlapping-condition cases |
| Celiac disease | Acceptable gluten-free evidence; unknown certification; ingredient/certification distinction |
| CKD | Required stage/individual plan context; avoid inferring universal nutrient restrictions |
| MASLD/fatty liver | Source applicability and limits of food-level claims |
| Weight management | Neutral language, portion context and no inference about the shopper's consumption |
| SIBO | Symptom-compatibility versus treatment claims; required individual context |
| Pregnancy and older adults | Applicability for every affected rule; unknown context and age boundaries |
| Multiple conditions/restrictions | Conflict precedence; primary concern controls emphasis without erasing other constraints |
| Lipid reports | Six supported analytes, printed units/inequalities/flags, missing dates, freshness, conservative follow-up wording |

Acceptance exercises: same inputs produce the same conclusion; unreviewed/withdrawn rules do not activate; missing facts do not become Neutral; certification uncertainty excludes required alternatives; laboratory flags remain attributed to the report; current panel selection follows test date; dietary restrictions survive lipid personalization. A qualified reviewer must approve substantive conclusions before release. No reviewer has been contacted.

## Security dependency disposition

The audit currently reports 30 findings (19 high, 11 moderate), including propagated dependency entries. Application archives use authenticated encryption from noble libraries and native storage uses SQLCipher; these do not eliminate unrelated dependency findings.

- [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): upstream advisory lists no patched version. Do not expose build-time glob processing to untrusted patterns.
- [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv): unresolved upstream dependency finding. The application does not implement signature verification with node-forge.
- [decode-uri-component advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr): a major-version transition must account for CommonJS consumers; an untested forced Expo/Router downgrade was not applied.
- [uuid advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq): current transitive xcode dependency uses uuid v7. A narrow override attempt did not replace the nested installed dependency; the ineffective override and unnecessary direct dependency were removed. The application generates record IDs through Expo Crypto, but the transitive finding remains open.

This is triage, not a security clearance. Remaining findings require compatible remediation or an evidence-backed release disposition. No advisory is marked resolved merely because application code does not call its affected function.

## Two-phone verification checklist

For each device record model, OS, build ID and date. Run setup at age 20/21 and older; all condition/preference controls; app restart/offline saved history; permission denial; barcode scanning; product uncertainty and alternatives; receipt correction/no-food/duplicates/refunds/weights; report confirmation/reuse/cancellation/retry; wrong-passphrase/tampered restore; delete/reset during pending work; font scaling/screen reader; database/cache/backup/app-switcher inspection. Record expected/actual outcomes and logs containing no personal content. No device row has passed yet.

### Lab extraction parser integration update

Call parseExtraction(responseText, actualSuppliedPageNumbers). The second argument is required and comes from the on-device input preparation result, not provider JSON. Parsed output is always needs-review/unconfirmed and cannot authorize clinical use. Unknown or ambiguous test dates must be null with a date-missing/date-ambiguous issue. Calendar-invalid or contradictory dates and references to unavailable pages reject the response. The UI must still confirm the actual source values before later interpretation.
