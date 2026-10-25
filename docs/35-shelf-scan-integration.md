# Shelf Scan identification and local comparison checkpoint

**Later increment:** Real lipid import and consent are now implemented in source and the protected service, with automated and fictional live-API checks. See [the real-report checkpoint](36-real-lipid-import.md) for the current status. Physical iPhone import and full clinical acceptance remain pending. The evidence below describes the earlier Shelf Scan checkpoint.

Prepared October 14, 2026 (America/New_York). Target: October 23, 2026.  
Authoritative source: `/path/to/NutriGlimpse` on `project-server`.  
Status: integrated source and automated checks complete for this increment; physical iPhone and complete clinical acceptance remain open.

## Implemented behavior

Home now has **Scan a shelf**, and individual capture has a Shelf Scan switch. The screen offers category selection, public fact loading, Start, Pause & review, Resume, Finish, previous runs and uncertain-match review. During capture, the camera replaces the expanded category controls so the preview and stop controls remain prominent. Common categories are cereal, cookies, cheddar, cottage cheese, chips and granola; the category search exposes the wider curated catalog.

The camera uses one selected pretrained detector, targeting two full frames per second without an image backlog. A separate Apple Vision reader chooses at most one useful detected package per job. Reader admissions are at least one second apart and there is one reader job across all camera views. Barcode recognition is tried before English OCR. This distinction matters: **two detection frames per second does not mean two identified products per second, or every box identified in each frame**.

The public category pool is downloaded before capture. Exact validated barcode matches may confirm when unique. OCR and manually transcribed package text produce at most five catalog suggestions and always need user confirmation. Unknown products stay unidentified; brand, flavor and original/reduced-sugar variants remain distinct. Repeated sightings do not fill the top ten. Confirmed products can be inspected and removed; a label-text/barcode fallback allows a user to review an item the camera missed.

Only confirmed products from the current run enter a **Personalized nutrient comparison**. The comparison reads the current local profile, combines supported nutrient priorities and groups products by tradeoffs without arbitrary medical weights. It displays up to ten, allows fewer than ten, shows equal-weight facts, explanations, all generated tradeoffs and guidance sources. Earlier groups are computed by repeatedly removing nondominated products; a product in an earlier group is not necessarily better on every criterion than every product in a later group. Within-group display order has no health meaning.

## Implementation map

| Component | Responsibility |
|---|---|
| `apps/mobile/src/app/shelf.tsx` | Screen, category access, camera lifecycle, confirmation and current-profile comparison |
| `apps/mobile/modules/shelf-benchmark/` | Swift capture, detector preprocessing, local Apple Vision reader and compact evidence bridge; separate benchmark preserved |
| `packages/core/src/shelfIdentity.ts` | Bounded evidence validation, barcode normalization, local catalog matching and uncertain variants |
| `packages/core/src/shelfSession.ts` | App-process memory archive, epochs, work tokens, limits, confirmation and deduplication |
| `packages/core/src/shelfRanking.ts` | Pure local nutrient comparison, exclusions, optional confirmed-panel contract and provenance |
| `apps/mobile/src/state/ShelfScanState.tsx` | Root lifecycle and global native stop handling |
| `apps/mobile/src/state/shelfCatalog.ts` | Two public category pools in memory, 15-minute cache; category-only request |
| `apps/mobile/src/ui/ShelfRankings.tsx` | Comparison groups, reasons, sources and missing-evidence explanations |

The shared app/domain code is TypeScript. The iPhone camera and OCR code is Swift. Android currently has the shared screen and manual label-review path; its native shelf camera adapter remains unfinished. There is no SwiftUI rewrite or framework upgrade in this increment.

## Session and privacy contract

- Starting scan B preserves A. Opening previous runs pauses capture. Finish keeps results. Backgrounding pauses without clearing; the next foreground requires an explicit resume. Actual app-process termination clears all shelf runs. Going Home is backgrounding, not proof of process termination on iOS.
- No shelf image, extracted evidence, candidate membership or ranking is written to History, SQLite, app backup, analytics or the backend. The explicit local-data reset also clears shelf and benchmark memory. Public facts alone are cached separately in memory.
- Only the category identifier and existing beta access header go to the public catalog service. No camera text, image, profile, report, location or scan list is sent in this flow. The native reader uses Apple APIs on the phone, not OpenAI.
- Native evidence is bounded to one observation per event, up to 12 text lines / 240 characters total and two bounded barcodes. Images do not cross the native bridge. Buffers remain only for active work and are released after completion/cancellation; cancellation is not claimed to terminate an underlying Vision call instantly.
- A two-second reader watchdog requests cancellation, but the process-wide lease remains held until the worker returns. The shared detector queue and camera coordinator prevent replacement views from starting concurrent work or competing camera sessions. Owner tokens and run epochs reject late/stale callbacks.
- Default app-session limits are 50 runs, 500 candidates per run, 5,000 total candidates and a 20 MiB estimate for retained structured data. This is not a measured total-heap limit. Reaching a limit pauses collection and preserves prior runs; it does not silently delete older scans or spill to disk.

## Evidence and present limits

The public database had 4,677 records at the read-only check. The six initial pools contained 375 records: cereal 99, cookies 7, cheddar 51, cottage cheese 64, chips 112 and granola 42. Barcode round trips resolved 367 uniquely and held eight ambiguous entries for review. These checks feed known catalog barcodes back into the resolver; **they are not camera accuracy measurements or independent validation of nutrition labels**. Test transcriptions produced reviewable suggestions; they were not actual OCR outputs. Cookie coverage is especially narrow. A full store assortment, live stock and all retailer brands are not established.

