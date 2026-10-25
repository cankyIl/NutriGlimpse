# Requirement implementation traceability

## October 15 first physical iPhone startup

Personal Team signing and installation now pass on an iPhone 16 running iOS 27.0.1. Signature/provisioning checks passed, the launched process survived the 15-second check, and the user confirmed the “Before we begin” screen. Earlier signing/phone-connection blockers are resolved for this device. Full camera/OCR/location/privacy/accessibility/performance acceptance and tester distribution remain open. See [physical installation checkpoint](40-first-mac-iphone-build.md).


## October 15 Mac verification update

Native iOS Release compilation now passes for both the simulator and unsigned physical-iPhone target. Explicit CoreGraphics imports and the iOS 27 scene-lifecycle correction are included in authoritative source. Initial simulator rendering and terminate/relaunch pass; 32 geometry cases, five pixel fixtures and 33 planner/text checks pass. Four new scene-lifecycle checks plus the three existing tooling tests, lint and typecheck pass.

Earlier dated “Swift compilation pending” statements below are historical and superseded by this build evidence. Physical phone/signing, complete interactive workflow acceptance, camera/GPS/privacy/performance and clinical/distribution gates remain open. See [first Mac build and crash correction](40-first-mac-iphone-build.md).


Baseline: v0.20 and the October 14–15 independent-development checkpoint. Current rows reflect implemented source; later dated sections preserve historical evidence. Every requirement remains required unless the specification identifies it as later scope. Partial evidence is not acceptance or clinical validation. See 04-implementation-log.md and [36-real-lipid-import.md](36-real-lipid-import.md).

