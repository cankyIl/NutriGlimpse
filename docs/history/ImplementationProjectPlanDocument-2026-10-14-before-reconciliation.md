# Beta 0 Implementation Project Plan

**Document:** ImplementationProjectPlanDocument  
**Created:** October 5, 2026  
**Last updated:** October 14, 2026 (New York)  
**Overall status:** Real catalog alternatives and store location implemented and Android emulator verified; physical iPhone testing pending; inventory and clinical gates remain open  
**Baseline:** Requirements v0.19; full iPhone and Android scope, including newly specified Shelf Scan  
**Initial testers:** Three iPhone testers; possible fourth Android tester. User reports iPhone 12 / iOS 26.6.2.

## Minerals and product-label evidence — October 14, 2026

- [x] Record user choice: **verified certification OR a verified manufacturer gluten-free claim** may qualify.
- [x] Add trans fat, potassium, magnesium and calcium across adapters, storage and screens; missing values remain unknown.
- [x] Refresh 2,898 USDA records; enrich 1,778 OFF records. Catalog remains **4,677 source records / 4,601 distinct barcodes**.
- [x] Connect OFF-reported label/allergen/trace metadata on **1,778 products** (697 with claims, 1,070 with allergens, 89 with trace tags).
- [x] Connect exact-product reviewed evidence, conflict/withdrawal handling and expiring signed proofs to strict gluten-free alternatives.
- [x] Extend source-cited extraction contracts; extraction alone cannot grant certification or enable a live upload route.
- [x] Deploy catalog v2 and complete reusable export; preserve v1 clients and source-only publication.
- [x] Pass full checks: **311 application tests, three tooling tests and ten report-adapter tests**, workspace typecheck and lint. Export web/iOS/Android bundles. Confirm protected v2, legacy v1, public exports and portfolio HTTPS.
- [ ] Review actual manufacturer/certifier/package evidence and configure trusted reviewers/source rights. **Zero live products are currently verified gluten-free.**
- [ ] Fill source-omitted nutrients only when actual evidence becomes available; one OFF Lucky Charms record remains unenriched after validation.
- [ ] Publish a stable-source native build and complete physical-phone acceptance.
- [ ] Obtain qualified review before personalized medical advice; this increment adds product-label evidence, not disease treatment rules.

**From the user:** no new API key or payment. Current package photos (front, nutrition/ingredients, allergen/advisory panel and barcode) or exact manufacturer/certifier records for initial gluten-free products will help complete product reviews. Qualified clinical review remains a separate dependency.

Detailed implementation, coverage and review workflow: [Product evidence and minerals](36-product-label-evidence-and-minerals.md).

## Blood-pressure and gluten label checks — October 14, 2026

- [x] Verify proposed AHA/DASH/FDA/Academy rules; replace unsupported thresholds and certification/safety labels.
- [x] Integrate DASH label review and strict gluten-free evidence modes into the real-food catalog.
- [x] Add portion-aware sodium/saturated-fat %DV interpretation with freshness/missing-data guards.
- [x] Add conservative ingredient triage; keep unverified products excluded under strict gluten-free mode.
- [x] Expand source-linked education to 16 cards; regenerate structured data; keep clinical rules disabled.
- [x] Pass workspace typechecks, changed-file lint, **259 application + three tooling tests**, and production web export.
- [x] Later full-workspace check passes; stable native publication and physical-phone acceptance remain pending.
- [x] Add source-reported trans-fat/mineral fields and front-label/allergen/reviewed-certification plumbing; see the newer checkpoint above. Actual product evidence reviews remain open.
- [ ] Obtain qualified review before personalized disease recommendations.

Detailed corrections, source links and remaining scope: [Blood-pressure and gluten label checks](34-blood-pressure-gluten-label-checks.md).

## ADA Superstar Foods follow-up — October 14, 2026

- [x] Re-read the guide; confirm the main food groups are already covered.
- [x] Expand education from eight to **ten cards**, adding whole-grain label and budget shopping tips plus fish-preparation context.
- [x] Show grain-label guidance for curated breakfast cereal, granola and instant oatmeal; no inference that those products are whole-grain or medically recommended.
- [x] Regenerate the structured education data; retain all medical and dietary safeguards.
- [x] Typecheck/lint and **206 application + three tooling tests** passed.
- Phone acceptance: see [education integration details](32-diabetes-nutrition-education.md). A new phone build and physical acceptance remain pending.

## Diabetes education in app screens and comparisons — October 14, 2026

- [x] Read ADA MNT/Nutrition & Wellness, CDC meal planning, MedlinePlus, ADA food examples and Mayo Clinic; correct overclaims in the proposed food table.
- [x] Add eight cited educational cards, reachable from Home/catalog/sample results, plus four comparison-metric explanations and conservative category context.
- [x] Preserve nutrition/freshness/dietary checks and ranking. Personalized medical recommendations remain disabled.
- [x] Pass full check: **205 application + three tooling tests**, typecheck and mobile lint. Existing guidance archive also passes seven tests.
- [x] Android compilation and signature verification passed.
- [ ] Publish a stable-source phone build: concurrent Shelf Scan edits triggered the provenance guard; this run did not publish an APK.
- [ ] Complete physical-phone/visual acceptance and source-link interaction checks. Browser preview opens; interactive test commands were blocked by automatic approval review.
- [ ] Obtain qualified clinical applicability review before enabling personalized medical recommendations.
- [ ] Integrate remaining DASH/NIDDK/CKD/DGA library and missing nutrients separately; this checkpoint does not activate those rules.

Details and evidence: [Diabetes nutrition education](32-diabetes-nutrition-education.md).

## Authoritative guidance collected — October 14, 2026

- [x] Collect all four requested families: **NHLBI DASH, NIDDK diabetes, NIDDK adult CKD, DGA 2025–2030**.
- [x] Archive eight official-source/rights/index snapshots with retrieval dates and integrity hashes.
- [x] Extract **26 cited entries and two serving tables (128 cells)** with units, population, exceptions and explicit review status.
- [x] Preserve dairy-pattern conflicts, CKD individualization and differences between daily/weekly/meal limits and source serving units.
- [x] Pass snapshot validation and **seven focused tests**; visually verify the DGA table.
- [ ] Integrate the saved library into educational app screens and factual plan comparisons. **Collection is complete; live app integration is not enabled.**
- [ ] Obtain clinical applicability review before personalized rules; expand missing product nutrients and verify privacy/provider gates separately.

Data, sources, restrictions and checks: [Guidance source library](31-guidance-source-library.md).

## U.S. shelf coverage expansion — October 14, 2026

- [x] Confirm OFF eligibility is independent of USDA matching; focus on OFF U.S.-market-tagged products.
- [x] Expand shared groups **33 → 62** and OFF comparison-ready records **220 → 339** (+119). **56** OFF groups populated; combined OFF/USDA eligible coverage **1,036 distinct barcodes**.
- [x] Diagnose remaining OFF exclusions: **668 missing category evidence; 770 unsupported/ambiguous forms; one incomplete nutrient record; one other data/freshness failure**.
- [x] Review new product matches; pass **202 application + three tooling tests**, typecheck/lint, 2,173 returned metric/product pair checks and deployed endpoint/export/access checks.
- [x] Keep all nutrition, freshness, dietary, three-result and tradeoff checks; preserve source timestamps and original nutrition. No inventory claim or clinical gate enabled.
- [ ] Expand evidence-backed classification for the remaining 770 food forms, prioritizing U.S. grocery use; obtain category evidence for the 668 missing it.
- [ ] Rebuild/publish the phone client after concurrent Shelf Benchmark edits settle. Android compilation/signature checks succeeded, but source-change provenance protection correctly blocked publishing this run.
- [ ] Complete physical U.S. package and phone acceptance using the updated client.

Details: [U.S. shelf expansion and exclusion analysis](29-us-shelf-comparison-expansion.md). Prior checkpoints below retain their historical counts.

## Comparison category expansion — October 14, 2026

- [x] Expand shared categories **20 → 33**; improve OFF source-tag aliases, casing and product-form matching.
- [x] Increase OFF eligible products **89 → 220**, across **27 populated groups** (previously 12). Reclassify existing source versions without refreshing dates or altering nutrition.
- [x] Validate 1,539 returned metric/product pairs; 206 OFF products have at least one improving OFF alternative. Retain nutrition, freshness, dietary restrictions, tradeoffs, deduplication and maximum-three checks.
- [x] Pass **200 application + three tooling tests**, typecheck/lint, production HTTPS checks for 27 groups, four brand searches, export/access checks and portfolio health.
- [x] Improve retailer-brand comparison counts: Wegmans **6**, Walmart **43**, Price Chopper/PICS **1**, Whole Foods/365 **39**. Inventory remains unverified.
- [x] Rebuild signed ARM64 Android preview; validate bundled JavaScript, manifest/security settings and current-source provenance. Physical-device validation remains pending.
- [ ] Complete physical-label/phone acceptance and distribute the updated client; old installed clients do not understand the expanded schema.
- [ ] Broaden evidence-backed coverage for the remaining 1,559 ineligible OFF records; preserve strict form/category checks and acquire fresher source data where needed.

Detailed rules, coverage and evidence: [Comparison category expansion](28-comparison-category-expansion.md). Older counts below are historical checkpoints.

## Open Food Facts expansion — October 14, 2026

- [x] Record user-confirmed API usage form submission.
- [x] Import **1,774 additional validated OFF records** from the official pinned export: OFF **1,779**, combined **4,677 records / 4,601 distinct barcodes**; 1,712 OFF barcodes absent from USDA.
- [x] Expand OFF retailer-brand coverage: Wegmans **65**, Walmart brands **314**, Price Chopper/PICS **78**, Whole Foods/365 **244**. These are source-brand associations, never branch-stock claims.
- [x] Connect **89 OFF records across 12 categories** to the existing comparison engine; keep unqualified products searchable without inventing alternatives.
- [x] Validate **197 application + three tooling tests**, typecheck/lint, live mobile-parser searches for all four chains, comparison/restriction checks and full public export. Both services/portfolio healthy; existing native source provenance verified.
- [ ] Broaden beyond this partial 10,000-candidate snapshot: upstream export host returned HTTP 429. Retained complete downloaded rows; no automatic retry. Improve resumable acquisition without repeating first-subset imports.
- [ ] Fill real barcode/package gaps, especially Price Chopper eligible comparisons (now one store-brand match after category expansion) and cereals. Complete physical-phone/store acceptance separately.

Source/rejection counts, limitations and operator evidence: [OFF catalog expansion](27-open-food-facts-expansion.md).

## Open Food Facts enabled — October 14, 2026

- [x] Record user approval for ODbL catalog redistribution and app contact identity.
- [x] Enable bounded validated OFF barcode lookups and cache; preserve existing comparison/privacy gates.
- [x] Publish free complete product catalog and attribution at https://grocery.serveforwad.com/data-sources . No personal data or product photos included.
- [x] Add source-aware phone wording and clickable license/download links; build updated signed ARM64 client.
- [x] Verify 190 application + three tooling tests, typecheck/lint, live staging and production imports, uncached authenticated HTTPS lookup, public download/access controls and portfolio health.
- [x] User confirmed OFF API usage form submitted October 14; [exact entries and operating instructions](26-open-food-facts-setup.md).
- [ ] Validate new client on physical phones; iPhone signing/build/device gates remain separate.
- [ ] Expand OFF coverage from real observed scan misses or official bulk exports; five OFF records verify integration, not broad coverage.

Current catalog: **2,903 source records (2,898 USDA + five OFF)**. Full integration notes and evidence: [Open Food Facts setup](26-open-food-facts-setup.md). Older checkpoints below describe their state at the time.

## Shelf Scan — newly specified October 14, 2026

