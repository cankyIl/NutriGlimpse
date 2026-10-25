# Comparison category expansion — October 14, 2026

## Delivered

Expanded the shared comparison vocabulary from 20 to 33 groups. Open Food Facts comparison-ready coverage increased from 89 to 220 records (+131, 147%); populated OFF groups increased from 12 to 27. The complete catalog remains 4,677 source records / 4,601 unique barcodes, including 1,779 OFF records. This checkpoint reclassifies existing evidence; it does not claim new downloads.

New groups: bagels, English muffins, cream cheese, Swiss cheese, Colby-Jack cheese, low-moisture mozzarella, fresh mozzarella, crackers, instant oatmeal, canned black beans, canned kidney beans, canned chickpeas, and baked beans. Improved recognition includes named ready-to-eat cereals, cheddar source aliases, case-insensitive tags, and salsa with corroborating sauce/dip tags.

Existing USDA groups remain supported. New category assignments in this checkpoint are OFF-specific: USDA does not acquire a group merely because the shared vocabulary expanded.

## Validation and safeguards

- Rules require both a recognizable food form/name and corroborating source taxonomy. Undefined or broad tags alone are insufficient.
- Name review identified processed cheddar and fresh versus low-moisture mozzarella: processed cheddar is excluded and mozzarella forms separated. Blended cheese, meals, filled crackers, cereal bars, bread crumbs, ambiguous names and conflicting bread taxonomy are rejected.
- Versioned evidence is category-rules-v3. Source/retrieval dates, nutrients, ingredients, certifications and availability were asserted unchanged for every migrated record. Original freshness clocks remain active.
- Required ingredients, valid identity, all five nutrients, numeric plausibility, source age and retrieval freshness remain enforced.
- Dietary restrictions still block unverified alternatives. No allergy, religious-diet, clinical or store-stock claim is inferred from a product name or nutrient improvement.
- All alternatives still compare the same category and equal weight, show nutrient tradeoffs, deduplicate products, and return at most three.
- 206 OFF products have at least one improving alternative within the OFF pool. 1,539 returned metric/product pairs passed automated same-category and positive-improvement checks across four metrics; this is software validation, not physical-label or clinical validation.
- 200 application tests and three tooling tests passed, with workspace typechecking and mobile lint. Regression cases exercise real source names, misleading near-neighbors, and nutrition/freshness/restriction gates across all 33 groups.
- Authenticated production HTTPS comparison requests passed for all 27 populated OFF groups; returned records passed the shared schema and freshness checks. Four retailer-brand searches, complete public export, unauthenticated denial and portfolio availability also passed.

## OFF comparison coverage

| Group | Eligible records |
|---|---:|
| almond-butter | 2 |
| bagels | 6 |
| baked-beans | 7 |
| breakfast-cereal | 7 |
| canned-black-beans | 4 |
| canned-chickpeas | 6 |
| canned-kidney-beans | 6 |
| cheddar-cheese | 43 |
| colby-jack-cheese | 8 |
| cottage-cheese | 2 |
| crackers | 17 |
| cream-cheese | 5 |
| english-muffins | 3 |
| fresh-mozzarella | 3 |
| hummus | 6 |
| instant-oatmeal | 7 |
| mozzarella-cheese | 3 |
| peanut-butter | 27 |
| plain-almonds | 17 |
| plain-oats | 3 |
| plain-yogurt | 1 |
| potato-chips | 21 |
| ready-popcorn | 2 |
| salsa | 4 |
| sliced-bread | 1 |
| swiss-cheese | 4 |
| tomato-pasta-sauce | 5 |

Retailer-brand comparison-ready records: Wegmans 6 (previously 3), Walmart 43 (5), Price Chopper/PICS 1 (0), Whole Foods/365 39 (24). These associations do not establish branch inventory.

## Operations and evidence

Remote root: /path/to/NutriGlimpse.
- ops/reclassify-off.ts: dry-run by default, explicit --apply; reuses tags only for matching barcode/source date, preserves original data/timestamps; imports through validated database transactions.
- Pre-change SQLite backup passed integrity verification.
- artifacts/remote/category-expansion/dry-run.json and applied.json: full classified product/name/tag audit.
- artifacts/remote/category-expansion/live-coverage.json: production coverage and endpoint verification.
- artifacts/remote/category-expansion-check.log: complete automated checks.
- artifacts/remote/category-expansion-native-build.log: refreshed Android native build.

## Remaining work

- Physical package/barcode verification and phone acceptance are still pending; automated checks do not prove real store availability.
- 1,559 OFF records still do not qualify. Do not assign categories solely to increase counts; prioritize evidence-backed gaps and obtain missing or fresher source records.
- Bulk acquisition remains a partial 10,000-row snapshot after the upstream rate limit. Broader acquisition/resumption remains a separate task.
- New shared schema values require an updated mobile client; older installed clients may reject newly classified records. Distribute the refreshed build for testing. iPhone build/signing/device acceptance remains separate.
- Certified dietary compatibility, clinical review and authorized retailer inventory feeds remain external dependencies.

## Native build checkpoint

Signed ARM64 Android preview rebuilt successfully at 2026-10-14T23:41:20.806132+00:00; bundled JavaScript, manifest/security checks and source provenance passed. APK SHA-256: 4a4c8d55e1d71453616700019c77c6fdfc36f95feedbe873fc2fdd137fbd60e6. Source SHA-256: 7c7b6b22d6f0a1af7404b31d6f6e98f7ade7e752e3411942cfa56e52fa02578b. This updated build has not been installed on a physical phone; iOS was not built in this checkpoint.
