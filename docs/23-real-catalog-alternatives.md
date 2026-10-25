# Real product catalog and comparable alternatives
Updated October 13, 2026 (New York). Run timestamps use October 14 UTC.

## Outcome
Expanded the internal USDA catalog from **16 to 175 foods**, with **166 barcode-bearing records**. **160 records** now qualify for the initial comparison categories; one of those updated an existing record, so the net increase is 159. Open Food Facts remains disabled and no inventory provider has been connected.

| Comparison group | Records |
|---|---:|
| Plain oats | 15 |
| Granola | 42 |
| Breakfast cereal | 56 |
| Peanut butter | 11 |
| Whole-wheat sliced bread | 24 |
| Plain dairy yogurt | 12 |

This is a focused pilot catalog, not comprehensive grocery coverage. Multiple package sizes may be present. Categories are based on conservative description/form rules reviewed against the imported product names, not manufacturer or clinical certification.

## Data acquisition and validation
USDA FoodData Central is the sole enabled source for this increment. The existing private server API key was used in request headers; no key was printed or embedded in URLs, files committed as source, or mobile bundles. No OpenAI call or personal-data request was made.

Discovery combined relevance-ranked exact-phrase queries with recent records. The initial broad keyword search returned unrelated ingredient matches and was not imported. The final staged set contained 687 unique source IDs. Of these, 319 failed category/form/US-market/barcode qualification and 208 failed the complete-nutrition/source-age/plausibility rules; 160 were accepted.

Checks include:
- Exact USDA record identity; strict data shape, numeric values and nutrient units; valid normalized barcodes.
- Required branded-food identity, ingredients, all five recorded nutrition values, and US-market gram-based food form.
- Separate categories for dry oats, granola, ready-to-eat cereal, peanut spreads, bread and plain dairy yogurt. Reject bars, candy, sandwiches, yogurt-with-granola kits, baby foods, powders and other misleading keyword matches. Source review caught and added regression cases for Uncrustables, peanut-butter candies/clusters and yogurt products.
- Known discontinued records are not classified for comparison.
- Imported source publication dates must be valid and no more than approximately three years old (3 × 366 days). Comparison data must also have been fetched within seven days and cannot have a materially future timestamp.
- Per-100g upper bounds: energy 1000 kcal, individual fat/fiber/sugar measures 100g and sodium 100000mg. These are data sanity checks, not clinical thresholds or a guarantee of label accuracy.
- Same-barcode versions prefer newer publication dates. At ranking time duplicate barcodes and identical brand/ingredient/nutrition formulations are collapsed.
- Missing values remain unknown; no missing nutrient is filled with zero. Records may still differ from current packaging. The UI shows source dates and asks users to check the actual label.

A verified SQLite backup of the original 16-record catalog was taken before import. Imports use validated batches of up to 100, each transactionally applied; the full multi-batch operation is not represented as one atomic transaction.

