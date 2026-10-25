# Parallel GPT-6 Luna and Claude Haiku 5.5 product-photo review

**Updated:** October 17, 2026 (America/New_York)  
**Status:** Claude key saved securely, exact model access and live vision inference verified. Dual-review backend deployed; matching mobile source and iOS JavaScript export complete. **Subsequent release: the updated client and consent are compiled and available in TestFlight 0.1.0 (11); build 10 remains the older OpenAI-only client. Physical phone acceptance is pending. The original backend checkpoint below did not create a native build; delivery evidence is in [build 11](64-build11-grocery-landing-and-dual-review.md).**

## Implemented flow

1. The updated client requests one-time consent explicitly naming OpenAI and Anthropic. Its new consent version is distinct from the previously accepted OpenAI-only consent.
2. One resized product photo, with EXIF removed, goes to the backend. No name, profile, laboratory information, weight or location is sent to either model.
3. The backend dispatches **gpt-6-luna** and **claude-haiku-5-5** concurrently with identical application instructions, user text and photo. Provider API envelopes and structured-output grammar differ; expected output fields and application validation are the same. Neither model sees the other answer.
4. The first supported identity and original-food result can stream to the phone while the other review is still running. This progress contains no alternatives.
5. After both requests settle, combine up to five proposed candidates per model. Check all ten before selecting up to three. Deduplicate product/formulation, ignoring package size as a distinct alternative. Limited, sourced manufacturer/product-brand normalization handles General Mills/Cheerios and field-placement differences; unknown brand aliases are not guessed.
6. Each retained candidate must pass the existing identity/category, required-nutrient, equal-weight, leading-concern, trans-fat, red-signal, worsening and fiber/protein checks **against every usable original estimate**. Duplicate candidate records must all pass, preventing selection of only their more favorable estimate. A model-neutral original can trigger alternatives even if computed green. Different nutrient records are never averaged into a manufactured record.
7. Show up to three passing cards and launch one independent nearby-store lookup for each displayed alternative. Existing query wording and availability evidence labels are unchanged.

Known brand/product conflicts and explicit approximate identities are rejected. This is not universal proof that a model-suggested SKU exists. Facts remain clearly labeled estimates; optional USDA/OFF checks and matching reference-photo lookup remain inside each card. Existing dietary warnings remain and estimated cards cannot establish allergen/celiac safety. Personalized medical recommendations remain disabled.

## Failure and disagreement handling

- One provider fails: preserve the other completed result and show that one review was unavailable.
- Both fail, a cancelled request, or exhausted admission budget: fail explicitly; no automatic paid retry.
- Conflicting original identities: flag the disagreement, withhold a favorable rating and alternatives. A fallback original may replace a failed provider's preview only in the final explicitly partial result.
- Nutrition estimates differing by more than 3% per gram (or known versus missing) produce a package-check notice. This disclosure is **not** the separately proposed proximity-ranking rule.
- Do not promise three alternatives when fewer pass. No invented filler, fabricated photo or confirmed-stock claim.
- Model suggestions still require real-package/device acceptance; two models do not make remembered nutrition verified evidence.

## API, privacy and compatibility

- New routes: `/v4/photos/capabilities`, `/v4/photos/recognize`.
- Consent: `product-photo-dual-2026-10-17.1`.
- Older v1/v2/v3 routes remain compatible; v3 continues calling GPT alone. Old consent is rejected by v4 before paid dispatch.
- Both transports are bounded and cancellable. Claude uses streaming structured output, a 60-second timeout, disabled thinking and no tools or retries. The pair has a 65-second bound.
- The Anthropic key remains only in `.tools/anthropic/api-key` (0600, parent 0700), excluded from Git and EAS packaging. The setup helper uses a hidden prompt and refuses accidental overwrite.
- Private diagnostics record model identities/prompt and rule hashes, original estimates, accepted/rejected candidates and decision codes. No raw photo, profile, location or API key is logged. Existing seven-day / 2,000-event retention remains.
- Union/identity rules are included in the archived rules hash. Source/lookup/image behavior, personal-data gates, portfolio and other services are preserved.

## Verification

Latest `npm run check`: **503 core/service tests**, nine tooling tests, ten input adapters, typecheck and mobile lint pass. **51 production-component scenarios** pass; both timing modes were checked. iOS JavaScript export passes. This is not native compilation or physical camera acceptance.

