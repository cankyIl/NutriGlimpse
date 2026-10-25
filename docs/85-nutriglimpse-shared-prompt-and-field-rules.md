# NutriGlimpse — unchanged shared prompt and edited field rules

Updated October 25, 2026. Authoritative workspace: /path/to/NutriGlimpse.

## Release status

Backend deployed and public scan verified. Apple app record **6823645787** is named **NutriGlimpse**, retaining bundle identifier org.cac.healthgrocery.beta0. Build **0.1.0 (22)** compiled on the Mac, passed full code-signature and IPA-content checks, and is Apple **VALID / IN_BETA_TESTING** in the existing **Beta 0 - Owner Testing** group. Submission **83331e88-663d-4c23-93a1-1cac27194d71** finished. Apple build **3e0c734c-6ef2-4b12-8e28-fd51ad4a9aec**; encryption declaration false and English release notes verified. No additional testers added. Owner installation/physical acceptance remain unverified.

Five distinct product images were subsequently tested after the user asked about coverage: 5/5 correct identities and completed reviews, but the quality assessment is **not a clean pass** because of a wrong sauce nutrient value and explanation gaps. The duplicate sauce recommendation was fixed and replay-verified. Details below.

## Approved prompt

The user explicitly chose: **Keep prompt unchanged; use it for both models.**

There is **no wording change** to apps/service/prompts/gemini-product-photo-native.txt.
Its SHA-256 remains 50f6b61dfdf606dd6dfe09dfa0a0ee8fab83d01ddf0d160c6567ba77f23f9014.
Both providers call the same rendering function in groceryPromptTemplate.ts. The proposed nutrient-tier paragraph was not applied. The former GPT supplement-only prompt is no longer used.

Gemini uses its native Google Search grounding. GPT uses its existing web-search tool (maximum three calls), the same prompt, and the same product image. Provider JSON-format settings differ only where required by the respective API. The existing private-context safety instruction is identical when health context is authorized.

Both requests start together. Gemini alone supplies the original product, rating and first alternatives. For a Neutral or Not Healthy original, distinct eligible GPT alternatives fill empty slots up to three. GPT's original assessment is ignored. No voting or comparison of original model ratings is performed. Healthy, unrated or failed Gemini results cannot be replaced by GPT.

Gemini's partial cards stream immediately. GPT can use the remainder of its existing 30-second total deadline; it does not add another 30 seconds after Gemini. Failed, cancelled, late, malformed or ineligible GPT answers cannot erase Gemini results. Three alternatives are a maximum, not a fabricated guarantee.

## User-edited field handling

The user-edited Gemini-Response-JSON-Field-Handling-Draft.txt is preserved verbatim, SHA-256 8d73860e22832d6afbeccd9fdd318433b3166f6816f410962ef3282c429af19d.

- Missing source_url remains nonblocking. Returned facts can be presented as unverified AI estimates.
- Individual absent/invalid nutrient values remain unknown, never zero. A returned adverse rating supported by known sodium remains usable when protein, fiber or other fields are missing.
- No complete-nutrient gate was added. No per-serving sodium threshold or equal-portion comparison is asserted without quantity metadata.
- Tier 1 order in Food Facts: total sugar, added sugar, carbohydrate, protein, trans fat, saturated fat, sodium.
- Tier 2 follows: calories, total fat, fiber, potassium, calcium, iron, magnesium, phosphorus, vitamin D where supported by the card.
- Tiers are handled locally; they add no paragraph or instruction to the model prompt. Existing nutrient bounds/component consistency and dietary/clinical checks remain.
- Missing optional metadata affects its field/card only. Suggested retailer names do not claim stock; aisle still requires matching current-branch evidence.
- Missing retailer names may trigger the existing single bounded follow-up. Missing source links alone do not trigger another lookup.
- The shared response schema still allows unknown values. Invalid/non-JSON responses remain a distinct error.

## Brand and phone changes

