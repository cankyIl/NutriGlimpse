# Verified AI photo ratings and alternatives — DEV-12

Updated October 16, 2026. Authoritative project: `/path/to/NutriGlimpse` on project-server. This supersedes the identity-only normal-photo flow in DEV-11. The Mac is intentionally off; current source is not installed on the iPhone.

## Delivered flow

1. One shutter tap, after new versioned consent, sends one resized, metadata-stripped package photo through the protected backend to **GPT-6 Luna**. No catalog product clues, existing alternatives, profile, age, location or laboratory values enter this first request.
2. The model independently identifies a concise brand/product/variant and optional readable size, and proposes up to three real similar products. Proposals are candidates, not accepted nutrition claims. The prompt may use learned product knowledge to propose names; it does not treat remembered nutrient quantities as verified evidence.
3. The backend resolves these identities against the public catalog and bounded USDA lookup. Exact USDA IDs refresh missing fields; an unknown identity can use search plus up to three details. The shared OFF lookup may enrich a known barcode. It never merges nutrients from different formulations. Parent-manufacturer names are supported only when reported by the source. Flavor checks remain enforced, and matching-package rank takes precedence over completeness.
4. The second Luna request receives verified **one-serving amounts**, source references and exact arithmetic threshold checks. It returns a structured rating and up to three reason codes. The server computes the same rubric and rejects unsupported, incomplete, duplicated, unknown-key or conflicting assessments. The model does not receive the computed rating.
5. The app automatically opens the best matching product with a labeled colored dot and terse points. Uncertain matches stay visible as likely matches but get no color. Missing facts, stale sources, conflicting model output or unverified dietary requirements do not become a reassuring Neutral placeholder.
6. Only Neutral and Not healthy results can show alternatives. Cards show up to three verified candidates horizontally, terse benefits, any smaller relevant trade-offs, portion information, optional actual product thumbnails and food-fact expansion. Retailer links remain available; stock is not inferred.

The controlled source lookup is performed by the backend between model calls. This does not enable arbitrary internet access in the model. No USDA/OpenAI key is sent to the phone.

## Rating policy

Policy: `general-label-2026-10-16.1`. This is a transparent beta **general nutrition comparison rubric**, not a clinically reviewed classification or FDA endorsement. Personal health conditions and lipid values do not determine its colors.

Prerequisites: current source/retrieval dates, branded exact product evidence, supported comparison category, barcode/ingredients, serving weight, plausible original five nutrients, protein, total carbohydrate, added sugars and trans fat. Missing is never zero. Added sugars cannot exceed total sugars beyond a small reporting tolerance; total sugars cannot exceed carbohydrate similarly. Source freshness and dietary checks are preserved.

Apply these rules in order for one listed portion:

| Rating | Color | Criteria |
|---|---|---|
| Not healthy | Red `#DC2626` | Any reported trans fat above zero, sodium ≥460 mg, saturated fat ≥4 g or added sugars ≥10 g |
| Very healthy | Dark green `#166534` | Otherwise sodium ≤115 mg, saturated fat ≤1 g, added sugars ≤2.5 g and fiber ≥5.6 g |
| Healthy | Light green `#86C94A` | Otherwise sodium ≤230 mg, saturated fat ≤2 g, added sugars ≤5 g and either fiber ≥2.8 g or protein ≥5 g |
| Neutral | Yellow `#FACC15` | Complete verified data, with none of the above classifications |

The sodium/saturated-fat/added-sugar/fiber cutoffs use arithmetic based on FDA Daily Values. FDA's [label guide](https://www.fda.gov/food/nutrition-facts-label/how-understand-and-use-nutrition-facts-label) supports nutrient-label interpretation, not these whole-product labels. The combined rubric, protein criterion and comparison thresholds are app engineering policy requiring review before medical use. Minerals/vitamins are displayed where reported; they do not automatically outweigh adverse nutrients. No invented total-sugar or carbohydrate Daily Value is used.

