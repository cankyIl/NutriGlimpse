# Product-photo results: enhancements and visual preview

**Current update:** Build **0.1.0 (4)** is available to the existing owner group in TestFlight. The approved product cards, LLM-first flow, recovery improvements and completed side-chat home/news/My Needs work are included. Automated checks and signed native artifact verification pass. Physical acceptance of this update remains pending. This supersedes historical preview-only status below. Later source expansion and audience tailoring keep their separately documented status. See [release checkpoint](49-approved-cards-and-home-release.md).

Updated October 16, 2026 at 10:59 PM Eastern. **Preview and investigation only. No app/backend source change, new build, TestFlight upload or deployment was made for this increment.** Existing build 0.1.0 (3) remains the released build. The user requested an image before another upload and ongoing enhancement documentation.

## User feedback and latest decisions

- Honey Nut Cheerios produced a review on two of four attempts; two attempts reported that review was unavailable. Exact cause of those particular failures is not proven: production does not retain user photos or full model responses.
- Try to return multiple distinct comparable alternatives, up to three, rather than routinely just one. Do not duplicate package sizes to fill the list.
- Show a small real package photo for both the original and recommended products.
- The LLM's identified product and information become the primary display. USDA/Open Food Facts should be an optional per-product check, not an automatic replacement when matching is uncertain. This supersedes the current requirement that a database match must exist before showing the main product information.
- LLM-recalled nutrition is an estimate, not verified label data. Make that distinction concise and visible; retain unknown values and do not invent certification, dietary suitability, source citations, inventory or personalized medical approval.
- Put every food in its own card. Its thumbnail, rating, short reasons, Food Facts, and source-check controls belong inside that card. Food Facts expands for that exact food, avoiding the current Details control beneath the alternatives.
- Match the side-chat Berry & Citrus purple/lime direction. Do not overwrite or mislabel the separate home/news work (FB-09–15).

## Enhancement register

| ID | Requested enhancement | State / next verification |
|---|---|---|
| FB-16 | Consistent photo review and useful failure recovery | Implemented: one model stage, bounded timeouts, alternative isolation and explicit recovery; exact historical failures not proven |
| FB-17 | Up to three distinct useful alternatives | Implemented: up to five candidates checked for three distinct alternatives; final three public fixtures return three |
| FB-18 | Thumbnail on original and every alternative | Implemented: transient original photo and attributed matching OFF reference photos; missing/upstream-failed photos use package icon |
| FB-19 | LLM-first product identity, facts and explanations | Implemented: LLM-first estimates, independently guarded general ratings; no personal data sent |
| FB-20 | Optional Check USDA / Open Food Facts inside each card | Implemented: optional per-card source check; possible matches never silently replace primary facts |
| FB-21 | Food Facts inside each product card | Implemented: Food Facts expands inside its own card; interaction checks pass |
| FB-22 | Review an image before the next upload; document enhancements continuously | Preview approved; implementation and native checks complete; build 4 available in owner TestFlight |

## Visual proposal

![Product-card overview and expanded Food Facts](../artifacts/scan-quality-2026-10-16/product-cards-preview.png)

[HTML preview](../artifacts/scan-quality-2026-10-16/product-cards-preview.html). The mockup uses **illustrative ratings, reasons and amounts**, not a completed scan or validated recommendation. It proposes vertically scrolling alternative cards so each product's controls remain together; this layout detail is a proposal for review, superseding the earlier horizontal carousel only if accepted. It does not claim backend buttons are functional.

Photos were returned by Open Food Facts product records, with CC BY-SA 3.0 attribution:

- [Honey Nut Cheerios](https://world.openfoodfacts.org/product/0016000401068)
- [Original Cheerios](https://world.openfoodfacts.org/product/0016000275263)
- [Nature's Path Heritage Flakes](https://world.openfoodfacts.org/product/0058449770213)
- [Wegmans Bran Flakes](https://world.openfoodfacts.org/product/0077890610251)

## Investigation findings, not completed fixes

1. The current provider rejects the entire assessment when any supplied product row is missing, duplicated or unexpected. This can discard a usable original review because of an alternative; it has not been proven to be the cause of the user's two failures.
2. Only three first-stage candidate identities are requested. Failed identity lookups, insufficient nutrition or unsuitable candidates shrink that list; the service does not backfill it.
3. The existing original-product component does not render a thumbnail. Alternatives render one only when a current exact-barcode OFF image is attached. Nutrition-record eligibility and upstream pacing can prevent optional image enrichment.
4. Existing Details is positioned after alternatives inside a parent card, obscuring which product it describes. Its nutrient/ingredient record is USDA or OFF; additional education comes from the linked guidance library. The previous synthetic Honey Nut fixture used USDA 2776977, but the specific four user scans cannot be identified retrospectively from retained logs.
5. Read-only catalog audit: 108 breakfast-cereal records; multiple packages of the same Cheerios formulation are not distinct alternatives. Public-record lookups returned real thumbnails for the preview's four foods.

## Implementation and acceptance sequence

1. Incorporate visual feedback without starting a cloud build yet.
2. Specify and test the LLM-first response contract: identifiable product, concise general reasons, optional/unknown estimated nutrient amounts, up to three distinct alternatives, no personal medical advice, and explicit uncertainty.
3. Implement isolated per-card source checks and source comparison, preserving the LLM identity and showing conflicts. Do not mix nutrients from different products or formulations.
4. Implement image resolution and per-card expanding facts; support loading/error/fallback states, large text and screen-reader labels.
5. Add stage-level diagnostic categories, bounded timeout/recovery and repeated-fixture tests. Respect the existing $2 budget; do not blindly retry a request that might already have been billed.
6. Run mobile/core/service checks, compare with the latest shared source and side-chat handoffs, then build and validate a new numbered iPhone update after the requested visual-review step.

Evidence: `artifacts/scan-quality-2026-10-16/` contains audit tooling, public image metadata, render source, HTML/PNG and render checks. All six rendered image instances loaded. No paid model call was made in this preview increment; read-only ledger audit found $0.52 reserved across existing calls, not actual billed cost. No medical-personalization gate, privacy gate or other service was changed.
