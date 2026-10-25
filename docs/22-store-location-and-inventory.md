# Automatic store detection and retailer availability
Updated October 13, 2026 (New York); verification runs continue into October 14 UTC.

## Delivered location behavior
After fictional-profile setup, the native app automatically requests foreground location permission. A fresh, accurate fix selects a **likely** grocery store when there is one clear mapped match. The home, store and public-food screens use this shopping context. Selection is not proof that the shopper is inside a building and is never evidence of product stock.

Permission denial, disabled phone services, insufficient accuracy, adjacent stores and no nearby match leave manual directory search available. The app does not repeatedly prompt after denial; it provides a settings button. Automatic detection can be turned off and that preference survives restart. Manual selection lasts for the app session and suppresses automatic replacement until the user asks to detect again. Backgrounding removes the location subscription and clears automatic selection; foregrounding requests a fresh fix.

GPS coordinates are used in phone memory, not saved to the app database, exported, sent to our server or sent to an AI provider. The phone downloads the same public directory as every tester. Normal network connection metadata remains visible to the backend/Cloudflare. A user-initiated Maps link shares the chosen public store destination with the maps app. Personal health/photo/report processing remains disabled.

## Chosen places provider: OpenStreetMap, served from our backend
No paid places account or API key is required for this increment. We imported a bounded Massachusetts extract and host the resulting independent geographic database on project-server. The app never calls the shared public Overpass service. Public GET/HEAD https://grocery.serveforwad.com/v1/stores/directory returns only common map data, with OSM attribution, source timestamp and ODbL licensing. Other beta APIs still require tester access.

Initial extract: **2,012 named grocery/convenience stores**, **842 mapped footprints**. Name matching finds 4 Wegmans, 27 Walmart, 11 Price Chopper, 4 Market 32 and 32 Whole Foods records. These are extract counts, not authoritative counts of open branches; map errors, missing addresses, duplicate representations and omitted branches are possible. Coverage is Massachusetts only. Outside the region or where maps are incomplete, no reliable automatic match is promised.

The encrypted native database now has a separate store-directory cache (schema 4). A previously downloaded directory supports offline matching and manual search. No first-use offline directory is bundled. The directory is requested again after 24 hours or on explicit refresh; automatic matching refuses source/import data older than 30 days. Manual review remains available. Public map data is separate from USDA foods and private test records.

Matching requires a location no older than 60 seconds, accuracy of 35 metres or better, and a single candidate. A mapped footprint requires the fix and its uncertainty margin to fit inside; point-only listings require proximity and accuracy together within 60 metres. A different mapped store within 150 metres causes ambiguity. This deliberately favors asking the shopper over silently selecting an adjacent store. The UI says “Likely store” and permits correction.

Operator maintenance:
- Source ops/remote-env.sh in /path/to/NutriGlimpse.
- Run python3 ops/refresh-store-directory.py only as an operator refresh. It makes one bounded request, validates the response and atomically replaces the normalized directory. No scheduled refresh was created.
- After a successful import restart congress-beta-backend.service and congress-backend.service, then check the public directory count and timestamp.
- A failed fetch/import preserves the last published normalized file; retain source metadata and ODbL attribution. Review provider policy before increasing scope or frequency.
- The downloadable derivative directory carries its license URL and original OSM object links; keep it separate from other datasets.

