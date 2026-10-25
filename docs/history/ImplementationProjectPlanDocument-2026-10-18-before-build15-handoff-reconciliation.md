# Beta 0 Implementation Project Plan

**Updated:** October 18, 2026  
**Authoritative workspace:** /path/to/NutriGlimpse on project-server  
**Baseline:** Requirements v0.20, design v0.21 and accepted product-label policy  
**Testers:** Three iPhone testers, possible fourth Android tester  
**Status:** Build **0.1.0 (15)** is available to the existing owner group in TestFlight. Adds six-source fresh daily news and backend selection from relevant My Needs interests, with General fallback and updated privacy controls. Build 14 shelf grids and prior side-chat features are retained. Native/package checks, Apple VALID and owner access verified; physical acceptance remains pending. [Build 15 evidence](70-build15-fresh-personalized-news.md).


**Side-chat inclusion:** FB-01–08 My Needs behavior is retained and its component checks pass. FB-09–15 purple/lime home, two compact camera actions, automatic input routing and daily news are now implemented in the same source. Weight-context transmission remains disabled.

This is the current plan. Superseded pending items were removed; the [unaltered historical plan](history/ImplementationProjectPlanDocument-2026-10-14-before-reconciliation.md) preserves previous checkpoints. Dated historical checkboxes are not the active backlog.

**October 17 availability query refinement (DEV-23):** Deployed the user's address-only wording: `Find <brand> <product> <variant> in stock near me at <address>`. No store/chain name in the query; package-size validation and concurrent independent card searches remain. Twelve targeted tests and service typecheck pass; public health checks pass. Build 10 uses this backend update without a new native release. [Current query and evidence](60-nearby-alternative-availability.md).

**Parallel second-model review (DEV-25) — backend deployed, delivered in build 11:** Claude key/access and live vision calls are verified. New v4 dispatches GPT-6 Luna and Claude Haiku 5.5 together with the same prompt/photo, streams the original early, validates the full candidate union against both usable original estimates and selects up to three. Mobile source includes fresh two-provider consent and disagreement/fallback notices. Build 10 remains GPT-only; the dual-review client and fresh consent are delivered in build 11. 503 core/service tests, 51 screen scenarios and iOS JavaScript export pass; bounded deployed HTTPS and exact public-case replay are recorded. [Implementation, evidence and remaining release steps](63-dual-model-review-preparation.md).

**Build 11 delivered (DEV-26 / FB-38):** Approved landing artwork and DEV-25 dual-review client are compiled, uploaded and available to the existing owner TestFlight group. Combined checks, proportional offline artwork, source preservation, IPA and Apple state verified. [Release evidence](64-build11-grocery-landing-and-dual-review.md).

**October 18 spending-policy correction:** The user will manage provider spending. Removed the artificial dollar cutoff, including the assistant-selected $10 allowance/$9 gate. Earlier fixed two-cent reservations were not actual charges and must not be described as remaining provider budget. New dispatch records count attempts without assigning a dollar value; legacy history is preserved. Backend deployed, both photo routes available, 200 service tests plus two operator tests and service typecheck pass. No model call or native rebuild was needed.

**October 18 native landing correction (DEV-27 / FB-39) - delivered in build 12:** The user’s screenshot confirmed build 11 inherited the asset’s full pixel height. Native Yoga reproduces the failure; clearing inherited height restores the complete 4:3 image at container width. 503 core/service tests, 52 screen checks per timing mode, native layout cases, export/native/IPA checks and Apple owner availability pass. Only home sizing and build number changed in the frozen cloud source. Physical confirmation pending. [Evidence](65-build12-native-home-image-fix.md).

**October 18 Serper Shopping fallback (DEV-28 / FB-40):** Backend deployed; 517 tests and live fallback/public HTTPS checks pass. New version-2 client and accurate provider/privacy copy are delivered in TestFlight build 13. Existing builds keep SerpApi-only behavior. No account input needed. [Implementation and release status](66-serper-shopping-fallback.md).

## DEV-29 - iPhone shelf grids: delivered in build 14

Implemented and backend deployed. Default **N = 16 (4 x 4)** supersedes the earlier N = 12 draft; Finish sends the remaining 1-15 products in a compact grid. On-device Core ML/Vision detection, source-frame full-package crops, conservative duplicate checks and bounded rolling batches feed parallel GPT-6 Luna/Claude review. Product-photo cards, checked nutrition, same-category leading choices and suitable outside alternatives are included. Side-chat changes are preserved. Native compilation, signed-package inspection and Apple verification passed; version **0.1.0 (14)** is available to the existing owner TestFlight group. [Implementation, release evidence and physical limits](68-shelf-grid16-release.md).

## DEV-30 — fresh daily news and backend selection

Implemented and backend deployed. The user chose server-side selection from a shared daily collection. The phone sends only useful topic fields; no meaningful information or General sends no profile data. Only general stories are cached offline. Six sources respond; 23 fresh candidates and both general/personalized five-story HTTPS responses verified. The new client is delivered in TestFlight build 15; daily article changes now need no upload after installing it. [DEV-30 implementation and evidence](69-daily-personalized-food-news.md).

## Completed development

