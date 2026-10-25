# Section 11 — current sources and remaining dependencies

Updated October 18, 2026 (availability connection); other dated observations retain their original checkpoint. Current status replaces the superseded [original checkpoint](history/25-section11-before-2026-10-15.md). Counts are observed catalog records, not store inventory or clinical acceptance.

| Source | Connected and implemented | Remaining boundary |
|---|---|---|
| USDA FoodData Central | Live API, normalized internal cache, provenance, refresh/backup tools and CC0 export; 2,898 records | Current-package validation; missing source values stay unknown |
| Open Food Facts | Live lookup/cache, ODbL combined export/attribution; 1,779 records, 352 currently comparison eligible; resumable pinned bulk acquisition | Most excluded records lack category evidence or have unsupported food forms; do not infer missing nutrients or alter unit checks |
| Manufacturer/package labels | Reported ingredients/allergens/front-label metadata, local correction workflow, exact-product evidence registry and expiring signed proof transport | Actual current manufacturer/certifier evidence, permitted reuse and accountable reviews; zero production verified gluten records |
| Retailer information | Seven retailer checking links; SerpApi nearby product stock/pickup evidence and unconfirmed listings. October 18: Serper Google Shopping fallback deployed for version-2 clients and delivered in TestFlight build 13; strict product/variant/package and local-evidence checks | Google-reported evidence is not a guaranteed inventory feed. Generic listings remain unconfirmed. Authorized retailer access is still needed for dependable branch stock; physical coverage unverified |
| Store locations | Local OSM Massachusetts directory, automatic foreground location, manual selection, radius controls and directions | Phone GPS/branch testing and broader map coverage. Latest bounded refresh timed out; previous 2,012 locations/842 footprints preserved |
| Medical/general guidance | Offline 26-entry DASH/NIDDK/DGA library, 128 serving-table cells, plus ADA/CDC/Mayo/AHA educational explanations; explicit factual reference arithmetic | Qualified clinical review before personalized ratings, targets or report interpretation |
| Monash/FODMAP | Rights/portion-aware evidence schema and pending review queue | Licensed measured data and reviewed use; no invented ingredient-based FODMAP claim |
| Dietary certifications | Exact-product/market/expiry/conflict verification and signed delivery | Current evidence and approved authority/reviewer scope. User approved verified certification OR manufacturer gluten-free claim; that decision is resolved |

## Current coverage

The catalog has 4,677 source records and 4,601 distinct barcodes. The latest source-category improvement makes 15 additional OFF records eligible (337 → 352). It uses specific taxonomy evidence for ordinary potato chips, pretzels, crackers, cookies, baked beans, chickpeas, white bread, cereal and tomato sauce. Tests reject lookalike unsupported forms.

A resumable acquisition checkpoint scanned 43 distinct Parquet row groups, selected 704 US brand/store-hint candidates and validated 109; all 109 already exist at an equal or newer source version. It therefore imported zero additional products and did not claim a catalog increase. All completed shards are hashed and resumable; partial downloads and HTTP rate limits cannot advance the checkpoint. No live product API crawling.

Catalog size does not prove coverage at Wegmans, Walmart, Price Chopper or Whole Foods. The seven-chain evaluation template still has zero physical observations and no approved thresholds. Dietary restrictions and nutrition/freshness requirements remain enforced.

## Operator tools

- `ops/resume-off-bulk.py --groups 2`: bounded pinned export acquisition. Optional `--start-group` prioritizes a region of the file without marking intervening groups complete; otherwise starts with unfinished groups. Do not bypass recorded rate-limit cooldowns.
- `ops/import-off-bulk.ts --resumable`: dry-run validation of completed shards; add `--apply` only after backup/review. Original download and source dates are retained per shard/product.
- `ops/reclassify-off.ts`: dry-run category changes and pair validation; `--apply` after review/backup.
- `ops/audit-off-eligibility.ts` and `ops/audit-section11.ts`: current exclusion/coverage reports.
- `ops/backup-catalog.ts` and `ops/refresh-catalog-batch.ts`: checked backup and bounded USDA maintenance.
- `ops/import-product-evidence.ts`: reviewed exact-product evidence; rights/authorities/approvals cannot be supplied by a crawler.
- `ops/export-guidance-library.py --check` and `ops/test-guidance.py`: source projection and archived-source consistency.

## What is needed

See the active dependency register in [the project plan](ImplementationProjectPlanDocument.md). Priority: working iPhone signing/build access, physical tester/device sessions, qualified clinical review, and permitted exact-product evidence. Stock feeds and licensed specialist data unlock those additional features; they do not block ordinary factual product comparisons. USDA/OFF/OpenAI setup is already complete.

The report route already supports explicit consent to default OpenAI retention for bounded numeric evidence. There is no new zero-retention purchase or approval requirement. General product/receipt media capture remains gated pending its native privacy acceptance.

**Availability extension:** [Serper Shopping fallback, compatibility and current release evidence](66-serper-shopping-fallback.md). Existing builds through 12 remain SerpApi-only; no additional credential is needed.
