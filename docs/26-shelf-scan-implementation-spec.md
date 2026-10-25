# Shelf Scan — detailed implementation specification

**October 17 goal clarification:** Prioritize choosing the best fit among similar products actually visible on the shelf, using selected needs and explicit trade-offs. The AI image-transfer design remains under discussion; build 10 still uses the local recognition/comparison path. [Current goal and design discussion](62-shelf-choice-goal-and-design-discussion.md).

**Detector status, October 14:** the authorized no-training recovery evaluation rejected the tested YOLOE crop union. The iPhone diagnostic now compares ShelfSet and SKU-110K explicitly; model quality, Core ML parity and physical 2 Hz acceptance remain open. This does not change the full product requirements below. See [the evaluation decision](31-shelf-recovery-and-detector-decision.md).

**Version:** 1.3 — October 14, 2026 (America/New_York)  
**Status:** Product identification, memory-only runs and limited personalized nutrient comparisons are integrated in source. Full clinical coverage, real lipid-report import, Swift compilation and physical iPhone acceptance remain open. See [integration status](35-shelf-scan-integration.md).  
**Authority:** [Requirements](01-requirements-specification.md), REQ-SHELF-01–05; [main design](02-design-and-implementation-specification.md), section 7.7.  
**Workspace:** `/path/to/NutriGlimpse` on `project-server`.  
**Primary acceptance device:** The user's physical iPhone. Earlier records report iPhone 12 / iOS 26.6.2; confirm actual model/OS during testing. Android remains in the complete release.

## 1. Language and platform recommendation

**October 14 implementation decision:** Keep the completed YOLOE evaluation as historical evidence. The current research build uses ShelfSet / SKU-110K candidates and a local Apple Vision package reader. Custom training is not a prerequisite. October 23 remains the delivery target; detector choice and sustained 2 Hz require the physical-device tests in the [current checkpoint](35-shelf-scan-integration.md).

**Use TypeScript for shared screens, orchestration, ranking and backend, with Swift for the iPhone camera and local image-processing module.** Implement the Android native adapter in Kotlin using the same contract. Keep the existing React Native/Expo application. A complete SwiftUI rewrite is unnecessary for native iPhone camera behavior and would create a second implementation effort for Android.

The inspected repository uses Expo `~57.0.26`, React Native `0.86.3`, TypeScript `~6.0.3` and `expo-camera ~57.0.6`. It already contains a Swift `PrivateInput` Expo module. These are source/package facts, not proof of an iOS binary that builds or works on the user's phone. Preserve lockfile compatibility; this spec does not request a framework upgrade.

| Decision | Recommendation | Evidence required |
|---|---|---|
| SS-ADR-01 | Retain TypeScript/React Native UI and shared domain logic. | Regression tests and physical iPhone UI checks. |
| SS-ADR-02 | Focused local Expo module: Swift AVFoundation capture and Vision preprocessing. | Early native compilation, phone camera/privacy spike and measured memory use. |
| SS-ADR-03 | Separate app-root memory store for all shelf runs. | Multiple-run, disk/export and lifecycle tests. |
| SS-ADR-04 | Reviewed personalized ranking executes locally; recognition returns identities, not medical ratings. | Reference cases, deterministic tests and clinical review. |
| SS-ADR-05 | Kotlin Android adapter with shared TypeScript logic. | Native Android parity before complete release. |

