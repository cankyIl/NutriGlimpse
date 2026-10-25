# Gemini default single-product integration

**Current release — October 24, 2026, 03:17 PM Eastern:** Build **0.1.0 (18)** is Apple VALID / IN_BETA_TESTING in the existing owner group. The Gemini v6 single-product client is now available through TestFlight; shelf grids and outside alternatives remain GPT-6 Luna. Phone acceptance is pending. [Verified release record](76-gemini-single-product-build18.md). Earlier dated sections retain the implementation/test history; deferred-upload statements are superseded.

Checkpoint: October 23, 2026, 08:56 PM Eastern. Authoritative workspace: /path/to/NutriGlimpse on project-server.

## Latest updated-prompt rerun

**Updated-prompt rerun — October 23, 2026, 09:50 PM Eastern:** One requested live test with the exact current main prompt, same original PNG and Wegmans Northborough. **18.105 s provider workflow + 11 ms validation; five Google queries via Serper; four model calls; 14,099 input tokens (2,539 cached), 4,136 output, 18,235 total.** Original correctly identified, sodium **620 mg per 125 g**, both model and app red. Three model proposals, one app-accepted alternative: Low Sodium Smooth Marinara, **50 mg sodium / 2 g protein / 3 g fiber**. Amore Marinara (**430 mg sodium / 1 g protein / 4 g fiber**) was rejected by the current 1 g protein-loss exception because it loses 2 g; Tomato Basil (**590 mg sodium / 2 g protein**) was rejected because its small sodium improvement does not qualify for that exception. Both audit entries were equal_weight_loses_proteinG, not blanket red-rating rejection.

**Still open:** all candidates and searches remain Wegmans-brand-oriented, three accepted alternatives are not achieved, the sauce tradeoff rule still excludes a substantial sodium/fiber improvement with a 2 g protein loss, and an awkward model-generated flavor tradeoff passed through to the card. No aisle or branch-stock confirmation. No prompt/source/deployment changes or phone upload in this test; prior 635-test verification remains the latest source verification. Full response and exact search log: artifacts/gemini-updated-prompt-rerun-2026-10-23/live-test/Full-Response.md. No additional paid retry was made.

## Enforced search ceiling and relative-improvement validation

**Enforced-search and comparison checkpoint — October 23, 2026, 09:47 PM Eastern:** Implemented and deployed a server-enforced maximum of **six individual Google queries per scan** through the existing Serper connection, with Gemini 3.5 Flash-Lite as the only model. This replaces native Google grounding for prepared v6 clients because the native tool exposes no query ceiling. Queries reserve budget before execution; failed attempts count; duplicate queries reuse results; there are no automatic retries. One bounded public product-page read per query, at most four model turns and a 90-second total workflow deadline are separately enforced. Concurrent and retry tests verify a seventh query is never sent.

The same photo/store rerun took **19.509 s** plus **11 ms validation**, **four queries**, **four model calls**, **14,097 input tokens (2,569 cached), 3,146 output, 17,243 total**. Original sodium **620 mg per 125 g**. Gemini said neutral; the application retains red under its existing rule. Low Sodium Smooth Marinara, **50 mg sodium / 2 g protein**, now passes despite the original's 3 g protein, with the tradeoff disclosed. Tomato Basil at 590 mg does not meet the meaningful-improvement condition. Meaningful red-rated alternatives retain their warning and sort last; this is regression-verified, not demonstrated by an eligible red candidate in this live run. No named competitor brands or forced brand quotas were added to the prompt.

**Quality limits remain:** only one accepted alternative; all proposals still Wegmans-brand; no verified aisle or current branch stock. The previous native run was 21.801 s / 12 searches / 8,072 tokens: fewer queries here, but higher token use and no established general speed improvement. The four-turn bound ended the run after four of six possible queries. **635 core/service tests**, full typecheck/lint and existing tooling/report/photo/news checks pass. Backend public v6 Gemini and v5 GPT capabilities are verified; unrelated service PIDs remained unchanged. Build 17 still uses v5/GPT, Shelf Camera is unchanged and the upload remains deferred. Full evidence: artifacts/gemini-enforced-search-2026-10-23/live-test/Full-Response.md.

