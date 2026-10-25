# Public catalog database and external sources
Checkpoint: October 13, 2026 (America/New_York).

## What is running
Authoritative host: project-server; workspace: /path/to/NutriGlimpse.
The existing Node backend now opens a persistent SQLite public catalog at .tools/catalog/public.sqlite. For three to four testers, SQLite/WAL supplies transactional local storage without another database service. This decision can be revisited for multi-host writers or materially higher load.

Tables:
- sources: provider, attribution title, license and enabled state.
- foods: source-specific ID, optional normalized GTIN, retrieval time and strictly validated normalized food facts. The primary key preserves provider identity rather than guessing that similar names are identical.
- imports: provider, completion time and batch count. No user scan history.
Schema version 1; later unknown versions are rejected. Imports are bounded to 100 records, validated before mutation and transactional. Older imports cannot replace a newer retrieved record. Missing nutrients remain null, not zero. Stored values explicitly use a 100 g basis, not the app's default 1x serving.

Enabled source: USDA FoodData Central (CC0). Disabled source registry entry: Open Food Facts, pending contact and reuse decision. There are no personal-profile, receipt, lab-report, photo or user-location tables in this database. Those remain subject to the device-local privacy architecture.

## Source map and actual status
| Data | Intended sources | Current status / limitation |
|---|---|---|
| Generic/fresh food and branded nutrition | USDA FoodData Central | Live adapter and one real Foundation food imported using official DEMO_KEY. API key needed for ongoing ingestion. Manufacturer-submitted branded data still needs exact identity/freshness checks. |
| Barcode products, ingredients and nutrition | Open Food Facts; USDA branded records | Existing OFF adapter; OFF import disabled until attribution/share-alike adoption and application contact are configured. USDA normalizer preserves valid GTINs when supplied. No comprehensive barcode coverage yet. |
| Package/formulation verification | Manufacturer information and label evidence | No automatic manufacturer feed. User media must not be turned into a shared catalog without a separately approved contribution design. |
| Chain/branch product availability | Authorized retailer feeds or verified retailer evidence | No retailer feed configured. Food presence in USDA/OFF never implies a retailer stocks it. |
| Store locations | Selected places provider, potentially OpenStreetMap-derived data | Provider selection, terms, attribution and coverage pending. No claim of live inventory. Public Nominatim is not a bulk store-catalog service. |
| Dietary certifications | Certification bodies/manufacturers for exact product and market | No authoritative feed configured; status stays unverified. |
| Health and lipid interpretation | Source-specific professional guidelines and qualified clinical review | Existing reviewed-rule distribution scaffolding; production rules not approved. AI output is not a clinical authority. |
| Receipt/lab extraction | On-device native OCR; OpenAI for approved sanitized extraction | Fictional workflow works. General real-document redaction/privacy acceptance remains pending; no real health data upload enabled. |

Sources checked:
https://fdc.nal.usda.gov/api-guide/
https://openfoodfacts.github.io/openfoodfacts-server/api/
https://operations.osmfoundation.org/policies/nominatim/
Separating providers into rows/tables does not by itself settle licensing obligations for a combined database.

## API and operation
Loopback service: http://127.0.0.1:3001
- GET /v1/catalog/sources
- GET /v1/catalog/foods/usda/2768188
- GET /v1/catalog/barcodes/012345678905 (empty unless matching records have been imported)
The API performs cached reads only; arbitrary public requests cannot trigger upstream traffic, paid calls or database writes. Missing records return explicit misses. Multiple provider records remain separate. Response includes source URL, license, retrieval/source dates and stale flag after seven days; this is an operational freshness flag, not proof a formulation is current.
Personal POST routes remain disabled. Existing request/body bounds and global limiter apply. Service remains private on loopback, not yet a deployed remote tester endpoint.

Commands from workspace after source ops/remote-env.sh:
- node --experimental-strip-types ops/import-usda.ts --demo 2768188
- node --experimental-strip-types ops/import-usda.ts FDC_ID [up to ten IDs]
- node --experimental-strip-types ops/backup-catalog.ts
Normal imports read .tools/usda/api-key with private file permissions. Never pass the key in a command argument or commit it. Demo key is for initial exploration only; official published demo limits are 30/hour and 50/day per IP. Only two USDA calls were used for this checkpoint (list one record, then details). No OpenAI calls.
Backup uses SQLite's online backup API, writes a private timestamped copy and reopens it for integrity_check. Backup remains on the same server: off-host backup policy, retention scheduling and disaster-recovery drill remain future operations work.

## Verified
- npm run check: 154 application tests, three tooling tests, TypeScript and lint pass.
- New tests cover source identity/unit/duplicate checks, unknown versus zero, database persistence, old-record protection, batch rejection, disabled-source rejection, SQL parameter binding, HTTP retrieval and personal-upload denial, bounded upstream response and no retries.
- Live USDA record 2768188, Alaska Pollock raw, imported with attribution; cached endpoint returns it after backend restart.
- Online backup reopened with integrity_check=ok and one food.
- Both project services active; portfolio returned HTTP 200.
Evidence: artifacts/remote/catalog-check.log, catalog-live-import.log, catalog-backup.log.
Public data, not user data, was fetched. No API credentials were displayed.

## Remaining implementation
This is the persistent catalog foundation, not the entire finished backend or a populated grocery database.
- Expand relevant generic/branded coverage and add controlled refresh jobs with source quotas/backoff.
- Add OFF adoption/import path after source decision.
- Integrate mobile real-food types and cached lookups without relabeling sample assessments as verified advice.
- Add authorized branch/retailer and certification evidence; clinically reviewed rule publication.
- Configure dedicated HTTPS address and tester-access controls consistent with no mandatory app login.
- Add remote backup/restore operations and broader production security review.
- Complete physical iPhone, camera and privacy/source acceptance before live grocery/health workflows.

## User decisions/access next
1. Obtain a free USDA/data.gov key for ongoing ingestion; store securely on server, not in chat.
2. Choose an application contact and confirm OFF reuse approach before enabling it.
3. Choose a beta hostname and provide DNS access/change when ready; existing portfolio stays separate.
4. Identify the first stores/products testers will exercise, so coverage can be verified rather than promised.
Apple activation blocks TestFlight distribution, not this backend work.

    
## Hybrid catalog expansion — October 13
Use the USDA API as an upstream acquisition/refresh interface, the server SQLite catalog as the normal read path and a future on-device public cache for offline use. Personal records remain in the separate encrypted phone database.
Nine real Foundation food references are now stored. Eight new source IDs and exact preparation descriptions are in ops/usda-starter-selection.json. They are not branded grocery products; none establish store availability.
Cached search endpoint /v1/catalog/search/ENCODED_TERM and /v1/catalog/coverage are implemented. Name search is literal, bounded and parameterized. ops/refresh-catalog.ts is dry-run by default; --apply handles at most ten stale USDA records with one-second spacing, timeout and stop-on-error. Refresh is operator-triggered, not a recurring job. A successful retrieval date does not guarantee the source formulation was recently updated.
155 application tests and three tooling tests pass with typecheck/lint. Running service search and coverage verified; dry-run refresh needed zero requests. This expansion used eight discovery and eight detail calls; no paid AI calls.
Mobile fact-view integration and on-device offline public caching remain pending. Server-local storage does not itself make the phone work offline.
