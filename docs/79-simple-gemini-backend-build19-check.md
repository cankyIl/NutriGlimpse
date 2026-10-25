# Simplified Gemini backend — build 19 check

## Live state

Deployed October 24, 2026 at 5:06 p.m. Eastern on project-server. Only congress-beta-backend.service restarted. The other four service PIDs were unchanged. Public health, v6 Gemini and v5 GPT capability checks passed. No iPhone build, upload or OTA update was started; the user explicitly asked to check backend changes with the existing build first.

The runtime uses apps/service/prompts/gemini-product-photo-simple.txt and its simple JSON schema. The previous prompt files are retained for rollback/history, not active for new Gemini requests.

## Behavior

- Short prompt: identify the product, find current nutrition, give a general healthy/neutral/not-healthy assessment with 1–3 reasons, and suggest up to three similar better alternatives when appropriate. Manufacturer/retailer information first; USDA/OFF fallback. Current store is a preference across brands.
- Package size and serving size are no longer requested or required in the model response. Nullable legacy fields remain null in the phone response so build 19 can read it.
- Missing individual nutrients no longer erase the rest of the answer. Valid sourced values and the model's general rating/reasons are preserved. Missing values are null, never zero. Invalid/out-of-range values and detected sugar/fat inconsistencies are removed individually.
- This is a model-led general assessment, not the old deterministic per-serving score. Without quantity metadata the backend does not apply per-serving cutoffs or claim an independently normalized equal-mass comparison. The legacy comparisonBasis explicitly says not_comparable. The model is asked to compare equivalent quantities; its reasons are displayed as model-read general guidance. This limitation must not be described as independently verified nutrient comparison.
- A nutrition source must be an actual product URL returned by the search tool. That establishes citation provenance, not independent confirmation of every value. No exact-source keyword/gram equality gate remains on this route.
- Dietary/celiac and kidney-care gates remain in place. A model answer cannot supply verified allergy/certification clearance. Private medical personalization remains disabled.
- Meaningfully improved red suggestions retain red and sort last; known positive trans fat cannot produce a green rating. Duplicate suggestions are removed. Missing evidence does not become claimed branch inventory or an invented aisle.
- Six-search cap, failed-attempt counting, no automatic retries, bounded page reads and four model turns remain. Independent calls from the same turn run concurrently.
- Identity is emitted by the server from the first search call without a separate recognition request. The prepared client can display it, but installed build 19 still waits for the final JSON. Client streaming remains deferred until the user is satisfied with backend testing. This does not stream an unverified rating or promise progressive nutrient-table updates.

## Verification

Full workspace check passed: 653 core/service tests, typechecks, lint (existing hook warning), nine tooling tests, ten report-input tests, 60 mocked photo UI cases, onboarding/needs checks and eleven news tests plus news UI. Eleven added cases cover partial facts without sizes, invalid fields, unavailable/unsafe sources, missing versus zero, trans fat, dietary/kidney gates, duplicates/red ordering, aisle claims, prompt privacy and actual v6 JSON HTTP compatibility. Existing stream-order and six-query budget tests also pass.

The existing v6 result screen reads model ratings and reasons directly and does not rerun the old all-nine-nutrient rating gate. Its old Food Facts layout still has nullable serving text; changing that UI would require an app update.

Two bounded live tests used the previously supplied public Wegmans Parmesan Romano Sauce photo and Wegmans Northborough, without a private profile:

| Check | Total | Model/search | Search queries | Outcome |
| --- | --- | --- | --- | --- |
| Direct provider before deployment | 7.591 s | 7.582 s | 2 | Correct title, 620 mg sodium, not_healthy; one low-sodium marinara at 50 mg, healthy |
| Public deployed endpoint, JSON as used by build 19 | 8.072 s | 7.945 s | 4 | Correct title, 620 mg sodium, not_healthy; one low-sodium marinara at 50 mg, healthy |

The direct run emitted identity at 2.077 s and used two model calls, 3,886 input and 892 output tokens (4,778 total, no cached tokens). These are observed single runs, not a latency guarantee. Earlier sauce runs took about 18–22 seconds; conditions/output differ, so this is indicative rather than a controlled benchmark.

