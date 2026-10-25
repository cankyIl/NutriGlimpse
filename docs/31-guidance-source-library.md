# Guidance source library — October 14, 2026

## Current integration — October 14–15, 2026
All 26 saved entries, five sources and both serving tables (128 cells) are now projected into the offline guidance-library screen. Explicit DASH/DGA reference comparisons preserve original units and source conflicts; no personal target is selected automatically. Seven archive validation tests and three core tests pass. Earlier “not integrated” statements below describe the original collection checkpoint. See [current development evidence](37-independent-development-checkpoint.md).

## Delivered

Collected the four requested source families into an internal, versioned guidance library: NHLBI DASH, NIDDK diabetes, NIDDK adult CKD, and Dietary Guidelines for Americans 2025–2030. Five guidance documents (including the DGA serving supplement), an official edition index, and two reuse-policy pages were downloaded directly from their official hosts. Eight original snapshots have retrieval times, URLs, byte counts and SHA-256 integrity hashes.

The library contains **26 structured entries and two serving tables with 128 calorie/group cells**. This is a curated nutrition-guidance extraction, not an exhaustive executable transcription of every recommendation. Complete source snapshots preserve the rest for further review. No API key or paid account was needed.

## Source status

| Source | Collected content | Source version | Integration status |
|---|---|---|---|
| NHLBI DASH | Pattern principles, sodium options, seven calorie-level serving columns and serving examples | Updated February 25, 2026 | Collected and structurally validated; not activated |
| NIDDK diabetes | Plate method, carbohydrate counting, meal timing, portions and individualized-plan requirements | Reviewed October 2023 | Collected and structurally validated; not activated |
| NIDDK adult CKD | Sodium, potassium, phosphorus, protein, fluids and applicability restrictions | Reviewed January 2025 | Collected and structurally validated; not activated |
| DGA main publication | Pattern guidance, source-stated nutrient references and special-population boundaries | January 2026; 2025–2030 edition | Collected and structurally validated; not activated |
| DGA serving supplement | Twelve calorie-level serving columns with source-specific serving definitions | 2025–2030; separate publication date not stated | Collected, table visually verified; not activated |

## Exact files

- data/guidance/library.json — entries with source, section/page, publication version, population, required inputs, exceptions, published values, attribution and review status.
- data/guidance/serving-tables.json — DASH and DGA tables; daily and weekly units preserved.
- data/guidance/sources/2026-10-14/manifest.json — retrieval and integrity metadata.
- data/guidance/sources/2026-10-14/ — original public source snapshots. These are research evidence; original logos/photography are not repurposed in app UI.
- ops/collect-guidance.py — bounded official-source acquisition; refuses replacement of an existing completed snapshot.
- ops/validate-guidance.py and ops/test-guidance.py — integrity, source reference, unit, review and nonactivation checks.
- artifacts/remote/guidance/ — validation report, tests, extracted PDF text and reviewed page renders.

## Important distinctions preserved

1. DASH favors low-fat/fat-free dairy; the main 2025–2030 DGA favors full-fat dairy. Its serving supplement also lists lower-fat options. These remain separate source statements, not a merged universal rule.
2. DASH and DGA use different food-group serving definitions. Neither is automatically equivalent to the package serving or 100 g.
3. NIDDK CKD targets depend on clinical context; the library invents no potassium, protein or fluid limits. The CKD page still cites the 2020–2025 DGA; that citation was not relabeled as current.
4. DGA sodium age bands, daily saturated-fat energy percentage and per-meal added-sugar ceiling retain their different units, scopes and comparison operators. None becomes a default personal target.
5. Total sugars are not added sugars or total carbohydrate. The current comparison schema lacks several inputs needed for these topics: total carbohydrate, added sugars, protein, potassium, phosphorus, fluid volume and validated food-group equivalents.
6. General source statements do not establish product-level medical suitability. Existing dietary/certification checks and personal-data gates remain unchanged.

## Reuse and attribution

NHLBI's policy supports reuse of most public-domain information with attribution and without suggesting endorsement; formatted publications and restricted third-party assets need separate care. NIDDK permits much educational reuse but specifically restricts using its content to recommend specific medical advice, treatments or referrals. The library records those restrictions. No endorsement, certification or legal clearance is claimed for personalized use. DGA entries are attributed factual extractions; no agency artwork is incorporated in the app.

## Validation

- All eight downloaded snapshots pass byte-count and SHA-256 verification.
- Five guidance document references resolve to the archived manifest.
- All 26 entries have source locators, population/scope and explicit pending clinical-review status.
- All 128 table cells align with their calorie columns; the DGA serving table was visually checked against the PDF.
- Seven focused tests passed, covering snapshot tampering, source references, accidental activation, daily/weekly confusion, missing columns and invented CKD targets.
- No mobile or service runtime code changed, no backend restarted, no native build claimed for this data-collection task. Concurrent Shelf Benchmark work was preserved.

## Next steps

- Integrate a cited educational guidance view and source/version display. The library is currently saved in the project, not loaded into the live app.
- Build and validate factual plan-comparison logic with explicit plan/portion selection, missing-data behavior and source-specific units.
- Resolve source applicability and conflicts with a qualified reviewer before activating personalized medical rules.
- Expand product nutrient coverage before any carbohydrate, added-sugar, potassium, phosphorus or protein calculation.
- Establish a versioned source-update process that flags changed content for review; no automated ongoing refresh was scheduled.

