# Faster photo results and package images

Updated October 17, 2026. Authoritative workspace: `/path/to/NutriGlimpse` on project-server.

## Delivery status

Implementation and verification complete. Backend deployed. Signed build **0.1.0 (6)** uploaded successfully, Apple processing is **VALID**, and the build is available in the existing private owner TestFlight group (**IN_BETA_TESTING**). Owner installation and physical-phone acceptance remain pending.

EAS build: `d93d34f3-bc52-4446-bbf2-40a4dbf06eb6` (finished October 17, 04:33:33 UTC). Submission: `1ea10b00-51b6-4ae1-80b9-7888497e0fc6`.

Verified IPA SHA-256: `7d9ecb6ec7014d5c7dfed46ab2edbf93bc65ccc4b032b8d5218995099b8d7f3f`; 56,322,846 bytes; arm64; iOS minimum 16.4; iPhoneOS 27 SDK. Bundle/version/team/store profile, encryption declaration, both compiled shelf detectors, current source-toggle/streaming/card/news content and package integrity checked. Native compilation succeeds. Full local app code-signature trust-chain validation was not performed on Linux; Apple acceptance is separately verified below.

## Changes

- One GPT-6 Luna request streams complete product records to the service. The original card appears once its identity and complete food record have passed the existing validation. Suitable alternatives appear as each complete record passes the same checks. No partial nutrient values are rendered.
- Retained the same model, high-detail image, 4,500-token allowance, full nutrient fields, five-candidate pool and up-to-three distinct validated alternatives. The nutrition/rating/dietary checks are unchanged. We deliberately did not shorten required facts or reduce image readability to claim faster performance.
- Phone preparation overlaps existing accurate OCR with barcode/JPEG preparation using at most two workers. Existing inputs, recognition settings, encoding and metadata stripping are unchanged. Native preparation time is emitted as a numeric duration, without photo logging. Physical-device savings remain unmeasured.
- Explicit Expo 57 streaming fetch; cancellation, screen transfer, timeout, incomplete/refused/mismatched responses and background cleanup are handled. A failed final stream revokes unfinished results instead of leaving a misleading rating visible. Older clients retain the complete JSON response contract, with no automatic paid retry.
- Alternative image lookups no longer have fixed 0/8/16-second client delays or silently skip a card while another lookup is busy. Cached images return immediately; upstream searches queue with the existing provider rate limits. These requests do not delay product facts or consume the model allowance.
- Replaced the failing legacy image-search route with the documented Open Food Facts Search-a-licious API. Validated US public image metadata persists for 30 days in a bounded separate cache; short-lived misses stay in memory. Public cache export: `https://grocery.serveforwad.com/v1/catalog/media` (ODbL database, CC BY-SA 3.0 images, source attribution). No user photo or scan history is stored in this cache; image metadata never becomes nutrition/certification evidence.
- Reference-only normalization handles Original/Classic wording and Spoon Size/Spoon Sized. Brand, flavor, formulation and cereal-shape checks remain. Actual matching package pictures were visually inspected for Post Shredded Wheat Big Biscuit, Post Shredded Wheat Spoon Size, Bob's Red Mill Old Country Style Muesli and Original Cheerios. All four image URLs returned HTTP 200. Unavailable or unconfident images still use a placeholder.
- **Check USDA / OFF** now toggles to **Hide USDA / OFF** within the same card. Reopening reuses the fetched result. Food Facts remains independently expandable; estimates and source facts remain separate.

## Measured evidence

Four bounded requests using the same public OFF Honey Nut Cheerios fixture, not a user photo:

| Mode | First validated original | Complete request | Final suitable alternatives |
|---|---:|---:|---:|
| Buffered baseline | 7.908 s | 7.908 s | 3 |
| Streaming | 2.274 s | 8.025 s | 3 |
| Streaming | 2.453 s | 7.965 s | 3 |
| Buffered baseline | 8.639 s | 8.639 s | 3 |

Deployed HTTPS path, one additional public fixture: original at **2.896 s**, alternatives at **3.896 / 4.885 / 5.965 s**, complete at **8.388 s**, with three alternatives. Public image metadata for Shredded Wheat, muesli and Original Cheerios returned in **71-74 ms** (this is metadata response time, not phone image rendering time). There are 38 cached public image records at this checkpoint.

These small fixture samples demonstrate earlier delivery, not a guaranteed phone latency, overall accuracy rate or proof of clinical validity. Model-generated nutrition remains visibly labeled as estimates. Full request time is approximately unchanged. Upload and physical capture stages have not been separately benchmarked on the owner's phone.

## Verification

- EAS Expo Doctor passed 20/21 checks; it reports newer patch versions for ten existing Expo packages. The same pinned SDK/dependency versions were retained for this scoped change. This is not a clean Doctor result or a dependency-security clearance.
- Typecheck and lint pass. **422 core/service tests**, seven tooling tests, ten input-adapter tests and **27 production-component scenarios** pass.
- New checks cover every prefix of an adversarial JSON fixture, braces/quotes inside strings, missing/unsafe alternatives, one reservation/one model dispatch, high-detail input, early HTTP delivery before final completion, native AbortController compatibility, cancellation, incomplete/refusal/oversized/mismatched streams, queued image lookups, persistent cache reuse, formulation rejection, source toggle/reuse, early navigation and background cancellation.
- Production HTTPS streaming, concurrent cached reference lookups and public metadata export pass. Beta backend remains active; portfolio endpoint returns HTTP 200. Clinical personalization and health/profile transmission remain disabled.
- Build evidence folder: `artifacts/photo-speed-2026-10-17/`. Frozen source manifest contains 240 files; unchanged home/news/measurements changes from build 5 are retained. No new dependencies or credentials were introduced.

Shared budget reservation after verification: **$0.88 / 44 total dispatches** against the existing $2 authorization ($1.80 admission gate). Five new public-fixture calls were reserved for this change. Reservations are not actual invoiced charges.

## Verified TestFlight delivery

Apple build `e28a7d91-5c1f-46b5-ae04-6f30efd47c5c`; app `6823645787`; version **0.1.0 (6)**; encryption exemption false. Existing owner-only internal group `7f71e231-04c1-42e4-9911-f0cd52037323` verified and this exact build attached. No additional tester invitations or public distribution. Submission finished 2026-10-17T04:34:27.937Z. Final source hashes match the frozen 240-file manifest.

## Phone acceptance remaining

Open TestFlight -> Health & Grocery -> Update and confirm version 0.1.0 (6). Scan the same Honey Nut Cheerios package: confirm the original opens first, three suitable alternatives appear when supported, and matching reference photos load. Open then hide then reopen Check USDA / OFF in the original and an alternative. Confirm cancellation/backgrounding clears unfinished reviews. Test on home Wi-Fi and cellular. No installation or phone-performance claim is made yet.

## Primary implementation references

[OpenAI streaming](https://developers.openai.com/api/docs/guides/streaming-responses), [latency guidance](https://developers.openai.com/api/docs/guides/latency-optimization), [Expo 57 streaming fetch](https://docs.expo.dev/versions/v57.0.0/sdk/expo/#expofetch-api), [Open Food Facts search API](https://openfoodfacts.github.io/search-a-licious/users/ref-openapi/).
