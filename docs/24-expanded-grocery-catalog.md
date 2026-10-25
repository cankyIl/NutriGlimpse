# Expanded grocery catalog — October 14, 2026

## Delivered
The server catalog grew from **175 to 2,898 food records** (2,889 distinct normalized barcodes), with **706 comparison-ready products in 20 categories**. The 2,883 accepted branded records supplement the 15 retained baseline foods. Counts include distinct package sizes and formulations; they are not unique recipes or a measure of any store's assortment.

The backend on project-server serves this catalog at grocery.serveforwad.com. Search now matches both product names and brands; USDA brandName takes precedence over the manufacturer/brand-owner fallback. Generic foods and other previously imported baseline records remain available.

## Retailer-brand coverage
These counts describe source labels matching retailer brands/owners, not verified current distribution, branch stock or retailer partnerships. National and other brands are also included; alternatives can include products not stocked at the selected store.

| Retailer brand group | Lookup records in accepted batch | Comparison ready |
|---|---:|---:|
| Whole Foods | 295 | 16 |
| Wegmans | 55 | 10 |
| Walmart | 254 | 14 |
| Price Chopper / Market 32 | 24 | 0 |

Walmart matches Great Value, Marketside, bettergoods or Walmart owner fallback. Whole Foods matches 365 or Whole Foods. Price Chopper matches PICS, Price Chopper, Market 32 or Golub. No unsupported retailer affiliation is stored on products or sent as an inventory claim.

Price Chopper coverage is particularly limited: most retrieved records were published in 2022 or early 2023. Only 24 passed the current lookup validation; none also met comparison category/completeness requirements. This is a source-data gap, not a completed Price Chopper assortment. Wegmans coverage is also partial. Test scans and current label/manufacturer evidence should guide further expansion.

Official brand references: [Wegmans](https://www.wegmans.com/health-nutrition/feel-your-best/wegmans-brand), [Walmart](https://www.walmart.com/help/article/walmart-brands/a1b75ab8821848b08b8cdff1e968a576), [PICS](https://www.pricechopper.com/our-brands/pics/), [Whole Foods 365](https://www.wholefoodsmarket.com/departments/365-products).

## Comparison coverage
| Category | Eligible records |
|---|---:|
| plain-oats | 15 |
| granola | 42 |
| breakfast-cereal | 91 |
| peanut-butter | 11 |
| sliced-bread | 23 |
| plain-yogurt | 7 |
| dry-pasta | 9 |
| tomato-pasta-sauce | 54 |
| salsa | 33 |
| hummus | 52 |
| cottage-cheese | 39 |
| cheddar-cheese | 8 |
| flour-tortillas | 17 |
| corn-tortillas | 15 |
| potato-chips | 91 |
| tortilla-chips | 106 |
| pretzels | 51 |
| ready-popcorn | 23 |
| almond-butter | 13 |
| plain-almonds | 6 |

Lookup coverage also includes milk, rice, canned foods, eggs, meat and other grocery types. These do not automatically receive alternatives. Liquids are not converted from millilitres to grams without density evidence. Missing nutrients remain unknown, including fiber in many cheese records.

## Validation and ranking
- Staged 4,299 unique USDA records from 28 category queries, eight brand queries and a six-query relevance supplement. Downloads used 224 bounded API requests in this run; no AI calls or costs were incurred. USDA private key stayed on the server.
- Accepted 2,883 US branded records with valid barcodes, ingredients, some usable nutrition, plausible values and source publication dates within approximately three years. Rejected 1,152 old/invalid publications, 93 non-active/non-US records, 159 missing barcode/ingredients/nutrition records, and 12 implausible nutrient records.
- Comparisons additionally require all five tracked nutrients, a gram-based serving, matching food form, an allowlisted corroborating USDA food category and retrieval within seven days. Existing 160 comparison records were revalidated with the stricter category rules without resetting their retrieval timestamps.
- Regression cases reject meals containing pasta, salsa tamales, hummus snack kits, popcorn seasoning/unpopped kernels, candy-coated or mixed nuts and taco-shell combination packs. This is conservative automated classification plus source-name review, not manufacturer or clinical certification.
- Shared category definitions now drive schema, service and client validation. The endpoint supports up to 500 eligible candidates per group, filtering incomplete/stale entries and duplicate barcodes before the cap. The largest current group has 106; no current group is truncated.
- The phone ranks up to three alternatives by the chosen nutrient, collapses identical formulations and displays all worsening tracked nutrients. Comparisons use the original product's 1x gram portion at equal weight. Required unverified dietary claims still prevent compatibility suggestions.
- Store stock remains unknown. No GPS, health profile or current-store selection goes to the comparison service. Personal processing stays disabled, and no paid provider was added.

USDA source data is CC0 and attributed: [API guide](https://fdc.nal.usda.gov/api-guide/). Retrieval date is not a new manufacturer verification date. Check current packaging; historical or regional products may remain in USDA.

## Verification
- 172 application tests + 3 tooling tests passed; type checking and lint passed.
- Live authenticated HTTPS requests through the actual mobile client parsers succeeded for all 20 categories. Each category produced at least one qualifying comparison. All four retailer brand searches and sample barcode lookups succeeded; unauthenticated access returned 401. Required dietary restrictions suppressed alternatives.
- SQLite integrity check passed. Backup before import: .tools/catalog/backups/public-2026-10-14T04-17-56.460Z.sqlite (175 records).
- ARM64 and x86_64 release builds completed with matching mobile-source fingerprints. API 36 emulator verified install/startup, real hummus barcode lookup, three immediate scrollable alternatives, equal-weight trade-offs and new-category saved comparisons after an offline restart. Secure-window UI hierarchy evidence was used. Physical phones and iOS compilation were not tested in this increment.
- Both project backends were restarted for this change. Portfolio service was not modified.
- Evidence: artifacts/remote/catalog-broadening-check.log, catalog-broadening-public.json, catalog-broadening-acceptance.json and catalog-broadening-native-*.xml.

Mobile source SHA-256: a24168cc60c47981d6ebf81eeb0995f9170fc05163fa3bd9b1ee17fa14bfaed4

ARM64 APK SHA-256: 00a0b01f54e4c456c7911974feb7aa9788988bc3149ab7de69eb2c38076242cf

x86_64 APK SHA-256: 33aa2fa5eadc4d779c175469e37397507f6bd08e788ebe988b55fb60dacb8f31

## Maintenance and remaining work
1. Run ops/discover-broad-catalog.py and then ops/discover-catalog-supplement.py for staged discovery. Existing downloads resume; --refresh explicitly refetches the bounded query results. Staging is not an automatic import. Preserve per-record retrieval timestamps when merging staged files.
2. Run ops/import-broad-catalog.ts on the reviewed combined JSON without --apply. Review rejected records and retailer/category coverage; back up with ops/backup-catalog.ts before applying. Imports are transactional per batch of at most 100, not across the complete multi-batch operation.
3. Refresh/review before the seven-day comparison cache expires. No background schedule was created. Existing ops/refresh-catalog.ts is a small ten-record manual refresh; use bounded bulk discovery for broader maintenance. Staged cached data does not constitute a fresh upstream check.
4. Install the newly built client before testing this expanded catalog: older builds only understand the previous six-category schema. Signed iPhone distribution and real package scans remain outstanding.
5. Expand underrepresented retailer brands and categories from observed scan misses and verified current product evidence. Do not increase counts by relaxing incomplete-nutrition, food-form or source-date checks.
6. Inventory integration, reliable dietary certification evidence and clinical review remain separate dependencies.
