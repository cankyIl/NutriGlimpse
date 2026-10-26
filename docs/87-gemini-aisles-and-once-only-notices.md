# Gemini aisle display and one-time scan notices

October 25, 2026 (America/New_York).

Status: **backend deployed; included in signed and uploaded build 26.** Apple processing and owner availability are tracked in [the combined release record](88-build26-combined-release.md). Build 25 retains its old client-side aisle rule; install build 26 when available to see the new display. The implementation checkpoint below predates that combined release.

## Result and scope

- Gemini-returned aisle numbers/codes and sections remain attached to the named store, including nearby-store suggestions. Missing aisle URLs or branch evidence no longer erase them. Missing values remain absent; section-only and numeric-zero aisle values are supported.
- Model-returned locations retain unknown evidence status. Source links remain subject to the existing safe-URL/citation handling; no source or stock assertion is fabricated. The wire schema stays compatible with installed clients.
- Streamed and final single-product responses use the same rule. GPT duplicates cannot replace Gemini's aisle, nutrition, rating or ordering.
- The extra branch-page fetch formerly used to decide whether to display a Gemini aisle has been removed from the primary single-product path. The approved prompt, Google Search grounding, nutrition source resolution and model request count are unchanged. No latency improvement has been measured here.
- General AI-estimate, missing-nutrient, comparison-quantity and medical-advice boilerplate is consolidated in the existing initial beta agreement. The global banner now says only "Beta preview". Repeated boilerplate is hidden in current single-product cards/results; retained diagnostics still include it.
- Unknown nutrient cells, invalid/inconsistent nutrient checks, trans-fat rules, dietary/celiac restrictions, kidney care-plan holds, product-specific uncertainties, source links and required attribution remain. Food Facts and USDA/OFF toggles remain available.
- This wording update does not broaden data-sharing consent or reset existing acceptance. New users see it before accepting; existing users can reread the agreement through Privacy. Legacy result renderers retain their existing behavior.

## Exact saved-answer replay

The retained Prego Traditional Italian Sauce scan was replayed through the real local HTTP recognition endpoint with a fictional, health-free Wegmans Northborough store context and stubbed provider returns. No photo/profile was sent to an external model, and no paid model/search request was made.

The original and both returned alternatives — Wegmans Low Sodium Smooth Marinara Pasta Sauce and Victoria Low Sodium Premium Marinara Sauce — now serialize **Aisle 10 · 07B - L**, exactly from Gemini. Nutrients, ratings and reasons match the previous displayed response. GPT's different aisle does not override them. This verifies data handling, not the physical correctness of that aisle or product nutrition.

## Verification

- Full checks passed: 797 core/service tests, TypeScript, mobile lint, nine tooling checks, ten report-input checks, 76 photo UI scenarios, needs/onboarding and news checks, and shelf-nine UI interactions.
- Photo UI passed with timing disabled and enabled. Twelve existing shelf-grid UI scenarios passed.
- Seven focused aisle regressions cover missing URLs, missing aisle values, section-only/zero values, bounded text, retailer/source association, preserved nutrition/restriction gates, GPT duplicate priority, streaming/final parity and no extra retailer requests.
- UI regressions verify aisle visibility without a source, absence of repeated boilerplate, initial-agreement coverage, retained dietary warnings and Unknown nutrient cells.
- iOS JavaScript/Hermes export and whitespace checks passed. No signed native build or physical iPhone test is claimed.

## Concurrent work and release handoff

The side conversation's source files for shelf grid 9, parallel Gemini/GPT dispatch, privacy, profile concerns, server route registration and diagnostics were not edited. Captured starting source hashes were rechecked. Its independently updated project-plan/handoff prose was preserved, and this checkpoint was appended to the current plan rather than replacing it.

Package these changes with the completed side-chat work in a subsequent combined release. Use the current shelf handoff, not its superseded alternating-batch description. The new one-time notice is in BetaAgreement; current single-product presentation uses GroceryReviewView and AiProductCard's scoped notice option. No signing or shared app/EAS configuration was changed.

Local verification evidence: artifacts/scan-aisle-and-notices-2026-10-25/. Raw private diagnostic responses and identifiers stay outside public documentation/source control.
