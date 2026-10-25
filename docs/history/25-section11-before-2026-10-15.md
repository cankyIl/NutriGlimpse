# Section 11 source completion and dependency register
Updated October 14, 2026. Authoritative work: /path/to/NutriGlimpse on project-server; laptop is the interface/recovery mirror.

## Later OFF activation checkpoint
OFF contact/reuse decisions are resolved. Read integration, public attribution/download and updated Android client are implemented and live-verified; 1,779 real OFF records are cached after the [bulk expansion](27-open-food-facts-expansion.md). See [current OFF setup and form answers](26-open-food-facts-setup.md). The original checkpoint below is historical; all other source/clinical/retailer gates remain open.

## What this checkpoint actually delivers
Section 11 is **not complete**. This increment implements source/evidence governance and maintenance tools, audits current coverage, and prepares review inputs. It does not turn pending provider access, certification evidence or clinical approval into a live integration.

1. **USDA maintenance:** a bounded operator refresh selects up to 500 stale existing records, retrieves batches of at most 20, validates exact identities/units/shapes, and writes only actual returned records. Default dry-run selects 200. Missing records keep their old retrieval dates; provider failures do not trigger retries or false freshness. Each successful import batch is transactional, while a multi-batch run may partially complete; report counts expose that result. No scheduled job, phone-triggered source request or personal scan-history collection was added.
2. **Public product evidence:** exact GTIN, US market, evidence kind, public source URL/version, observed/expiry dates, rights reference, reviewer, authority, branch and measured portion are validated. Personal-upload origin is not accepted. Public source metadata is not a license approval. A separate documented rights policy is required to count evidence. Registry import has dry-run mode, atomic replacement and content-addressed prior snapshots. This trusted operator workflow is not exposed as an untrusted public write API.
3. **Scope and conflict checks:** chain listing does not imply branch stock; branch stock needs exact branch, retailer and product. Opposite valid stock reports conflict. Missing/expired/pending/withdrawn evidence is unverified, not a confirmed claim. Certification needs an accepted authority; FODMAP measurements apply only to the recorded tested portion. These are audit capabilities; phone dietary compatibility and clinical outputs remain disabled/unverified until full source integration and release review.
4. **Coverage evaluation:** a 350-slot template covers seven retailers, 50 products each, ten categories. The evaluator counts distinct current observed barcodes, identification, retailer evidence and eligible alternatives independently. Duplicate or empty rows cannot create a passing basket. Thresholds require recorded approval; null denominators remain unknown. The template contains **no completed physical observations**, and no chain has passed acceptance.
5. **Open Food Facts preparation:** normalized CC0/ODbL-aware food shape is ready for staged US, gram-based records; source quality errors, prepared nutrition and ambiguous/liquid units are excluded. Missing nutrients remain unknown. Image fields, certification claims and store tags are not imported. Existing disabled-source database checks remain in effect; no OFF production data was imported or connection claimed.
6. **Places:** audit exposes missing addresses and map footprints for all seven chains. Filtering/query support now includes named Target/Walmart grocery-selling department stores without admitting unrelated department stores, specialty facilities or known closed stores. Two bounded upstream Overpass attempts timed out. The **existing 2,012-entry directory was preserved unchanged**; expanded map data is not delivered yet. This retry is an engineering/provider availability item, not something the user must buy.
7. **Clinical/source preparation:** all eight source families have a machine-readable disposition register. Eight condition reference entries and review queues were created. Draft rule pack contains eight pending sources and **zero rules**; nothing was clinically approved, signed or published.

## Current coverage audit (not retailer acceptance)
Store-brand matches are heuristic diagnostics, not current retailer assortment. Shared-brand labels may serve multiple chains; absence of a chain-specific label does not imply no national-brand coverage.

| Retailer | Brand matches | Comparison ready | Existing MA map records | Missing address |
|---|---:|---:|---:|---:|
| wegmans | 55 | 10 | 4 | 0 |
| walmart | 254 | 14 | 27 | 0 |
| price-chopper | 24 | 0 | 14 | 5 |
| whole-foods | 295 | 16 | 32 | 0 |
| target | 39 | 32 | 2 | 1 |
| shaws | 0 | 0 | 46 | 20 |
| trader-joes | 0 | 0 | 25 | 2 |

