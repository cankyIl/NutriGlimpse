# Shelf model ratings and duplicate cards — October 26, 2026

Status: **backend LIVE; compatible with installed TestFlight 0.1.0 (27). No app upload, OTA update or prompt edit.** Deployed shortly after midnight Eastern on October 26. Start a fresh shelf scan to use it; existing displayed results do not refresh retroactively.

## Problem and correction

The previous shelf adapter replaced every model rating with the local calculated color. Missing added sugar removed the first Quaker Lower Sugar Variety Pack rating; missing serving grams removed a Cinnamon Toast Crunch rating. A later Gemini Not Healthy oatmeal assessment was also recalculated to Healthy. Separately, product names, brand/name field splits, package-size descriptions and repeated marketing words produced duplicate cards.

Scanned-product ratings now retain the model's supplied value. Gemini leads; attributed GPT results are used for cells/batches Gemini cannot complete. Missing nutrients or serving grams, a different local threshold result, or later conflicting estimates do not recalculate or erase the model assessment. A missing model rating stays unknown; uncertain identity still has no rating. Numerical bounds and product/cell schema validation remain. No missing nutrient or serving weight is invented.

The display decision is separate from alternative eligibility. Proposed alternatives still undergo coherent-nutrition, serving-basis, equal-weight, category, trans-fat and meaningful-improvement checks. GPT cannot supply missing nutrient values across different exact identities or serving weights. The new display identity is **never used to combine nutrient tables or authorize comparisons**.

## Duplicate handling without a phone update

A bounded backend registry gives repeat sightings consistent brand/name/variant/size display fields. The existing build-27 phone merger then combines them. It handles punctuation, original/regular wording, brand/product field splits, box-size-only differences, repeated marketing text and variety-pack names versus their listed contents. Flavor, brand, organic, sugar-free, lower-sugar and gluten-free distinctions remain protected; different explicit variety-pack contents remain separate.

Aliases are scoped to the scan and a hash of its context. They are transient, with a 15-minute inactivity expiry checked on use, at most 128 sessions and 256 entries per session. Only product identity metadata is held; no images, nutrition tables or submitted health profile are stored in this registry.

A card uses a complete Gemini observation in preference to GPT; among repeated complete Gemini observations, build 27 retains its first observation. The whole selected record is kept, without averaging tables or selecting the most favorable rating. Packaging sizes may be represented by that first sighting because sizes of the same formulation share a product card. Ambiguous or distinguishable formulations are not intentionally collapsed.

Both raw provider answers continue to be retained under the existing consent/retention rules. Final normalized delivery, including the GPT fallback path, is now recorded in the same journal for later diagnosis. Source prompts and privacy gates remain unchanged.

## Exact saved-scan replay

The owner's October 25, approximately 11:44 p.m. shelf scan contained three nine-cell batches. The six retained Gemini/GPT responses were replayed through the production provider, local HTTP route, and unchanged build-27 client and merger. The recorded Gemini failure in the second batch was retained and the GPT fallback exercised. This was deterministic post-processing verification: original shelf photos are transient and unavailable for a fresh model request. No new LLM or search calls were made, and replay duration is not a model-latency benchmark.

| Result | Before | After |
| --- | --- | --- |
| Captured appearances accounted for | 27 | 27 |
| Distinct displayed product cards | 9 | 6 |
| Quaker Lower Sugar Instant Oatmeal | Duplicate cards, one unrated | One Healthy card, using the first Gemini assessment; seven appearances combined |
| Cinnamon Toast Crunch | Duplicate cards, one unrated | One Not Healthy card, using Gemini's assessment; seven appearances combined |
| Special K Zero Cinnamon | Separate differently named cards | One card with Gemini's Neutral rating; five appearances combined |

Remaining distinct products are Bob's Red Mill oats, Special K Red Berries and Honey Nut Cheerios. All six final cards have model ratings. Nutrition values remain those supplied by the selected model observation, not independently verified package facts. Gemini supplied different oatmeal assessments across sightings; this change preserves provider output and deterministic selection, not a claim that model accuracy is solved.

The side-chat's separate 16-appearance cereal fixture was replayed for identity grouping: **13 cards become the expected 10**, with all 16 appearances retained. This closes the observed duplicate defects in those fixtures; it does not establish universal product matching or physical-camera accuracy.

## Verification and deployment

- Full `npm run check`: **828 core/service tests**, typechecks, mobile lint, nine tooling checks, ten report-input tests, 76 photo UI scenarios in each timing mode, needs/onboarding, 11 news tests/news UI and shelf UI checks.
- Added tests cover missing nutrients/grams, exact model-rating preservation, unknown identity/rating, duplicate observations, unchanged alternative holds, size/marketing/field-split aliases, different flavors/formulations/brands, session/context isolation, expiry and fallback delivery logging.
- All **351 build-27 source/archive inputs** are byte-for-byte unchanged. Phone/native source, shared client, prompts, app/EAS config, artwork and side-chat report were preserved.
- Restarted only the beta backend. Local and public HTTPS health checks returned 200. Portfolio, ServeForward, preview and the other backend kept their PIDs.
- Fresh physical-phone acceptance remains pending. The app build stays **0.1.0 (27)**.

Private evidence: `artifacts/shelf-ratings-dedup-2026-10-25/` contains retained responses, before/after replay, HTTP/client observations, side-chat duplicate replay, check logs, deployment and source-preservation hashes. Private returned responses and health-related explanation text are excluded from the public repository.
