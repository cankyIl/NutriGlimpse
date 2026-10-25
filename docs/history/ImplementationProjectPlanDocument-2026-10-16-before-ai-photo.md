# Beta 0 Implementation Project Plan

**Updated:** October 16, 2026  
**Authoritative workspace:** /path/to/NutriGlimpse on project-server  
**Baseline:** Requirements/design v0.20 and accepted product-label policy  
**Testers:** Three iPhone testers, possible fourth Android tester  
**Status:** Photo-first iPhone implementation installed. Physical feedback exposed a text-box geometry defect; the correction is installed and launched. The user confirms product suggestions now appear. Exact-product selection and food-facts display are the next physical checks. Independent development pass completed. Device acceptance, tester distribution, clinical/evidence approval and specified external data rights remain open. Beta 0 is not declared fully accepted or ready for public release.

This is the current plan. Superseded pending items were removed; the [unaltered historical plan](history/ImplementationProjectPlanDocument-2026-10-14-before-reconciliation.md) preserves previous checkpoints. Dated historical checkboxes are not the active backlog.

## Completed development

| ID | Delivered | Evidence / boundary |
|---|---|---|
| DEV-01 | Offline DASH/NIDDK/DGA guidance library: 26 entries, five sources and 128 serving-table cells. Explicit sodium/saturated-fat reference arithmetic and existing ADA/CDC/Mayo/AHA education | Source links/version and conflicting serving definitions retained; no personal target chosen automatically |
| DEV-02 | Seven retailer checking links; adjustable local store radius, distance order and directions; transient foreground GPS/manual branch context | Location is not inventory. OSM remains Massachusetts-focused |
| DEV-03 | Local product/receipt reading, source-linked correction, missing-item recovery, purchase quantities, partial/excluded rows, exact catalog confirmation, package/catalog differences, encrypted review history/deletion/export | Fictional full review is available; file/photo-library/receipt imports remain gated. A separate in-memory iPhone still-photo route is implemented in DEV-10 |
| DEV-04 | Additional report OCR typography/layout handling and adversarial evidence checks | Missing/ambiguous values remain unknown; existing consented numeric-only report route preserved |
| DEV-05 | Fifteen justified OFF category improvements; resumable, pinned, hashed, atomic bulk acquisition/import; refreshed exclusion and chain-coverage audits | 352 comparison-ready OFF foods; no weakened nutrient/dietary/freshness checks or invented catalog growth |
| DEV-06 | Android CameraX/ONNX/ML Kit Shelf Scan, barcode-first local reading, bounded scheduling, lifecycle cancellation and benchmark metrics | Native compilation and emulator runtime checks passed; physical accuracy/performance and model distribution rights unverified |
| DEV-07 | Consolidated automated checks, internally signed Android phone/emulator builds, installation/startup check, iOS project preparation and all-platform JavaScript exports, source package and security review | iOS Swift compilation, initial-screen rendering and simulator restart now pass; unsigned and signed device compilation, physical installation and user-confirmed initial screen pass. No physical phone acceptance or clean security-audit claim |
| DEV-09 | Physical-phone feedback: optional gender, General Fitness/No Concern, remembered location without repeated notices, immediate return after store choice and verified main Wegmans address | 331 app/core/service tests pass; signed iPhone update installed/launched; user confirms store return and address |
| DEV-10 | Direct product-photo recognition, separate nutrient-table and barcode cameras, included offline catalog, shelf auto-start and exact-name suggestion ordering | 356 automated checks, 19 original native OCR checks and 15 corrected edge-image cases pass; signed update installed/launched, physical photo-to-suggestions confirmed; exact match/facts and shelf acceptance pending |
| DEV-08 | Reconciled traceability/source register, beta acceptance/demo script, Mac setup guide, current evidence report and laptop documentation mirror | Actual tester results and final student submission materials remain external inputs |

## Current implementation baseline

