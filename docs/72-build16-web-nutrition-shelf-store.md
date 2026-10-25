# Build 16: web nutrition, shelf batches and selected-store listings

Status: October 18, 2026, 7:31 p.m. Eastern. **Build 0.1.0 (16) is Apple VALID / IN_BETA_TESTING and available to the existing owner group.** Phone installation and physical acceptance are not yet confirmed.
EAS build: 5ec7eb4b-c0b3-4d40-b509-f21965c04ed5. Version 0.1.0 (16).
Submission: b6b55bb1-a323-4378-80ae-1376294620dc.
Frozen source: artifacts/iphone-build16-2026-10-18/cloud-archive-web.
326 archive files; no removed build-15 paths. Nine existing paths changed and two were added. News, measurement/report/native input code, approved artwork and both shelf detectors are preserved. Backend changes are separate from the fixed iPhone archive.

## User decisions and nutrition flow

The user requested model-driven web confirmation, not a second backend nutrition lookup. Normal scans use the new v5 route. GPT-6 Luna and Claude Haiku 5.5 search public product sources themselves, identify the exact US formulation and serving, and return source links. The backend does not fetch/parse manufacturer nutrition or automatically substitute catalog facts. The optional Check USDA / OFF button still shows possible database matches within the same product card.

A source link must appear in that model's actual search-tool results. This is provenance validation, not independent verification that the model read every value correctly. Missing or unmatched source evidence clears nutrition, serving, ingredients and rating to unknown. The phone labels web facts and links their source. Schema, unit/plausibility, equal-weight comparison, dietary and certification guards remain. Up to three alternatives may pass; three are never guaranteed.

Both reviews can complete without both confirming nutrition. An unsourced review contributes no numeric evidence; the sourced result remains explicitly partial. Two sourced reviews with conflicting ratings cannot become a favorable average or whichever reply arrived first. The existing v4/shelf nutrition flow is retained; this release does not silently enable per-cell web search for shelf grids.

## Claude integration

Detailed failure classification separates provider transport, incomplete stream, JSON and schema problems. Original older failures cannot be conclusively attributed because those traces stored only the generic failure bucket.

The new hosted-search integration revealed a separate compatibility problem: Anthropic search uses citations, which conflict with constrained JSON text output. Claude now searches and finishes through a strict submit_food_review tool carrying the same data schema. This tool is only a structured answer; it performs no lookup or side effect. There are at most six searches and one bounded model request per review, with no automatic paid retry. A search that finds no exact label stays unconfirmed.

