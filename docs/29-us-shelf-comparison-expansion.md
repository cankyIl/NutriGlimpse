# U.S. shelf comparison expansion — October 14, 2026

## Scope and results

User clarified that U.S. grocery relevance matters, not a match to USDA. USDA matching is not and was not an eligibility requirement. OFF records qualify independently. The bulk importer requires the OFF en:united-states market tag; this is a source market assertion, not verified inventory at any chain or branch.

OFF comparison-ready records increased **220 to 339** (+119, 54%). Shared category vocabulary increased **33 to 62**, with **56 populated OFF groups**. USDA remains 706 eligible records; combined eligibility is **1,045 source records / 1,036 distinct barcodes**. The searchable catalog remains **4,677 source records / 4,601 distinct barcodes**; 1,779 records come from OFF. No new source rows were downloaded in this checkpoint.

New supported forms include flavored yogurt, granola bars, toaster pastries, cookies, graham crackers, additional cheese types, mayonnaise, ketchup, guacamole, Alfredo sauce, multigrain sliced bread and separate canned vegetables. Corrected dry-pasta taxonomy aliases (including en:dry-pastas) and plain yogurt/cottage cheese category recognition. Fresh/prepared pasta is still excluded from dry pasta comparisons.

All 119 newly eligible records come from the existing U.S.-tagged export. Raw U.S. market assertions are retained in audit evidence. Three older directly fetched OFF records are outside that export, so its market tags cannot be used to reclassify them.

## What prevents remaining OFF records from qualifying?

Mutually exclusive reasons after this update:

| Reason | Records | Next action |
|---|---:|---|
| Missing useful category evidence | 668 | Obtain package/manufacturer taxonomy or improve source records; do not guess categories from undefined tags. |
| Unsupported or ambiguous food form | 770 | Add independently tested groups and resolve conflicting or insufficient form evidence. |
| Missing required nutrients | 1 | Obtain a complete authoritative label; never treat missing nutrients as zero. |
| Other data/freshness gate | 1 | Obtain a fresh source record; preserve original timestamps until then. |
| Eligible | 339 | Eligible does not guarantee an improving alternative for every chosen nutrient. |

This is separate from ingestion filtering. Of the original 10,000 U.S. export rows, 1,776 met import requirements: 3,408 were too old; 1,469 had ambiguous nutrition basis; 1,162 had source quality errors or unknown quality status; 961 lacked confirmed mass units; 530 had inconsistent serving nutrients; 520 lacked complete labels; 143 were liquids; 31 failed other identity/unit/nutrition checks. The import report records mutually exclusive first-failure reasons, not every defect on each row. The source scan was partial after an upstream HTTP 429. No blocked retry or new paid provider call was attempted here.

## Validation

- 202 application tests and three tooling tests passed; all workspace typechecks and mobile lint passed.
- Name/tag audit reviewed all 119 additions. Positive/negative fixtures cover actual U.S. shelf names, mixed vegetables, mixed cheese, filled cookies, yogurt toppings, fresh pasta, protein bars and ambiguous taxonomy.
- v4 eligibility tests exercise all 62 groups with missing nutrients, stale records, missing ingredients/barcodes and required dietary restrictions.
- All existing complete-nutrition, numeric-plausibility, source-age, retrieval-age, ingredient and identity checks remain intact.
- Reclassification asserts nutrients, ingredients, source/retrieval timestamps, certifications and availability unchanged. SQLite backup passed integrity check before application.
- 313 OFF products have at least one improving OFF alternative; 2,173 returned metric/product pairs passed same-category and positive-improvement checks. This does not establish clinical suitability.
- Live authenticated HTTPS comparison checks passed for every populated OFF group, plus four retailer-brand searches, public export parsing, unauthorized denial and portfolio health.
- Production rate limits were unchanged. The endpoint enumeration test uses a larger test-only request budget to exercise all categories.
- Dietary restrictions continue to block unverified compatibility. Maximum three alternatives, equal-weight comparison, tradeoffs and deduplication remain unchanged.
- No inventory, certification, personal-data-processing or clinical gate was enabled.