- Catalog: **4,677 source records / 4,601 barcodes** — 2,898 USDA and 1,779 OFF records. OFF comparison eligibility is **352**, up from 337 before this increment.
- Resumable acquisition: 43 row groups / 704 selected US candidates; 109 valid candidates were already current. **Zero new rows imported** by this bounded pass.
- Optional trans fat/potassium/magnesium/calcium are ingested where reported. Missing data stays unknown.
- Reported front-label/allergen/trace evidence is connected. Exact-product signed gluten verification supports **verified certification OR verified manufacturer claim**, as approved by the user. **Zero production products currently have verified proofs.**
- Local OSM directory: 2,012 Massachusetts stores / 842 footprints. Latest bounded refresh timed out; previous data preserved.
- Existing app/profile, encrypted native storage, deletion/backup/restore, inline alternatives, barcode/catalog lookup, consented numeric report processing and iPhone Shelf Scan source remain implemented.
- Current server/Mac iOS build source: `06e3b593db6131de909621a5920365c1816412930499e8b5a735a9c6fd8d0c21`. Earlier Android packages remain their previous checkpoint and must not be described as rebuilt from this iOS increment.
- No new paid OpenAI request was made. Existing $2 cap remains.

## Verification completed

- **339 application/core/service tests**, seven tooling tests (including four scene-lifecycle regression checks) and ten report-adapter tests; typecheck and lint pass. Photo-reader and retrieval evidence is detailed in [photo-first acceptance](41-photo-first-camera.md).
- Three Android geometry/planner unit tests and two emulator instrumentation tests pass. Both shelf models execute on four attributed fixtures; bundled OCR reads a fictional package.
- Eight Python operator/provenance/budget/resume tests and seven guidance archive checks pass.
- Android arm64 phone and x86_64 emulator release packages built and verified against source. Emulator installation/startup passes; crash buffer empty. No physical phone claim.
- iOS project preparation and Android/iOS/web JavaScript export pass. The subsequent Mac build compiled Swift successfully; its first launch exposed an iOS 27 scene-lifecycle requirement. A reproducible Expo config-plugin correction now passes native compilation, initial-screen rendering and restart checks. No agreement was accepted by the agent. Subsequent Personal Team signing and physical installation/startup passed; the broader feature acceptance remains open.
- Live HTTPS catalog authentication, enriched export, legacy compatibility and portfolio HTTP 200 checked. Project backend ports remain loopback-only; inspected key files are 0600.
- Interactive browser walkthrough was rejected by automatic approval review (“blocked by policy”). It was not bypassed or reported as passed.

Detailed evidence and artifact checksums: [independent development checkpoint](37-independent-development-checkpoint.md).

## Remaining work and exact dependencies

| ID | Remaining work | Needed to proceed |
|---|---|---|
| DEP-01 | Distribute approved iPhone builds to additional testers | First personal-device signing/installation/startup is complete on the connected iPhone 16. TestFlight requires active membership/App Store Connect and release/model-rights gates. The current Personal Team build expires October 22 at 10:50 p.m. Eastern; it can be re-signed locally |
| DEP-02 | Physical camera, OCR, GPS/store, storage/export/deletion, accessibility and performance acceptance; validate the new in-memory iPhone photo route; enable file/photo-library/receipt imports only after their separate checks | The connected iPhone 16 is available and first launch is confirmed. Remaining checks need tester participation and representative permitted inputs. Android phone if the fourth tester joins. Full interactive workflow acceptance remains open |
| DEP-03 | Personalized medical recommendations, report interpretation and production clinical rules across supported conditions/pregnancy/overlaps | Qualified clinician/dietitian review of rules, applicability, thresholds and reference cases. Educational comparisons continue without this |
| DEP-04 | Production verified dietary matches and exact formulation claims | Current exact-product manufacturer/certifier evidence, permitted reuse and accountable reviewer/authority scope. Gluten-free acceptance policy is already resolved |
| DEP-05 | Actual retailer stock/authorized listing connections | Retailer/aggregator permission and feed covering intended chains/branches. Shopping links and factual alternatives already work without stock |
| DEP-06 | Distribute the shelf detector models; enable specialized measured FODMAP claims | Detector model/code/data distribution-rights resolution; licensed specialist data where required. Research diagnostics do not authorize distribution |
| DEP-07 | Declare measured retailer coverage and release acceptance | Actual branch/product evaluation baskets, tester results and approved pass criteria; template currently has zero physical observations |
| DEP-08 | Close upstream dependency advisories and refresh unavailable map data | Patched upstream releases / provider availability. Current audit: 22 paths (19 high, three moderate); decoder mitigation tested, braces/node-forge unresolved. This does not require buying another account |

The earlier independent queue and newly unblocked Mac compilation/startup work are checkpointed. Personal-device signing, installation and first launch are now complete. The next phase is the remaining physical feature and privacy acceptance. Further product-category expansion and source refreshes remain maintenance work driven by new validated source data and observed package gaps, not grounds to claim every grocery product is covered.

