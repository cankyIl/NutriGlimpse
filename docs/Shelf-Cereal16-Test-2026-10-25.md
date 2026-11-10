# Live cereal shelf test — October 25, 2026

This is a historical test of the October 25 snapshot. Read the [current project plan](ImplementationProjectPlanDocument.md) for subsequent fixes and current release status.

## Outcome

Partial pass. Both parallel batches streamed successfully, but cross-batch duplicate handling failed: 13 displayed product cards instead of 10. No application source, deployment, prompt, or release configuration was changed for this test.

## Fixture and method

16 box appearances split into nine plus seven occupied cells in two 3x3 grids; 10 unique cereal products and six repeated appearances. All source images came from Wegmans product listings. Slight brightness, rotation, blur and JPEG variation simulate post-detector crops. Listings establish retailer catalog presence, not stock at Northborough today. No personal health context was sent. Store context was Wegmans, Northborough, MA.

The actual ShelfNineSession, reviewShelfNine client, NDJSON HTTP route and live parallel Gemini/GPT provider were used through an ephemeral loopback listener. First grid at t=0; second grid and Finish at t=2 seconds. This tests post-camera pipeline behavior, not physical iPhone camera detection, cellular transport, UI rendering or clinical correctness.

## Timing

| Event | Time from first dispatch |
|---|---:|
| First valid product card | 5.505 s |
| First displayed rating | 10.544 s |
| Both grids processed by primary | 12.632 s |
| All model calls/session completed | 55.934 s |

| Call | Request duration | Input tokens | Output tokens | Reported search count |
|---|---:|---:|---:|---:|
| gemini batch 1 | 10.570 s | 1,923 | 3,259 | 7 |
| gpt batch 1 | 55.719 s | 54,904 | 2,259 | 6 |
| gemini batch 2 | 10.689 s | 1,917 | 3,465 | 6 |
| gpt batch 2 | 45.945 s | 44,151 | 1,661 | 6 |

Token figures include provider tool/context accounting. Search counts use the existing provider parser and may represent different provider event/query definitions; they are not a billing comparison. No retries occurred: four model calls total.

## Displayed ratings by distinct cereal

These are the pipeline outputs, not an independent medical or nutrition verification.

| Product | Displayed rating | Note |
|---|---|---|
| Original Cheerios | Healthy | Two appearances correctly combined within grid 1 |
| Grape-Nuts Flakes | Healthy | Two appearances correctly combined within grid 2 |
| Rice Chex | Neutral | Duplicate remains across grids |
| Wheaties | Neutral | Backend nutrient rating differs from model healthy verdict |
| Crispix | Neutral | Backend nutrient rating differs from model not-healthy verdict |
| Frosted Mini-Wheats Original | Not healthy | Duplicate remains across grids |
| Honey Nut Cheerios | Not healthy | First-grid pair combined; cross-grid duplicate remains |
| Special K Chocolatey Delight | Not healthy | Variant identified |
| Wegmans Frosted Flakes | Not healthy | Brand identified |
| Wegmans Raisin Bran | Unrated | missing_addedSugarsG; neither model supplied added sugar |

No outside alternatives were proposed by either model. The app also correctly suppressed alternatives because healthy shelf products were present.

## Findings requiring follow-up

1. Cross-batch identity normalization is too strict for model spelling and missing variant differences. Rice Chex was Original in grid 1 and null in grid 2. Mini-Wheats differed by punctuation and size wording. Honey Nut Cheerios had inconsistent guessed size and variant fields. Six duplicates expected; only three counted.
2. Product-family recognition covered all 16 occupied cells; this does not establish exact SKU or size accuracy. Honey Nut package size was inconsistent/incorrect.
3. Nutrition values still require label-based accuracy validation. For example, Gemini supplied Original Cheerios at 28g while GPT supplied 39g. They were not averaged. Nutrition status marked verified by the model pipeline is not an independent audit.
4. Existing local nutrient reconciliation can override Gemini ratings: Rice Chex healthy/not-healthy became neutral; Wheaties healthy became neutral; Mini-Wheats neutral became not-healthy. This test did not change those rules.
5. Raisin Bran lacked added sugar in both responses, so the existing nutrition gate withheld its rating.
6. Gemini content arrived early, but the current parallel provider waits for GPT before final session completion. The 55.9-second completion time is not the first-result delay.

## Automated acceptance checks

Five passed, one failed. Failure: cross-batch exact duplicates must collapse to ten products and six repeats. Passed: 16 occupied cells processed; no invented products in blank cells; within-grid duplicates; streaming before GPT completion; overlapping dispatch of both grids to both models. See replay.test.mjs and replay-tests.log in the artifact directory.

## Concurrent-work integrity

The shelf prompt file changed elsewhere during the run. Captured Gemini prompts for both batches were identical apart from occupied-cell lists, and the test saves the exact sent prompt. All other measured source hashes remained unchanged during the run. Results describe that captured prompt/code snapshot, not any later main-chat change.

## Source products

- [Cheerios Honey Nut Cereal](https://www.wegmans.com/shop/product/752118)
- [Cheerios Cereal Family Size](https://www.wegmans.com/shop/product/856972)
- [Wegmans Raisin Bran Cereal](https://www.wegmans.com/shop/product/58976)
- [Frosted Mini Wheats Breakfast Cereal, Original, Family Size](https://www.wegmans.com/shop/product/795435)
- [Special K Breakfast Cereal, Chocolatey Delight](https://www.wegmans.com/shop/product/929187)
- [Rice Chex Cereal](https://www.wegmans.com/shop/product/566535)
- [Wegmans Frosted Flakes Cereal](https://www.wegmans.com/shop/product/53169)
- [Grape-Nuts Cereal, Flakes](https://www.wegmans.com/shop/product/772600)
- [Wheaties Wheat Flakes](https://www.wegmans.com/shop/product/738372)
- [Crispix Breakfast Cereal, Original, Family Size](https://www.wegmans.com/shop/product/871209)

## Reproduction and retained evidence

Private artifact directory (not included in the public repository): `artifacts/shelf-cereal16-2026-10-25`

- create-fixtures.py: deterministic grid creation; manifest.json: cell-to-product ground truth and source URLs.
- live.ts: full live HTTP/session harness (rerunning incurs model usage).
- replay.test.mjs: offline acceptance assertions against saved responses.
- results.json: screen-state timeline, full app products, batch results, diagnostics and timings.
- raw-gemini-0/1.json and raw-gpt-0/1.json: complete provider responses.
- parsed-gemini-0/1.json and parsed-gpt-0/1.json: complete model-returned product/nutrient tables.
- prompt-sent.txt: captured prompt used in this run.
- grid-1.jpg, grid-2.jpg and preview.jpg: actual fixture images.