The dated sections below describe prior native-grounding checkpoints and are retained as history; this checkpoint defines the current prepared v6 backend. The last editorial prompt cleanup removes a duplicated heading and changes a sauce-specific sentence to a general product sentence; the measured filled prompt remains preserved in the live-test folder.

## Updated-prompt live measurement

October 23, 2026, 09:32 PM Eastern: The user requested one test using the same original PNG and Wegmans Northborough. Provider time **21.801 seconds**; subsequent evidence/validation **258 ms**. Gemini reported **3,133 input tokens**, including **2,478 cached input tokens**, **4,939 output tokens**, **8,072 total tokens**, and **12 Google Search queries across eight tool calls**. Seven queries revisited original-product nutrition, four concerned alternatives, and one was a dedicated aisle query.

The requested six-query limit and no-dedicated-aisle-search instruction were not followed. Original sodium was 620 mg; original model rating not_healthy. All three alternatives were proposed by the model, but none passed existing application checks: Low Sodium Smooth Marinara (50 mg sodium) was rejected for 2 g rather than 3 g protein at equal serving weight; Tomato Basil (590 mg sodium) and Smooth Marinara (600 mg sodium) were rejected under the red-rating rule. The test does not close the open alternative-filter review.

No known sodium value was inserted in the model request. The original photo hash matches prior tests; it was sent as PNG and not saved on the remote server. This direct provider timing is not directly comparable to a previous public-endpoint JPEG timing. No reduced search count, latency improvement, physical acceptance or independently confirmed branch aisle/stock is claimed. No source/validator changes, additional paid retries or upload were made. The exact prompt, full model answer, searches, provider usage and validation result are retained in artifacts/gemini-search-efficiency-2026-10-23-212856/live-test/.

## Search-efficiency revision

Updated: October 23, 2026, 09:29 PM Eastern, following the user's review of the 12-query single-product test.

- Manufacturer/retailer product nutrition is the first source. USDA FoodData Central and Open Food Facts are fallbacks only when that information fails for the exact product. A usable preferred source is not cross-checked against additional databases.
- Removed the instruction to search again for source conflicts. The model uses one exact-product/serving source where possible, extracts all supported values together and leaves ambiguous values unknown. Existing backend evidence, serving, dietary and nutrient checks still apply.
- After identifying up to three alternatives, obtain nutrition and available aisle details together from retailer/manufacturer product information, reusing pages and grouping lookups when feasible. Manufacturer nutrition does not by itself establish retailer branch stock or an aisle.
- Search instructions target 2–4 individual queries and request at most six for the whole scan. A multi-query tool call counts each query separately. This is a model instruction, not a provider/API-enforced hard cap; actual search counts remain recorded.
- No separate searches merely for an aisle, image, optional micronutrient or independent confirmation. Stop at supported alternatives or the query budget and return partial results rather than weakening checks. Nearby-store expansion still requires no suitable current-store alternative and remaining search budget.
- Existing 620 core/service regression tests and backend typecheck pass after the edit. No additional tests that merely mirror prompt wording were added. No paid model call was made, so no reduced latency, query count or output-quality improvement is claimed yet.
- Gemini reads the prompt file on every v6 request; no service restart is needed. Installed build 17 and shelf routing are unchanged. The phone upload remains deferred.

Evidence: artifacts/gemini-search-efficiency-2026-10-23-212856/ (before/after prompt, diff, verification logs and hashes).

## Release boundary

The user approved the reviewed search-grounding prompt as the default single-product flow, then explicitly deferred the phone upload until after discussing Shelf Camera. The backend version-6 endpoint is enabled for the prepared client and reports gemini-3.5-flash-lite. Installed build 17 still uses its existing version-5 GPT route. No app version increment, native build, TestFlight upload, OTA update or shelf-provider switch occurred.