References: [OSM license](https://www.openstreetmap.org/copyright), [public Overpass usage guidance](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html), [Expo 57 location](https://docs.expo.dev/versions/v57.0.0/sdk/location/).

## Verification
164 application tests and 3 tooling checks pass, including matching accuracy, stale coordinates/data, polygon edges, ambiguous adjacent stores, denied endpoint methods/query parameters and authentication separation. Type checking and lint pass.

Android release builds exist for ARM64 and emulator x86_64; final fingerprints are recorded below after verification. Emulator checks exercised the actual automatic OS prompt, while-in-use grant, simulated Wegmans Northborough selection, offline restart, permission revocation/manual search and selection, persistent off preference, and removal of the GPS request in the background. Reset followed by offline setup produced “Store directory unavailable”, confirming the cached directory was cleared. A reset bug discovered during this work was fixed: the public-food and directory caches are now explicitly cleared before resetting session data. The earlier checkpoint's reset test verified tester-access removal, not cached-food removal; do not extend that earlier claim.

Evidence under artifacts/remote: stores-check.log, stores-arm64-build.log, stores-emulator-build.log, location-permission.xml, location-auto-selected.xml, location-offline-selected.xml, location-denied.xml, location-manual-offline-search.xml, location-manual-selected.xml, location-off-persisted.xml, location-foreground.txt, location-background.txt. GPS used simulated public store coordinates, not a real shopper trace. Secure-window restrictions prevent screenshot-based visual acceptance; UI hierarchy was inspected.

Public checks: directory HTTP 200, protected catalog without a key HTTP 401, portfolio HTTP 200. Physical iPhone/Android accuracy, indoor reception, battery behavior, reduced-accuracy iOS permissions and real home/cellular operation remain device acceptance work. iOS configuration is prepared; no signed iOS build or TestFlight acceptance is claimed.

## Retailer inventory plan — not connected
Tester priorities: **Wegmans, Walmart, Price Chopper/Market 32, Whole Foods**. OSM answers “which store is nearby”; USDA answers “what is in a food”; neither provides that branch's live inventory.

| Retailer | First access route to investigate | Current limit |
|---|---|---|
| Wegmans | Approved Instacart Developer Platform access first; assess Wegmans' own developer portal if needed | Wegmans confirms its delivery integration with Instacart. API entitlement, branch-level matching and display rights still need verification. |
| Price Chopper / Market 32 | Same approved Instacart investigation | Retailer confirms Instacart shopping, but that does not grant this app inventory access. |
| Walmart | Authorized retailer/partner product-and-local-availability feed | Published Marketplace inventory APIs manage sellers' listings, not arbitrary local Walmart shelf stock. |
| Whole Foods | Authorized Whole Foods/Amazon partnership or expressly permitted feed | Consumer store-specific browsing exists; third-party API access is not verified. |

References: [Wegmans delivery FAQ](https://www.wegmans.com/service/faq/online-grocery-ordering-delivery-pickup-), [Wegmans developer sign-in](https://developers.wegmans.io/signin), [Price Chopper delivery](https://www.pricechopper.com/services/delivery/), [Instacart developer documentation](https://docs.instacart.com/developer_platform_api/), [Instacart API access](https://docs.instacart.com/developer_platform_api/get_started/api-keys), [Walmart inventory API scope](https://developer.walmart.com/us-marketplace/docs/inventory-api-overview), [Whole Foods product browsing](https://www.wholefoodsmarket.com/products?shoppingList=true).

Execution sequence:
1. Obtain approved developer access and verify actual endpoint scope, target-chain/branch coverage, quotas, costs and rights to display/cache information. Instacart is the first candidate, not a connected provider. No retailer was contacted and no account or paid plan was created.
2. Map an OSM store to an exact provider branch ID; match the scanned GTIN to the exact product and package size. Chain-name-only matches are insufficient.
3. Build a backend adapter holding credentials only on the server. Keep geographic data, food facts and retailer observations separate.
4. Record provider, branch, GTIN/product ID, status, observation time, expiry and channel (in-store/pickup/delivery). Use “retailer reports available/unavailable” only when the feed supports it; otherwise “unknown”.
5. Treat stale, missing, rate-limited or failed observations as unknown. An online product listing is not evidence of stock; pickup/delivery availability is not a shelf guarantee.
6. Test exact branch identity, product variants, sold-out changes, stale responses, provider outages and permitted caching using retailer-approved fixtures, then validate on a physical shopping trip.

Until an authorized feed is available, the app displays **Availability unknown** beside the selected store. We will not scrape authenticated shopping sites, invent stock or infer it from a barcode match. A retailer shopping link may later provide a clearly labelled handoff, but is not an inventory integration.

## External dependencies
- For location testing: a signed iPhone build and physical store visits; no new places-provider account required. Existing Apple activation/App Store Connect and secure Expo login still need completion/verification.
- For inventory: approved provider credentials/access with the required branch-level product availability and display rights. Start with Instacart access assessment for Wegmans and Price Chopper; Walmart and Whole Foods may require separate agreements.
- Broader state coverage and exact tester branches should be reviewed before expanding the directory. Personal-data/clinical gates remain separate.

## Final build provenance
- Source SHA-256: 28d3a48e9b61bb1132328c1e79e9b3cd7a23a27f7541a29b2b12b99c35ed3968
- ARM64 APK SHA-256: 5cb726a6fdbe0de51620919867cd4454dc5229374d4701d12de72bf436db56e2
- x86_64 APK SHA-256: fb414a159180170ba4561e7a6b8bd831bf6a44b5bfda869bf800b515cbf62862
- Linux iOS prebuild passed; package.json was unchanged. This is configuration generation, not an Xcode build.

Final-build emulator recheck also changed the selected store from Northborough to Medford without a store-selection tap, then cleared it after moving away. Structured evidence: artifacts/remote/store-location-acceptance.json.