| ID | Delivered | Evidence / boundary |
|---|---|---|
| DEV-01 | Offline DASH/NIDDK/DGA guidance library: 26 entries, five sources and 128 serving-table cells. Explicit sodium/saturated-fat reference arithmetic and existing ADA/CDC/Mayo/AHA education | Source links/version and conflicting serving definitions retained; no personal target chosen automatically |
| DEV-02 | Seven retailer checking links; adjustable local store radius, distance order and directions; transient foreground GPS/manual branch context | Location is not inventory. OSM remains Massachusetts-focused |
| DEV-03 | Local product/receipt reading, source-linked correction, missing-item recovery, purchase quantities, partial/excluded rows, exact catalog confirmation, package/catalog differences, encrypted review history/deletion/export | Fictional full review is available; file/photo-library/receipt imports remain gated. A separate in-memory iPhone still-photo route is implemented in DEV-10 |
| DEV-04 | Additional report OCR typography/layout handling and adversarial evidence checks | Missing/ambiguous values remain unknown; existing consented numeric-only report route preserved |
| DEV-05 | Fifteen justified OFF category improvements; resumable, pinned, hashed, atomic bulk acquisition/import; refreshed exclusion and chain-coverage audits | 352 comparison-ready OFF foods; no weakened nutrient/dietary/freshness checks or invented catalog growth |
| DEV-06 | Android CameraX/ONNX/ML Kit Shelf Scan, barcode-first local reading, bounded scheduling, lifecycle cancellation and benchmark metrics | Native compilation and emulator runtime checks passed; physical accuracy/performance and model distribution rights unverified |
| DEV-07 | Consolidated automated checks, internally signed Android phone/emulator builds, installation/startup check, iOS project preparation and all-platform JavaScript exports, source package and security review | iOS Swift compilation, initial-screen rendering and simulator restart now pass; unsigned and signed device compilation, physical installation and user-confirmed initial screen pass. No physical phone acceptance or clean security-audit claim |
| DEV-09 | Physical-phone feedback: optional gender, General Fitness/No Concern, remembered location without repeated notices, immediate return after store choice and verified main Wegmans address | 331 app/core/service tests pass; signed iPhone update installed/launched; user confirms store return and address |
| DEV-10 | Direct product-photo recognition, separate nutrient-table and barcode cameras, included offline catalog, shelf auto-start and exact-name suggestion ordering | 356 automated checks, 19 original native OCR checks and 15 corrected edge-image cases pass; signed update installed/launched, physical photo-to-suggestions and facts-screen opening confirmed; content/accuracy feedback superseded by DEV-11; shelf acceptance pending |
| DEV-11 | GPT-6 Luna single-photo recognition; automatic best match with uncertainty label/correction; bounded live USDA search/details fallback; concise 1–3 label points, inline alternatives and expandable details | 353 app/core/service + 7 tooling + 10 adapter tests, six screen-flow checks, 23 native image-encoding assertions, two live synthetic AI calls and live USDA retrieval pass; iOS JS export passes. Full native build/install awaits powered-on Mac; physical accuracy is not established |
| DEV-12 | GPT-6 Luna photo → independent candidate suggestions → verified nutrition lookup → model assessment → checked color rating and up to three alternatives; source-backed manufacturer matching, nutrient enrichment, optional attributed thumbnails, explicit minor trade-offs, versioned consent and legacy API compatibility | 381 app/core/service + 7 tooling + 10 adapter tests, 14 screen checks; live oats/healthy and Honey Nut Cheerios/red → plain Cheerios/healthy cases pass. General nutrition only; no profile/lab transmission. See [DEV-12 evidence](43-verified-ai-photo-ratings.md) |
| DEV-13 | Key-free beta access; removed local-text fallback and AI-enabled wording; accessible camera-icon shutter; combined side-chat My Needs enhancements | 397 core/service + 7 tooling + 10 adapter tests, 16 photo-screen scenarios and My Needs checks pass; signed build 0.1.0 (3) accepted by Apple and available to owner in TestFlight. Physical update/acceptance pending; [release evidence](47-key-free-beta-update.md) |
| DEV-14 | Approved LLM-first per-product cards, one-call review, up to three alternatives, optional isolated source checks, unified camera routing, Berry & Citrus home and cached publisher news | 409 core/service, 7 tooling, 10 adapter, 23 photo/home scenarios, My Needs and 4 news-operator checks pass. Five public-image requests complete; final three each return three alternatives. Signed build 4 verified; owner TestFlight access confirmed; [evidence](49-approved-cards-and-home-release.md) |
| DEV-15 | Corrected React Native response handling and misleading connection errors across recognition/source/media checks | Actual native AbortController reproduces the old failure; all six regressions and full 415-test checks pass. Retained in build 6; physical retest pending |
| DEV-16 | Earlier validated product cards and incremental alternatives, overlapping native preparation, queued/cached public package photos and per-card source-details toggle | 422 core/service tests and 27 screen scenarios pass; live HTTPS first card 2.9 s / three alternatives 6.0 s; build 6 available in owner TestFlight; physical timing/acceptance unverified |
| DEV-17 | Private beta decision diagnostics | Deployed; bounded seven-day / 2,000-event private retention; no raw photos or personal health data |
| DEV-18 | Category-specific relative alternatives and rating reconciliation | Deployed; 454 core/service tests; missing-data, dietary/nutrition, red-signal and equal-weight guards preserved |
| DEV-19 | Combined iPhone build 7: relative explanation text, supported quiet shutter, temporary scan timing and diagnostic disclosure | Native build/IPA checks and Apple owner TestFlight access verified; physical acceptance pending |
| DEV-20 | Original-concern-first alternative eligibility/explanations and combined build 8 with side-chat screenshots | 462 tests / 33 screen scenarios; backend deployed; Apple VALID and owner TestFlight access confirmed; physical acceptance pending |
| DEV-21 | Combined build 9: early product preview and lossless compact AI response with current concern-first logic | 468 tests / 37 screen scenarios; paired live and old/new HTTPS checks pass; native/IPA checks and Apple owner TestFlight access verified; physical acceptance pending |
| DEV-22 | Below-high-sodium-cutoff alternatives accepted despite smaller percentage reductions | Backend deployed; sodium-first local explanation helper compiled and delivered in TestFlight build 10. All other nutrition/dietary checks retained; physical acceptance pending |
| DEV-23 | Parallel nearby-store search inside each displayed alternative; exact product/variant/size matching; Google stock/pickup evidence distinguished from unconfirmed listings | Backend deployed; UI and privacy copy compiled and delivered in build 10. Independent completion/failure/cancellation tested; physical store/phone acceptance pending |
| DEV-24 | Combined build 10: sodium-first explanations and parallel nearby-store cards, retaining all prior side-chat work | Complete: 487 tests / 47 screen scenarios in both timing modes, export/native/IPA checks, Apple VALID and owner TestFlight access verified; [evidence](61-build10-sodium-and-nearby-stores.md) |
| DEV-25 | Concurrent GPT-6 Luna / Claude Haiku 5.5 photo review, checked candidate union, disagreement/failure handling and separate consent | Backend deployed; compiled and delivered in build 11. 503 tests / 51 screen scenarios pass; physical acceptance pending; [evidence](63-dual-model-review-preparation.md) |
| DEV-26 | Approved grocery-cart, Nutrition Facts and heart/ECG landing page; combined with DEV-25 side-chat review | Complete: 503 core/service tests, 51 screen scenarios per timing mode, responsive layout/export/native/IPA checks; Apple VALID and owner TestFlight access confirmed; physical acceptance pending; [evidence](64-build11-grocery-landing-and-dual-review.md) |
| DEV-27 | Corrected intrinsic image-height overflow on the native home screen | Delivered in build 12; native Yoga reproduces old 1448 x 1086 failure and validates responsive dimensions. 503 tests / 52 screen checks per timing mode, export/native/IPA and Apple owner access verified; physical acceptance pending |
| DEV-28 | Serper Google Shopping fallback when primary availability lacks confirmed local stock or fails; truthful attribution, strict matching, old-client compatibility and bounded cached requests | Backend deployed; 517 tests / 52 screen checks per timing mode and live/public checks pass. Delivered in TestFlight build 13; native/IPA/Apple owner checks pass. Physical acceptance pending |
| DEV-29 | On-device full-package crops, duplicate checks and 16-cell rolling grids; dual-model checked shelf cards and outside alternatives | Backend deployed; 531 tests, 52 existing screen checks per timing mode, 10 shelf scenarios, My Needs, export/native/IPA checks and one live grid pass. Build 14 is Apple VALID and available to the owner TestFlight group. Physical acceptance pending; [evidence](68-shelf-grid16-release.md) |
| DEV-30 | Six-source daily food news, seven-day freshness, minimized profile request and backend-selected stories with general fallback | Backend deployed; 550 core/service and 11 collector tests, news UI, 52 existing screen scenarios, My Needs, typecheck/lint and iOS export pass. New phone behavior delivered in build 15; physical acceptance pending; [evidence](70-build15-fresh-personalized-news.md) |
| DEV-31 | Build 15 combines fresh daily news/backend selection with retained build-14 shelf and side-chat features | 324 frozen files, full release checks, native/IPA verification, Apple VALID / IN_BETA_TESTING and existing owner group/notes verified. Physical acceptance pending; [release](70-build15-fresh-personalized-news.md) |
| DEV-08 | Reconciled traceability/source register, beta acceptance/demo script, Mac setup guide, current evidence report and laptop documentation mirror | Actual tester results and final student submission materials remain external inputs |

## Connection correction retained in build 6

Build 4 introduced a response-path call unsupported by React Native. The fix is documented in [the build-5 incident record](50-photo-connection-runtime-fix.md). The baseline below describes feature inclusion in build 4; the runtime correction and newer test evidence supersede its operational-readiness claim.

## Current implementation baseline

- Catalog: **4,692 source records / 4,610 distinct barcodes** — 2,910 USDA and 1,782 OFF records. The last category-expansion audit found 352 comparison-ready OFF foods; that historical eligibility count is not a claim about every newly fetched row.
- Current normal-photo flow (DEV-25, delivered since build 11): show the transient captured photo, early product identity, then checked nutrition/rating and up to three suitable alternatives. GPT-6 Luna and Claude review concurrently after separate consent. Estimates and disagreements stay visible. Optional USDA/OFF checks stay within each card and do not replace identity or mix formulations.
- DEV-29 adds the separate consented shelf-grid route in build 14. iPhone composes grids locally and streams rolling results through the backend; Android retains its prior local shelf path. General colored ratings and local comparisons preserve the existing personal-data/clinical boundary. [Current shelf evidence](68-shelf-grid16-release.md).
- Current comparison policy adds a sodium cutoff-crossing route: original ≥460 mg and alternative <460 mg at equal original serving weight can qualify without the former percentage/amount floor. Colors and all other guards remain. [Policy and exact release boundary](59-sodium-cutoff-alternatives.md).
- Current native release: 319-file artifacts/iphone-build14-2026-10-18/build14-source-manifest.json. EAS 60de0017-3b1e-4693-83ca-fbc9731c338a, version **0.1.0 (14)**, Apple VALID / IN_BETA_TESTING and available in the existing owner TestFlight group. Physical update/acceptance remain unverified.
- Source nutrients remain optional where not supplied; unknown values stay unknown. Source photos are used only when matching succeeds. Build 6 replaces the failing legacy OFF image search with a working search route and a 30-day reference metadata cache. A package icon remains the fallback when no matching image is available. The original captured photo stays transient and is cleared when the app backgrounds.
- Exact-product signed gluten verification accepts verified certification OR verified manufacturer claim. **Zero production products have verified proofs.** Estimated cards cannot establish dietary safety, including celiac restrictions implied by the saved health concern.
- Existing encrypted profiles, measurements, deletion/backup/restore, barcode/catalog lookup, consented numeric report processing and Android local Shelf Camera remain; the iPhone grid path is delivered through DEV-29. Clinical personalization and personal weight transmission remain disabled.
- OSM directory: 2,012 Massachusetts stores / 842 footprints; the last timed-out refresh preserved prior data. Location does not establish inventory.
- Nearby alternative availability (DEV-23): deployed backend and build-10 cards search independently, showing checking location .. until their own results arrive. Selected-store address or approximate GPS, five-minute cache, strict product/variant/size checks and explicit stock-evidence labels. Listings are not a guaranteed retailer inventory feed.
- Six news sources are connected: Harvard Nutrition Source, Tufts Now, NIH Research Matters, EatingWell, Clean Eating and ScienceDaily. The active 02:00 Eastern schedule now enforces a seven-day freshness limit. Backend selection uses only useful news-interest fields from My Needs; missing/non-specific details request general news. 23 current candidates were verified. Source/backend work is deployed; the new mobile request, controls and privacy copy are delivered in build 15. Clean Eating returned no current items. [DEV-30 implementation and evidence](69-daily-personalized-food-news.md).
- **API spending is user-managed; no internal dollar cutoff.** The previous reservation totals were arbitrary admission bookkeeping, not measured billing or account balances. October 18: new records contain attempt counts only; old records remain intact. Locking, protected ledger validation, request-rate/concurrency limits, timeouts and no automatic paid retries remain. No provider billing figure has been independently verified; the user reports the OpenAI dashboard last showed four cents. Both v3 and consented v4 are available. Evidence: artifacts/user-managed-budget-2026-10-18/verification.json.

## Verification completed