New regressions cover identical prompts/images, Claude grammar/SSE, simultaneous dispatch, early identity/original display, full-pool union, duplicates and conflicting nutrition, formulation identity, invented brand/product pairing, category/red/missing nutrient rejection, one/both failures, in-flight cancellation, React Native signals, new consent/old client compatibility, atomic budget admission and independent store-card lookups.

Bounded public Honey Nut Cheerios fixture checks, with no user photo or health data:
- Initial Claude HTTP 400 exposed unsupported JSON-schema constraints. Adapter now removes only provider-unsupported grammar constraints, shares repeated definitions and retains complete application-side validation.
- A later naming mismatch exposed manufacturer-versus-product-brand placement. Exact formulation checks remain; limited sourced normalization fixes this case.
- Successful direct pair: dispatches 3 ms apart; identity 1.20 s; original 1.75 s; completed union 6.47 s with three alternatives.
- Successful deployed HTTPS stream: identity 1.15 s; original 2.24 s; completion 5.85 s, both models completed. It exposed a wrong-brand “Cheerios-style” suggestion.
- Final correction rejects that suggestion and deduplicates the competing Original Cheerios estimates. Offline replay of the exact public decision records selects **Barbara’s Shredded Wheat, Post Shredded Wheat, and Nature’s Path SmartBran**. No additional paid call was made to replay or validate this correction.
- These are individual synthetic measurements, not a speed, nutrition accuracy, coverage or store-stock guarantee.

Evidence: `artifacts/dual-review-2026-10-17/` contains final checks, timing-on UI evidence, iOS export, public-fixture reports, replay, health results, service PIDs and source hashes. Beta backend restarted with the final correction. Public v3/v4 capabilities and health respond successfully. Other backend, preview and portfolio PIDs remain unchanged; portfolio HTTPS returns 200.

## Cost

For standard requests within 100K input tokens, both currently list **$0.10 per million input text tokens and $0.50 per million output tokens**. Two-model scans add a second billable inference. Image tokenization and output lengths differ, so matching rates do not guarantee equal per-scan cost.

At the original DEV-25 verification checkpoint, the **$2 authorization / $1.80 conservative admission gate** was unchanged. Four engineering pairs reserved $0.16, taking the shared checkpoint from $1.60 to **$1.76 across 88 reservations**. This is reserved allowance, not measured provider billing; the rejected request also keeps its reservation.

**Current policy — October 18:** The user manages provider spending. The October 17 assistant-selected $10 allowance/$9 admission gate is superseded and removed. The old fixed $0.02 records were reservation bookkeeping, not measured charges or evidence of remaining provider funds. New dispatch records use attempt counts only, with no invented monetary amount; legacy history remains unchanged. Paired accounting is still locked, with validation and all request-rate/concurrency limits, timeouts and no automatic paid retries retained. All 200 service tests, two operator tests and service typecheck pass; deployed v3/v4 capability checks report available. No paid model calls were made for this correction. Evidence: artifacts/user-managed-budget-2026-10-18/verification.json.

## Remaining steps

- V4 client, updated consent/privacy copy and result notices are delivered in build 11. Physical phone testing is pending. No further Claude key is needed.
- Physical repeat-scan accuracy, food-fact quality, network interruption, photo cleanup and store-availability acceptance remain open.
- The selected-chain/branch preference and closest-store tie-breaker for nutritionally comparable alternatives within ±3% remain separate pending selection work (FB-37). Current store lookups run after the three alternatives are selected.
- Shelf Camera AI batching/observed-product comparison remains the separate FB-35 design scope. This implementation is for a normal single-product photo.
- Remove temporary Beta 0 timing before Beta 1. Existing clinical, certification and inventory evidence dependencies remain.

## Official references

Retrieved October 17, 2026:
- [GPT-6 Luna model and pricing](https://developers.openai.com/api/docs/models/gpt-6-luna)
- [Claude Haiku 5.5 ID, pricing and vision](https://platform.claude.com/docs/en/models/haiku-5-5/overview)
- [Claude Messages API](https://platform.claude.com/docs/en/api/messages/create)
- [Claude vision input](https://platform.claude.com/docs/en/build-with-claude/vision)
- [Claude structured-output grammar limits](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)
- [General Mills identifies Cheerios as its brand](https://www.generalmills.com/our-food/brands/cheerios)