**Cadence update:** User selected 2 images per second (500 ms). Detailed spec v1.1 and SS-T23 require capture timing and actual identification throughput/coverage measurements on the physical iPhone; existing processing bounds and spending caps remain. No runtime performance is claimed.

[Detailed Shelf Scan implementation specification](26-shelf-scan-implementation-spec.md) is ready for implementation review (v1.1). Recommended languages: shared TypeScript, Swift for native iPhone capture/preprocessing, Kotlin for Android parity. Begin with SS-WP-01 iPhone compatibility/build spike and SS-WP-02 transient state/UI; retain real-data privacy and clinical gates. The user explicitly plans to test on iPhone. SS-T01–23 define acceptance. No Shelf Scan code, build or paid API call was performed by this planning pass.

**Status: pending implementation and device validation.** Implement REQ-SHELF-01–05 and design section 7.7 under WP-03/WP-07/WP-08. User approved health-profile ranking, accumulated aisle products, within-category comparisons, deferred uncertain matches and explicit controls. Preserve earlier scan runs when starting another; clear all shelf runs only at app closure/termination, using memory-only storage. Backgrounding pauses capture. Do not change ordinary saved history, reports or preferences. This planning update changed no application code and claims no runtime tests.

## Section 11 completion workstream — October 14, 2026

All eight source families and all seven retailers (the original six plus Whole Foods) remain in scope. Larger USDA counts are not retailer acceptance or inventory verification.

| ID | Pending completion | Independent engineering delivered/prepared | External completion dependency |
|---|---|---|---|
| S11-01 | USDA freshness and missing-product coverage | Bounded batch refresh with dry run, missing-record handling and audit output | Current package evidence for unresolved/reformulated products; no new USDA account |
| S11-02 | Open Food Facts coverage and phone acceptance | Read integration enabled; validated cache, source-aware attribution, complete public ODbL download, live checks and ARM64 build | Form/contact/reuse resolved. Physical package/phone verification and broader export coverage pending; photos excluded |
| S11-03 | Manufacturer/package evidence | Exact-product, market, date and evidence-scope validation; public-evidence review workflow | Current manufacturer/package evidence; rights for reuse; personal uploads must not populate shared catalog |
| S11-04 | Retailer data, all seven chains | Evidence scope/expiry validation and per-chain coverage evaluation | Authorized feed/listing reuse rights; branch-specific inventory access to claim stock |
| S11-05 | Places | Directory audit and Target/Walmart department-store filter; upstream fetch retry pending | Actual tester branches/addresses and physical location checks; broader region if needed |
| S11-06 | Medical organization evidence | Reference/review register and release checklist using existing signed-rule pipeline | Qualified clinical reviewer, approved applicability/thresholds/explanations and reference cases |
| S11-07 | Monash/FODMAP | Rights and evidence register; preserve measured/ingredient-inference distinction | Written data rights/license and scoped measured/certified data; no access assumed |
| S11-08 | Dietary certification | Exact barcode/market/authority/expiry validation; no automatic compatibility activation | Approved authorities/criteria (Q-08), authoritative product evidence and permitted reuse |
| S11-09 | Retailer acceptance | 350-slot basket template: 50 products × seven chains, ten categories; evaluator and honest baseline report | Representative real branch/product observations; agree pass thresholds (Q-13) |
| S11-10 | Cross-source governance | Auditable source/evidence records, unknown/stale/conflict behavior, regression tests | Rights and qualified sign-off where applicable; no approval can be fabricated |

**Prior engineering checkpoint (before OFF activation):** bounded USDA batch refresh; public evidence registry/import/history and scope/rights/conflict checks; seven-chain acceptance evaluator and 350-slot template; OFF staged normalization with production disabled; source and clinical-reference registers; places audit and department-store filter/query support. **182 application + 3 tooling checks passed**, live USDA batch verified, existing Android source provenance preserved.

**Still incomplete:** real manufacturer/retailer/certification/FODMAP evidence and provider connections; qualified clinical approval and consumer integration with approved data; all seven real acceptance baskets and Q-13 thresholds; physical-phone/branch checks. Map expansion retrieval timed out twice; old directory retained. That retry is engineering work awaiting upstream availability, not a user account dependency.

Full per-source status, exact user inputs, proposed acceptance thresholds, operating instructions and evidence: [section 11 completion register](25-section11-sources-and-dependencies.md). No providers/testers were contacted, no licenses purchased, no personal processing enabled.

## Current checkpoint — October 14: broader grocery and retailer-brand catalog

- **Delivered:** 175 → **2,898 food records**, 2,889 distinct barcodes, **706 comparison-ready products across 20 categories**. New coverage includes pasta/sauces, salsa/hummus, cheese, tortillas, chips/pretzels/popcorn and almond products.
- Store-brand lookup batch: Wegmans **55**, Walmart brands **254**, PICS/Price Chopper **24**, Whole Foods/365 **295**. These are source-brand matches, not current-store assortment/stock. PICS/Price Chopper has **zero comparison-ready store-brand records** in this import; many source records are too old.
- Brand-name search, shared category validation, source-category corroboration, and up to 500 eligible candidates per group are implemented. Dietary restrictions, missing-data checks, source freshness and unknown-stock labels remain enforced.
- **Verified:** 172 application + 3 tooling tests, type checking/lint, live mobile-parser API checks across all 20 groups and all four brand searches/barcode samples, signed Android builds, and emulator new-category lookup/scrolling/offline saved comparisons.
- **Next:** distribute the new client (old builds support only six groups), perform physical iPhone/package checks, fill observed retailer/category gaps, and maintain catalog freshness before the seven-day comparison expiry. No scheduled refresh or inventory feed was created.
- Full coverage, provenance, operator steps, limitations and evidence: [expanded grocery catalog](24-expanded-grocery-catalog.md).

## Prior checkpoint — October 13: expanded catalog and real alternatives

- **Delivered:** USDA catalog expanded from 16 to **175 foods** (166 barcode-bearing records), with **160 comparison-eligible records across six food categories**.
- The public-food screen automatically displays up to three horizontally scrollable alternatives. Users can compare saturated fat, sodium, total sugars or fiber; equal-weight differences and worsening nutrients are shown explicitly.
- Dietary restrictions are evaluated locally; unverified required claims prevent compatibility suggestions. No health profile or GPS is sent to the comparison endpoint. Clinical guidance and personal-data gates remain unchanged.
- **Verified:** 169 application + 3 tooling tests, type checking/lint, live authenticated HTTPS across all six categories, matching-source ARM64/x86_64 builds, native barcode lookup with three alternatives, horizontal scrolling, and offline restart with saved comparisons. Changing the comparison criterion correctly updates results.
- Product availability is **unknown**. Instacart's public applications are currently closed with no waitlist, and standard public IDP does not establish direct branch-stock access. Proposed retailer links/observations are not yet implemented.
- **No new external account is needed for this delivered feature.** Existing signed iPhone distribution and physical-device/package testing remain pending.
- Evidence, category counts, validation rules, maintenance and limitations: [real catalog alternatives checkpoint](23-real-catalog-alternatives.md).

### Next steps
1. Physical iPhone testing and grocery package verification after signing/distribution access is available.
2. Expand categories/brands based on missing tester scans; continue staged source validation and bounded refresh.
3. Add verified dietary evidence and reviewed clinical rules before personalized compatibility/health claims.
4. Pursue authorized retailer availability separately; keep store-stock uncertainty explicit.

## Prior checkpoint — October 13, 2026 (New York): automatic store location

- **Implemented:** automatic foreground location permission after setup; conservative likely-store selection; manual correction/search; denial, inaccurate and ambiguous-location fallback; persistent off preference; foreground-only GPS watcher.
- **Places source:** OpenStreetMap served from our own public backend directory, with attribution and ODbL licensing. Initial scope is **2,012 Massachusetts grocery/convenience listings**, 842 with mapped footprints. No paid places account/key is needed. Missing/outdated branches remain possible.
- GPS coordinates stay in phone memory. A separate encrypted store-directory cache supports offline search/matching; no coordinates or current store selections are in backups. Personal health/photo/report uploads remain locked.
- **Verified:** 164 application tests + 3 tooling checks, type checking/lint, ARM64 and x86_64 Android release builds, automatic native permission prompt and simulated store matching, offline restart, denial/manual selection, off-preference persistence, background GPS removal and reset clearing the directory. Linux iOS prebuild passed; **iOS compilation and physical-device acceptance remain pending**.
- Backend public directory returns HTTP 200; protected catalog without tester access returns HTTP 401; portfolio returns HTTP 200. The public directory is the deliberate exception to earlier “all beta routes authenticated” descriptions.
- **Inventory is not connected.** Tester priorities: Wegmans, Walmart, Price Chopper/Market 32 and Whole Foods. First investigate approved Instacart access for Wegmans/Price Chopper, then retailer-specific routes for Walmart/Whole Foods. Access must allow exact branch/product availability and display/cache rights; ordinary shopping sites and marketplace seller APIs do not establish this.
- Next physical acceptance: iPhone permission grant/denial/reduced accuracy, arrival and departure, adjacent stores, offline restart, home/cellular access and indoor GPS accuracy. Existing Apple activation/App Store Connect and secure Expo login/signing dependencies remain.
- Detailed behavior, evidence, maintenance instructions and retailer execution plan: [store location and inventory checkpoint](22-store-location-and-inventory.md).

### Next work and dependencies
1. **Ready for device testing:** install the signed build and test the listed stores. Physical iPhone/signing access required; no additional places account.
2. **Inventory access investigation:** obtain approved Instacart developer access and verify coverage/entitlements for Wegmans and Price Chopper. Walmart and Whole Foods require separately verified authorized routes. No provider account/contact was created automatically.
3. **After access:** map exact branches and GTINs, implement server-only credentials and a timestamped availability adapter, test unknown/stale/outage behavior and physical shopping results. Availability remains unknown until those checks pass.
4. **Coverage expansion:** review actual tester branch records and expand beyond Massachusetts only when the required geography is known.
5. **Still separate:** broader food catalog curation, clinical/privacy/provider gates for real health information, iPhone/TestFlight acceptance and student demonstration/tester feedback.

The public USDA catalog remains 16 foods including seven branded barcode records. Public fictional AI results remain cached; no paid AI calls were added. Earlier six-step status and detailed evidence are retained in [the prior catalog checkpoint](21-beta-catalog-network-checkpoint.md). Earlier entries below are historical.

## Purpose and how this plan is maintained

This is the working task list for implementing Beta 0. Update it when work starts, reaches a meaningful milestone, passes verification, or encounters a concrete dependency. Record completed work and remaining work separately; code written is not the same as behavior verified on a phone.

The [requirements specification](01-requirements-specification.md) owns approved scope. The [design and implementation specification](02-design-and-implementation-specification.md) owns architecture and aesthetics. This plan organizes execution; the [implementation log](04-implementation-log.md) records detailed evidence and the [requirement traceability](05-requirement-traceability.md) tracks acceptance. Existing design work-package identifiers WP-00–WP-10 remain unchanged. Project identifiers below are execution groupings, not replacement requirements.

Status meanings:

- **Not started:** implementation has not begun.
- **In progress:** implementation or its necessary checks remain.
- **Implemented, verification pending:** code exists, but required integration/device checks have not passed.
- **Blocked:** a named dependency prevents a specific next step. Unrelated work continues.
- **Complete:** the task's completion criteria have passed and evidence is recorded.

Checkboxes mark completed individual tasks, not completion of the whole sub-project.

## Approved working decisions

