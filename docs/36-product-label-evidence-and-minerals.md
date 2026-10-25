# Product minerals, trans fat and gluten-free evidence

Checkpoint: October 14, 2026 (America/New_York). Authoritative workspace: `/path/to/NutriGlimpse`, project-server.

## User decision

Strict gluten-free matching may accept **verified independent certification OR a verified manufacturer gluten-free claim**. A community tag, product name or photo extraction result alone does not verify either. Personalized medical recommendations remain disabled.

## Implemented

- Optional per-100-g `additionalNutrients`: `transFatG`, `potassiumMg`, `magnesiumMg`, `calciumMg`. The five existing comparison nutrients remain separate, so a missing mineral does not remove otherwise valid comparisons.
- USDA mappings: 1257 g, 1092 mg, 1090 mg, 1087 mg respectively. Exact IDs/units, duplicate detection and physical bounds are enforced.
- OFF canonical `_100g` mineral values are grams and converted to mg. The original input `_unit` does not change that canonical meaning. Invalid, absent or inconsistent extra observations stay unknown, never zero.
- OFF community-reported label claims, allergens and cross-contact traces now reach the catalog screens with unverified provenance. These are database reports, not visual inspection of a front-label photograph.
- Reviewed certification/manufacturer records connect to authenticated catalog v2 responses. Each needs the exact barcode, US market, full product/formulation fingerprint, permitted rights record, approved reviewer, accepted issuer or manufacturer hostname, reviewed allergen panel, current claim and no unresolved contradiction.
- Reviews must be observed within 90 days and unexpired. Ingredient/allergen conflict blocks strict qualification, including conflicts in reported OFF metadata. Oats alone can pass only with matching reviewed evidence; absence of a keyword cannot qualify.
- A separate product-evidence signing key, public app pin and one-hour Ed25519 proofs bind the exact product facts and reviewed claim. Signatures do not confer clinical approval. The private key remains in `.tools/section11/label-signing.json` with owner-only permissions.
- Registry/policy withdrawal takes effect on the next online request. Previously issued offline proofs expire within one hour or earlier underlying expiry. The app updates expiry while open and on resume. Altered records, unknown keys and expired proofs fail closed.
- Strict alternatives can use verified proofs; other unsupported dietary restrictions remain excluded.
- Mobile standard view shows extra source facts. DASH view shows one listed portion, mineral amounts and general FDA %DV. Trans fat has no invented %DV; reported 0 g displays the rounding caveat. No mineral-benefit, “FDA certified,” or medically safe badge is generated.
- Source-cited product extraction contracts now carry front-label text, advisory text and four extra nutrients. Old saved drafts remain readable. Extractions still require review and cannot establish identity/certification. This does **not** enable live personal photo uploads or establish camera/OCR acceptance.
- `/v2/catalog/*` exposes enriched mobile responses; `/v2/catalog/export` provides the complete reusable source facts. v1 lookup/export retains the legacy strict schema. Source-only exports exclude signed review proofs.
- v2 barcode lookup can fill missing OFF evidence even when USDA facts are cached, under the same shared rate limit, negative cache and cooldown. v1 retains existing cache behavior.

## Imported coverage

4,677 source records, representing 4,601 distinct barcodes. Provider rows are not unique-product counts.

| Source | Records | Extra fields populated or explicitly unknown | Trans fat known | Potassium known | Magnesium known | Calcium known |
|---|---:|---:|---:|---:|---:|---:|
| USDA | 2,898 | 2,898 | 2,611 | 2,408 | 53 | 2,622 |
| Open Food Facts | 1,779 | 1,778 | 1,596 | 1,295 | 776 | 1,660 |