Both new live runs returned only ONE alternative. The adapter did not discard two others: the model proposed only one. Three-alternative coverage is still not established. No branch aisle or stock was confirmed. A matching original sodium number does not verify every nutrient, alternative or image. The exact failed Special K photo is not retained; owner rescan/label acceptance is pending.

Evidence: artifacts/gemini-simple-backend-2026-10-24/ contains full-check.log, live-model-answer.json, live-result.json, live-summary.json, public-result.json, public-summary.json, deployment.json, source hashes and backed-up edited files. This fixture evidence is public product material; normal private scan retention policy is unchanged.

## Next acceptance

1. User rescans the same cereal in build 19; inspect linked diagnostics and the actual shown result.
2. Check current-label nutrient accuracy and suitable alternative coverage across the agreed product basket; do not claim store readiness from these two sauce tests.
3. After backend acceptance, release the prepared client identity streaming in a new numbered build when requested. No Mac work or upload began here.

## Store/aisle follow-up — October 24, 5:14 p.m. Eastern

The latest logged physical phone scan was Wegmans Sour Cream on build 19 at 5:09 p.m.: 9.527 s shutter-to-first-card, 8.344 s Gemini/search, three queries and two accepted alternatives (Light Sour Cream and plain nonfat Greek yogurt). This was not the failed cereal replay. Older bounded diagnostics did not retain availability fields, so they cannot reconstruct that scan's exact missing retailer/aisle answer.

Two code gaps were confirmed: v6 hides its store section for unknown availability; the simple adapter previously inferred retailer listings only from the nutrition URL. The backend now accepts a separate optional retailer_url from the same searches. It must be an actually returned URL for the stated chain. Manufacturer nutrition can coexist with a retailer listing. When a listing is absent, the existing build-19 card displays an explicit store-availability/aisle uncertainty; a chain listing with no aisle displays “Aisle not found for this branch.” No extra search calls or UI build were added.

Aisle checks now examine already returned source text for the stated aisle and selected town, rather than requiring the town name in the URL. Chain/town/state must still match; unproven aisles and current stock are not invented. Diagnostic reason codes distinguish unconfirmed listings, absent aisle answers and rejected aisle evidence without storing user location. This is bounded extraction from public search material, not a retailer inventory integration.

657 core/service tests and full workspace checks passed, including four new source/availability/aisle cases. Only the beta service restarted; public health/capabilities passed and other service PIDs were unchanged. No new paid model request or phone upload was made for this follow-up. Fresh real-scan aisle/availability acceptance remains pending. Evidence: artifacts/gemini-store-evidence-2026-10-24/.

## Rejected-alternative diagnosis — October 24

The 5:12 p.m. build-19 phone scan identified Amylu Andouille Chicken Sausages, returned not_healthy and 540 mg sodium, and showed no alternatives. Provider/search took 9.685 s; shutter-to-card was 11.025 s. Six searches ran. The retained validation codes show an alternative lost its numeric evidence because its source URL was not a returned search result, then failed nutrition_source_unconfirmed / nutrition_unavailable / recommendation_not_supported. This is a sourcing failure, not proof no better product exists.

The decision logger incorrectly counted proposals after the simple adapter filtered them: it therefore reported proposed=0 and lost the rejected name despite the rejection codes. Corrected and deployed: count the original proposal list and retain bounded sanitized candidate identities/rejection reasons before filtering (at most five diagnostic candidates). No raw photos, personal context, store location or source URLs were added to logs. The old candidate name/URL cannot be reconstructed retrospectively.

Workspace typechecks and 64 relevant provider/diagnostic/HTTP-contract tests passed, including a regression with one proposed, one rejected and zero displayed. Public health/capabilities passed after restarting only the beta service; other service PIDs were unchanged. Displayed recommendation policy and six-search budget did not change. No paid model replay, new phone build or upload. The source-link failure and recovery behavior remain engineering work; this logging correction alone does not fix missing alternatives. Evidence: artifacts/gemini-alternative-diagnostics-2026-10-24/.


## Missing-nutrient follow-up — October 24, 5:26 p.m. Eastern

