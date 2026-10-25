# Nearby alternative availability — DEV-23 / FB-34

**October 18 extension:** DEV-28 adds Serper Google Shopping fallback for version-2 clients; version-1 behavior described below remains compatible. The new client and accurate provider/privacy copy are delivered in TestFlight build 13. [Current fallback and release status](66-serper-shopping-fallback.md).

**Date:** October 17, 2026  
**Status:** Backend deployed and public HTTPS verified. Mobile UI and privacy copy are compiled and delivered in **TestFlight 0.1.0 (10)**; Apple owner-group access verified. Build 9 lacks these store-result cards. Physical phone/store acceptance remains pending. [Combined release](61-build10-sodium-and-nearby-stores.md).

## User experience and concurrency

Only the alternatives already accepted by the nutrition/comparison engine trigger searches. Each visible alternative starts one independent request as soon as its card mounts. Three alternatives start three concurrent requests; two start two; one starts one; none starts none. Incrementally arriving alternatives start immediately without waiting for the rest.

The original card, ratings, explanations, food facts, photos and source controls render without waiting for store searches. Each alternative shows **checking location ..** inside its card until its own result arrives. A slow or failed lookup does not block or erase the other cards. Each card can display up to three store listings. Leaving the screen, changing store or backgrounding cancels its outstanding request and prevents stale results from appearing.

## Search and matching

The phone sends only brand, product name, variant, size and a selected store ID or rounded coordinates. The backend resolves the selected store to its public address; otherwise coordinates are rounded to two decimal places (about 1 km). Selected store takes precedence. There is no precise-GPS, photo, profile, age or lab-data upload for this feature.

One SerpApi `google_ads` request per alternative uses:

`Find <brand> <product> <variant> in stock near me at <selected-store address or approximate coordinates>`

Updated and deployed October 17 at the user's request. Example: `Find Classico Tomato & Basil Pasta Sauce in stock near me at 9102 Shops Way, Northborough, MA 01532`. The query omits the store/chain name and package size; known package-size checks still apply to returned listings. This is compatible with build 10 and requires no new native release. Twelve targeted availability tests and service typecheck pass, including the exact query string, three simultaneous dispatches and matching/size guards. Public backend/photo/portfolio health verified; no paid search/model calls for this wording change. Evidence: `artifacts/nearby-availability-2026-10-17/address-query-update.json`.

A server-only cached list of 17,936 US cities supplies SerpApi's canonical location parameter without an additional geocoding request. For the Northborough Wegmans fixture, the exact address is **9102 Shops Way, Northborough, MA 01532**; the nearest provider city center is Shrewsbury. The exact store address remains in the query.

The same provider response supplies sponsored shopping results and, when present, Local Stores & Options. No AI Mode request, retailer scraping, sequential per-store lookup, or automatic paid retry is added.

- Brand/name/variant tokens must match. Ordinary omissions of Original/Classic/Regular and marketing wording are tolerated; known conflicting flavors/formulations are rejected.
- Known package sizes must agree within rounding tolerance. A missing size is explicitly marked; multipacks are labeled and not represented as single-package prices.
- Ordinary nearby store presence is not stock evidence. **In stock — reported by Google** requires an exact-product stock extension with a branch address/coordinates within 15 miles.
- **Pickup today — reported by Google** requires positive pickup text plus local branch/nearby evidence.
- Other results say **Nearby listing — stock unconfirmed** or **Check location & stock**. Sponsored listings are marked. Prices/stock must be confirmed with the retailer.
- Known branch URL IDs for the tested Shrewsbury Shaw's, Westborough Target and Northborough Walmart have verified addresses. Other branch-specific local results work generically when Google supplies the required evidence; an unknown sponsored branch ID is not converted into an invented address.

Google coverage is incomplete and does not constitute a retailer inventory feed. Lack of a matching result means no matching listing found, never out of stock. Availability results do not change health ratings, alternative eligibility or nutrition/dietary checks.