## Official sources
- [NHLBI: Following DASH](https://www.nhlbi.nih.gov/health/dash/following-dash)
- [NIDDK: Healthy Living with Diabetes](https://www.niddk.nih.gov/health-information/diabetes/overview/healthy-living-with-diabetes)
- [NIDDK: Healthy Eating for Adults with Chronic Kidney Disease](https://www.niddk.nih.gov/health-information/kidney-disease/chronic-kidney-disease-ckd/healthy-eating-adults-chronic-kidney-disease)
- [Dietary Guidelines for Americans, 2025–2030](https://cdn.realfood.gov/DGA.pdf)
- [DGA 2025–2030: Daily Servings by Calorie Level](https://cdn.realfood.gov/Daily%20Serving%20Sizes.pdf)
- [NIDDK reuse policy](https://www.niddk.nih.gov/copyright)
- [NHLBI attribution and reuse policy](https://www.nhlbi.nih.gov/about/contact/trademark-branding-and-logo)

## Collected guidance entries

These summaries are reference content, not personalized advice. Numeric reference values and complete input requirements are in the JSON library.

| Entry | Source | Collected guidance | Source section/page |
|---|---|---|---|
| dash-pattern | dash | DASH organizes food groups into an eating pattern whose portions depend on energy needs. | Getting Started; Serving Sizes |
| dash-sodium | dash | The source presents two daily sodium limits; neither is automatically assigned to a user. | Maximum sodium limit; footnote d |
| dash-grains | dash | Favor whole grains for most grain servings. | Food servings table; footnote a |
| dash-dairy | dash | The DASH pattern specifies low-fat or fat-free dairy. | Food servings table |
| dash-portions | dash | DASH food-group servings and package-label servings are different measures. | Serving Sizes, Examples, and Significance |
| diabetes-plate | diabetes | A plate-based meal pattern allocates half to nonstarchy vegetables, one quarter to carbohydrate foods and one quarter to protein. | Plan how much to eat or drink > Plate method |
| diabetes-carbs | diabetes | Carbohydrate counting considers amounts across meals and snacks. Not everyone with diabetes needs it. | Carb counting |
| diabetes-foods | diabetes | Discuss fiber-rich foods, unsweetened drinks and reducing sodium and saturated fat within a meal plan. | Choose healthy foods and drinks |
| diabetes-timing | diabetes | Meal timing depends on medicines, activity and other conditions. | Find the best times to eat or drink |
| diabetes-target | diabetes | A care team can tailor the meal-planning method and portions. | Plan how much to eat or drink |
| ckd-scope | ckd | CKD has no single diet; requirements change with kidney function and treatment. | How can I eat healthy with CKD? |
| ckd-sodium | ckd | Compare sodium amounts, but obtain the individual limit from the care team. | Sodium; Choose and prepare foods with less salt and sodium |
| ckd-potassium | ckd | Potassium needs depend on blood levels; low-sodium substitutes may contain potassium chloride. | Potassium; Choose foods that help keep your potassium level in the goal range |
| ckd-phosphorus | ckd | Phosphate ingredients can flag added phosphorus, but do not quantify its amount. | Choose foods and drinks with less phosphorus |
| ckd-protein | ckd | Protein requirements vary; dialysis can increase needs. | Protein; Choose the amount and types of protein your body needs |
| ckd-fluid | ckd | Fluid limits, when needed, depend on kidney function and clinical guidance. | Liquids; Track your liquids |
| dga-food-pattern | dga | The edition emphasizes nutrient-dense foods, varied produce, whole grains, water and unsweetened drinks. | Printed pp. 2–4 |
| dga-protein | dga | The publication gives a body-weight-based protein range. | Printed p. 2: Prioritize Protein Foods |
| dga-dairy | dga | The main publication favors full-fat dairy without added sugars. | Printed p. 2: Consume Dairy |
| dga-saturated-fat | dga | The general saturated-fat ceiling is expressed as a share of daily energy. | Printed p. 3: Incorporate Healthy Fats |
| dga-added-sugars | dga | The edition discourages added sugars and states a per-meal ceiling. | Printed p. 4: Limit Highly Processed Foods, Added Sugars, & Refined Carbohydrates |
| dga-sodium | dga | Sodium guidance varies with age and notes high-activity exceptions. | Printed p. 5: Sodium |
| dga-special-populations | dga | Separate sections cover children, adolescents, pregnancy, lactation, older adults and chronic disease. | Printed pp. 6–9: Special Populations & Considerations |
| dga-chronic | dga | The source directs people with chronic disease to discuss adaptations with their health professional. | Printed p. 9: Individuals with Chronic Disease |
| dga-serving-reference | dga-servings | Serving examples and energy-pattern tables use their own definitions; retain those definitions when comparing patterns. | Printed p. 1: Daily Servings by Calorie Level |
| dga-claim-limits | dga-servings | The supplement lists food-group-equivalent sugar limits; these alone do not establish eligibility for the full FDA claim. | Printed p. 2: FDA Healthy Claim: Added Sugar Limits |