## Resolved inputs — do not reopen as blockers

USDA key; OFF form/contact/ODbL reuse decision; OpenAI project/key/credits and $2 cap; secure grocery.serveforwad.com backend; chosen OSM location provider; accepted default OpenAI retention for the bounded report route; verified certification OR manufacturer gluten-free policy; three-iPhone tester scope. The Mac and first physical iPhone are available; USB pairing, Developer Mode, signing certificate/profile and developer trust are resolved. No zero-retention purchase is required by the current report design.

## Approved scope and presentation

- Keep laptop as interface; code/build/backend work stays on project-server. Preserve portfolio services.
- Keep source media transient; no backend personal-content storage. Medical recommendations remain disabled until qualified review.
- Preserve nutrition, dietary, exact-variant and freshness requirements. Unknown stock/certification remains unknown.
- Branding remains open. Retain “Your Health & Grocery Companion,” bold introductory copy, lively colors, compact ingredients, small 1× portion note and up to three inline scrollable alternatives.
- The October 6 deadline was explicitly removed.
- Final iPhone aesthetics are revisited during device testing; no fabricated test results or clinical/competition endorsements.

## Related current documents

- [Source connection table and operator workflow](25-section11-sources-and-dependencies.md)
- [Requirement traceability](05-requirement-traceability.md)
- [Development and verification evidence](37-independent-development-checkpoint.md)
- [Beta acceptance and competition demo](38-beta-acceptance-and-demo.md)
- [Mac/iPhone setup](39-mac-iphone-setup.md)
- [First native Mac build and crash correction](40-first-mac-iphone-build.md)

## Checkpoint

October 14–15: reconciled the old plan, completed DEV-01 through DEV-08 to the documented dependency boundaries, preserved historical evidence, and prepared updated source-matched artifacts. October 15 follow-up: user reports macOS 27 and Xcode 27 on the M2 Mac. Dedicated laptop SSH access now works at developer@192.0.2.10. The prepared 451-file source archive was transferred and verified on the Mac. The first native Swift checks exposed missing explicit CoreGraphics imports; these were corrected in authoritative server source and copied to the Mac. 32 geometry cases, five pixel fixtures and 33 planner/text checks now pass. The first simulator app compiled, but failed at launch because iOS 27 requires a scene lifecycle. A config plugin now selects Expo’s bundled scene delegate, preserves deep links and delays the React window until private-storage setup finishes. Seven tooling checks, lint and typecheck pass. Native simulator rebuild, visual initial-screen verification and restart pass; unsigned physical-device compilation also passes. App Store Connect remains pending, which does not prevent initial local development/testing.

## October 15 physical iPhone installation checkpoint

The Mac is reachable at developer@192.0.2.10 with the same verified SSH host key. The connected phone is an iPhone 16 running iOS 27.0.1. USB pairing, Developer Mode and the on-phone developer trust confirmation are complete.

The Release app was signed using the existing Personal Team, installed successfully and launched. Its signature, artifact hashes, exact bundle identifier and provisioning coverage for this phone were verified. The same process remained running after 15 seconds, and the user confirmed the “Before we begin” screen. No app agreement was accepted by the agent, and no full physical-feature acceptance is claimed.

The Personal Team provisioning expires on **October 22, 2026 at 10:50 p.m. America/New_York**. Re-sign/reinstall before continuing tests after expiry. This is a local personal-device installation, not TestFlight distribution. Apple account approval was handled in the Mac's logged-in desktop session; no passwords or private signing keys were copied into the project.

Evidence: artifacts/mac-build/phone-desktop-signing.json, phone-install-verification.json, phone-installed-app.json, phone-launch-trusted.json and phone-running-process.json. Full build log and signed app remain in artifacts/mac on the Mac.

## October 15 phone-feedback update

Implemented and installed on the connected iPhone:

