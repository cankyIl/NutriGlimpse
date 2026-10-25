# Implementation log

**Started:** October 5, 2026. **Authority:** v0.16 requirements and design baseline, plus the user's implementation instruction and aesthetic choices. **Readiness:** engineering start; synthetic data only.

## Approved visual direction

**Further result-layout refinement:** New results assume 1× portion with a small serving-basis note, replacing the portion selector. Previously saved snapshots retain their recorded basis. Nutrition and ingredients/evidence use compact text and spacing. Eligible alternatives appear in a horizontal row capped at three, with a visible next-card edge, scroll indicator and option counts when multiple are available. The existing sample catalog currently supplies one eligible swap for granola; do not duplicate it to fill the row.

**User refinement, October 5:** Header now reads “Your Health & Grocery Companion”; the introductory sentence is bold. Increase palette saturation with teal/mint, peach and golden accents. Show eligible alternatives immediately as illustrated product cards on the result screen, without an Explore Alternatives step. Cards show the rating, retailer context and comparison before any optional detail tap. Branding remains open.

The user chose 1A (warm and natural) and 2A (scan first). Use ivory backgrounds, forest/teal accents, dark text, rounded cards, quiet food illustrations and restrained motion. Keep a prominent scan action, store context, and access to receipts/reports. The palette is implemented as shared tokens. Text and icons accompany status colors. No animations are required for comprehension.

Branding is explicitly open for a separate discussion. No product name, logo, domain, trademark, or final app icon has been selected. The scaffold display name “Grocery App Preview” and bundled Expo icons are development placeholders, not branding decisions.

## First increment: delivered behavior

- npm workspace with `apps/mobile`, `apps/service` and `packages/core`.
- Expo Router tabs/stacks and shared React Native components; browser review surface runs the same mobile UI.
- Four invented products, including incomplete-label and generic fresh-food cases. Product selection is a synthetic replacement for capture, not working camera recognition.
- Confirmation → result → portion controls → expanded ingredients/evidence → alternatives → save/reopen history.
- Explicit conflict/unknown precedence; unverified required restrictions exclude alternatives; additional unreviewed conditions and pregnancy uncertainty withhold fixture ratings. No clinical thresholds have been implemented.
- Same-purpose synthetic swap with an equivalent-mass comparison; retailer/radius controls, with no invented branch stock or distance claims.
- Editable fictional needs covering all eight condition selections, primary concern, prevention/management intent, independent dietary choices, age and pregnancy context.
- Session-only history preserves original product, assessment and profile snapshots. No browser storage or personal-data uploads.
- Lipid date-selection/retry decision helpers with tests; these do not implement the complete report workflow or concurrency protocol.
- Local Node HTTP skeleton exposes public fixtures and health/readiness only. All POST requests fail closed without reading/echoing bodies. There is no account/profile storage route. This is not a production gateway.

## Engineering decisions and evidence

| Area | Selected for this increment | Limits / next evidence |
|---|---|---|
| ADR-01 | Expo 57.0.26, React Native 0.86.3, React 19.2.3, TypeScript 6.0.3, Expo Router 57.0.24 | Lockfile records exact graph. JavaScript export succeeds for Android/iOS/web; native compilation and device tests pending. |
| Workspace | npm workspaces, Node 24.15.0/npm 11.12.1 detected | Original documentation was untracked at entry; preserved without committing. |
| Navigation | Expo Router, required by generated `apps/mobile/AGENTS.md` | Actual OS back gestures, screen readers and large text still require devices. |
| Private storage | Contract defined; SQLCipher plugin enabled; SecureStore installed; Android allowBackup=false configured | Preview deliberately uses memory. No encrypted repository, migration, iOS backup-exclusion or key lifecycle is yet implemented/verified. Do not enter real health data. |
| Backend | Minimal Node HTTP development skeleton | Fastify remains a production candidate. No hosting, provider integration, auth/abuse controls or operational persistence selected. |
| Clinical engine | Explicit `assessSample` fixture state logic, not clinical rules | A successful software test does not validate food advice. All real rule packs/review remain Q-07. |
| Native build path | Expo development builds required for SQLCipher | No Java/adb toolchain detected. Use configured EAS builds when build access/signing is established; alternatively macOS/Xcode for local iOS work. No EAS account, paid build or credentials configured. Physical phones still required. |

