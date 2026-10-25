# Design and Implementation Specification

**Project:** Congressional App Challenge nutrition and grocery assistant (working description; name undecided)  
**Version:** 0.21 — Verified AI photo ratings and alternatives  
**Date:** October 16, 2026  
**Status:** Implementation is underway; current delivery evidence is in the project plan. The normal-photo AI flow is specified and checkpointed in [43-verified-ai-photo-ratings.md](43-verified-ai-photo-ratings.md); its general ratings do not enable personalized medical recommendations. The real lipid-import implementation, accepted beta retention boundary and remaining device/clinical acceptance are detailed in [36-real-lipid-import.md](36-real-lipid-import.md).  
**Companion:** [Requirements Specification](01-requirements-specification.md)  
**Start here in a new chat:** [Session Handoff](03-session-handoff.md)

## 1. Purpose and decision authority

This document defines the proposed technical design, delivery sequence and verification plan for the complete polished mobile product. It is the implementation handoff baseline, not evidence that any component has been built or clinically validated. Development phases sequence construction; they do not reduce the approved launch scope.

The [requirements specification](01-requirements-specification.md) owns product behavior, requirement IDs and the Q-01–Q-14 decision register. This document owns architecture decisions (`ADR-*`), work packages (`WP-*`) and verification procedures (`V-*`). The [session handoff](03-session-handoff.md) explains repository state, implementation entry points and unresolved dependencies. Explicit user decisions take precedence over proposals; correct inconsistencies rather than silently changing scope.

The product questionnaire is complete. Routine engineering decisions should be resolved and recorded during implementation; ask the user only when a material tradeoff changes approved behavior, privacy, scope or commitments. No application implementation is requested in this handoff-preparation session; the user intends to begin in a new chat.

## 2. Architecture decisions

The design must preserve these approved constraints:

- Complete iPhone and Android experiences, with a later website sharing public/backend services; US, age 21+, pregnancy included, English initially.
- All approved conditions and dietary restrictions, product/label/fresh-food capture, condition-specific assessments, same-store-first alternatives, GPS-assisted store selection and receipt analysis.
- No login or cloud health profile. Personalization uses device-local preferences and confirmed lipid measurements. Compact dated results persist locally until user deletion, with optional user-managed encrypted export/restore.
- Automatic redaction before every LLM request, including extraction; no mandatory redaction-preview approval. Original photos/PDFs and derivatives are temporary, not history attachments.
- Optional image/PDF lipid entry at any time, confirmation before interpretation, and selection by latest confirmed test date. Support total cholesterol, LDL-C, HDL-C, triglycerides, ApoB and Lp(a) when present.
- Reuse saved successful report analyses. Allow user-initiated retries when no successful result was saved, including uncertain delivery; remote computation may repeat. Never promise exactly-once provider execution.
- Reviewer recruitment runs alongside development and testing. Real-data privacy readiness and clinical release readiness remain explicit dependencies.

React Native/Expo, TypeScript, SQLCipher, framework/hosting choices, exact models, API shapes, technical limits and the delivery sequence are engineering proposals. The implementation chat should validate the relevant choices, record decisions and proceed incrementally under the readiness stages in section 15.1. Product approval does not establish provider access or clinical cutoffs.
| ID | Decision | Status and rationale |
|---|---|---|
| ADR-01 | One cross-platform mobile application with native camera, location, accessibility, and secure-storage integration | Proposed: React Native with Expo development builds. Validate camera/report usability on physical iPhone and Android devices. |
| ADR-02 | Shared backend for public food records, retailer evidence, store lookup, medical rule publication, and OpenAI request relay | Confirmed separation of shared versus personal information; service implementation proposed. |
| ADR-03 | Saved profiles, preferences, report results, and personal histories reside on the device | Confirmed. Cloud processing is allowed; persistent cloud user records are not part of the design. |
| ADR-04 | Send only sanitized report/page images to OpenAI for clinical extraction | Confirmed cloud extraction and pre-LLM redaction. Proposed local OCR/text detection is a privacy prepass, not a replacement for OpenAI clinical extraction. PDF rendering and irreversible redaction occur before upload. |
| ADR-05 | Use explicit medical rules for categorization and OpenAI for extraction and grounded explanations | Proposed reliability architecture. An LLM may not invent thresholds, certifications, inventory, nutrients, citations, or treatment instructions. |
| ADR-06 | Personalize food ratings and filter/rank alternatives locally using downloaded rules, public candidate data and confirmed lipid results when provided | Automatic use of optional confirmed lipid results is confirmed; local rule execution is the proposed design. Send only necessary personal context for a specific requested cloud explanation or lab analysis. |
| ADR-07 | Foreground OpenAI Responses requests with `store: false`, no background processing, files, tools or automatic retries | Implemented for typed real-report evidence. Default provider retention is explicitly accepted through the initial versioned beta agreement; no ZDR gate or zero-retention claim. |
| ADR-08 | Product presence at a chain is sufficient recommendation evidence when clearly labeled | Confirmed relaxation of exact-stock requirements. Evidence must preserve chain versus branch scope. |
| ADR-09 | No user accounts and no automatic personal-data synchronization | Confirmed. Future website access to phone records requires a separately approved transfer design. |
| ADR-10 | Start with a modular backend service and separate public-data update jobs | Proposed. Avoid unnecessary microservices while keeping sensitive relay paths isolated from durable ingestion workflows. |
| ADR-11 | Reuse successful saved report analyses; allow user retries when no successful result was saved | Confirmed behavior; local fingerprints, in-flight guards and atomic result writes are proposed mechanisms. No durable backend result cache or automatic repeat interpretation. |
| ADR-12 | User-initiated encrypted export and local restore | Confirmed direction; portable encryption/key UX, schema and collision handling proposed. No backup endpoint, account or automatic synchronization. |

## 3. Components and information boundaries

| Component | Responsibility | Persistent contents |
|---|---|---|
| Mobile presentation layer | Onboarding, capture/import, value confirmation, results, comparison, receipt review, local settings | UI preferences on device |
| Mobile privacy preprocessor | Local PDF rendering, identifier detection, destructive masking, sanitized request creation | Temporary product/receipt/report working data only, cleaned when no longer needed; no cloud originals or identifier logs |
| Mobile private repository | Conditions, dietary requirements, confirmed labs, compact dated assessments/history | Encrypted device database; no retained user photos/PDFs or image derivatives |
| Mobile assessment engine | Apply applicable versioned rules, serving calculations, restriction checks, local alternative ranking | Rule packs and local assessment snapshots |
| Mobile public cache | Food facts, retailer evidence, store metadata, source descriptions | Public records with freshness and license metadata; protect linkage to personal use |
| Request gateway | HTTPS, payload limits, short-lived app access, abuse controls, cancellation | No personal request/response contents; permitted security metadata is a Q-14 decision |
| OpenAI relay | Submit images/confirmed values; validate extraction and explanation schemas | None for personal payloads |
| Catalog service | Match identifiers, retrieve product versions, return category alternatives | Licensed public/source product records |
| Retailer/store service | Retailer listings, chain/branch identity, nearby store search | Public retailer/store records subject to source terms |
| Evidence service | Source registry, reviewed rules, release manifests and withdrawal notices | Public clinical evidence metadata and staff review records |
| Public-data workers | Scheduled ingestion, validation, refresh, source-change detection | Public jobs, ingestion checkpoints and permitted source data |

Personal content includes report and receipt images, incidental personal information in product photos, extracted lab values, diagnoses/conditions, religious or dietary preferences, precise location, and personalized results. It must not enter persistent backend storage simply because a pipeline calls it a cache, trace, attachment, retry, or debug artifact.

The backend remains available around the clock. AI work runs when a user requests it; public refresh jobs run on schedules. A managed service with bounded concurrency and sufficient request duration is proposed. Hosting selection must verify request buffering, temporary files, logs, crash dumps, swap behavior, and provider timeouts. A hosting platform that automatically persists sensitive payloads is incompatible with this relay design unless that behavior can be disabled and tested.

## 4. Candidate technology stack

| Area | Proposed choice | Selection check |
|---|---|---|
| Mobile | React Native, Expo, TypeScript | Platform camera/location behavior, supported OS versions, native builds, accessibility, large-text layout |
| Navigation | Native-feeling tabs and stack navigation through Expo-compatible tooling | Preserve Android back behavior, iOS gestures, and modal accessibility |
| Local database | Expo SQLite with SQLCipher enabled | Encryption is not enabled by default; requires a native development/release build, not Expo Go [T-01] |
| Key storage | Platform secure key storage through an audited native integration | Non-syncing configuration, backup exclusions, key-loss behavior, device-lock protection [T-02] |
| Backend | TypeScript service; Fastify is a candidate | Memory-only uploads, schema validation, streaming cancellation, no body logging |
| Shared records | PostgreSQL with source-separated records and indexes | No tables for consumer health profiles or personal results |
| AI | OpenAI Responses API with an image-capable model and Structured Outputs | Evaluate available model snapshots for extraction accuracy, retention compatibility, latency, and cost before selection [T-03, T-04] |
| Store discovery | A places provider such as Google Places | Coverage, licensing, attribution, geographic precision, transient coordinates [T-06] |
| Scheduling | Managed scheduler plus public-ingestion jobs | Idempotency, provider limits, source freshness, review workflow |
| Public assets | Storage/CDN only for permitted public assets and rule packs | No user-report upload buckets or signed URLs for personal images |

The final stack and package versions must be recorded after a compatibility spike. No particular OpenAI model, cloud host, paid plan, or third-party access approval is assumed by this draft.

## 5. Mobile experience and screen contract

Proposed primary navigation: **Scan**, **History**, and **My needs**. Scan offers product, receipt, and lipid-report modes. A visible store selector is available in the shopping experience. Saved lab results are discoverable from History and My needs without turning the app into a general medical-record system.

Keep “Add lipid report” available from My needs and lipid-report history as well as the Scan report mode. It remains available after initial setup is skipped and after any prior report; no current shopping session is required. These placements are proposed design details implementing confirmed anytime entry. Online processing follows the same redaction, duplicate detection and once-per-report workflow for every entry point.

The action offers camera capture, image import and PDF import, with no manual-entry alternative. All saved lipid panels originate from a report workflow. An unreadable report leads to recapture/reimport or another defined recovery path, not an empty panel-entry form.

| Screen | Main elements | Required recovery behavior |
|---|---|---|
| Welcome / local setup | Value proposition, local-data explanation, age input and 21+ scope, diagnosed-condition or prevention goals, proposed explicit pregnancy-context question | No login gate; explain unsupported age and allow correction; skip optional fields; permissions requested at point of use |
| My needs | Editable age, optional gender and explicit pregnancy context, General Fitness/No Concern or a selected primary health concern, additional conditions, vegetarian, eggs, dairy, halal, kosher, gluten-free, optional lipid-panel entry and current confirmed report/date | Allow combinations; explain unresolved/contradictory settings; retain explicit choices and historical profile revisions; no panel required to use food features |
| Scan | Product/receipt/report mode, camera, import, barcode entry where appropriate | Permission denied, unsupported file, low light, blur, offline, upload cancellation |
| Automatic privacy processing | Integrated progress while identifiers are detected and removed; no preview approval screen | Block unsanitized upload; offer recapture, a clearer file or cancellation when redaction cannot be completed |
| Product confirmation | Photo/candidate identity, brand, variant, size and identifier evidence | Choose among candidates, correct match, scan barcode, capture labels |
| Label capture | Separate ingredient and Nutrition Facts capture, multi-image support | Show which missing fields require another image; allow correction |
| Product result | Overall state, short explanation, expandable “Why?” nutrient details/sources, per-condition breakdown, serving basis, dietary compatibility and alternatives | Conflicts and uncertainty visible without expanding; unresolved restrictions cannot receive an affirmative suitability badge |
| Compare alternatives | Comparable serving, relevant nutrient differences, dietary checks, retailer evidence, nearby branch and adjustable radius defaulting to 10 miles | No price/budget controls; disclose catalog coverage and avoid unsupported stock claims; offer radius expansion when needed |
| Receipt review | Food/non-food/uncertain lines, candidate matching, editable quantities, summary | Partial completion; retry a line; receipt-wide failure must not destroy confirmed lines |
| Lab extraction review | Each measurement, temporary source crop/page during the active workflow, unit, reference range, date, uncertain fields; explain automatic future personalization upon confirmation | Correct/re-upload; prevent use of unconfirmed values; no separate personalization toggle; source images are not retained in history |
| Lab analysis | Confirmed results, educational explanation, cited guidance, context limits, follow-up flags, report/date informing food personalization | Distinguish extraction failure from medical uncertainty and cloud-service failure; show when a finding lacks an applicable food rule |
| History / detail | Local product, receipt and lab records with dates and versions; cached lab explanation | Delete item; locally reassess food with fresh rules; identify outdated lab interpretations without automatically analyzing a report again |
| Privacy / storage | Data handling, local deletion, storage used, backup/transfer behavior | Explain consequences of key loss or app deletion without implying cloud recovery |

Visual design needs a later reviewed screen system: typography, spacing, contrast, icons, empty states, loading feedback, reduced motion, and touch targets. Color is supplemental to text and icons. A label such as “poor fit” must identify the selected condition and serving context. Product marketing claims are not displayed as app-verified medical findings.