- Latest increment (DEV-29): **531 core/service tests**, nine tooling, ten adapters, 52 existing screen scenarios in both timing modes, My Needs and ten new shelf screen scenarios pass. Typecheck/lint, iOS export/native compilation and signed-package inspection pass. One attributed 16-cell live grid completed in 15.387 seconds; nine identity disagreements remained unrated. Backend public checks pass. Apple VALID and existing owner TestFlight access are verified. Physical acceptance remains unverified. [Evidence](68-shelf-grid16-release.md).

- Prior increment (DEV-28): **517 core/service tests**, nine tooling tests, ten adapters, 52 screen scenarios in both timing modes, typecheck/lint and iOS JavaScript export pass. Live Serper fallback and deployed primary/cache/compatibility checks pass. Build 13 native/IPA checks, Apple VALID and owner TestFlight access also pass. [Evidence](66-serper-shopping-fallback.md).

- Earlier dual-review increment (DEV-25, delivered in build 11): **503 core/service tests**, nine tooling, ten adapters and 51 production-screen scenarios pass, with both timing modes checked, typecheck/lint and iOS JavaScript export. Two-model live HTTPS streaming passes; final identity-guard replay returns three alternatives after rejecting an invented brand/product pairing. Final backend correction deployed; old v3 remains available. Native release is delivered; physical acceptance remains pending. [Evidence and limitations](63-dual-model-review-preparation.md).
- Build 10 release checks: **487 core/service tests**, nine tooling tests, ten input-adapter tests, 47 component scenarios with timing on/off, My Needs checks, four news-operator tests, typecheck/lint and iOS JavaScript export pass. Native compilation, signed-package inspection and Apple owner access verified. Existing live backend evidence is retained; no additional model/search calls, deployment or OTA update were needed. Physical timing/accuracy remain unverified; existing Expo patch-version warning and upstream advisories remain tracked. [Current evidence](61-build10-sodium-and-nearby-stores.md).
- Three Android geometry/planner unit tests and two emulator instrumentation tests pass. Both shelf models execute on four attributed fixtures; bundled OCR reads a fictional package.
- Eight Python operator/provenance/budget/resume tests and seven guidance archive checks pass.
- Android arm64 phone and x86_64 emulator release packages built and verified against source. Emulator installation/startup passes; crash buffer empty. No physical phone claim.
- iOS project preparation and Android/iOS/web JavaScript export pass. The subsequent Mac build compiled Swift successfully; its first launch exposed an iOS 27 scene-lifecycle requirement. A reproducible Expo config-plugin correction now passes native compilation, initial-screen rendering and restart checks. No agreement was accepted by the agent. Subsequent Personal Team signing and physical installation/startup passed; the broader feature acceptance remains open.
- Live HTTPS key-free capabilities, enriched export, legacy compatibility, news/ETag and portfolio HTTP 200 checked. Project backend ports remain loopback-only; inspected key files are 0600.
- Interactive browser walkthrough was rejected by automatic approval review (“blocked by policy”). It was not bypassed or reported as passed.

Detailed evidence and artifact checksums: [independent development checkpoint](37-independent-development-checkpoint.md).

## Faster results, reference photos and source toggle - FB-25/26

**Implemented, verified and available in TestFlight build 6.** The original validated card now arrives before the complete review, followed by up to three validated alternatives. Deployed HTTPS fixture: original **2.9 s**, three alternatives **6.0 s**, completion **8.4 s**. Recognition model/image detail/full nutrients and all nutrition/dietary checks are retained. Full request duration is approximately unchanged; physical phone speed/accuracy is not yet measured.

Public reference-photo searches now use the working OFF search API, queue instead of dropping concurrent cards, and reuse 30-day public metadata. Matched Shredded Wheat, muesli and Cheerios images were verified. No fixed 8/16-second client waits; 38 public records cached at this checkpoint. Source details toggle open/closed and reopen without refetching. Accurate native OCR overlaps independent preparation; its physical speed benefit remains unmeasured.

**Checks:** 422 core/service tests, seven tooling tests, ten input-adapter tests and 27 production-component scenarios; typecheck/lint pass. Five bounded public-image model requests used for latency/HTTPS verification; no user image retained. [Implementation and measurements](51-faster-photo-results-and-images.md).

## Independent engineering follow-up — scan consistency (FB-36)

- [ ] Stabilize category assignment and nutrient-evidence handling across repeat scans of the same product/formulation. Frozen waffles must not silently use breakfast-cereal comparison policy.
- [ ] Handle eligible Neutral / Not healthy results where the model proposes no alternatives or too few candidates survive validation. Preserve the original result, distinguish no candidates from all candidates rejected, and design a bounded recovery path under the existing nutrition/dietary and cost limits.
- [ ] Add regression cases for empty proposals, category drift, conflicting estimates, partial-stream completion, no duplicate originals, and category-appropriate alternatives.
- [ ] Revalidate candidate quality before considering reuse; a previously accepted model estimate is not verified label evidence. Do not introduce automatic paid retries without resolving the existing dispatch policy. Provider spending is managed by the user.

Read-only diagnostic review confirmed this behavior. No product identities, raw scan records, images, personal data or full model responses are copied into this plan. This is an engineering gap, not an account dependency. No implementation/release change is claimed by this checkpoint.

## Store-aware alternative selection — FB-37

**Requested behavior; not implemented.** Prefer nutritionally suitable alternatives associated with the selected grocery chain, and give supported listings at the selected branch precedence. A nearby competing retailer must not become the default solely because it has a discoverable listing.

Current gap: recognition/alternative generation receives no selected-store context. Availability runs afterward, querying for the proposed product near the selected store's address and sorting by evidence strength; it does not choose an alternative stocked by that chain.

- [ ] Use the selected store/chain at the candidate-generation stage, not only for the later availability search. Resolve context from the existing selected-store flow; do not assume the scanned product's brand identifies the current store.
- [ ] Implement the user's proposed closest-store tie-breaker only among nutritionally comparable passing alternatives within ±3%; resolve selected-branch evidence without delaying initial food display. This ranking is not implemented by DEV-25's estimate-disagreement notice.
- [ ] Prefer same-chain alternatives that pass the existing category, leading-concern, equal-quantity, nutrient and dietary checks. Being associated with a store cannot make an unsuitable product eligible.
- [ ] Separate current-store options from alternatives elsewhere. When same-store evidence is missing, explain that limitation and retain useful other-store options instead of implying nothing suitable exists.
- [ ] Prioritize evidence for the selected branch in the availability result without turning a chain product page, brand name, nearby listing or LLM belief into confirmed branch stock.
- [ ] Keep context limited to the public chain needed for suggestions; preserve location/profile/lab privacy boundaries. Any contract/consent-copy change needs matching client/backend validation, old-client compatibility and cache isolation across selected-store changes.
- [ ] Test same-chain candidate preference, missing coverage, branch uncertainty, store switching, cache separation, no eligible same-store choices and concurrent listing completion.

No new retailer inventory access is supplied by this preference. Guaranteed stock remains DEP-05. Build 10 and deployed behavior remain unchanged in this documentation checkpoint.

## Remaining work and exact dependencies

DEV-25 dual review and DEV-28 Serper are delivered. DEV-29 shelf implementation and native packaging are complete; build 14 is available to the existing owner TestFlight group. No new account input is needed. FB-36/37 remain separate open refinements.

| ID | Remaining work | Needed to proceed |
|---|---|---|
| DEP-01 | Distribute to approved additional testers | Owner access through build 14 confirmed. Additional testers require authorization and applicable external Beta App Review; no backend key is needed |
| DEP-02 | Install the latest delivered build and check home, normal-photo dual review, source toggles, nearby search, news/My Needs and the new shelf flow: small final batch, repeated panning, same-brand variants, facts/photos, leading choices, outside alternatives, interruption and memory/heat | TestFlight owner access is verified for build 14. Hands-on accuracy/performance acceptance requires the owner's iPhone |
| DEP-03 | Personalized medical recommendations, report interpretation and production clinical rules across supported conditions/pregnancy/overlaps | Qualified clinician/dietitian review of rules, applicability, thresholds and reference cases. Educational comparisons continue without this |
| DEP-04 | Production verified dietary matches and exact formulation claims | Current exact-product manufacturer/certifier evidence, permitted reuse and accountable reviewer/authority scope. Gluten-free acceptance policy is already resolved |
| DEP-05 | Guaranteed branch inventory via authorized retailer feeds | Retailer/aggregator permission and a feed covering intended chains/branches. DEV-23 now supplies Google-reported product stock/pickup and clearly labeled unconfirmed listings; it does not guarantee retailer inventory |
| DEP-06 | Deferred shelf-model licensing/source-publication decision; specialized measured FODMAP claims | User explicitly retained both detectors and deferred permissions for the private beta on October 16. This records the user decision, not legal clearance. Resolve model/code/data terms for the eventual release approach; publishing source is undecided. FODMAP claims still need permitted specialist data |
| DEP-07 | Declare measured retailer coverage and release acceptance | Actual branch/product evaluation baskets, tester results and approved pass criteria; template currently has zero physical observations |
| DEP-08 | Close upstream dependency advisories and refresh unavailable map data | Patched upstream releases / provider availability. Current audit: 22 paths (19 high, three moderate); decoder mitigation tested, braces/node-forge unresolved. This does not require buying another account |