The latest reported phone scan identified The Good Crisp Company Potato Crisps Variety Pack 8 Pack. Its logged first-card time was 19.867 seconds; Gemini used six searches and 18.682 seconds, with 7,700 input / 607 output tokens. The retained core nutrition contained only calories (140) and saturated fat (3 g). No source-rejection or nutrient-consistency audit codes explain the absent core values: they were absent from the model answer, rather than cleared by the old all-or-nothing gate. Normal phone diagnostics omit total fat and do not retain raw photos/full replies, so the complete original answer and exact flavor/package cannot be reconstructed.

Three defects were reproduced and corrected:

1. Full-page retrieval was restricted to a short hardcoded brand/retailer list, excluding this manufacturer. It now reads HTTPS product URLs actually returned by the fixed Google search endpoint, with public-DNS validation and pinned addresses on each connection/redirect. Private/reserved addresses, credentials, non-HTTPS URLs and unusual ports remain blocked. Response size, redirect count, time limits and per-scan caches remain bounded. A second ranked page is read if the first fails or lacks a nutrition table; both initial attempts share a seven-second page deadline and use no additional Google query.
2. Every nutrient field was optional in the model's JSON schema. A public sauce regression explicitly mentioned 620 mg sodium in its reasons while omitting sodium from its nutrition object. The model schema now requests all ten core nutrient keys, each nullable; the short prompt asks it to fill facts used in its reasons. This is an output-completeness request, not a requirement that ten facts must be known. Partial results remain valid, and missing values remain null.
3. A selected alternative could have only a search snippet even when its full page contained nutrition. The backend now completes up to four already-returned selected source pages, in parallel, and allows one final model completion when there is an available turn. It does not open guessed URLs, add Google searches, or exceed the existing four model turns / 90-second total limit. A failed page read retains the partial result. This is bounded source retrieval, not independent verification of every model-extracted number. If the turn budget is exhausted, no extra model call is made.

Google attribution parameters (srsltid, utm_* and common ad-click IDs) now normalize consistently. Product/variant/SKU/barcode query parameters remain distinct. Both an original returned URL and an actually followed redirect can establish source provenance. Guessed product paths remain rejected. This addresses a verified source-link failure mechanism; it does not prove the exact historical Amylu rejection was caused by a tracking parameter, because that URL was not retained.

The prompt also tells the model to name the flavor represented by a variety-pack table and never mix facts from different flavors. Source text preserves flavor headings. This has not yet established correct matching of the user's exact photographed pack.

### Verification and measured limits

- **677 core/service tests** pass, plus full workspace typecheck, lint and tooling/report/photo/onboarding/news checks. Forty-eight focused retrieval/adapter tests passed before the full run. Coverage includes public/private/mixed DNS, pinned redirects, cancellation, six-query concurrency, caching, source-completion bounds, tracking-vs-variant URLs, partial nutrients, dietary gates and build-19 response compatibility. These are not physical camera tests.
- One real Good Crisp product search returned the manufacturer's full flavor-specific nutrition page in **2.048 seconds** (search and page retrieval together); direct manufacturer retrieval was **419 ms**. The separate Giant retailer page was blocked/unreadable. The manufacturer sells a full-size eight-pack with several flavors; that must not be silently treated as a matching mini-canister pack. No exact Good Crisp phone-photo replay was possible.
- Public sauce regression before the core-field fix: **5.176 seconds**, two queries, but sodium omitted despite a 620 mg explanation. This failure is retained under regression-before-core-fields/.
- Intermediate regression after core-field fix: **10.246 seconds**, four queries, full original table but an unsupported 140 mg value for an unread low-sodium alternative page. This failure is retained under regression-before-selected-pages/; it prompted the selected-source completion change.
- Final public-sauce regression: **6.329 seconds** end to end, **two Google queries, two model calls**, 4,011 input / 881 output tokens. Identity callback was at 1.154 seconds, but build 19 still waits for the final card. Original had all ten core fields, including **620 mg sodium**; one accepted low-sodium alternative had all ten core fields, including **50 mg sodium**. Both sodium amounts match the actual returned full retailer pages. The final run did not need the additional source-completion turn; that branch is tested with a controlled fixture. It still returned only one alternative, not three. No broad speed/accuracy improvement is established from this one run.
- Deployed **21:26:29 UTC / 5:26 p.m. Eastern**. Only congress-beta-backend.service restarted. Public health and v6/v5 capabilities passed. Four unrelated service PIDs were unchanged. Tested/deployed source hashes are recorded. No mobile source change, native build, upload or OTA update.

