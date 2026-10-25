# Shelf personalized nutrient comparison policy

Version: `shelf-comparison-2026-10-14.1`  
Evidence checked: October 14, 2026  
Status: implemented and tested as a limited comparison; clinical review pending

## What is implemented

`packages/core/src/shelfRanking.ts` provides a pure local `rankShelfFoods` function. It compares confirmed foods in the selected shelf category using the user's current profile and optional eligible confirmed lipid report. No profile, report value, comparison or scan membership is sent to a model or service. Calling it again after a profile or panel change does not reanalyze any report.

The interface title is **Personalized nutrient comparison**. This is not an approved clinical assessment. Every returned item has `absoluteRating: null`; Good fit, Neutral, Limit and Poor fit are deliberately absent. The synthetic `assessSample` rules and fixture ratings are not used. Signed clinical rule packs are not silently converted into executable nutrition logic by this module.

This work proceeds alongside reviewer recruitment. A qualified reviewer still needs to evaluate the policy, populations, reference cases and claims before clinical recommendations can be released. The current implementation does not satisfy full disease suitability, pregnancy, SIBO or CKD acceptance.

## Input and output contract

```ts
rankShelfFoods({
  foods,          // confirmed PublicFood records from this run only
  categoryId,     // one ComparisonGroup
  profile,        // current local Profile
  panels,         // optional confirmed report records; never required
  panelChoice,    // existing explicit same-test-date conflict resolution
  now,            // optional deterministic clock for checks/tests
})
```

The caller owns identity confirmation and run membership. It must not pass unresolved observations, catalog suggestions or products that were never seen or explicitly confirmed in this run. Ranking does not itself prove that a camera observation matches a product.

The output includes:

- Policy version, review status, selected category, profile revision and primary concern.
- Selected report ID and printed test date, when usable, and explanatory context notes.
- Nutrient criteria with directions, reasons and source IDs.
- At most ten items with their comparison tier, label facts, tradeoffs and null absolute rating.
- Excluded items with reasons, total eligible count and any omitted items tied with the final displayed tier.

The profile and reports are read-only inputs. The result belongs in transient app session memory. There is no persistence, network dependency, LLM call, archive field, timer, report analysis or side effect in this module.

## Data and compatibility gates

Only one category is compared. Original and reduced-sugar variants may belong to the same group but remain separate products; marketing claims do not alter scoring. Differing package identifiers remain distinct until an independently evidenced formulation grouping exists. Repeated identical records for a GTIN do not fill multiple positions. Conflicting facts for the same GTIN withhold that package instead of choosing convenient values.

The existing `comparisonReady` evidence rules apply: branded packaged product, exact package identifier, supported curated category, ingredients, five non-null plausible nutrient values, a valid source date no more than three years old and public-catalog retrieval no more than seven days old. These freshness bounds are engineering policy inherited from the catalog comparison, not clinical thresholds. Null never becomes zero. Unavailable calories or sugar remain grounds for exclusion even when another nutrient drives the comparison, because tradeoffs would be hidden.

