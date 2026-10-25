# Category-aware relative alternatives — DEV-18 / FB-29

Implemented, tested and deployed to the beta backend on October 17, 2026. User authorization: consider an alternative when the app calculates green but the model says neutral; compare candidates against the original within their category; permit relatively better candidates with low but maintained fiber/protein; retain nutrition/dietary checks and return up to three suitable alternatives.

## Behavior

Absolute color ratings and their nutrient thresholds are unchanged. Relative eligibility is now separate: a neutral product can be a meaningful improvement over the scanned product and keep its yellow dot. Relative improvement never automatically grants green. Original-product rating/disagreement behavior is unchanged; alternatives are still sought for neutral/red originals.

| Comparable category | Meaningful improvements that can qualify a neutral alternative |
|---|---|
| Butter / buttery spreads | Less saturated fat |
| Tomato-based pasta sauces | Less sodium, added sugar or total sugar |
| Breakfast cereals | Less added/total sugar, or more fiber/protein |
| Other / unclassified categories | Conservative fallback: calculated and displayed green required, then existing meaningful improvement checks |

Known equivalent category names are normalized (for example, cereal / breakfast-cereal and pasta-sauce / tomato-pasta-sauce). Categories are never merged solely because their nutrients look similar. Oils, nut butters, Alfredo sauces and other foods are not automatically reclassified as buttery spreads or tomato sauces. A green candidate may qualify through another established nutrient benefit; category priorities order its short explanations.

Comparison is at **equal gram weight**, using the original serving amount as the comparison basis. Label colors still describe each product's own stated serving. This distinction is intentional and remains visible in the existing result-screen copy.

## Preserved and strengthened checks

- Known, coherent serving weight and all nine core nutrient amounts are required for both products. Unknown trans fat/added sugar is never zero. Mass/energy and sugar/fiber consistency checks remain.
- Identity must be identified with brand/name; category/use must match. Duplicates, including another size of the original, are excluded.
- Candidate trans fat must equal zero. A red signal from either the model or the calculation excludes the candidate. Null model ratings and incomplete/uncertain calculations remain excluded.
- Sugar, sodium and saturated-fat increases still fail when they exceed **both 10% and the existing absolute tolerance**: 1 g sugar, 40 mg sodium, 0.5 g saturated fat at equal weight. This is the existing beta comparison policy, not a new regulatory/clinical threshold.
- A qualifying reduction still needs **at least 25% plus the same absolute difference floor**. A fiber/protein gain needs at least 25% and 1 g.
- **New stronger guard:** neither fiber nor protein may fall below the original at equal weight (only a 1e-9 floating-point tolerance). Zero can remain zero; there is no absolute fiber/protein minimum for relative eligibility in the three supported category families.
- The existing calorie ceiling remains: no more than original calories × 1.2 + 20 kcal at equal weight.
- Category priorities are applied to neutral candidates. No meaningful improvement means no recommendation. Up to three distinct passing candidates are selected in proposal order; unsuitable candidates never fill empty slots.
- Minerals cannot cancel adverse nutrients. No source facts, ingredients, dietary certification or store availability are invented. Existing on-phone dietary warnings/suppression and personal medical/profile transmission gates remain unchanged.

## Rating disagreement policy for alternatives

| Model | Calculated | Action |
|---|---|---|
| Neutral | Healthy / very healthy | Consider with calculated green rating; still run every comparison check |
| Healthy / very healthy | Neutral | Consider as neutral only under supported relative-comparison categories |
| Both green but different shades | Both green | Use healthy (the more conservative green) |
| Either red | Any | Reject |
| Model null or calculation unavailable | Any | Reject |

Diagnostic records preserve the model's rating, calculated rating, actual displayed rating, reconciliation reason and comparison rejection codes. The static prompt/rule archive changes version with this release. Existing seven-day / 2,000-event privacy limits remain; no personal scan snapshots were copied into source or evidence artifacts.

## Prompt and API compatibility