- Finish all locally achievable Beta 0 work before stopping at dependencies that require external access, decisions, expertise, or hardware.
- Both iPhone and Android are required. A browser preview is a development aid, not a completed phone release.
- No app login. Personal settings and compact results remain on the device; original report/product/receipt media are not retained as attachments.
- Real personal processing remains disabled until redaction, provider retention and native privacy verification pass.
- The user does not yet have Apple Developer enrollment or an OpenAI API project. Request these at the stage where they are needed; continue independent engineering now.
- Branding, product name and logo remain open for a separate discussion.
- Preserve the documented lively warm palette, “Your Health & Grocery Companion” heading, bold introduction, compact nutrition/ingredients, stated 1× portion, and immediate illustrated alternatives with up to three horizontally scrollable results.
- Detailed aesthetics review occurs when the app is ready on phones for the two testers.

## Sub-project overview

| ID | Sub-project | Current status | Design work packages | Completion evidence |
|---|---|---|---|---|
| B0-01 | App foundation and aesthetics | In progress; visual baseline implemented | WP-01, WP-07 | All journeys use the agreed design; responsive, accessible navigation passes phone review |
| B0-02 | Onboarding and health profile | In progress | WP-03, WP-07 | First-run setup, validation, editing, persistence and historical context tests pass |
| B0-03 | Private storage and data controls | In progress; native verification pending | WP-01, WP-07, WP-08 | Encryption, backups, deletion, restore and lifecycle checks pass on both phones |
| B0-04 | Product capture and assessment | In progress; synthetic journey available | WP-02, WP-03 | Capture-to-result flow passes exact/ambiguous/missing/fresh-food cases with verified evidence |
| B0-05 | Alternatives and store context | In progress; synthetic suggestions available | WP-02, WP-04 | Compliant ranking, retailer evidence, branch selection, radius and directions pass |
| B0-06 | Receipt review and basket feedback | In progress; synthetic review available | WP-05 | Mixed/partial/no-food receipts, correction, quantities and retailer-specific swaps pass |
| B0-07 | Lipid-report workflow | In progress | WP-06 | Redacted source-to-confirmation-to-analysis journey and recovery cases pass |
| B0-08 | Clinical rules and evidence | Framework implemented; clinical content/approval pending | WP-02, WP-10 | Versioned rules, source traceability, applicability cases and clinical approval |
| B0-09 | Service integrations and privacy | In progress; personal routes disabled | WP-00, WP-01, WP-02, WP-08 | Verified redaction and provider contracts, access controls, retention and failure handling |
| B0-10 | Verification and two-phone rollout | In progress | WP-00, WP-08 | All release gates pass; complete journeys verified on one iPhone and one Android |

## Detailed task list

### B0-01 — App foundation and aesthetics

- [x] Establish Expo/React Native workspace, navigation and shared UI components.
- [x] Implement scan-first home, selected palette and requested copy/layout refinements.
- [x] Document the look-and-feel baseline in design sections 5.1–5.2.
- [ ] Apply and review the baseline across all completed workflows.
- [ ] Verify large text, touch targets, screen-reader order and platform navigation.
- [ ] Conduct the deferred aesthetics review on the testers' phones.

**Boundary:** Branding remains open by user choice. It does not block functional implementation.

### B0-02 — Onboarding and health profile

- [x] Include all eight condition selections, primary concern, intent and independent dietary choices.
- [x] Add a first-run profile editor and explicit save action (new code; full verification pending).
- [x] Add age 21+ validation and explicit pregnancy context choices.
- [x] Verify onboarding navigation, validation errors and successful completion in the running browser app (native checks pending).
- [x] Verify serialized persistence, profile revisions and saved context through automated tests. Physical relaunch remains in the phone matrix.
- [x] Implement profile corrections and test all condition/restriction subsets across pregnancy contexts and age 21/80. Clinical reference outcomes still require review.

**Boundary:** Profile UI can be completed locally. Clinical conclusions for selected populations require B0-08.

### B0-03 — Private storage and data controls

- [x] Implement strict compact snapshot schemas and native SQLCipher/SecureStore repository code.
- [x] Add transactional writes and fail-closed handling for unavailable keys/cipher support.
- [x] Implement authenticated encrypted archives, passphrase controls and preview-before-replace restore.
- [x] Add Android backup-exclusion configuration and iOS backup-exclusion plugin code.
- [x] Add startup export-scratch cleanup and native screen/app-switcher protection code (verification pending).
- [x] Verify the serialized session store against write failures and concurrent actions with automated tests.
- [x] Automated archive limits/tamper/malformed/restore and interrupted-session recovery checks pass; OS behavior still needs phones.
- [x] Automated deletion, cancellation, delayed response and restore races reject stale writes.
- [ ] Inspect actual native database, cache, backups, key lifecycle and share-sheet behavior on both platforms.

**Boundary:** Native code and automated logic checks can progress locally. Physical encryption, backup and OS lifecycle guarantees require native builds and device evidence.

### B0-04 — Product capture and assessment

- [x] Implement sample product confirmation, result categories, explicit uncertainty and saved snapshots.
- [x] Show compact nutrition and ingredient evidence with an explicit 1× portion basis.
- [x] Distinguish synthetic generic fresh-food estimates from packaged-product fixtures.
- [x] Implement native barcode capture, permission-denial recovery and manual fallback; browser checksum behavior verified, camera device verification pending.
- [x] Implement guarded camera/document adapters and fictional label reading/review with editable identity/variant and no inferred certifications.
- [ ] Validate real recognition, sanitization and ambiguous variants against approved product sources and phone evidence.
- [x] Add generic fresh-food preparation and comparison-weight confirmation; unsupported preparation keeps nutrition unknown and never asks for a nonexistent label.
- [ ] Connect licensed product evidence and reviewed assessment rules.
- [x] Verify missing nutrition remains unknown, unreviewed evidence cannot become a positive rating, and conflicts retain precedence.

**Boundary:** Camera testing needs a native device; live product evidence needs B0-09 data-source access; real health ratings need B0-08.

### B0-05 — Alternatives and store context

- [x] Show inline illustrated alternatives, capped at three with horizontal scrolling.
- [x] Apply synthetic same-purpose, restriction and retailer-preference filtering.
- [x] Preserve honest no-match behavior and adjustable retailer/radius settings.
- [x] Complete synthetic ranking/equal-weight tradeoff and serving-size regression tests.
- [x] Add local manual search area, guarded one-time foreground location and explicit branch confirmation/directions code. Live location and branch retrieval require provider/privacy verification.
- [ ] Add sourced nearby branches, approximate-distance ordering and directions.
- [ ] Validate catalog coverage and availability wording for each required retailer.

**Boundary:** A verified product listing and retailer evidence are required before making live availability claims. Do not fabricate branch locations or stock.

### B0-06 — Receipt review and basket feedback

- [x] Implement synthetic receipt review with match correction, line classification and purchase quantity editing.
- [x] Show unresolved/excluded coverage, item assessments, inline swaps and history save/reopen/delete.
- [x] Keep purchase quantities distinct from consumption portions.
- [x] Implement sample basket summary, duplicate flags, reversible removal, refund exclusion and weighted-purchase handling; six domain tests pass. Real extraction acceptance remains pending.
- [x] Add an explicit receipt-retailer versus current-shopping-retailer choice for swaps.
- [x] Verify sample partial/no-food/unknown-catalog cases and decimal quantity correction logic; native UI checks remain pending.
- [x] Connect fictional receipt image reading/reconstruction/extraction to unmatched draft and correction UI; cleanup failure blocks review.
- [ ] Validate arbitrary receipt redaction and native cache cleanup before enabling personal capture.

**Boundary:** Real capture/extraction depends on B0-09; verified product matches and swaps depend on B0-04/B0-05.

### B0-07 — Lipid-report workflow

- [x] Implement optional synthetic source-linked value/date review and confirmation.
- [x] Save compact reports, select current confirmed panel by test date and reopen saved results.
- [x] Add unit/comparator correction and removal of absent measurements (new code; verification pending).
- [x] Implement coordinator code for in-flight suppression, cancellation, explicit retry, pending local-save recovery and stale-response protection (tests pending).
- [x] Automated coordinator tests pass for double taps, cancellation, timeout, uncertain outcomes, save failure, deletion and restore races. Native interruption/navigation checks remain.
- [x] Preserve printed range/flag/page/comparison, keep ambiguous dates unknown, support source revisions and saved same-date conflict choices.
- [ ] Connect image/PDF extraction and reviewed interpretation after automatic redaction.
- [x] Verify fingerprint-based duplicate reuse and latest-date/tie selection.
- [ ] Apply confirmed context through clinically approved food rules; rule decisions are not yet available.

**Boundary:** No standalone manual clinical panel entry. Current editable values belong to synthetic report fixtures. Real sources require the verified pipeline, OpenAI access/retention configuration, and reviewed clinical rules.

### B0-08 — Clinical rules and evidence

- [x] Implement source/rule contracts, Ed25519 verification, expiry/revocation/rollback, durable trust, app manager, bounded downloads and offline signing/publication preparation. Production clinical content and trust configuration remain absent.
- [x] Prepare draft candidate-evidence/uncertainty cases for all eight conditions and population/restriction overlaps in 14-draft-evidence-review-cases.md; executable conservative matrix passes. This is not a clinical rule mapping or approval.
- [x] Prepare the clinical-review worksheet and required reference-case matrix in 06-beta0-integration-handoff.md. Substantive draft clinical mappings and review remain pending.
- [ ] Establish a qualified reviewer and obtain approval before publishing clinical rules.
- [ ] Integrate approved rules and verify source/version traceability for material claims.

**Boundary:** Engineering and draft test work continue without a reviewer. Clinical approval cannot be substituted by AI output or passing software tests. No reviewer outreach is authorized by this plan alone.

### B0-09 — Service integrations and privacy

- [x] Provide a local fixture service that rejects personal processing and does not echo uploaded content.
- [x] Keep real processing disabled and provider secrets out of the mobile app.
- [x] Implement strict extraction output parsing and a bounded public-catalog adapter with injected-response tests. Personal upload/redaction/provider integration remains pending.
- [x] Implement Android/iOS local OCR/PDF and fresh-canvas reconstruction source with no original-content fallback. Android packaging passes; Swift compilation and real-source privacy validation remain.
- [ ] Validate identifier removal, metadata stripping, cancellation and temporary-media cleanup.
- [ ] Verify product, certification, retailer and location sources: rights, access, freshness and coverage.
- [ ] Configure OpenAI extraction/analysis only after project access and compatible retention controls are established.
- [ ] Resolve hosting, short-lived operational metadata, abuse controls and deployment configuration.

**Boundary:** An API key alone does not establish compatible retention. Q-05, Q-09 and Q-14 remain explicit dependencies before their affected live features are enabled.

### B0-10 — Verification and two-phone rollout

- [x] Establish TypeScript, lint and automated domain/service checks.
- [x] Verify the prior increment: 17 tests passed; all-platform JavaScript exports passed; Android prebuild passed.
- [x] Add native development/internal build profiles without creating paid accounts.
- [x] Verify current TypeScript/lint and 145 application tests plus tooling checks; browser label/receipt/report intake, correction and date-conflict flows pass. Native runtime verification remains pending.
- [x] Triage dependencies, verify UUID/decoder remediations and document outstanding upstream advisories and release exposure limits.
- [x] Produce and inspect a standalone internally signed ARM64 Android preview; record artifact hash and signing details.
- [ ] Produce an installable iPhone test build once macOS/signing access is available.
- [ ] Run the full phone test matrix, including offline/error/privacy/accessibility cases.
- [x] Reconcile all requirement rows with current source/test evidence and explicit residual acceptance gaps; full-release acceptance remains open.
- [ ] Complete release gate review, then prepare instructions for the two beta testers.

**Boundary:** No tester invitations, account enrollment or purchases have been performed. Native build/signing access and phones are required for rollout.

## Execution order

