# Gemini real-scan quality investigation — October 24, 2026

## Confirmed incident

The user confirmed the reported item was Kellogg's Special K Chocolatey Delight. The latest build-19 scan at 4:24 p.m. Eastern took 16.657 seconds from shutter to first card. Camera/preparation finished in 796 ms; upload began at 908 ms. The backend Gemini/search workflow took 15.254 seconds, with six searches and 13,967 input / 1,353 output tokens. Validation took 4 ms. It returned no accepted alternatives and held the rating with serving_evidence_missing and nutrition_incomplete_or_inconsistent. Nearby build-18 scans took 21.795 and 25.172 seconds to first card. This is a genuine product-quality failure, not evidence of a Wi-Fi failure.

The old v6 diagnostics did not retain exact per-field source rejection reasons or a reliably linked original identity. They cannot establish retrospectively whether the model omitted serving/source evidence or the adapter rejected it. Raw photo and full-response retention remain disabled. The product identity above was confirmed by the user; it is not inferred solely from another request's image lookup.

## Confirmed implementation defects

- The v6 client requested a final JSON answer, ignored its progress/identity callbacks and waited for response.text(). The backend grocery provider also ignored progress and did not receive the identity callback. The early-preview behavior in the older GPT flow therefore did not carry into Gemini.
- Separate function calls in one model turn were processed sequentially even when their searches were independent.
- Rating requires identified identity, a serving gram weight and all nine core nutrient fields. Generic evidence/completeness logs hid the specific reason. This design can produce an unhelpful all-or-nothing result; changing the rating policy itself needs explicit design work and validation, not silently treating missing nutrients as zero.

## Initial correction checkpoint (superseded by the backend deployment below)

- Identity-only preview carried in the first search tool call and through the actual v6 HTTP/client stream. No extra model call; no nutrient/rating claim in preview. Final nutrition remains validated independently.
- Independent search function calls run concurrently with the same atomic six-query cap and deterministic result ordering. No additional searches/retries.
- Adapter diagnostics distinguish absent values, missing source IDs, ungrounded URLs, identity mismatches, serving absence/mismatch and nutrients absent from source metadata. Existing bounded product/decision events now link the original and candidates to those reasons; no raw image, health context, location or model reasoning is logged.
- Validation retains exact missing-field/inconsistency reason codes. Rating thresholds and comparison/clinical safeguards are unchanged.

All workspace checks passed, including 642 core/service tests, typecheck/lint, 60 mocked photo UI cases, onboarding/tooling/report/news checks. New tests include the actual local HTTP endpoint plus client delivering a preview while the final provider response is held, parallel tool calls under the budget, cancellation and source-rejection reasons. These tests use controlled provider responses. They establish plumbing and safeguards, not real Gemini accuracy or production latency. No new search/model request, backend restart, phone build or upload occurred in this investigation. Build 19 remains the installed/released behavior.

## Requirements reset and next acceptance gate

The user's objection to the overcomplicated prompt and requirements is accepted. The next revision must optimize for a useful answer: exact product, supported nutrition and serving, concise findings, and up to three suitable alternatives. Return useful supported facts first; explain specific unknowns rather than a generic dead end. Do not block a supported adverse finding merely because an unrelated nutrient is unavailable. Do not turn incomplete information into a blanket healthy/safe verdict or fabricate comparisons.

A shorter goal-focused prompt, partial-evidence assessment policy and reliable retrieval for this exact cereal are still unfinished. The live prompt has not been changed. Before calling scan quality resolved, run a controlled end-to-end comparison with the exact product photo and current matching manufacturer/retailer label, recording identity, nutrient accuracy, useful first-result latency, complete-result latency, alternatives and actual searches/tokens. A general test count or successful upload is insufficient. The raw reported photo is not retained, so its exact request cannot be replayed from the old logs.

## October 24 backend deployment update

The shorter prompt and partial model-led assessment are now live for build 19. Server preview/concurrency/diagnostics are deployed; the client preview still requires a later build and is deferred by the user. Full checks now pass 653 core/service tests. Two public-sauce runs completed in 7.591 s and 8.072 s with 620 mg sodium, a red rating and one alternative. This is not the exact failed cereal replay and does not establish three-alternative coverage. See [the current backend checkpoint](79-simple-gemini-backend-build19-check.md) for the changed assessment semantics and remaining acceptance work. Historical no-deployment statements above refer only to the earlier investigation checkpoint.