References: [Anthropic structured-output compatibility](https://platform.claude.com/docs/en/build-with-claude/structured-outputs#feature-compatibility), [Anthropic web search](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool), [OpenAI web search](https://developers.openai.com/api/docs/guides/tools-web-search).

## Public-fixture evidence and latency

Only a public Wegmans manufacturer image was used in these live tests; no private scan image was replayed or saved.

- Initial GPT web test: 620 mg sodium per 125 g from https://www.wegmans.com/shop/product/51558; approximately 14.4 seconds.
- Later dual-provider test: GPT completed in 19.77 seconds (30,009 input / 1,409 output tokens; three web calls). Claude completed its search/structured answer in 4.36 seconds (32,686 input / 433 output tokens; two searches) but could not confirm an exact source. The displayed source was GPT's Wegmans page, 620 mg per 125 g.
- No alternatives passed in that fixture. This is not evidence that alternatives do not exist or that catalog coverage is complete.
- Intermediate failed Claude integration experiments are retained as diagnostic evidence, not successful scans or product accuracy claims. One forced-search-only experiment reached its tool limit; that configuration is not used in production.

The user considers 14 seconds unacceptable. First sourced food facts now stream before a slower second review. Final ratings and alternatives wait for validation, so provisional values cannot briefly appear as an approved final choice. A bounded, nutrition-free fast identity request now runs in parallel; it is a backend change compatible with build 16. It cannot change sourced nutrition or hold a completed final result. The deployed public HTTPS/client test showed identity at **1.689 seconds**, and final sourced facts at **16.998 seconds**; sodium remained 620 mg per 125 g. No separate earlier food-facts frame was emitted in that run because the preview/final identity fields differed. This demonstrates a faster identity preview, not a faster completed nutrition lookup.

Remaining latency engineering: original-nutrition-first retrieval separated from alternative research; conservative reuse of recent exact-product sourced facts with explicit freshness/refresh behavior; stage-by-stage phone measurements across cold, repeat and failed searches. These are independent engineering items, not account dependencies. No single live sample is a latency guarantee. No guessed nutrition is used to improve the timing.

## Shelf failure and fix

The screenshot showed 20 packages captured, zero checked, and a camera batch error. React Native's UIManagerBinding.cpp injects target into native event payloads. ShelfGridSession previously spread that event into a strict API request, causing admission to fail on the phone before a batch reached the backend.

The adapter now explicitly copies only the documented grid and cell fields. The server schema remains strict. A regression exercises a full 16-package event plus a final four-package event, including native metadata, and verifies 20 processed packages and two acknowledgments. The production screen interaction harness now includes target in its event fixtures. Invalid dimensions/cell associations remain rejected. Physical iPhone acceptance of this fix remains required.

## Store context

The availability query previously used the selected branch address but omitted the selected retailer. Nearby Target listings could therefore appear while the shopper was at Wegmans.

Queries now include the chosen retailer and address, and valid matching retailer listings sort first. Stock at another chain no longer suppresses the fallback search. The phone shows Shopping at <selected store> and labels other retailers explicitly. If no listing exists for the selected retailer, availability there is unconfirmed; this does not mean out of stock. Same-chain evidence still does not establish the exact branch or live inventory. GPS/current-store accuracy needs physical testing separately.

## Verification and boundaries

The full workspace check passed again after the optional preview addition: 575 core/service tests, nine tooling tests, ten report-input adapter tests, 11 news collector tests, and news UI checks. iPhone JavaScript export, 55 photo/home interaction cases in each timing mode and ten shelf interaction cases passed. The phone archive remained unchanged during the backend-only preview addition. These are automated checks with mocked native boundaries, not a physical camera acceptance claim.

The tested beta backend was restarted separately; loopback/public v5 capability and the public HTTPS streamed photo flow are verified. Public checks require an explicit application User-Agent because the edge rejects the default Python client. No portfolio service was changed. Release and deployment evidence is under artifacts/claude-diagnosis-2026-10-18 and artifacts/iphone-build16-2026-10-18.

Private photo/profile/report storage remains unchanged. Product model requests exclude health profiles/labs/location. Personal medical recommendations remain disabled. Model rights/source-publication decisions remain deferred, not legally cleared.

## Next latency implementation sequence

1. Separate exact original-product web confirmation from alternative discovery. Show its cited facts when ready; retain the pending-review state until the applicable checks finish. A fast identity response remains non-nutritional and cannot approve a rating.
2. Start alternative research independently once identity/category and original facts are usable. Fill up to three cards progressively only after equal-basis nutrition and dietary checks. Late replies must belong to the same scan and original formulation; cancellation must prevent results from a previous scan appearing.
3. Reuse recent exact-product sourced facts for repeat scans, with provenance, recorded freshness and refresh behavior. A brand/name-only similarity is insufficient. Do not reuse across variants, markets or conflicting serving/formulation evidence. No raw photo, location, health profile or individualized judgment belongs in this facts cache.
4. Measure identity, original facts, final judgment, first alternative and complete alternatives separately, with cold searches, repeat products, poor connections and missing-source cases. Report repeated-sample distributions rather than claiming the single 1.689-second preview proves end-to-end speed.

These steps are planned, not included in build 16. They require engineering and validation, not a new account or key. Reusing prior sourced facts does not add the independent manufacturer-page scraping path the user declined.

## Completed release evidence and phone acceptance

- EAS build: 5ec7eb4b-c0b3-4d40-b509-f21965c04ed5; submission: b6b55bb1-a323-4378-80ae-1376294620dc (FINISHED).
- Apple build: dc462a35-fc10-44cd-8eac-65c654d07673; VALID / IN_BETA_TESTING, usesNonExemptEncryption=false.
- Existing private owner group is attached, with no new testers or public link. Exact English TestFlight notes were read back and matched.
- IPA: 58,359,669 bytes; SHA-256 f148ac485f49e4b12cde2defc2a1044542b9257e31cac0522552d2c269b7f22b.
- Native package inspection checked CRC, arm64 executable, bundle/version, current store distribution profile/CMS signature, encryption declaration, permission descriptions, source-card/store/news/measurement markers, artwork and both compiled shelf detectors. Full app-signature trust validation and physical device execution are not claimed by the Linux inspection.
- All 326 frozen phone source paths matched current source after upload. No side-chat files were removed or reverted.

Phone acceptance: update Health & Grocery to version 0.1.0 (16) in TestFlight. Retry the same sauce and open its nutrition source; note the time to product name and to nutrition separately. Try a shelf scan with fewer than 16 packages, then a full batch plus a smaller final batch. With Wegmans selected, check that the page says Shopping at Wegmans and labels any other retailer separately. Report build number, approximate scan time and the exact message if a failure occurs; no private report is needed. Availability does not imply these device checks have passed.