Target map counts are under-covered because many department-store entries were previously omitted. Shaw's private-label matches cannot be inferred reliably from a chain-name search; verify exact product/chain evidence. Price Chopper/Market 32 grouping reports 14 map records; these are not authoritative branch counts.

All seven baskets currently have zero validated observations and no approved acceptance thresholds. Identification is exact barcode presence, not proof of the current formulation. Alternative coverage measures whether at least one nutrient criterion yields a same-group option with no additional dietary restriction; it does not establish coverage for every health/restriction profile. Stock remains unverified regardless of basket results.

## What is needed from the user / external owners
| Item | Concrete input or decision | Work after receipt |
|---|---|---|
| OFF usage form | Contact and ODbL decision supplied; user confirmed usage form submitted. | Read integration is live; validate packages/phones and expand coverage. Photos remain excluded. |
| Test branches and products | Addresses/towns of the stores testers actually use; current product barcodes/names and observations per chain. Start with the four primary chains; original Target/Shaw's/Trader Joe's scope remains pending, not silently removed. | Verify/correct branch matching; fill the 50×10 category basket, identify scan misses and expand verified coverage. Personal photos do not automatically become shared catalog data. |
| Coverage targets (Q-13) | Approve measurable pass criteria. Proposed starting thresholds: 90% barcode identification, 80% current retailer evidence, 70% products with at least one eligible alternative, per chain; minimum 50 distinct products across ten categories. These are proposals, not approved gates or guarantees. | Record approval and run the acceptance evaluator; report each metric and unknowns separately. |
| Clinical review | A qualified registered dietitian/clinician with relevant expertise, or an introduction; approve scope including all eight conditions, pregnancy/older adults and conflicts. No reviewer has been contacted. | Review candidate source applicability, required context, thresholds, explanations and reference cases; integrate into existing signed publication pipeline only after review. |
| Dietary authorities (Q-08) | Approve accepted authorities and criteria for halal, kosher and gluten-free claims. Candidates include GFCO, OU Kosher and IFANCA; this is not an exhaustive or approved list. Obtain exact product/market evidence with permitted reuse. | Import reviewed evidence, evaluate expiration/conflicts, then implement and verify the approved consumer compatibility behavior. A logo or manufacturer marketing claim alone is not automatically sufficient. |
| FODMAP measured data | Written permission/licensed access from Monash or another authorized measured-data source, including product, market and tested portion scope. Do not purchase until rights for this app are confirmed. | Validate licensed data and integrate the reviewed measured/certified rules; keep unavailable while unresolved. |
| Retailer stock | Authorized retailer/aggregator access covering the intended chains and branches, with GTIN mapping and permission to display/cache stock. Shopping links or seller accounts do not prove this access. | Implement provider-specific live adapters and outage/staleness tests; then verify real in-store behavior. Alternatives with unknown stock already work without this. |

Separate existing release dependencies remain: signed iPhone distribution, physical iPhone testing and privacy/provider validation before real health-report processing. No new paid accounts are needed for the engineering delivered here.