**Implementation-session decision, October 5, 2026 (Q-12):** The user selected a warm, natural aesthetic and scan-first home. Implement ivory surfaces, forest/teal accents, readable dark text, softly rounded cards, restrained motion and subtle food illustrations. Scan is prominent; History and My needs remain primary destinations. These are visual-direction choices, not approval of clinical mappings. Branding, app name and logo remain explicitly open for a separate user discussion. See [implementation log](04-implementation-log.md) for current implementation evidence; the v0.16 baseline above remains the handoff record.

Proposed localization design: keep UI strings, accessibility labels and reviewed explanation templates in versioned language catalogs separate from clinical rules. Launch with English throughout, including AI explanations. Preserve the source wording of permitted product fields and compact extracted report labels alongside any later translation, without saving full report transcripts or media; translation must not change extracted values or units. Spanish is the next enhancement, with reviewed clinical terminology and output evaluations before that release; further languages follow. Language selection remains device-local.

### 5.1 Look, feel and aesthetics — Beta 0 baseline

**Review timing:** The October 5 baseline below is historical. Phone testing is now underway; the later approved Berry & Citrus direction (§27) and grocery/nutrition/heart artwork (§28) govern the landing page. Continue usability/accessibility checks. Brand name and tagline were approved October 25: **NutriGlimpse — Know your food. Understand your choices.** Logo/final icon remain open.

| Element | Agreed behavior / implementation baseline |
|---|---|
| Personality | Warm, natural, lively and trustworthy. Avoid the muted/bland initial palette. |
| Header | “Your Health & Grocery Companion”. This is descriptive copy, not a selected brand name. |
| Introductory copy | “Understand what’s in your food, and how it fits your needs.” appears in bold. |
| Navigation | Scan-first home with prominent capture action and store selector; History and My needs tabs. Receipt and optional lipid entry remain discoverable. |
| Palette | Current approved Berry & Citrus: pale lavender `#F7F4FC`, white cards, plum ink `#302344`, berry purple `#60379F`, citrus lime `#E3F18C`, peach `#FFE3CD`. Supersedes the original ivory/teal trial. Rating colors remain separate from branding and supplement explicit text/icons. |
| Layout | Softly rounded cards, readable typography, clear hierarchy, restrained motion, illustrative food icons. Adapt to small widths and OS text scaling; decorative art can disappear before content is crowded. |
| Product result | Clear rating/reason and visible conflicts/uncertainty. Default new results to 1× portion, with the serving basis in small readable text. Do not change the basis of a previously saved result. |
| Ingredients/nutrients | Compact font sizes and spacing; ingredients and detailed provenance remain expandable. Small notes continue to support accessibility scaling. |
| Alternatives | Show eligible illustrated alternatives immediately below the assessment without an “Explore Alternatives” gate. Up to three cards per result, horizontally scrollable when multiple exist; show option counts and a next-card hint. Each card exposes identity, fit, retailer evidence and comparison before an optional detail tap. Never fabricate options to fill three slots. |
| Profile and store feedback (October 15) | Ask optional gender next to age; include General Fitness and No Concern. Reuse saved foreground-location permission without repeated explanatory banners. Store choice immediately returns to the previous screen; display the verified main branch street number. |
| Branding | Approved October 25: **NutriGlimpse**, tagline **Know your food. Understand your choices.** Existing backend domain grocery.serveforwad.com and app identifiers remain stable. Logo/final app icon remain open. |
| Phone review | Three iPhone testers, with a possible fourth tester on Android. Review legibility, thumb reach, screen reader labels, back navigation, scanning ergonomics, horizontal scrolling and result comprehension on both. Record issues without silently reducing supported scope. |

### 5.2 Beta 0 implementation and distribution boundary

Full mobile implementation is authorized. Beta 0 is the next delivery milestone, not permission to remove approved features or relax privacy. Distinguish implementation complete, native build verified, personal-data enabled and distributed to testers. An unfinished or synthetic route must remain explicitly labeled.

The user has no Apple Developer account or OpenAI API project yet and will obtain them when needed. These do not block local implementation. iPhone signing/distribution and live AI validation remain external dependencies. No account creation, billing, tester invitation or public release has been performed. Android APK and iOS internal-build configurations can be prepared now; signed artifacts and physical-device acceptance cannot be claimed from JavaScript bundle exports. The detailed aesthetic review is deferred to the phone/two-tester stage.

## 6. Data model

### 6.1 Device-only entities

| Entity | Important fields |
|---|---|
| `LocalProfile` | Local ID, schema version, user-entered age in years and confirmation date, optional declared gender (legacy absence allowed; never used to infer pregnancy or clinical sex), declared pregnancy context, primary concern, selected condition contexts, prevention/management intent, created/updated times |
| `ProfileRevision` | Immutable local revision ID, effective time, age/pregnancy context, selected conditions/preferences/targets, confirmed lipid report/revision references and their provenance; pointer from the current profile |
| `DietaryPreference` | Vegetarian status, egg choice, dairy choice, halal, kosher, gluten-free, explicit unset/unknown choices where relevant |
| `ConditionContext` | Condition ID, user-declared diagnosis/concern, optional clinician-provided dietary targets, applicable subgroup context, provenance of any target |
| `LocalProductObservation` | Device-only facts extracted/corrected from the user's package, raw label text, private source/version, serving and preparation basis, identity confidence, explicit missing fields; optionally linked to a verified public version |
| `LocalFreshFoodObservation` | Confirmed generic food identity, observed form/preparation, entered portion or explicit comparison amount, reference-food/version link, estimated nutrients and uncertainty; never implies a verified branded product or certification |
| `ScanRecord` | Local ID, public product-version and/or local observation reference, user-confirmed identity, capture method, timestamps, local assessment snapshot |
| `AssessmentSnapshot` | Condition/restriction results, intended amount and serving basis, evidence coverage, rule-pack version, public/private product versions, profile revision or embedded relevant context, explanation provenance |
| `ReceiptRecord` | Local ID, capture/import timestamp, separately extracted receipt date/store if available, compact line items, confirmed matches, unresolved rows and analysis snapshot; no source photo |
| `LabReportRecord` | Local ID, revision, confirmed test date and its source, separately stored report issue date when present and import time, compact confirmed measurements/units/ranges, confirmation state/time, source fingerprints and analysis-record reference |
| `LabAnalysisRecord` | One completed structured result per report: concise findings, uncertainty/follow-up flags, evidence IDs, input revision, analysis time, model/prompt/schema/rule versions; encrypted locally |
| `LipidPersonalizationContext` | Device-only confirmed report/revision references, applicable rule-derived findings, required missing context, rule version, freshness/applicability state; absent when no confirmed panel exists |
| `LabMeasurement` | Analyte, printed name, raw value string, parsed value if valid, unit, comparator, reported range/flag, measured/calculated status if stated, page/region reference |
| `CaptureWorkingMedia` | Temporary local photo/PDF/page/crop for active product, receipt or report processing; encrypted if scratch files are unavoidable, excluded from backup/export and removed when no longer needed; no retained attachment entity |
| `LocalJob` | Operation state, permitted confirmed data, local fingerprint, in-flight guard and uncertain-outcome state; for lipid reports, compact state only after working-media cleanup, no retained PDF/photo retry draft; encrypted; retries subject to once-per-report policy |

No cloud consumer-profile ID exists. Local IDs are not sent as stable cross-request identifiers. One installation may initially contain one person's profile; family/household profiles are not silently added to scope.

Proposed age representation is an integer `ageYears` with `ageConfirmedAt`, avoiding a full birth date. Validate the 21+ boundary and request periodic reconfirmation rather than inferring an exact birthday. Proposed pregnancy choices are pregnant, not pregnant, or not specified; any additional context is collected only when a reviewed rule requires it. Never infer pregnancy from appearance, preferences or model guesses. Age/pregnancy edits create a new profile revision and trigger applicable local food reassessment; saved lipid interpretations are marked with their original context and are not automatically sent for AI reanalysis. Historical snapshots retain their original context.

Approved lipid fields: total cholesterol, LDL-C, HDL-C, triglycerides, ApoB and Lp(a), when present. Non-HDL-C when reported or transparently derived is a proposed clinical-rule detail for review; unrelated biomarkers are not implicitly added. Preserve source names, units, measured/calculated status and missingness. PDF input, anytime entry and most recent confirmed test-date selection are approved. Missing/ambiguous dates and conflicting same-date panels need engineering rules under Q-04. All supported ages and pregnancy need reviewed applicability under Q-07. Derived values retain formulas/inputs/units/rule versions; do not invent an absent measurement or an unsupported unit conversion.

Keep analysis compact using typed columns or a bounded, versioned structured record: measurements, concise findings and reference IDs rather than document blobs, full transcripts, repeated guideline text or provider message histories. Retain numerical precision and enough explanation to read the result offline; compactness must not discard caveats. Share public evidence text through the rule/source cache. Report PDFs/photos and derivatives are temporary working media, never retained attachments. Local fingerprints can support duplicate detection without retaining source bytes. Measure serialized and actual database storage (including encryption/index overhead) before agreeing a byte budget under Q-13. Local fingerprints and job state are private data, excluded from cloud backup and server telemetry.

### 6.2 Shared public entities

| Entity | Important fields |
|---|---|
| `ProductIdentity` | Internal ID, barcode/GTIN aliases, brand, product name, variant, size, market, category |
| `FoodReference` | Public source/version, generic food identity, form/preparation, nutrient observations and quantity basis; distinguish reference estimates from exact package facts |
| `ProductVersion` | Immutable formulation/label version ID, product identity, market, package size, as-sold/as-prepared basis, associated ingredient/nutrient/certification observations, coherence evidence, observation dates |
| `ProductSourceRecord` | Provider ID, source URL/reference, license, source-updated time, fetched time, raw permitted source fields, completeness |
| `NutrientObservation` | Nutrient, amount, unit, basis (`per_serving`, `per_100g`, `per_100ml`), serving mass/volume when supplied, source, missingness |
| `IngredientObservation` | Original ingredient text, parsed terms, language, source, observation date, label/certification evidence |
| `RetailerEvidence` | Chain, optional branch, product/variant ID, scope, listing URL, observed time, source, access rights, freshness |
| `Store` | Provider place ID, chain association, branch name/address/coordinates, hours when licensed, source freshness |
| `EvidenceSource` | Publisher, title, URL/DOI, publication/review date, relevant section, source type, allowed use |
| `ClinicalRule` | Condition/context, age and pregnancy applicability, input requirements, trigger/comparison, evidence IDs, evidence strength, exceptions, reviewer, version, status |
| `RulePack` | Version, schema compatibility, signed manifest, rule IDs, issue/withdrawal dates, checksum |
| `CatalogIngestionRun` | Source, status, public counts, validation issues, cursor, timing and rate-limit state |

A source observation must retain its provenance. A missing nutrient is null/unknown, not zero. Never merge records solely because their names are similar. Preserve product reformulations as distinct immutable versions. Facts may be evaluated together only when evidence supports the same product version, market and preparation basis; similar dates or an unchanged barcode alone do not prove this. Keep `source_updated_at` separate from `fetched_at`.

Private label corrections create `LocalProductObservation` records in the encrypted device database. They are not written into shared source tables. A fully unmatched product can therefore be reopened and re-evaluated from its local facts. Fill gaps from a public record only when the version match is supported; otherwise preserve the missingness. Each historical assessment retains its exact private/public observations, profile revision and intended amount so later edits do not rewrite its meaning.

### 6.3 Assessment contract

An assessment contains separate dimensions rather than a single opaque number:

- `identity_status`: confirmed, candidate, or unresolved.
- `restriction_status`: compatible, conflicts, or unverified for each selected dietary requirement.
- `condition_results`: Good fit, Neutral, Limit or Poor fit, specific reasons, applicability, serving context and required missing inputs for each selected condition.
- `evidence_status`: sufficient, partial, or insufficient for the claimed conclusion.
- `overall_state`: assessed, restriction conflict, needs information, or outside supported context.
- `versions`: product, rule pack, and any explanation model/prompt versions.

The four labels, separate Restriction conflict/Insufficient information states and layered explanation design are approved. Clinical mappings still require review; visual/accessibility implementation remains Q-12 design work. A conflict or insufficient information cannot be averaged away or hidden in the expanded “Why?” section. The primary condition controls prominence while all selected conditions remain enforced and visible. A model's self-reported confidence is not a calibrated probability or medical certainty score.

## 7. End-to-end workflows

### 7.0 Shared pre-LLM privacy processing

The general masked-image mechanism below remains proposed for product photos, labels, receipts and any future vision-based report path. The implemented real-report path in section 7.5 instead reconstructs a strict numeric/date allowlist from local OCR; no original or masked image, PDF, filename or arbitrary OCR text reaches the service. The first LLM call must already receive sanitized data; an external LLM cannot locate identifiers in the original as a preparatory step.