1. Finish and verify B0-02 onboarding, B0-03 local state/privacy lifecycle, and B0-07 report coordination.
2. Finish locally implementable capture/recovery and receipt work in B0-04/B0-06.
3. Complete remaining local ranking, contracts, evidence framework and synthetic integration tests in B0-05/B0-08/B0-09.
4. Run B0-10 checks throughout, then attempt the native build path supported by available tools/access.
5. Stop only the affected work at a concrete external dependency; continue all independent tasks.

## Dependency register

| ID | Dependency | Needed for | Current state / next action |
|---|---|---|---|
| DEP-01 | Apple signing/build access | Installable iPhone test build and distribution | No Apple Developer enrollment; identify the usable signing path when native build work reaches it |
| DEP-02 | OpenAI API project and compatible retention configuration | Live report/product/receipt AI processing | User will create project when needed; retention eligibility/configuration must also be verified |
| DEP-03 | Product/retailer/certification/location source access and rights | Verified identification, alternatives and store guidance | Research and adapter preparation can proceed; no adequate live coverage established |
| DEP-04 | Qualified clinical review | Publication of health rules and report interpretations | Draft engineering proceeds; reviewer approval remains external |
| DEP-05 | Native toolchain/build service and physical phones | Platform compilation, encryption/privacy checks and end-to-end acceptance | ARM64 development APK built and signed on project-server; standalone internally signed ARM64 preview built; physical-device verification pending |
| DEP-06 | Hosting and allowed operational metadata decisions | Public service deployment and abuse controls | project-server selected; persistent synthetic service running; public routing, abuse controls and Q-14 unresolved |

These dependencies are not blanket reasons to stop development. Each blocked task must name the exact dependency, the failed/unavailable step, and the work completed before it.

## Update history

| Date | Update |
|---|---|
| October 5, 2026 | Created at the user's request from the implementation task list. Recorded the existing sample workflows, storage/archive work, new onboarding/coordinator work awaiting verification, current execution order and external dependencies. |

## Historical execution checkpoint — October 5, 2026

Current evidence: TypeScript/lint pass and 31 automated tests pass. The expanded test set covers session write failures, concurrency, report cancellation/timeout/retry/save-first behavior, delayed response rejection after deletion/restore, extraction schema rejection, rule applicability, catalog limits/unknowns and branch ordering. Final all-platform JavaScript export passed after the latest report/source-field refinements; detailed evidence is recorded in the implementation log. Browser onboarding and barcode fallback were checked against the restarted development server.

Native Android compilation was attempted and stopped before compilation because Java/JAVA_HOME is absent. No APK or IPA exists. Native build provisioning is the immediate integration dependency, followed by real-device privacy/OCR/PDF validation. OpenAI access/retention, source adoption/coverage, clinical review and hosting decisions remain separate dependencies.

Receipt summary, possible-duplicate indication/removal, quantity-unit correction and retailer switching are now implemented; full real-receipt extraction is not. Report unit/comparator correction, printed-source fields and recovery coordination are implemented; real report extraction and clinical interpretation are not. Distance/radius/directions helpers and a public-catalog adapter exist but are not connected to a live branch/product service.

Read [the integration and clinical-review handoff](06-beta0-integration-handoff.md) for exact blockers, security findings and device acceptance steps. Unchecked tasks above remain real engineering work; this checkpoint does not claim that the entire Beta 0 implementation is finished or that all remaining work is external.


## Remote development checkpoint — October 6, 2026

Authoritative workspace: /path/to/NutriGlimpse/ on project-server. The laptop is the Codex/browser interface and recovery copy. All 442 migrated files matched the transfer archive. Remote TypeScript, lint, 31 tests and all-platform JavaScript exports pass. Browser onboarding and home rendered successfully through SSH forwarding. Node 24, Java 17 and Android SDK tooling are installed project-locally; native compilation is underway. Persistent preview/backend services are enabled independently of the unchanged portfolio services.

DEP-06 hosting is selected: project-server. Public routing, abuse controls and Q-14 remain open. DEP-05 no longer lacks Java; native build/device checks and macOS/signing remain open. See [remote operations](07-remote-development.md) for commands, inventory and administrator-only dependencies.

### Android build result — October 6, 2026

Native ARM64 development build passed on project-server: BUILD SUCCESSFUL in 8m 13s, 664 tasks. APK: /path/to/NutriGlimpse/apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk (approximately 97 MB). APK signature verified using v2. SHA-256: dd4478eb02083aeceb03873c7724e04adac8ba5d96d634fea07eff25f3367f97. This supersedes the earlier missing-Java/no-APK checkpoint. It is a debug development-client build requiring Metro, not the standalone beta release. No physical phone testing or native privacy acceptance has been performed.

## Active increment — October 6, 2026: receipts and standalone Android preview

- [x] Receipt summary separates matched, unresolved and excluded lines; returns are excluded without inventing a matching purchase.
- [x] Duplicate warnings preserve both purchases until explicit correction; latest removal can be undone.
- [x] Quantity editing preserves decimal/comma drafts; invalid values cannot save; purchase weights never scale assumed consumption.
- [x] Unknown catalog references cannot inflate matched coverage; duplicate receipt-line identifiers fail validation.
- [x] TypeScript, lint and 37 automated tests pass on project-server.
- [x] Browser verifies invalid quantity blocks save; remove/undo works; 1.25 persists through save and history reopen.
- [x] Build standalone ARM64 Android preview with bundled JavaScript and dedicated internal signing; APK signature/manifest gates pass.
- [ ] Physical Android startup, offline storage, encrypted export/restore, privacy and camera verification.
- [ ] Implement native photo/PDF OCR and automatic redaction. This remains unfinished engineering, not an account blocker.

The user-linked laptop plan is refreshed from this authoritative remote document after checkpoints. Other laptop source files remain a migration backup.

## Historical standalone preview checkpoint — October 6, 2026

Standalone Android preview produced successfully (final incremental build: 2m 55s). Artifact: artifacts/android/health-grocery-beta0-preview-arm64.apk. Size: 57,602,368 bytes. SHA-256: 71a206a90a4c82d66d254e351a413c24a1b13a68e5ae747778d03cd05d6d24cd.

Packaging verification: dedicated internal signing certificate verified; bundled JavaScript present; non-debuggable; allowBackup=false and device-transfer rules present; broad storage/media/overlay permissions absent. These are packaging checks, not physical-device privacy evidence. TypeScript/lint and 37 tests pass after final changes. Existing portfolio endpoint still returns HTTP 200.

Read [Android preview installation and test guide](08-android-preview-guide.md). APK and guide are also copied to the laptop for access. No app-store upload or tester invitation performed.

**Next independent engineering:** native image/PDF/OCR/redaction pipeline, richer product/alternatives evidence integration, and remaining report correction/context behavior. **Phone dependency now actionable:** install and verify startup, offline operation, persistence, export/restore, camera and privacy behavior. Full Beta 0 remains incomplete; no claim that all remaining tasks are external.

## Work through 8 pm — October 6, 2026

The user authorized independently achievable development through 8 pm Eastern today. Continuation checks every 30 minutes and an 8 pm handoff are scheduled in this chat.

- [x] Android/iOS local input-module source: bounded image/PDF processing, OCR, temporary sessions and cancellation/cleanup.
- [x] Android module compilation and standalone APK build passed (3m 1s); signature/bundle/manifest gates passed.
- [x] Experimental report reconstruction on fresh images, with explicit no-disclosure flags; fictional native diagnostic added.
- [x] Backend global limiter without client identifiers, request bounds and malformed-input/body/query rejection.
- [x] TypeScript/lint and 48 tests pass; restarted backend health and portfolio HTTP 200 verified.
- [ ] Swift compilation on macOS and physical-phone diagnostics.
- [ ] Representative privacy/OCR/native-cleanup/outbound-byte validation before real input is enabled.

### Remaining independent queue

1. Photo/document selection and lifecycle integration behind the real-input gates; synthetic PDF/layout/rotation/error fixtures.
2. Product/receipt extraction contracts and synthetic adversarial cases implemented. Sanitization, correction UI and provider integration remain; the report-only lexical policy does not solve these inputs.
3. Report correction/revision workflow completed for fictional source-linked reports; remaining: real-source duplicate reuse, date ambiguity/conflicts and reviewed confirmed-context behavior.
4. Equal-weight sample comparisons and restriction/reference tests completed; reviewed clinical tradeoff ranking and real-source coverage remain open.
5. Signed verification plus persisted sequence/update/revocation manager and native adapter implemented; remaining: app-owned trusted update wiring, versioned historical integration and phone persistence tests. Production keys and clinical publication remain gated.
6. Storage/recovery/archive coverage, compatible advisory fixes, accessibility/error-state checks and deployment checks.
7. Artifact rebuilds and the evening dependency handoff.

Details: [native input checkpoint](09-native-input-checkpoint.md). Current APK SHA-256: cbaacf82e246a428571178d25f6901776365690e0a3c7f0a908738744f95fc0c. Real source/provider routes remain disabled. Native privacy acceptance and all independent work are not complete.

## Signed rule-pack checkpoint — October 6, 2026

- [x] Replace caller-provided signature flags with pinned-key Ed25519 verification and opaque, immutable verified handles.
- [x] Reject tampering, expired/future packs, revoked/unknown keys, rollback and invalid evidence provenance.
- [x] Test cached-trust invalidation and preserve clinical/applicability gates.
- [x] TypeScript, lint and 55 automated tests pass.
- [ ] Persist sequence high-water mark and integrate trusted updates/revocation before live pack adoption.

See [signed rule-pack checkpoint](10-signed-rule-checkpoint.md). No clinical pack was published and real-data processing remains disabled.


Standalone Android build passed in 2m 56s; signature, bundled JavaScript and manifest gates passed. APK size: 70308578 bytes; SHA-256: 0acbc2008c767e9d56c30c565f77d9949ff76038fe5578db3d297e4a5e2eca14. Physical-device verification remains pending. Backend synthetic health and existing portfolio HTTP 200 verified.

## Report correction checkpoint — October 6, 2026

- [x] Source-linked correction of an existing confirmed fictional report; no new standalone manual panel entry.
- [x] Editing and cancelling leave saved data intact. Confirming changed date/values/units increments a compact revision, preserves the source fingerprint/import time, clears old analysis and requires explicit new processing.
- [x] Unchanged confirmation reuses the successful saved result.
- [x] Optimistic comparison prevents stale/concurrent corrections from overwriting another edit; failed writes preserve the original. Late responses to an older revision cannot save against corrected values.
- [x] Optional revision metadata keeps prior snapshot/archive files compatible.
- [x] TypeScript/lint and 62 tests pass (seven new correction cases). Browser verified cancel, change confirmation, unchanged confirmation and history reopening with revision 2.
- [x] Standalone ARM64 build passes in 2m 58s, with signature/bundle/manifest checks. Final report source matches the bundle sourcemap.
- [ ] Real-source import fingerprints and duplicate reuse; missing/ambiguous test-date recovery and same-date conflict resolution.
- [ ] Physical-device persistence and correction-flow verification; real extraction and clinical influence remain gated.

This engineering recovery policy replaces the current panel's result on an explicitly confirmed correction; it does not retain an old report-analysis audit trail. Historical product scans remain unchanged. The source fingerprint and import time remain attached to the corrected record. Browser checks use session memory only, not native SQLCipher storage.

APK: artifacts/android/health-grocery-beta0-preview-arm64.apk. SHA-256: b9bfc2348097ca866ecc255b866f6b9973ac73dbbe49a01b574dfe4096a38443. Size: 70311274 bytes. Evidence logs: artifacts/remote/report-revisions-check.log and report-revisions-build.log.

## Comparable alternatives checkpoint — October 6, 2026