- Optional Gender next to age: Female, Male, Non-binary and Prefer not to say. Existing profiles remain readable. Gender stays in the local profile/encrypted backup; it does not infer pregnancy or change clinical thresholds.
- Primary Health Concern includes General Fitness and No Concern. New onboarding starts without an assumed disease. General Fitness preserves explicitly selected conditions; No Concern requires removing selected health conditions rather than silently overriding them. Dietary preferences remain independent. General-only shelf views show factual equal-weight comparisons without assigning a medical or weight-loss ranking; existing pregnancy, dietary, evidence and clinical gates remain.
- Removed the repeated location paragraph and routine home-screen location status. The existing automatic-location preference persists across restart/export/restore and foreground permission is reused. Background tracking stays off. Manual selection and permission settings remain available; failed preference saves are reported.
- Choosing a store returns immediately to the previous screen, with home as the fallback if the chooser was opened directly. Automatic detection does not dismiss a chooser opened to correct the store; the detected-store card has the same one-tap confirmation.
- Northborough Wegmans displays **9102 Shops Way, Northborough, MA 01532**, verified against its [official store page](https://www.wegmans.com/stores/northborough-ma). The OSM record lists neighboring building numbers. A narrowly scoped display correction preserves original map evidence and does not guess addresses for unrelated stores.

Verification: typecheck and lint pass; **331 app/core/service + 7 tooling + 10 report-adapter tests pass**. Five added regressions cover legacy profiles, gender, wellness compatibility and preserved safety checks, encrypted export/restart/location preferences, and branch-specific address correction. Signed Release rebuild, source/artifact hashes, device provisioning, signature verification, update installation and launch pass. The same process remained running on the phone. The user explicitly confirmed that store selection returns to the previous screen and that the Wegmans address shows one main number. Other new profile controls still await hands-on user feedback; full device acceptance is not claimed.

Source SHA-256: `3ff9299a86c34ea31eb2ec30b49120d6e23a1eba927e6f44ac2b9fa0e5479672`. Signed app tree SHA-256: `0304da9fa9dd10353924163bc6e13a9f3e135cf8a30f64ad16a6ebd2966cdb25`. Evidence: `artifacts/phone-feedback-2026-10-15/check.log` and the mirrored signing/install/launch records in the same directory. Earlier build evidence remains archived. The existing provisioning expiry remains October 22 at 10:50 p.m. Eastern. No new paid API calls, backend personal-data storage or portfolio changes.

## Active priority — photo-first scanning and Shelf Camera (October 15)

User-approved order: (1) photograph a single product and attempt identification, (2) reliable shelf capture/matching, (3) separate Barcode Camera, (4) separate Scan Nutrient Table. The home screen exposes all four actions directly. Scan Your Product must not silently substitute a barcode-only workflow or lead through fictional-source menus. Exact package/variant confirmation, explicit no-match recovery, cancellation/background cleanup and physical-iPhone checks are required. The implementation and automated checks are complete; the corrected signed iPhone build is installed and launched; the user confirms suggestions appear; exact product/variant selection and food-facts display remain to be checked. Still-photo bytes and OCR stay local and transient. The included catalog works without beta access/network. Native compilation alone does not establish recognition reliability. See [photo-first implementation and acceptance](41-photo-first-camera.md) for exact behavior, evidence and remaining phone checks.

Photo checkpoint: signed Release build, matching source/artifact hashes, signature/provisioning validation and physical iPhone update installation pass. The phone was locked, so automated launch was denied by iOS; no camera/runtime acceptance is claimed. The user has been asked to unlock/open the app and test the first product photo. Evidence: `artifacts/photo-camera-2026-10-15/`; detailed checks and limitations: [photo-first camera acceptance](41-photo-first-camera.md).

## October 16 photo-feedback correction

The first physical photo did not crash, but failed with a misleading lighting message. Reproduced this failure in native tilted/cropped fixtures: out-of-bounds text rectangles rejected otherwise readable OCR. Clip rectangles to the image, reject non-finite/empty boxes, and retain the strict schema. Before: 13/15 fixture pages rejected; after: 0/15. Distinct P1/P2/P3/N1 messages replace the catch-all without recording image/OCR/exception contents.

The corrected signed build is installed and launched on the connected iPhone; a later app-running check passed. 356 automated tests, the original 19 native reader checks and 15 new edge cases pass. The user retested and reported “It shows product suggestions.” The previous processing error did not recur on this scan. Exact-product accuracy, confirmation-to-food-facts navigation and broader shelf/camera acceptance remain open; the earlier phone-lock launch blocker is resolved. Detailed evidence: [photo-first camera acceptance](41-photo-first-camera.md), `artifacts/photo-fix-2026-10-16/`.

### October 16 — photo retest received

User-reported result on the corrected installed build: **“It shows product suggestions.”** Mark photo capture → processing → candidate display as observed working for this test. Do not infer that the exact brand/flavor is correct or that food facts opened. Next: confirm the exact product/variant and open its facts, then complete Shelf Camera acceptance. No new source change or rebuild was needed for this feedback checkpoint.