Sources: [USDA API](https://fdc.nal.usda.gov/api-guide/), [data types and manufacturer-supplied branded labels](https://fdc.nal.usda.gov/data-documentation/). Data remains CC0 with USDA attribution.

## How alternatives work
The mobile public-food lookup now loads same-category candidates automatically. There is no Explore Alternatives click. Up to three candidates appear as horizontally scrollable cards with a neutral package icon, actual product name, barcode, USDA reference and unknown store availability. The icon is explicitly not a package photograph.

The shopper can compare by less saturated fat (default), less sodium, less total sugars or more fiber. Ranking measures the selected nutrient difference; this is not an overall health score or a clinically reviewed recommendation. It does not map diseases to nutrient targets. Every worsening value among the other tracked measures is displayed as a trade-off, including energy and fiber.

All arithmetic uses per-100g source data. Display compares equal weights using 1x the original product's listed gram portion when available. Otherwise it explicitly uses 100g. It never compares different manufacturer serving sizes as if equivalent.

Required dietary restrictions are checked locally. Because these public records do not contain verified restriction/certification evidence, the app withholds compatibility suggestions when a restriction is required, including gluten-free for a celiac profile. A marketing name containing “gluten-free,” “kosher” or “organic” is not promoted to verified evidence. Existing clinical/privacy gates remain unchanged.

Candidate requests contain only the comparison category plus tester authorization; no health profile, location or store ID is transmitted for ranking. The protected GET /v1/catalog/comparable/{group} endpoint serves at most 100 cached records, and rejects unknown categories. No phone request initiates USDA imports or paid provider requests.

Saved-food comparisons run on the phone using only the foods the user saved. The original and alternatives must each be saved to remain available offline. The existing encrypted 100-food cap and seven-day freshness rule apply. Fewer saved foods can yield fewer or no suggestions; that is not evidence that no alternatives exist elsewhere.

## Actual verification
- TypeScript and lint passed.
- **169 application tests plus 3 tooling checks passed.** New cases cover category contamination, unit/market/discontinued gating, missing/implausible/stale data, restriction exclusion, metric ranking, explicit trade-offs, duplicate suppression, top-three limits, authenticated endpoints and bounded/cancelled client requests.
- Live public HTTPS requests returned all six category pools with matching counts. Each group produced at least some nonempty comparisons. Missing tester authentication returned HTTP 401.
- ARM64 and x86_64 Android release builds passed and share the current source fingerprint.
- Android API 36 emulator installed the final x86_64 build. Barcode 00016000469655 returned Autumn's Gold Toasted Coconut Almond Grain Free Granola and three real Cascadian Farm alternatives automatically. Horizontal swiping reached the third card.
- The native UI showed 27g equal-weight arithmetic: saturated fat approximately 4g → 0g, while explicitly showing lower fiber and higher total sugars as trade-offs. Zero reflects the source label value, not a laboratory assertion.
- Saved the original plus one alternative, disabled Wi-Fi and mobile data, restarted the app and opened saved foods. The same local comparison remained available.
- Changing the criterion to less total sugars correctly produced no qualifying option for that original within the two saved foods.
- Secure-window UI hierarchy was inspected; no screenshot visual acceptance or physical phone testing is claimed. iPhone compilation and TestFlight acceptance remain pending.

Evidence: artifacts/remote/catalog-alternatives-check.log, catalog-alternatives-public.json, catalog-alternatives-arm64.log, catalog-alternatives-emulator.log, catalog-alternatives-native-first.xml, catalog-alternatives-native-third.xml, catalog-alternatives-native-offline.xml and catalog-alternatives-native-criterion.xml.

## Reproducible operator workflow
On project-server in /path/to/NutriGlimpse, source ops/remote-env.sh:
1. ops/discover-comparable-foods.py stages relevance results; --recent adds recent candidates. Each pass is bounded; no automatic retries or scheduled refresh were created.
2. node --experimental-strip-types ops/import-comparable-catalog.ts artifacts/remote/catalog-expansion/raw.json performs dry-run validation and writes a review report.
3. Review the record descriptions/forms, source dates, rejection report and category counts. ops/comparable-catalog-selection.json records this increment's accepted IDs.
4. Take a database backup with ops/backup-catalog.ts, then run the import with --apply. Restart only project backend services if backend code changed.
5. ops/refresh-catalog.ts refreshes at most ten stale existing USDA IDs per explicit invocation. Mapping reapplies category rules. New products require a new staged discovery/review.

## Remaining limits and next steps
- Test on physical iPhones and actual packages from the selected stores; signed iOS distribution still needs the existing account/signing setup.
- Broaden categories and brand diversity based on test scans. Some sources are from 2023; “retrieved today” does not mean a formulation was reverified today.
- Restriction verification needs reliable supporting evidence; clinical personalization requires reviewed rules. Neither is bypassed by this feature.
- Product stock stays unknown. Instacart's application page currently says new applications are closed with no waitlist, and ordinary public IDP returns shopping links rather than a verified stock-data feed. No account, retailer contact or paid access was created.
- Retailer website handoff and timestamped shopper observations remain proposed fallback features, not delivered by this increment.

## Build provenance
Source SHA-256: e80059ca611f602c3880628a00e1a1d71f72ddff866487b1fa3fb0da7f95ad98

ARM64 APK SHA-256: 56e1cc9735d8fa95a50f75c1b7998bcea3f9fadbd1e587fc060a329e686e4981

x86_64 APK SHA-256: 157dce45a03d7e65eb72426f76e709980ce379fc884c7bf9f76e0f3a92c2c989
