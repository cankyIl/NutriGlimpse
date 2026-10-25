# AI product photo and concise food result — October 16, 2026

> Historical DEV-11 checkpoint. The current normal-photo prompt, ratings and alternatives flow is DEV-12 in [43-verified-ai-photo-ratings.md](43-verified-ai-photo-ratings.md). Identity-only requests, one-call costs and test counts below describe that earlier checkpoint.

## Accepted behavior

Normal Scan Your Product uses GPT-6 Luna after separate one-time photo consent. One deliberate shutter tap sends one resized product image to the protected backend. The best matching food record opens automatically. No product-choice list or confirmation tap is required. Uncertain/ambiguous matches say “Likely match”; the name/brand remain visible and a correction button is available. The user clarified that the previous facts screen did open, but its academic presentation was not useful.

The result leads with a short general label takeaway and up to three facts, then up to three inline scrollable alternatives. Sources, nutrient table, small ingredients text, detailed guidance and retailer checking for the original product sit under Details. Alternative stock remains unverified and retailer-check links remain available. A positive label takeaway is not a personalized medical approval. FDA per-serving Daily Value bands are reused; total sugar has no invented Daily Value. Missing portions, stale data and unresolved dietary evidence do not produce a reassuring verdict.

## Recognition and source separation

- Native iOS: orientation is applied, longest edge reduced to at most 1,600 pixels, fresh JPEG encoded within 1 MiB. Original EXIF/GPS/camera metadata is not copied. Buffers are in memory only. The backend validates JPEG framing/dimensions and strips APP/comment metadata again.
- Backend: tester authorization, versioned consent, bounded request body/concurrency/timeouts; one OpenAI dispatch per accepted attempt, no automatic retry. Responses API model `gpt-6-luna`, no tools, `store:false`, maximum 800 output tokens. The schema contains only identity evidence; model-generated nutrition/allergens/certification/stock fields are rejected.
- Identity matching requires a compatible brand and name, retains visible flavor, and favors a matching printed package size. It may still be wrong; confidence is not guaranteed by a successful parse. Unknown or unsupported products do not borrow an unrelated food’s nutrition.
- USDA: first use a current compatible cached USDA record. Otherwise use the [official search and food-details APIs](https://fdc.nal.usda.gov/api-guide/) with required deduplicated search terms, US branded records, at most 20 search results / three detail candidates / two requests / 12 seconds. A shared 15-second interval limits fallback requests. Keys remain server-side in headers. Only the product terms go to USDA, never the image, profile or tester key.
- USDA details are normalized through the existing nutrient/unit/identity adapter and saved as public source facts. The server does not store the scan or model output. Missing nutrients remain null. An existing OFF/public record can remain the fallback. If no compatible nutrition record is found, show the recognized name and offer a Nutrition Facts-table scan or another photo.
- The selected public record crosses navigation in a short-lived in-memory transfer, so newly fetched records need not exist in the bundled app catalog. Explicit saving under Details retains only the public food record.
- Backgrounding, leaving, cancellation, duplicate native events, timeout and late responses are handled. Cancelling cannot guarantee that an already dispatched provider request is unbilled. Photo consent can be revoked in Privacy and clears on app reset. Shelf Camera AI remains out of scope pending brainstorming; shelf/nutrient-table/barcode behavior remains local.

## Actual evidence

- `npm run check`: 353 app/core/service tests, seven tooling tests, ten report-adapter tests, six production-screen interaction scenarios; lint and typecheck pass. UI boundaries are mocked; this is not a visual or physical-device acceptance claim.
- Native JPEG helper: 23 assertions passed on the Mac before it was switched off: orientation, dimensions, size, removal of GPS/private EXIF comment, malformed/empty/oversized rejection. This tests the encoder, not the complete modified camera module or signed app.
- Production iOS JavaScript/Hermes export passes on project-server. Bundle: `artifacts/ai-photo-2026-10-16/ios-export`.
- Two live synthetic package-typography requests succeeded with GPT-6 Luna. The second traversed public HTTPS, tunnel, tester authentication, deployed backend, model and catalog; it returned HTTP 200 in about 2.4 seconds. Unauthenticated capabilities returned 401. These are not realistic-package accuracy measurements.
- Live USDA fallback returned matching Quaker Old Fashioned Oats records with a 40 g serving and mapped nutrition. The initial query exposed USDA broad-term ranking; deduplicated required terms corrected it. This was tested without another paid AI request.
- Two new AI reservations: $0.04. Shared lifetime reservation: $0.12. These are conservative budget reservations, not actual billed charges; approved ceiling remains $2, with dispatch blocked at $1.80 reserved.
- Backend running on loopback 3002 via existing grocery hostname/tunnel. No portfolio unit or tunnel change. Portfolio unit remains running; external HTTP check returned 403, so that endpoint was not certified healthy here.

Artifacts: `artifacts/ai-photo-2026-10-16/check.log`, `photo-ui-check.json.log`, `live-photo-result.json`, `live-usda-result.json`, `public-smoke.json`, `backend-deployment.json`; native fixture evidence stays under `artifacts/mac/ai-photo-2026-10-16` on the Mac.

## Pending before phone acceptance

1. User powers on the Mac with Remote Login and connected/unlocked iPhone. Do not retry while it is intentionally off.
2. Re-verify host and existing source; apply the final source package, verify its manifest, and compile/sign the whole iPhone Release app. The latest full native build is **not done**. Earlier transfer/build attempts after the Mac disconnected were unsuccessful or unverified; do not assume the Mac has current sources.
3. Verify signed artifact/provisioning against source, install as an update without resetting app data, and launch. Existing Personal Team profile expires October 22 at 10:50 p.m. Eastern; re-sign as necessary. App Store Connect activation is not needed for this local-device route.
4. On phone, accept the new photo choice and use existing tester access (enter it if absent). Test representative packages, exact flavors, no-record recovery, low light, slow/offline connection, background/cancel, and whether the result appears directly with useful concise content. Do not declare recognition accuracy until these are observed.
5. Discuss shelf AI: one overview versus selected package crops, capture limits, deduplication, bandwidth, cost and progress/retry UX before implementation.

Prepared application source SHA-256: `b43da763b258d0f550d54b72510d13d66d5a7e79e11707f21df84d79d5bd251c`. Installed iPhone remains the previous verified source `06e3b593db6131de909621a5920365c1816412930499e8b5a735a9c6fd8d0c21`. Android artifacts were not rebuilt in this increment.
