# Gemini leads; GPT-6 Luna fills missing alternatives

October 25, 2026. Authoritative implementation: /path/to/NutriGlimpse on project-server.

## Requested behavior

For each v6 single-product photo scan, launch Gemini 3.5 Flash-Lite and GPT-6 Luna together. Gemini remains the only original-product reviewer. Its identity, nutrients, rating, reasons and accepted alternatives are authoritative. Do not compare model ratings, vote, average nutrients, display disagreement, or replace Gemini's accepted choices.

After the existing nutrient/dietary checks, a Neutral or Not Healthy Gemini result with fewer than three alternatives can receive additional eligible, distinct GPT suggestions. Gemini's choices stay first and in their existing order. Stop at three total. Healthy, missing/unrated or unidentified originals do not gain alternatives from GPT. If Gemini fails, GPT does not become the primary reviewer. The existing client-level legacy fallback is separate and unchanged.

## Implementation

- Gemini's approved prompt and native Google Search flow are unchanged. No copy of Gemini's response is sent to GPT.
- A separate prompt, `apps/service/prompts/gpt-alternative-supplement.txt`, asks GPT for up to five same-category backup candidates, allowing duplicate removal while displaying no more than three. It requests nutrition, terse reasons, optional sources and no original-product rating. Full prompt is mirrored in `GPT-Alternative-Supplement-Prompt.txt`.
- GPT uses the Responses API, model `gpt-6-luna`, image detail high, reasoning none, up to 4,000 output tokens and at most three web-search tool calls. Missing URLs do not block useful estimates; unknown nutrients remain null. Search-backed links establish provenance, not a guarantee that a number matches the current package.
- GPT receives the product photo only. Existing shopper consent names Google, so age, health details, labs, preferences and location are not copied to OpenAI. Existing local dietary/clinical checks still apply to each candidate. These backup choices are general food suggestions, not a second personalized review. The existing Gemini retailer lookup attaches current/nearby store suggestions after merging; it gets public product/store data only.
- Candidate validation reuses the existing simple adapter: individual nutrient bounds and consistency, positive-trans-fat warnings, missing-nutrient handling, dietary evidence and kidney-care limits. No model-agreement requirement is added. No equal-portion comparison is claimed without quantities.
- Normalize case, punctuation, title word order, package weights, default `Original` wording and `Heart Healthy` marketing wording for deduplication. Preserve brands and named variants (for example Honey Nut versus Multi Grain). This is deterministic matching, not a promise to recognize every possible product alias.
- GPT food/source IDs have a separate `gpt-` prefix. Only selected candidate sources enter the final response. Gemini's original and accepted suggestions are not rewritten or re-ranked by GPT.
- Gemini's existing identity and food cards stream immediately. Supplemented cards also stream before retailer enrichment finishes. The final response remains v6 and works with TestFlight build 21; no phone build, OTA or upload is required.
- GPT has a 30-second total deadline and at most 20 seconds of extra waiting after Gemini's validated result. The earlier deadline wins. Cancellation reaches both requests. A failed, malformed, late or cancelled GPT answer never erases Gemini's results or causes an automatic paid retry. If there are not enough eligible distinct products, show fewer than three.
- `GROCERY_GPT_ALTERNATIVES_ENABLED=false` disables supplementation for rollback. Missing OpenAI configuration preserves Gemini and emits a bounded configuration warning.

## Diagnostics and retention

Consented returned-answer records now include a separately identified GPT public answer, prompt hash, completion/cancellation status, elapsed time, additional wait, number added and final disposition. Candidate decisions include duplicates, rejected fields and added IDs. Completed unused GPT responses retain usage where available; cancelled calls may not report token usage. No provider hidden reasoning, photo, rendered health prompt or submitted profile is retained.

The existing encrypted seven-day / 200-scan / 40-MiB limits remain. Without diagnostic consent, only bounded timing/counts/status codes are recorded. The SSH-only reader `ops/read-scan-response.ts` includes the supplement summary. Exact source arrays remain per product; missing source_url is still non-blocking.

## Verification

Automated tests cover simultaneous dispatch, first Gemini cards before GPT, zero/one/two/three Gemini alternatives, neutral/red/healthy/unrated originals, ignored GPT product fields, source isolation, duplicate and flavor handling, invalid nutrients, trans fat, dietary and kidney gates, malformed responses, synchronous failures, late results, total/wait deadlines, cancellation, consented diagnostics and retailer enrichment after merging.

Initial real public-photo test: the eight-second wait cut GPT off too early. Kept as failed performance evidence; increased the bounded wait and reduced GPT reasoning effort. Second real test: Gemini supplied two options and GPT added one; original card 6.184 seconds, final retailer-enriched result 23.217 seconds. GPT took 20.226 seconds (31,249 input / 1,167 output tokens; three search tool calls). This establishes functionality on one fixture, not broad nutrition accuracy.

The first deployed public-endpoint test exposed `Cheerios Cereal` versus `Cheerios Original Cereal` as a duplicate. A regression now treats Original/Heart Healthy wording as the same product while retaining named flavors. Its original evidence is preserved under `before-dedup-*` rather than counted as a successful distinct-three test.

Final deployment and public verification are recorded below. Real-device and cross-product acceptance remain open. Shelf Camera, side-chat news/report features, app artwork and phone configuration are unchanged.

## Evidence and API references

Evidence folder: `artifacts/gemini-lead-alternatives-2026-10-25/` (before manifests, tests, public-photo results, encrypted fixture returns and deployment service PIDs).

API request format checked against [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna) and [Responses structured output](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).

## Final deployment and acceptance checkpoint

Full workspace check passed: **734 core/service tests**, typechecks, mobile lint (one pre-existing hook warning), nine tooling tests, ten native input-adapter boundary tests, 68 photo UI scenarios, needs/onboarding checks and news collector/UI checks. The new supplement suite contains 22 focused cases. No physical-device or native compilation was needed for this backend-only change; those outcomes are not claimed.

The exact installed production public endpoint was tested with the existing Special K photo and public Wegmans Northborough store context, without a real shopper profile. Final trace **5a2e4b62-e76d-46f8-b62c-c7ef9736d6f4**:

| Event | Elapsed |
| --- | --- |
| Product identity | 3.076 s |
| Original food card | 4.099 s |
| First Gemini alternative | 4.879 s |
| Second Gemini alternative | 5.594 s |
| Third card, supplied by GPT | 20.068 s |
| Final store-enriched response | 22.987 s |

Gemini supplied Cheerios Cereal Family Size and Wegmans Bite-Size Shredded Wheat Cereal. GPT filled the remaining slot with Food for Life Ezekiel 4:9 Low Sodium Sprouted Whole Grain Crunchy Cereal. All three showed the suggested retailer Wegmans; exact branch stock and aisle remain unconfirmed. The original rating remained Not Healthy. Encrypted journal replay verifies Gemini's original and first two choices are unchanged and the displayed review exactly matches the stored final result.

Gemini: 1,243 input / 1,383 output tokens. GPT: 30,118 input / 1,263 output tokens, including its tool context; 19.924 s model duration and 14.406 s extra wait after Gemini. The retailer follow-up used 145 input / 183 output tokens. Streaming improves first visible response; GPT supplementation still adds latency and API usage. These measurements are one fixture, not an accuracy or store-coverage benchmark.

Only `congress-beta-backend.service` restarted; final PID 465696. Other project/portfolio services retained their PIDs, as recorded in `deployment-final.json`. Build **0.1.0 (21)** remains the current TestFlight release. App source/configuration, shelf detection/GPT flow and side-chat work were not changed. No new build, OTA, invitation or upload was made.