- [x] Shared equal-weight label arithmetic uses the original product's 1x serving weight; invalid/missing weights cannot support a comparison.
- [x] Sample suggestions require an actual saturated-fat improvement at equal weight, rather than relying on the fixture label or smaller package serving.
- [x] Inline cards show energy, fiber, saturated fat, sodium and sugars together, including possible downsides. Unknown quantities remain unknown.
- [x] Dietary conflicts, unverified required evidence and unsupported medical context still exclude candidates before retailer ordering.
- [x] TypeScript/lint and 67 tests pass, including five new arithmetic/restriction/ranking cases.
- [x] Browser verified granola-to-oats comparison at 55 g: 5 to 0.69 g saturated fat, alongside all other facts; 1x nutrition basis and inline alternatives remain visible.

The comparison is label arithmetic, not a recommended portion or a validated health ranking. The sample fit label is explicitly tied to the candidate package's own 1x serving. Only one catalog fixture qualifies; the interface still supports up to three without inventing choices. Actual clinical tradeoff policy, source-backed product/retailer coverage and phone accessibility acceptance remain open.

Dependency audit refreshed during this checkpoint: the full workspace still reports 30 advisories (19 high, 11 moderate). This is not a clean audit. Detailed report: artifacts/remote/current-audit.json. Direct advisory roots are braces, decode-uri-component, node-forge and uuid. Next independent security work: investigate compatible transitive patches and validate Expo/native compatibility; do not apply the audit tool's suggested incompatible framework downgrades blindly.


Alternatives Android checkpoint: BUILD SUCCESSFUL in 2m 55s. Signature, bundled JavaScript and manifest checks passed. APK SHA-256: bf3493cd780fbc9444cb801d21ed59b9d1bb73347f5adbd527085589b536097f; 70313498 bytes. Backend synthetic health verified; portfolio HTTP 200. Physical-device validation remains pending.

## Dependency security checkpoint — October 6, 2026

- [x] Patched UUID in the actual Xcode build-tool dependency path; pinned tooling and added consumer/buffer-bound regression check to npm run check.
- [x] TypeScript/lint, 67 application tests and the new tooling check pass.
- [x] Full workspace audit reduced from 30 to 22 findings (19 high, 3 moderate); remaining findings are not waived.
- [ ] Compatible URI-decoder/router remediation and malformed-link runtime checks.
- [ ] Braces/node-forge mitigation/upstream fixes and final release exposure review.

See [dependency security checkpoint](11-dependency-security-checkpoint.md). Framework versions remain unchanged. No personal-data gate was enabled.


Security checkpoint validation: BUILD SUCCESSFUL in 3m 50s. Signature, bundled-JS and manifest gates pass. A final npm ci reproduces the patched UUID tree and passes check:tooling. APK SHA-256: 8a5a2234a20489a8476d1a4b8fdf6f0d076baff9eead434e1fa3c4aad1bbcc0f; 70313498 bytes. Device checks remain pending. Loopback-only bindings verified; backend personal uploads false and portfolio HTTP 200.

## Durable rule-trust checkpoint — October 6, 2026

- [x] RulePackStore serializes updates and verifies before saving; it activates a candidate only after durable write success.
- [x] Accepted sequence and payload digest persist with the envelope. Older sequences and different payloads reusing an accepted sequence are rejected.
- [x] Policy changes invalidate cached handles immediately. A revocation during an in-progress write cannot activate that pack afterward.
- [x] Restart re-verifies stored packs; expired/revoked packs remain inactive while retaining the rollback floor. Invalid metadata prevents initialization.
- [x] Native SQLCipher repository has a separate rule_trust table and transactional write adapter. Storage schema advances to version 2; personal-state reset and archive restore do not touch rule trust.
- [x] TypeScript/lint, 73 tests and tooling check pass; six new lifecycle cases cover restarts, failed saves, concurrency, revocation, expiry and policy mutation.
- [ ] Wire a single application-owned manager to the trusted update entry point; no production key or update source exists yet.
- [ ] Phone migration/SQLCipher persistence testing, trusted key lifecycle, clinical review and production rule publication.

Core and storage integration source are implemented, but the app does not download or activate clinical packs. Test restarts use repository fixtures; physical SQLite/SQLCipher durability remains device acceptance work. Uninstall or external rollback of the entire device database is outside this local high-water mechanism; a trusted release-provided minimum sequence is still required. Downgrading to an older app that supports only database schema 1 will intentionally refuse this newer database rather than rewriting it.


Durable trust Android checkpoint: BUILD SUCCESSFUL in 3m 43s. APK signature, bundled JavaScript and manifest gates pass. SHA-256: 44d859a27d663ae52057aaf9421335dab5fcdd277384b58350144272a830b585; 70320790 bytes. Evidence: artifacts/remote/rule-store-check.log and rule-store-build.log. Backend synthetic health and portfolio HTTP 200 verified. Phone migration and storage acceptance remain pending.

## Barcode symbology checkpoint — October 6, 2026

- [x] Preserve camera-reported format instead of treating every eight-digit payload as GTIN-8.
- [x] Expand full UPC-E (number system 0/1 plus six compressed digits and check digit) into UPC-A before GTIN validation/normalization.
- [x] Reject incomplete UPC-E, unsupported number systems, unknown camera formats and format/length mismatches.
- [x] Manual entry has an explicit UPC-E selector; the normal eight-digit path is EAN-8. Valid native scans populate the normalized GTIN for subsequent manual checks.
- [x] Four new tests cover all compression branches, both number systems, checksum collisions between formats, invalid input and UPC-A/EAN-13 equivalence. TypeScript/lint, 77 application tests and tooling checks pass.
- [ ] Physical Android/iPhone camera format and permission/background lifecycle acceptance.
- [ ] Live source-backed product lookup remains disabled; checksum validity never establishes product identity.

The collision test is material: 05096893 can pass both UPC-E and EAN-8 checksum paths, producing different identifiers. Format must not be inferred merely from length or checksum.