Evidence: artifacts/gemini-nutrition-pages-2026-10-24/ (full-check.log, targeted-tests.log, public-page-check.json, public-search-summary.json, live-summary.json, live-model-answer.json, live-search-evidence.json, retained failing regressions, tested-source-manifest.json and deployment.json). Public test responses/pages are fixture evidence; raw phone photos/full model replies are still not logged.

**Still open:** a new Good Crisp phone scan with the deployed fix, exact flavor/package matching, repeat nutrient accuracy, meaningful cross-brand alternatives and consistently obtaining up to three supported choices. Existing shorter-prompt/partial-result behavior remains; no package-size or serving-size requirement was reintroduced. Client early-result streaming stays deferred until the user approves a phone build.


## Supplied Special K photo — live repeat test

October 24, 2026, 5:59–6:01 p.m. Eastern. At the user's request, the exact newly attached 16.3 oz Chocolatey Delight product image was sent through the deployed public v6 endpoint three times. Conversion was PNG to JPEG only; no product-name, nutrient or candidate hints were provided. The same prompt, backend and Wegmans Northborough context were used.

| Run | Public endpoint time | Google queries | Original result | Alternatives |
| --- | --- | --- | --- | --- |
| 1 | 6.338 s | 2 | Correct product; full core nutrients; red | 0 |
| 2 | 11.703 s | 6 | Correct product; full core nutrients; red | 2: Wegmans Bran Flakes; Kashi GO Peanut Butter Crunch |
| 3 | 10.362 s | 5 | Correct product; full core nutrients; red | 2: Cheerios Original; Special K Original |