The current phase is physical acceptance of delivered build 14, including the new shelf grids and retained home/dual-review/Serper features. DEP-09's independent engineering is complete; its remaining physical acceptance is consolidated into DEP-02. Sodium explanations and nearby-store UI are already delivered; those older packaging items are resolved. Key delivery/activation are resolved. Mandatory timing removal before Beta 1, DEV-30 physical phone acceptance, other proposed publishers and the separate catalog backlog remain open.

## Resolved inputs — do not reopen as blockers

USDA key; OFF form/contact/ODbL reuse decision; OpenAI project/key/credits (spending managed by the user; artificial internal dollar cutoff removed October 18); Anthropic key, exact claude-haiku-5-5 access and successful live vision inference; secure grocery.serveforwad.com backend; chosen OSM location provider; accepted default OpenAI retention for the bounded report route; verified certification OR manufacturer gluten-free policy; three-iPhone tester scope; US-only initial testing; explicit retention of both shelf detectors with the licensing decision deferred. Apple Developer membership activation is reported by the user; App Store Connect Apps access is confirmed by the user. The first physical iPhone, USB pairing, Developer Mode and developer trust are resolved. Paid-team distribution signing and native EAS compilation are verified; the Mac remains off and is not needed for this cloud route. No zero-retention purchase is required by the current report design.

## Approved scope and presentation

- Keep laptop as interface; code/build/backend work stays on project-server. Preserve portfolio services.
- Keep source media transient; no backend photo storage. User-authorized private beta product-decision diagnostics now retain bounded product estimates and decision codes for up to seven days / 2,000 events; see [diagnostics](52-beta-decision-diagnostics.md). Installed build-10 product AI scans retain their OpenAI-only consent. Builds 11 onward request fresh consent for sending the same resized, EXIF-stripped photo through the backend to OpenAI and Anthropic in parallel. No profile/lab/location is supplied to either review; product-name-only USDA requests may follow. Shelf, barcode and nutrient-table paths retain their existing local processing. Medical recommendations remain disabled until qualified review.
- Preserve nutrition, dietary, exact-variant and freshness requirements. Unknown stock/certification remains unknown.
- Normal product photos open the LLM-identified product automatically. Each original/alternative card owns its thumbnail, general estimate rating, 1–3 short reasons, compact 1× portion note, Food Facts and optional source check. Neutral/red originals can show up to three distinct alternatives that pass comparable-use and equal-weight nutrient checks. Uncertain identity and inconsistent amounts withhold favorable ratings. Alternative disagreements now use the reviewed reconciliation policy: calculated green/model neutral can proceed, calculated neutral retains yellow, and red/missing signals remain excluded. Dietary suitability requires package evidence; personal medical recommendations stay disabled. Estimated facts are not presented as verified label measurements. Accepted layout uses vertically scrolling cards.
- Branding remains open. Retain “Your Health & Grocery Companion,” bold introductory copy, lively colors, compact ingredients, small 1× portion note and up to three inline scrollable alternatives.
- The October 6 deadline was explicitly removed.
- Final iPhone aesthetics are revisited during device testing; no fabricated test results or clinical/competition endorsements.

## Related current documents

- [Source connection table and operator workflow](25-section11-sources-and-dependencies.md)
- [Requirement traceability](05-requirement-traceability.md)
- [Development and verification evidence](37-independent-development-checkpoint.md)
- [Beta acceptance and competition demo](38-beta-acceptance-and-demo.md)
- [Mac/iPhone setup](39-mac-iphone-setup.md)
- [First native Mac build and crash correction](40-first-mac-iphone-build.md)
- [Prior AI photo checkpoint](42-ai-product-photo.md)
- [Prior database-verified AI ratings](43-verified-ai-photo-ratings.md)
- [Current LLM-first product cards and combined release](49-approved-cards-and-home-release.md)
- [TestFlight release and encryption decision](45-testflight-release-and-encryption.md)

## Checkpoint

October 14–15: reconciled the old plan, completed DEV-01 through DEV-08 to the documented dependency boundaries, preserved historical evidence, and prepared updated source-matched artifacts. October 15 follow-up: user reports macOS 27 and Xcode 27 on the M2 Mac. Dedicated laptop SSH access now works at developer@192.168.50.10. The prepared 451-file source archive was transferred and verified on the Mac. The first native Swift checks exposed missing explicit CoreGraphics imports; these were corrected in authoritative server source and copied to the Mac. 32 geometry cases, five pixel fixtures and 33 planner/text checks now pass. The first simulator app compiled, but failed at launch because iOS 27 requires a scene lifecycle. A config plugin now selects Expo’s bundled scene delegate, preserves deep links and delays the React window until private-storage setup finishes. Seven tooling checks, lint and typecheck pass. Native simulator rebuild, visual initial-screen verification and restart pass; unsigned physical-device compilation also passes. App Store Connect remains pending, which does not prevent initial local development/testing.

## October 15 physical iPhone installation checkpoint

The Mac is reachable at developer@192.168.50.10 with the same verified SSH host key. The connected phone is an iPhone 16 running iOS 27.0.1. USB pairing, Developer Mode and the on-phone developer trust confirmation are complete.

The Release app was signed using the existing Personal Team, installed successfully and launched. Its signature, artifact hashes, exact bundle identifier and provisioning coverage for this phone were verified. The same process remained running after 15 seconds, and the user confirmed the “Before we begin” screen. No app agreement was accepted by the agent, and no full physical-feature acceptance is claimed.

The Personal Team provisioning expires on **October 22, 2026 at 10:50 p.m. America/New_York**. Re-sign/reinstall before continuing tests after expiry. This is a local personal-device installation, not TestFlight distribution. Apple account approval was handled in the Mac's logged-in desktop session; no passwords or private signing keys were copied into the project.

Evidence: artifacts/mac-build/phone-desktop-signing.json, phone-install-verification.json, phone-installed-app.json, phone-launch-trusted.json and phone-running-process.json. Full build log and signed app remain in artifacts/mac on the Mac.

## October 15 phone-feedback update

Implemented and installed on the connected iPhone:

