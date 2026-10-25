# Sodium cutoff alternatives — DEV-22 / FB-33

October 17, 2026. **Backend deployed; mobile explanation helper delivered in TestFlight build 10.** The user requested that Prego and Classico qualify when their sodium is below the app's high-sodium cutoff and below the original. The installed build 9 accepts the additional product cards without an update.

## Current comparison policy

Policy `category-comparison-2026-10-17.3` adds a sodium-specific qualifying route. When the original has at least 460 mg sodium per stated serving and the alternative falls strictly below 460 mg at the same original serving weight, the reduction can qualify even below the prior 10% / 40 mg leading-concern requirement and without a separate 25% improvement. Thus 480 → 450 mg and 480 → 440 mg can qualify. Exactly 460 mg does not cross the boundary. Smaller candidate portions cannot manufacture a crossing.

This changes relative eligibility, not absolute colors or medical targets. Accepted sauces can remain Neutral. The explanation is “Less sodium”; the app does not turn this into a regulatory low-sodium claim or a guarantee of individual suitability. All other checks remain: complete/coherent nutrients and identified product, matching use/category, candidate not red at its own serving, zero trans fat, no disallowed increase in sugar/sodium/saturated fat/calories, no loss of fiber/protein at equal weight, original leading-concern checks, category scope, duplicates and three-card cap. Existing dietary restrictions and privacy/clinical gates remain. Non-crossing comparisons retain their existing percentage/absolute thresholds.

The provider instruction describes this same exception. The compact schema, model, high-detail image, one-call design, five candidate pool, timing/early-preview protocol and AI budget are unchanged. No automatic replacement-model call was added.

## Evidence

- 475 core/service tests, nine tooling tests, ten input-adapter tests, 39 screen scenarios with timing on/off, typecheck and lint pass. The focused comparison suite has 29 passing tests.
- Regression cases cover the requested two sodium reductions, strict cutoff boundaries, an original already below the cutoff, equal-weight portion normalization, candidate-own-serving red flags, missing/uncertain data, cross-category products, saturated-fat/sugar/calorie worsening, fiber/protein losses, other leading concerns and every streamed JSON prefix.
- The existing recorded sauce response was replayed in memory only: one accepted candidate becomes three, including both requested products; the two higher-saturated-fat candidates remain rejected. No raw user photo or diagnostic response row was copied into artifacts or documents, and no new AI request was made.
- The frozen build-9 schema and client accept all three cards. The source's absolute rating and original-reason functions are byte-identical to the pre-change version.
- Only the beta backend was restarted, after checking for active photo requests. The loaded static rule/prompt hashes are verified, recognition capabilities return HTTP 200/available, and the portfolio endpoint returns HTTP 200.

Evidence: `artifacts/sodium-cutoff-2026-10-17/`, including source snapshots/hashes, check logs, boolean-only private replay results and deployment verification. This deterministic replay establishes eligibility for the recorded candidate values; it does not guarantee the model will propose identical products or values in every future scan. Values remain estimates until checked against package/source evidence.

## Installed app and build 10

Selection is live now. A fresh scan uses the new rule; an already-open result is not retroactively replaced. No reinstall or key is needed.

Build 9 calculates alternative benefits locally using its previous rule. It therefore accepts and displays the newly eligible cards, but can fall back to generic product points instead of the corrected sodium-first explanation. The updated helper and its card scenarios were subsequently included in **TestFlight 0.1.0 (10)**. Native compilation, signed-package inspection and Apple owner-group access are verified. Updating to build 10 enables the corrected sodium-first explanation. Physical acceptance remains pending; early preview and existing features are preserved. [Combined release evidence](61-build10-sodium-and-nearby-stores.md).