All runs matched 14 available nutrient values from the [manufacturer's 16.3 oz label](https://smartlabel.wkkellogg.com/Product/Index?gtin=00041192102455), checked afterward, including 160 calories, 12 g added sugar, 260 mg sodium, 3 g fiber and 3 g protein for cereal without milk per one cup (42 g). This test reference was not injected into the requests. The model cited a Wegmans 12.1 oz listing; independently checking the photographed pack's manufacturer label confirmed the listed original values, not a general cross-size matching guarantee.

Diagnostics confirm Run 1 proposed zero alternatives; none were filtered. Both queries concerned the original, leaving four searches unused. This reproduces the remaining model-omission failure. Run 2 additionally claimed lower added sugars for bran flakes while addedSugarsG was null, and its Kashi explanation did not lead with the original sugar concern. These are unresolved quality failures. No run returned three alternatives or verified a branch aisle/stock.

Original-nutrient retrieval succeeds on this supplied image; the overall scan flow is not yet consistently acceptable. No source/config change, restart, native build or upload was made during testing. Prior 677-test verification remains the latest source verification. Physical camera/UI checks remain separate. Evidence and exact replies: artifacts/specialk-user-photo-test-2026-10-24/Results.md, acceptance.json, run-1/ through run-3/, test-diagnostics.json.


## Exact user short-prompt experiment

October 24, 2026, 6:12 p.m. Eastern. Tested the user's exact one-sentence prompt with the same supplied cereal image, without the application system instruction or JSON schema. Retained only a minimal search-tool definition and the existing six-query limit. Search used Google via Serper, not native Gemini grounding. One test took **6.911 seconds**, **two queries/two model calls**, **2,399 input / 430 output tokens**. Correct identification and three suggestions: Cascadian Farm Organic Heart to Heart Cereal, Kashi GO Original or Peanut Butter Crunch, and Purely Elizabeth Ancient Grain Granola. These names are the model's wording, not validated catalog records.

The answer is direct but its quality is not yet sufficient for verified app claims: it asserted “Aisle 4 or 5” without supporting search evidence and did not search any alternative. Exact candidate identities, comparative nutrients and Northborough stock therefore remain unverified. A full nutrient table was neither requested nor returned. Do not confuse producing three suggestions with passing nutrition/store checks. No production prompt/source/configuration change, restart, build or upload. Evidence: artifacts/gemini-user-simple-prompt-2026-10-24/Results.md, response.md, summary.json, model-responses.json and search-evidence.json. The user's simple prompt is a candidate for further evaluation, not a deployed change.


## Native Gemini grounding with the user prompt

October 25, 2026, 5:41 a.m. Eastern. At the user's explicit request, tested their updated short sentence and exact supplied cereal image directly with Gemini 3.5 Flash-Lite's native `google_search` tool. No Serper wrapper, app system prompt, schema, supplied nutrient records or backend filtering. **Grounding worked: 3.852 seconds, one tool call containing two reported queries, 1,112 input / 487 output tokens (1,599 total), no search errors.** Correct product identity and three suggested alternatives. Prior Serper experiment: 6.911 seconds; single runs and slightly different user wording do not establish a consistent speed improvement.

Both reported queries concerned store layout, not nutrition. The model claimed Aisles 3/4 and attached one citation; it resolved afterward to the generic Wegmans shopping category https://www.wegmans.com/shop/categories/2957334, not a branch aisle source. Do not mark the suggested aisles, Northborough stock or comparative nutrition as verified. This demonstrates successful native grounding and lower latency in this run, not overall food-comparison acceptance. No production source/configuration, deployed prompt, service, native build or OTA changed. Evidence: artifacts/gemini-native-simple-prompt-2026-10-25/Results.md, request-metadata.json, prompt.txt, response.md, summary.json, model-response.json and citation-check.json.


## Native grounding: supplied Wegmans sauce photo

October 25, 2026, 5:45 a.m. Eastern. The user's new sauce PNG, unchanged, was tested with the same exact short prompt and native Google Search. **3.877 seconds; two reported queries in one search-tool call; 1,119 input / 475 output tokens; no search errors.** Gemini correctly identified Wegmans Parmesan Romano Pasta Sauce and reported **620 mg sodium**, matching the user's earlier package-label value without a supplied hint. It rated the sauce “Moderately so, but with a few drawbacks” and suggested three options: Rao's Marinara/Tomato Basil, Wegmans Amore Organic Marinara/Tomato Basil and Wegmans Low Sodium Smooth Marinara.

The claimed Aisle 3/4 remains unverified. Alternative citations resolve to generic Wegmans category/search/featured pages, not a branch aisle/stock source; no numeric alternative nutrition comparison was returned. Ingredient/organic wording is not accepted as a verified health advantage. Native grounding is successful, but one response is not food-comparison acceptance evidence. No production prompt/source/configuration, service restart, native build or OTA changes. Evidence: artifacts/gemini-native-sauce-prompt-2026-10-25/Results.md, prompt.txt, request-metadata.json, response.md, summary.json, model-response.json, citation-check.json and unchanged input.png.


## Native grounding: Apple Jacks at Price Chopper

October 25, 2026, 5:52 a.m. Eastern. Exact new Apple Jacks PNG and user's Price Chopper Shrewsbury prompt, including nutrient-table request, tested with native Gemini 3.5 Flash-Lite Google Search. No added instructions/schema or Serper. **5.473 seconds; two reported queries in one search-tool call; 1,131 input / 937 output tokens (2,068 total); no search errors.** Correct identity, original nutrients and two alternatives with nutrient lists: plain Quaker oats and Original Frosted Mini-Wheats. Provider status completed; no output truncation. This prompt did not demand three alternatives.

Limitations retained in the full response: Apple Jacks calories/sodium/fiber are ranges, variants and serving quantities are not consistently resolved, Mini-Wheats serving text contradicts itself (“1 biscuit” versus “60g or 25 biscuits”), and Aisles 4–6/branch stock are unverified. Original nutrition citations and the actual Price Chopper #229 store page do not independently verify every alternative's table or branch inventory. No live prompt/source/configuration/service/native release changes. Evidence: artifacts/gemini-native-applejacks-prompt-2026-10-25/Results.md, prompt.txt, input.png, request-metadata.json, response.md, summary.json, model-response.json and citation-check.json.