| Requirement | Current evidence | Remaining acceptance |
|---|---|---|
| REQ-SCOPE-01 | Fictional journeys: capture/intake/fresh/receipt/report; supported-profile gates in types.ts and ProfileEditor; no-login browser smoke | Full real-data journeys on both phones and reviewed source/clinical behavior |
| REQ-SCOPE-02 | Fictional journeys: capture/intake/fresh/receipt/report; supported-profile gates in types.ts and ProfileEditor; no-login browser smoke | Full real-data journeys on both phones and reviewed source/clinical behavior |
| REQ-SCOPE-03 | Fictional journeys: capture/intake/fresh/receipt/report; supported-profile gates in types.ts and ProfileEditor; no-login browser smoke | Full real-data journeys on both phones and reviewed source/clinical behavior |
| REQ-SCOPE-04 | Fictional journeys: capture/intake/fresh/receipt/report; supported-profile gates in types.ts and ProfileEditor; no-login browser smoke | Full real-data journeys on both phones and reviewed source/clinical behavior |
| REQ-PROFILE-01 | ProfileEditor/AppState/session tests; applicabilityMatrix.test.ts covers 97,920 condition/restriction/pregnancy/age cases | Native persistence/relaunch, clinical reference outcomes and population review |
| REQ-PROFILE-02 | ProfileEditor/AppState/session tests; applicabilityMatrix.test.ts covers 97,920 condition/restriction/pregnancy/age cases | Native persistence/relaunch, clinical reference outcomes and population review |
| REQ-PROFILE-03 | ProfileEditor/AppState/session tests; applicabilityMatrix.test.ts covers 97,920 condition/restriction/pregnancy/age cases | Native persistence/relaunch, clinical reference outcomes and population review |
| REQ-PROFILE-04 | ProfileEditor/AppState/session tests; applicabilityMatrix.test.ts covers 97,920 condition/restriction/pregnancy/age cases | Native persistence/relaunch, clinical reference outcomes and population review |
| REQ-PROFILE-05 | ProfileEditor/AppState/session tests; applicabilityMatrix.test.ts covers 97,920 condition/restriction/pregnancy/age cases | Native persistence/relaunch, clinical reference outcomes and population review |
| REQ-PROFILE-06 | ProfileEditor/AppState/session tests; applicabilityMatrix.test.ts covers 97,920 condition/restriction/pregnancy/age cases | Native persistence/relaunch, clinical reference outcomes and population review |
| REQ-SCAN-01 | capture/intake/fresh plus local food-review correction, exact catalog confirmation and encrypted review history; localFoodInput and native adapter tests | Physical camera/OCR, representative real-source sanitization, approved product/variant evidence |
| REQ-SCAN-02 | capture/intake/fresh plus local food-review correction, exact catalog confirmation and encrypted review history; localFoodInput and native adapter tests | Physical camera/OCR, representative real-source sanitization, approved product/variant evidence |
| REQ-SCAN-03 | capture/intake/fresh plus local food-review correction, exact catalog confirmation and encrypted review history; localFoodInput and native adapter tests | Physical camera/OCR, representative real-source sanitization, approved product/variant evidence |
| REQ-SCAN-04 | capture/intake/fresh plus local food-review correction, exact catalog confirmation and encrypted review history; localFoodInput and native adapter tests | Physical camera/OCR, representative real-source sanitization, approved product/variant evidence |
| REQ-SCAN-05 | capture/intake/fresh plus local food-review correction, exact catalog confirmation and encrypted review history; localFoodInput and native adapter tests | Physical camera/OCR, representative real-source sanitization, approved product/variant evidence |
| REQ-SCAN-06 | capture/intake/fresh plus local food-review correction, exact catalog confirmation and encrypted review history; localFoodInput and native adapter tests | Physical camera/OCR, representative real-source sanitization, approved product/variant evidence |
| REQ-ASSESS-01 | assessment.ts conservative fixture engine; applicabilityMatrix/domain/evidence tests; extracted unknown facts preserved in browser | Approved scoring/clinical applicability and real product evidence; no production medical rating |
| REQ-ASSESS-02 | assessment.ts conservative fixture engine; applicabilityMatrix/domain/evidence tests; extracted unknown facts preserved in browser | Approved scoring/clinical applicability and real product evidence; no production medical rating |
| REQ-ASSESS-03 | assessment.ts conservative fixture engine; applicabilityMatrix/domain/evidence tests; extracted unknown facts preserved in browser | Approved scoring/clinical applicability and real product evidence; no production medical rating |
| REQ-ASSESS-04 | assessment.ts conservative fixture engine; applicabilityMatrix/domain/evidence tests; extracted unknown facts preserved in browser | Approved scoring/clinical applicability and real product evidence; no production medical rating |
| REQ-ASSESS-05 | assessment.ts conservative fixture engine; applicabilityMatrix/domain/evidence tests; extracted unknown facts preserved in browser | Approved scoring/clinical applicability and real product evidence; no production medical rating |
| REQ-ASSESS-06 | assessment.ts conservative fixture engine; applicabilityMatrix/domain/evidence tests; extracted unknown facts preserved in browser | Approved scoring/clinical applicability and real product evidence; no production medical rating |
| REQ-ALT-01 | AlternativeResults plus alternatives.test.ts: up to three inline options, equal-weight comparisons, restriction-first filtering | Verified retailer coverage and clinically reviewed ranking/reference cases |
| REQ-ALT-02 | AlternativeResults plus alternatives.test.ts: up to three inline options, equal-weight comparisons, restriction-first filtering | Verified retailer coverage and clinically reviewed ranking/reference cases |
| REQ-ALT-03 | AlternativeResults plus alternatives.test.ts: up to three inline options, equal-weight comparisons, restriction-first filtering | Verified retailer coverage and clinically reviewed ranking/reference cases |
| REQ-ALT-04 | AlternativeResults plus alternatives.test.ts: up to three inline options, equal-weight comparisons, restriction-first filtering | Verified retailer coverage and clinically reviewed ranking/reference cases |
| REQ-ALT-05 | AlternativeResults plus alternatives.test.ts: up to three inline options, equal-weight comparisons, restriction-first filtering | Verified retailer coverage and clinically reviewed ranking/reference cases |
| REQ-STORE-01 | OSM foreground local detection, saved directory, manual branch selection, radius filtering, directions and seven explicit retailer-checking links; store/retailer tests | Physical permission/GPS/branch accuracy; expanded OSM source coverage; authorized stock feed only for stock assertions |
| REQ-STORE-02 | OSM foreground local detection, saved directory, manual branch selection, radius filtering, directions and seven explicit retailer-checking links; store/retailer tests | Physical permission/GPS/branch accuracy; expanded OSM source coverage; authorized stock feed only for stock assertions |
| REQ-STORE-03 | OSM foreground local detection, saved directory, manual branch selection, radius filtering, directions and seven explicit retailer-checking links; store/retailer tests | Physical permission/GPS/branch accuracy; expanded OSM source coverage; authorized stock feed only for stock assertions |
| REQ-STORE-04 | OSM foreground local detection, saved directory, manual branch selection, radius filtering, directions and seven explicit retailer-checking links; store/retailer tests | Physical permission/GPS/branch accuracy; expanded OSM source coverage; authorized stock feed only for stock assertions |
| REQ-RECEIPT-01 | Local receipt parsing/correction, purchase quantity/date/store, excluded nonfoods, unresolved items, exact catalog confirmation and encrypted review/export; native source route remains acceptance-gated | Physical receipt layout/privacy acceptance and exact-package confirmation; no purchase-as-consumption inference |
| REQ-RECEIPT-02 | Local receipt parsing/correction, purchase quantity/date/store, excluded nonfoods, unresolved items, exact catalog confirmation and encrypted review/export; native source route remains acceptance-gated | Physical receipt layout/privacy acceptance and exact-package confirmation; no purchase-as-consumption inference |
| REQ-RECEIPT-03 | Local receipt parsing/correction, purchase quantity/date/store, excluded nonfoods, unresolved items, exact catalog confirmation and encrypted review/export; native source route remains acceptance-gated | Physical receipt layout/privacy acceptance and exact-package confirmation; no purchase-as-consumption inference |
| REQ-RECEIPT-04 | Local receipt parsing/correction, purchase quantity/date/store, excluded nonfoods, unresolved items, exact catalog confirmation and encrypted review/export; native source route remains acceptance-gated | Physical receipt layout/privacy acceptance and exact-package confirmation; no purchase-as-consumption inference |
| REQ-RECEIPT-05 | Local receipt parsing/correction, purchase quantity/date/store, excluded nonfoods, unresolved items, exact catalog confirmation and encrypted review/export; native source route remains acceptance-gated | Physical receipt layout/privacy acceptance and exact-package confirmation; no purchase-as-consumption inference |
| REQ-LAB-01 | Native camera/JPEG/PNG/PDF import source; local OCR allowlist; authenticated typed-evidence OpenAI route; mandatory beta agreement; one invented-panel live check; see [36](36-real-lipid-import.md) | Physical iPhone/Android real-media validation; broader extraction accuracy; original-pixel LLM extraction and clinical interpretation unimplemented |
| REQ-LAB-02 | realReportEvidence strict analyte/value/unit/page/date parsing; exact provider-result equality; source-linked user confirmation and corrections; see [36](36-real-lipid-import.md) | Physical OCR/layout diversity and confirmation usability; reference ranges/flags and clinical interpretation remain incomplete |
| REQ-LAB-03 | Typed import excludes reference ranges/flags; real saved panel has no generated clinical interpretation; see [36](36-real-lipid-import.md) | Implement reviewed distinction between laboratory ranges/flags, guideline context and individualized targets |
| REQ-LAB-04 | Real import performs a structured evidence consistency check only; no diagnosis or treatment output; see [36](36-real-lipid-import.md) | Reviewed clinical explanation and follow-up cases across supported adult/pregnancy contexts |
| REQ-LAB-05 | Encrypted local compact evidence/result journal and confirmed panel; no source media in records; native cleanup source and adapter tests; see [36](36-real-lipid-import.md) | Physical cleanup/cache/backup inspection, interrupted lifecycle and storage-size measurements on representative reports |
| REQ-LAB-06 | Confirmed real panels feed latest-test-date local Shelf Scan comparison; fictional panels excluded; same-date conflict and profile-change tests; see [36](36-real-lipid-import.md) | Physical report-to-shelf journey; reviewed clinical rules and complete food-rating/receipt/alternative personalization |
| REQ-LAB-07 | No arbitrary text/images/profile in strict report wire schema; extra-field rejection before provider; exact-output validation server and client; see [36](36-real-lipid-import.md) | Broader adversarial native OCR layouts and future image/explanation routes require their own validation |
| REQ-LAB-08 | Exact-byte fingerprint stays local; journal intent before dispatch; completed-result reuse, explicit unknown retry and save-only recovery tests; see [36](36-real-lipid-import.md) | Physical force-close/relaunch/storage failure; semantic duplicate recognition is not implemented; unknown remote computation is not exactly-once |
| REQ-LAB-09 | Six supported analytes with explicit unit compatibility and comparison signs; no inferred measurements; see [36](36-real-lipid-import.md) | Physical field extraction coverage; reviewed analyte interpretation and handling of laboratory ranges/flags |
| REQ-PRIVACY-01 | Initial beta agreement; tester API access is technical access, not consumer login or cloud profile; see [36](36-real-lipid-import.md) | Physical onboarding and account-free native journey verification |
| REQ-PRIVACY-02 | SQLCipher local state includes consent, compact report journal and confirmed values; profile never enters report request; see [36](36-real-lipid-import.md) | Physical encryption/backup/cache inspection and deployed hosting audit |
| REQ-PRIVACY-03 | Dedicated transient typed-evidence service; no report logging/result storage/cache; no files/tools/background; no-store responses; see [36](36-real-lipid-import.md) | Physical outbound-byte capture and deployed proxy/runtime persistence inspection |
| REQ-PRIVACY-04 | User accepts default OpenAI retention via mandatory versioned agreement; policy link and local-deletion limitation shown; no ZDR claim/gate; see [36](36-real-lipid-import.md) | Keep disclosure aligned with actual API configuration and provider policy; no zero-retention claim |
| REQ-PRIVACY-05 | Local report/import deletion invalidates pending results and future context; existing backup-exclusion source; see [36](36-real-lipid-import.md) | Physical deletion/cache/backup/reinstall verification; user-owned originals and provider copies remain outside local deletion |
| REQ-PRIVACY-06 | Optional camera/document import and bounded typed evidence; no names/SSNs/addresses/filenames/profile in report wire schema; see [36](36-real-lipid-import.md) | Physical permission-denial/recovery and exact outbound-content validation |
| REQ-PRIVACY-07 | Bounded volatile rate/concurrency controls; shared locked aggregate cost ledger contains only reservation amount, kind and timestamp; see [36](36-real-lipid-import.md) | Verify production hosting metadata/retention; no health content or stable device identity may enter operational records |
| REQ-PRIVACY-08 | Native local OCR → strict allowlist reconstruction; no original pixels/PDF or arbitrary OCR text forwarded; server rejects extra fields; see [36](36-real-lipid-import.md) | Physical actual-payload inspection and native adversarial layout validation; broader masked-image routes remain separately gated |
| REQ-PRIVACY-09 | Encrypted snapshot archive includes compact allowed state/journal; restored in-flight records become outcome-unknown, never automatic retry; see [36](36-real-lipid-import.md) | Physical export/share-sheet/restore and collision acceptance; no raw media or provider credentials in archive |
| REQ-PRIVACY-10 | Report records contain no media; native staged-file disposal and recovery journal source; ten adapter tests and JVM interruption fixture; see [36](36-real-lipid-import.md) | Physical picker/cache/force-close/relaunch cleanup for this increment; unrelated product/receipt media acceptance remains open |
| REQ-DATA-01 | USDA/OFF source cache/export, nullable minerals/trans fat, reported label evidence, signed exact-product proofs, offline guidance library and signed clinical-rule transport; source register in document 25 | Source rights/coverage/freshness, clinician approvals and production evidence/rule versions |
| REQ-DATA-02 | USDA/OFF source cache/export, nullable minerals/trans fat, reported label evidence, signed exact-product proofs, offline guidance library and signed clinical-rule transport; source register in document 25 | Source rights/coverage/freshness, clinician approvals and production evidence/rule versions |
| REQ-DATA-03 | USDA/OFF source cache/export, nullable minerals/trans fat, reported label evidence, signed exact-product proofs, offline guidance library and signed clinical-rule transport; source register in document 25 | Source rights/coverage/freshness, clinician approvals and production evidence/rule versions |
| REQ-DATA-04 | USDA/OFF source cache/export, nullable minerals/trans fat, reported label evidence, signed exact-product proofs, offline guidance library and signed clinical-rule transport; source register in document 25 | Source rights/coverage/freshness, clinician approvals and production evidence/rule versions |
| REQ-UX-01 | Shared accessible controls, loading/error/cancellation paths and browser intake/correction checks; documented aesthetics baseline | VoiceOver/TalkBack, large text, full phone journeys and device performance measurements |
| REQ-UX-02 | Shared accessible controls, loading/error/cancellation paths and browser intake/correction checks; documented aesthetics baseline | VoiceOver/TalkBack, large text, full phone journeys and device performance measurements |
| REQ-UX-03 | Shared accessible controls, loading/error/cancellation paths and browser intake/correction checks; documented aesthetics baseline | VoiceOver/TalkBack, large text, full phone journeys and device performance measurements |
| REQ-OPS-01 | 326 app tests plus tooling/native adapter/operator checks; Android shelf native compilation/runtime tests; loopback HTTPS services and strict consented numeric report route; signed-rule and label-proof lifecycle | remaining physical acceptance and distribution, security advisories, production clinical/evidence trust and source rights |
| REQ-OPS-02 | 326 app tests plus tooling/native adapter/operator checks; Android shelf native compilation/runtime tests; loopback HTTPS services and strict consented numeric report route; signed-rule and label-proof lifecycle | remaining physical acceptance and distribution, security advisories, production clinical/evidence trust and source rights |
| REQ-OPS-03 | 326 app tests plus tooling/native adapter/operator checks; Android shelf native compilation/runtime tests; loopback HTTPS services and strict consented numeric report route; signed-rule and label-proof lifecycle | remaining physical acceptance and distribution, security advisories, production clinical/evidence trust and source rights |

