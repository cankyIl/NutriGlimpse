# Shelf alternatives, progressive results and response diagnostics

Date: October 25, 2026 (America/New_York).
Status: **backend LIVE; existing TestFlight build 26 receives the comparison, streaming and full-provider-wait fixes. No new IPA, OTA or TestFlight upload was made.** The updated shelf response-retention notice is staged for the next phone build.

## What changed

- Shelf candidates may be green, neutral or red when meaningfully better than the matched original. Their calculated color is kept; red candidates sort last. Gemini choices retain priority and GPT fills available slots, up to three distinct alternatives.
- Existing coherent-nutrition, identified-product, positive serving-weight, same-purpose/equal-weight, trans-fat-zero, material worsening, calorie and primary-concern checks remain. Missing values stay unknown. No new medical personalization or dietary-certification approval is enabled.
- Shelf category-priority reductions use the existing priority-addressed threshold: at least 10% plus the nutrient's absolute floor (1 g sugars, 40 mg sodium, 0.5 g saturated fat). Other improvement floors remain 25%; the existing below-high-sodium exception remains. These are app comparison policies, not medical treatment thresholds.
- A tradeoff of at most 1 g fiber/protein per standard comparison serving (40 g cereal, 125 g sauce, 14 g spread) can pass only alongside a meaningful improvement in the original's primary concern. A short tradeoff explanation accompanies the benefit. Larger losses and material adverse-nutrient worsening still reject.
- Cereal category wording is normalized by food purpose, including dry oatmeal. Drinks, bars, cookies, flour and unrelated grains are not silently classified as cereal. Prepared versus dry or unspecified oatmeal bases fail closed.
- Equivalent brand/name/variant word splits can associate a GPT suggestion with the same scanned original. Brand, non-generic flavor and package-size differences remain protected. This normalization is not used to fill nutrients: the existing exact-identity/equal-gram requirements for missing-value supplementation remain unchanged.
- Each complete alternative record is validated and streamed after all batch cells are accounted for. Truncated facts never render. Gemini does not wait for GPT. GPT's post-Gemini 20-second cutoff is removed; it may complete within the existing provider/request limits (90-second GPT transport; 180-second provider/recovery bound, 195-second route, 210-second client). Cancel/background still aborts work.
- GPT candidate nutrition is checked first, then its improvement is assessed against the Gemini original. Missing GPT original nutrients cannot discard a complete candidate before that comparison. A Gemini-failure fallback still validates against GPT facts and cannot bypass checks.
- Both provider answers, partial failed answers, usage and per-candidate rejection codes are recorded in the existing encrypted journal. Provider records and the merged client result are linked to the session/batch. No images, submitted profiles, rendered prompts, credentials or hidden model reasoning are stored.
- To preserve the shipped privacy behavior, older clients sharing health details retain processing diagnostics only. Full answer retention for those scans requires the newly staged shelf notice. No-health scans, including this fixture, retain both full answers now. Retention remains seven days / 200 response records / 40 MiB; journal failure never fails a scan.

## Exact shelf-prompt changes

Only the standalone shelf prompt and its editable copy changed. The approved single-product prompt remains unchanged.

Added to the alternative instruction:

> Neutral does not count as Healthy and does not remove the need for alternatives. A meaningfully better alternative may still be Neutral or Not Healthy; keep its honest rating.

## Live rerun

Same package-only public nine-cell image and fictional no-health Wegmans Northborough context as the build-26 release check. Three products repeated three times: Special K Chocolatey Delight, Wegmans Parmesan Romano pasta sauce and Apple Jacks. No personal health details or private phone photo were sent.

- Image SHA-256: `0df43f7a3de7d2bac948787d6be30ce584ffb87c55e440b80c12fbde50a3d0fc`.
- Session: `shelf-fix-grid-1792980286601`.
- First product: **4.043 s**.
- First accepted alternative: **7.227 s**, before final completion.
- Final response: **33.197 s**; three distinct products, six duplicate appearances, no unresolved cells.

