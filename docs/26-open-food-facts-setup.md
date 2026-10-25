# Open Food Facts integration and API usage form
Updated October 14, 2026. Authoritative workspace: /path/to/NutriGlimpse.

## Later expansion
See [document 27](27-open-food-facts-expansion.md): OFF now 1,779 and combined catalog 4,677 records. User confirmed form submission. Counts below describe the initial connection checkpoint.

## Current status
The user approved publishing the derived product catalog under ODbL and authorized maintainer@example.invalid as the app contact. No API key or payment is required for reading product data. The email is the contact in the custom User-Agent, not authentication. User confirmed usage form submission October 14. No email was sent by the assistant.

Enabled: validated OFF barcode lookup through the protected beta backend, persistent product cache, source attribution and free complete catalog download. Name search remains local-cache-only. Existing fresh USDA/OFF barcode matches avoid external calls. All original source identities are retained; conflicting provider records are not silently merged.

- Public credits: https://grocery.serveforwad.com/data-sources
- Complete machine-readable catalog: https://grocery.serveforwad.com/v1/catalog/export
- Attribution metadata: https://grocery.serveforwad.com/v1/catalog/attribution
- Current verification: **2,903 food records: 2,898 USDA and five OFF**. These are source records, not 2,903 unique products or verified retailer listings.
- Public download contains product facts only; user profiles/history/location/access configuration and provider rate state are excluded. The combined database is offered under ODbL 1.0; OFF individual contents under DbCL 1.0 and original USDA CC0 notices are retained. No product images imported.

## Exactly what to enter in the API usage form
Open https://docs.google.com/forms/d/e/1FAIpQLSdIE3D8qvjC_zRJw1W8OmuHhsWJ_NSckiiniAHlfaVwUZCziQ/viewform . Form fields were inspected October 14, including later pages; only email is marked required in the inspected form. Use the following current-project answers. Branding remains open.

| Field | Entry |
|---|---|
| Email address | maintainer@example.invalid |
| What topic does your app tackle? | nutrition |
| What is the name of your app? | Congress Grocery Beta (working title) |
| Geographic area | United States; initially Massachusetts, with grocery-store testing around Worcester County. |
| App available for | Other: iOS and Android — private beta in development, not publicly released. |
| Help translating | No (for the current English-only beta). |
| First launch date | Leave blank; no public launch yet. |
| Are you using the | Live JSON/XML api |
| Server IP | Leave blank (optional). Our server uses residential outbound networking. Do not enter 192.0.2.10 or a Cloudflare tunnel/DNS address; neither identifies the public outbound API client. |
| Backend technologies | NodeJS |
| Mobile technologies | ReactNative |
| Relationships with food producers | No |
| Help onboard producers | No (no producer-outreach commitment for this beta). |
| Can users contribute photos/data back? | No |
| Users currently contribute photos | Leave all unchecked. |
| Users currently contribute data | Leave blank. |
| Account for edits/additions | No |
| Android app URL | Leave blank; no public store listing. |
| iOS app URL | Leave blank; no public store listing. |
| Marketing: Do you have? | a website — the public project data page is https://grocery.serveforwad.com/data-sources . Do not check social networks unless you have created project accounts. |

The app identifier sent with requests is `CongressGroceryBeta/0.1 (maintainer@example.invalid)`. Reading needs no account/key. If a form field has changed, use the truthful project state above; do not invent a launch date, store listing, static IP or contribution feature.

## Implementation and operating limits
- API v3.4 is pinned intentionally: OFF documents a breaking nutrition-schema change in v3.5. Live v3.6 returned missing legacy nutrition fields for some products; this was caught and the compatible v3.4 response validated. Migration to the new nutrition structure should be a separate tested change.
- Accept exact normalized GTIN, US-market, gram-based as-sold data with no source quality errors. Missing nutrients stay unknown. Prepared/liquid/ambiguous/malformed records are rejected. Numeric gram serving quantities may be supplied as numbers or numeric strings. Identity mismatches fail closed.
- Comparison classification needs product-name form plus OFF category corroboration. Existing freshness, complete-nutrient and dietary-evidence gates continue to apply. No clinical, allergy/certification or store-stock verification is inferred.
- Backend lookups have an eight-second deadline, 256 KB body cap, fixed provider host, disabled redirects and no automatic retries. Only the barcode goes upstream; no tester key, profile, location or photo is sent.
- Shared SQLite reservation spaces OFF requests by at least 5.1 seconds across the beta worker/operator importer and survives restart; upstream failures cause a 60-second cooldown. One in-flight lookup per worker; bounded negative cache holds at most 256 barcodes for one hour. Busy/cooldown/missing responses preserve cached fallback and do not claim full coverage.
- Local development service serves the shared cache without starting upstream OFF calls. Production config: `.tools/off/config.json` (private, no credential). Staging records never populate the production catalog.
- Operator targeted import: after `source ops/remote-env.sh`, run `node --experimental-strip-types ops/import-off.ts <barcode> ...` for 1–100 specific products. Coordinate with interactive beta traffic; if the shared slot is busy, stop and run later. For more than a few hundred products use official exports, not API crawling. Broad OFF bulk catalog expansion is not part of this initial setup.
- The public export reflects all enabled stored records immediately. Product-source records and the resulting download include license references. Public catalog sharing approval does not authorize adding private retailer data or personal uploads to that database.

## Verification and remaining work
- **190 application tests + three tooling tests pass**, with type checking and lint. Includes access separation, public complete export, private-field rejection, source normalization, category corroboration, response cap, contact header, missing/malformed source data, staging isolation, concurrency/cooldown and cross-connection pacing.
- Live staging read succeeded. Production targeted imports accepted four records; one was rejected. A separate authenticated HTTPS lookup for an uncached real barcode (016000275263) fetched, validated and cached a fifth record. Public download, credits, protected search, source-specific lookup and portfolio HTTP 200 checked.
- Updated signed ARM64 Android build completed, bundled JavaScript/signature/security manifest/source provenance verified. New build physical-device testing and iPhone compilation/testing are not claimed.
- Native build SHA256: 7d7e7086a2652136d642abf1c66ac31f58c0f0db20b7ebdf4cde8b16cb818c94.
- Evidence: `artifacts/remote/off-check.log`, `artifacts/remote/off-native-build.log`, `artifacts/remote/off/staging-check.json`, import reports, `artifacts/remote/off/deployment-check.json`, and `artifacts/android/preview-build.json`.
- OFF setup input is complete: user confirmed usage form submission October 14. No new key, subscription or special approval is needed for read access. Photos and user contributions remain excluded. Actual retailer/product coverage, package validation, clinical review and iPhone signing/device acceptance remain separate open work.

## Official references
- API setup and usage: https://openfoodfacts.github.io/openfoodfacts-server/api/
- License guidance: https://openfoodfacts.github.io/openfoodfacts-server/api/tutorials/license-be-on-the-legal-side/
- Schema version changes: https://openfoodfacts.github.io/openfoodfacts-server/api/ref-api-and-product-schema-change-log/
- ODbL: https://opendatacommons.org/licenses/odbl/1-0/
- Database contents: https://opendatacommons.org/licenses/dbcl/1-0/