1. Decode images or render selected PDF pages on the phone using bounded, non-networked processing. Inspect native PDF text locally where available and detect identifying text in rendered pixels. Local OCR/entity detection is for privacy; clinical extraction still uses OpenAI after sanitization.
2. Locate personal names, SSNs and identifying addresses wherever they occur, including later-page headers/footers and incidental image content. Conservatively mask ambiguous identity blocks. Preserve clinical values, units, report dates and ranges. Public product/retailer names needed for recognition are distinct from personal identity information; exact detector policy and broader identifier coverage need review.
3. Burn opaque masks into decoded pixels and encode fresh images. Do not use removable overlays, blur, PDF annotation rectangles or a redacted preview with the original attached. Do not forward original PDF objects, native/hidden text, attachments, forms, prior revisions, EXIF, embedded thumbnails or identifying filenames. Use generated request-local names and approved minimal metadata only.
4. Validate the actual outbound derivative automatically, without a mandatory preview or user approval step. Detection failure, unreadable identity areas or uncertain masking stops upload and offers recapture, a clearer file or cancellation. User confirmation is not a fallback for failed sanitization. A detector's confidence score is not proof of anonymity.
5. Build later text payloads from allowed structured fields. Recheck corrected text, comments and context so names/SSNs/addresses cannot be reintroduced. No raw OCR text, redaction lookup table or original filename is appended to a prompt. Apply the same checks on any permitted retry.

The backend accepts only the sanitized derivative and minimum structured context. Verify payload type and metadata and use independent non-LLM checks where practical; a client `redacted=true` flag alone is insufficient. Validate this path with actual transmitted bytes and representative adversarial fixtures. The retained medical content remains sensitive even after these identifiers are removed. Detector/library choice and failure-recovery details remain proposed; automatic processing without mandatory preview is confirmed. No perfect automated detection claim is made.

### 7.1 Product photo, barcode, and label fallback

1. Capture/import a product photo. A barcode route is also available but does not replace photo identification.
2. Apply section 7.0 privacy processing and limit image size while preserving readable product details. The device may decode a product barcode locally; unrelated identifying codes are not sent for interpretation.
3. Submit only sanitized necessary image(s) to the transient OpenAI extraction route when visual interpretation is required.
4. Treat extracted brand/name/variant/barcode as candidate evidence; resolve against authorized product sources.
5. Present uncertain variants for user confirmation. Do not silently select a similar flavor, package, country, or formulation.
6. Retrieve available nutrient and ingredient observations. Show conflicts and request current-package label photos when material facts are missing or inconsistent.
7. Extract Nutrition Facts and ingredients separately; validate units, serving basis, decimals, nested ingredients, and unsupported text. Permit manual correction.
8. Apply the downloaded rules on the device using the confirmed product and local profile. If an AI explanation is requested, send only relevant facts/context and approved evidence IDs for that request.
9. Save the resulting personal assessment locally. User-uploaded product images and corrections do not automatically become shared training/catalog contributions.

A package Nutrition Facts panel is insufficient to establish ingredients, religious certification, or cross-contact details. The capture flow must request the appropriate additional surface.

For a fresh/unpackaged item, route to generic-food identification rather than repeatedly requesting a package label. Confirm ambiguous food identity and relevant form/preparation, then retrieve an appropriate permitted reference record and obtain a portion or show an explicit comparison basis. Store reference provenance with the estimate. Do not infer exact weight, added ingredients or certification from appearance. If the reference or necessary context is missing, retain an insufficient-information state instead of inventing nutrition. Use the same path for identifiable loose-food receipt lines and generic food alternatives. Label these separately from exact SKU matches and preserve the existing retailer-evidence requirement for any availability claim. Restaurant meals, home-cooked recipes and supplements are excluded. Packaged grocery meals remain eligible with supported data; ambiguous grocery-prepared dishes remain Q-10 handling details.

### 7.2 Assessment and explanation

1. Establish age and declared pregnancy context alongside selected conditions and any confirmed lipid findings, and select rules with reviewed applicability. Include confirmed lipid results automatically when available. Without a panel, use the selected profile without blocking shopping features. Missing required context limits the affected conclusion; a generic adult rule is not presumed applicable to every supported context.
2. Check required inputs. Stop only the conclusions that need missing information; show independently supported observations.
3. Check dietary requirements independently, including unresolved evidence.
4. Normalize serving quantities using explicit known conversions. Compare alternatives on equivalent bases; avoid converting volume to mass without a known density or labeled equivalence.
5. Compute nutrient contributions and rule findings deterministically.
6. Assign the approved category labels using clinically reviewed mappings. Daily dietary guidance does not automatically define per-product boundaries.
7. Generate or select plain-language explanations tied to exact findings and registry citations.
8. Verify all stated numbers, condition names, product names, and citation IDs. If a generated explanation fails validation, use a reviewed template with the computed facts.

Clinical-rule examples are specifications of behavior, not approved medical cutoffs:

| Context | Rule design requirement |
|---|---|
| Hypertension | Explain sodium amount per intended serving and contribution to an applicable target; distinguish a daily target from a single-food category |
| Diabetes | Consider total carbohydrate, serving and relevant quality attributes; do not predict an individual's glucose excursion from a package |
| Obesity/weight management | Assess portions and nutritional context; avoid making lower calories the sole ranking criterion |
| Celiac/gluten-free | Use ingredient and labeling evidence; missing wheat text does not establish gluten-free suitability |
| CKD | Require relevant individual restrictions/context before applying potassium, phosphorus or protein limits |
| SIBO | Distinguish possible symptom triggers from tested FODMAP content and treatment claims |
| Pregnancy within the approved catalog | Use reviewed pregnancy-applicable rules for food assessment, alternatives, receipt feedback and lipid interpretation; request necessary context and disclose specific evidence gaps |

Food–disease rules need expert review and a documented validation set. Religious dietary requirements are handled through their own product evidence; medical sources cannot establish halal or kosher certification.

Reviewer recruitment does not block engineering or testing. Build the rule pipeline and complete journeys using sourced draft rules and synthetic cases, preserving draft/reviewed status. Candidate draft packs can be exercised in development/test environments before expert review; do not portray passing software tests as clinical validation. Incorporate reviewer feedback through the versioned rule pipeline without requiring a restart of application development. Pre-publication approval remains the proposed release criterion from REQ-DATA-03.

### 7.3 Store identification and alternatives

1. After onboarding, request foreground location only if permission is undetermined. Reuse the saved automatic-location preference and the OS grant during foreground sessions; do not repeat the in-app explanation on ordinary navigation. Manual selection and disabling automatic location remain available. The OS can still request permission again after revocation or a one-time grant.
2. The implemented OSM directory is downloaded and matched on device. GPS coordinates are neither uploaded nor saved; no background watch or backend location history.
3. Match candidate places to known chains; consider reported location accuracy. Show the selected branch prominently and ask the user to resolve ambiguous nearby stores.
4. Find public candidate products in the same food category/function from source catalogs. Do not transmit the entire dietary profile for catalog search.
5. On the device, filter candidates against selected restrictions and relevant health constraints, automatically incorporating applicable confirmed lipid findings. Absent or unconfirmed results are not assumed normal and do not block recommendations based on the remaining profile. For required halal, kosher or gluten-free settings, Unverified status excludes a product from compatible alternatives. It can still be displayed as an unverified scanned product, not as a supported conflict or compatible recommendation.
6. Prioritize eligible products with evidence of being sold by the current chain. Use branch-specific evidence where available, while displaying its actual scope.
7. If no suitable same-chain candidate is found in the available sources, search other supported chains and locate nearby branches. This means “no suitable match found,” not proof that the current chain sells none.
8. Present product, reason, comparable nutrient facts, chain evidence, branch distance and directions. Say “sold by this retailer; local availability may vary” when only chain-level evidence exists.

Candidate eligibility requires restriction compatibility, applicable clinical constraints, a practical substitution and a meaningful improvement for the primary concern or resolution of the original product's dietary conflict. Disclose material tradeoffs for other selected conditions. Rank eligible options by current retailer first, then distance-ordered nearby branches; use degree of improvement to order options within a retailer. Do not fetch prices, rank by cost or require a budget preference. Nearby search defaults to an adjustable 10-mile radius. Proposed local storage preserves the chosen radius; show it and offer expansion explicitly when no relevant matches are found. Distance ordering with directions is confirmed. Proposed implementation uses approximate straight-line miles for the radius and ordering, labeled clearly; driving time does not control rank. Radius limits and directions integration remain engineering details under Q-11.

Exact stock and aisle data are optional enrichments, not prerequisites. Major-chain listing alone does not prove a product is commonplace: use a curated category/brand set, repeated catalog evidence and regional context to avoid obscure marketplace-only items. Price ceilings and budget controls are excluded from the planned scope. Sponsored placements and commerce are not confirmed features.

### 7.4 Receipt analysis

1. Capture/import one receipt or overlapping images with page/order information.
2. Apply section 7.0 privacy processing, then submit sanitized images to OpenAI for line extraction. Extract food candidates, non-food rows, fees, discounts, quantities and ambiguous abbreviations as separate fields.
3. Detect repeated/overlapping rows; preserve original line text for user review only on device.
4. Use extracted retailer/date context as evidence, not as a guaranteed product identifier. Map a receipt store to a branch only when the information supports it.
5. Resolve products using identifiers and catalogs; require confirmation for ambiguous candidates. An abbreviated receipt entry cannot establish exact ingredients or gluten-free/halal/kosher status.
6. Run the same food-assessment engine for confirmed matches. Exclude non-food rows from food judgments.
7. Display per-item findings, unresolved items, and a basket summary with its coverage denominator. Example: “8 of 12 food items assessed; 4 need identification.”
8. Save receipt analysis locally. Offer specific mainstream swaps using the same retailer rules. Default to the confirmed receipt retailer, even if the receipt is uploaded at home or in another store; offer a visible switch to a current shopping retailer. Show the origin used for nearby searches and allow it to be changed. Do not silently replace receipt context with GPS context.

Purchase quantities are not consumed portions. Classify purchase, refund, discount, fee and tax rows separately. Show returned products separately and exclude them from the purchased-food basket summary. Preserve weight units for weighted items; a printed price is not a food quantity. Do not report the receipt as the user's dietary intake or infer how purchases are divided across people. Avoid precise nutrient totals when package size, quantity, identity or nutritional basis is unknown. Optional “if consumed” scenario calculations require separate product approval.

### 7.5 Real lipid import: implemented boundary and remaining clinical work

The current implementation is described in [36-real-lipid-import.md](36-real-lipid-import.md). It implements local image/PDF reading followed by an OpenAI structured consistency check, not original-image LLM extraction or a clinical interpretation service.

1. Require the initial versioned beta agreement, which explains accepted OpenAI default retention. Adding a report remains optional and available later without account registration. The native path accepts a camera photo or selected JPEG/PNG/unlocked PDF, bounded to 20 MiB and ten pages; the browser preview does not accept real files.
2. Stage source media in the native private-input session and calculate a device-only exact-byte fingerprint. Reopen a recognized saved report or prior import record before OCR or a new AI call. No fingerprint, source handle, URI or filename is sent to the service.
3. Read pages locally using the native OCR implementation. Reconstruct only a strict `LipidEvidence` object: supported analyte, numeric value string, printed unit, comparison sign, source page, explicit test/collection date and enumerated issues. Exclude names, SSNs, addresses, all other text, reference ranges/flags and every image/PDF byte. Ambiguous or unsupported fields remain missing or stop preparation; the parser cannot assume units or select a date of birth as the test date.
4. Dispose of app-owned source copies and native working media; preserve the user's original in Photos/Files. Persist a compact local in-flight journal before dispatch. Send only `{consentVersion, evidence}` to the authenticated, bounded `POST /v1/reports/extract` route.
5. The fixed `gpt-6-luna` request uses strict Structured Outputs with `store: false`, foreground processing and no tools/files. The response must preserve every evidence value, unit, date, page and issue exactly; neither the server nor client accepts invented, omitted or altered fields. This validates structured consistency, not the truth of OCR or medical conclusions. The model cannot recover fields omitted by local OCR.
6. Save the validated compact result before presenting it. The user checks it against the original report and may make source-linked corrections. Confirming valid measurements and a non-future test date saves a real panel; unconfirmed results and fictional panels cannot personalize real shelf comparisons. No second AI interpretation request is implemented.
7. Reuse saved results for reopening and recognized exact-byte duplicate imports. Failed or uncertain attempts require an explicit retry. If a valid result exists in memory after a local-save failure, retry only the save. The service keeps no persistent report identity or result cache; unknown remote completion can still cause repeat computation on an explicit retry.
8. Recompute the local Shelf Scan nutrient comparison when the profile, confirmed panels or selected test-date context changes. Select the latest confirmed test date, never upload order; do not combine different panels. Same-date conflicts require explicit resolution, and missing/unsupported context remains explicit. Deletion removes the report's current influence. See [33-shelf-ranking-policy.md](33-shelf-ranking-policy.md) for the limited source-backed nutrient axes, restrictions and withheld contexts.

Full clinical interpretation remains a required future deliverable: separate laboratory reference ranges/flags from individualized targets; use reviewed evidence applicable to age, pregnancy and other context; preserve uncertainty; avoid diagnosis, prescribing and unsupported risk estimates. Full disease-specific food categories, receipt personalization and broad alternative recommendations are not established by the current shelf comparison. No clinical cutoffs or absolute health scores are supplied by the model. Qualified-reviewer recruitment and clinical validation continue alongside development/testing rather than blocking engineering.

### 7.6 Once-per-report execution and recovery

