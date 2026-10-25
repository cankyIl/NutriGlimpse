# My Needs measurements and internal weight context

Updated October 16, 2026. Scope: side-conversation feedback FB-01–08. Authoritative source is `/path/to/NutriGlimpse` on project-server.

## User-visible changes

Save My Needs returns home only after a successful persistent save. Failed saves retain the draft. The “All eight conditions remain in scope…” footer is removed. Height/weight are optional, editable, unit-aware and stored with their measurement date. Both measurements must be present for a nonempty entry. Feet must be whole numbers and inches below 12; invalid and nonfinite values are rejected. Switching units converts the physical quantity instead of reinterpreting its numeric value.

Previously stored profiles remain readable because the fields are optional. Measurements use the existing encrypted device repository and encrypted archive path. No schema migration, native dependency or signing/configuration change is needed. A separate privacy action removes measurement/consent copies from all stored in-app profiles; it preserves restrictions, reports, food facts and unrelated preferences.

## Authoritative guidance and applicability

Primary references, accessed October 16, 2026:

- [CDC Adult BMI Categories](https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html): adult categories and calculation.
- [CDC BMI FAQs](https://www.cdc.gov/bmi/faq/index.html): interpretation, sex/age differences and body-composition limitations.
- [CDC Child and Teen BMI Categories](https://www.cdc.gov/bmi/child-teen-calculator/bmi-categories.html): children need BMI-for-age/sex percentiles.
- [CDC growth-chart data files](https://www.cdc.gov/growthcharts/cdc-data-files.htm): available sex-specific pediatric reference tables, not used by this 21+ beta.

For adults, calculate weight in kilograms divided by squared height in meters. Categories use unrounded BMI: below 18.5 = underweight; 18.5–<25 = healthy weight (internal identifier `good_weight`); 25–<30 = overweight; ≥30 = obesity (internal identifier `obese`). Adult thresholds are independent of sex. The app’s existing gender field is not repurposed as biological sex.

The CDC adult reference starts at 20, while this beta still accepts adults 21+. Pediatric tables were researched but not activated. BMI is screening context, not a diagnosis or an automatic weight-loss recommendation; it cannot distinguish muscle, fat and bone. Clinical review is needed before deriving individual diet instructions.

Version `cdc-adult-bmi-2026-10-16.1` is retained in `data/guidance/weight-context-cdc-2026-10-16.json` and the core reference module. A parity test prevents drift. Additional app rules reject unconfirmed pregnancy status, invalid values, ages outside 21–120, future measurement dates and measurements older than 180 days. Height 50–275 cm and weight 10–650 kg are broad input-sanity limits, not clinical definitions.

## Internal assessment connection

App state recomputes a private category from the current profile; no category is stored or rendered. The general food-color rubric remains unchanged.

The implemented but disabled integration:
1. Requires both privacy and clinical review plus explicit versioned weight-context consent.
2. Derives only category/reference/consent identifiers on the phone.
3. Leaves image identification and public nutrition lookup free of weight information.
4. Adds one simple fact to the verified-nutrition LLM request, e.g. “Weight category: overweight. BMI screening only; not a diagnosis.”
5. Allows only prioritization of supported facts: protein/fiber explanations for underweight; fiber/lower-added-sugar explanations for overweight/obese; existing order for good weight. This order is an app policy awaiting review, not a CDC food recommendation.
6. Keeps all adverse flags ahead of benefits; enforces the same source, portion, missing-data, nutrient-regression and dietary checks. No inferred calorie targets, weight-loss prescriptions, diagnoses or changed color thresholds.
7. Accepts only predefined reason codes and excludes category/raw measurements from the result.

Production is **disabled at both ends**. The mobile readiness gates remain false, the opt-in control is hidden, and the backend production loader does not enable weight review. Direct context-bearing requests are rejected before image handling, budget reservation or model dispatch. Tests use synthetic context with injected review approval to exercise the future path. Turning on one gate alone is insufficient. No environmental flag was added to bypass review.

The existing v2 photo API remains compatible for current clients: ordinary requests omit the new optional context. No live service was restarted, so the current shared backend is unchanged. Existing photo consent does not authorize weight-summary transmission.

## Evidence and release boundary

All checks use fictional measurements and mocked AI transport. Full project checks: 393 core/service tests, 7 tooling tests, 10 report-adapter tests, 14 existing photo UI scenarios; typecheck/lint pass. The separate My Needs UI harness runs actual production components with native/network boundaries mocked and checks save navigation, failure retention, repeated taps, units, clearing and non-display of categories.

Evidence directory: `artifacts/needs-feedback-2026-10-16/`; focused and full check logs, My Needs UI log, before-change source copies and a scoped file manifest.

The other session’s signed TestFlight build 0.1.0 (1) is a fixed package and does not contain these later edits. Apple/Expo account state, credentials, build settings, upload state and release files were not modified. No native build or device installation was run here. Put this increment into a subsequent build and perform physical phone acceptance before treating it as delivered to testers.

## Open dependencies

- Next native build and physical iPhone checks.
- Qualified clinical review of applicability and contextual reason/benefit priorities; verified privacy/provider controls; fresh explicit opt-in before weight context leaves the device.
- Any personalized color thresholds or individual nutrition targets require an additional reviewed policy. They are outside the enabled general-label comparison behavior.