Requirement count: 65.

## October 14–15 implementation additions

- REQ-SCAN/RECEIPT/PRIVACY: local structured source review keeps original pixels and raw OCR out of saved records; edits and exact matches remain explicitly user-confirmed. Conflicting/missing fields remain unknown. Optimistic save and archive restoration tests cover stale/deleted records.
- REQ-ALT/DATA: 15 additional OFF classifications verified from exact source taxonomy; 352 comparison-ready OFF records. No weakened nutrient, restriction, freshness or identity requirement.
- REQ-STORE: foreground local origin is cleared on background/error; radius changes and directions do not imply retailer stock.
- REQ-UX/DATA: 26 source entries and 128 serving cells are available offline; explicit-reference calculations have no personal default and preserve source differences.
- REQ-SHELF: Android CameraX/ONNX/ML Kit implementation joins the iPhone source. Both models run on four attributed fixtures in the Android emulator; bounded-reader text test passes. This is native runtime evidence, not real-store accuracy, physical speed, clinical validation or model distribution approval.
- REQ-LAB: OCR typography/explicit unit variants supported; ambiguous units, altered digits, unrelated rows and contradictory values remain rejected.
- REQ-OPS: canonical Android builder now supports emulator and phone architectures with source and artifact checksums. Updated final artifact/test evidence is in [37](37-independent-development-checkpoint.md).