Installed app display name, onboarding, home screen and public catalog attribution now use **NutriGlimpse**. Tagline: **Know your food. Understand your choices.**

The existing art, palette, scanning controls, news, shelf detection, measurements and earlier side-chat work remain. App identifiers, signing team, EAS project, data-storage keys and URL scheme remain stable so an update replaces the existing app and preserves saved information. Logo/final icon selection remains open.

## Explicit sharing choices

Build 22 refreshes the photo notice to name Google and OpenAI and separately offers **Use my health details** or **Continue without health details**.

The new phone client rereads both persisted choices immediately before dispatch. Missing, legacy or revoked choices cannot dispatch a newly authorized shared-context request. Declining health sharing removes health categories, dietary restrictions, profile, preferences, measurements and labs from both provider inputs; photo and selected store remain.

The backend permits OpenAI health context only when BOTH the new parallel-context notice and new Google/OpenAI health-consent version are present. Old Google-only choices never expand into OpenAI health sharing. Build 21 remains compatible: its approved Gemini context continues, and GPT receives only photo plus the same template without private/store context.

No real personal-health data was sent in validation. Clinical/personalized medical advice gates, shelf health/lab boundaries and separate news permissions remain unchanged. Existing consented response retention and deletion bounds remain.

## Verification

- Full workspace check: **738 core/service tests**, nine tooling tests, ten native-input adapter tests, typechecks and lint (zero errors; one pre-existing AiProductCard hook dependency warning).
- **70 photo UI scenarios**, both normal and Beta timing-enabled modes; **ten shelf UI scenarios**.
- Existing onboarding/needs and news checks pass (11 Python news tests plus UI harness).
- **55 focused tests** rerun after the bounded waiting adjustment.
- Tests cover identical prompt/image content, legacy and declined sharing, revoked consent, partial sodium-only results, original/Gemini-choice preservation, deduplication, dietary limits, failures, streaming, and cancellation/deadlines.
- iOS JavaScript export passes. **339 source paths** frozen and hash-matched before Mac compilation.
- Only congress-beta-backend.service restarted; portfolio and other service PIDs unchanged.
- Public /health and v6/v5 capability checks are 200 after startup. Initial immediate health probes caught the restart startup window; the subsequent scan and health checks succeeded.
- Native compilation and full Mac code-signature verification pass. IPA SHA-256: 394907689aaeac56ea99ff23271a66e5301df36e49f0deb04aa5e6868629c251; 58,591,283 bytes, arm64, minimum iOS 16.4. NutriGlimpse display name, tagline, dual-provider consent, both shelf models, news and artwork were verified in the signed IPA. All 339 source paths still match after compilation. EAS Submit finished and Apple marked the exact build VALID / IN_BETA_TESTING. Physical device acceptance remains separate.

## Actual provider evidence

All live checks used the previously supplied public Special K cereal image and Wegmans Northborough, with no personal profile.

First paired run: Gemini first card 3.908 s, one choice 4.568 s; GPT exceeded the old additional-wait cap and the valid Gemini result was retained.
Direct GPT check: 26.017 s, 29,103 input / 1,145 output tokens, three web-search calls, two choices. This showed why the previous extra-wait cutoff could discard a response still within the existing total deadline.

Final deployed HTTPS test:
- Identity: **5.580 s**
- Original food card: **6.564 s**
- Gemini choice: **7.497 s**
- Three choices: **25.894 s**
- Final: **25.902 s**
- Gemini: 1,243 input / 1,038 output tokens.
- GPT: 29,633 input / 1,174 output tokens; provider elapsed 25.726 s.
- Gemini choice: Kashi GO Original Protein Cereal.
- GPT additions: Wegmans Bran Flakes Cereal; Wegmans Oats, Old Fashioned.
- Suggested retailer: Wegmans. No unsupported aisle displayed.
- Retained-answer replay verifies Gemini's original and choice are unchanged, and exactly two GPT additions were used.