The implemented real-report coordinator uses a device-only SHA-256 exact-byte identity and compact journal. Identical imported bytes can reuse the saved result. Canonical rendered-page fingerprints and confirmed date/measurement matching are future proposals, not implemented semantic deduplication; a re-encoded PDF or new photograph may be treated as a different source. Do not automatically merge different reports merely because values match. Resolve ambiguous matches locally before a second interpretation. These checks reduce duplicate work; they are not a guarantee of recognizing every possible re-photograph.

The real-report journal implements `in-flight`, `outcome-unknown`, `failed` and `completed`, plus an in-memory save-pending result. It stores only canonical evidence/result, fingerprint and timestamps in encrypted local app state. The broader proposed clinical workflow adds needs-confirmation and interpretation states; it is not delivered by this increment. Persist intent before dispatch, serialize submissions for the same report and atomically save a valid returned result before marking completion. Initial extraction and clinical interpretation are separate workflow steps; failed-attempt retries may add requests under the approved recovery policy; once a completed result exists neither is repeated for ordinary views or known duplicate imports.

Turn off automatic SDK/gateway retries for report interpretation and expose a user-controlled “Try again” action when no successful result was saved. This includes failure before dispatch, unusable output and outcome-unknown after a timeout or connection loss. The user approved the possibility of repeat remote computation in that last case. Recheck local completion/in-flight state immediately before dispatch and reuse a saved successful result if present. Prefer saving an already received valid result over another AI call. If source media is needed again, request reselection/recapture and repeat local redaction. No retained source attachment or durable remote result store is introduced.

Proposed implementation uses a report-scoped local lock and attempt IDs, atomically accepts one valid completed result, and prevents late responses from overwriting that result or launching further calls. User retry must not race an active local attempt. All requests retain the existing privacy and payload-validation rules. This is once-per-report saved-result reuse with explicit failed-attempt retries, not an exactly-once remote-execution guarantee.

Editing confirmed values, importing a corrected report, deleting the cached result or losing the phone must not silently bypass the once-per-report rule. Mark outdated dependent interpretation clearly; correction/recovery policy remains Q-04/Q-06. App/rule/model updates do not automatically reanalyze old reports. Local food rules may recompute applicable findings from confirmed saved values without another LLM interpretation; preserve the provenance of the original report analysis. Later AI food explanations, if used, receive only necessary sanitized food-assessment findings and cannot invoke a repeat lipid-report analysis.

### 7.7 Shelf Scan and app-session lifetime

**Sampling target confirmed October 14:** 2 images per second, one every 500 ms while actively scanning under normal conditions. Detailed spec v1.1 adds SS-T23 to measure physical-iPhone capture cadence separately from completed recognition throughput. Keep bounded queues and existing spending limits; sampling is not a promise of two cloud calls/results each second.

[Detailed Shelf Scan implementation specification](26-shelf-scan-implementation-spec.md) owns detailed engineering proposals: Swift iPhone native camera/preprocessing, TypeScript shared logic and Kotlin Android adapter, state/protocol contracts, SS work packages and physical-device acceptance. Read it alongside this approved-behavior summary. Current fixture ranking and Android evidence do not establish personalized shelf ranking or iPhone compatibility.

Implements REQ-SHELF-01–05. Add a toggleable Shelf Scan capture mode and an in-app list of scan runs from the current app session. A run contains an ephemeral ID, category/store context, identified product versions, uncertainty queue, profile/rule provenance and current ranking. Original/reduced-sugar variants compete within the same category as distinct entries. Grouping identical-formulation sizes is proposed, not a reason to merge distinct formulations.

Proposed architecture: an app-level in-memory run collection shared across screens, with one active capture run. Starting a new run appends rather than replaces. Finish stops acquisition and preserves results; Resume continues that run. Switching runs stops the prior capture before starting another. Background/inactive state pauses acquisition and processing dispatch; returning shows the paused state. Navigating, changing modes or finishing a run never clears the collection. App/process termination discards it; a new process starts empty. Do not write shelf runs to SQLCipher, persisted UI/navigation state, state-restoration bundles, job journals, exports, backups or server logs. No shutdown callback is needed to enforce absence on the next launch. Public product facts may remain in the existing public cache, but shelf-run membership, timestamps, ordering, uncertain-match queues and personalized rankings must not persist through that cache. Existing saved individual scans, receipts, reports and settings are unaffected.

Continuously acquire bounded frames while scanning, with proposed local blur/overlap checks, deduplication, bounded inference concurrency and backpressure. Discard redundant frames rather than build an unbounded queue. Apply the existing pre-LLM redaction to each outbound image. Extract multiple candidate products, resolve exact variants against supported public facts, then run the existing local assessment engine. No camera frame alone proves ingredients, certification or exact product identity. Keep uncertain candidates outside the ranked list until confirmation/facts are sufficient. The 500 ms sampling target is user-selected; actual throughput, product capacity and latency need device measurements; continuous scanning does not require sending every camera frame to the cloud.

Show up to ten eligible assessed products for the chosen category, concise personalized reasons, count assessed and count awaiting confirmation. Do not interpret first place as medically recommended without qualification: display the existing Good fit/Neutral/Limit/Poor fit result and restriction/uncertainty information. An aisle-wide scan cannot claim exhaustive shelf coverage. Keep quantity bases comparable and rule versions recorded; tie-breaks and updates must be deterministic for the same inputs. If profile or confirmed lipid context changes, recompute shelf rankings locally and never rerun report interpretation.

After Finish, bounded already-dispatched work may resolve with a visible pending state; Pause stops new acquisition/dispatch. Reject late results for cancelled work or a different run rather than attaching them to the current run. Temporary capture files, if unavoidable, use the existing encrypted scratch/cleanup path and are never history. Do not retain previous scans merely through a disk cache. If the operating system terminates the app while backgrounded, old runs cannot be restored; this matches process-lifetime storage and should be explained in the UI. A Close session action must not automatically delete prior runs; the approved automatic clearing event is app termination.

Verification: scan A then B and return to A; finish/resume; mode/category changes; uncertain variants and repeated package sightings; fewer than ten eligible products; profile/lipid changes; background pause; terminate/relaunch with no shelf runs; absence from SQLite, restoration and export; confirm saved lipid/preferences/ordinary history survive. Exercise memory pressure, frame backpressure and late responses on both phone platforms. No Shelf Scan runtime verification is claimed by this specification amendment.

## 8. API contract proposals

All endpoints are versioned. Sensitive responses use `Cache-Control: no-store`; gateways/CDNs must honor the same boundary. The table below preserves broader proposed contracts. The implemented report routes are `GET /v1/reports/capabilities` and `POST /v1/reports/extract`, documented in [36](36-real-lipid-import.md); they return a schema version and stable errors without a persistent report identifier or server result cache. The conceptual lab schema below is not the wire format for these routes.

| Route | Input / output | Retention class |
|---|---|---|
| `POST /v1/access/session` | App-attestation evidence when supported; short-lived app token | Minimal security metadata; Q-14 |
| `GET /v1/catalog/products/{gtin}` | Public product records with source/freshness/coverage | Shared catalog; redact request linkage from logs |
| `GET /v1/catalog/search` | Product name/category and market; public candidates | Shared catalog; queries must contain no health/profile context |
| `GET /v1/catalog/alternatives` | Product/category, chain/market, pagination; broad candidates | Shared catalog; health filtering is local |
| `POST /v1/stores/nearby` | Coordinates, accuracy, radius; candidate branches | Coordinates transient; public store results cacheable independently |
| `GET /v1/rules/manifest` | Client schema version; current/withdrawn pack metadata | Public |
| `GET /v1/rules/packs/{version}` | Signed complete rule pack and source metadata | Public; download without disclosing selected conditions |
| `POST /v1/vision/extract` | Operation type, sanitized image bytes and allowed context; typed extraction; reject original PDF uploads | Sensitive/transient; privacy checks precede inference |
| `POST /v1/labs/analyze` | Identifier-filtered confirmed measurements, necessary context, rule version; compact structured analysis | Sensitive/transient; local once-per-report guard; no durable result cache |
| `POST /v1/assessments/explain` | Sanitized computed food findings and necessary context; grounded explanation; no repeat report interpretation | Sensitive/transient; optional when local templates suffice |

There are no consumer login, profile-write, report-upload-storage, history-fetch, or synchronization endpoints. Staff administration for evidence and source management is separate from the consumer app and requires its own access controls.

### 8.1 Extraction schema sketch

The following is a conceptual JSON shape, not a finished OpenAI JSON Schema. Final schemas must use the selected endpoint's supported strict-schema subset and explicit nullable fields.

```json
{
  "schemaVersion": "1",
  "operation": "lipid_panel",
  "status": "needs_confirmation",
  "testDate": null,
  "testDateSourceText": null,
  "reportIssuedDate": null,
  "measurements": [
    {
      "analyte": "LDL_C",
      "printedName": "LDL Cholesterol",
      "rawValue": "128",
      "numericValue": 128,
      "unit": "mg/dL",
      "referenceRangeText": null,
      "reportedFlag": null,
      "measurementMethod": "not_stated",
      "sourcePage": 1,
      "sourceRegion": null,
      "readability": "clear"
    }
  ],
  "missingFields": [],
  "warnings": []
}
```

The illustrative number above is not a medical threshold or interpreted result. Products and receipts use separate schemas. A generic free-text blob is insufficient for storing or evaluating medical measurements.

### 8.2 Validation and errors

Validate schema, numeric parsing, unit compatibility, field relationships, source evidence IDs, product identity, prohibited instruction content, and required missingness states. Strict JSON output does not establish factual accuracy; refusals, truncated output, and semantic errors require dedicated handling [T-04].

Proposed error codes: `UNSUPPORTED_MEDIA`, `PAYLOAD_TOO_LARGE`, `UNREADABLE_IMAGE`, `NEEDS_CONFIRMATION`, `AMBIGUOUS_PRODUCT`, `INSUFFICIENT_FACTS`, `UNSUPPORTED_CONTEXT`, `PROVIDER_REFUSAL`, `PROVIDER_UNAVAILABLE`, `MODEL_OUTPUT_INVALID`, `RATE_LIMITED`, `REQUEST_EXPIRED`, `RULE_VERSION_UNSUPPORTED`, and `LOCAL_STORAGE_UNAVAILABLE`.

Display useful next actions. Distinguish quota problems from an unreadable image. A cloud outage must never produce a fabricated product match, lab value or health assessment.

Additional proposed states/codes are `REDACTION_FAILED`, `REPORT_ALREADY_ANALYZED`, `ANALYSIS_IN_PROGRESS` and `ANALYSIS_OUTCOME_UNKNOWN`. Duplicate/in-flight state is managed locally; the backend does not retain a consumer report registry. Only sanitized image/text payloads reach a model, including in recovery paths. Redaction does not produce a mandatory user-review state.

## 9. OpenAI integration and provider retention

The implemented report route uses the Responses API and fixed `gpt-6-luna` model with strict Structured Outputs. Only the canonical `LipidEvidence` object is supplied as text. No original or sanitized report images/PDFs, raw OCR transcript, profile, fingerprint or document identifier is sent. Image-capable extraction and grounded clinical explanations remain separate future work; the schema check cannot independently verify the source report [T-03, T-04].

Implemented call policy:

- Explicit `store: false`, `background: false`, `stream: false`; no previous-response linkage, persistent conversation, files, tools or web search.
- Bounded 8,192-byte incoming JSON, 4,096 maximum output tokens, one report request in flight, a fixed transport deadline and a bounded response. Invalid input is rejected before provider invocation.
- No automatic SDK/gateway retry. A device journal persists intent and reuses completed results; only a user-chosen retry may repeat an uncertain remote attempt.
- Strict output validation requires exact evidence equality; no changed numbers, inferred units, invented dates, omitted rows or extra text. Passing schema validation is not medical validation.
- Server credentials stay out of the mobile bundle. A locked aggregate ledger reserves $0.02 per attempted dispatch against the shared $1.80 guard inside the existing $2 testing authorization, preserving prior reservations. It stores only cost metadata, never report content or fingerprints. Missing/malformed/unavailable budget state fails closed.