## Historical increment evidence (earlier dates; superseded for current status)

The original requirement rows above remain the conservative full-release status. Updated implementation evidence is in `04-implementation-log.md`, section “Beta 0 engineering increment.” New receipt/report UI and encrypted repository/archive code are partial implementation evidence, not satisfaction of the full capture, privacy, report or release requirements. `packages/core/test/beta.test.ts` adds five automated cases; 17 total pass. Phone installation and device verification remain pending for one iPhone and one Android tester. Real personal processing remains disabled.


Latest continuation: 31 automated tests, TypeScript/lint and final all-platform JavaScript export pass. Native Gradle build stopped for missing Java/JAVA_HOME. See 06-beta0-integration-handoff.md; no physical-device acceptance or complete release is claimed.



October 6 native input evidence: REQ-PRIVACY-08/10 have bounded input-module source and report reconstruction prototype, with disclosure authorization false. Android compilation passed; Swift and device/payload acceptance remain pending. Added adversarial OCR-text and service-boundary tests. Full acceptance stays open.

October 6 report correction evidence: REQ-LAB-02/08 now have source-linked correction, unchanged-result reuse, revision metadata, stale-response rejection and failed-write/concurrent-edit tests. TypeScript/lint and 62 tests pass; browser flow and Android packaging pass. Actual image/PDF import deduplication, clinical interpretation and phone acceptance remain open.