## Source review references
- [Open Food Facts usage conditions](https://support.openfoodfacts.org/help/en-gb/12-donnees-api/94-y-a-t-il-des-conditions-pour-utiliser-l-api) and [official license guide](https://github.com/openfoodfacts/openfoodfacts-server/blob/main/docs/api/tutorials/license-be-on-the-legal-side.md). Database and images have distinct license requirements; separate tables alone are not a compliance decision.
- [Monash certification FAQ](https://monashfodmap.com/product-and-recipe-certification-program/certification-faqs/) identifies a certification route, not a public dataset/API entitlement. No licensed data assumed.
- [GFCO](https://gfco.org/) and [OU product search](https://oukosher.org/product-search/) are candidate authority sources, not bulk reuse permission or user approval of criteria.

Clinical candidate references (no patient recommendations or numeric rules published):
- [AHA 2026 dietary guidance](https://professional.heart.org/en/science-news/2026-dietary-guidance-to-improve-cardiovascular-health/top-things-to-know) — candidate reference only; rights/applicability and clinical review pending.
- [NHLBI DASH](https://www.nhlbi.nih.gov/health/dash/following-dash) — candidate reference only; rights/applicability and clinical review pending.
- [ADA nutrition clinical support](https://professional.diabetes.org/clinical-support/nutrition-wellness) — candidate reference only; rights/applicability and clinical review pending.
- [NIDDK celiac disease](https://www.niddk.nih.gov/health-information/digestive-diseases/celiac-disease) — candidate reference only; rights/applicability and clinical review pending.
- [KDIGO CKD guidance](https://kdigo.org/guidelines/ckd-evaluation-and-management/) — candidate reference only; rights/applicability and clinical review pending.
- [AASLD MASLD guidance](https://www.aasld.org/practice-guidelines/clinical-assessment-and-management-metabolic-dysfunction-associated-steatotic) — candidate reference only; rights/applicability and clinical review pending.
- [NIDDK weight management](https://www.niddk.nih.gov/health-information/weight-management/adult-overweight-obesity/treatment) — candidate reference only; rights/applicability and clinical review pending.
- [ACG SIBO](https://gi.org/topics/small-intestinal-bacterial-overgrowth-sibo/) — candidate reference only; rights/applicability and clinical review pending.

## Operator workflow
- Run `node --experimental-strip-types ops/audit-section11.ts` for the current diagnostic report, or pass a reviewed basket JSON. Output: artifacts/remote/section11/coverage-audit.json. Template: ops/retailer-acceptance-template.json.
- Run `node --experimental-strip-types ops/refresh-catalog-batch.ts --limit=200` to preview stale records; after backup, add `--apply` to fetch/import. Maximum 500 records/25 requests per invocation. No new records are discovered by this refresh; use existing staged discovery for new products.
- Run `node --experimental-strip-types ops/import-product-evidence.ts complete-reviewed-registry.json` for validation; add `--apply` to replace the operator registry. Prior versions remain under .tools/section11/history. Registry input must contain the complete intended version, including withdrawals.
- Rights are independently recorded in .tools/section11/rights.json; authority and coverage decisions have separate files. Current evidence and rights are empty, authority list is empty, acceptance policy is null. Never fill approval fields as a substitute for actual review. No phone claim is activated by this operator import.
- Medical reference draft: ops/clinical-source-draft.json. Review questions: ops/clinical-review-queue.json. They feed existing review/publication engineering after qualified review; they are not an active signed pack.
- Retry the improved map query when upstream is available. Import is atomic after schema validation; restart only the two project backend services after a successful new directory import. Preserve portfolio services.

## Verification and limitations
- 182 application tests and 3 tooling tests passed, including evidence scope/conflict/expiry/authority/rights, basket deduplication/approval gating, USDA batch identity/failure/size bounds, OFF disabled-source behavior, and department-store filtering. Type checking and lint passed.
- Live USDA batch request returned two expected IDs (2679333 and 2768188) without changing the catalog or transmitting personal data. Stale-refresh dry run selected zero currently stale records and made zero requests.
- Empty evidence import and history/atomic-write path exercised; audit confirms zero evidence claims, zero accepted baskets, and no enabled clinical rules or inventory feed. Positive/negative/conflict cases use labeled test fixtures, not real certificates or retailer approvals.
- Current Android artifact/source provenance remains valid because no mobile code changed; no new Android build or physical-device test is claimed for this increment.
- Map refresh failed twice with upstream timeouts; the existing directory stayed unchanged. Retrying upstream and performing real source/physical acceptance remain outstanding.


## October 14 guidance acquisition checkpoint

All four requested guidance families collected; 26 structured entries, two serving tables and eight hashed source snapshots. See [guidance source library](31-guidance-source-library.md). Seven data-validation tests passed. Status is reference-library-collected-not-enabled; educational UI integration and personalized clinical review remain separate. Existing draft clinical rules were not approved or activated.