These are individual observations, not a latency benchmark or evidence of exact-label/medical correctness. Full-prompt GPT lookup is materially slower and uses more input tokens than Gemini in these runs. Provider timing and eligibility still limit three-choice coverage.

## Evidence and remaining acceptance

Evidence directory: artifacts/nutriglimpse-build22-2026-10-25/.
Key files: check.log, photo-ui-timing.log, shelf-ui.log, final-targeted.log, live-summary.json, gpt-request-check.json, public-check.json, public-journal-check.json, deployment.json, health-after-startup.json, source-verification.json and Apple branding verification.

Remaining: verify installation, refreshed sharing choice, home branding and camera behavior on iPhone X and iPhone 17. Continue real-label nutrient accuracy, actual retailer/aisle accuracy, latency and alternative-coverage trials. Preserve existing clinical review, retailer inventory access, certification evidence and detector-permission/publication dependencies; this change does not resolve those.


## Five-product live acceptance check — requested after upload

The user asked whether at least five images had been tested. At that point the new flow had only one distinct-product live fixture. We then ran **five distinct public product images sequentially through the deployed HTTPS endpoint**, with no personal health profile. This is backend/image testing, not five iPhone camera trials.

| Product | Returned rating | First card | Complete | Alternatives |
| --- | --- | --- | --- | --- |
| Special K Chocolatey Delight | not_healthy | 6.9 s | 23.5 s | 3 |
| Kelloggs Apple Jacks | not_healthy | 6.2 s | 22.1 s | 3 |
| Wegmans Parmesan Romano pasta sauce | neutral | 5.4 s | 20.7 s | 3 returned; 2 unique |
| Post Shredded Wheat Original Big Biscuit | healthy | 4.5 s | 5.5 s | 0 |
| Bobs Red Mill Old Country Style Muesli | healthy | 4.3 s | 5.7 s | 0 |

**Identification and flow:** 5/5 identified correctly and completed without a transport/review failure. All alternatives had store names. Healthy Shredded Wheat and Muesli correctly did not invoke supplementation; GPT was cancelled. No branch-supported aisles were returned, so none were invented/displayed. Both approved prompt-template hashes match on every case.

**Quality result: NOT a clean pass.** The sauce returned **420 mg sodium** rather than the **620 mg** already supplied by the user; its returned rating was Neutral. The model result was retained under the approved Gemini-authority rule. This remains a P0 exact-product/nutrition retrieval failure, not a resolved clinical or nutritional validation.

The sauce also returned the same low-sodium marinara twice with reordered names and the word “pasta” present in one. A backend-only canonical-name fix now treats “pasta sauce” and “sauce” equivalently while retaining brand/flavor/low-sodium qualifiers. The exact saved answer replays to **two distinct alternatives**. We did not fabricate a third or change the model prompt, rating or nutrition. **46 focused tests** and the **739-test full core/service suite** pass after the correction. It is deployed; no new iPhone build is needed. All 339 frozen build22 phone paths still match.

**Additional quality follow-up:** Some Apple Jacks alternatives lacked reasons; some lengthy GPT explanations were cut mid-word by current display bounds. One GPT Apple Jacks comparison referenced original fiber as 2 g, whereas Gemini's displayed original has 3 g. These are open explanation-quality issues; a completed response/three cards does not prove those explanations or every nutrient correct. The two healthy reference images were existing 200-pixel Open Food Facts photographs (CC BY-SA 3.0); the three other images were user-supplied packages. This small set covers four cereal/muesli products and one sauce, not broad grocery-category acceptance.

Exact fixtures, returned answers, timings, tokens, decisions, replay and quality assessment: artifacts/nutriglimpse-build22-2026-10-25/five-product-validation/. The prompt remains unchanged. Continue exact-label accuracy, concise faithful explanations, broader categories, device camera and latency testing before claiming release-quality acceptance.
