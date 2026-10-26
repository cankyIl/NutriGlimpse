# Shelf grid 9 and multiple health concerns — staged handoff

Date: October 25, 2026 (America/New_York).

Status: implemented and tested in the remote workspace, **not deployed, not compiled into a signed iPhone build, and not uploaded**. Build 25 remains the released version. No service restart, shared signing/build-configuration change, OTA, Git commit or push was performed in this side conversation.

**Release integration:** the main release task included this complete handoff in build 26, compiled/signed it on the Mac and uploaded it successfully. The backend is deployed and Apple has made build 26 available to the owner TestFlight group (VALID / IN_BETA_TESTING). Physical-device acceptance remains separate; see [build 26 evidence](88-build26-combined-release.md). The original staged status above describes this side conversation's handoff checkpoint.

## Implemented request

- A standalone shelf prompt replaces the single-photo-plus-override composition in the new v2 path.
- iPhone uses the existing native full-package crop collector with capacity 9 (3x3). Finish sends a smaller final grid. Native default-16 behavior and the existing v1 endpoint remain compatible with older builds.
- Every batch goes to Gemini 3.5 Flash-Lite and GPT-6 Luna in parallel, with Gemini dispatched first. Two batches can be in flight concurrently, plus two queued batches. The native collector receives acknowledgments as batches finish; backpressure prevents unlimited image/request accumulation.
- Gemini uses native Google Search and thinking_level=minimal. GPT uses native web search and reasoning.effort=none.
- Complete product records are streamed before the final batch response. Interrupted results remain visible as partial/unrated; one bounded recovery handles missing/malformed cells or eligible transient failures. Good cells are retained.
- Results are sorted Healthy, Neutral, Not Healthy, unknown. Existing coherent-nutrition checks still determine the displayed shelf rating; uncertain/missing facts are not converted to zero or a favorable verdict.
- Exact product duplicates combine while preserving cell/package membership and observed duplicate counts. Completed Gemini records take priority over completed GPT records for the same identity. Existing Gemini nutrient values are never overwritten or averaged. Missing values may be filled only for the exact identity/formulation and equal positive gram serving basis; the combined table is revalidated.
- Each batch may return alternatives if no product in that batch is healthy. Existing nutrient/improvement checks validate alternatives. Once any completed healthy product is present in the displayed scan, outside alternatives are hidden.
- Retailer name/aisle/source links are accepted when returned. Missing aisle/source links do not by themselves block alternatives. Stock is not promised.
- New shelf-screen consent names both providers and separately offers sharing or withholding saved shopper details. No old OpenAI-only shelf consent silently authorizes Google health sharing. The privacy screen was updated.
- My Needs prominently offers multi-select Health concerns. Hypertension, diabetes and High Cholesterol / Heart Health can be selected together and independently removed. The existing cardiovascular storage key is retained so older high-LDL profiles remain compatible. Main focus remains a separate explanation priority; it does not erase selected conditions.
- The approved single-product prompt was not edited.

## Parallel dispatch and continuous updates — implemented

The user approved parallel dispatch and continuous requests. Every accepted 3x3 grid goes to both models immediately when a pipeline slot is free. Subsequent grids start while earlier requests remain active. Complete valid product records from Gemini stream to the phone as they arrive; Gemini's completed batch enables ratings/alternatives immediately, independently of GPT completion.

GPT does not compete with Gemini or replace supplied Gemini values. It may fill unresolved cells, exact-identity missing facts on a compatible serving basis, or remaining alternative slots. GPT supplements are accepted after validation, with up to 20 seconds additional waiting after Gemini completes. Slow GPT is cancelled and cannot overwrite the final response. If Gemini fails, a complete GPT result can serve as an explicitly attributed fallback. Failure of GPT does not discard Gemini results.

Batch processing and duplicate counts are counted once even when streaming emits multiple updates. Response order does not change batch numbering. Finish flushes the final partial grid and completes only when all accepted batches have finished. Background/cancel stops requests and clears temporary state. A healthy result suppresses outside alternatives across the displayed scan.