**Accepted provider-retention boundary:** The user explicitly accepted OpenAI default API retention through the mandatory initial agreement `beta-report-ai-2026-10-14.1`. The app stores consent locally before beta use and links the current [OpenAI API data policy](https://developers.openai.com/api/docs/guides/your-data). Default abuse-monitoring retention may include content for up to 30 days, subject to applicable exceptions; caching and other feature-specific retention must also be described consistently with the actual configuration. `store: false` is not a promise of provider-wide non-retention. Zero Data Retention is neither required for this accepted beta arrangement nor claimed as enabled [T-07].

The exception applies to OpenAI's disclosed processing and retention. App-operated services still must not persist personal requests or results. Deleting a local report does not remove provider-retained content. No training opt-in or unrelated disclosure is authorized by this agreement. Physical-device payload, cleanup and storage/backup checks remain required evidence; they are separate from the now-resolved beta retention decision. See [36](36-real-lipid-import.md) for deployment and verification evidence.

## 10. Privacy, security and local persistence

### 10.1 Transient backend processing

Personal payloads exist only for the active request. Use bounded in-memory decoding and processing. Enforce file type, dimensions, page/count and size limits before expensive inference. Audit the ingress proxy and SDK for disk buffering. Disable body logging, prompt capture, response capture, replay tools and content-bearing traces. Keep personal payloads out of durable job queues, retry records, error dumps, object stores and backups.

On success, failure, cancellation or timeout, release buffers and temporary references. In managed runtimes, releasing memory is not a guarantee of immediate physical zeroization; the design promise is no deliberate durable application storage. Disable process core dumps and inspect platform behavior. Do not persist images to work around a provider or hosting limitation without revising the privacy design.

Use content-free operational measurements such as aggregate latency, failure class and token totals. They must not include report text, exact GPS, product-search histories, user profile values or stable consumer identifiers. Any IP-based or token-based abuse state requires Q-14's purpose, lifetime and access policy. Hashing an identifier does not make a user history anonymous.

### 10.2 No-login access and cost protection

Keep OpenAI and data-provider secrets in backend secret storage. The mobile bundle contains no secret provider keys. Proposed controls are short-lived app tokens, optional platform app attestation, and application-enforced admission, concurrency and spend limits, supplemented by verified provider controls. Rate-limit token issuance itself so repeatedly requesting a new session cannot bypass analysis limits. Rejection produces a clear retry path without forcing account registration.

Candidate session lifetime: 30 minutes; ephemeral rate-limit counters: at most 60 minutes. These are proposals pending Q-14 and abuse testing. If a shared volatile store is used, disable disk persistence/backups and inspect hosting defaults. Aggregate service spend totals may persist without request, device or user linkage; reserve budget for in-flight calls to avoid uncontrolled concurrency overshoot. Rate limits must consider legitimate shared networks and accessibility workflows. Technical app authentication is not a consumer login or cloud health profile.

### 10.3 Device storage and recovery

The temporary-media lifecycle below applies to products, receipts and reports. Retain compact extracted facts and assessments with capture/import timestamps, and preserve receipt dates or report test dates as separate source facts. Do not retain user photos, thumbnails, redacted derivatives or full provider transcripts in history or exported backups. Public catalog assets, if licensed and used, are independent of the user's captured images and must not become a cache of user uploads. Record retention is distinct from photo cleanup; structured history remains until user deletion. Preserve essential extracted ingredient text and unresolved receipt fragments where needed, without storing a full image or unrelated OCR transcript.

Shelf Scan runs are the explicit exception under section 7.7: memory-only across scans for the current app lifetime, excluded from all persistent history/export paths. Saved structured individual food-scan results, receipt analyses and lipid results have no automatic expiration; retain them until the user deletes them. Public caches may be refreshed or evicted independently, but that must not delete saved personal results or their necessary provenance. Low-storage handling offers user-directed cleanup and never silently removes history. This is a retention policy, not cloud backup or a guarantee against device/app-data loss. Original report media still follows the separate temporary lifecycle below. Preserve saved results as historical records when rules change rather than treating old interpretations as current guidance.

Use an encrypted private database. Store only a compact encryption key in secure key storage, apply it before database reads/migrations, and test that opening without the key fails. SQLCipher support requires an appropriately rebuilt native application [T-01]. Encrypt unavoidable temporary working media; secure key storage is not a replacement for an encrypted dataset [T-02].

Report media has a separate temporary lifecycle. Prefer in-memory processing; if local scratch files are necessary, encrypt and exclude them from backup. Remove imported app copies, rendered pages, redacted derivatives, thumbnails and crop previews when no longer needed and on completion, cancellation or abandonment. On relaunch, clean orphaned report media from interrupted sessions before resuming normal work. Persist only the compact allowed fields and job/deduplication state; retaining a full report for later retry or history is not allowed. A retry requiring source media asks the user to select the original again and still obeys section 7.6. No permission bookmark/path is retained solely to reopen a source automatically. These are proposed cleanup mechanisms implementing the confirmed no-retained-source policy.

Exclude private databases, journals, temporary media and settings from automatic cloud backups. Automatic transfer/sync remains disabled; explicitly initiated encrypted export/restore is approved. Audit both OS families and supported versions; Q-06 resolves implementation details, not permission to enable automatic backup. Keys should not sync through platform services. Test app reinstall, key loss, device-lock changes, migration failure and interrupted writes. Present a recoverable UI state rather than overwriting a database whose key is unavailable.

Deletion must cover related app records, attachments, temporary copies and indexes. Account for database journals and remnants; select a tested secure-delete/rewrite strategy. Do not promise forensic erasure from flash storage. Full reset can destroy the app encryption key and recreate private storage; ensure reinstall cannot accidentally recover an old profile through a surviving secure-storage key.

Deleting a lipid report also invalidates its active personalization context and derived copies used for future food ratings and alternatives. Selected conditions and dietary preferences remain in effect. Select the most recent remaining confirmed panel by test date; if none remains, remove lab personalization. Historical assessment redaction/deletion still needs a Q-06 policy, and date ambiguity remains Q-04; copied values must not reactivate the deleted report.

In-app camera captures should not automatically create copies in the system photo library. Imported originals may already exist in Photos or a cloud file provider; app deletion affects only app-managed copies. The future website receives no automatic copy of local records.

Proposed export/restore flow: assemble a compact versioned archive of saved results, selected conditions, primary concern, dietary preferences, required provenance and completed-analysis/deduplication state on the phone. Approved preferences retain explicit unset/unknown states and separate egg/dairy choices. Exclude all user-provided photos/PDFs and derivatives, scratch files, credentials and provider transcripts. Use reviewed authenticated encryption with a portable user-held secret rather than relying solely on the exporting phone's hardware key. Exact cryptographic format/key UX and any further profile-context fields require engineering review. The user explicitly chooses a file destination they control; no app backend or LLM receives the contents. Restore preserves all selected restrictions and the primary concern; conflicts with existing settings are handled through Q-06's restore policy.

Restore validates/decrypts locally, checks integrity/schema compatibility, previews conflicts and imports atomically. Preserve saved report analyses without LLM calls and select the current panel by confirmed test date. Wrong-key, corrupt or incompatible files must not overwrite data. Define collision behavior under Q-06. Explain that a previous export may contain records subsequently deleted in the app, and restoring it may restore those records. Exported copies remain user-managed; app deletion does not remove them, and no server-held recovery key is assumed. Add explicit export/import actions to Privacy / storage and implement them in WP-07; verify portability, failure cases and absence of cloud traffic through V-10.

### 10.4 Untrusted content and external links

Treat report text, packaging, receipts, catalog fields and model output as untrusted data. Ignore embedded instructions. The AI extraction path cannot call arbitrary tools, follow URLs printed in a document, mutate settings, send messages, or access the local database. Sanitize rendered text and constrain evidence links to the reviewed registry. Reject arbitrary remote-image URLs on upload endpoints to prevent server-side fetch abuse.

Use TLS, minimal permissions, bounded image decoders, dependency updates and separate environments. Synthetic or explicitly authorized test documents are used in development; private user records do not become evaluation fixtures or model-training data by default.

## 11. Data sources, licensing and coverage

| Source | Intended use | Required qualification |
|---|---|---|
| USDA FoodData Central | Identifiers, ingredients, serving/nutrient observations | Public data; preserve source and dates; branded records largely come from industry submissions [D-01] |
| Open Food Facts | Additional product coverage and label evidence | Contributor quality checks; ODbL and image-license review before importing/redistributing [D-02] |
| Manufacturer/package evidence | Current variant and formulation resolution | Preserve dated source; uploads may be processed transiently, while saved copies remain on-device and do not become shared catalog contributions |
| Retailer catalogs/feeds | Mainstream availability at chain/branch scope | Verify actual access and reuse rights separately for each retailer |
| Places data | Nearby branches and geographic metadata | Attribution, permitted caching, source coverage and coordinate handling [T-06] |
| Medical organizations | Reviewed disease/nutrition rules and explanations | Track recommendation scope, evidence and review; not branded-food rating APIs |
| Monash/FODMAP sources | Potential licensed measured/certified information | No public import right or API is assumed; ingredient inference is distinct from measured content [D-03] |
| Certification organizations/manufacturers | Halal, kosher, gluten-free evidence | Track exact product, market, certification scope and freshness; authorities/criteria remain Q-08 |

Keeping source records in separate tables does not automatically resolve share-alike or redistribution obligations. Evaluate the actual combined product and usage rights. Access to a consumer website is not authorization to copy its entire catalog.

Named retailer coverage plan:

| Retailer | Candidate evidence path | Unresolved dependency |
|---|---|---|
| Walmart | Authorized catalog feed or reviewed product listings | Marketplace developer access is not assumed usable for this consumer app [R-01] |
| Wegmans | Authorized feed or verified consumer product listings | No reusable third-party API established [R-02] |
| Price Chopper / Market 32 | Authorized chain/aggregator access or curated listings | Confirm intended northeastern chain; storefront access is not bulk-data permission [R-03] |
| Target | Authorized feed or retailer listings | Branch display and catalog data rights need verification [R-04] |
| Shaw's | Authorized chain feed or product listings | Selection may vary by branch; reuse access unverified [R-05] |
| Trader Joe's | Official product pages and curated verified catalog | Official website is incomplete; absence from it is not proof of nonavailability [R-06] |

A reviewed catalog of mainstream products can provide real supported coverage while integrations expand. It must have real provenance and explicit coverage limits; it cannot be presented as a live or complete retailer inventory. This is a data-acquisition method, not a removal of the alternatives feature. Validate it against the proposed REQ-ALT-05 basket of at least 50 products per named retailer across 10 everyday categories. Report identification, retailer-evidence and eligible-alternative coverage by chain/category, including honest unknown outcomes; agree pass thresholds before treating any retailer as adequately supported. A small demonstration catalog alone does not satisfy the coverage requirement.

Implementation status (October 14): see [section 11 completion register](25-section11-sources-and-dependencies.md). Supporting source/evidence and acceptance tooling is implemented; external evidence/rights, clinical review and real retailer baskets remain open. Existing catalog size must not be treated as completed retailer acceptance.

## 12. Rule publication and refresh operations

Clinical sources feed a review queue. A source-page change does not automatically change consumer guidance. Proposed lifecycle: detected update → evidence appraisal → rule change proposal → qualified review → regression evaluation → signed version publication → client download → local activation. Record reviewers and conflicts between sources. Public-health guideline updates may be checked automatically; clinical judgment remains a reviewed step.

Clients download broad rule bundles rather than requesting only their selected disease rules. Verify signatures, compatibility and checksums; activate atomically. Keep a last-known-good compatible version and support withdrawal notices. If a rule is withdrawn or outside its allowed freshness, label affected conclusions unavailable pending update. Offline cached rules show review/freshness information. Saved assessments retain their original provenance; a new evaluation creates a new version rather than silently rewriting history.

Proposed operating schedule, subject to Q-13:

| Task | Schedule/trigger |
|---|---|
| Unknown product lookup | At scan time |
| Cached product refresh | At use if older than 7 days or when a label discrepancy arises |
| High-demand public products | Daily, subject to source update cadence and permitted usage |
| Retailer listings | Weekly, subject to access and source terms |
| Guideline change detection | Weekly |
| Full clinical-rule review | Quarterly and when significant relevant guidance changes |
| Local preferences | Immediate subsequent assessment; mark older saved assessments with their original profile version |
| Store context | Session start, meaningful movement during use, or manual refresh |

Refresh only records relevant to the supported catalog and user-independent source plans; do not collect personal scan histories to schedule ingestion. Aggregate counts may be used only if the approved privacy policy permits them. Retrieving the same upstream record more often does not make its underlying formulation newer.

## 13. Reliability, offline behavior and cost

| Situation | Behavior |
|---|---|
| No network | Local preferences/history available; cached product/rule assessment where sufficient; cloud image analysis clearly pending/unavailable |
| Interrupted image request | All workflows retain only permitted compact state after media cleanup, not a saved photo/PDF draft; reselect or recapture if needed. No backend durable retry; report recovery remains subject to section 7.6 |
| Provider timeout | Preserve outcome-unknown; offer user-controlled retry when no successful result was saved, even if remote completion is uncertain. Do not retry automatically; all attempts use sanitized payloads |
| Partial receipt result | Keep confirmed local rows; retry unresolved portions |
| Outdated catalog | Show source age and ask for label evidence if relevant |
| Invalid/withdrawn rule pack | Keep compatible valid rules; block affected conclusions rather than inventing guidance |
| Local disk full or key unavailable | Preserve received result in memory and retry its local save first; never silently save to cloud. If the result is lost and no successful result was saved, user-controlled retry is permitted after the storage problem is resolved |
| Missing retailer integration | Explain coverage and provide verified broader options without claiming the store has none |

Proposed request limits: up to 5 images per request, 10 MB total after safe preprocessing, and 90 seconds maximum active request duration. PDF pages, receipt length and device image quality need benchmark-based limits before release. These are app limits to validate, not claims about OpenAI's maximums.

Keep images readable and bound multi-call work. Separate extraction from analysis so a corrected lab value does not require another image upload. Cache only shared public facts and generic rule packs on the backend; save personal model outputs only on the device. Product category retrieval should be paginated so restrictive dietary combinations can search beyond an arbitrary first candidate batch.

Cost planning must measure extraction calls, analysis calls, image-token use, output lengths, retries, public-data APIs, places queries and baseline hosting. Estimate monthly spend as operation counts × measured cost per operation, plus provider/data/hosting costs. Actual dollar estimates require model choice, traffic assumptions and current pricing. Budget caps and graceful quota behavior are release requirements; “no login” does not imply unlimited inference.

## 14. Verification and release evidence

Use synthetic and explicitly authorized fixtures representing different phones, lighting, packaging, fonts, units, report layouts and receipt formats. Keep a held-out evaluation set that was not used to tune prompts. Maintain condition-specific expert-reviewed cases and true-negative/unknown cases, not just easy successful examples.

| ID | Verification | Required evidence |
|---|---|---|
| V-01 | Requirements traceability | Every requirement maps to a work package and acceptance case; confirmed features have no silent deferrals |
| V-02 | Product and fresh-food identity | Exact variants, ambiguous matches, incorrect barcode text, reformulations and market differences; fresh-food/reference matching, preparation/portion ambiguity, labeled estimates and no invented exact weight or certification |
| V-03 | Extraction correctness | Field-level accuracy for values, units, serving basis and ingredient text; missing data remains missing; clinical fields remain intact after photo/PDF redaction |
| V-04 | Medical applicability | Expert-reviewed rule cases across the approved catalog, age 20/21 eligibility boundary, older-adult and pregnancy contexts, multi-condition conflicts, missing-context behavior; confirmed population coverage cannot be silently dropped |
| V-05 | Lab confirmation and personalization | Anytime entry after setup and prior reports; no-panel shopping works; all six approved analytes covered with missing fields, units and provenance preserved; all extracted lipid values require user confirmation before analysis; most recent confirmed test date controls selection regardless of upload order; newer unconfirmed panels do not displace it; context switches do not reanalyze old reports; corrections/deletion and age/pregnancy changes invalidate dependent current context while retaining permitted historical provenance |
| V-06 | Restriction integrity | Vegetarian/egg/dairy combinations, separate halal/kosher checks, gluten-free evidence, unknown certification |
| V-07 | Receipt integrity | Food/non-food split, quantity/discount parsing, overlapping photos, ambiguous rows and honest coverage summaries |
| V-08 | Recommendation integrity | Same-category substitutions, same-chain priority, nearest-store fallback, source scope, no invented stock or certification; applicable confirmed lipid context affects ranking while other restrictions remain enforced, including correction/deletion cases |
| V-09 | Redaction and cloud persistence audit | Inspect actual outbound image/text/metadata bytes for seeded names, SSNs and addresses across layered/scanned/mixed PDFs, repeated headers, handwriting, rotated pages and incidental receipt/product identifiers; no model call on redaction failure; no personal payload in DB, object storage, logs, traces, queues or temporary disk artifacts; verify provider controls |
| V-10 | Local security and compact reuse | Encrypted DB; no retained product/receipt/report media after completion/cancel/failure or interrupted-session cleanup; source file unchanged; measured analysis size; saved results survive age-based cleanup until user deletion; offline results, duplicate/repeated-view call counts, user retries after failure or uncertain delivery, rejection of reanalysis for saved successes, local-save-first recovery, concurrent submissions, interrupted dispatch/save, key failure, deletion, backup/restore, reinstall, lock-state and app-switcher handling |
| V-11 | No-login access | Complete user journeys without an account; secrets absent from app bundle; abuse/quota controls tested |
| V-12 | AI robustness | Prompt-injection documents, refusal, malformed/truncated/semantically wrong JSON, unsupported citations, provider failure |
| V-13 | Accessibility and polish | Complete English UI and generated explanations, VoiceOver/TalkBack, large text, contrast, touch targets, reduced motion, camera/import recovery on physical devices |
| V-14 | Update and rollback | Signed pack verification, bad schema, partial downloads, withdrawn rules, client/server version compatibility |
| V-15 | Offline and latency | Defined network/device benchmark, saved history access, cached assessment, cloud-required states and cancellation |
| V-16 | Source and license review | Source permissions, attribution, data freshness, retailer coverage and certification claim provenance |

Candidate quantitative targets must align with the requirements document's Q-13 decisions. Suggested measurements include exact critical-field extraction accuracy, false confirmed-product matches, false compatible restriction results, citation coverage, and task latency percentiles. The reviewed acceptance suite must contain zero known cases that turn a forbidden ingredient or insufficient evidence into a confirmed-compatible result. This finite-test criterion is not a claim of zero real-world error.

Model/prompt/provider changes require relevant V-02 through V-08 and V-12 regression checks. Clinical-rule changes require V-04/V-06 and affected-condition review. Privacy or hosting changes require V-09/V-10. Release notes identify affected rule/data versions. Do not use real personal reports in telemetry to improve the model without a separately approved, explicit data-sharing design.

## 15. Implementation work packages

These work packages are ready for the new implementation chat. Begin on the user's implementation instruction; record engineering decisions as the affected work proceeds. Unresolved provider access or clinical review must not block unrelated foundations or synthetic-data testing. Section 15.1 identifies when each dependency must be satisfied.

| Package | Deliverable | Dependencies | Principal verification |
|---|---|---|---|
| WP-00 | Baseline review, dependency dispositions, source/retention feasibility plan and initial screen flows | Specification iterations | V-01, V-16 |
| WP-01 | Mobile/backend skeletons, typed contracts, native builds, secure local repository, shared local privacy preprocessing, no-login gateway, configuration | WP-00 | V-09, V-10, V-11 |
| WP-02 | Public data adapters, source registry, product normalization, retailer/store evidence, reviewed rule-pack pipeline | WP-00; integrates WP-01 | V-03, V-04, V-14, V-16 |
| WP-03 | Product photo/barcode recognition, label fallback, fresh-food/reference matching with explicit estimates, confirmation, local assessments and continuous Shelf Scan under section 7.7 | WP-01, WP-02 | V-02, V-03, V-04, V-06, V-12 |
| WP-04 | GPS/store confirmation, mainstream alternative matching and nearest-retailer fallback | WP-02, WP-03 | V-08, V-13, V-15 |
| WP-05 | Receipt extraction, correction, product resolution, per-item and basket review | WP-03; WP-04 for swaps | V-07, V-08, V-12 |
| WP-06 | Optional image/PDF lipid entry, bounded private preprocessing, structured AI processing, confirmation, successful-result reuse and explicit retry, compact encrypted storage and food personalization | Typed real-report import implemented; default OpenAI retention accepted via initial beta agreement. Full clinical interpretation, physical-device privacy acceptance and complete personalized ratings remain open; integrates WP-03–05. | V-03, V-04, V-05, V-08, V-09, V-10, V-12 |
| WP-07 | Complete interaction/visual system, history/privacy settings, offline/error states and accessibility | Starts with WP-01; integrated across WP-03–06 | V-10, V-13, V-15 |
| WP-08 | Full evaluation, privacy audit, provider failure tests, operational readiness and complete mobile release candidate | Engineering evaluation follows WP-01–07; proposed clinical publication approval integrates WP-10 | V-01–16 |
| WP-09 | Later website using shared public services and an approved local-data approach | Mobile design stable; separate website request | Separate website acceptance plan |
| WP-10 | Find a qualified clinical reviewer; agree scope, evidence/validation process and review rules, exceptions, explanations and reference cases | Parallel workstream; candidate rule/evaluation artifacts from WP-02 onward; no dependency for starting WP-01–07 or engineering tests | V-04, V-06, V-16 |

Product and report extraction can be developed independently once shared contracts and privacy foundations exist. Visual design and accessibility work run throughout development. The complete mobile release includes receipt and lipid features; they are not relegated to a post-release wish list.

WP-00 records reviewer availability as an explicit deferred dependency, not a prerequisite for development. WP-02 builds adapters, draft rules and the review/publication pipeline before a reviewer is engaged. WP-03–07 and automated/end-to-end tests can proceed using draft fixtures. WP-10 recruitment planning covers appropriate clinical expertise, availability, review scope and review records; no reviewer has been recruited or contacted. Expert feedback and medical release validation are integrated when available. Implementation still awaits the user's instruction after specification iteration.

### 15.1 Implementation readiness stages

| Stage | Work allowed or expected | Evidence needed before advancing |
|---|---|---|
| Engineering start | Inspect the workspace and available toolchains; validate stack compatibility; create typed contracts, local storage and complete screen-flow foundations; use synthetic fixtures and clearly labeled development adapters. | Record selected stack, build strategy for both mobile platforms, and dependency owners/dispositions. No clinical reviewer is needed to start. |
| External integration | Build public-data adapters and transient AI/store interfaces; exercise synthetic cases and failure paths. | Verify relevant source rights/access and actual endpoint capabilities before claiming a live integration. Record credentials/configuration requirements without committing secrets. |
| Real personal-data processing | Source implements a dedicated optional lipid-import route; broader personal-media routes remain separately gated. | Initial versioned beta agreement accepts OpenAI default retention; no ZDR gate. Validate device OCR/output bytes, temporary cleanup, local encryption/backup exclusions and hosting behavior; report actual physical validation separately from source/tests and live invented-data checks. |
| Complete release candidate | Integrate every approved mobile journey, accessibility, failure recovery, export/restore and operations. | Trace each accepted requirement to verification evidence; complete physical-device checks on iPhone and Android. No mock outcome may masquerade as live functionality. |
| Public release | Publish the complete supported product after release review. | Clinical-rule review, data rights, privacy verification and the agreed release quality gates are satisfied. Deployment and publishing are separate actions from preparing this handoff. |

The first implementation increment should establish repository structure, reproducible builds, typed contracts, the secure local repository and a coherent navigation/design system. Add an end-to-end product flow using synthetic data while source and privacy feasibility work proceeds. Keep receipts, lipid personalization, all approved conditions and both platforms in the tracked release scope from the outset. On this Windows workspace, explicitly plan a supported macOS/Xcode build and physical-iPhone verification path; do not claim iOS validation from Android or web tests.
## 16. Requirement-group traceability

| Requirements group | Design coverage | Work packages |
|---|---|---|
| REQ-SCOPE | Sections 1–5, 15 | WP-00, WP-07, WP-08 |
| REQ-PROFILE | Sections 5–6, 7.2, 10 | WP-01, WP-03, WP-07 |
| REQ-SCAN | Sections 7.0–7.1, 8–9 | WP-01, WP-03 |
| REQ-SHELF | Sections 5, 7.7, 10, 14 | WP-03, WP-07, WP-08 |
| REQ-ASSESS | Sections 6.3, 7.2, 9, 12 | WP-02, WP-03 |
| REQ-ALT | Sections 7.3, 11 | WP-04 |
| REQ-STORE | Sections 7.3, 8, 10 | WP-04 |
| REQ-RECEIPT | Sections 7.4, 8–10 | WP-05 |
| REQ-LAB | Sections 6.1, 7.0, 7.2–7.6, 8–10 | WP-06; integration with WP-03–05 |
| REQ-PRIVACY | Sections 3, 7.0, 7.6, 8–10, 13–14 | WP-01, WP-06, WP-08 |
| REQ-DATA | Sections 6.2, 11–12, 15 | WP-02, WP-10 |
| REQ-UX | Sections 5, 13–14 | WP-07 |
| REQ-OPS | Sections 3–4, 9, 12–15 | WP-01, WP-02, WP-08 |

As each work package begins, expand this group-level map to its accepted requirement IDs and test cases; complete individual requirement coverage before release. Changes should identify affected requirements, schemas, screens, medical rules and source agreements.

## 17. Review agenda and unresolved engineering decisions

Use the requirements document's Q-01 through Q-14 register as authoritative. The planned product questionnaire is complete; this consolidated draft incorporates its final approvals. The remaining items below are engineering/clinical work, not another questionnaire. Propose implementation details for document review; ask a new product question only for a material unresolved tradeoff, in batches no larger than three. Highest-impact remaining dependencies are:

1. Exact file/page limits, date/correction conflicts, retry-state mechanics, export/restore collisions and deletion details (Q-04, Q-06). Measurement coverage and user retries after failure are settled, alongside prior input/privacy/personalization decisions.
2. Verify current accepted OpenAI default-retention disclosures, configured API features, local preprocessing/payload validation, physical cleanup/storage/backup behavior and permissible operational metadata (Q-05, Q-14). The initial beta agreement and no-original-report-media request boundary are settled for the implemented report path; a ZDR approval dependency must not be reintroduced.
3. Clinical review ownership, category mappings, required context and validated rules for the approved population, including pregnancy and older adults (Q-07, Q-12).
4. Usable product/retailer/certification data access and fallback coverage (Q-08–10).
5. Performance targets, source update cadence, distance-calculation details, radius limits and supported devices (Q-11, Q-13). Distance ordering with directions, adjustable 10-mile default and no price/budget controls are settled. Reviewer recruitment runs alongside engineering rather than blocking it (Q-07, WP-10).

Additional technical choices to finalize after those decisions: cloud host, exact framework/package versions, model snapshots, gateway timeouts, image/page limits, rule-pack signing/rotation, local schema migration policy, operational incident ownership and an affordable usage budget. No deployment, billing change, account creation or external data submission has occurred as part of writing this specification.

## 18. Source register

Sources were initially checked on September 28, 2026. OpenAI references T-03, T-05 and T-07 were rechecked October 5, 2026 for image/PDF handling and retention. URLs document capabilities or evidence; they do not establish that this project has obtained access, licensing, certification or clinical approval. Recheck relevant sources before implementation.

### Technical references

- **T-01:** [Expo SQLite and SQLCipher](https://docs.expo.dev/versions/latest/sdk/sqlite/#sqlcipher).
- **T-02:** [Expo SecureStore and backup considerations](https://docs.expo.dev/versions/latest/sdk/securestore/).
- **T-03:** [OpenAI image inputs and vision](https://developers.openai.com/api/docs/guides/images-vision).
- **T-04:** [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
- **T-05:** [OpenAI file inputs](https://developers.openai.com/api/docs/guides/file-inputs).
- **T-06:** [Google Places Nearby Search](https://developers.google.com/maps/documentation/places/web-service/nearby-search).
- **T-07:** [OpenAI data controls and retention](https://developers.openai.com/api/docs/guides/your-data).
- **T-08:** [Android location permissions and accuracy](https://developer.android.com/develop/sensors-and-location/location/permissions).
- **T-09:** [Android backup behavior](https://developer.android.com/identity/data/autobackup).
- **T-10:** [Apple file backup exclusion](https://developer.apple.com/documentation/foundation/urlresourcekey/isexcludedfrombackupkey).

### Food and clinical references

- **D-01:** [USDA API guide](https://fdc.nal.usda.gov/api-guide/) and [branded-data provenance](https://fdc.nal.usda.gov/GBFPD_Documentation/).
- **D-02:** [Open Food Facts API](https://openfoodfacts.github.io/openfoodfacts-server/api/) and [reuse conditions](https://support.openfoodfacts.org/help/en-gb/12-donnees-api/94-y-a-t-il-des-conditions-pour-utiliser-l-api).
- **D-03:** [Monash app terms](https://www.monashfodmap.com/app-terms-and-conditions/) and [limits of ingredient-based FODMAP inference](https://www.monashfodmap.com/blog/update-faq-why-doesnt-monash-fodmap-app-have-barcode-scanner/).
- **D-04:** [ADA nutrition guidance, Standards of Care 2026](https://diabetesjournals.org/care/article/49/Supplement_1/S89/163932).
- **D-05:** [NHLBI DASH guidance](https://www.nhlbi.nih.gov/health/dash-eating-plan).
- **D-06:** [AHA dietary guidance](https://professional.heart.org/en/science-news/2026-dietary-guidance-to-improve-cardiovascular-health/top-things-to-know).
- **D-07:** [NIDDK weight-management guidance](https://www.niddk.nih.gov/health-information/weight-management/adult-overweight-obesity/eating-physical-activity).
- **D-08:** [KDIGO CKD guideline](https://kdigo.org/wp-content/uploads/2024/03/KDIGO-2024-CKD-Guideline.pdf).
- **D-09:** [NIDDK celiac dietary guidance](https://www.niddk.nih.gov/health-information/digestive-diseases/celiac-disease/eating-diet-nutrition) and [FDA gluten-free labeling](https://www.fda.gov/food/nutrition-food-labeling-and-critical-foods/questions-and-answers-gluten-free-food-labeling-final-rule).
- **D-10:** [AGA SIBO dietary guidance](https://patient.gastro.org/small-intestinal-bacterial-overgrowth-sibo-managing-with-diet/).
- **D-11:** [NIDDK fatty-liver dietary guidance](https://www.niddk.nih.gov/health-information/liver-disease/nafld-nash/eating-diet-nutrition).
- **D-12:** [ACC/AHA 2026 dyslipidemia guideline](https://professional.heart.org/en/science-news/2026-guideline-on-the-management-of-dyslipidemia).
- **D-13:** [MedlinePlus cholesterol testing](https://medlineplus.gov/lab-tests/cholesterol-levels/).

### Retailer references

- **R-01:** [Walmart Marketplace item search](https://developer.walmart.com/global-marketplace/reference/getsearchresult) and [developer onboarding](https://developer.walmart.com/global-marketplace/docs/get-started-as-a-seller).
- **R-02:** [Wegmans digital-shopping announcement](https://www.wegmans.com/news-media/press-releases/wegmans-launches-new-website-and-app).
- **R-03:** [Price Chopper pickup service](https://www.pricechopper.com/services/pick-up/) and [Instacart developer information](https://company.instacart.com/business/developers).
- **R-04:** [Target product availability](https://www.target.com/help/articles/product-support-services/product-availability).
- **R-05:** [Shaw's online-shopping FAQ](https://www.shaws.com/faq/online-shopping.html/).
- **R-06:** [Trader Joe's official product catalog](https://www.traderjoes.com/home/products/category?categoryId=71).

## 19. Change history

| Version | Date | Change |
|---|---|---|
| 0.1 | 2026-09-28 | Initial review draft from the brainstorming conversation. Captures cloud OpenAI image analysis, device-only saved personal data, no login, complete mobile scope, evidence and retailer dependencies, and proposed implementation work packages. |
| 0.2 | 2026-10-04 | Incorporated approved catalog/SIBO and US, age 21+, pregnancy and language scope. Updated profile/schema proposals, clinical applicability and verification; marked Q-01–03 resolved and remaining questions for one-at-a-time chat review. Source-verification dates are unchanged. No application implementation. |
| 0.3 | 2026-10-05 | Recorded optional lipid entry and automatic personalization without separate opt-in. Updated local context/provenance, assessment and report flows, verification and work-package integration. Q-04 remains partially open. No application implementation. |
| 0.4 | 2026-10-05 | Added approved PDF support and shared local pre-LLM redaction; replaced original-PDF upload proposal with sanitized page images. Added once-per-report execution, compact local result reuse, duplicate/failure states, revised privacy verification and retention dependencies. No application implementation. |
| 0.5 | 2026-10-05 | Removed proposed mandatory redaction preview/review; recorded automatic preprocessing, no approval gate and blocked upload on failure. Clinical-value confirmation remains separate. No application implementation. |
| 0.6 | 2026-10-05 | Added persistent report-entry actions and latest-confirmed-test-date selection, separate date fields, upload-order independence and local reselection after deletion. Remaining date ambiguity and retention details stay open. No application implementation. |
| 0.7 | 2026-10-05 | Removed optional retained report attachments; specified temporary-media cleanup and preservation of user-owned sources. Updated storage entities, report workflow, interrupted-request handling, verification and Q-06 agenda. No application implementation. |
| 0.8 | 2026-10-05 | Limited lipid entry to photos/images and PDFs; removed standalone manual-entry scope while keeping source-linked extraction review/correction separately proposed. Updated review format to batches of up to three questions. No application implementation. |
| 0.9 | 2026-10-05 | Confirmed value review before analysis and saved structured results retained until user deletion. Added fresh-food/reference entities, estimation workflow and coverage verification; retained temporary report-media cleanup. No application implementation. |
| 0.10 | 2026-10-05 | Applied approved rating/state labels and adjustable 10-mile search default; removed price lookup/ranking and budget controls from alternative flows. Updated remaining review dependencies. No application implementation. |
| 0.11 | 2026-10-05 | Applied distance ordering and exclusion of unverified required dietary status from alternatives. Added parallel clinical-reviewer work package and explicit nonblocking development/test sequencing. No implementation performed. |
| 0.12 | 2026-10-05 | Recorded grocery scope, no-match wider search preserving restrictions and encrypted user-initiated export/restore. Added portable archive proposal and user-export privacy exception without automatic cloud sync. No implementation performed. |
| 0.13 | 2026-10-05 | Applied multiple-condition constraints with one primary concern, summary/expandable-source explanations and approved profile/preferences in encrypted exports. No implementation performed. |
| 0.14 | 2026-10-05 | Removed product/receipt photo retention; specified compact dated records and shared temporary-media lifecycle, including backup exclusion. Measurement scope and report-retry decisions remain open. No implementation performed. |
| 0.15 | 2026-10-05 | Confirmed standard lipid panel plus ApoB/Lp(a) and failed-attempt retries without saved successful results. Updated retry state handling and consolidated the review baseline; remaining clinical/technical tasks are separate from the completed product questionnaire. No implementation performed. |
| 0.16 | 2026-10-05 | Consolidated decision authority and constraints, clarified successful-result reuse, added staged implementation readiness and a practical first increment, and linked the session handoff. No scope change or application implementation. |
| 0.17 | 2026-10-14 | Added Shelf Scan workflow, bounded acquisition proposal, deferred uncertain matches and app-level transient runs. New scans preserve old runs; termination clears them without changing saved personal history. Documentation only. |
| 0.18 | 2026-10-14 | Added dedicated Shelf Scan implementation spec with shared TypeScript and proposed Swift iPhone capture, bounded processing, real ranking gaps, file/work-package plan and physical-device acceptance. Documentation only. |
| 0.19 | 2026-10-14 | Added user-selected 2 images/second sampling and separate physical-iPhone recognition-throughput acceptance; bounded work and budgets preserved. |


## Public backend implementation decision — October 13, 2026
For the initial three iPhone testers and possible fourth Android tester, use a server-local SQLite/WAL database for public food facts, source registry and import history; retain personal records only on-device. Facts remain provider-specific with explicit units, provenance and freshness. USDA imports are enabled; Open Food Facts adoption and retailer/certification/clinical evidence are separate gates. See [public catalog implementation](19-public-catalog-backend.md) for the implemented schema/API and remaining work. This checkpoint does not supersede the full source/licensing and privacy requirements above.


## Implemented public catalog and remote beta — October 13, 2026
Approved API hostname: https://grocery.serveforwad.com, authenticated via individual tester bearer keys stored in native SecureStore. Server catalog SQLite remains separate from encrypted phone records. Native schema version 3 adds a bounded 100-food public-facts cache, excludes it from personal exports, and clears it on reset while preserving rule trust. Real public food facts show a 100 g basis, missing fields, source dates and unverified stock/certifications; illustrative health assessments remain separate. Older native builds refuse the newer schema. Cached fictional server examples are available over the same authenticated HTTPS entry point without new paid generation. See docs/21-beta-catalog-network-checkpoint.md for verification and remaining acceptance gates.


## October 13 implementation addendum: automatic shopping-store context
This addendum supersedes earlier manual/sample-store and “location capture disabled” assumptions specifically for the user-authorized foreground store-location feature. Personal health/photo/report gates remain unchanged.

After onboarding the native app requests while-in-use location permission automatically. A dedicated StoreProvider manages a foreground subscription, conservative single-store matching, manual overrides and a persistent automatic-detection preference. The display uses “Likely store” and never presents GPS as conclusive proof of being inside a shop. GPS coordinates remain in memory and are never uploaded, saved in app storage or exported. Permission denial and poor/ambiguous fixes retain manual search.

Provider decision: OpenStreetMap geographic data, imported by an operator and served as a separate ODbL directory from our own backend. Massachusetts is the initial explicit coverage boundary. Phones download the same directory and match locally; no phone calls the public Overpass service. The GET/HEAD store-directory endpoint is public; food/fictional APIs keep their existing authentication. SQLCipher schema 4 adds a separate directory cache. Reset clears this cache and offline foods as well as private session data and tester access.

This store context is integrated into home, store selection and public-food availability labels. Existing clearly labelled fictional health/demo fixtures do not become retailer-backed recommendations. Store availability remains unknown until a licensed exact-branch/product feed is verified.

Retailer priorities are Wegmans, Walmart, Price Chopper/Market 32 and Whole Foods. Access assessment starts with Instacart for Wegmans/Price Chopper. A retailer API adapter will require exact branch and GTIN mapping, channel-specific status, timestamps/expiry and explicit unknown fallback. No inventory provider is connected.

See [full implementation, verification and inventory plan](22-store-location-and-inventory.md). Preserve the established lively visual direction, compact ingredient/1x-portion presentation and immediate alternatives; final phone aesthetics review and branding remain open.


## October 13 addendum: real catalog comparisons
The public USDA food workflow now automatically fetches same-category candidates and ranks factual nutrient alternatives on the phone. This is separate from the clearly labelled synthetic health-rating fixtures. Up to three cards are immediately visible in a horizontal list, with neutral icons, equal-weight arithmetic, selected metric, explicit trade-offs, source/barcode/date and unknown availability. No Explore Alternatives click is required.

Six initial categories are curated through conservative food-form rules and source validation. Optional comparison metadata preserves old stored-food compatibility; unmapped historical records simply have no comparison eligibility. Public source nutrition remains per 100g; display uses 1x the original listed gram portion or an explicit 100g fallback. This does not prescribe a portion or a clinical diet.

Required restriction evidence is not inferred from product names. Profiles stay local; unverified restrictions suppress compatible suggestions. Saved foods support offline comparisons within the existing encrypted 100-record cap. Candidate endpoints are authenticated and cache-only; no upstream lookup or paid AI call is triggered by the phone.

See [checkpoint 23](23-real-catalog-alternatives.md) for exact validation, category counts, tests and source-age limits. Branding and final phone aesthetics review remain open.


## October 14 addendum — broad catalog and comparison validation

See [expanded grocery catalog](24-expanded-grocery-catalog.md) for the delivered 20 categories, 2,898 records, 706 comparison-ready products and retailer-brand coverage. Brand names are searchable; category rules require matching source categories and food forms. Comparison candidates are bounded at 500 per group, filtered for freshness/completeness before delivery, with phone-local ranking and explicit trade-offs. Lookup inclusion does not imply comparison eligibility, current retailer assortment, dietary certification or inventory. Updated app builds are required for the expanded category schema.



## October 14 implementation clarification: condition-related label review
Blood-pressure/DASH and strict gluten-free evidence views use the corrected rules, provenance boundaries and unknown states in [34-blood-pressure-gluten-label-checks.md](34-blood-pressure-gluten-label-checks.md). Reference-label thresholds are distinct from personalized medical targets. The current implementation does not certify gluten-free products or infer missing minerals/trans fat. This clarification does not approve clinical rules.

## October 14 real lipid-import increment

Version 0.20 records the accepted OpenAI default-retention agreement and implemented native OCR → typed evidence → exact OpenAI schema check → compact local confirmation workflow. [36-real-lipid-import.md](36-real-lipid-import.md) is the authoritative increment record, including automated checks, one live invented-panel check, current service configuration and remaining iPhone/Android physical acceptance. This does not mark the complete clinical scope or polished release complete.

## October 14 addendum — minerals and reviewed gluten-free evidence

The user accepts either independently verified certification or a verified manufacturer gluten-free claim. See [the implementation and evidence contract](36-product-label-evidence-and-minerals.md). This supersedes the earlier certification-only provisional preference.

Optional source-reported trans fat, potassium, magnesium and calcium are independent of the five required comparison nutrients. Missing values stay unknown. OFF label/allergen/trace tags remain unverified reports. Source-cited extraction outputs remain drafts. Strict qualification requires a current exact-product review, documented source/rights/reviewer policy, no unresolved ingredient/advisory conflict and an expiring signed proof; it does not assert medical safety. No live products have passed that review at this checkpoint.

Catalog v2 carries enrichment while v1 retains strict client compatibility. The complete public v2 export retains USDA/OFF attribution and share-alike notices and excludes review proofs. This addendum does not change the separately authorized real-report agreement, provider retention boundary or clinical review scope.

## October 15 implementation addendum — first iPhone feedback

Optional gender is a device-only profile field and survives encrypted export/restore. Legacy records without gender remain valid. General Fitness and No Concern are health-focus values, separate from the eight clinical-condition identifiers; neither can enter a clinical rule pack as a disease. No Concern requires an empty condition list, while General Fitness preserves secondary conditions and all dietary constraints. General-only shelf comparisons use label facts without a preferred nutrient or disease ranking.

The store chooser commits a session store selection and navigates back (or home for a direct entry). An already detected store remains available for confirmation/correction rather than causing navigation on every location update. The repeated location explanation is removed from routine screens; the persisted on/off preference and foreground-only permission lifecycle remain. Northborough Wegmans uses the [retailer-confirmed address](https://www.wegmans.com/stores/northborough-ma), 9102 Shops Way, with original OSM evidence retained. The user verified the store return and corrected address on the installed phone update. Profile controls and broader device/privacy acceptance remain subject to hands-on testing.


## October 16 accepted photo/result UX update

This update supersedes mandatory product-candidate confirmation for normal product photos. The app opens the best supported catalog record automatically; uncertain results are labeled as likely and remain correctable. GPT-6 Luna supplies package identity only. Current cached USDA nutrition is preferred, with a bounded live USDA branded-food search/details fallback and public-facts caching. No missing nutrient is generated by AI.

The first result view contains a short label takeaway, one to three concrete reasons, a small 1× portion note, then up to three immediately visible horizontal alternatives. The original product’s retailer-check action, detailed nutrient table, compact ingredients, sources and long medical-education paragraphs are under Details. Source attribution remains accessible. Unknown dietary evidence, stale/incomplete facts, unverified stock and the disabled personalized-medical recommendation gate remain.

Normal AI photos have a separate one-time consent explaining the one-photo upload and OpenAI retention. Shelf Camera AI is deferred until the user discusses image batching/crops and cost; existing local shelf behavior is unchanged. Exact implementation and verification boundaries: [AI photo checkpoint](42-ai-product-photo.md).

## 24. Normal-photo AI ratings — implemented October 16, 2026

This section and [DEV-12](43-verified-ai-photo-ratings.md) supersede earlier identity-only descriptions for the normal Scan Your Product route. Shelf Camera AI remains deferred pending the requested design discussion.

1. Obtain versioned photo consent and capture one orientation-correct JPEG, at most 1,600 pixels on the longest side and 1 MiB. Strip metadata on phone and server; keep it transient.
2. GPT-6 Luna receives the photo and independently returns brand, concise product/variant, optional visible size and up to three real comparable candidate identities. Do not include preselected product or alternative records, health profile, age, name, location or lab values.
3. Match source-supported product identities, including USDA manufacturer/consumer-brand relationships. Preserve exact flavors and rank identity before nutrient completeness. Refresh public facts through the existing database, bounded USDA search/details and shared-rate-limited OFF lookup. Keep missing/conflicting information unknown.
4. Send verified per-serving facts, source references and arithmetic threshold checks to a second GPT-6 Luna call. The model applies the versioned general-label rubric and returns structured rating/reason codes. Independently verify that output on the server. Unsupported or disagreeing output cannot receive a color.
5. Show dark green Very healthy, light green Healthy, yellow Neutral or red Not healthy, with one to three terse verified points. Assume 1× the listed portion and show that assumption in small text. These are general food-comparison labels, not individualized medical judgments or FDA whole-food classifications.
6. For Neutral/Not healthy only, show up to three independently proposed candidates that pass exact identity, current complete nutrition, same category, green rating and meaningful equal-weight improvement checks. Disclose smaller relevant trade-offs; block material regressions and all candidates that cease to qualify at the original portion weight. Dietary evidence remains a device-side gate. Unknown stock is explicit.
7. Use only actual source-reported OFF thumbnails with product-source attribution and CC BY-SA terms. Missing or failed photos use an icon. Do not generate product images or accept model-invented URLs.
8. Keep legacy catalog/photo endpoints compatible. Publish newly enriched reusable public records through `/v3/catalog/export`. At most two paid model calls per attempt, reserve budget before each, no automatic retries. New photo-assessment consent is separate from report consent. Existing clinical/privacy gates are unchanged.

Thresholds, source/coverage limits, operational evidence, module locations and device dependencies are recorded in DEV-12. The app has not been natively rebuilt or installed for this checkpoint while the Mac is switched off.

## 25. Key-free access and camera control — October 16, 2026

The installed beta no longer requires a tester key, account, activation pass or credential setup. Normal **Scan Your Product** uses one photo-recognition path; remove the **Read package text on this phone instead** choice. Present a large round camera-icon shutter instead of the visible **Take Photo** text button, with an accessible spoken label, disabled opening/processing states and duplicate-capture prevention. Keep **Scan Nutrient Table** as its own local-reading route. Ordinary screens do not advertise the implementation as “AI enabled.” The existing one-time photo-processing disclosure and permission choice remain.

Key-free backend routes preserve consent, validation, concurrency/rate controls and the shared testing budget. Personal weight transmission and personalized medical recommendations remain disabled. Include the completed side-chat My Needs enhancements in this same release. Build 2 was canceled before upload to Apple; replacement 0.1.0 (3) is tracked in the [current release checkpoint](47-key-free-beta-update.md). Cloud signing/building is configured; the Mac-off limitation above is historical. Native release, TestFlight availability and physical-phone acceptance are reported separately in the checkpoint.

## 26. Product information and per-card source checks — requested October 16, 2026

The user requests primary product information from the LLM, with USDA/Open Food Facts as an optional check inside each product's own card. This supersedes section 24's database-gated primary display direction, and is implemented in section 27. Keep recalled nutrition clearly marked as estimated, missing facts unknown, and personal medical recommendations disabled. Each original/alternative card owns its thumbnail, rating, brief reasons, Food Facts expansion and source-check action. A source mismatch must remain visible without silently replacing the user's selected product. Seek up to three distinct alternatives and retain evidence/uncertainty checks. The requested pre-upload image uses the side-chat Berry & Citrus palette; vertical card scrolling was approved and implemented. Full details and status: [product-photo enhancements](48-product-photo-enhancements.md).


## 27. Approved LLM-first cards and home/news implementation — October 16, 2026

This supersedes prior database-first display requirements for normal product photos. A versioned v3 endpoint accepts only the stripped package JPEG and versioned consent. A single GPT-6 Luna request identifies the product, estimates a coherent one-serving nutrient table and proposes five candidates; schema, identity, comparable-use, equal-weight nutrient and duplication guards select up to three. Bad alternatives do not invalidate the original. Unknown facts remain unknown. General colored ratings are labeled AI estimates and require coherent core nutrients and agreement with the beta rubric; uncertain identities do not receive favorable colors. All dietary restrictions continue to require verification; no medical profile or laboratory information is sent.

The photographed item and each alternative have separate cards with thumbnail, colored label, short reasons, Food Facts and Check USDA / OFF. Facts expand within that card. Optional database results are possible matches, with source dates and per-100g basis, never a silent replacement. Original thumbnails are transient captured photos; alternatives use attributed OFF reference photos where a bounded exact-identity lookup succeeds. Metadata-only image search does not fabricate nutrient records. Raw photos are not persisted or backed up.

The home screen uses Berry & Citrus purple/lime with two compact actions. Scan Your Product performs local OCR/barcode classification before uploading a front image; full nutrition tables go to the existing local review and valid single barcodes go to exact catalog lookup. Shelf Camera keeps its separate local detectors.

News uses bounded public publisher RSS/headline metadata from Harvard Nutrition Source, NIH Research Matters and Tufts Now. No consumer Google automation, new paid account or model call. Only title, publisher, date, original link and provenance are retained; no article body or publisher photo. Fresh relevant stories are selected first from a 90-day window, up to five, with actual dates; fewer/empty/stale states are honest. The hourly due-check timer fetches once per Eastern calendar day at/after 02:00, catching missing DST 02:00 at 03:00 and missed runs. Locking, atomic replacement and preserved prior edition protect refreshes. News does not change nutrition rating rules.

Validation, signed build and Apple delivery status: [combined release checkpoint](49-approved-cards-and-home-release.md).


## 28. Approved grocery, nutrition and heart-health landing page — October 17, 2026

User-approved preview implemented for build 11: a compact realistic cart containing fresh produce and packaged cereal, chips, pasta, tomato sauce, cheese and butter; a packaging-style Nutrition Facts panel with green sugar and red sodium highlights; and a heart with ECG. These form one decorative illustration. There is no visible “Illustrative label” footer, as requested. The static graphic is not a scan result, medical judgment or food recommendation.

Bundle the artwork in the app, preserve its aspect ratio and accessible description, and keep the headline and bold explanatory sentence as real scalable UI text. Preserve dynamic selected-store identity/address, Scan Your Product and Shelf Camera routes, news, lower links and tab navigation. Use compact spacing and rounded white store card; smaller screens and larger text scroll rather than clipping actions. No network fetch is needed to show the hero image.

This numbered release also includes the concurrent two-model single-photo review, updated explicit consent and fallback/disagreement display from the side chat; source and validation details are in [DEV-25](63-dual-model-review-preparation.md). Scope does not add shelf uploads, selected-chain candidate preference, medical personalization, new provider spending or inventory claims.

Build, tests, source-preservation evidence and actual TestFlight delivery state: [build 11](64-build11-grocery-landing-and-dual-review.md).

**October 18 native sizing correction:** Bundled images provide intrinsic pixel dimensions on iOS. Clear the inherited height explicitly when using percentage width and aspect ratio; width-only browser previews do not establish native sizing. Native layout and the actual beta banner/tab space must be checked. Delivered in TestFlight build 12; physical confirmation pending. [Build 12 defect and verification](65-build12-native-home-image-fix.md).

## 29. Nearby product search fallback — October 18, 2026

Use SerpApi as the primary nearby-availability search. When it lacks confirmed product-specific stock/pickup or fails, allow one Serper Google Shopping fallback using brand, product name, variant, package size and nearest canonical city. Send no profile, laboratory data, photograph, OCR, personal name, exact coordinates or street address to Serper. Retain primary provider's existing disclosed address-based request.

Merge and deduplicate up to three retailer listings per already-accepted alternative, with exact identity/size checks and explicit package uncertainty. Generic Shopping listings are not stock confirmation. Use truthful provider attribution and preserve original/alternative food content while each independent search completes. Cache/coalesce repeated calls, cancel abandoned work and bound time/concurrency/response size. This is not selected-chain candidate generation or authorized branch inventory.

Version 2 of the API/client carries Serper/combined attribution; version 1 stays compatible and SerpApi-only. New mobile Privacy copy discloses the extra provider. No nutrient, dietary, clinical or photo-consent rule is changed. [Implementation and release evidence](66-serper-shopping-fallback.md).


## 29. NutriGlimpse branding and shared prompt — October 25, 2026

The name and tagline above supersede earlier statements that the name was undecided. The approved first-person Gemini prompt remains unchanged and is shared with GPT for parallel alternative supplementation. Field tiers are local display/validation concerns, not extra prompt instructions. Gemini remains authoritative; fresh explicit dual-provider health consent is required before copying private shopper context to GPT. [Full implementation and release evidence](85-nutriglimpse-shared-prompt-and-field-rules.md).
