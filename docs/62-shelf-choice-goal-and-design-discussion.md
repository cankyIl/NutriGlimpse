# Shelf Camera: choosing among products in front of the shopper

**Date:** October 17, 2026  
**Status:** User goal clarified; design discussion in progress. This is not an implemented GPT shelf flow or a new release. TestFlight build 10 remains unchanged.

## User-stated goal

Scan a shelf containing similar products from different brands, identify the distinct products, weigh their pros and cons, and highlight the best fit for the shopper's life situation. Example shelves include cereal, bread, pasta sauce, cheese, milk and juice.

The primary question is: **Of the products visible here, which best fits my selected needs, and why?**

The shelf comparison must lead with products actually observed during the scan. Select the best supported choice (or tied leading choices). If even that choice remains Neutral or Not healthy, use the normal single-product alternatives flow to find up to three suitable improvements. Unseen suggestions must appear separately from the observed shelf ranking, clearly labeled as not observed; store availability is not implied.

## Intended experience

1. Collect useful views as the shopper moves along the shelf. Detect distinct packages; merge repeat sightings while preserving brands/flavors/formulations.
2. Identify the category and comparable product types. Suggest the category with a correction option. Similar aisle placement alone does not establish nutritional equivalence.
3. Identify readable products using the AI-assisted recognition approach under discussion. Ordinary matches should not require choosing repeatedly from a catalog list. Uncertain identity/variant remains visible and correctable; a closer view may be required before reliable ranking.
4. Build one evidence-aware product record per distinct identity. Preserve nutrition estimates versus verified package/source facts, unknown nutrients and formulation conflicts. Reuse the established per-card source-check controls.
5. Compare the sufficiently identified and assessed foods using current selected needs, goals and restrictions, on comparable quantities. Benefits must be weighed against relevant drawbacks; a single favorable nutrient must not erase a more important concern. Do not invent personal medical targets or treat missing evidence as favorable.
6. Highlight the leading choices with concise reasons and relevant trade-offs; retain the existing up-to-ten shelf comparison scope. Lead explanations with the shopper's applicable priority. Ties and insufficient evidence are legitimate outcomes.
7. Distinguish **best among these observed products** from absolute health suitability. If all available choices have significant drawbacks, say so; never force a green rating because one is relatively better.
8. Keep capture, preview, results and source checks responsive as products arrive. Preserve run boundaries, cancellation, background cleanup, and memory-only shelf results.

## Best shelf choice, then alternatives if needed

**User clarification:** Take the best of the products on the shelf. If even the best is not good, suggest alternatives as in a normal single-product scan.

- First rank the adequately identified and assessed products actually seen. Highlight the best supported option, preserving ties and relevant drawbacks.
- Judge that option independently of its rank. Healthy / Very healthy does not automatically need an outside-shelf alternatives section. Neutral / Not healthy triggers the normal alternatives workflow. Retain the existing conservative handling of model/rule rating disagreements instead of suppressing alternatives merely because one assessment is green.
- Treat the selected shelf product as the original product for the normal category-specific comparison. Find up to three distinct suitable improvements; address the winner's leading concern first in both eligibility and explanations, and show relevant trade-offs.
- Use the established product-card presentation: product title, small matching photo or honest fallback, checked rating, terse reasons, per-card food facts/source toggle, and independent nearby-store lookup where applicable.
- Clearly separate **Best among products scanned** from **Better alternatives to look for**. An outside product is not claimed to be on the scanned shelf or in stock.
- Preserve all nutrient, equal-quantity, dietary/evidence and privacy/clinical checks. Do not repeat observed products already found inferior, or pad the list to reach three.
- If no shelf product can be reliably identified/assessed, do not manufacture a winner or convert missing information into a red rating. Explain the missing information or request a clearer view. If no suitable outside alternative passes, say so.
- This adds a conditional reuse of the normal alternatives flow, not a separate outside-alternatives request for every shelf item. Batching, dispatch costs and cancellation remain part of the pending AI design.

## Meaning of life situation

Use the existing locally saved health concerns, goals and dietary restrictions when supported by the comparison policy. Any use of age, pregnancy context, confirmed reports or clinician-provided targets must respect applicability, explicit consent and the current privacy/clinical gates. Not every stored field should change a ranking, and raw lab numbers do not justify invented targets.

This clarification does not enable personalized medical recommendations, turn off restriction checks, authorize new profile/lab uploads, or enable weight transmission. General and relative nutrient comparisons can be engineered and evaluated separately from reviewed clinical recommendations.

## AI/image-transfer design still to settle

The prior user request to brainstorm image transfer before implementing shelf uploads remains in effect. A candidate design to evaluate is useful shelf frames plus a small bounded set of clearer package crops, with duplicate suppression and strict image/byte/request budgets, rather than uploading continuous video. This is a proposal, not a measured performance result or an approved API contract.

The next engineering design should specify:
- when a new shelf view is useful and when a package needs a closer crop;
- batch size, image detail, payload limits and cost within the existing authorization;
- associating each response with a visible package and preventing stale or mixed results;
- model identification/nutrition/pros-and-cons output versus deterministic checks and local user-context handling;
- incremental results, cancellation, uncertainty, fallback and partial failures;
- tests for cereal, bread, sauce, cheese, milk and juice across brands and variants.

No new account is inherently required for this design work. Do not increase the AI spending limit or send paid shelf requests during the discussion.

## Actual build-10 boundary

The packaged source currently uses ShelfSet/SKU-110K package detection and Apple Vision barcode/text reading on the iPhone, catalog matching with text confirmation, and local per-100-g comparison groups of confirmed same-category foods. It does not invoke GPT-6 Luna for shelf recognition or generate the normal scanner's colored ratings and three external alternatives per shelf product. Shelf images are not uploaded by that current implementation.

This gap remains open. The normal single-product GPT flow and build-10 TestFlight delivery are unaffected.

## Acceptance examples

- A shelf of different cereal brands: distinct variants are retained, repeated boxes do not occupy multiple top positions, and comparisons explain relevant differences.
- A lower-priority benefit cannot hide a worse result on the shopper's leading concern or an unmet restriction.
- No unseen catalog product is labeled as a product found on the shelf.
- Unreadable, uncertain or insufficiently evidenced products cannot silently displace supported choices.
- All poor-fitting choices produce an honest relative comparison, not a fabricated healthy winner.
- Best shelf choice still Neutral / Not healthy: show its actual rating and up to three checked outside-shelf improvements, explaining its leading concern first. Healthy / Very healthy winner: no automatic outside-shelf alternatives.
- Rating disagreements follow the normal conservative alternatives trigger; incomplete evidence produces an unknown/needs-information state, not a forced winner or false unhealthy verdict.
- Results remain consistent after moving the camera, pausing, revisiting a run and changing local needs; physical recognition/ranking tests remain required.

No app/backend code, configuration, native build, upload or paid model request changed in this documentation checkpoint.
