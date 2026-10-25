# Blood-pressure and strict gluten-free label review

Implemented October 14, 2026. Educational label checks only. Personalized medical recommendations and certification decisions remain disabled.

## User-facing behavior
The real-food catalog now has Standard comparison, Blood pressure / DASH, and Strict gluten-free evidence modes. Mode selection is local to the screen; it does not alter the saved health profile or send health information to a provider.

DASH selects sodium comparison initially. For current source data with a valid serving weight, each product shows sodium and saturated-fat amounts and approximate FDA %DV for one listed portion. Missing portions or stale/invalid sources suppress classification. Other nutrients and tradeoffs remain visible in existing comparisons.

Strict gluten-free mode reviews the available ingredient text and withholds alternatives because the current catalog has no verified gluten-free evidence. Positive marketing claims cannot override the existing dietary exclusion. Results remain unverified even if no review terms are found.

The guidance screen now includes DASH, sodium-label interpretation, potassium context, gluten-free evidence, ingredient context and trans-fat rounding: 16 educational cards total, content version 2026-10-14.3.

## Corrections to the proposed pseudocode
| Proposal | Implemented interpretation |
| --- | --- |
| Sodium above 360 mg is high | Use FDA's general 20% DV high cutoff: 460 mg against the 2,300 mg reference. 360 mg is about 15.65% DV, not an official high threshold. |
| Saturated fat above 10% DV is high | The general high cutoff is 20% DV (4 g against the 20 g reference); 10% is between the low/high cutoffs. |
| At most 140 mg means FDA Certified | No certification badge. Legal low-sodium claims involve reference amounts, small-serving and meal rules; a per-serving number alone is insufficient. |
| At least 10% minerals earns cardiovascular support | No automatic clinical-benefit claim. Regulatory good-source and rich/high claims differ; 10–19% and at least 20% respectively, with other requirements. Current mineral data is unavailable. |
| Trans fat of zero is absent | Less than 0.5 g per serving can round to zero. Missing values are unknown. Trans fat is not currently verified in this catalog. |
| Gluten-free text means Safe | A manufacturer claim is not independent certification or app verification. Evidence review remains required. |
| Every keyword means Contains Gluten | Terms prompt review. Token boundaries avoid buckwheat/maltodextrin/maltose false positives. Malt, yeast, processed wheat starch and negated phrases require context. |
| Any wheat advisory proves cross-contact | Separate ingredient/allergen declarations from precautionary advisories. Neither detects or measures contamination; compliant gluten-free claims may coexist with advisories. |

FDA gluten-free labeling uses less than 20 ppm as one requirement. This is a regulatory concentration threshold, not a universal dose at which every individual will develop injury. The implementation never returns Safe/Dangerous as a complete medical verdict.

AHA's daily sodium references are educational, not automatically assigned limits. Potassium guidance must account for kidney function and medications. No automatic increase-potassium recommendation is enabled.

## Evidence and sources
- FDA Nutrition Facts guide: https://www.fda.gov/food/nutrition-facts-label/how-understand-and-use-nutrition-facts-label
- Sodium claims, 21 CFR 101.61: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-D/section-101.61
- Nutrient claims, 21 CFR 101.54: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101/subpart-D/section-101.54
- AHA sodium: https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/sodium/how-much-sodium-should-i-eat-per-day
- AHA potassium: https://www.heart.org/en/health-topics/high-blood-pressure/changes-you-can-make-to-manage-high-blood-pressure/how-potassium-can-help-control-high-blood-pressure
- NHLBI DASH: https://www.nhlbi.nih.gov/health/dash/following-dash
- FDA gluten-free questions: https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/questions-and-answers-gluten-free-food-labeling-final-rule
- Academy gluten-free grocery list: https://www.eatright.org/health/health-conditions/celiac-disease/the-gluten-free-diet-building-the-grocery-list
- NIDDK celiac diet: https://www.niddk.nih.gov/health-information/digestive-diseases/celiac-disease/eating-diet-nutrition
- FDA trans-fat rounding: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/small-entity-compliance-guide-trans-fatty-acids-nutrition-labeling-nutrient-content-claims-and

Short paraphrases and links only; no logos, endorsements or third-party certification decisions.

## Implementation and limitations
- packages/core/src/labelChecks.ts: reference-DV calculations, freshness/portion gating and bounded gluten-text triage.
- apps/mobile/src/ui/LabelChecks.tsx and catalog.tsx: real catalog UI integration.
- CatalogAlternatives passes a required gluten restriction when strict mode is selected; the existing evidence gate excludes all unsupported alternatives.
- Core gluten triage can distinguish front-label text, ingredient text and separate allergen/advisory text. The current catalog supplies ingredients only. The app explicitly identifies the other evidence as unverified.
- No photo/front-label/allergen extraction integration is claimed here. No strict-gluten-free product passes from the existing USDA/OFF records alone.
- The string scan is deliberately incomplete and cannot detect all gluten sources, mistranscription or contamination. Unknown stays unverified.

## Verification
- Workspace typechecks passed.
- All 259 application tests passed; all three tooling tests passed.
- Six focused label-check tests cover 5/20% boundaries, rejected 360/140 shortcuts, missing/stale/invalid amounts, token false positives, claims versus ingredients/advisories, and strict exclusions.
- Lint passed for every mobile file changed by this task.
- Full workspace check stopped at unrelated concurrently edited shelf.tsx lint errors (five errors and one warning); it is not reported as passing.
- Production web export succeeded. Physical phone visual/accessibility acceptance and native build/distribution remain pending; no new APK was built by this task.

## Next work and dependencies
1. Add independently validated trans-fat/mineral data, units, serving basis and provenance before supporting those checks. Provider ingestion/schema work remains.
2. Connect reviewed front-label and allergen extraction evidence to the product identity, current formulation and market. This integration remains engineering work.
3. Verify certification against accepted issuer/product evidence; user/reviewer decisions about acceptable evidence and source access remain.
4. Qualified clinician/dietitian reviews disease-specific rules, exceptions and test cases before personalization.
5. Finish concurrent Shelf Scan checks, then build from stable inputs and verify on the iPhone.

Existing gates remain intact. No request for account credentials or medical data is needed to use the new educational views.


October 14 follow-up: the missing nutrient and product-evidence plumbing is implemented; see [current coverage and remaining product reviews](36-product-label-evidence-and-minerals.md). Earlier missing-field statements in this checkpoint are historical.