The standalone prompt and approved single-product prompt were not changed by parallel dispatch. Gemini retains minimal thinking; GPT has reasoning disabled.

## Verification

- Latest full npm run check passed: 790 core/service tests; 9 tooling checks; 10 report-input adapter checks; 74 photo UI scenarios; needs/onboarding interactions; 11 news tests and news UI; new shelf-nine UI interactions.
- 16 focused parallel-provider/core tests passed, covering simultaneous dispatch, fast/slow/failed providers, bounded cancellation, two batches/four model calls, queued next-batch release, early primary completion, exact-identity fills, nutrition validation and alternative suppression.
- Existing 12 shelf UI scenarios passed, preserving the separate reliability work.
- Latest TypeScript, mobile lint and git diff --check passed. iOS JavaScript/Hermes export passed before the parallel update; native compilation and device acceptance remain outstanding.
- New UI harness covers consent, withholding profile data, multiple concerns in shared context, native capacity 9, rolling streamed cards, duplicate native callbacks, Finish with a partial grid, pagination, restart, background cleanup, batch alternatives and suppression after a healthy result.
- Live direct-provider tests used previously supplied package-only/public fixtures and a fictional public store context; no personal health details or private phone scan were sent.

### Live US-product grid

Three products repeated three times: Special K Chocolatey Delight, Wegmans Parmesan Romano pasta sauce, Apple Jacks. Both models identified all three groups and counted six duplicate appearances.

| Model | First complete product streamed | Final batch | Input tokens | Output tokens | Accepted alternatives |
|---|---:|---:|---:|---:|---:|
| Gemini 3.5 Flash-Lite | 3.963 s | 8.273 s | 1,923 | 2,685 | 1 |
| GPT-6 Luna | 21.215 s | 24.474 s | 40,614 | 1,313 | 0 |

Gemini proposed three alternatives; one passed current nutrition checks. GPT proposed none because it reported insufficient retailer/nutrition verification. These measurements used the earlier one-provider-per-batch harness, not the new parallel dispatcher. They are single-run measurements, not a representative speed/accuracy benchmark. Tokens include provider accounting for tool/context usage.

### Limitations found rather than hidden

- Gemini initially rejected the shared bounded JSON schema as exceeding its grammar compiler's serving-state limit. Its wire schema now omits array/string/numeric size bounds while keeping field/type/enum requirements. Server-side bounds and nutrition/association validation remain enforced. A live rerun succeeded.
- On a separate older non-US shelf fixture, Gemini grouped two different Lizi's granola variants together; GPT kept them separate. This remains a model recognition risk. Do not claim exact-variant shelf accuracy is fully validated.
- Both models withheld final ratings for that non-US fixture because essential nutrient values were missing. Those holds were not weakened.
- An initial reconstructed test mosaic used coordinates at the wrong source scale. It was visually inspected and replaced with the existing correctly framed public crops. Its unresolved-product run is retained as invalid fixture evidence, not attributed to app camera behavior or counted as a recognition benchmark.
- No physical-iPhone camera test or native compilation was run in this side conversation. Deployment and a subsequent iPhone build are required before phone acceptance. Do not label this shipped in build 25.

## Integration

New route: POST /v2/shelf/grids. The old /v1/shelf/grids code and its completed uncommitted reliability fixes were preserved. Include the new contract, client, session, provider, route, screen, prompt, privacy and health-selection changes together when packaging a future build. Source changes to server.ts and startBeta.ts register the new provider; live deployment was deliberately left to the main release task.

Evidence: artifacts/shelf-nine-2026-10-25/ (parallel-check.log, parallel-targeted.log, check.log, ios-export.log, verified-grid/, us-products/, diagnostic failure evidence).
Editable prompt copy: Shelf-Scan-Grid9-Prompt.txt.