October 6 alternatives evidence: REQ-ALT-02/03 now have equal-weight improvement filtering and five-nutrient comparison display, with adversarial serving-size, restriction and retailer-ordering tests. 67 tests pass; browser confirms the 55 g comparison. This is synthetic engineering evidence only; clinical ranking and real retailer coverage are not accepted.

October 6 durable trust evidence: REQ-OPS-01 gains serialized signed-pack updates, persistent sequence/digest repository contract and native SQLCipher adapter separate from personal archives. Six lifecycle tests pass (73 total). Trusted-update app wiring, production keys, clinical review and device storage acceptance remain open.

October 6 barcode evidence: camera symbology-aware UPC-E expansion and explicit manual format choice implemented; four new tests pass (77 total), including ambiguous eight-digit checksums. Actual phone scanning and verified catalog identity remain open.

October 6 capture lifecycle evidence: REQ-SCAN-05 now has guarded permission completion, cancellation/background invalidation and single-use camera callbacks, with six tests (83 total). Actual phone permission and camera acceptance remains open.

October 6 food-extraction evidence: REQ-SCAN-03/REQ-RECEIPT-02/04 gain bounded unverified response schemas with source references, explicit unknowns and adversarial synthetic tests. 89 tests pass. Sanitization, actual extraction integration, user correction and real-source acceptance remain open.