All six selected restrictions are required: vegetarian, egg-free, dairy-free, halal, kosher and gluten-free. Celiac disease also requires gluten-free evidence. Current `PublicFood` records expose certifications only as `unverified`. Consequently these profiles currently receive facts and an explanation, but no ranked suitable list. This is an explicit data limitation, not a claim that the products violate the restriction. Names, ingredient keywords and LLM opinions do not establish certification or absence of cross-contact. [NIDDK celiac guidance](https://www.niddk.nih.gov/health-information/digestive-diseases/celiac-disease/eating-diet-nutrition)

CKD blocks ranking until relevant individualized nutrition context and product evidence exist; sodium alone does not resolve kidney-specific concerns. SIBO blocks generic ranking because diet phase, symptoms/tolerances and the relevant carbohydrate evidence are absent. Pregnancy or unspecified pregnancy applicability blocks this ranking until applicable food-safety and nutrition evidence exists. These blocks apply even when the selected primary concern is something else. [NIDDK CKD](https://www.niddk.nih.gov/health-information/kidney-disease/chronic-kidney-disease-ckd/healthy-eating-adults-chronic-kidney-disease), [AGA SIBO diet guidance](https://patient.gastro.org/small-intestinal-bacterial-overgrowth-sibo-managing-with-diet/), [FDA pregnancy food safety](https://www.fda.gov/food/people-risk-foodborne-illness/dairy-and-eggs-food-safety-moms-be)

## Available nutrient criteria

These mappings select label comparisons. They do not establish an appropriate portion, a medical target, whole-diet adequacy or absolute suitability.

| Selected context | Available comparison | Important boundary |
|---|---|---|
| Heart health / high LDL | Lower saturated fat at equal weight | Unsaturated fat replacement and individual LDL targets are not known. Total fiber is not soluble fiber. |
| Hypertension | Lower sodium at equal weight | No daily sodium prescription or claim that the complete food is suitable. |
| Diabetes / prediabetes | Higher total fiber at equal weight | Total carbohydrate, added sugars, medicines and portions are unavailable. No glucose-response or low-GI prediction. |
| MASLD | Lower saturated fat at equal weight | Does not assess unsaturated fats, added sugars or the overall diet. |
| Weight management | Lower calories at equal weight | Does not prescribe weight loss or a calorie budget; a 100 g basis is not a serving recommendation. |

Sources: [NHLBI TLC](https://www.nhlbi.nih.gov/health/TLC-Therapeutic-Lifestyle-Changes-Lower-Cholesterol), [NHLBI DASH](https://www.nhlbi.nih.gov/health/dash-eating-plan), [CDC diabetes meal planning](https://www.cdc.gov/diabetes/healthy-eating/diabetes-meal-planning.html), [NIDDK MASLD/NAFLD nutrition](https://www.niddk.nih.gov/health-information/liver-disease/nafld-nash/eating-diet-nutrition), [NIDDK weight management](https://www.niddk.nih.gov/health-information/weight-management/adult-overweight-obesity/eating-physical-activity).

Total sugars are shown as label facts and may appear in factual tradeoff text; they are never substituted for added sugars, total carbohydrates, glycemic index or soluble fiber. The mapping and comparison algorithm are an engineering interpretation of source guidance, not a scoring system endorsed by these organizations.

## Optional lipid context

The existing `selectCurrentPanel` semantics select the most recent **confirmed printed test date**, not import date. Same-date conflicts require the existing explicit choice bound to the current report contents. Unconfirmed, undated or conflicting records are not interpreted. A selected future-dated report is withheld; an older report is not silently substituted. Other unresolved reports are disclosed. Reports marked `synthetic: true` are ignored for real food comparison. The optional real-report import is now connected through a separate consented flow: local OCR, limited structured OpenAI check, user confirmation and compact local storage. See [the report checkpoint](36-real-lipid-import.md). This ranking function itself makes no network request; changing a report or profile reruns the comparison locally.

A single exact positive finite LDL or triglyceride measurement in `mg/dL` or `mmol/L` can add a saturated-fat comparison. A usable LDL measurement does not imply high LDL, nor does the app invent an individual LDL target. Adding this context may leave the order unchanged if saturated fat was already a criterion. Other analytes are not required and no missing result is treated as normal. Unsupported units, malformed numbers, duplicates and inequality values are explained instead of silently converted to exact values.

Triglyceride context uses saturated-fat comparison only as a limited heart-conscious comparison. It cannot evaluate absent added sugars, refined carbohydrate, total fat or fasting context. Severe triglyceride management can require materially different dietary advice. Therefore an exact value or known lower bound at or above **500 mg/dL**, or the conservative published rounded boundary **5.6 mmol/L**, withholds the generic ranking and asks for individualized clinician guidance. This is a safety hold, not a diagnosis or treatment instruction from one report. Values are compared in their original units; the code performs no hidden conversion. [ACC hypertriglyceridemia consensus](https://www.acc.org/Latest-in-Cardiology/ten-points-to-remember/2021/07/27/21/04/2021-ACC-ECDP-Hypertriglyceridemia), [2026 ACC/AHA dyslipidemia guideline](https://doi.org/10.1161/CIR.0000000000001423).

The 2026 guideline's indexed abstract/text was available; direct publisher access returned HTTP 403 during verification. Its severe-TG boundary was cross-checked against the accessible ACC consensus. Full clinical-policy review should retrieve the current full guideline. No source text is reproduced in the application.

## Comparison tiers and tradeoffs

Every selected supported condition contributes a criterion. Primary concern affects explanation order only; it cannot cancel a secondary condition or a restriction. One food dominates another only when it is at least as favorable on **every selected criterion** and strictly favorable on at least one. The first tier contains every eligible food that no other eligible food dominates. Removing that entire tier and repeating the test produces the next tier. Foods in the same tier have tradeoffs or equal selected values. An earlier-tier food does **not** necessarily dominate every later-tier food; tier placement does not establish an individual pairwise advantage between arbitrary products.

Example: cereal A has less saturated fat but more sodium than cereal B. With both heart health and hypertension selected, both can share a tier. The app does not invent a numeric exchange rate between fat and sodium. With hypertension alone, sodium controls that limited comparison. This is a transparent comparison of values, not an assertion that all same-tier foods have equal overall health effects.

All values are per 100 g. A stable package/provider key determines display order within a tier, not health superiority. The display stops at ten; an explicit count discloses additional tied items. Fewer than ten is a valid result. No unseen alternatives are inserted to fill the list.

Each item exposes factual worse-direction differences compared with a named displayed/reference product across the five available fields. Higher calories or total sugar in this text are factual differences, not absolute harm labels. The reference product is always another eligible product from the same confirmed run and category. There is no weighted nutrition score, undocumented nutrient cutoff, LLM preference or brand preference.

## Validation and remaining release work

The targeted test file covers 16 independent scenarios: multiple-condition tradeoffs, profile revisions, variants and category boundaries, all six restriction failures, celiac/CKD/SIBO/pregnancy gates, missing/stale data, LDL changes, latest-date selection and conflicts, synthetic/future report exclusion, unsupported units/bounds, triglyceride safety holds, explicit diabetes/MASLD limitations, stable ties and the ten-item cap, conflicting GTIN facts, deterministic side-effect-free execution, the input cap and the ordered 500-product maximum.

Command on the verified remote source host:

```sh
cd /path/to/NutriGlimpse
source ops/remote-env.sh
node --experimental-strip-types --test packages/core/test/shelfRanking.test.ts
npm run typecheck --workspace @grocery/core
```

Both passed on October 14, 2026 local project date. A separate seven-run ordered 500-product check on the remote server with Node.js v24.15.0 took 9.6–24.7 ms (median 12.9 ms). This desktop measurement is not an iPhone performance result; the algorithm computes its dominance graph once in O(n² × criteria), rather than recomputing comparisons for every layer. Tests validate mechanics with labeled fictional inputs, not medical outcomes. No paid provider call or user data was used. This does not certify on-device speed, identity correctness, clinical applicability, complete privacy integration or iPhone/Android acceptance.

Before release, independently reviewed real-product/reference-profile cases must confirm claims and exclusions, proper visible source attribution, current catalog facts and same-category behavior. Device tests must verify that edits rerank retained runs locally, no scan/rank data enter persistence or logs, accessibility works and capture concurrency does not cause stale results. Broader clinical coverage requires reviewed executable rules and missing food/context evidence, not removal of the gates above.