- Optional Gender next to age: Female, Male, Non-binary and Prefer not to say. Existing profiles remain readable. Gender stays in the local profile/encrypted backup; it does not infer pregnancy or change clinical thresholds.
- Primary Health Concern includes General Fitness and No Concern. New onboarding starts without an assumed disease. General Fitness preserves explicitly selected conditions; No Concern requires removing selected health conditions rather than silently overriding them. Dietary preferences remain independent. General-only shelf views show factual equal-weight comparisons without assigning a medical or weight-loss ranking; existing pregnancy, dietary, evidence and clinical gates remain.
- Removed the repeated location paragraph and routine home-screen location status. The existing automatic-location preference persists across restart/export/restore and foreground permission is reused. Background tracking stays off. Manual selection and permission settings remain available; failed preference saves are reported.
- Choosing a store returns immediately to the previous screen, with home as the fallback if the chooser was opened directly. Automatic detection does not dismiss a chooser opened to correct the store; the detected-store card has the same one-tap confirmation.
- Northborough Wegmans displays **9102 Shops Way, Northborough, MA 01532**, verified against its [official store page](https://www.wegmans.com/stores/northborough-ma). The OSM record lists neighboring building numbers. A narrowly scoped display correction preserves original map evidence and does not guess addresses for unrelated stores.

Verification: typecheck and lint pass; **331 app/core/service + 7 tooling + 10 report-adapter tests pass**. Five added regressions cover legacy profiles, gender, wellness compatibility and preserved safety checks, encrypted export/restart/location preferences, and branch-specific address correction. Signed Release rebuild, source/artifact hashes, device provisioning, signature verification, update installation and launch pass. The same process remained running on the phone. The user explicitly confirmed that store selection returns to the previous screen and that the Wegmans address shows one main number. Other new profile controls still await hands-on user feedback; full device acceptance is not claimed.

Source SHA-256: `3ff9299a86c34ea31eb2ec30b49120d6e23a1eba927e6f44ac2b9fa0e5479672`. Signed app tree SHA-256: `0304da9fa9dd10353924163bc6e13a9f3e135cf8a30f64ad16a6ebd2966cdb25`. Evidence: `artifacts/phone-feedback-2026-10-15/check.log` and the mirrored signing/install/launch records in the same directory. Earlier build evidence remains archived. The existing provisioning expiry remains October 22 at 10:50 p.m. Eastern. No new paid API calls, backend personal-data storage or portfolio changes.

## Active priority — normal product AI first, Shelf Camera design next (October 16)

The old local-OCR suggestion flow is superseded for normal AI product scans. The user confirmed the food-facts screen opens; the complaint is inaccurate recognition and overly academic result content, not a reproduced navigation crash. DEV-11 replaces normal recognition with GPT-6 Luna, opens the best matching public record automatically, and moves educational detail behind Details. Missing nutrition is not generated by the model. A known product with no suitable source record offers Nutrition Facts scanning or retry. Shelf AI transfer/batching is deliberately deferred until discussed with the user. See [current implementation and acceptance](42-ai-product-photo.md).

Photo checkpoint: signed Release build, matching source/artifact hashes, signature/provisioning validation and physical iPhone update installation pass. The phone was locked, so automated launch was denied by iOS; no camera/runtime acceptance is claimed. The user has been asked to unlock/open the app and test the first product photo. Evidence: `artifacts/photo-camera-2026-10-15/`; detailed checks and limitations: [photo-first camera acceptance](41-photo-first-camera.md).

## October 16 photo-feedback correction

The first physical photo did not crash, but failed with a misleading lighting message. Reproduced this failure in native tilted/cropped fixtures: out-of-bounds text rectangles rejected otherwise readable OCR. Clip rectangles to the image, reject non-finite/empty boxes, and retain the strict schema. Before: 13/15 fixture pages rejected; after: 0/15. Distinct P1/P2/P3/N1 messages replace the catch-all without recording image/OCR/exception contents.

The corrected signed build is installed and launched on the connected iPhone; a later app-running check passed. 356 automated tests, the original 19 native reader checks and 15 new edge cases pass. The user retested and reported “It shows product suggestions.” The previous processing error did not recur on this scan. Historical check at this point: exact-product accuracy, facts navigation and shelf acceptance were open; later user feedback confirmed navigation and prompted DEV-11. Broader physical acceptance remains open; the earlier phone-lock launch blocker is resolved. Detailed evidence: [photo-first camera acceptance](41-photo-first-camera.md), `artifacts/photo-fix-2026-10-16/`.

### October 16 — photo retest received

User-reported result on the corrected installed build: **“It shows product suggestions.”** Mark photo capture → processing → candidate display as observed working for this test. Subsequent user feedback confirmed a correct suggestion and that a new facts screen opens, but criticized content and overall recognition. DEV-11 supersedes the mandatory confirmation step. The current next check is the new automatic AI flow after native build/install; Shelf Camera acceptance remains separate.

## October 16 — AI photo and concise-result checkpoint

- GPT-6 Luna identifies one package from one orientation-correct, resized JPEG (maximum 1,600 px / 1 MiB). Metadata is removed on phone and server. No raw image files or result cache are created by this feature. OpenAI default API retention may apply; the one-time photo consent explains this separately from report consent.
- Automatically opens the best catalog match. Brand, product terms, visible flavor and printed size inform matching. Uncertainty is visible, with a correction path. The model never supplies nutrition, certifications, medical conclusions or stock.
- Prefer current cached USDA facts; otherwise search USDA branded foods and fetch up to three matching US records in a bounded two-request lookup. Cache only normalized public facts. Fall back to matching existing public records on source failure. Unknown nutrients stay unknown.
- Main product screen: short general label takeaway, 1–3 reasons, small 1× portion note, inline alternatives. Sources, ingredients and detailed education remain available under Details. Nutrition/freshness/dietary gates are preserved; personalized medical recommendations remain disabled.
- Server checks, production iOS JavaScript export and synthetic HTTPS end-to-end validation pass. The new full native app has not been built or installed. The user switched off the Mac and explicitly asked to continue without it; do not reconnect until the user makes it available. Previously run native helper tests passed before it went offline.
- Only the project’s beta backend was restarted. Portfolio service remains running; its external HTTP endpoint returned 403 during these checks, so public portfolio reachability is not certified by this checkpoint.

Evidence and exact pending device steps: [AI photo checkpoint](42-ai-product-photo.md). The laptop plan is mirrored from the authoritative server; Mac documentation mirroring waits for the Mac.

## October 16 — DEV-12 verified AI ratings checkpoint

Normal-photo processing now uses two bounded GPT-6 Luna stages. The first sees the photo, with no catalog clues or user health data, and independently identifies the package and proposes up to three candidates. The backend checks exact identities and refreshes public source facts. The second sees verified one-portion amounts and exact numeric threshold checks, then returns the rating and terse reason codes. The server independently checks that response; unsupported or conflicting judgments do not receive a color.

Live validation exposed two issues that were fixed: the model confused per-100-g values with serving amounts, and manufacturer/consumer-brand naming prevented some cereal lookups. The final public HTTPS cereal case returns a red Honey Nut Cheerios rating and a green plain-Cheerios alternative with less total/added sugar. Exact package ranking takes priority over nutrient completeness, and comparisons use equal weight so tiny alternative serving sizes cannot manufacture a green recommendation. Source images are optional and attributed; failed/missing images use a package icon.

The general-label rubric is explicit and versioned; it is not clinically reviewed or personalized. No profile, age, location or lab values are included. Existing dietary restrictions still apply on the phone, and incomplete certification evidence cannot earn a green medical-suitability message. Existing report consent/privacy gates remain separate.

DEV-12 engineering reached the native-build/device boundary. Apple activation subsequently enables cloud compilation; see the next checkpoint. Source archive, source hash, current test evidence and actual coverage limits are in [DEV-12](43-verified-ai-photo-ratings.md). The laptop plan is mirrored from the authoritative server. Older October 16 sections above describe historical checkpoints and do not replace DEV-12.

## October 16 — signed cloud build and TestFlight upload

- Paid team **A9Q6Z8Y58M**, bundle **org.cac.healthgrocery.beta0**, app **6823645787** and upload credentials are verified.
- Signed native build **0.1.0 (1)** completed at 14:18:27 UTC. [Build dashboard](https://expo.dev/accounts/buldygaur/projects/grocery-app-preview/builds/7e715d3d-8968-450e-9cd4-4bfc2a294be8). Package checks passed; full code-signature/Apple issuer-chain validation were not performed locally on Linux.
- User decision: **retain both shelf detectors**, defer model permissions, and leave source publication undecided. Licensing is recorded as deferred, not granted or cleared.
- US-only initial beta confirmed. Standard SQLCipher/AES encryption is inventoried. Apple's published documentation and declaration API indicate no encryption-document record for this scope; future Expo Info.plist resolves to **ITSAppUsesNonExemptEncryption=false**, preserving encryption. The existing build now reports **usesNonExemptEncryption=false**, verified through App Store Connect; its missing-compliance status is cleared.
- Submitted the exact retained IPA once, at 15:07:05 UTC. [Submission](https://expo.dev/accounts/buldygaur/projects/grocery-app-preview/submissions/e95b2ae3-5ba2-419c-a343-82fb173c593f). Upload job **FINISHED** at 11:25 a.m. Eastern on October 16. Apple processing is **VALID**. At 11:56 a.m. Eastern, the verified build became **READY_FOR_BETA_TESTING** internally and **READY_FOR_BETA_SUBMISSION** externally. The existing build now reports **usesNonExemptEncryption=false**, verified through App Store Connect; its missing-compliance status is cleared.
- The upload completed despite the earlier reported submission incident. No duplicate upload, public release or completed phone installation is claimed. The owner invitation was subsequently sent at the explicit request recorded below.
- Configuration verification, workspace typecheck and mobile lint pass. IPA SHA-256 remains **f0727c9c880725973797c5b886f6d633508c750f5e07ed3419c9f51efae34b12**. Both detector resources remain included.

Evidence: `artifacts/testflight-release-2026-10-16/` and [release/encryption decision](45-testflight-release-and-encryption.md). No API spend, public source publication, new paid plan, Mac connection or portfolio service change. The existing Personal Team phone installation still expires October 22 at 10:50 p.m. Eastern and has not been replaced.

## October 16 — evening testing and concurrent enhancements

The user plans to test this evening and has started enhancements in a separate chat. Continue only the existing TestFlight submission for build 0.1.0 (1); its fixed IPA cannot be changed by later source edits. The release follow-up must not modify or deploy app/backend source, rebuild, publish an OTA update, or overwrite concurrent plan changes. Shared-backend changes can still affect runtime behavior and need compatibility with this build. The quiet follow-up verified completed upload/processing and the reviewed encryption answer at 11:56 a.m. Eastern, then was deleted after preparing the owner handoff. Owner setup and invitation are now complete; invitation acceptance and actual installation remain pending. See [evening handoff and installation steps](46-testflight-evening-handoff.md).


## October 16 — My Needs feedback FB-01–08 (separate source checkpoint)

The authorized side-conversation feedback is implemented in source: save-success return home, obsolete footer removal, optional height/weight with US/metric units, encrypted local persistence/deletion, versioned CDC reference data on the backend, and an internal category that is never displayed. These are FB-01–06. Existing 21+ eligibility is retained; adult CDC thresholds do not require sex, and gender is not used as a substitute.

FB-07/08 have tested integration code for minimal, explicitly consented weight context in the verified-nutrition LLM stage. Activation is still blocked by the existing privacy and clinical-review gates on both client and server. It can prioritize verified reasons/alternative benefits, but cannot alter general color thresholds, prescribe targets or override dietary/nutrient checks. No personal weight context was uploaded, and no paid API test was run.

Verification: full typecheck/lint; 393 core/service, 7 tooling and 10 report-adapter tests; 14 existing photo-screen scenarios; new My Needs interaction checks for success/failure, persistence, units, validation, deletion and hidden category. Native/network boundaries are mocked. Evidence: `artifacts/needs-feedback-2026-10-16/`.

This increment did not change Apple/Expo credentials, signing/build settings or upload state, restart the backend, run a native build, publish an OTA update or install on a phone. The existing fixed TestFlight build 0.1.0 (1) does not include it. Remaining steps: include these edits in a subsequent build and perform physical acceptance; obtain qualified clinical/privacy review and explicit opt-in before activating weight-context transmission. Individual medical targets or personalized color rules remain unimplemented pending an approved policy.

Track status in [UI and Product Feedback](UIAndProductFeedback.md); implementation/source details are in [My Needs weight context](needs-weight-context.md). This checkpoint supplements the current release handoff without replacing its upload status.

## October 16 — owner TestFlight invitation sent

Owner group **Beta 0 - Owner Testing** is created, contains the verified account holder **owner@example.invalid** and build **0.1.0 (1)** only, and has automatic access to future builds disabled. Apple accepted the explicit invitation request (HTTP 201) on October 16, 2026 at 09:54 PM Eastern. Email delivery, invitation acceptance and phone installation are not yet verified. No other testers were invited.

Verified App Store Connect user identity/role, private internal group membership, exact build relationship and invitation response. Evidence: `artifacts/testflight-release-2026-10-16/owner-testflight-setup.json` and `owner-invitation-response.json`. App source, backend, signing, existing IPA and side-chat enhancements were not modified. The owner can now open the email on the iPhone, choose View in TestFlight, accept and install. See [installation steps](46-testflight-evening-handoff.md).

## October 16 — installed app: missing backend access handoff

User confirms installation through TestFlight and reports that Scan Your Product requests tester access. This is the separate application/backend access gate, not an Apple invitation or OpenAI key request. The TestFlight signing/team change also uses its own protected app storage; do not assume an earlier development installation's key is present.

Verified the existing tester-1 key privately against configured hashes and live HTTPS `/v2/photos/capabilities`: authenticated 200 with GPT-6 Luna available, unauthenticated 401. No key was printed, no product photo uploaded, no paid call made and no backend restarted. The owner has been asked whether to receive the separate private credential by email or retrieve it interactively on the laptop. Key delivery/entry and successful physical scanning remain open. Evidence: `artifacts/testflight-release-2026-10-16/owner-beta-access-check.json`.

## October 16 — side-chat changes required in the next release

The user explicitly requests that the next app update include the completed side-chat work. Verified all 21 files in the My Needs feedback manifest against the authoritative workspace: every checksum matches. The next numbered iPhone build must use this current workspace baseline, including FB-01–06 and the already-tested FB-07/08 integration with its privacy/clinical gates still closed. Do not rebuild from the older build-1 source archive.

Repeated validation on this shared baseline: typecheck/lint, 393 core/service tests, seven tooling tests, ten report-adapter tests, 14 photo-screen scenarios, and the My Needs UI checks all pass. Save-return behavior, measurements/units, persistence/deletion and removed footer are preserved. Tests use mocked native/network boundaries and do not establish physical phone acceptance. Evidence: `artifacts/needs-feedback-2026-10-16/release-inclusion-verification.json` and `integration-check.log`.

The key-free scan/copy change remains a draft, not applied or deployed. Automatic approval review rejected live removal of backend authentication because it exposes paid processing to anyone who knows the endpoint; the isolated test-preparation request was also declined. The earlier explicit deployment-confirmation question remains unanswered. No new native build, backend restart, key delivery, OTA update or paid model call occurred at this checkpoint. Once that deployment scope is resolved, merge the key-free changes onto this verified side-chat baseline, rerun both photo and My Needs checks, and verify the cloud build archive includes the combined source before submission.

## October 16 — key-free update with side-chat changes

The user explicitly approved key-free backend access after the exposure/spending explanation and required the side-chat changes. Both requirements are implemented together. Build **0.1.0 (3)** is **available to the existing owner internal TestFlight group**; EAS ID `fa892bb8-fd30-41dc-b2a1-78e2cea45b12`. Existing fixed build 1 is unaffected and needs a TestFlight update to remove its local key panel.

Verification: 397 core/service + 7 tooling + 10 report-adapter tests, 16 photo scenarios, My Needs checks, typecheck/lint, EAS archive/source/side-chat verification and live HTTPS without credentials pass. No paid model calls; ledger remains $0.36 reserved. Existing $2 budget, consent, request limits, dietary checks and clinical/privacy gates remain. Only the beta backend was restarted; portfolio service remained active. No new testers or credentials were sent.

Details, artifact state, limitations and next phone checks: [key-free Beta 0 update](47-key-free-beta-update.md). Historical key-handoff and blocked-approval entries above are superseded by this checkpoint, not current pending items.


## October 16 home layout and daily-news request

The user requested Berry & Citrus purple/lime styling, only **Scan Your Product** (automatic front/barcode/nutrition-panel detection) and **Shelf Camera**, plus five linked healthy-food news items prepared on the backend nightly at **02:00 America/New_York**. The interactive layout preview is complete. Automatic scan routing, news ingestion/selection, backend storage/API, scheduled refresh and native integration **remain pending**; no timer or new native build was started for this preview. See [home/news implementation requirements and FB-09–15](feedback-home-news-design.md). The dated preview articles are examples, not a live top-five edition. Provider recommendation: direct publisher feeds/authorized search; a Google route should use documented search grounding after credentials, budget and display/caching terms are verified.


## Enhancement tracking continuity — October 16, 2026

Maintain the [ongoing enhancement register](UIAndProductFeedback.md#ongoing-enhancement-register--october-16-2026) as feedback arrives. FB-09–15 capture the latest color, compact-camera, automatic-input and daily-news requests. Preview-only, implemented, verified and included-in-build states must remain distinct. This documentation checkpoint does not change their pending implementation status.

## Product-photo improvements — current requested work (October 16)

Record and execute FB-16–22 without overwriting the side-chat FB-09–15 home/news work. The user explicitly requested an image before another upload. The [product-card preview and enhancement specification](48-product-photo-enhancements.md) are complete; app/API implementation, reliability fixes, optional source checks and native acceptance remain pending. No new build, upload, backend deployment or paid model call was performed for the preview.

Investigated current whole-response rejection, three-candidate ceiling, missing original thumbnail and confusing parent-card Details placement. These are source findings, not proof of the exact two user failures. Preserve real source provenance and distinguish LLM estimates, unknowns and mismatches. Personalized medical recommendations remain disabled; the $2 testing budget is unchanged.


## October 16 — Approved combined cards/home release (FB-09–22)

The user approved the preview and authorized implementation and TestFlight upload. [Release checkpoint](49-approved-cards-and-home-release.md) supersedes the preview-only status of FB-09–22 above. New `/v3/photos/recognize` uses one GPT-6 Luna request with no profile/lab transmission, returns clearly labeled estimates and retains up to three suitable distinct alternatives. One bad alternative no longer discards the original. Source checks and photos stay inside individual cards. Existing v1/v2 clients remain compatible. Source photo search is bounded and can return an honest placeholder when OFF is unavailable.

Four public-image live checks completed; the final two each returned three alternatives in about seven seconds. Lifetime AI reservations are $0.60/30 dispatches, not billed cost. The $2 limit remains unchanged. 408 core/service tests, seven tooling tests, ten report-adapter tests, 23 photo/home component scenarios, My Needs checks and four news-operator tests pass. Native compile/upload and physical acceptance are tracked separately.


## October 16 - additional approved news publishers

Extend FB-12 with the user's requested **Harvard The Nutrition Source, EatingWell and Clean Eating**. The Nutrition Source is already configured in ops/refresh-food-news.py; avoid duplicate ingestion. EatingWell and Clean Eating remain to be connected after verifying a suitable collection method and permitted metadata use. Preserve publisher links/dates, exclude promotional or unsupported claims, and distinguish evergreen guides from current news. Validate both adapters and failure preservation before deployment.

The proposed 30-50 candidate pool is not a measured daily article count. The desired 24-hour/seven-day discovery window and quality/diversity ranking also need reconciliation with the current collector's 90-day recency selection. Details: [news-source enhancement](feedback-home-news-design.md#additional-news-sources-requested-october-16-2026). This checkpoint changes documentation only; the combined home/cards release and its build/upload remain owned by the active release session.


## October 16 - audience tailored news backlog FB-23

**Superseded October 18:** DEV-30 implements backend selection as explicitly requested, replacing this earlier phone-selection proposal. Source/backend work is deployed; native inclusion and phone acceptance remain. [DEV-30 implementation and evidence](69-daily-personalized-food-news.md).

**To Do - documentation only.** Use relevant saved My Needs interests, health concerns, General Fitness/No Concern and dietary preferences to select more useful food stories. Preserve variety, source quality and freshness; this is educational content relevance, not individualized treatment advice.

- [ ] Define article topic/audience tags and a versioned relevance/diversity policy.
- [ ] Expand the nightly shared cache to an eligible candidate pool while preserving the current general top-five edition and API compatibility.
- [ ] Select five stories on the phone from that shared pool using saved preferences; re-rank after profile changes and provide an option to use general news.
- [ ] Keep personal/health data out of news-provider, search and publisher requests; retain existing privacy and clinical gates.
- [ ] Verify profile variants, opt-out/deletion, insufficient candidates, date/quality checks, offline behavior and absence of profile data in network requests/logs.

See [FB-23 specification and acceptance tasks](feedback-home-news-design.md#fb-23-audience-tailored-food-news). No implementation or build/deployment changes were made for this request.


## October 16 - consolidated news source register

The [news source register](feedback-home-news-design.md#news-source-register) documents all nine discussed publisher collections and separates the three configured collections from pending additions. It also records optional search services, editorial relevance, publication-date checks and per-source collection/metadata-use verification. Connect and validate the pending sources under FB-12; implement audience tailoring separately under FB-23. This checkpoint is documentation only.


## Quiet photo capture - October 17, 2026 side conversation

Shutter-sound suppression is implemented in the native still-photo path using Apple's supported iOS 18+ capability check. Mobile typecheck/lint pass. **Included in build 7; native compilation passed. Physical shutter behavior remains pending.** No build, deployment or release configuration changed in this side conversation. See the quiet-photo-capture entry in [UI feedback](UIAndProductFeedback.md).


## October 17 — private beta decision logging (DEV-17 / FB-27)

Implemented, verified and enabled on the beta backend. New normal-photo requests record the prompt/model/rule version, product nutrient estimates, displayed/model/calculated ratings, candidate selection/rejection reasons, timing/errors and reference-photo/source-check outcomes. Seven-day / 2,000-event private retention; no raw photos, OCR, personal health data, credentials, IPs or public log endpoint. Existing TestFlight build 6 works without an update. This supersedes historical no-result-log statements while preserving transient photo handling and medical/privacy gates.

Verification: 429 core/service tests + seven tooling + ten adapters + 27 component scenarios, typecheck/lint; 12,000 deterministic comparisons prove unchanged rating/benefit outputs. Live HTTPS request/image logging and file permissions verified; portfolio HTTP 200; zero paid model calls. [Scope, operator instructions and limitations](52-beta-decision-diagnostics.md).

Remaining follow-up: inspect a fresh Land O Lakes scan, since the earlier result was not retained; evaluate category-aware alternatives without weakening nutrient/dietary checks (implemented for spreads, tomato sauces and cereals in DEV-18 below). At this historical logging checkpoint, the universal fiber/protein green requirement could reject an otherwise improved spread. DEV-18 below now separates relative eligibility from absolute green ratings. Backend logs cannot prove successful phone image rendering; a future native diagnostic/privacy-copy update can address that and exact cross-request correlation. Disclose short-lived product-diagnostics retention before adding testers. Side-chat work is preserved; no new build/upload was performed for this backend-only change.


## FB-28 Temporary Beta 0 scan timing - October 17, 2026

Implemented numeric-only phone/server timing correlation with bounded, best-effort reports and a read-only operator summary. Local checks pass: 440 core/service tests, nine tooling tests, ten adapter tests, 28 screen scenarios in both timing modes, typecheck/lint and iOS JavaScript export. Existing release remains build 6; this side conversation did not deploy, build or upload a replacement.

- [ ] Backend deployed with DEV-18; native compilation, artifact inclusion and owner TestFlight delivery completed in build 7. Physical scan measurements still require the owner's update and use.
- [ ] **Before Beta 1: remove temporary timing instrumentation, its endpoint/hooks and retained timing data; verify no timing requests in the release.** EAS release guard blocks non-Beta-0 builds until the temporary code is removed.

[Detailed implementation, limits and Beta 1 removal checklist](53-beta0-scan-timing.md).


## October 17 — category-aware alternatives complete (DEV-18 / FB-29)

Implemented and deployed the user-approved relative comparison and rating-disagreement changes. Green calculated/neutral model alternatives proceed through remaining checks. Improved neutral spreads, tomato-based sauces and cereals can qualify without an absolute protein/fiber minimum, retaining yellow ratings. Equal-weight protein/fiber cannot fall; existing missing-data, identity, category, trans-fat/red, sugar/sodium/saturated-fat, calorie and duplicate guards remain. Select up to three suitable distinct candidates; no padding or medical-suitability claim.

Verification: 454 core/service tests, nine tooling tests, ten adapter tests, 31 component scenarios in both timing modes, typecheck/lint; frozen build-6 compatibility; byte-for-byte unchanged absolute color functions; preserved side-chat timing/native sources. Three public live fixture calls completed under the $2 cap (total reservations $1.10, not actual billed cost). Deployed comparisons pass all applicable checks; uncertain source-photo flavor still withholds alternatives. Portfolio HTTP 200. [Full policy, evidence and compatibility limits](54-category-relative-alternatives.md).

Build 6 receives the new candidates but uses its older helper for yellow-card text. The subsequent build 7 includes the corrected explanations and side-chat phone timing/quiet capture; compilation and TestFlight delivery are complete. Physical acceptance remains pending. The mandatory Beta 1 timing-removal task remains open. Clinical/privacy gates and private diagnostic retention remain unchanged.

FB-29 identifies alternatives; FB-28 remains the side-chat timing item. The original diagnostic-review pending items are resolved by this checkpoint. Remaining acceptance is a fresh scan after updating to build 7; no new account/key setup is required.


## October 17 — build 7 delivered to owner TestFlight

User authorized including the improved explanations and completed side-chat changes, testing, and TestFlight upload. Current source is the authoritative shared workspace, not an older snapshot. Scope includes yellow-card relative explanations, supported quiet capture, temporary Beta 0 timing, and an accurate short-lived diagnostics notice. Existing nutrition checks, personal-data gates, news/My Needs behavior and both shelf models are preserved. Automated checks, native compilation, artifact inspection and Apple delivery are complete; no installation is claimed. Evidence: `artifacts/iphone-build7-2026-10-17/`.

Verified release: EAS `fb02640c-903f-4a89-807c-aa58ec7f8d1e`; submission `03c51136-998b-45af-bb7a-0c5e8559d012`; Apple `a5b4a2a4-7c1f-47c6-9df0-2845ef54b372`. Version **0.1.0 (7)**, Apple **VALID / IN_BETA_TESTING**, attached only to the existing owner internal group. IPA SHA-256 `ad7f96849693a613d127fd31806f1f606fb8be45f02d211d8a314dd3ab720fd0`. No extra invitations, OTA update, backend restart or paid model request. Scope and physical checklist: [build 7](55-build7-alternatives-and-camera.md). The current release supersedes earlier next-build/pending-native entries for quiet capture, timing and yellow-card explanations.


## October 17 - app screenshots enabled in source (FB-30)

The user requested screenshots of the app. The startup privacy lifecycle now permits foreground screenshots/screen recording while retaining iOS app-switcher/background blur and existing temporary-file cleanup. This supersedes earlier blanket screenshot-blocking behavior. Workspace typecheck and mobile lint pass; native device acceptance remains pending.

- [x] Remove the screenshot restriction and document the change in [FB-30](UIAndProductFeedback.md#fb-30-enable-app-screenshots---october-17-2026).
- [x] Included in native build 8 and available in the existing owner TestFlight group.
- [ ] Verify a physical iPhone screenshot/screen recording and app-switcher privacy blur after updating.


## October 17 — original-concern explanations (DEV-20 / FB-31)

User feedback: alternatives to a sodium-flagged sauce should address sodium first, with sugar as a secondary benefit. Implemented concern-first comparisons and explanations. Existing >=25% plus absolute-floor qualification and nutrient/dietary guards remain; an additional check requires the leading concern to improve by >=10% and the existing absolute floor. A smaller factual leading reduction can be explained first only when another benefit still meets the unchanged overall qualification. Unresolved secondary concerns are explicitly stated. Prompt and private decision codes are updated without changing model/schema/budget or personal-data gates.

462 core/service tests, nine tooling tests, ten adapters and 33 production-component scenarios with timing on/off, typecheck/lint pass. Private response replay is read in memory only and confirms sodium-first explanations; no user photo or response record copied into artifacts. Backend deployed. The display helper and completed side-chat screenshot change (FB-30) are compiled and available in TestFlight build 8, preserving iOS app-switcher blur. Apple processing and owner group access are verified. No new paid model calls. Evidence: `artifacts/original-concern-2026-10-17/`.

Verified build-8 delivery: EAS `6f07d6e7-de94-47d5-b3ff-ca90740a4899`; submission `c7ab0835-a578-4995-85a7-806d71a10b94`; Apple `a2314ebd-afbc-4df4-9105-43ead0c0e74e` (**VALID / IN_BETA_TESTING**); IPA SHA-256 `b88d5a35311b1e6d1b73a6e323f385cf1b7f0024eff2a5bebb12db722184ff33`. Existing private owner group only, build-specific testing notes verified, no extra invitations or OTA update. Frozen archive hashes match the uploaded package. Newer side-chat preview edits remain intact in the workspace and are excluded from build 8. Backend correction deployed; no additional paid AI requests. Physical retest remains open.


## October 17 - compact response and early original-card preview (FB-32)

Implemented the user's approved latency suggestions 1 and 2: lossless compact AI output and an immediate captured-photo preview in the original product card, followed by the AI identity and then checked nutrition/rating. Existing nutrient/dietary/alternative rules, high-detail input, model and five-candidate pool are preserved. Older clients never receive unrecognized preview events. Source changes are separate from the frozen build 8 and do not alter its upload.

- [x] Implement compact decoding, strict opt-in identity streaming, original-card preview and cancellation/background cleanup.
- [x] Verify 468 core/service tests, nine tooling tests, ten adapters, 37 component scenarios with timing on/off, typecheck/lint and iOS JavaScript export.
- [x] Record the synthetic format reduction (40.3% fewer JSON bytes) and add separate numeric-only preview timings. This is not a measured speed or model-accuracy claim.
- [x] Bounded live prompt comparison and compatible backend integration completed in the release session; see [build 9](58-build9-early-product-preview.md).
- [x] Build 9 native compilation, signed IPA inspection and Apple owner TestFlight delivery verified.
- [ ] Physical iPhone preview/cleanup/speed acceptance after updating to build 9.
- [ ] Retain mandatory removal of all temporary timing hooks and reports before Beta 1, including the new preview marks.

See [FB-32 implementation and verification](57-compact-photo-preview.md). Other-model benchmarking was discussed as a follow-up, not executed.


## October 17 — build 9 early-preview delivery (DEV-21 / FB-32)

EAS `a7976665-5e48-442a-aee7-ab70982f9588`; submission `11218ffe-f0e1-4418-a844-0e63fe8b6d8b`; Apple `c0570076-deb0-454a-837a-f74d888efb00` (**VALID / IN_BETA_TESTING**). IPA SHA-256 `fac63cc0f5e1017017721da666aa37cce0efed17cda174a59c350e66aef78518`. Version **0.1.0 (9)** is attached only to the existing owner internal group; build-specific testing notes and encryption declaration verified. No additional invitations, OTA update or phone installation is claimed.

Combined source includes the completed early-preview side chat, current original-concern explanations and prior screenshots/timing/quiet capture/news/My Needs changes. Automated, six paired public-model and two deployed HTTPS compatibility checks pass; the backend is deployed. Native compilation and artifact markers verify inclusion. Eight calls reserved $0.16 within the existing $2 cap; no user photos/profile/lab inputs used. Earlier “source-only” or “next release” FB-32 checkpoints are superseded by this delivery. Physical acceptance and mandatory timing removal before Beta 1 remain pending. [Evidence and limitations](58-build9-early-product-preview.md).


## October 17 — sodium cutoff crossing (DEV-22 / FB-33)

User requested that lower-sodium Prego/Classico alternatives qualify below the high-sodium boundary. Implemented the narrowly scoped sodium exception, retained all other nutrient/dietary checks and absolute colors, and deployed the backend. Recorded-case replay now yields three alternatives instead of one. Build 9 accepts the added cards without an update; its local explanation fallback is a documented limit until the next native release includes the updated shared helper. 475 core/service tests and 39 screen checks pass; no paid model call, new native build or OTA update. [Full evidence](59-sodium-cutoff-alternatives.md). This supersedes the earlier claim that every sodium-led comparison requires a 10% / 40 mg improvement plus a separate 25% qualifying benefit.


## October 17 — nearby availability in parallel (DEV-23 / FB-34)

Implemented the user's side-conversation request: each displayed alternative starts its own store search immediately, concurrently with the other alternatives and without delaying existing product content. Each card shows **checking location ..** then its own stores/links. Three alternatives produce three requests, two produce two. Selected-store address takes precedence over rounded GPS. SerpApi's Google Ads response supplies sponsored and exact-product Local Stores results; unconfirmed stock/location and multipacks remain explicit.

**Backend deployed; mobile source complete, native release pending.** 487 core/service tests, nine tooling tests, ten adapters, 47 component scenarios in both timing modes, typecheck/lint and iOS JavaScript export pass. Three public HTTPS lookups started within 15 ms and completed independently; warm results took 228 / 241 / 1,184 ms, not a general latency guarantee. Public health/photo endpoints and portfolio HTTP 200 verified. Nutrition/alternative selection, prior side-chat work and the $2 AI budget are unchanged; no model calls or new TestFlight build. Include this UI/privacy copy plus DEV-22's local explanation helper in the next numbered release. [Implementation, limitations and acceptance checklist](60-nearby-alternative-availability.md).

## October 17 — build 10 combined delivery (DEV-24 / FB-33 / FB-34)

Build **0.1.0 (10)** is Apple VALID / IN_BETA_TESTING in the existing owner group. EAS e00c593a-ff70-45c0-b1c8-24cf8dcca077; submission c011e98b-aba0-47e3-905a-5b9ebf931682; Apple 18f2d83c-07ef-4144-b70e-44d1f7eceece. The 305-file frozen source includes DEV-22 explanations and DEV-23 availability plus retained earlier side-chat work. 487 core/service tests and 47 screen scenarios in each timing mode pass, along with typecheck/lint, tooling/adapters, news/My Needs, iOS export and native/IPA checks. No paid AI/search calls, backend restart or OTA update during this release. Earlier next-build references for these two enhancements are superseded by this delivery. Phone installation, real-world recognition/availability and physical acceptance are not claimed. [Release evidence and acceptance](61-build10-sodium-and-nearby-stores.md).


## October 17 — Shelf Camera goal clarified (FB-35)

The shopper scans similar products across brands and wants the best fit among the products actually visible, with short relevant benefits and trade-offs. This is the next Shelf Camera priority. It does not mean filling each result with unseen catalog alternatives or treating the relative winner as automatically healthy. Retain up-to-ten shelf results, distinguish evidence quality, preserve current clinical/privacy gates, and complete the already-requested image-transfer/cost discussion before implementing AI uploads. Build 10 remains unchanged. [Goal, proposed flow and acceptance](62-shelf-choice-goal-and-design-discussion.md).


### FB-35 clarification — alternatives when even the shelf winner is not good

Select the best supported observed product first. If its assessment remains Neutral or Not healthy (including the existing model/rule disagreement trigger), reuse the normal single-product alternatives flow against that winner. Show up to three passing alternatives with photos, concise leading-concern-first reasons, food facts/source controls and applicable store lookups; distinguish them from products actually scanned. Keep all existing checks and honest unknown/no-result states. This requirement is recorded for the pending shelf AI design; no implementation, new build or paid call in this checkpoint. [Detailed behavior](62-shelf-choice-goal-and-design-discussion.md).

## October 18 — Serper fallback delivery (DEV-28 / FB-40)

Build **0.1.0 (13)**: EAS 85e6fca9-c75b-4642-8977-5d61c202395f; submission e290d16c-d218-4b63-a872-039cae36627e; Apple 1203541c-4d04-41af-955f-dd91ccdbd34d (**VALID / IN_BETA_TESTING**). Existing owner-group access and encryption declaration verified. IPA SHA-256: 868bf1887910d79822c76e7811abc7f90afa25aa29ee4caff233dd530a8e9174.

The backend is deployed. 517 core/service tests, nine tooling, ten adapters, 52 screen scenarios per timing mode, lint/typecheck/export, bounded live Serper fallback and deployed HTTPS checks pass. The 309-file release preserves prior side-chat features and native home sizing. No AI inference, new tester invitation, OTA update or physical-phone acceptance is claimed. FB-36/37 and shelf design remain open. [Evidence](66-serper-shopping-fallback.md).

## October 18 - shelf-grid delivery (DEV-29 / FB-41)

Build **0.1.0 (14)**: EAS 60de0017-3b1e-4693-83ca-fbc9731c338a; submission 550384e3-3953-421d-8caf-09aa344c6739; Apple a90c1454-46d4-4520-8c09-d29a652ea1e3 (**VALID / IN_BETA_TESTING**). Existing owner-group access, encryption declaration and build-specific testing notes verified. IPA SHA-256: 06e9f94dc32f35b09f6ada9e8bd7f1dcd4137e4f85d8a5aed9c6a875165bfdab.

Backend deployed; 531 core/service tests, nine tooling, ten adapters, 52 existing screen scenarios per timing mode, My Needs and ten shelf scenarios pass. Typecheck/lint/export/native/package checks pass. One attributed 16-cell grid completed in 15.387 seconds; nine ambiguous cells stayed unrated. Frozen source retains side-chat features. Earlier pending shelf-image design/implementation entries are superseded by DEV-29; remaining physical acceptance and refinements are explicit in [the release record](68-shelf-grid16-release.md). No phone installation, external-tester access or perfect recognition claim is made.


## October 18 — daily news expansion and backend selection (DEV-30 / FB-12 / FB-14 / FB-23)

Connected EatingWell, Clean Eating and ScienceDaily alongside the existing three sources. Tightened article age from 90 to seven days, added bounded parallel collection/retries and filtered irrelevant shopping categories. The existing enabled timer still refreshes at 02:00 Eastern with DST/missed-run handling. Live collection: 17 EatingWell + 6 ScienceDaily candidates; the other four feeds responded but had no eligible current items.

At the user's direction, backend selection replaces the earlier local-ranking plan. Strict minimal topic requests, general fallback, private/no-store responses, no profile retention or publisher forwarding, general-only offline caching and updated privacy copy are implemented. 550 core/service tests, 11 collector tests, news interactions, 52 existing screen scenarios, My Needs, typecheck/lint and iOS export pass. Backend public checks and unchanged portfolio health verified. No AI calls, TestFlight upload, OTA update or physical acceptance in this checkpoint. Include the mobile changes in the next numbered build. [DEV-30 implementation and evidence](69-daily-personalized-food-news.md).


## October 18 — build 15 news delivery (DEV-31)

Build **0.1.0 (15)** is Apple **VALID / IN_BETA_TESTING**, available to the existing owner TestFlight group. EAS 1e3f7396-e686-489d-acc9-2db00d08343e; submission bb511d9c-d8d5-4dff-b589-e37b2b601d2a; Apple fcb74305-4c79-4f00-b290-2b072d3031fe. Frozen source preserves build 14 shelf and previous side-chat features. All release checks, native compilation, signed-package inspection, owner access and testing notes verified. No additional invitation, backend restart or OTA update. Physical acceptance remains. [Release evidence](70-build15-fresh-personalized-news.md).


**DEV-30 delivery reconciliation:** The earlier October 18 implementation checkpoint correctly reported no new native build at that time. DEV-31 now supersedes that packaging limitation: all requested news UI/source/privacy changes are delivered in build 15. The remaining news release task is physical iPhone acceptance.