## Evidence and operator tools

Remote root: /path/to/NutriGlimpse.

- ops/audit-off-eligibility.ts writes per-product exclusion reasons.
- ops/reclassify-off.ts defaults to dry run and preserves original source versions/timestamps; explicit --apply updates through the database validator.
- ops/audit-category-expansion.ts exercises public deployed endpoints.
- artifacts/remote/us-shelf-expansion contains baseline reasons, dry-run and applied results, live coverage and per-product eligibility reasons.
- artifacts/remote/us-shelf-check.log records the complete test run.

## OFF category counts

| Group | Records |
|---|---:|
| alfredo-sauce | 2 |
| almond-butter | 2 |
| bagels | 6 |
| baked-beans | 7 |
| breakfast-cereal | 7 |
| canned-beets | 2 |
| canned-black-beans | 4 |
| canned-carrots | 1 |
| canned-chickpeas | 6 |
| canned-corn | 1 |
| canned-cream-corn | 2 |
| canned-crushed-tomatoes | 1 |
| canned-diced-tomatoes | 1 |
| canned-green-beans | 1 |
| canned-kidney-beans | 6 |
| canned-mushrooms | 2 |
| canned-peas | 2 |
| cheddar-cheese | 43 |
| colby-jack-cheese | 8 |
| cookies | 7 |
| cottage-cheese | 7 |
| crackers | 17 |
| cream-cheese | 5 |
| cream-cheese-spread | 6 |
| dry-pasta | 9 |
| english-muffins | 3 |
| feta-cheese | 3 |
| flavored-yogurt | 17 |
| fresh-mozzarella | 3 |
| gouda-cheese | 1 |
| graham-crackers | 2 |
| granola-bars | 7 |
| grated-parmesan | 1 |
| guacamole | 1 |
| hummus | 6 |
| instant-oatmeal | 7 |
| ketchup | 5 |
| mayonnaise | 7 |
| monterey-jack-cheese | 2 |
| mozzarella-cheese | 3 |
| muenster-cheese | 2 |
| multigrain-sliced-bread | 3 |
| peanut-butter | 27 |
| pepper-jack-cheese | 6 |
| plain-almonds | 17 |
| plain-oats | 3 |
| plain-yogurt | 7 |
| potato-chips | 21 |
| provolone-cheese | 3 |
| ready-popcorn | 2 |
| ricotta-cheese | 2 |
| salsa | 4 |
| sliced-bread | 1 |
| swiss-cheese | 4 |
| toaster-pastries | 9 |
| tomato-pasta-sauce | 5 |

## Retailer brand coverage

These are brand associations, not evidence of shelf stock:

- wegmans: 11 eligible OFF products.
- walmart: 81 eligible OFF products.
- price-chopper: 1 eligible OFF products.
- whole-foods: 47 eligible OFF products.

## Remaining work

- Review the 770 unsupported/ambiguous food forms by frequency and practical grocery use; maintain positive and misleading-neighbor tests for each added group.
- Obtain corroborating classification evidence for the 668 records without usable category tags.
- Refresh genuinely stale/incomplete source data and implement a resumable, provider-compliant acquisition process beyond the partial 10,000-row snapshot.
- Test updated clients against physical U.S. packages and actual phones. Older clients require the expanded schema build; iPhone signing/build/device validation remains separate.
- Retailer inventory feeds and verified dietary/clinical evidence remain separate external dependencies.

## Native-build limitation

Android Gradle assembly and APK signing verification succeeded. Publication was correctly stopped by the build provenance safeguard because other mobile source files changed during compilation (Shelf Benchmark module, capture screen and app configuration). This checkpoint does not claim a newly published or device-verified APK. Preserve that concurrent work and rerun the native build once the source is stable. Existing published artifact was not replaced.

Idempotence verification after migration reports zero changes, 339 eligible OFF records, and the same 2,173 checked pairs. Full application checks above ran before the concurrent mobile edits and do not validate those unrelated changes.