References checked for implementation: Expo SDK 57 camera callback/types (https://docs.expo.dev/versions/v57.0.0/sdk/camera/) and ZXing UPC-E reader/test vectors (https://github.com/zxing/zxing/blob/master/core/src/main/java/com/google/zxing/oned/UPCEReader.java, https://github.com/zxing/zxing/blob/master/core/src/test/java/com/google/zxing/oned/UPCEWriterTestCase.java).


Barcode checkpoint: BUILD SUCCESSFUL in 3m 2s. APK signature/bundle/manifest checks pass. Browser verified invalid and valid manual UPC-E handling without claiming product identity. SHA-256: 2462bc0bdcc88caba6a6dc7743afdd92c257798663399576c4e6ebfb1290c652; 70322166 bytes. Logs: artifacts/remote/barcode-check.log and barcode-build.log. Backend synthetic health and portfolio HTTP 200 verified. Camera-device validation remains pending.

## Camera lifecycle checkpoint — October 6, 2026

- [x] Permission requests are tied to a focused foreground session; a grant arriving after cancellation, backgrounding or navigation cannot reactivate capture.
- [x] Returning to the screen does not automatically restart the camera. A new explicit open is required.
- [x] One scan callback is consumed per camera activation; callbacks/errors from older camera views cannot replace a later result.
- [x] Concurrent permission requests are suppressed, with explicit cancel-request control.
- [x] Barcode edits and manual format changes clear obsolete validation messages.
- [x] TypeScript/lint, 83 application tests and tooling checks pass. Six new lifecycle tests cover late grants, background/return, superseded requests, duplicate callbacks, denial/failure and no permission request while inactive.
- [ ] Actual iPhone/Android permission-dialog, app-switcher, focus and camera behavior remains physical-device acceptance work.

The pure lifecycle guard and native component wiring are implemented; these tests do not simulate the operating system's camera or permission UI. If the OS permission prompt backgrounds/inactivates the app, capture stays stopped and requires another explicit open after returning.


Camera lifecycle native checkpoint: BUILD SUCCESSFUL in 2m 55s. APK signature/bundle/manifest gates pass. SHA-256: 2d096d136a3091d48ccbda5a120ad641566b2f8e160c0e9b5deea317a5078fbe; 70325654 bytes. Logs: artifacts/remote/camera-session-check.log and camera-session-build.log. Backend remains synthetic-only and portfolio HTTP 200 verified. Phone permission/camera acceptance is pending.

## Product/receipt extraction contracts — October 6, 2026

- [x] Strict bounded product-label and receipt response schemas, exercised with synthetic responses.
- [x] Every extracted value retains a page/line reference and uncertainty flag; missing values stay null. References to unavailable or duplicate source lines are rejected.
- [x] Product data separates printed serving basis and units; it cannot introduce certification, retailer membership, fit ratings or a verified identity.
- [x] Receipt descriptions, line classes and printed date text remain review data. No default quantity, assumed date locale, product match or verified basket coverage is invented.
- [x] Unknown action/tool/profile fields, wrong units, negative quantities, duplicate receipt IDs and oversized responses fail validation.
- [x] TypeScript/lint, 89 application tests and tooling check pass; six new extraction-contract tests include instruction-like source text.
- [ ] Product/receipt privacy sanitization, reviewed correction UI, actual provider adapter and representative source evaluation.

Implementation: packages/core/src/foodExtraction.ts and packages/core/test/foodExtraction.test.ts. Parsers return needs-review with verification flags false; they are not wired to an upload route or automatic save. Source-reference validity does not prove the extracted claim is true. Text fields can contain identifying or malicious text; this parser is not a redaction filter and must not authorize transmission or storage of personal data. Existing sample receipt matching remains separate.


Food extraction-contract native checkpoint: BUILD SUCCESSFUL in 2m 56s. APK signature/bundle/manifest gates pass. SHA-256: 1a41116ca38638351e65144b45e62338f75155f04fae4d5fe69dc59cb38f74d2; 70330486 bytes. Evidence: artifacts/remote/food-extraction-check.log and food-extraction-build.log. Synthetic backend health and portfolio HTTP 200 verified. Provider and personal-data processing remain disabled.

## Synthetic multi-page PDF diagnostic — October 6, 2026

- [x] Added a generated two-page PDF fixture to Android and Swift native input source: portrait and landscape pages, fictional identifiers and instruction-like text alongside supported report rows.
- [x] Privacy > Local input test offers separate fictional image and PDF checks. No document picker, personal file access or upload is enabled.
- [x] PDF diagnostic requires both pages to be inspected and reconstructed; incomplete page coverage fails rather than claiming success.
- [x] Coordinator returns counts only and requests owned-file cleanup on success, failure and cancellation.
- [x] TypeScript/lint, 92 application tests and tooling check pass; three added tests cover PDF MIME/two-page work, missing native support/partial coverage and cancellation between pages.
- [ ] Run both diagnostics on Android/iPhone; verify actual OCR quality and temporary-file removal.
- [ ] Compile Swift on macOS. Native source presence and Android packaging do not establish iOS correctness.
- [ ] Additional rotated-image, corrupt/password-protected/oversized PDF and real representative privacy tests.

The diagnostic continues to return privacyVerified=false and outboundAllowed=false. It exercises the PDF path with fictional content; it cannot approve real report redaction or product/receipt sanitization. Platform APIs checked: Android PdfDocument and Apple UIGraphicsPDFRenderer.


PDF diagnostic Android checkpoint: BUILD SUCCESSFUL in 2m 54s. Updated Kotlin module compilation and APK signature/bundle/manifest gates pass. SHA-256: 2579e14249745daeb86d3c3163524b6e6e122aa6312cb12ff6e45cce2dbd894b; 70331510 bytes. Logs: artifacts/remote/pdf-diagnostic-check.log and pdf-diagnostic-build.log. Backend synthetic-only health and portfolio HTTP 200 verified. Swift compilation and physical PDF/OCR/cleanup acceptance remain pending.

## Archive/restore recovery checkpoint — October 6, 2026

- [x] New archive selection immediately clears the previous restore preview; failed/cancelled imports cannot leave an older backup ready for accidental confirmation.
- [x] RestorePreview rejects stale asynchronous results and duplicate confirmation, exposes defensive snapshot copies, and retains a failed-save preview for explicit retry.
- [x] LocalSession integration test proves a failed restore write preserves existing disk state; successful retry replaces it and clears the preview.
- [x] Export/import/restore/reset UI actions share a synchronous operation lock.
- [x] Archive parser rejects short GCM tags and odd-length/invalid hexadecimal ciphertext before key derivation. Export checks random salt/nonce lengths and clears working byte buffers on generation/derivation failures.
- [x] TypeScript/lint, 98 application tests and tooling check pass; six added restore/archive cases.
- [ ] Physical encrypted export/restore, document-provider limits, share-sheet cancellation and native storage failure acceptance.

The restore coordinator holds only the reviewed compact snapshot, not passphrases or original archive bytes. It does not cancel an already confirmed database transaction. The encrypted rule-trust table remains separate from personal archive restore.

Archive/restore Android checkpoint: BUILD SUCCESSFUL in 2m 52s. APK signature, bundled JavaScript and manifest gates pass. SHA-256: a30f8ba727e9a5cb11f4270b4c7767b50a8f85e93ebb30301f9916c4f3ed2c14; 70335286 bytes. Logs: artifacts/remote/restore-check.log and restore-build.log. Personal processing remains disabled; physical document-provider/share-sheet and iOS acceptance remain pending.

## Application rule lifecycle checkpoint — October 6, 2026

- [x] The app initializes one rule manager with the opened native repository; browser preview reports missing durable trust rather than creating fake persistence.
- [x] Initialization is shared; damaged rule metadata disables updates without preventing access to personal records.
- [x] Configured refresh calls coalesce into one request, verify/persist through RulePackStore, and preserve the prior valid pack on update failure.
- [x] Shutdown aborts the configured source and invalidates cached authorization. Late responses cannot write; a transaction already underway may finish retaining its sequence floor, but cannot activate after shutdown.
- [x] App cleanup/startup failure closes its manager. Personal reset/restore remains separate from rule trust.
- [x] TypeScript/lint, 105 application tests and tooling regression pass; seven manager tests cover disabled/missing/corrupt storage, shared requests, synchronous failure/retry, malformed/oversized responses, and shutdown races.
- [ ] Implement and review the actual trusted transport with byte/time limits, release pin/rotation/revocation configuration and persistent lifecycle across any future hot reconfiguration.
- [ ] Production signing custody, approved sources, clinical review and physical SQLCipher/runtime acceptance.

Current app configuration contains no production signing pins or update source. No downloads occur, no verified handle is exposed to the assessment UI, and clinical interpretation remains disabled. A valid signature by itself is not clinical approval. RuleUpdateSource is a trusted-configuration interface, not an HTTP transport or a user-selectable URL. This checkpoint does not complete real rule distribution.

Application rule lifecycle Android checkpoint: BUILD SUCCESSFUL in 2m 55s. APK signature, bundled JavaScript and manifest checks pass. SHA-256: e8c235dde6bfa66a1bda75eb4164fbe21d26fefc2a00d2bc019819a13bc75b6d; 70338994 bytes. Logs: artifacts/remote/rule-manager-check.log and rule-manager-build.log. Backend remains synthetic-only; portfolio HTTP 200 verified. Physical device execution and iOS compilation remain pending.

## Report import identity checkpoint — October 6, 2026

- [x] New report registration checks source identity inside LocalSession's serialized save operation, rather than relying only on a screen snapshot.
- [x] Recognized duplicates return the existing record ID and preserve corrections, status and saved analysis; no analysis is triggered. Conflicting reused IDs or multiple existing records with one fingerprint require review rather than an arbitrary winner.
- [x] Different sources with the same latest test date remain separate and prevent automatic current-panel selection; the report screen now explains unresolved dates and directs users to History.
- [x] Added device-local exact-byte SHA-256 fingerprint helper with domain separation and a 20 MiB input bound. It does not use filenames/OCR/date as identity or retain input bytes.
- [x] TypeScript/lint, 111 application tests and tooling check pass. Six new tests include an independent Node SHA-256 comparison, duplicate preservation, same-date conflicts, malformed imports, serialized concurrency/result reuse and failed-write retry.
- [x] Browser fictional-data flow: confirm values, complete sample workflow, return home and reopen; saved result remains visible without another processing action.
- [ ] Connect fingerprints to a privacy-approved native file-import flow; real imports remain disabled. The current demo uses its existing fixture fingerprint.
- [ ] Test physical file/provider behavior, independently scanned/reencoded copies and user-approved same-date conflict policy. Exact-byte matching intentionally does not recognize visually identical files with different bytes.

No real reports were imported and no provider requests were made. The panel schema still accepts fictional records only. Byte hashing is an integration primitive, not completed real-source ingestion or semantic deduplication.

Report import identity Android checkpoint: BUILD SUCCESSFUL in 2m 54s. APK signature, bundled JavaScript and manifest gates pass. SHA-256: 89e5161f1ee8ff8a068c38aedb64132f5c1fdcfaac79049f0cc2bde4b51093fa; 70341546 bytes. Logs: artifacts/remote/report-import-check.log and report-import-build.log. Backend remains synthetic-only; portfolio HTTP 200 verified. Phone execution and iOS compilation remain pending.

## Invalid native input diagnostic checkpoint — October 6, 2026

- [x] Added restricted native fixture generation for an empty file, corrupt PDF bytes and a 20 MiB + 1 byte file. Files are created only in an owned temporary session; no personal picker or arbitrary fixture path is exposed.
- [x] Android and Swift source implement bounded chunk writes and cancellation checks for the oversized fixture. Android compilation/package evidence follows; Swift remains uncompiled.
- [x] Privacy > Local input test now includes Test invalid file rejection. The coordinator creates and disposes each session separately and never reconstructs invalid input.
- [x] Only the native validation error counts as an expected rejection. Missing module support, fixture creation failure, unrelated reader errors, cancellation, unexpected acceptance or failed cleanup cannot report a passing test.
- [x] TypeScript/lint, 117 application tests and tooling check pass. Six new tests cover all three rejection cases, false-success prevention, cleanup failure, cancellation at allocation/inspection and older builds.
- [ ] Run on physical Android/iPhone and inspect actual temporary-file cleanup. Automated coordinator fixtures do not prove native parser rejection on a device.
- [ ] Add password-protected/over-page-limit PDF and rotated-image fixtures; verify OCR and cancellation behavior across device implementations.

Both diagnostic result types keep privacyVerified=false and outboundAllowed=false. The returned result contains counts only. This increment tests failure handling, not real-data sanitization approval. API reference checked: https://docs.expo.dev/modules/module-api/ with SDK 57 reference https://docs.expo.dev/versions/v57.0.0/.

Invalid input Android checkpoint: BUILD SUCCESSFUL in 2m 54s. Updated Kotlin module compiled; APK signature, bundled JavaScript and manifest checks pass. SHA-256: e33144461b90ced1701fc5dfa2f615bd02b8b1096e7b0805dd306d96ed56e329; 70345402 bytes. Logs: artifacts/remote/input-rejection-check.log and input-rejection-build.log. Backend synthetic-only and portfolio HTTP 200 confirmed. Swift compilation and actual phone parser/cleanup verification remain pending.

## Native resource cleanup checkpoint — October 6, 2026

- [x] Fictional image generation now uses the same active-work guard as inspection/PDF generation/reconstruction on Android and in Swift source. Cancellation checks surround generation/write completion.
- [x] Android bitmap and PDF-document allocation moved inside protected cleanup scopes. The active marker is released in a nested finally block even if allocation fails or resource release throws.
- [x] All 117 existing application tests, TypeScript/lint and tooling regression remain passing; no added JavaScript test is claimed to simulate native memory failure.
- [ ] Actual concurrent native calls, low-memory/allocation fault injection, background cancellation and owned-file cleanup require device/runtime acceptance.
- [ ] Swift compilation remains pending macOS access.

This is source hardening and Android compile/package evidence, not proof that a process killed by the OS can execute cleanup. Startup interrupted-session cleanup remains required. Personal uploads and clinical use remain disabled.

Native resource cleanup Android checkpoint: BUILD SUCCESSFUL in 2m 52s. Updated Kotlin compilation, APK signature, bundled JavaScript and manifest gates pass. SHA-256: ea1fb7d0cb4026f920523d666f0ea769f4c408818d5faa7c09a33e759cadc427; 70345402 bytes. Logs: artifacts/remote/native-resource-check.log and native-resource-build.log. Backend synthetic-only and portfolio HTTP 200 confirmed. Swift compilation, low-memory injection and phone runtime acceptance remain pending.

## URI-decoder compatibility remediation — October 6, 2026

- [x] Added a maintained local patch based on the exact upstream decode-uri-component 0.5.0 npm tarball. SHA-512 download integrity and source SHA-256 are pinned; upstream source and MIT license are retained in vendor/decode-uri-component.
- [x] Postinstall converts the upstream default export to a callable CommonJS wrapper and preserves legacy literal-plus-to-space behavior for query-string 7.1.3. Unknown installed versions/source hashes stop the patch for review.
- [x] Added a fallback bound: above 8,192 characters, valid components use native decodeURIComponent; malformed components stay encoded after plus normalization. This avoids a large dynamic-regex failure observed in the upstream fallback. It is not a global request limit.
- [x] Clean npm ci reproduced the patch. npm run check passes 117 application tests, TypeScript/lint, UUID tooling checks, patch-presence validation and three decoder consumer/parity/resource regression tests. The latter tests exercise the actual Expo Router query-string resolution, 169 mixed-token combinations, a 6,003-character malformed fallback, and 90,003-character malformed/90,000-character valid components in a timeout-bounded child process.
- [x] The development preview service was restarted to discard the previously loaded dependency. Existing portfolio services were not restarted.
- [ ] Physical malformed-link/navigation acceptance on Android/iPhone and eventual replacement with a compatible upstream dependency release.

npm audit still identifies installed decode-uri-component 0.2.2 metadata. This patch does not rename versions, suppress advisories or claim a clean audit; raw findings remain tracked separately. Node-forge and braces advisories remain unresolved. Long malformed components intentionally lose best-effort partial decoding. Remove the local patch once upstream consumer compatibility is available, after repeating consumer and native bundle tests.

Sources: https://github.com/advisories/GHSA-vcc3-ghjq-m6fr and https://github.com/SamVerschueren/decode-uri-component/releases/tag/v0.5.0 .

Decoder remediation Android checkpoint: BUILD SUCCESSFUL in 3m 50s. APK signature, bundled JavaScript and manifest checks pass. Packager source map contains the exact patched decoder including the 8,192-character fallback bound. Browser opens the app with malformed query bytes without a startup error (onboarding redirect observed). SHA-256: 5bc3be328463c039032838febd87fb13fc87e14d53c68cf54c648ebc12332680; 70346110 bytes. Raw audit: 22 findings (19 high, 3 moderate). Evidence: artifacts/remote/decoder-install.log, decoder-check.log, decoder-tooling-final.log, decoder-build.log and decoder-audit.json. Backend synthetic-only and portfolio HTTP 200 confirmed. Physical link navigation and iOS compile remain pending.

## Accessible save/recovery checkpoint — October 6, 2026

- [x] Shared selection chips now support actual disabled interaction and expose disabled + checked accessibility state, instead of depending on parent pointer-event suppression.
- [x] Receipt, profile and report editors disable relevant choices/text edits while saving or processing. Their save/confirm paths use synchronous operation guards to prevent rapid duplicate submissions before a render updates busy state.
- [x] Profile/receipt save exceptions preserve the draft, show retry guidance and release busy state in finally.
- [x] Shared status messages expose alert semantics and polite live-region updates for report, receipt, profile, archive, diagnostic and app-storage feedback.
- [x] TypeScript/lint, 117 application tests and three decoder regressions pass; UUID/installed-patch checks pass. Browser invalid-profile feedback and correction/save recovery verified.
- [ ] TalkBack/VoiceOver announcements, keyboard activation while busy, focus order, text scaling and phone layout acceptance. Browser/source checks are not proof of native screen-reader behavior.

Reference checked: React Native 0.86 accessibility documentation, https://reactnative.dev/docs/0.86/accessibility . The application retains the approved colors/branding placeholders and compact result layout. Personal-data processing remains disabled.

Accessible save/recovery Android checkpoint: BUILD SUCCESSFUL in 2m 55s. APK signature, bundled JavaScript and manifest checks pass. SHA-256: c17f9b5967cd1721e13bad2255c19b828d3c9b62fd30452cd3101e01c3de0f12; 70347070 bytes. Evidence: artifacts/remote/accessibility-check.log and accessibility-build.log. Physical accessibility and iOS compile acceptance remain pending.

## Receipt stale-review protection — October 6, 2026

- [x] Receipt saves compare the original reviewed record inside LocalSession's serialized transaction. A concurrent newer edit, deletion or reset prevents stale overwrite/resurrection.
- [x] First saves cannot overwrite an existing identifier. Edits preserve original creation time, saved profile context and unrelated history; no-op saves do not reorder history.
- [x] The screen retains its reviewed base and advances it only after a successful save. Failed saves preserve edits and explain when to reopen from History instead of blindly retrying.
- [x] TypeScript/lint, 123 application tests, three decoder regressions and tooling/patch checks pass. Six new tests cover first save/update, stale/deleted records, immutable context and invalid lines, concurrent reviews, storage failure/retry and reset.
- [ ] Physical repeated-edit/navigation and storage-failure acceptance.

This is fictional receipt review protection, not photo/OCR ingestion or source-document deduplication. It adds no schema migration and no personal-data processing.

Receipt stale-review Android checkpoint: BUILD SUCCESSFUL in 2m 54s. APK signature, bundled JavaScript and manifest checks pass. SHA-256: 36e8eff43298b492ad661a501bcbd8aaa8f5f0e54f5748381e52150e0d7b7ac4; 70348122 bytes. Evidence: artifacts/remote/receipt-save-check.log and receipt-save-build.log. Backend synthetic-only and portfolio HTTP 200 verified. Phone navigation/storage and iOS compilation remain pending.

## Lab extraction boundary checkpoint — October 6, 2026

- [x] Lab extraction now requires an explicit list of actual supplied pages, validates that list and rejects measurement references outside it.
- [x] Printed dates must be real ISO calendar dates. Missing/ambiguous dates must remain null with an explicit review issue; contradictory exact-date plus unresolved-date responses are rejected.
- [x] Parsed output explicitly carries needs-review, confirmed=false and clinicalUseAllowed=false. Extra provider-supplied confirmation/status flags remain schema errors.
- [x] Source annotations, uncertainty, precision, comparison signs and supported units are preserved without automatic interpretation.
- [x] TypeScript/lint, 128 application tests, three decoder regressions and tooling/patch checks pass. Five new tests cover unconfirmed status, calendar validity, source-page membership, unresolved dates and uncertainty/unit preservation.
- [ ] Bind actual native sanitized-page provenance, correction/confirmation UI and provider extraction transport after the privacy/provider gates. This parser is not yet a real upload workflow.

The source-page list must come from trusted on-device input preparation, never the provider response. Page membership is a structural check; it does not prove that a reported value/date appears on that page, establish privacy safety or approve clinical use. No uploads, personal storage schema changes or clinical thresholds were enabled.

Lab extraction boundary Android checkpoint: BUILD SUCCESSFUL in 2m 52s. APK signature, bundled JavaScript and manifest checks pass. SHA-256: 16bf875193b1de382dbf39cf6b59df4f3fbc867af72d367b907a54cd17c17b39; 70349218 bytes. Evidence: artifacts/remote/lab-extraction-check.log and lab-extraction-build.log. Backend synthetic-only and portfolio HTTP 200 confirmed. Actual native provenance/provider integration, phone execution and iOS compilation remain pending.

## Build provenance checkpoint — October 6, 2026

- [x] Build inputs are fingerprinted before compilation and checked again before publication. The inventory includes app/core sources, native module source, assets/plugins, dependency manifests/lockfile, vendor patches and relevant build scripts/configuration; generated output, docs, tool binaries and installed dependencies are excluded.
- [x] The APK is staged for signature/bundle/manifest and unchanged-source checks before replacing the published preview. Individual file replacements are atomic; verification detects an interruption between APK and metadata replacement.
- [x] Build records now include UTC build time, source digest and input-file count, with a companion per-file digest inventory.
- [x] python3 ops/build_provenance.py checks the APK bytes/hash and current remote source inventory against the published record. Source or artifact changes require a rebuild before distribution.
- [x] Three Python regression tests pass: input/config changes, exclusion of generated module output/docs while retaining native source, and changed source/APK rejection.
- [ ] Physical installation, device security/accessibility and iOS compilation remain external acceptance.

This is build-input traceability, not a reproducible-binary guarantee or cryptographic attestation of compilers/environment. Run source verification on project-server: laptop application source remains an earlier recovery snapshot. The local APK hash can be compared independently.

Build provenance Android checkpoint: BUILD SUCCESSFUL in 2m 54s. APK signature, bundled JavaScript, manifest, unchanged-source and post-publication provenance checks pass. APK SHA-256: cceb734b8a7fd34e14baefbfbb8c34a6a83deecf31f53271e1bcb87e8f31c327; source SHA-256: 80a501f1ed72c5acb5e468223ff87731ecb1a38bc125dc19f9c52b8a6d292c0b; 84 recorded input files; built at 2026-10-06T23:32:10.543641+00:00. 128 application tests, three decoder regressions and three Python provenance tests pass. Evidence: artifacts/remote/provenance-check.log, provenance-build.log and provenance-verify.json. Device verification and personal processing remain false.

## Evening checkpoint

See docs/12-beta0-evening-handoff.md. Source/APK provenance reverified; services healthy; personal processing remains disabled. The deadline does not imply completion of outstanding engineering. Source-only archive and laptop mirrors preserve the checkpoint.

## Continued implementation after deadline removal

See 13-beta0-resumed-implementation.md for the integrated intake, date-conflict, rule distribution, provider adapter, fresh-food and location-context changes. Earlier checkpoint checkboxes below their dated headings remain historical records, not the current task list.

Remaining work after independent scaffolding is coupled to real inputs, approved sources and release decisions: general real-media sanitization/evaluation, live provider configuration and model evaluation, source-backed recognition/branch catalogs, clinically reviewed assessment behavior, and physical-phone acceptance/fixes. These are not accepted merely because their guarded adapter code exists.

## Pending dependencies in plain language

1. **The two phones:** Android and iPhone model/OS details and hands-on installation/testing time, especially camera, OCR, storage, backup and privacy behavior.
2. **An iPhone build route:** Mac/Xcode access and signing/distribution setup; TestFlight requires the appropriate Apple enrollment. This does not block Android preview testing.
3. **OpenAI setup:** API project, server-only key, spending limits and a verified data-retention arrangement. A key alone does not unlock personal processing.
4. **Real data sources:** permission/access and representative coverage for food nutrition, exact product variants, dietary certifications, retailer listings and branch locations.
5. **Clinical approval:** a qualified reviewer to supply/approve the health-rule interpretation, population limits and reference cases.
6. **Beta server access:** decide private access versus a dedicated HTTPS address; provide DNS/access changes if needed. The existing portfolio service must remain separate.

After these are available, live wiring, representative redaction/model evaluation, phone acceptance and any resulting fixes still need to be completed. General real-document sanitization is not certified by the fictional fixture filter. Existing security advisories also require release review/upstream remediation. The current preview is for fictional data, not a completed real-data rollout.

## Android emulator investigation — October 7, 2026

Verified project-server as developer at /path/to/NutriGlimpse. Installed the official Android Emulator in the existing project-local SDK. CPU reports Intel VT-x; kvm and kvm_intel modules are loaded. The emulator acceleration check fails with code 11 because developer cannot access /dev/kvm (root:kvm, mode 0660); developer is not in the kvm group. Noninteractive sudo requires authentication.

Administrator action on project-server: sudo usermod -aG kvm developer. Reconnect SSH afterward so the new group membership takes effect; no server reboot or portfolio-service restart is requested. Then rerun the emulator acceleration check, install/create an x86_64 AVD, build a matching emulator APK if required (the existing preview is ARM64), and verify installation, launch, navigation, persistence and fictional input. No emulator runtime tests have passed yet. Logs: artifacts/remote/emulator-setup.log and emulator-acceleration-check.log. No system permissions were changed.


## Android emulator checkpoint — October 7, 2026 (EDT)

The administrator's kvm-group change is verified in a fresh SSH session. KVM is usable; no further administrator action is required for emulator testing. API 36 Google APIs x86_64 / Pixel 6 profile boots on project-server. Emulator 37.2.12 and all added runtime libraries are project-local. Official Ubuntu runtime packages were downloaded using isolated apt state; the pre-existing malformed NVIDIA apt-list entry was not modified. No portfolio service changes or server restart.

Native testing exposed and fixed two encrypted-storage startup defects: Android's SQLite absolute directory path needed a file URI for the File existence check; separate transaction connections needed their own SQLCipher key before BEGIN. Startup errors now identify a non-sensitive initialization stage.

Verified on the emulator: release APK installation/startup, fictional onboarding, persistence across force-stop/relaunch, navigation, native fictional image and two-page PDF OCR/reconstruction/cleanup, rejection of three invalid input types, report review/save/reopen from history after restart, product-result save, and personal-input gate. Image diagnostic: 8 lines read / 4 excluded / 4 retained. PDF diagnostic: 10 / 6 / 4. Private temporary directory empty afterward; database header not plaintext SQLite; SECURE window flag present. These checks do not certify physical-device security or general real-document sanitization.

**New independent engineering uncovered:** native receipt OCR dropped item rows (0 of 0 food lines), so receipt recognition acceptance FAILED. Product OCR left sugars unknown; complete fixture extraction remains pending. Do not describe all native workflows as passed. Root cause analysis and fixes for OCR layout/fixture matching remain work that can proceed without accounts or phones.

Verification: npm run check passed (typecheck, lint, 145 application tests, 3 tooling regression tests). Both x86_64 emulator and ARM64 phone release APKs rebuilt with storage fixes; source/artifact provenance verified. Physical-device verification remains false; personal processing remains disabled. Evidence: artifacts/remote/emulator-verification.json, emulator-*-pass.xml, emulator-report-restart.xml, emulator-storage-check.json, emulator-window-flags.txt, emulator-fix-check.log, emulator-fix-arm64-build.log. Emulator build and APK are under artifacts/emulator; phone build is under artifacts/android.

See docs/15-android-emulator-checkpoint.md for restart instructions and limits.


## OpenAI setup started — October 8, 2026

Server key-entry helper prepared: ops/setup-openai-key.py. It accepts a hidden interactive input, stores only on project-server under ignored .tools/openai/api-key (directory 0700, file 0600), and refuses replacement of an existing key. Tested using fictional credentials only. No real key installed or API requests made in this checkpoint. User chose to decide the budget later; paid validation is pending that decision. Account/project creation and user key entry are pending. Personal-data routes remain disabled. Existing extraction adapter uses Responses API with store:false; that setting alone does not establish zero retention.


## OpenAI key installed — October 8, 2026

User confirmed key entry. Verified on project-server: nonempty regular credential file at .tools/openai/api-key, owned by developer, file mode 0600 and directory mode 0700; neither path is a symbolic link. Credential contents were not displayed or read during verification. API authentication, model access and billing remain unverified. User has deferred choosing a budget, so no paid API requests were made. Backend live wiring and personal-data processing remain disabled. Next: budget/billing decision, then a bounded fictional-data API validation.


## OpenAI testing budget and model choice — October 8, 2026

User authorized an initial total API testing budget of USD 2 (not monthly). Proposed initial extraction evaluation model: gpt-5.4-mini, with reasoning effort none and strict structured outputs. Official model page currently lists standard input USD 0.75 / million tokens and output USD 4.50 / million tokens. gpt-5.4-nano page is marked deprecated, so it is not the proposed new integration target. Model access and billing remain unverified. No paid requests made in this checkpoint. Before testing, implement a persisted spend ledger and conservative pre-request cost reservation with output limits, stopping with headroom below USD 2. This safeguard is planned, not yet implemented. Use only fictional fixtures; personal processing stays disabled. Selection is provisional pending extraction accuracy evaluation.
Source: https://developers.openai.com/api/docs/models/gpt-5.4-mini


## Model recommendation corrected — October 8, 2026

After the user raised gpt-6-luna, official documentation confirmed Responses API and Structured Outputs support, reasoning effort none support, and standard short-context pricing of USD 0.10/million input tokens, USD 0.50/million output tokens (cache writes USD 0.125/million). Initial recommendation is corrected to gpt-6-luna, subject to project access and fixture accuracy validation. The earlier GPT-5.4 mini proposal came from an incomplete model comparison and is superseded. Total test authorization remains USD 2. No API requests or runtime model configuration changes in this checkpoint; persisted budget controls still must precede paid testing.
Source: https://developers.openai.com/api/docs/models/gpt-6-luna


## OpenAI live fictional validation — October 8, 2026

User confirmed API credits. Verified the stored key can call gpt-6-luna through the Responses API. Three paid requests completed: fictional product, receipt and lipid report. Existing strict local schema/source validation and selected known-value checks passed. The report check initially expected seven measurements; the source contains six measurements plus a date, so the test assertion was corrected and the saved response revalidated without another API call. These smoke tests do not establish real-document accuracy or clinical suitability.

Added ops/openai-budget.py and ops/openai-fixtures.ts: fixed model, reasoning none, Standard processing, tools disabled, store:false, 4096 maximum output tokens, bounded request/response size, no retries. Persistent locked ledger reserves USD 0.02 before each attempt and never refunds failures or unknown outcomes; runner stops at USD 1.80 below the authorized USD 2 total. This guard covers this CLI runner, not unrelated account spending. Two budget regression tests passed, including cap persistence and malformed-ledger denial. Normal project checks passed: typecheck, lint, 145 application tests and 3 tooling tests.

Three attempts reserve USD 0.06 cumulatively. Reported usage: 2,182 input tokens and 1,024 output tokens, including 1,130 cache-write tokens and zero reasoning tokens. Conservative token-cost estimate is USD 0.00087145, excluding taxes; dashboard billing is authoritative. Ledger reservations deliberately exceed estimated actual charges.

No public/live app route enabled, no service restart, no real personal data transmitted. Both project services remained active. The backend adapter has now been exercised with live fictional responses, but phone-to-backend live integration, representative evaluations, receipt/product local OCR fixes, and existing privacy/clinical gates remain pending.
Evidence: artifacts/remote/openai/verification.json, usage.json, check.log and fictional request/response fixtures. Scripts: ops/openai-budget.py, ops/openai-fixtures.ts, ops/test_openai_budget.py.


## Android/server integration completed — October 8, 2026
Current checkpoint: docs/17-beta0-android-server-checkpoint.md supersedes earlier pending OCR and app-to-server entries.
- [x] Receipt OCR recovers four rows; product sugars read 1 g; regression coverage added.
- [x] Product/receipt/report server-prepared GPT-6 Luna examples integrated with confirmation, timeout/cancellation and failure handling.
- [x] Personal upload routes remain disabled; example requests carry no device content.
- [x] 150 application tests, three tooling tests, typecheck/lint pass; final ARM64 and x86_64 release builds verified.
- [x] Native receipt/product/PDF checks, server display, background cancellation/retry and interrupted-file cleanup verified on emulator.
- [x] Phone testing instructions and source/artifact fingerprints recorded.
- [ ] Physical Android/iPhone acceptance, iOS build route and beta network-access choice.
- [ ] Approved real input/privacy evaluation, clinical interpretation and food/store data sources.
No additional paid API requests; cumulative reservation USD 0.06 against USD 2 authorized. OpenAI account/key/credits are no longer pending setup. No personal processing is enabled. See checkpoint for remaining engineering/acceptance limits; do not interpret this as real-data rollout approval.


## iPhone cloud-build setup — October 13, 2026
User supplied Expo username: buldygaur. Apple enrollment is reported pending activation; App Store Connect access is not yet enabled. Expo login and EAS project linking are unverified. Existing profiles cover internal distribution and simulator builds; TestFlight configuration remains pending. No cloud build or paid service started. Next inputs: secure Expo login, Apple activation, iPhone model/iOS version and home-only versus remote backend access.


## Beta tester scope — October 13, 2026
Confirmed: three iPhone testers including the user; a fourth tester may use Android. User reports iPhone 12 with iOS 26.6.2 (not independently verified). Testing must work at home and away, including grocery stores. Planned distribution: TestFlight for iPhones and the existing private APK route for optional Android testing. Dedicated HTTPS backend with individual tester access is proposed; hostname, access implementation and deployment are not yet completed. Expo username: buldygaur. Apple membership activation and secure Expo authentication remain unverified. Current authorization is USD 2 total OpenAI testing budget; additional testers do not increase this limit. Real grocery scanning and live product coverage still require the existing privacy/source acceptance gates; current verified preview remains fictional-data only.


## Competition/iPhone preparation — October 13, 2026
Target district: Massachusetts 2. See docs/18-competition-and-ios-readiness.md for priority order, demo storyboard, tester evidence and contribution worksheet. Dedicated TestFlight store profile prepared; iOS prebuild without dependency installation passed on Linux, with backup-exclusion insertion verified. Typecheck/lint and existing Android source/artifact provenance pass. This is not an iOS compile or physical-device pass. No cloud upload/build/charges. Apple activation, Expo secure login, district deadline/participation confirmation and student contribution clarification remain open. National published deadline times conflict; use October 26 noon EDT as conservative working deadline, proposed internal freeze October 23. AI assistance must be disclosed and student technical contributions documented honestly.


## Public catalog backend — October 13, 2026
Persistent SQLite/WAL catalog, source registry, validated transactional ingestion, USDA detail adapter, cached read APIs and online backup are implemented. Live USDA Foundation record 2768188 imported using official demo access; no personal data or OpenAI calls. 154 application tests, three tooling tests, typecheck/lint pass. Backup integrity and service restart retrieval verified; portfolio healthy. Source provenance, 100 g basis, unknown fields and unverified certification/stock are preserved. Mobile real-data integration, broad coverage/refresh, HTTPS/tester access, retailer/certification/clinical sources and operational hardening remain unfinished. See docs/19-public-catalog-backend.md for sources, schema, endpoints, evidence and dependencies.


## USDA key entry prepared — October 13, 2026
User reports receiving the USDA key. Added ops/setup-usda-key.py for hidden interactive server entry, directory 0700/file 0600, overwrite refusal and no API calls. Fictional-key checks passed. Actual key installation and authenticated import remain pending; no secret was requested in chat.


## USDA authenticated access verified — October 13, 2026
User saved the key with the hidden-entry helper. Credential directory is 0700 and key is a regular file at 0600 owned by developer; contents were not printed. One authenticated USDA detail import succeeded with demoKey=false. Cached backend retrieval of record 2768188 passed and preserves CC0 attribution. USDA API access is now unblocked; broad catalog coverage and mobile integration remain separate unfinished work. No OpenAI call or personal-data upload. Evidence: artifacts/remote/usda-authenticated-import.log and usda-key-verification.json.

    
## Next execution sequence — October 13, 2026
Decision: hybrid public-data architecture. USDA API obtains/refreshes facts; persistent server catalog serves cached reads. Phone-local encrypted storage retains personal records. A server cache alone does not provide offline phone access.
1. [done: nine reference foods imported] Expand a small, source-identified USDA starter catalog across common grocery categories; record selected IDs and coverage.
2. [done] Add bounded server-catalog name search and coverage reporting; preserve exact barcode lookup and explicit misses.
3. [done: operator command, not scheduled] Add a bounded operator refresh command that updates stale USDA records without deleting old data on failure. No unrequested recurring schedule.
4. [pending] Integrate a distinct real-food facts view in the app, with provenance, 100 g/serving distinction, missing values and source age; do not reuse fictional health ratings.
5. [pending] Add offline phone caching of approved public facts, with expiry and stale notices.
6. [pending] Broaden packaged-product coverage against tester-selected grocery products; handle no-match and multiple-match explicitly.
7. [dependency] Resolve Open Food Facts adoption/contact; obtain retailer/certification evidence where needed.
8. [dependency + implementation] Choose HTTPS hostname and access controls; enable secure off-home tester access and verify cellular behavior.
9. [dependency] Complete Expo login/Apple activation, cloud iOS build and physical testing; fix resulting defects.
10. [pending] Rehearse competition demo, collect tester feedback and update evidence/contribution record.
Viraank Gaur's reported contributions: original app concept, design, coding and testing; AI assistance documented separately.


### Catalog execution evidence
October 13: imported eight deliberately selected USDA Foundation foods, bringing the catalog to nine. Selection avoids search false positives (e.g. banana peppers versus bananas, oat flour versus steel-cut oats, rice flour versus rice). Selection manifest: ops/usda-starter-selection.json.
Cached name search: GET /v1/catalog/search/oats (encoded term, 2–80 characters, up to 20 records). Coverage: GET /v1/catalog/coverage. Parameterized literal substring search; malformed/control-containing terms rejected. No source calls on public lookup.
Refresh: ops/refresh-catalog.ts previews up to ten records older than seven days; --apply refreshes sequentially, stops on failure, preserves stored records and never automatically retries. Dry run found no stale records and made zero requests. No recurring schedule created.
Validation: 155 application tests plus three tooling tests, typecheck/lint pass; running backend returns nine records and searches find exact selected oats/banana IDs. Existing phone APK is unchanged; these server features are not yet wired to the mobile screens. No OpenAI budget used.
Next active step: real-food facts client integration, followed by phone offline caching. USDA API/database access is no longer a dependency; real packaged coverage, source adoption and external deployment dependencies remain as listed.


## Six-step execution: secure hostname and mobile catalog — October 13, 2026
User approved grocery.serveforwad.com. Cloudflare route uses existing portfolio-dashboard tunnel → HTTP 127.0.0.1:3002; owner dashboard action pending. See docs/20-cloudflare-beta-connection.md for exact instructions.
- [implemented; native acceptance in progress] Real USDA food-facts screen, explicit name/barcode lookup, source/100g/missing-value notices; health guidance remains fictional.
- [implemented; native acceptance in progress] Secure tester key storage and encrypted bounded 100-food offline cache; schema migration 2→3, source age warnings, delete-cache action, cache excluded from personal exports.
- [done; external route pending] Dedicated authenticated beta backend on loopback port 3002; four private tester invitations; no key embedded in app or printed. Existing backend/portfolio preserved.
- [pending] Packaged-product catalog expansion, native cache/network acceptance, external HTTPS checks, iOS build/access, physical tester evidence and demo rehearsal.
Access checkpoint:157 app tests+3 tooling pass, authenticated catalog200, unauthenticated HTTP 401, portfolio curl HTTP 200. Mobile-specific checks/build currently in progress. No paid OpenAI calls; personal uploads remain disabled. Do not claim all six steps complete.