Expo supports Swift/Kotlin modules and native views, so the recommended integration fits the existing application. This does not establish measured performance. [Expo Modules](https://docs.expo.dev/modules/overview/)

The dedicated module gives explicit frame admission, native buffer ownership and interruption control. Expo Camera remains suitable for existing individual capture or a controlled alternative spike. SDK 57 offers native picture references as well as an ordinary picture method that writes cache files; do not claim every Expo capture necessarily writes to disk. Validate the full downstream path before selecting either implementation. [SDK 57 Camera](https://docs.expo.dev/versions/v57.0.0/sdk/camera/)

These are recommended engineering decisions, not a user instruction to rewrite the app in Swift. Validate SS-ADR-02 early and record any alternative with its measured privacy/performance tradeoffs.

## 2. Approved product contract

- Toggle continuous Shelf Scan from the scan experience. Repeatedly capture useful shelf views while the user moves along an aisle.
- Accumulate identified products and show up to ten best fits within one category using existing health conditions, dietary restrictions and applicable latest confirmed lipid context.
- Original and reduced-sugar versions compete in the same category as separate products. Package sizes may share an entry only with supported identical formulation; the grouping mechanism is proposed.
- Collect uncertain matches under Needs confirmation without repeated pop-ups. Review when paused or finished.
- Start, Pause, Resume and Finish are explicit. Finish stops capture and retains results. Inactivity may pause, never silently finish/delete.
- Starting B preserves A. Keep all runs revisitable while the app remains alive. Backgrounding pauses capture. Closing/terminating the app clears shelf results; reopening starts empty.
- No persistent shelf history, saved photos/video, restoration or export. Existing saved individual scans, receipts, lipid reports and preferences keep their policies.
- Rank the best-fitting **identified and sufficiently assessed products in this scan**, not an allegedly complete shelf/store inventory. Fewer than ten eligible products is valid.

Unseen catalog alternatives cannot fill the shelf top ten. They may appear separately in the existing alternatives experience. No new login, price ranking, budget-setting UI, barcode-only replacement for shelf recognition or compulsory redaction preview is introduced.

## 3. Current implementation and gaps

Read-only source inspection occurred October 14. Recheck before editing because development continues in the authoritative remote repository.

| Existing surface | Reuse and limitation |
|---|---|
| Mobile `AppState.tsx`, core `session.ts`, native repository | Read profile/lab revisions. `saveScan` and `LocalSession.commit` persist; never use them for shelf results. |
| Core `cameraSession.ts` | Reuse generation/lifecycle concepts. `consume()` stops after one barcode; it is not the continuous engine. |
| `BarcodeInput.native.tsx`, `src/app/capture.tsx` | Preserve individual capture; coordinate a single camera owner. |
| Swift `modules/private-input/ios/PrivateInputModule.swift` | Existing Vision/PDF precedent. Writes bounded scratch files and is not validated shelf sanitization; do not reuse its document pipeline unchanged. |
| Core `captureGate.ts`, `inputPrivacy.ts` | General personal capture is blocked. Do not bypass with a UI toggle or client boolean. |
| Core `publicFood.ts` | Five nutrients, `100g` basis, unverified certifications/availability. Add necessary nullable fact/evidence fields without inventing missing values. |
| Core `comparisonGroups.ts` | Cereal, cookies and cheddar/cottage-cheese categories now exist. Coverage is uneven; validate the actual shelf against the current public catalog. |
| Core `catalogAlternatives.ts` | Top three improvements on one nutrient, not personalized overall health top ten. Reuse validation arithmetic selectively. |
| Core `assessment.ts`, `types.ts`, rule infrastructure | `assessSample` and existing assessment types are explicitly synthetic. Rule metadata is not executable reviewed nutrient scoring. |
| Service `server.ts`, `extractionProvider.ts` | Current provider extracts fictional reconstructed text, not multi-product shelf images. Other personal POST processing remains denied. |
| `apps/mobile/eas.json`, docs 18 | Build profiles exist. Inspected records do not establish Swift compilation/signing or physical-iPhone acceptance. |

Source rights, catalog gaps, provider retention and clinical review remain dependencies. A large catalog count does not prove the user's actual shelf can be identified and ranked.

## 4. Architecture and screen contract

Data flow: native preview → bounded frame admission → local privacy processing → candidate recognition → exact-product resolution → category/eligibility checks → local assessment/ranking → transient run view.

| Component | Responsibility | Persistence |
|---|---|---|
| Swift/Kotlin module | Preview, camera lease, orientation, bounded buffers, interruptions and sanitization | No shelf media/archive; native memory preferred. |
| Shelf coordinator | Active run, work tokens, cancellation, candidate merge and dispatch | None. |
| Run store | All current-app runs, confirmation queues, facts and rankings | None; separate from saved profile/history. |
| Identity resolver | Verify observed claims against catalog/label evidence | Public facts may be cached without shelf linkage. |
| Local ranking policy | Apply current profile, rules and comparable quantities | Results in run memory. |
| Transient recognition route | Validate sanitized request, call provider, validate candidates | No payload logs, storage or durable jobs. |
| Public catalog/rule services | Licensed facts, categories and reviewed signed rules | Existing public storage only. |

Recognition receives no conditions, dietary/religious preferences, lipid measurements or GPS. Profile/report/rule changes invalidate retained ranks and trigger local recomputation before displaying current conclusions; never rerun lipid interpretation.

Add Shelf Scan toggle, category suggestion/selector and store indicator to current scan-first navigation. During scanning show preview, status, category, counts identified/assessed/pending and a readable top-ten panel. Keep controls reachable with large text. Batch UI updates and preserve reading/VoiceOver focus instead of announcing every frame. Rank position accompanies absolute suitability and reasons.

A **Scans this session** selector sits outside persistent History. Starting a run appends it. Opening another run pauses current capture; Resume is explicit. No navigation action clears the archive.

Category suggestions remain correctable. Use versioned mappings between broad aisle categories and comparable forms; cheese membership alone does not justify unsupported portion/form conversions. Keep out-of-category candidates unranked. Correcting category repartitions existing candidates without discarding a run.

Needs confirmation shows compact names/observations and uncertainty reasons. If an old image is already released, offer closer/barcode/label recapture rather than implying a photo remains. User candidate selection does not supply missing nutrients. Optional licensed public product imagery is distinct from retained user photos.

Zero eligible products is an honest result: explain unidentified items, wrong category, missing facts, unverified restrictions or missing clinical context. A first-place cookie is not automatically Good fit.

## 5. State machine and app lifetime

Own the archive above route transitions, with one camera lease globally. Run states: `idle`, `scanning`, `paused`, `finishing`, `finished`, plus explicit pending/error fields.

| Event | Effect | Retention |
|---|---|---|
| New scan | Pause previous capture; create run and obtain lease when ready | Keep every previous run. |
| Pause | Stop admission/dispatch and discard unsent image | Keep candidates/ranks. |
| Resume | Obtain lease and advance capture epoch | Continue selected run. |
| Finish | Stop admission; allow bounded already-dispatched work to settle with a pending indicator | Keep results. |
| Start B while A finishes | B may own preview; global request limit applies | Permitted late A results update A only. |
| Navigate/change mode | Pause and release camera | Archive remains at app root. |
| Inactive/background/lock/interruption | Native stop immediately; best-effort request abort; invalidate affected epoch and release images | Compact archive remains while process lives. |
| Foreground | Show paused/finished; require Resume | No automatic camera restart. |
| Termination/crash/OS eviction | Memory disappears; no restore exists | New launch empty; saved ordinary data survives. |
| Memory/capacity pressure | Stop intake, release unsent images and redundant sightings | Never evict earlier runs to start a new one. |

Every local work token contains process nonce, run ID, capture epoch and work ID. Validate each completion against its originating run, allowed pending IDs and profile/rule revisions. Finish retains a bounded allowlist; background/privacy cancellation invalidates it. Reject duplicates atomically and never write a late result to whichever screen happens to be open. Remote processing may continue after client cancellation; do not claim otherwise.

Do not place the archive in per-screen state, saved navigation state or a provider remounted on profile changes. Production JS reload also loses memory; defer optional runtime updates while scans exist. Development Fast Refresh is not a retention test. Never add disk restore to hide process loss.

Apple does not generally deliver a termination callback for suspended apps. Memory-only state enforces the next-launch behavior without relying on delete-on-exit code. [Apple termination lifecycle](https://developer.apple.com/documentation/uikit/uiapplicationdelegate/applicationwillterminate(_:))

## 6. In-memory data contracts

Illustrative domain types to finalize before coding; no native raw-image handles belong in these UI objects.

```typescript
type ShelfRunState = 'idle' | 'scanning' | 'paused' | 'finishing' | 'finished';
type CandidateState =
  | 'needs_confirmation' | 'needs_facts' | 'out_of_category'
  | 'restriction_conflict' | 'restriction_unverified'
  | 'clinical_context_missing' | 'eligible';
interface ShelfRun {
  id: string;
  createdAt: string;
  categoryId: string | null;
  storeContext: { chainId?: string; branchId?: string } | null;
  state: ShelfRunState;
  captureEpoch: number;
  candidates: Map<string, ShelfCandidate>;
  acceptedWorkIds: Set<string>;
  ranking: string[]; // candidate IDs, at most ten; never media
  profileRevision: string;
  ruleVersion: string;
  rankingPolicyVersion: string;
  rankingUpdatedAt: string | null;
}
interface ShelfCandidate {
  id: string;
  productVersionKey: string | null;
  categoryId: string | null;
  displayName: string;
  status: CandidateState;
  identityEvidenceIds: string[];
  factsKey: string | null;
  assessmentKey: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
}
```

The memory facts map holds bounded validated facts and assessments. Preserve essential provenance/missingness, not unrelated raw OCR transcripts. Frame deduplication fingerprints are bounded and memory-only. Existing public cache records may survive, but shelf membership, timestamps, ordering, uncertainty queues, ranks and profile linkage must not persist through them. Do not call `repository.publicFoods.save` simply because a package appears on a shelf: that path currently represents saved personal foods.

## 7. iPhone native module

Proposed module: `apps/mobile/modules/shelf-capture`, with a Swift preview view/controller. Use module manifest, podspec/config integration and the existing native build workflow; do not hand-edit generated native project files as the integration strategy.

Own a serial capture-configuration queue, image-processing queue, camera lease and bounded pixel-buffer pool. Proposed bridge operations: `start(runToken, options)`, `pause(reason)`, `resume(runToken)`, `finish()`, `releaseFrame(handle)` and `dispose()`. Events expose compact state/quality/error data and sanitized-frame handles. These names are proposed application APIs, not claimed existing SDK methods.

Use AVFoundation frame output and late-frame dropping. Keep camera start/stop and image processing off the UI thread. Observe native app activation, interruptions and pressure independently of delayed JS callbacks. Do not record video or request microphone access. [Apple capture session](https://developer.apple.com/documentation/avfoundation/avcapturesession), [late-frame handling](https://developer.apple.com/documentation/avfoundation/avcapturevideodataoutput/alwaysdiscardslatevideoframes)

Pipeline:

1. Verify active run, permission and lease; admit only the permitted next sample.
2. Normalize orientation and preview/image coordinate transforms.
3. Check blur/exposure/overlap and skip redundant or unreadable samples. Offer steady-camera/closer-view hints. Stillness never implies Finish.
4. Run local OCR/barcode detection and privacy checks. Vision text recognition is local; it is neither a grocery SKU database nor a validated personal-identifier detector. Develop and test the missing identifier policy. [Apple Vision OCR](https://developer.apple.com/documentation/vision/recognizing-text-in-images)
5. Crop the relevant shelf region, destructively mask identifying content, remove metadata and encode a fresh derivative in native memory. Uncertain masking blocks dispatch; an external model never gets the original to help redact it.
6. Hold one active sanitized transport payload and one replaceable latest sample at most. Release raw buffers on success, skip, failure and cancellation.

Prefer native opaque handles until transport. If reusing TypeScript HTTP, expose only bounded sanitized bytes on demand, never full-resolution raw frames or base64 strings in React state. If profiling favors native transport, preserve the same authentication, cancellation and error contract and audit native caches/background upload behavior. Neither path may persist payloads. Decide transport in SS-WP-01 using measured memory and actual network-byte inspection.

Cover personalized UI before app-switcher snapshots and stop camera on native deactivation. Verify on a phone; JS notification alone may be too late. [Apple background UI](https://developer.apple.com/documentation/uikit/preparing-your-ui-to-run-in-the-background)

The existing PrivateInput document path writes scratch files. Do not copy its file-producing behavior into continuous sampling by default. If a platform library makes temporary files unavoidable, document the exact files, encryption/protection, backup exclusion and immediate cleanup; validate crash/startup recovery before real input. This is temporary media, never durable run state.

## 8. Admission limits and exact product recognition

### 8.1 Confirmed sampling rate and proposed processing limits

The user selected a target sampling rate of 2 images per second on October 14. Other values below remain engineering proposals. Neither the target nor this specification establishes achieved phone/inference throughput or increases the existing spending authorization.

| Parameter | Starting proposal |
|---|---|
| Sampling target — user selected | 2 images per second: one frame every 500 ms while actively scanning under normal conditions. Measure on the physical iPhone; reduced throughput or pauses under pressure must be visible. |
| Work bounds | One active cloud identification request globally; one replaceable unsent frame. No durable queue. |
| Image bounds | 1600-pixel long edge and 2 MiB encoded payload; validate small-text quality and model support. |
| Candidate output | At most 12 per image; explicitly indicate possible additional items. Request closer overlapping views when needed. |
| Request timeout | 20 seconds; preserve partial results and offer retry/resume. No automatic paid replay of uncertain dispatch. |
| Inactivity | Prompt around 30 seconds without useful activity; pause after another 15 seconds without response. Stillness alone is insufficient. |
| Structured capacity | Prototype at 500 candidates/run, 5,000 across runs and a measured 20 MiB compact-state budget. Pause intake at any limit without deleting earlier runs. |

A 500 ms capture scheduler is separate from completed identification throughput. Record sampled, skipped, dispatched and completed frames independently; never report capture FPS as identification FPS. Deduplication, preprocessing, provider limits, budget and latency govern dispatch. Keep bounded work and replace superseded pending frames rather than accumulate a backlog. If this loses meaningful shelf coverage or makes the requested scanning pace unusable, record an acceptance gap and tune on-device work, batching or bounded concurrency with measured privacy/cost limits; do not claim the target is met merely because a timer fired. No assumption of two paid cloud requests per second or higher spending is authorized. Accepted distinct products remain in the run.

### 8.2 Identity and formulation evidence

Detect multiple candidate packages with local observed text/barcodes and, when permitted, the vision provider. Treat output as identity claims to verify. The recognizer must not provide medical ratings, invented nutrients, certifications or inventory.

Prefer genuinely observed, normalized GTIN evidence. Otherwise resolve brand/name/flavor/formulation and market against supported catalog facts. Check barcode validity and provenance; a model-generated plausible number is insufficient. A shelf price tag may refer to the neighboring package. Packaging resemblance and self-reported model confidence cannot alone verify an exact variant.

Image models can struggle with small text, precise localization and counts; use confirmation and independent field checks rather than promising exhaustive shelf recognition. [OpenAI image guidance](https://developers.openai.com/api/docs/guides/images-vision)

After resolution, deduplicate by exact product-version key. Before resolution, use conservative run-local groups and allow splits when better evidence arrives. Perceptual hashes or similar names cannot permanently merge distinct formulations. Original/reduced-sugar variants remain separate. Different sizes merge only with supported formulation equivalence and compatible quantity basis, not just identical rounded nutrient numbers.

A label-facts gap produces Needs facts. Offer Nutrition Facts/ingredient recapture while paused; shelf-front claims cannot supply unprinted facts. Once a frame is released, later review uses compact observations or recapture. Do not secretly keep thumbnails for review convenience.

## 9. Recognition service contract

Propose a separately gated `POST /v1/shelf/identify`, or an equivalent typed operation in the existing relay after architecture review. Do not unlock unrelated personal/report POST routes. A client `privacyVerified` flag cannot enable processing.

| Request field | Purpose and limit |
|---|---|
| Schema version and request-scoped nonce | Compatibility/response correlation; never a persistent user/run ID. |
| Sanitized image, dimensions and MIME | One bounded image; check decoded dimensions/bytes, file signature and malformed input. |
| Category hint and market | Public task context; no profile, dietary choices, lipid values or GPS. |
| Bounded sanitized observed identifiers | Optional assistive evidence; never a raw OCR transcript. |

Response: schema version, bounded candidate array, observed brand/name/variant/size/identifier fields with missingness, safe supporting text, optional approximate region and readability/coverage warnings. Accept catalog IDs only after resolver verification. Precise moving AR labels are outside this requirement; approximate regions cannot imply reliable tracking.

Use existing application access, payload/concurrency limits, aggregate budget controls and schema validation. Preserve no consumer login; current tester access remains a separate development policy. Stable errors include `CAPTURE_NOT_ENABLED`, `PRIVACY_CHECK_FAILED`, `IMAGE_UNREADABLE`, `CATALOG_UNAVAILABLE`, `OUTPUT_INVALID`, `BUDGET_LIMIT`, `RATE_LIMITED` and `PROVIDER_UNAVAILABLE`.

No persistent conversation, provider file library, object-storage upload, payload trace, image cache or durable retry job is introduced. Pin provider configuration server-side only after shelf accuracy/cost evaluation. Existing spending caps are unchanged; this spec makes no inference calls. A scan does not authorize unlimited processing.

Verify actual endpoint/model/account retention before real uploads. `store: false` alone is not provider-wide non-retention; eligibility and image exceptions matter. If requirements cannot be met, keep uploads disabled and continue independent synthetic/local work. [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data)

## 10. Personalized ranking contract

Create a new local ranking service using reviewed real-food assessments and a versioned ranking policy. Existing synthetic assessment types and the public single-nutrient comparator must not be relabeled as disease-aware health scoring.

Proposed algorithm:

1. Restrict to products actually identified in this run and in the selected comparable category/form.
2. Require the evidence needed for each claimed assessment. Null is unknown, not zero; missing clinical context becomes Needs information.
3. Evaluate all selected conditions/restrictions. Exclude hard conflicts and required-but-unverified restrictions from the suitable list; explain them separately. Primary concern cannot hide a secondary-condition conflict.
4. Normalize to an evidenced common amount. Use mass/volume conversion only when supported and show typical serving separately. Do not substitute total for added sugars or invent absent carbohydrate, potassium or phosphorus values.
5. Candidate ordering for clinical/reference-case review: hard exclusions first; worst applicable condition category; primary concern's category; approved category-specific nutrient tradeoffs; stable product key as a final display tie-break. Do not publish arbitrary nutrient weights or thresholds from this proposal.
6. Return up to ten with absolute suitability, concise reasons, tradeoffs and source/rule/profile provenance. Where meaningful differences are unsupported, describe items as similarly suitable rather than implying exact medical superiority.

Step 5 is an engineering proposal, not approved medical scoring. Synthetic cases can test mechanics while real personalized rankings remain dependent on valid rules/evidence. Reviewer recruitment stays parallel to development.

Support all approved conditions and age/pregnancy contexts through applicable reviewed rules. Lipid entry remains optional. Use the existing latest-confirmed-test-date selection semantics, including conflicts; adding a panel does not require a changed category if the supported assessment is unchanged. Profile/lipid/rule edits rerank retained runs locally and show Updated for your current needs. Never trigger report reanalysis.

Add real-food assessment/fact schemas separately from existing fixture-specific `Product`/`Assessment`. Preserve synthetic tests and strict unknown-state handling. Extend nullable nutrients, ingredient evidence and certification records needed by the supported rule set. All user example categories, including cookies, require sourced recognition/comparison coverage before declaring full feature completion.

## 11. Storage, privacy and recovery

| Data | Handling |
|---|---|
| Raw frames/identity text blocks | Native working memory, promptly released; no logs. |
| Sanitized image | Bounded active-request lifetime; no durable cache. |
| Observations, timestamps, uncertainty and ranks | App-root memory for the live session only. |
| Profile/confirmed labs | Existing protected local storage; read locally, not attached to recognition. |
| Shelf export/restore | Must not exist; test archive schemas negatively. |
| Public facts/rules | Existing licensed storage independent of run membership/profile linkage. |
| Diagnostics | Aggregate timings/counts/error codes; no scan histories or model/image payloads. |

No durable schema migration for shelf runs is needed. Public evidence/nutrient schema extensions may need separate versioning, preserving existing records and missingness. No new shelf fields in `BetaSnapshot`, SQLCipher scan tables or export manifests.

Offline: display retained runs; pause cloud identification. Known local barcode/catalog matches may continue only with enough current cached evidence/rules. Do not queue photos for later upload. Reconnection uses explicit Resume and a fresh frame. Withdrawn/outdated rules mark ranks stale and withhold unsupported current claims without deleting the run.

Handle permission denial/revocation, mounting failure, glare, unreadable labels, redaction uncertainty, server limits, malformed output and lost connection with specific next actions. Errors never fabricate a rank. Global privacy cancellation invalidates pending image work in all runs; saved personal records remain unaffected.

At memory pressure, stop capture and release redundant imagery first. At the structured-data cap, preserve earlier runs and explain that no more items can be added in this app session. Never silently delete scans or write them to disk. OS termination still loses this intentionally transient data.

## 12. Concrete integration file plan

Paths are relative to the authoritative remote root. New names are proposals; inspect current files before implementation.

| Path | Work |
|---|---|
| `packages/core/src/shelfTypes.ts`, `shelfSession.ts` | Contracts, pure state machine, tokens, bounded archive/intake. |
| `packages/core/src/shelfIdentity.ts` | Candidate validation, exact identity and conservative formulation grouping. |
| `packages/core/src/personalizedAssessment.ts`, `shelfRanking.ts` | Real-food assessment contract, applicability, reviewed ranking and stable projection. |
| `packages/core/src/shelfClient.ts` | Recognition protocol, strict responses, cancellation. |
| `publicFood.ts`, `comparisonGroups.ts`, rule schemas | Missing-aware nutrient/evidence extensions and cookie/category mapping. |
| `apps/mobile/src/state/ShelfScanState.tsx` | App-root transient provider with read-only profile/rule subscription. |
| `apps/mobile/src/app/shelf.tsx`, `shelf-review.tsx`, `shelf-runs.tsx` | Scanner, deferred review and current-session runs. |
| `apps/mobile/src/ui/ShelfCamera.native.tsx`, `ShelfRankings.tsx` | Native wrapper, one-camera lease, accessible stable results. Web fallback is labeled fixture review. |
| `apps/mobile/modules/shelf-capture` | Swift view/controller/module, Kotlin parity, manifests and native tests. |
| Existing root layout, scan home and privacy lifecycle | Provider wiring, mode toggle, background camera stop and snapshot protection. |
| `apps/service/src/shelfRecognition.ts`, `shelfMatching.ts`, `server.ts` | Gated transient route, provider/resolver, bounds and no-content logging. |
| Core/service `test/shelf*.test.ts` | State/race/identity/ranking/protocol/retention tests. |
| Project plan and requirement traceability | Actual delivery evidence, outstanding gates and physical-device results. |

Audit every shelf save-like call. `useAppState.saveScan`, `LocalSession.commit`, persistent repositories and archive exports are prohibited for shelf runs. Reuse `selectCurrentPanel`, catalog clients, GTIN parsing and rule lifecycle only with their actual semantics; none alone proves clinical/identity correctness.

## 13. Work packages and sequence

| ID | Deliverable | Exit evidence / dependencies |
|---|---|---|
| SS-WP-01 | iPhone compatibility spike and final camera/transport ADR | Module compiles in actual app; physical iPhone preview/sample/lifecycle works with controlled fixtures. Confirm signing/build access early. Domain work can proceed while access is pending. |
| SS-WP-02 | Transient archive, controls and fixture screens | A then B then A; finish/resume/background semantics; zero history/export writes. |
| SS-WP-03 | Bounded native capture and privacy pipeline | Measured buffers, file audit, outbound privacy tests and interruption cases on iPhone. |
| SS-WP-04 | Multi-product recognition and resolution | Bounded candidate contract, exact variants, uncertain review, no invented facts; synthetic tests precede real uploads. |
| SS-WP-05 | Catalog and personalized ranking | Cookie coverage, needed facts/rules, comparable quantities and reviewed expected outcomes. |
| SS-WP-06 | Complete iPhone Shelf Scan integration | Signed phone build, controls, ranks, earlier runs and review; applicable real-data prerequisites satisfied. |
| SS-WP-07 | Android native parity | Same lifecycle/privacy/ranking contract and physical Android acceptance. |
| SS-WP-08 | Soak, accessibility, privacy and release review | Acceptance matrix, honest gate status, no unresolved critical defects or unsupported medical claims. |

Begin with an early iPhone native-build spike, not an Android-only implementation followed by an assumed iOS port. Clinical reviewer recruitment runs alongside engineering. iPhone-first testing does not remove Android from the complete release. Implementation subtasks map to existing WP-03, WP-07 and WP-08, with rule/data dependencies on WP-02/WP-10.

## 14. iPhone build and delivery

Use existing `development` and `testflight` EAS profiles as starting configuration. Swift compilation requires a supported macOS/Xcode build environment, either a Mac or EAS cloud macOS infrastructure. Linux iOS prebuild and JavaScript checks alone are not iOS compilation or camera validation. [EAS iOS builds](https://docs.expo.dev/build-reference/ios-builds/)

Verify actual Expo project, Apple team, signing/provisioning and bundle ID. Earlier records list access as incomplete; check current status instead of assuming. Do not request credentials in chat. Inspect build uploads for secrets/server databases/private fixtures and preserve accurate encryption declarations for existing SQLCipher storage.

Use a signed development build for the camera spike and a self-contained Release/TestFlight build for store testing. Development-device provisioning and Developer Mode have their own requirements; TestFlight is a different route. A custom Swift module needs a new native binary, not just an over-the-air JavaScript update or Expo Go. [Expo physical-device build guide](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/)

Record phone/OS, app build, native module/source revision, backend/rule versions, network and permissions. Test the user's physical iPhone before reporting readiness. Verify cellular/store-Wi-Fi access to the existing HTTPS endpoint; a local laptop tunnel is insufficient. Confirm current service configuration rather than publishing a new endpoint as part of this document.

Proposed support baseline uses the existing generated deployment target (reported as iOS 16.4 in the source audit); verify all selected APIs and modules at that minimum and on the user's actual OS. Do not require newer Vision APIs without availability guards or an explicit supported-OS decision. The user need not own a Mac if the chosen cloud build route is available, but physical iPhone testing remains indispensable.

This specification performs no cloud build/submission, account change, paid inference or budget increase. No physical-iPhone success is claimed.

## 15. Acceptance matrix

Every result must cite build/device/test evidence. Automated mechanics tests do not substitute for shelf recognition, clinical review or physical privacy testing.

| Test | Required outcome | Requirement |
|---|---|---|
| SS-T01 | Start/Pause/Resume/Finish reflect actual capture/dispatch; no capture after stop acknowledgement. | REQ-SHELF-04 |
| SS-T02 | Products accumulate across shelf regions; repeat sightings do not fill positions. | REQ-SHELF-01 |
| SS-T03 | Original/reduced-sugar stay separate within category; evidence-equivalent sizes group. | REQ-SHELF-01 |
| SS-T04 | Mixed categories do not share an unqualified ranking; correction preserves candidates. | REQ-SHELF-01 |
| SS-T05 | Primary/secondary conditions, diet restrictions and applicable lipid context follow reviewed expected cases. | REQ-SHELF-02 |
| SS-T06 | No panel works; latest confirmed test date governs; reranking causes zero report-analysis calls. | REQ-SHELF-02; REQ-LAB-06; REQ-LAB-08 |
| SS-T07 | Missing evidence, unknown required certification and hard conflicts are excluded/explained; fewer than ten is valid. | REQ-SHELF-02; REQ-SHELF-03 |
| SS-T08 | Ambiguous variant enters review without interruption; correction invalidates wrong prior assessment. | REQ-SHELF-03 |
| SS-T09 | Finish preserves A; start/finish B and revisit A; no persistent History entry. | REQ-SHELF-04; REQ-SHELF-05 |
| SS-T10 | Background/lock/call/control-center interruption stops camera natively and covers personalized UI; Resume required. | REQ-SHELF-04; REQ-SHELF-05 |
| SS-T11 | Force quit/relaunch and background termination yield no shelf runs; saved profile/lipid/ordinary history survives. | REQ-SHELF-05 |
| SS-T12 | Late A result never contaminates B; stale epoch, duplicate completion and cancelled work rejected. | REQ-SHELF-04; REQ-SHELF-05 |
| SS-T13 | SQLite, filesystem, restoration, exports, logs/network caches contain no shelf archive, ranks or retained images. | REQ-SHELF-05; REQ-PRIVACY-10 |
| SS-T14 | Seeded identifying names/SSNs/addresses and metadata absent from actual outbound bytes; uncertain redaction blocks. | REQ-PRIVACY-08 |
| SS-T15 | Dense/reflective/rotated/similar packages: measure false exact matches, misses and confirmation rate without exhaustive-coverage claims. | REQ-SHELF-01; REQ-SHELF-03 |
| SS-T16 | Offline/slow network/provider refusal/malformed output/timeout/budget limit preserve partial results and bounded work. | REQ-SHELF-02; REQ-SHELF-04 |
| SS-T17 | Memory pressure pauses additions without deleting A/B, unbounded queues or disk fallback. | REQ-SHELF-05 |
| SS-T18 | Permission denial/revocation, focus, lens, torch and orientation work on the user's actual iPhone. | REQ-SHELF-01; REQ-SHELF-04 |
| SS-T19 | VoiceOver/large text/contrast/touch targets and reading focus remain usable during rank updates. | REQ-UX-01; REQ-UX-02 |
| SS-T20 | Profile/rule changes rerank locally with provenance; withdrawn evidence does not produce current recommendations. | REQ-SHELF-02 |
| SS-T21 | Independently checked package identity/facts match; cookies have real sourced coverage. | REQ-SHELF-01; REQ-SHELF-02; REQ-DATA-01 |
| SS-T22 | Physical Android parity plus ordinary scan/report/history regressions pass. | REQ-SCOPE-01; REQ-SHELF-01–05 |
| SS-T23 | On the physical iPhone, verify the 2 images/second sampling target using monotonic capture timestamps; separately measure skipped/dispatched/completed identification frames and shelf coverage under normal and slow/pressure conditions. Never pass based on timer callbacks alone; no unbounded backlog. | REQ-SHELF-01; REQ-SHELF-04 |

Proposed performance targets on the user's iPhone: control feedback within 300 ms; local ranking within 250 ms for 500 candidates; first eligible online result within 15 seconds at p95 under recorded network/model conditions; 15-minute continuous-scan soak without crash or unbounded memory/thermal growth. Measure camera stop latency separately. Record battery/temperature trend and peak native/JS/process memory; tune limits using evidence. The 20-second timeout can exceed the first-result target and must be reconciled with actual provider behavior. Targets are not achieved results.

Build an independently labeled mixed-shelf evaluation set covering cereal, cheese and cookies, variants, lighting, distance and movement. Freeze its scope and document identity precision/recall, evidence coverage, restriction mistakes, ranking expected outcomes and latency. Final numerical recognition/ranking release thresholds remain Q-13 work; do not fabricate a pass target after seeing results. Zero known restriction violations in the acceptance set is necessary, not proof of zero real-world errors. Clinical cases require reviewed expected outcomes rather than output copied from the implementation.

## 16. Readiness and completion

No new product questionnaire is required. Engineering decisions still to verify: native buffer/transport path, recognition model/configuration, privacy-detector quality, source/category evidence, reviewed ranking policy, measured limits and iPhone signing/access. Record these against existing Q-05/Q-07–09/Q-12–14 and SS work packages.

Ready to implement: memory store, state machine, contracts, UI, synthetic fixtures and native compatibility work. Ready for real camera uploads: actual pre-LLM redaction, provider/hosting retention and device media lifecycle accepted. Ready for real personalized ranking: applicable approved rules and adequate fact/certification evidence. Ready to deliver: integrated feature passes physical iPhone acceptance and Android parity for the complete release.

Completion requires continuous shelf identification, personalized within-category ranking, deferred confirmation, all controls, previous-run access and termination cleanup working together. A fictional demo, Swift source file, TypeScript check, iOS prebuild, web preview or Android APK alone is insufficient.

## 17. References and change record

Platform/API sources linked in the relevant sections were checked October 14, 2026: Expo SDK57 Camera, Expo Modules, Expo iOS build/device guides, Apple AVFoundation/Vision/UIKit and official OpenAI image/data controls. These sources describe capabilities, not this project's entitlements or runtime acceptance. Most of this document is proposed application design. Repository evidence is identified in sections 1 and 3 and must be rechecked before coding.

| Version | Date | Change |
|---|---|---|
| 1.0 | 2026-10-14 | Detailed Shelf Scan plan: shared TypeScript, proposed Swift iPhone capture/preprocessing, Kotlin Android parity, transient sessions, bounded concurrency, privacy, real personalized ranking, integration files and physical-device acceptance. Documentation only. |
| 1.1 | 2026-10-14 | User selected 2 images/second (500 ms) sampling. Added physical-iPhone cadence and actual identification-throughput verification, preserving bounded processing and existing budget. Documentation only. |