### Alternative verification

- AI proposes names independently. The app does not send catalog candidate lists into the photo request.
- Same supported comparison group; exact brand/variant; current complete nutrition; zero reported trans fat; no duplicate identity/barcode/formulation; a model-agreed green rating is required.
- Benefits use the **original product's serving weight for both foods**, with at least 25% relative improvement and an absolute floor: sodium 46 mg, saturated fat 0.4 g, total sugar 2 g, added sugar 1 g, fiber 1.4 g or protein 2.5 g.
- Material adverse changes block promotion: ≥25% relative worsening plus sodium 115 mg, saturated fat 1 g, total sugar 5 g, added sugar 2.5 g, fiber 1.4 g or protein 2.5 g. The sodium/saturated-fat/added-sugar adverse floors equal 5% DV. An energy increase of both ≥40 kcal and ≥20% also blocks promotion.
- Smaller adverse differences above the benefit-size floors are explicitly disclosed as trade-offs. An alternative must also qualify as green at the original portion weight, so a tiny alternative serving cannot manufacture a favorable comparison.
- This does not guarantee that a suggested product suits a particular disease, allergy or medication. Dietary restrictions remain local; supported strict gluten-free acceptance still requires current verified certification or manufacturer proof. Other unsupported restrictions prevent colored approval. No new production dietary proof was created.

## Source and presentation details

- USDA/OFF adapters now retain reported protein, carbohydrate, added sugars, iron, vitamin D and vitamin C alongside existing nutrients/minerals. Units are validated; absent, duplicated, wrong-unit and implausible fields remain unknown.
- OFF thumbnail URLs must be source-reported and match the approved image-host/path shape. Cards attribute the source product and CC BY-SA 3.0. No model-generated image URL or generated package picture is accepted. Failed images use the package icon.
- Main results remain concise. Longer guidance, nutrition, ingredients and provenance remain under Details. Ratings have text labels and accessibility labels as well as colors.
- Public `/v3/catalog/export` exposes enriched reusable records. Existing v1/v2 clients receive their compatible projections. The attribution/download page links to v3 and documents image licensing.
- Cache after live checks: **4,686 records, 4,608 distinct barcodes; 2,907 USDA / 1,779 OFF**. Fifteen records currently have the new nutrient fields, nine meet every rating prerequisite. New scans refresh missing fields on demand; this checkpoint does not claim complete catalog rating coverage. No actual thumbnail was retrieved for the live test products; those use icons. Mocked screen checks cover attributed thumbnails and failure fallback.

## Privacy, cost and availability

Consent: `product-photo-assessment-2026-10-16.1`. The old photo-consent version does not silently authorize the new assessment flow. Revocation remains in Privacy. No new health-profile or lab-data transmission is enabled.

- Native input remains one orientation-correct JPEG, ≤1,600 px / 1 MiB. Original metadata is removed on phone and again on the backend. No app/backend photo files or model-response history are created. Synthetic diagnostic artifacts are explicit developer fixtures only.
- OpenAI Responses API: `gpt-6-luna`, `store:false`, no arbitrary tools, no automatic retries, ≤1,600 output tokens per call. Default provider retention may still apply and is disclosed in consent.
- At most two dispatches per scan, with shared durable budget reservation **before each call**. Stage-two failure preserves public food facts without inventing a color. The existing $2 test ceiling and $1.80 reservation stop remain. Twelve new test dispatches reserved $0.24; lifetime reservation is **$0.36**, not actual billed cost.
- Backend: authenticated tester access, strict consent/request schemas, image/body size limits, bounded concurrency, cancellation and timeout handling. Lookup covers at most four identities with a 30-second source budget; USDA batches share durable 15-second pacing and OFF shares its existing limiter. Late or cancelled responses do not navigate the app.
- No source profile, personal age/name/location/lab fields are accepted by this endpoint. Existing consented report processing is unchanged. Personalized medical recommendations remain disabled.
- Only `congress-beta-backend.service` was restarted. It remains loopback-bound on port 3002 behind the existing hostname/tunnel. The portfolio dashboard remained active; its configuration was not changed.