| Provider | Proposed alternatives | Passed provider checks | Completed |
| --- | ---: | ---: | ---: |
| gemini-3.5-flash-lite | 2 | 1 | 7.013 s |
| gpt-6-luna | 2 | 2 | 32.905 s |

Final displayed alternatives:

- Instant Oatmeal Organic Rolled Oats — healthy; Less added sugar, Less total sugar.
- Oats, Old Fashioned — healthy; Less added sugar, Less total sugar.

Recorded decisions:

- gemini-3.5-flash-lite: Tomato Basil Pasta Sauce — rejected (equal_weight_loses_proteinG).
- gemini-3.5-flash-lite: Instant Oatmeal Organic Rolled Oats — accepted (meaningful_improvement, policy_cereal_v1, original_priority_addedSugarsG, original_priority_improved).
- gpt-6-luna: Oats, Old Fashioned — accepted (candidate_nutrition_valid, pending_gemini_comparison).
- gpt-6-luna: Muesli Cereal — accepted (candidate_nutrition_valid, pending_gemini_comparison).

At the final merge, GPT oats passed comparison against the Gemini original. Muesli was held because the two original-product identities did not match under the protected variant/size association rule (`original_identity_mismatch`). Provider-level nutrient validation alone does not authorize display.

Both full responses and the actual merged client result were recovered from the encrypted journal. The harness now asserts useful alternatives, early alternative delivery and completed/recoverable responses from both providers; identification alone is not a passing alternatives test.

## Failed intermediate runs and deterministic replay

All intermediate evidence is preserved in ignored artifacts, not overwritten or counted as clean passes:

- First run: 4.027 s first product, 6.550 s first alternative, 34.618 s final. Gemini proposed two/one accepted; GPT completed but proposed none. Its own explanation incorrectly treated Neutral as sufficient to omit alternatives. The other Gemini cereal had about 21% less added sugar at equal weight but failed the old 25% category rule.
- Second run: both models completed but zero alternatives passed. Gemini called the sauce healthy and proposed none; GPT proposed oatmeal twice, rejected on category wording. The same responses replay to one distinct oatmeal alternative after normalization.
- Third run: both models completed but zero alternatives passed. GPT used another descriptive oat category and also suggested a sauce with no nutrition/serving basis. The recorded responses now replay to one oats alternative, while the unknown-nutrition sauce remains rejected.
- Fourth run: GPT returned two named suggestions without their nutrient tables. Both remain rejected; the unknown values were not invented or replaced with zero.
- Final-policy replay of all four saved answers produces **2 / 1 / 1 / 0** distinct alternatives, without any new model call. The first replay keeps the second cereal neutral and explains less added sugar/lower sodium.

## Verification and remaining limits

Full `npm run check` passed: **811 core/service tests**, TypeScript, mobile lint, 9 tooling tests, 10 report adapters, 76 photo UI scenarios, onboarding/needs, 11 news tests/news UI and shelf-nine UI checks. Focused tests cover early Gemini/GPT alternative delivery, cancellation/provider deadlines, retained red warnings, nutrient and preparation holds, equivalent identity wording, response retention/consent, encryption schema, missing fields and diagnostic failures.

Only the beta backend service was restarted; portfolio, ServeForward, preview and the other backend retained their PIDs. Side-chat native shelf collection/reliability, multi-health-concern controls, news, reports and artwork remain in place. No detector, signing, EAS or build-number configuration changed.

This validates transport and filtering on one public fixture, not physical-camera accuracy or a guarantee of three recommendations. Nutrition accuracy remains open: earlier runs in this checkpoint gave Gemini sauce sodium of 420 mg against the user's previously confirmed 620 mg; GPT supplied 620 mg. Gemini's supplied nutrients are not replaced or averaged. Store/aisle text is retained as a suggestion, without claiming branch inventory or label verification. Physical iPhone acceptance and broader product/category coverage remain open.

Private evidence: `artifacts/shelf-alternatives-2026-10-25/` (`live.json`, `live-model-responses.json`, `live-diagnostics.json`, saved-answer replay, full test logs, source manifest and service checks). Raw responses remain excluded from the public repository.
