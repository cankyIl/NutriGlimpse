# Key-free Beta 0 update — 0.1.0 (3)

Updated October 16, 2026 at 10:37 PM Eastern. Build 3 is **available to the existing owner internal TestFlight group**. The owner has not yet confirmed installing this update.

## Delivered changes

- Removed **Read package text on this phone instead**. Normal product scans use one camera path.
- Replaced the text **Take Photo** control with a large, round camera-icon shutter. It has a screen-reader label, waits for camera readiness and prevents duplicate captures. The separate **Scan Nutrient Table** path remains local.

- No tester key, login, activation pass or credential setup. Product scans, catalog search, comparable alternatives, shelf catalog refresh and optional report processing use the existing HTTPS backend directly.
- Removed key-entry panels and key-related errors. Photo privacy uses **Continue to camera**; the **Enable AI product photos** label is gone. The existing one-time disclosure of photo processing and provider retention remains.
- Included the completed side-chat My Needs changes: Save returns home only on success; old footer removed; optional height/weight, US/metric conversion, encrypted persistence, measurement-date confirmation and deletion. The hidden category and review-gated integration remain in source; weight-context transmission and personalized medical recommendations remain disabled.
- Public access is limited to an explicit route list. Unsupported personal/admin endpoints remain closed. Input, image size, origin, concurrency, request-rate and provider-spending checks are preserved. No app/server raw-photo storage was added.

The user explicitly approved proceeding after being told that anyone who knows the backend address can use these endpoints and consume the shared testing allowance. The earlier automatic approval rejection and unanswered confirmation are superseded by that approval. Existing tester credentials are no longer read or sent; legacy device-key deletion remains only for cleaning old installations. No new credential is needed or delivered.

## Verification

- 397 core/service tests, seven tooling tests, ten report-adapter tests and 16 photo-screen scenarios pass; typecheck and lint pass.
- My Needs production-component checks pass, including success/failure navigation, repeated taps, unit conversion/reload, validation, clearing and hidden context.
- New key-free client/server tests cover a scan without an Authorization header, consent and personal-field rejection, exhausted budget before model dispatch, closed weight-context gates, rate/origin controls, restricted routes and optional-report validation.
- Live public HTTPS without credentials: photo/report capabilities 200; catalog search 20 results; plain-oats alternatives 18 results. Old photo consent is rejected before dispatch; unsupported uploads remain closed.
- No paid model call for this change. The ledger stayed at $0.36 reserved; this is reservation accounting, not actual billing. The existing $2 testing budget and $1.80 reservation stop remain unchanged.
- The EAS archive excludes machine credentials/backend data and contains the side-chat runtime source. All 21 side-chat baseline files are accounted for; intentional overlaps preserve their behavior while removing key checks. Snapshot and source hashes are recorded.
- Only congress-beta-backend was restarted. Portfolio service remained active. This is not a new claim of external portfolio-page availability.

Mocked tests do not establish real product recognition accuracy or physical iPhone acceptance.

## Release

The cloud Expo Doctor check reports ten available patch updates (16/17 checks passed); this is recorded as a warning, not a clean dependency-health claim. The locked versions are unchanged in this focused update.

- [EAS build fa892bb8-fd30-41dc-b2a1-78e2cea45b12](https://expo.dev/accounts/buldygaur/projects/grocery-app-preview/builds/fa892bb8-fd30-41dc-b2a1-78e2cea45b12)
- App 6823645787; bundle org.cac.healthgrocery.beta0; version 0.1.0; build number 3.
- Existing paid-team signing, US-only scope and encryption declaration false are preserved. Both shelf detectors remain included under the existing deferred-licensing decision; rights are not newly cleared.
- Build 2 was canceled before submission to include the latest camera changes in build 3. It was not sent to Apple.
- Build 1 remains immutable and still shows the local key screen. The backend update alone cannot remove that old screen.
- Apple processed build 3 as VALID and its relationship to the existing owner group was verified. No new invitation or additional tester was created.

## Verified release artifact

- Signed native compilation completed; the 56,295,516-byte IPA passed archive, bundle/version, ARM64, paid-team distribution profile, permission, scene-lifecycle and encryption checks. Both shelf detector models remain present. Linux inspection does not verify the complete Apple code-signing trust chain; Apple subsequently processed the upload as VALID.
- Compiled app bundle contains the new camera/consent wording and My Needs fields, and excludes the tester-key and local-text fallback screens.
- IPA SHA-256: `d284c69f280edf56710b84142220de0428457ab7b9dd4ffecc54a526581b2bbf`.
- EAS submission `4c30e58b-267b-4545-95ee-1047b33ebec8` is FINISHED. Apple build `be0de982-b3ec-4efd-a7b4-8c63da94bc4a` is VALID, usesNonExemptEncryption is false, and the existing owner-only internal group is IN_BETA_TESTING.
- No new invitation, additional tester, paid model call or OTA update was created. Installation and camera acceptance on the owner's phone remain unverified until the owner updates.

## iPhone next step

Open TestFlight → Health & Grocery Beta 0 → Update. Verify version 0.1.0 (3), then open Scan Your Product. No key is required. If the photo privacy choice appears, read it and tap Continue to camera. Check a normal product photo and My Needs save, measurements, restart persistence and deletion.

Evidence: `artifacts/key-free-beta-2026-10-16/` contains the key-free implementation and live-backend checks; `artifacts/camera-update-2026-10-16/` contains the final camera update, full rechecks and replacement release — changes.json, final-check.log, open-beta-tests.log, needs-ui.log, combined-release-verification.json, archive-verification.json, live-verification.json and the build/Apple status records.