## Verification actually performed

- Full typecheck/lint and **381 application/core/service tests** pass, plus seven tooling and ten report-adapter tests. Fourteen production-screen scenarios cover automatic navigation, all four labeled colors, concise reasons/Details, cancellation, uncertainty, expiry, dietary gates, source-image attribution and icon fallback. Native/network boundaries are mocked in these screen checks.
- Live USDA checks retrieved matching oats and two cereal formulations, including added sugars, protein/carbohydrate and trans fat. Foreign/discontinued source rejection, identity ranking, manufacturer matching, exact-barcode enrichment, unit validation and legacy schema compatibility have regression tests.
- Live public HTTPS normal-photo scan: synthetic Quaker typography → identified oats → USDA record → **Healthy**, no alternatives, approximately 5.5 seconds. Authenticated status 200; unauthenticated capabilities 401; legacy capabilities 200; response `no-store`.
- Live public HTTPS cereal scan: synthetic Honey Nut Cheerios typography → exact cereal record → **Not healthy** for added sugar → **Healthy plain Cheerios** with less total sugar and less added sugar, approximately 7.8 seconds. Three model-proposed candidates were checked; one qualified. No physical package-camera accuracy claim.
- Live checks found model serving arithmetic mistakes. Verified one-portion amounts and explicit numeric checks corrected this. The initial rejected assessment is retained as diagnostic evidence; conflicting output was never shown as a color. The model can still disagree in future; the fail-closed path remains tested.
- Public v1/v2/v3 export checks return 200. v1/v2 contain none of the new fields; v3 exposes them. Actual product facts alone are published.
- Production iOS JavaScript/Hermes export passes on project-server. **No current native Mac build, signing, installation or physical camera acceptance was performed.** The phone still has its earlier installed source checkpoint. Android native packages were not rebuilt for this increment.

Artifacts on the server: `artifacts/ai-ratings-2026-10-16/` contains `check.log`, `ios-export.log`, `ios-export/`, `public-smoke.json`, `public-smoke-cereal.json`, `public-smoke-before-portion-fix.json`, `live-nutrition.json`, `deployment-check.json`, `delivery-verification.json` and the source bundle. The source archive excludes machine-local keys, generated native projects and dependencies; its manifest records exact file hashes.

## Implementation entry points

- `apps/service/src/photoAssessmentProvider.ts`: both versioned model instructions, structured contracts, budgets and orchestration.
- `apps/service/src/photoNutrition.ts`: catalog/USDA/OFF verification and source refresh.
- `packages/core/src/photoAssessment.ts`: rating policy, response validation, dietary and alternative checks.
- `packages/core/src/photoAssessmentClient.ts`: bounded authenticated client.
- `apps/mobile/src/ui/PhotoRating.tsx`: labeled dots, alternative cards, images and trade-offs.
- `apps/mobile/src/app/capture.tsx`: consent, one-shot capture, cancellation and automatic navigation.

## Remaining dependencies

1. **For this update on the iPhone:** turn on the Mac, enable Remote Login and connect/unlock the iPhone. Then rebuild/sign/install the prepared source and test representative real packages, low light, slow/offline service, cancel/background, ratings and alternatives. Existing Personal Team signing expires October 22 at 10:50 p.m. Eastern; re-sign as needed. App Store Connect is not required for this local installation.
2. **For medical personalization:** qualified clinical review of applicability, thresholds and cases. General food comparisons continue without it; this update does not transmit health profiles or interpret labs.
3. **For Shelf Camera AI:** the requested design discussion about overview/crops, deduplication, bandwidth and cost before implementing multi-image uploads.

No new API account or key is required for the implemented normal-photo flow. Broader distribution, verified dietary evidence and actual store-stock dependencies remain in the project plan.