## Implemented

- Versioned parameterized copy of the exact approved prompt under apps/service/prompts/gemini-product-photo.txt, with a formal JSON response contract. A transport instruction preserves native Google citations and treats input/store text as data.
- Google Interactions API, Google Search enabled, store=false, bounded output, response size, timeouts and single-request admission. No hidden model retries or new parallel review.
- Typed translation to existing product cards, exact-source and serving/variant checks, normalized equal-mass alternatives, existing dietary/nutrition restrictions, and up to three eligible alternatives. Missing evidence remains unknown.
- Completed-search verification and provider-reported usage. Google citation redirects are resolved only against the fixed Google host with redirects disabled; arbitrary destination pages are not fetched. Successful redirect provenance does not independently prove every nutrient.
- Source identifier aliases and nullable references handled safely; equivalent serving notation matches explicit equal gram weights. Unsupported branch aisle/stock claims stay hidden.
- Distinct provider-limit, missing-grounding, malformed-response and timeout handling. Bounded validation diagnostics contain field names only, not values, images, health context or location.
- Clinical personalization remains off. Gemini receives general-nutrition context, explicitly selected dietary preferences and the public selected store, not health conditions, labs, name, age, weight or GPS. Without a chosen store, the app does not currently send an address; no nearby store is invented. This is narrower than the prompt's optional location branch.
- Other services and the shelf/GPT provider implementations were preserved. Portfolio/website/preview service process IDs remained unchanged across the grocery-backend restart.

## Verification and quality limits

| Check | Actual outcome |
| --- | --- |
| Full workspace checks | Passed: typechecks, mobile lint, **620 core/service tests**, 9 tooling tests, 10 report-input adapter tests, 60 mocked photo/home scenarios, 11 news collector tests and news UI checks |
| Added regression scope | 16 cases for source provenance, exact variants, serving normalization, duplicates, nutrition/dietary holds, no unsupported aisles, null source IDs, actual grounding, 402/429, privacy and safe Google redirects |
| First direct provider integration | 10.440 s, 11 searches; 670 mg sodium from an older third-party record, missing added sugars, one proposed alternative. Initial format mismatch fixed; saved replay validates as partial and holds the rating/alternatives |
| First public JPEG endpoint check | Failed with PROVIDER_INVALID_RESPONSE in 11.641 s. Preserved as failed evidence; formal response schema added afterward |
| Public endpoint with formal response schema | Successful version-6 response, Gemini identified the correct sauce; **19.511 s total**, 19.161 s provider, 245 ms validation, **12 searches**. Source/serving evidence did not pass, so sodium/rating were null and zero alternatives were accepted |
| Final serving-text correction | Exact gram-equivalent wording regression passes. Latest full source checks pass; no additional paid live scan after this final normalization correction |
| Public capability check | v6 available=true, model Gemini; v5 available=true, model GPT-6 Luna |
| Phone acceptance | Not tested or uploaded; explicitly deferred by user |

This completes the transport/adapter wiring, not proof of dependable store-ready answer quality. The successful public response is an honest partial result, not acceptance of three useful alternatives or a speed improvement over GPT. Remaining independent work: diagnose/reduce source/formulation/serving holds, repeat representative cases, complete the requested ten-case paired benchmark, and validate the future phone build including attribution. No known sodium value or catalog facts were supplied to Gemini. No product photo was persisted.

## Next step agreed with user

The user has now selected the existing shelf flow with GPT-6 Luna: iPhone detection/full-package crops/deduplication, rolling groups of 16 and a final partial group. Current routing already matches; 17 targeted shelf/provider-loader tests pass. Gemini for shelves is not enabled. The single-product Gemini flow remains separate. On October 24 the user authorized upload; build 18 is now available in the owner TestFlight group. See document 76 for verified release evidence.

Evidence: artifacts/gemini-default-2026-10-23/. The approved prompt and runtime source remain on the remote server; documents/results are mirrored to the laptop with hashes.