## Latency, limits and privacy

- Separate service concurrency: up to six provider requests; does not consume photo-processing slots.
- Same product/location requests share an in-flight lookup. Cancelling one consumer does not cancel another.
- Successful/no-match results have a five-minute memory cache; temporary failures use 15 seconds. Cache entries are actually removed at expiry.
- Provider deadline 18 seconds; backend 20 seconds; phone 22 seconds. Only that card's store line waits.
- Conservative count-only allowance: 45 dispatch reservations/hour and 200/calendar month, persisted across restarts. Failures count; app cache hits do not. No new subscription or automatic overage purchase.
- Provider key stays in the existing private server file, never the phone bundle or client response.
- Strict 2 KB request, bounded 2 MB provider response and strict client result validation. Only HTTPS result links are shown.
- The app Privacy screen and native location-purpose text disclose selected-store/approximate-location sharing with SerpApi/Google. Server stores no queries or locations on disk; the quota ledger contains counts and hours only. Provider retention follows its own policies.

## What was verified

1. `npm run check`: **487 core/service tests**, nine tooling tests, ten input-adapter tests, typecheck/lint and **47 production-component scenarios** pass.
2. The same 47 component scenarios also pass with Beta 0 timing enabled. Tests exercise 0/1/2/3 request counts, independent completion, failure isolation, cancellation, store changes and immediately available food-fact controls.
3. iOS JavaScript/Hermes export passes. This is not native compilation or physical-phone acceptance.
4. Provider/parser tests cover cereal, pasta sauce and butter; wrong brand/flavor/size, multipacks, explicit stock, non-stock store results, unsafe links, oversized data, timeout, cache and budget behavior.
5. Three deployed public-HTTPS lookups began at **0 / 12 / 15 ms** after starting the batch. They finished at **228 ms (Post), 241 ms (Classico), 1,184 ms (Prego)**. These are warm-provider/live examples, not a fresh-search latency guarantee. An earlier fresh search exceeded the old 8.5-second deadline; that finding led to the longer isolated deadline.
6. Classico returned Shaw's at 50 Boston Turnpike Rd (pickup today), Walmart at 200 Otis St (product-specific in-stock evidence), and Target at 330 Turnpike Rd (nearby listing, stock unconfirmed). Post returned Walmart/Target listings; Prego returned Walmart plus unconfirmed-location shopping links. No guaranteed inventory claim.
7. A repeated app request returned the server cache in **76 ms**. Public health, v1/v2/v3 photo capabilities and portfolio returned HTTP 200 using Node's standard client after deployment. Python's default user agent received Cloudflare 1010; no Cloudflare settings were changed.
8. Only `congress-beta-backend.service` was restarted, at **2026-10-17 18:31:28 UTC**. Other service configuration, recognition/comparison logic, provider/model, AI budget and clinical/privacy gates were not changed. No OpenAI calls were made.

Evidence: `artifacts/nearby-availability-2026-10-17/` contains check/export logs, public-product live results, changed-file hashes and deployment checks. No private query/photo was copied into this artifact folder.

## Release and remaining acceptance

- Completed in build 10: NearbyAvailability, core request contract, app location-purpose copy and sodium explanation helper are included in the frozen source and compiled IPA.
- The release session compiled/distributed build 10 through the normal workflow. The earlier side-chat checkpoint itself did not change build number/signing or upload a native build. No OTA update was sent.
- On the phone, check 1/2/3 alternative flows, immediate food facts, independent store results, selected-store and GPS fallback, links, package-size/multipack wording, background/cancel and poor connectivity.
- Physical branch inventory/accuracy remains to be checked by testers. Guaranteed retailer inventory still needs an authorized retailer feed. Current app functionality requires no additional SerpApi credential.

Provider references: [Google Ads API](https://serpapi.com/google-ads-api), [shopping-result fields](https://serpapi.com/google-ads-shopping-results), [locations](https://serpapi.com/locations-api).