- Refreshed all 2,898 USDA records using 145 bounded batch requests, with no missing IDs or failed batches.
- Reprocessed 1,774 OFF records from the pinned official snapshot without pretending reprocessing was a new retrieval.
- Refreshed 23 OFF records through 29 paced API lookups; several overlap the bulk nutrient enrichment.
- **1,778 OFF records** now contain reported label metadata: **697** have label claims, **1,070** have allergens and **89** have trace/advisory tags. Empty fields mean not reported, not confirmed absent.
- The first whole-export metadata query stopped at its two-minute bound without import. A bounded 250,000-row prefix returned 1,758 records in 78 seconds: 1,755 exact-version records imported, two already refreshed, one failed matching. Checks were not relaxed.
- One OFF Lucky Charms record (`00016000121836`) remains unenriched because fresh/snapshot inputs did not pass normalization or exact-version matching. Existing facts were retained.
- **Zero live products currently qualify as reviewed gluten-free.** Production evidence and trusted reviewer/issuer/rights configuration are still empty. Test-only evidence never enters production.

## Verification

- Full check passed: **311 application tests, three tooling tests, ten report-adapter tests**, workspace typecheck and mobile lint. Final evidence in `artifacts/remote/label-enrichment/check-final.log`.
- Production web, iOS and Android JavaScript/Hermes bundles exported. This is not an installed native build or physical-phone acceptance.
- Live HTTPS smoke: authenticated v2 lookup succeeds, anonymous lookup is rejected, v1 remains compatible, both public export versions work, and the enriched export includes 4,677 rows without review proofs.
- Portfolio HTTPS returned 200; only the two Congress backend services were restarted.
- Regression coverage includes unit conversion, duplicate/missing/zero handling, dates, serving consistency, rights/reviewer/issuer checks, formulation changes, contradictions, withdrawal, signature tampering, expiry, extraction source references, authorization, legacy compatibility and OFF pacing/cache behavior.
- Logs/reports: `artifacts/remote/label-enrichment/`. Before-change database backup: `catalog-before.sqlite`. No OpenAI request or paid model call was made.

## Review workflow

1. Locate an exact catalog product and a manufacturer/certifier source documenting the same US barcode and current formulation.
2. Generate an **unapproved draft** with `ops/draft-gluten-evidence.ts usda|off ID public-source-url manufacturer-label|certification`.
3. Inspect the source and full label, including allergen/advisory panel. Record a brief front-label claim, applicable warnings, observation date, expiry and source version. Set `allergenPanelReviewed` only after inspecting the panel.
4. Establish allowed reuse, reviewer identity and exact manufacturer hostname or certifier authority in `.tools/section11/label-trust.json`. Empty lists approve nothing. This policy is separate from older operator-only Section 11 audit allowlists.
5. Merge reviewed records into the complete registry; validate with `ops/import-product-evidence.ts`, then `--apply`. Prior registry versions are retained. Draft, withdrawn and pending-rights records cannot qualify.
6. Verify the v2 response and phone presentation. Withdraw outdated records; publish an app key update for signer compromise/rotation.

Never substitute another package size, variant, country, brand family, retailer listing or generic marketing page for exact-product evidence.

## Pending inputs and work

- No new API key, account or payment is needed for connected nutrient/label feeds.
- For the first real gluten-free matches, obtain current front-label, nutrition/ingredients, allergen/advisory and barcode evidence for exact products, or exact manufacturer/certifier records with usable rights. User package photos help identify priorities; they are supporting evidence, not automatic certification.
- Document trusted reviewers and source/rights records before activating matches. No reviewer, issuer or permission was invented.
- Source-omitted nutrients remain unknown; manufacturer/package/analytical evidence is needed to fill them.
- Qualified clinical review remains required before personalized disease recommendations.
- Stable-source build publication and physical iPhone/Android acceptance remain rollout work.

## Primary references

- [USDA API guide](https://fdc.nal.usda.gov/api-guide/) and [nutrient ID appendix](https://www.ars.usda.gov/ARSUserFiles/80400530/pdf/fndds/2019_2020_FNDDS_Doc.pdf).
- [OFF canonical nutrition schema](https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_nutrition/).
- [FDA Daily Values](https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels).
- [FDA gluten-free labeling questions](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/questions-and-answers-gluten-free-food-labeling-final-rule).
- [FDA trans fat rounding guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/small-entity-compliance-guide-trans-fatty-acids-nutrition-labeling-nutrient-content-claims-and).