The model still independently reads the photo and returns five possible candidates in one request. It is now explicitly told to preserve the absolute rating rubric, allow neutral candidates that improve on the original, keep fiber/protein at least equal, use category-specific priorities and avoid worsening other concerns. It must not fabricate amounts or portions to pass a check.

GPT-6 Luna, high image detail, 4,500 output-token ceiling, strict response schema, disabled tools, `store:false`, one paid call and no automatic paid retry remain unchanged. The existing request/schema pattern follows [OpenAI Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses); schema conformance does not establish nutrition accuracy.

No additional response fields were added, preserving installed build-6 compatibility. The frozen build-6 schema and streaming client accepted three neutral alternatives in a regression check. Existing cards display their actual neutral ratings and Food Facts. **Build 6 still computes short benefit text using its old green-only helper**, so yellow alternatives can show general label reasons instead of the new relative explanation. The updated shared helper and component checks are ready for the next native build. No fake green or nutrition value is used to work around that client limitation. No native build/OTA/upload was requested or performed here.

## Verification

- Full workspace checks: **454 core/service tests**, nine tooling tests, ten report-input adapter tests, typecheck and lint pass.
- **31 production-component scenarios** pass with temporary timing both on and off. Added checks exercise neutral cards, relative benefits and continued dietary-warning/color suppression. Native/network boundaries are mocked; this is not physical phone acceptance.
- Fourteen new category/disagreement tests cover original cases, equal-weight portion manipulation, protein/fiber losses, missing data, incoherent amounts, trans fat/red flags, other nutrient/calorie worsening, aliases/cross-category mismatch, unknown-category fallback, duplicates, the three-card cap and streaming consistency at every input split.
- Absolute rating/reason functions are byte-for-byte unchanged. Provider transport/timing tail is unchanged. Seven side-chat timing/native sources are hash-verified unchanged; no camera, news or profile source edits.
- Private recorded-response replay (read in memory only) confirmed the intended eligibility changes. Details remain in the short-retention diagnostic store and the user's requested conversation report, not mirrored documentation.
- Three bounded public OFF package-photo checks used the deployed HTTPS endpoint and frozen build-6 client. Public spread: three neutral alternatives, first card 2.9 s, completion 6.8 s. Public cereal: two passing alternatives, first card 3.5 s, completion 18.0 s. The 200-pixel public sauce photo had uncertain flavor and returned zero alternatives in 3.5 s, correctly preserving the uncertainty gate. Different public images/model estimates can produce different results; these checks do not establish label accuracy, complete category coverage or a speed improvement.
- Three live calls reserved $0.06, taking total lifetime reservations from **$1.04 to $1.10**, not actual billed cost. The authorized $2 ceiling and $1.80 admission gate remain.
- Portfolio returned HTTP 200. Only the beta backend restarted. The server part of previously staged temporary timing is consequently deployed; the new phone timing/shutter changes still require a native build.

Evidence: `artifacts/category-alternatives-2026-10-17/` contains the source checkpoint, test logs, preservation and frozen-client checks, and public-fixture results. It contains no original tester photos or copied private decision rows.

## Remaining acceptance

Rescan on the iPhone to observe the deployed selection. Fewer than three is correct when fewer pass; uncertain identity still withholds alternatives. TestFlight build 7 now includes the new yellow-card comparison explanations alongside the preserved timing/shutter enhancements; install it for device acceptance. Clinically reviewed personalization and verified dietary evidence remain separate gates. Upstream nutrition estimates still need a package/source check when precision matters.


## Build 7 delivery follow-up

The improved yellow-card relative explanation helper is compiled and available to the owner in TestFlight **0.1.0 (7)**, together with supported quiet capture and temporary scan timing. Build-6 limitations above describe the older installed client. Backend selection remains unchanged by this packaging release. Device acceptance is pending. [Release evidence](55-build7-alternatives-and-camera.md).


Original-concern follow-up: [DEV-20 / FB-31](56-original-concern-alternatives.md) now prioritizes the original's adverse reasons over generic category benefits, adds a primary-concern improvement guard and distinguishes factual explanation reductions from the unchanged 25% qualification. This is deployed and included in TestFlight build 8.