The current source uses SKU-110K for cheese categories and ShelfSet otherwise. This is an experimental routing choice supported only by the limited prior recovery tests. Both detector choices remain available in the separate benchmark. The recovery report, model cards, source fingerprints and notices are included. Neither model has yet demonstrated Core ML parity or sustained on-device performance, and broad distribution rights remain unresolved. See [detector evidence](31-shelf-recovery-and-detector-decision.md).

The output is a limited nutrient comparison, **not the approved Good/Neutral/Limit/Poor disease-specific rating**. The public schema has only five nutrient fields and unverified dietary certification. Missing facts, CKD, SIBO, celiac-related gluten verification, required dietary restrictions and pregnancy applicability can withhold the ranking. The app explains why; it does not declare the food harmful merely because evidence is absent. Full approved scope is retained. See [the exact policy and sources](33-shelf-ranking-policy.md).

The core accepts eligible confirmed lipid data, selects by printed test date and reranks locally without reanalyzing a report. However, the existing app report workflow still stores `synthetic: true` sample reports, which this comparison deliberately ignores. **Real report extraction/import and end-to-end lipid personalization are not complete.** Tests of real-shaped confirmed-panel inputs establish the core contract only. Keep personal report capture gated until its redaction, retention and extraction requirements pass.

A qualified clinical reviewer is still needed for the full clinical policy and reference cases. Development and testing continue in parallel. Educational sources and signed metadata alone do not establish reviewed executable medical ratings.

## Checks performed

- Full workspace typechecks and mobile lint: passed.
- 260 application/domain/service tests and three tooling tests: passed, including the new full identity → confirmation → comparison integration test.
- Targeted shelf coverage: 31 identity/session tests, 16 ranking tests and one integration test. Cases include stale work, multiple runs, limits, conflicting GTIN facts, variants, profile revisions, latest panel selection, synthetic report exclusion, safety holds and unseen products never filling ranks.
- Read-only current-catalog identity/coverage checks: passed within their stated limits. No catalog database mutation, user health data or paid AI request was used.
- iOS project generation and iOS JavaScript/Hermes export: passed. These do not compile Swift or produce a signed app.
- Mac helper shell syntax: passed. Both model packages are checked against their manifests during source packaging and again by the Mac helper.
- Browser preview at 390 × 844: onboarding with fictional values, Home → Shelf Scan, category search/selection and missing-tester-access error checked. Screenshot saved with the delivery. No beta key was entered. This does not exercise native capture or a populated ranking screen.
- Independent integration/native source review: reader-overlap and camera-session handoff findings fixed and re-reviewed. Source review is not device validation.

Not executed here: Swift helper fixtures, full Swift compilation, camera permission/overlay behavior, Apple Vision OCR, Core ML numerical parity, sustained iPhone 2 Hz, phone memory/thermal behavior, VoiceOver, native Android scanning, real personal report import and full clinical acceptance.

## iPhone acceptance sequence

Use [the updated Mac guide](28-iphone-shelf-test-installation.md) with **HealthGrocery-iPhone-Shelf-Scan-2026-10-14.zip**, extracted into a fresh folder. Run `check`, optional `geometry` and `scan-checks`, then `prepare`. Complete Apple signing and build Release on the physical phone. The package contains source, not a precompiled or signed iPhone application.

1. Compile/run the Swift helper fixtures and full app. Resolve build errors before evaluating camera quality.
2. Run both detectors on the same cereal, cheese and cookie shelves. Annotate visible packages independently; distinguish a missed box, a merged box, wrong text, wrong variant and catalog absence.
3. Run each detector's separate five-minute Release benchmark. Preserve its model identity. The detection pass requires a completed window, >=1.90 completed FPS, p95 <500 ms, no failed inference and no serious/critical thermal state. Also run the integrated scan with OCR active to measure end-to-end responsiveness; detector-only timing is insufficient.
4. Validate exact variants and user confirmation against real packages. No unresolved/wrong item may silently enter the ranked list. Verify quantities/nutrients against labels for demonstration products; do not choose convenient labels after seeing a ranking.
5. Exercise rapid Start/Pause/Resume, navigation during OCR, camera denial/grant, background/lock, interruption and new scan during shutdown. Check that no old observation enters a new run and earlier runs remain intact.
6. Change local health needs and verify retained products rerank without another report analysis or profile upload. Exercise multiple concerns, tied products and every missing-evidence state.
7. Inspect phone storage/network behavior, app-switcher masking, explicit reset and actual process termination. Check text sizes, tap targets, VoiceOver and longer product names.

## Path to October 23

These are target work windows, not completed milestones or a delivery guarantee:

| Target | Acceptance focus |
|---|---|
| October 15–16 | Xcode installation, first physical Release build, native fixes, detector and OCR ground-truth checks |
| October 16–19 | Product/variant coverage on actual stores and labels; connect and validate real lipid-report flow; reviewed disease and restriction rules in parallel |
| October 19–21 | End-to-end phone sessions, accuracy/heat/memory/privacy/accessibility fixes; Android native parity remains required for complete two-platform release |
| October 21–22 | Refresh public catalog evidence before final tests, freeze a tested build, record/rehearse the demonstration, refresh Personal Team provisioning if needed |
| October 23 | Final verification and submission using the actually validated build |

The highest-risk remaining dependencies are physical iPhone access, actual package recognition quality, real lipid import, clinical/dietary evidence and native Android parity. Keep them visible; do not label this source increment as completion of the full polished app.
