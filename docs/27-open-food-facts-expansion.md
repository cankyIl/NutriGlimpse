# Open Food Facts catalog expansion
October 14, 2026 (America/New_York). Authoritative project: /path/to/NutriGlimpse on project-server.

## Delivered and verified
User confirmed API usage form submitted. OFF source records grew from **5 to 1,779** after **1,774 new records** were imported. Combined USDA/OFF catalog: **4,677 source records**, **4,601 distinct barcodes**. OFF provides **1,712 barcodes absent from USDA**. Equal barcodes from different sources remain separate records; no unsupported source reconciliation is inferred.

| Retailer brand association | OFF records | OFF eligible for nutrient comparisons | All-source brand-associated records |
|---|---:|---:|---:|
| Wegmans | 65 | 3 | 120 |
| Walmart (Great Value/Marketside/Sam's Choice) | 314 | 5 | 569 |
| Price Chopper/PICS/Market 32 | 78 | 0 | 102 |
| Whole Foods/365 | 244 | 24 | 539 |

These are brand associations, not verified current assortment, store listings or stock. Counts can include the same barcode under multiple source records. Other accepted national-brand products broaden searchable coverage; they are not assumed present at every chain.

OFF has **89 comparison-ready records across 12 existing comparison groups**: peanut butter 27, potato chips 21, almonds 17, hummus 6, tomato pasta sauce 5, oats 3, almond butter 2, cottage cheese 2, popcorn 2, breakfast cereal 2, plain yogurt 1, whole-wheat sliced bread 1. Price Chopper has more searchable label facts but still no qualifying store-brand comparison records; do not hide that gap or invent alternatives. Existing USDA comparisons continue to provide additional options. Required dietary certifications remain unverified and still suppress compatibility suggestions.

Other searchable foods include canned beans/vegetables, frozen produce, cheeses, seasonings and prepared foods. These do not automatically enter comparison groups that lack validated form/category evidence.

## Source acquisition and validation
Official OFF daily Parquet export hosted in its Hugging Face organization, pinned revision `eb1498b6113305303544fcc86ca48ee887a5d6f7`. Dataset URL: https://huggingface.co/datasets/openfoodfacts/product-database/resolve/eb1498b6113305303544fcc86ca48ee887a5d6f7/food.parquet. Export revision last modified October 13, 2026. A project-local DuckDB installation reads only selected columns; no administrator packages or unrelated services were changed.

The whole-source scan received HTTP 429 after **10,000 complete candidate records**. No bypass or automatic retry was performed. Complete received rows were retained and independently validated; **the scan is partial and not representative coverage of the entire export**. Future extractor runs are bounded to 10,000 candidates and explicitly record truncation/interruption. A fuller resumable export acquisition remains engineering work, subject to provider availability.

Candidate selection: US country plus four retailer brand/store hints or common national grocery brands. Store tags are selection hints only and are not imported as inventory evidence. Public product names, ingredients and nutrient facts are the imported content; contributor identities, photos and user data are excluded.

- 1,776 distinct candidates passed strict validation; 1,774 were new and two newer/equal existing OFF records were retained.
- Reject missing/ambiguous mass basis, liquids, malformed barcode, obsolete/no-nutrition records, source quality errors, incomplete five-nutrient labels, inconsistent serving data and source dates older than three years.
- The official nutrition schema defines `100g` and `serving` amounts in canonical grams (kcal for energy-kcal); the `unit` field describes the contributor's original input. We do not wrongly interpret canonical sodium as milligrams merely because the input unit was mg. Sodium is converted from canonical g to displayed mg.
- Per-serving source entries require an explicit gram serving, matching numeric serving quantity, and all five canonical per-serving/per-100-g values agreeing within documented rounding tolerance (1%, minimum 0.00001). No unreported nutrient becomes zero. Float32 artifacts are rounded to six significant digits.
- Repeat imports preserve the original export retrieval timestamp, rather than giving an old local file a new freshness date. Equal/newer live records are not overwritten. A repeat dry run retained all 1,776 selected records without writes.
- Complete rejection counts and candidate SHA256 are in `artifacts/remote/off-bulk/import.json`. Raw complete candidate rows remain in `.tools/off/bulk/candidates.jsonl` for reproducibility.

Normalization guards detect data problems; they do not verify packages or guarantee community-data accuracy. Source modification dates are not proof of a current formulation.

## Publication and performance
The complete combined ODbL catalog is immediately available at https://grocery.serveforwad.com/v1/catalog/export with source notices. Credits: https://grocery.serveforwad.com/data-sources . No new license/account/payment is needed; form submission is recorded as complete.

Download serialization is cached by import/source revision, invalidates after imports and caps simultaneous full downloads at two. The expanded public download is approximately **4.06 MB**. Tester authentication still protects search/scan APIs; public download exposes only validated product facts. Both backend services and the portfolio remain healthy.

## Verification
- **197 application tests + three tooling tests**, type checking and lint passed. New tests cover Parquet language/nutrient mapping, canonical units, serving consistency, invalid/old/missing records, chain-brand hints and download cache invalidation.
- Authenticated HTTPS searches through the mobile response parser passed for Wegmans, Great Value, Price Chopper and 365 (20 results each, the endpoint limit).
- All 12 OFF comparison groups exercised against the existing engine; tested up-to-three options, honest no-option results and required-restriction suppression.
- Public export count/schema/credential exclusion checked; unauthenticated search rejected; portfolio HTTP 200 verified.
- Client source is unchanged in this increment. Existing signed ARM64 build source provenance verified; no new native build or physical-phone test is claimed.
- Evidence: `artifacts/remote/off-bulk-check.log`, `off-bulk-extract.log`, and `off-bulk/{import,dry-run,coverage}.json`.

## Next work
1. Obtain the remainder of a pinned official export through a resumable/bounded download when host limits permit; broaden categories/national brands without repeatedly requesting the same first subset.
2. Use actual tester barcode misses and current package evidence to improve coverage, especially Price Chopper comparison-ready products and cereals.
3. Maintain source freshness and review category/name matches; community source freshness alone is not package validation.
4. Complete physical iPhone testing, retailer acceptance baskets and independent clinical/certification/provider gates. Stock remains unknown.

## Operator tools
- `.tools/off/bulk-venv/bin/python ops/extract-off-bulk.py` — bounded official snapshot extraction; inspect source revision and partial-scan report before use. Do not retry during upstream throttling.
- `source ops/remote-env.sh` then `node --experimental-strip-types ops/import-off-bulk.ts` — dry run. `--apply` imports validated selected records after a catalog backup.
- `node --experimental-strip-types ops/audit-off-expansion.ts` — public/authenticated coverage and comparison checks; no tester credentials printed.

## References
- Official OFF export: https://huggingface.co/datasets/openfoodfacts/product-database
- OFF bulk-data guidance: https://openfoodfacts.github.io/openfoodfacts-server/api/
- Canonical nutrient units: https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_nutrition/