October 6 PDF diagnostic evidence: REQ-SCAN-05/REQ-PRIVACY-10 gain a fictional two-page native PDF fixture and coordinator coverage/cancellation tests (92 total). Real PDF/privacy validation and physical-file cleanup acceptance remain pending.

October 6 archive recovery evidence: stale preview suppression, single-write confirmation, failed-write preservation and retry tests pass, plus stricter archive-envelope validation (98 tests total). Actual native file-provider/storage acceptance remains open.

October 6 app rule lifecycle evidence: REQ-OPS-01 now has application-owned initialization/cleanup and a trusted-source refresh interface with coalescing, failure recovery and shutdown guards. Seven new tests pass (105 total). No production transport/pins or clinical activation exist; device and distribution acceptance remain open.

October 6 report identity evidence: REQ-LAB-06/08 gain serialized source-identity registration, duplicate-result preservation, exact-byte fingerprint primitive and visible unresolved-date explanation. Six tests added (111 total); browser confirm/complete/reopen verified. Real file ingestion, semantic duplicate recognition, approved conflict-resolution policy and physical acceptance remain open.

October 6 invalid-input evidence: REQ-SCAN-05/REQ-PRIVACY-10 gain generated empty/corrupt/oversized native fixtures and a strict rejection/cleanup diagnostic. Six coordinator tests added (117 total). Native device execution, password-protected PDFs, rotation and privacy approval remain open.

October 6 receipt recovery evidence: REQ-RECEIPT-04 gains optimistic stale-review protection, context preservation and failed-save retry. Six tests added (123 application tests plus three decoder regressions). Native repeated-review/storage acceptance remains pending.

October 6 lab boundary evidence: REQ-LAB-02/06 gain actual-page membership checks, calendar/ambiguous-date rejection and explicit unconfirmed extraction output. Five tests added (128 application tests plus three decoder regressions). Native provenance, provider transport, human confirmation integration and clinical acceptance remain open.

Current source/test/artifact evidence is in 13-beta0-resumed-implementation.md. The 65 rows above are reconciled to this checkpoint. Group-level implementation evidence does not mean every individual acceptance criterion passed; remaining column defines the open full-release gate.

## Shelf Scan amendment — October 14, 2026

Documentation only; implementation and all acceptance verification pending.

| Requirement | Current evidence | Remaining acceptance |
|---|---|---|
| REQ-SHELF-01 | Requirements v0.17 and design section 7.7 | Continuous multi-product category capture; separate original/reduced-sugar entries; physical iPhone and Android verification |
| REQ-SHELF-02 | Requirements v0.17 and design section 7.7 | Personalized top ten, restriction exclusion, comparable quantities and honest coverage; physical iPhone and Android verification |
| REQ-SHELF-03 | Requirements v0.17 and design section 7.7 | Deferred uncertain-match review without interrupting capture; physical iPhone and Android verification |
| REQ-SHELF-04 | Requirements v0.17 and design section 7.7 | Start/Pause/Resume/Finish, inactivity and background behavior; physical iPhone and Android verification |
| REQ-SHELF-05 | Requirements v0.17 and design section 7.7 | Multiple runs retained across new scans; no durable writes/export; termination clears runs without affecting saved personal data; physical iPhone and Android verification |

## Detailed Shelf Scan plan — October 14, 2026

[Detailed Shelf Scan implementation specification](26-shelf-scan-implementation-spec.md) maps REQ-SHELF-01–05 to SS-T01–22 and SS-WP-01–08. This adds design evidence only; all Shelf Scan runtime acceptance remains pending, especially signed physical-iPhone capture, privacy and personalized ranking.

## October 14 real lipid-import evidence

The initial beta agreement explicitly accepts OpenAI default retention; earlier unresolved-ZDR/zero-retention statements are superseded for this bounded route. Current implementation sends typed numeric/date evidence, not original report media or arbitrary OCR text. Full verification: 311 application/core/service tests plus three tooling checks, typecheck and mobile lint; ten native adapter tests, JVM atomic-journal interruption fixture and Android Kotlin/Java compilation. One live invented-panel request returned exact matching evidence; unauthenticated/extra-field requests were rejected without provider use. Swift compilation, physical iPhone/Android acceptance and clinical interpretation remain pending. See [36-real-lipid-import.md](36-real-lipid-import.md) for authoritative scope and verification limits; software checks do not establish clinical validation.