Verified official references on October 5, 2026: [Expo SDK 57 compatibility](https://docs.expo.dev/versions/v57.0.0/), [Router installation](https://docs.expo.dev/router/installation/), [Router layouts](https://docs.expo.dev/router/basics/navigation-layouts/), [SQLCipher configuration](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/), [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/). The SDK table lists Android 7+ and iOS 16.4+ support; this does not select the release device matrix or prove native compatibility of this app. The versioned SecureStore web page failed to load; latest documentation plus installed package types were available, but storage implementation was not attempted.

## Verification

- `npm.cmd run check`: TypeScript and Expo ESLint pass; 12 tests pass (11 domain cases and one service contract case).
- `npx.cmd expo install --check`: packages match Expo's SDK recommendations.
- `npx.cmd expo-doctor`: 21/21 checks passed.
- Native peer resolution: the initial npm auto-installed Reanimated 4.7.1 / Worklets 0.13.0 despite Expo core's narrower compatibility. Expo recommends 4.5.1 / 0.10.1 for this SDK. Pinned both at workspace root and mobile, with overrides to prevent duplicate native versions; `npm ls react-native-worklets react-native-reanimated` now passes with one version of each. Root dev dependencies are resolution anchors, not service dependencies.
- `npx.cmd expo export --platform all`: web JavaScript and Android/iOS Hermes bundles exported. This is not an APK/IPA build or a physical-device result.
- Browser walkthrough: confirmation, Limit result, evidence expansion, saving/history, equivalent-mass swap, halal Unverified exclusion, no-match alternatives, and incomplete-label unknown fields verified.
- Phone-sized 390×844 review found clipped tab labels; explicit tab height and safe-area spacing corrected it. Accessible checkbox state was missing on web; explicit `aria-checked` added and observed as true. Decorative icons were removed from accessibility output.
- At 320 px width, the decorative hero package crowded text; it is hidden below 360 px. The 320 px page has no horizontal overflow. These browser checks do not replace native accessibility tests.
- `npm audit`: 29 findings (19 high, 10 moderate) in the initial Expo dependency graph, including propagated findings. Underlying advisories include braces GHSA-vfj7-8cjw-p6xm, node-forge GHSA-86w9-cpqp-85rv, decode-uri-component GHSA-vcc3-ghjq-m6fr and uuid GHSA-w5hq-g745-h8pq. Some suggested npm “fixes” downgrade Expo/React Native across major versions. No forced downgrade applied. Triage/compatible remediation remains WP-08 work; this preview is not security-cleared for release.

No physical-device, OCR accuracy, source licensing, actual provider retention, native encryption, backup exclusion, export/restore or clinical validation is claimed.

## Complete release tracking

| Package | State after first increment | Remaining work |
|---|---|---|
| WP-00 | In progress | Source/retention feasibility, build access and remaining dependency dispositions. |
| WP-01 | In progress | Native development builds, encrypted repository/migrations/key lifecycle, redaction, gateway and configuration. |
| WP-02 | Not implemented | Licensed adapters, retailer evidence, source registry, signed clinical rule pipeline. |
| WP-03 | Synthetic presentation slice | Real photo/barcode/label capture, recognition, variant conflict handling, complete fresh-food flow, reviewed assessment engine. |
| WP-04 | Synthetic presentation slice | Foreground location, real branch selection, evidence-backed catalog, distance ordering/directions and full substitution ranking. |
| WP-05 | Entry outline only | Receipt extraction/correction, unresolved lines and basket/swap analysis. |
| WP-06 | Entry outline and pure helper tests | All report capture/extraction/confirmation/interpretation screens and integrations; redaction, compact storage, deduplication and retry locks. |
| WP-07 | Initial visual/navigation system | Complete onboarding, all workflows, native persistence, encrypted export/restore, offline/error handling and device accessibility. |
| WP-08 | Initial automated checks | Full security/privacy evaluation, dependency remediation, device evidence and complete release gates. |
| WP-09 | Later website, unchanged scope | Separate request after mobile design stabilizes. Browser preview is not this deliverable. |
| WP-10 | Pending; nonblocking engineering | Prepare reviewer packet/review process. No external reviewer contacted. |

## Next implementation sequence

1. Validate native development builds and privacy-capable local storage/OCR/PDF libraries. Implement encryption, migrations, backup exclusions and orphan-media cleanup with failure tests before enabling real input.
2. Complete capture/label recovery and onboarding against synthetic adapters; add receipt/report review UI and state-machine tests.
3. Verify product/retailer rights and provider retention before live connectors. Q-05/Q-14 remain unselected; no content-bearing metadata retention is implicitly accepted.
4. Develop source-backed draft rules and reviewer materials alongside implementation. Integrate approved rules and complete all mobile release gates.

User decisions remain in requirements section 9. This log records execution evidence and work-package state, not a competing product decision register.

## Beta 0 engineering increment — October 5, 2026

This section supersedes the first-increment statuses above where noted. Beta 0 is **in development**, not ready for the two testers. The full requirements remain in scope.

User confirmed one iPhone and one Android tester. Apple Developer enrollment and an OpenAI API project do not exist yet; the user will obtain them when needed. No account creation, purchase, signing, upload or tester invitation was attempted. Branding remains a separate open topic. The visual baseline is now documented in design sections 5.1–5.2; detailed aesthetics review is deferred to the phone-ready two-tester phase.

Implemented in this increment:

- WP-01/07: validated version-2 compact snapshot, serialized writes, native SQLCipher repository, generated random device key stored with device-only SecureStore access, missing-key failure protection, schema-version guard and transactional writes. Browser continues using memory. Android backup exclusion XML and iOS AppDelegate backup-exclusion plugin added. These are code integrations, not verified device guarantees.
- WP-05: working synthetic receipt review, product-match correction, line classification and purchase-quantity editing, unresolved/excluded coverage, immediate alternatives, save/reopen/delete through history. Weighted purchases remain separate from assumed consumption portions. OCR and real receipt capture remain unavailable.
- WP-06: optional synthetic report review, value/date confirmation, compact save, saved-result reuse, report history/deletion, latest-test-date selection. Local simulated completion clearly identifies that no clinical interpretation or OpenAI call occurs. Pending local-save result can be retried without recalculation. Recovery converts persisted in-flight states to outcome-unknown. Actual provider concurrency, retry/idempotency, extraction and redaction remain unimplemented; pure helpers are not evidence of a working remote coordinator.
- WP-07: passphrase-protected AES-256-GCM archive with fixed-cost scrypt, fresh salt/nonce, bounded/strict schema validation and preview-before-replace restore. Native file/share controls are connected; browser file actions disabled. Export scratch files are removed on normal completion/failure and before the next export. Crash-orphan startup cleanup and native file-provider interoperability remain verification work. No plaintext backup file is written by the implementation.
- EAS development/internal APK/iOS simulator profiles added, without creating an EAS project. App identifiers are provisional engineering identifiers, not final branding.

Verification:

- TypeScript and lint passed; 17 automated tests passed, including authenticated archive roundtrip, wrong passphrase, altered nonce/ciphertext, unsupported schema/KDF rejection, duplicate IDs, incomplete successful report rejection, interrupted report recovery and receipt coverage.
- All-platform Expo export passed for web and iOS/Android Hermes bundles. This does not produce installable APK/IPA packages.
- Android prebuild succeeded on Windows and its generated manifest references both backup exclusion rules. Windows skipped iOS project generation; the Swift insertion has not been generated/compiled here. Custom Android backup rules include shared preferences, including SecureStore; its automatic rule plugin is disabled to avoid conflicting rules.
- Browser report confirmation, completion, history and reopening of the saved result verified. Native encrypted persistence, share-sheet restore and physical-device tests are still pending.
- Dependency audit after added Expo modules: 30 findings (19 high, 11 moderate), including propagated findings. Compatible remediation remains a release gate.

Remaining engineering is substantive: full onboarding, real capture/OCR/PDF and redaction, licensed product/store connectors, reviewed condition rules, live OpenAI processing and retention validation, provider failure/retry coordination, complete unit/comparator/report correction, source-backed basket analysis, native privacy lifecycle, device accessibility and complete release tests. This increment must not be described as the full Beta 0 release.

## Working project plan

The maintained task list, execution order and dependency register are in [ImplementationProjectPlanDocument](ImplementationProjectPlanDocument.md). Update the plan as work progresses and keep this log for detailed implementation and verification evidence. New onboarding, session coordinator and privacy-lifecycle code is in progress; earlier passing checks do not constitute verification of these new changes.


## Beta 0 continuation — local workflows and integration boundary

October 5, 2026. Updated the maintained project plan and added `06-beta0-integration-handoff.md` with the native build failure, source adoption requirements, clinical-review worksheet, security disposition and two-phone checklist.

Implemented/verified this continuation:

- First-run fictional-profile setup, age validation, explicit pregnancy context and atomic profile editing. Browser rejects age 20 and accepts 21; current restarted build completes setup and reaches home.
- Serialized LocalSession writes and ReportCoordinator with in-flight suppression, explicit retry, cancellation/timeout, pending-save-first recovery and guards against delayed writes after deletion/restore. Also covered failed persistence of the interrupted state so a report does not remain permanently stuck in-flight.
- Report comparison/unit correction, omission of missing fields and printed range/flag storage/display. Source flags are not personal targets. Clinical interpretation remains disabled.
- Native barcode camera with request-on-intent permissions, manual fallback and unmount/background cleanup. Barcode checks validate GTIN check digits. Browser confirms that a valid code does not establish identity without a catalog. Camera behavior is not yet device-verified.
- Receipt overview, duplicate indication/removal, purchase-unit correction and explicit selection of receipt versus current-shopping retailer. These operate on synthetic receipts.
- Startup export-scratch cleanup and native screenshot/app-switcher protection code; still pending native verification.
- Source/rule schemas and eligibility/withdrawal tests, strict bounded extraction parser, bounded OFF catalog adapter tested with injected synthetic responses, and geographic distance/radius/directions helpers. These are integration components; no live clinical pack, provider catalog, or branch service is enabled.

Final checks: `npm.cmd run check` passes TypeScript, lint without warnings, and 31 automated tests. Final all-platform Expo export passes for web, Android and iOS after the latest changes. A preceding full test run had one unexplained service-test process failure; its isolated rerun and the final full check passed. No defect is claimed fixed solely by rerunning; watch for recurrence in CI.

Native Android build was actually attempted with Gradle and fails before compilation because Java/JAVA_HOME is absent. No native APK/IPA was produced. This is a build-provisioning dependency, not an Apple-account requirement for Android. Signing/build-service access and physical phone testing are still needed on the applicable platforms. Native OCR/PDF/redaction remains unfinished and requires native integration/validation; do not count it as complete because its contracts exist.

Dependency audit still has 30 findings (19 high, 11 moderate); no forced framework downgrade was applied. UUID override attempts did not replace the nested vulnerable dependency, so the ineffective override/direct dependency was removed. See the handoff for advisory links and residual work. A catalog adapter is not evidence of adequate retailer coverage or legal/source adoption approval.

The complete Beta 0 release is not finished. Remaining implementation and release requirements stay unchecked in the project plan. No API key, enrollment, paid service, reviewer outreach or tester invitation was created/performed.

## October 6, 2026 — Remote development migration

Moved the authoritative workspace to /path/to/NutriGlimpse/ on project-server (project-server, user developer). Transferred source, documentation, Git metadata and audit artifacts; verified 442 file hashes with zero mismatches before remote changes. Preserved the laptop recovery copy; regenerated Linux dependencies and exports. Portable Node 24.15.0, Temurin Java 17.0.20.1 and Android SDK installed with vendor checksum verification; native Gradle compilation is in progress.

Remote TypeScript/lint/31 tests pass; web/iOS/Android JavaScript exports pass. Browser onboarding and home verified at http://127.0.0.1:18081/. Persistent preview/backend user services enabled; service health checked remotely and through the laptop SSH tunnel. Existing portfolio public and local endpoints return HTTP 200; existing services unchanged. See 07-remote-development.md for inventory, operation and remaining administrator/macOS dependencies.

### Android build result — October 6, 2026

Native ARM64 development build passed on project-server: BUILD SUCCESSFUL in 8m 13s, 664 tasks. APK: /path/to/NutriGlimpse/apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk (approximately 97 MB). APK signature verified using v2. SHA-256: dd4478eb02083aeceb03873c7724e04adac8ba5d96d634fea07eff25f3367f97. This supersedes the earlier missing-Java/no-APK checkpoint. It is a debug development-client build requiring Metro, not the standalone beta release. No physical phone testing or native privacy acceptance has been performed.

## October 6, 2026 — Receipt completion and standalone preview preparation

Implemented receipt summaries that count individual matched outcomes without inventing an overall health score. Unknown/stale product identifiers remain unresolved; refunds do not offset unrelated purchases. Duplicate detection compares normalized text, classification, product, quantity and unit, preserving both lines until explicit correction. Removal offers Undo. Quantity draft text supports decimals/comma input and invalid quantities disable saving. Purchase weights do not scale consumption assumptions. Receipt schema rejects duplicate line IDs.

Remote npm run check passes TypeScript, lint and 37 tests (six new receipt cases). Browser verification passed: zero disables Save; 1.25 can be entered; remove/undo restores the line; saving and opening from History preserves 1.25. Native runtime checks remain pending.

Added an internal standalone Android build script with a project-specific signing key, bundled-JavaScript validation and manifest gates. Fixed signing setup to run during Android DSL finalization, avoiding composite-build and finalized-configuration errors. Initial release build succeeded; manifest inspection found inherited broad-storage/overlay permissions. App config now blocks these, and the final rebuild verifies their absence. Secrets stay in restricted .tools/signing files and are not part of source/artifacts. Build logs: artifacts/remote/standalone-build-final.log.

References used: Expo SDK 57 reference, Expo permissions guide (android.blockedPermissions), Android app-signing documentation, Gradle initialization scripts. No new runtime npm dependency was added. Existing dependency advisories remain unresolved.

Final standalone preview rebuild passed in 2m 55s. Artifact SHA-256: 71a206a90a4c82d66d254e351a413c24a1b13a68e5ae747778d03cd05d6d24cd. Signature verified with CN=Congress App Internal Preview; compiled manifest gates and bundled JavaScript check passed. Final npm run check: TypeScript/lint/37 tests pass. No physical phone validation.

## Native input and service checkpoint — October 6

See 09-native-input-checkpoint.md. Android module and standalone APK compile; Swift source awaits macOS. TypeScript/lint/48 tests pass. Backend controls deployed; health and portfolio HTTP 200 verified. Native/device privacy acceptance remains open.

## Signed rules — October 6, 2026

Replaced signatureVerified caller flags with strict pinned-key Ed25519 verification, immutable process-local handles, expiry rechecks and explicit cached-trust invalidation. Added seven Node-signature interoperability/adversarial tests; all 55 tests, TypeScript and lint pass. See 10-signed-rule-checkpoint.md for implementation and remaining persistent trust-lifecycle work. Clinical publication remains disabled.


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

Evening checkpoint: source/APK provenance verified, congress-preview and congress-backend active, backend synthetic-only, portfolio HTTP 200. Remaining engineering and external dependencies recorded in docs/12-beta0-evening-handoff.md. No new development is authorized after the 8 pm cutoff.

## Continued implementation after deadline removal

See 13-beta0-resumed-implementation.md and 14-draft-evidence-review-cases.md. 145 application tests, TypeScript/lint, tooling and provenance checks pass; final Android package cf954b14497acb5449358c7487171b53b08ff6217c570f039f63300dce5abca5. Label/receipt/report intake and correction, same-date resolution, fresh preparation, manual area and locked-location browser flows verified. Personal processing remains disabled; physical phones/iOS/provider/clinical/source acceptance remains open.


## Android emulator checkpoint — October 7, 2026 (EDT)

The administrator's kvm-group change is verified in a fresh SSH session. KVM is usable; no further administrator action is required for emulator testing. API 36 Google APIs x86_64 / Pixel 6 profile boots on project-server. Emulator 37.2.12 and all added runtime libraries are project-local. Official Ubuntu runtime packages were downloaded using isolated apt state; the pre-existing malformed NVIDIA apt-list entry was not modified. No portfolio service changes or server restart.

Native testing exposed and fixed two encrypted-storage startup defects: Android's SQLite absolute directory path needed a file URI for the File existence check; separate transaction connections needed their own SQLCipher key before BEGIN. Startup errors now identify a non-sensitive initialization stage.

Verified on the emulator: release APK installation/startup, fictional onboarding, persistence across force-stop/relaunch, navigation, native fictional image and two-page PDF OCR/reconstruction/cleanup, rejection of three invalid input types, report review/save/reopen from history after restart, product-result save, and personal-input gate. Image diagnostic: 8 lines read / 4 excluded / 4 retained. PDF diagnostic: 10 / 6 / 4. Private temporary directory empty afterward; database header not plaintext SQLite; SECURE window flag present. These checks do not certify physical-device security or general real-document sanitization.

**New independent engineering uncovered:** native receipt OCR dropped item rows (0 of 0 food lines), so receipt recognition acceptance FAILED. Product OCR left sugars unknown; complete fixture extraction remains pending. Do not describe all native workflows as passed. Root cause analysis and fixes for OCR layout/fixture matching remain work that can proceed without accounts or phones.

Verification: npm run check passed (typecheck, lint, 145 application tests, 3 tooling regression tests). Both x86_64 emulator and ARM64 phone release APKs rebuilt with storage fixes; source/artifact provenance verified. Physical-device verification remains false; personal processing remains disabled. Evidence: artifacts/remote/emulator-verification.json, emulator-*-pass.xml, emulator-report-restart.xml, emulator-storage-check.json, emulator-window-flags.txt, emulator-fix-check.log, emulator-fix-arm64-build.log. Emulator build and APK are under artifacts/emulator; phone build is under artifacts/android.

See docs/15-android-emulator-checkpoint.md for restart instructions and limits.


## OpenAI key installed — October 8, 2026

User confirmed key entry. Verified on project-server: nonempty regular credential file at .tools/openai/api-key, owned by developer, file mode 0600 and directory mode 0700; neither path is a symbolic link. Credential contents were not displayed or read during verification. API authentication, model access and billing remain unverified. User has deferred choosing a budget, so no paid API requests were made. Backend live wiring and personal-data processing remain disabled. Next: budget/billing decision, then a bounded fictional-data API validation.


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


## Public catalog backend — October 13, 2026
Persistent SQLite/WAL catalog, source registry, validated transactional ingestion, USDA detail adapter, cached read APIs and online backup are implemented. Live USDA Foundation record 2768188 imported using official demo access; no personal data or OpenAI calls. 154 application tests, three tooling tests, typecheck/lint pass. Backup integrity and service restart retrieval verified; portfolio healthy. Source provenance, 100 g basis, unknown fields and unverified certification/stock are preserved. Mobile real-data integration, broad coverage/refresh, HTTPS/tester access, retailer/certification/clinical sources and operational hardening remain unfinished. See docs/19-public-catalog-backend.md for sources, schema, endpoints, evidence and dependencies.


## Six-step execution: secure hostname and mobile catalog — October 13, 2026
User approved grocery.serveforwad.com. Cloudflare route uses existing portfolio-dashboard tunnel → HTTP 127.0.0.1:3002; owner dashboard action pending. See docs/20-cloudflare-beta-connection.md for exact instructions.
- [implemented; native acceptance in progress] Real USDA food-facts screen, explicit name/barcode lookup, source/100g/missing-value notices; health guidance remains fictional.
- [implemented; native acceptance in progress] Secure tester key storage and encrypted bounded 100-food offline cache; schema migration 2→3, source age warnings, delete-cache action, cache excluded from personal exports.
- [done; external route pending] Dedicated authenticated beta backend on loopback port 3002; four private tester invitations; no key embedded in app or printed. Existing backend/portfolio preserved.
- [pending] Packaged-product catalog expansion, native cache/network acceptance, external HTTPS checks, iOS build/access, physical tester evidence and demo rehearsal.
Access checkpoint:157 app tests+3 tooling pass, authenticated catalog200, unauthenticated HTTP 401, portfolio curl HTTP 200. Mobile-specific checks/build currently in progress. No paid OpenAI calls; personal uploads remain disabled. Do not claim all six steps complete.


## Current checkpoint — October 13, 2026 (New York)

Public beta backend: **https://grocery.serveforwad.com**, on the existing portfolio-dashboard Cloudflare Tunnel. Dashboard route and DNS creation are confirmed. Authenticated HTTPS catalog and cached fictional examples pass; unauthenticated requests receive HTTP 401. Existing portfolio returns HTTP 200.

- **Implemented and emulator-verified:** real USDA name/barcode facts, explicit source/100g/missing-value display, multiple-match review, secure tester access, encrypted bounded 100-food offline saves, restart persistence, deletion and reset clearing tester access.
- Catalog contains **16 foods, including seven branded barcode records**. Coverage is deliberately limited; package identity, current ingredients, availability and certification must not be inferred.
- **160 application tests and three tooling checks pass.** Final ARM64 and x86_64 release builds have matching current-source fingerprints. Android emulator tested actual HTTPS lookup, offline restart, deletion, barcode identity and authenticated fictional receipt review. Physical-device verification and iOS compilation remain false.
- Public server reuses previously validated fictional AI results and cannot generate new paid responses. Personal uploads remain disabled. No new paid OpenAI calls; USD 2 total testing authorization remains unchanged.
- **Next external dependencies:** secure Expo login on project-server (CLI currently not logged in), confirmation of Apple activation/App Store Connect access, then physical iPhone/TestFlight acceptance and tester feedback. Real personal-data rollout separately needs privacy/provider/clinical verification.
- Public DNS resolves through Cloudflare 1.1.1.1. Initial server checks used a DNS override because its default resolver cached the earlier miss; emulator used explicit public DNS. These are not physical cellular-network tests.
- Detailed evidence and demo path: [catalog/network checkpoint](21-beta-catalog-network-checkpoint.md). Cloudflare instructions: [connection guide](20-cloudflare-beta-connection.md).

### Status of the six requested steps
1. Real food facts: implemented; Android emulator acceptance passed; iPhone acceptance pending.
2. Offline phone caching: implemented; Android emulator restart/deletion passed; iPhone acceptance pending.
3. Barcode coverage: initial seven branded records imported and exact lookup verified; broader coverage requires representative packages and continued curation.
4. Secure remote access: implemented and public HTTPS verified; tester keys are private; real home/cellular tester checks pending.
5. iPhone build/testing: project configuration prepared; Expo login, Apple activation/signing and physical testing remain external dependencies.
6. Competition refinement: demonstration path updated for real food facts, offline use and clearly labelled fictional health examples; student recording and feedback from testers remain pending.

Earlier dated entries below are historical and do not supersede this checkpoint.



## October 13: automatic store detection
Implemented public OSM directory import/serving, phone-only foreground location matching, manual/denied/offline paths, SQLCipher v4 caching, reset cache clearing, attribution and retailer inventory execution plan. 164 application and three tooling tests pass, plus ARM64/x86_64 release builds and emulator acceptance. Linux iOS prebuild passed; no iOS compilation or physical GPS claims. Full evidence and limitations: [checkpoint 22](22-store-location-and-inventory.md). No new paid AI calls; portfolio preserved.


## October 13: real USDA catalog alternatives
Expanded 16 → 175 foods; 160 qualified category records from 687 staged source IDs. Connected cached category API, local metric ranking/restriction filtering, immediate scrollable alternatives, explicit trade-offs and saved offline comparisons. 169 app + 3 tooling checks and final native Android acceptance pass. No paid AI or personal upload; stock unknown. See [checkpoint 23](23-real-catalog-alternatives.md).


## October 14 — expanded grocery catalog

Delivered 2,898 foods / 706 eligible comparisons / 20 categories with brand-name search, conservative source-category validation and bounded larger candidate lists. Validated 4,299 staged USDA records; accepted 2,883. Revalidated the prior 160 comparisons. 172 app + 3 tooling tests and live HTTPS/mobile-parser/native Android new-category/offline checks passed. No inventory or personal processing was enabled. See docs/24-expanded-grocery-catalog.md.


## October 14 — section 11 completion groundwork

Implemented public evidence validation/import/history, independent rights/scope/authority/conflict gates, a seven-chain acceptance evaluator with 350 unfilled slots, bounded USDA batch refresh, OFF staging normalization, places category expansion and full source/clinical-review registers. 182 application + 3 tooling tests/typecheck/lint pass; live two-record USDA batch verified. Two map refresh attempts timed out; old data preserved. No new provider, clinical, certification or stock claim enabled. See docs/25-section11-sources-and-dependencies.md.

## October 14 — Open Food Facts live integration
User approved shared catalog redistribution and contact maintainer@example.invalid. OFF validated barcode lookup/cache, public ODbL export/credits and phone attribution implemented. Catalog 2,903 source records (five OFF). 190 application + three tooling checks, typecheck/lint, live staging/production/uncached HTTPS lookup, public download/protected APIs, portfolio health and signed ARM64 build verified. Physical devices/iPhone not tested in this increment. Form submission remains with user; exact entries and source/build evidence in [26-open-food-facts-setup.md](26-open-food-facts-setup.md). Shelf Scan plan and all unrelated gates preserved.


## October 14 — OFF bulk expansion
User confirmed usage form submitted. Official pinned export: 10,000 complete candidates before host HTTP 429; partial scan preserved and declared. 1,774 new validated records; OFF 1,779; combined 4,677 source records / 4,601 barcodes. Four-chain OFF brand matches: Wegmans 65, Walmart 314, Price Chopper 78, Whole Foods 244; no stock claims. 89 OFF comparison-ready records across 12 categories. 197 application + three tooling checks, typecheck/lint, live mobile-parser searches, comparisons/restriction suppression, public export/privacy and portfolio health verified. Client unchanged and existing ARM64 provenance verified. See [27-open-food-facts-expansion.md](27-open-food-facts-expansion.md); resume export acquisition/real package acceptance later.



## October 14 comparison category checkpoint

OFF comparison eligibility increased 89 → 220; 33 shared groups, 27 populated OFF groups. See [category expansion](28-comparison-category-expansion.md) and latest project-plan checkpoint. Source timestamps and all nutrition/dietary checks preserved. Production endpoint checks and 200 application + three tooling tests passed. Updated client required; physical phone acceptance remains pending.


## U.S. shelf comparison checkpoint — October 14

OFF eligibility now 339; total eligible distinct barcodes 1,036 with USDA. No USDA match required. See docs/29-us-shelf-comparison-expansion.md and latest project-plan checkpoint for reasons, tests, limits and remaining work. 202 application + three tooling tests and live checks passed. Nutrition/dietary gates unchanged; physical phone validation pending.


## October 14 — pretrained YOLOE feasibility and iPhone diagnostic

Tested original pretrained YOLOE on four licensed shelf photographs without training or paid calls. Warm server inference is fast, but package detection quality did not pass: missed items, merged packages, and false/display-carton boxes remain. A bounded shelf-specific comparison improved cereal/cookie separation and is not bundled. Correction from closer October 14 visual review: its 640-pixel cheese result found both clear front tubs plus a false price sign; the earlier broad cheese-failure interpretation was unsupported. Its 1280-pixel cheese trial still found none. See [evaluation results](30-yoloe-shelf-evaluation.md).

Exported and hash-verified an 18.2 MiB Core ML YOLOE model. Added a native iPhone camera diagnostic, two samples per second with one inference in flight, 30-second/five-minute runs, completed FPS/latency/thermal summaries, and memory-only previous runs. The screen is reachable without a health profile. Source checks, 202 application tests, three tooling tests, iOS prebuild and iOS JavaScript export passed. These do not compile Swift or verify phone performance.

Prepared [Mac installation instructions](28-iphone-shelf-test-installation.md) and a foreground helper for Xcode Personal Team testing. Paid Apple membership is pending; the user has a Mac but Xcode is not installed. Physical iPhone compilation, installation, Core ML execution, package accuracy, and sustained two-frame-per-second acceptance remain pending. Full ranked Shelf Scan is not implemented by this diagnostic. Existing health/privacy gates remain unchanged.


## October 14 guidance acquisition checkpoint

All four requested guidance families collected; 26 structured entries, two serving tables and eight hashed source snapshots. See [guidance source library](31-guidance-source-library.md). Seven data-validation tests passed. Status is reference-library-collected-not-enabled; educational UI integration and personalized clinical review remain separate. Existing draft clinical rules were not approved or activated.


## October 14: diabetes education integration
Eight cited educational cards and comparison explanations implemented; personal medical rules remain disabled. Full check: 205 application + three tooling tests, typecheck/lint pass. Physical/visual acceptance pending; automatic approval review blocked interactive browser commands. See docs/32-diabetes-nutrition-education.md and the latest project-plan checkpoint.

Android compilation and APK v2 signature verification passed. Publication was correctly blocked because concurrent Shelf Scan Swift source files changed during the build; no new distributable APK or physical-device acceptance is claimed. Rebuild from stable sources before distribution.

## October 14 — authorized detector recovery and comparison handoff

Completed the authorized no-training recovery round. The frozen 51-front comparison found YOLOE baseline 41 correct/7 incorrect/10 missed; OCR-selected crop recovery 42/26/9, so the recovery union is rejected. ShelfSet and SKU-110K YOLO11s each matched 46/51 with two and five incorrect boxes respectively. SKU passed the small predeclared gate, but its earlier angled-cereal 11/28 selected-target matches versus ShelfSet 26/28 prevent a universal-winner claim. Both fail a severely oblique biscuit stress case. Advance both explicit diagnostic choices; prospective category routing still requires fresh validation. See [the complete evidence](31-shelf-recovery-and-detector-decision.md).

Bundled corrected Core ML NMS exports with one product class and 79 zero padding scores; added explicit gray-114 letterboxing and inverse mapping. Added model selection, stale-availability protection, stop acknowledgement, memory-only module-level completion delivery, native inactive-state capture stop, and Release-only timing passes. Model-specific fingerprints and prior run summaries are preserved. No photos/network requests in this diagnostic.

Checks: typecheck, lint, 205 application tests, 3 tooling tests, 5 evaluator tests, exact four-score reproduction, model hashes, iOS prebuild and iOS JavaScript export passed. Read-only audit findings fixed. Portable 32 geometry + 5 pixel fixtures prepared; actual Swift fixtures, Swift compilation, Core ML parity and physical iPhone 2 Hz remain unverified. The new Mac comparison bundle replaces the earlier YOLOE-only bundle; guide28 retains Personal Team signing while paid enrollment is pending. Mac/Xcode access is still external. No training, paid calls or cloud builds. Full ranked Shelf Scan remains unfinished.


## October 14: ADA Superstar Foods follow-up
Re-read the official guide; added whole-grain label inspection, budget shopping and fish-preparation context. Ten educational cards now available, with grain-label context in three curated cereal categories. No nutrient inference or medical rule activation. See docs/32-diabetes-nutrition-education.md.


## October 14: blood-pressure and strict gluten-free label checks
Catalog label-review modes implemented with reference %DV, conservative ingredient triage and strict exclusions. No FDA certification, Safe verdict or automatic mineral benefit. Clinical flags remain disabled. Typechecks, changed-file lint, 259 application and three tooling tests, web export pass. Full check blocked by unrelated concurrent shelf.tsx lint errors; no native/physical acceptance claim. Details: docs/34-blood-pressure-gluten-label-checks.md.


## October 14 — Shelf Scan identification and local comparison integration

Integrated the Swift local barcode/OCR reader with memory-only multi-run Shelf Scan, exact-variant confirmation, category catalog matching and current-profile nutrient comparisons. Start/Pause/Resume/Finish, previous runs, manual observed-label fallback, confirmed-item removal, visible guidance sources and explicit missing-evidence states are connected. Reader and camera ownership are process-wide; stale callbacks and view replacement were reviewed. No photos, shelf history or health context are uploaded/persisted by this flow.

Full checks passed: 260 application tests, three tooling tests, typecheck, lint, iOS prebuild, iOS JavaScript export and helper shell syntax. Phone-width browser entry/category/error states checked. Native Swift fixtures, compilation, actual camera/OCR/Core ML and iPhone 2 Hz remain pending Xcode. Current report imports are synthetic and excluded; full clinical ratings, real lipid integration and Android native shelf capture remain unfinished. See [checkpoint and acceptance plan](35-shelf-scan-integration.md) and [updated Mac guide](28-iphone-shelf-test-installation.md). New source delivery: HealthGrocery-iPhone-Shelf-Scan-2026-10-14.zip.

## October 14 — minerals and exact-product label evidence

Implemented and deployed source-reported trans fat/minerals, OFF label/allergen/trace fields, compatible catalog v2 and exact-product gluten evidence with a separate signed proof path. Refreshed all 2,898 USDA rows; enriched 1,778 OFF rows. No test or unreviewed record was promoted to production certification. Full check: 311 application + 3 tooling + 10 report-adapter tests, typecheck/lint; all-platform bundles; live v1/v2/export/portfolio checks pass. Physical-device/native release acceptance remains separate. See [details and pending inputs](36-product-label-evidence-and-minerals.md).
