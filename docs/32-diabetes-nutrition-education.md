# Diabetes nutrition education integration

Implemented October 14, 2026. Educational content only; qualified clinical applicability review remains pending.

## What is available
- Food & nutrition guidance screen, accessible from Home, real catalog and sample results.
- Ten short cards (including grain-label and budget shopping tips): individualized MNT, CDC plate method, vegetables, legumes, unsaturated fats, whole grains/fruit, protein/dairy and glycemic index.
- Five direct sources: ADA Nutrition & Wellness, ADA Superstar Foods, CDC Diabetes Meal Planning, MedlinePlus Diabetic Diet and Mayo Clinic Diabetes Diet.
- Four explanations attached to the selected comparison metric. Curated oats, plain yogurt, plain almonds and three canned-legume categories also show general food-group context. Breakfast cereal, granola and instant oatmeal show a whole-grain label inspection prompt, without declaring the product whole-grain.
- Text bundled for offline reading; source links require a browser/network.
- Existing ranking, equal-weight portion basis, all nutrient tradeoffs, three-result cap, freshness and dietary restriction gates are unchanged.
- No health-profile transmission, nutrient inference, medical target, GI score or disease suitability score was added.

Runtime source: packages/core/src/nutritionEducation.ts. Reusable structured copy: data/guidance/diabetes-education.json, regenerated with ops/export-nutrition-education.ts. Policy is educational, source-checked 2026-10-14, clinical review pending, personalizedRecommendationsEnabled=false. This is not a clinical rule pack.

## Sources and scope
1. https://professional.diabetes.org/clinical-support/nutrition-wellness — individualized nutrition care, nutrient-dense eating patterns; the page includes older consensus material and is not itself an individualized prescription.
2. https://www.cdc.gov/diabetes/healthy-eating/diabetes-meal-planning.html — plate method and portion/carbohydrate context; May 2024.
3. https://medlineplus.gov/diabeticdiet.html — no single diet for everyone; medical context and carbohydrate planning.
4. https://diabetes.org/food-nutrition/food-and-blood-sugar/diabetes-superstar-foods — general food-group examples, legumes/dairy contain carbohydrates.
5. https://www.mayoclinic.org/diseases-conditions/diabetes/in-depth/diabetes-diet/art-20044295 — fiber, unsaturated fats, portions and dietitian-guided use of GI; April 20, 2026.

Short original paraphrases and source links are used; no source images, recipes, logos or full articles are redistributed. No source endorsement is claimed. ProjectFoodBox is not used to authorize clinical rules.

## Corrections to the proposed table
- Legumes contain carbohydrates; no promise of preventing dangerous glucose spikes.
- Avocado is presented as a fat-containing, energy-dense food rather than equivalent to low-calorie leafy greens.
- Fermented dairy is not claimed to reduce inflammation; eggs are not promised to have zero glucose effect.
- Total fiber is not soluble fiber. Total sugars are not total carbohydrates or added sugars.
- Neither a lower sugar value nor a product name establishes low GI, omega-3 content or individual suitability.
- Food examples never override allergies, required certifications, kidney-specific restrictions or a clinician's plan.

## Validation
- Full workspace check passed: typecheck, mobile lint, 205 application tests and three tooling tests.
- Existing archived guidance remains valid: eight source snapshots, 26 entries and 128 serving-table cells; all seven guidance validation tests passed.
- Three new focused tests cover traceable sources/disabled personalization, conservative category mapping and missing-data/nonmutation behavior.
- Existing comparison regressions verify nutrition completeness, freshness, restrictions, ranking and tradeoffs across categories.
- Preview opens in isolated Chromium. Interactive browser acceptance was blocked by automatic approval review (generic policy rejection); new-screen visual acceptance remains pending.
- Android compilation and APK v2 signature verification passed. Publication was correctly blocked because concurrent Shelf Scan Swift source files changed during the build; no new distributable APK or physical-device acceptance is claimed. Rebuild from stable sources before distribution.

## Remaining work
- Qualified clinician/dietitian reviews wording and clinical applicability before any personalized medical rules.
- Verify new screens, external links, font scaling and metric explanations on the physical iPhone.
- Existing 26-entry DASH/NIDDK/CKD/DGA reference library remains separately collected, not automatically activated by this education module. Full library UI/plan integration and missing product nutrients remain pending.


## ADA Superstar Foods follow-up — October 14, 2026
Re-read the requested guide and checked coverage against the existing cards. The listed leafy vegetables, avocado, legumes, omega-3 fish, nuts, berries, citrus, whole grains and dairy were already represented. Added the missing practical tips: grain-label inspection, fish preparation and budget shopping. Education content version is now 2026-10-14.2 with ten cards.

The article is food-group guidance, not a product-level low-GI database or an ADA certification list. No branded product is labeled ADA-approved or medically suitable. No clinical flags, nutrient values or ranking logic changed. Updated structured export: data/guidance/diabetes-education.json.

Follow-up validation: workspace typecheck and mobile lint passed; **206 application tests and three tooling tests passed**. This includes a new regression check that cereal guidance does not certify whole-grain content or bypass category evidence. No new native build or visual acceptance was performed for this copy/context extension.


## Later extension: blood-pressure and gluten evidence
Education version 2026-10-14.3 now includes 16 cards and additional FDA/AHA/NHLBI/Academy sources. See [condition-related label checks](34-blood-pressure-gluten-label-checks.md) for the new modes, source corrections, validation and limitations. Earlier counts above describe their original checkpoints.
