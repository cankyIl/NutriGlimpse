# Build 7: relative explanations and camera side-chat changes

Release requested October 17, 2026. Authoritative workspace: `/path/to/NutriGlimpse` on project-server. Delivery complete: **0.1.0 (7)** is **VALID / IN_BETA_TESTING** and available to the existing owner-only internal TestFlight group. Installation/physical testing have not been verified. EAS build: `fb02640c-903f-4a89-807c-aa58ec7f8d1e`.

## Included

- Updated shared comparison helper shows concise relative benefits for suitable yellow alternatives while retaining their neutral color, category-specific priorities, equal-weight comparison and existing nutrition/dietary checks.
- Side-chat quiet shutter uses the supported iOS capability check. Unsupported devices/regions retain the system behavior. Physical sound suppression remains unverified.
- Temporary Beta 0 numeric timing hooks measure capture/preparation, result delivery, first-card layout proxy and alternatives. The backend portion is already deployed. Mandatory removal before Beta 1 remains enforced by the release guard; no raw photos, OCR, profile or location is added to timing reports.
- Existing Berry & Citrus home, two camera actions, public news edition, My Needs measurements, source show/hide, reference photos and streaming fixes are retained.
- Privacy and initial photo disclosure now describe the already-authorized short-lived product-decision and timing logs. No privacy gate, data field, paid model call or clinical-personalization setting is enabled by this release.
- Both existing shelf detectors remain, under the previously recorded user decision. Their deferred distribution/source-publication permissions are not represented as resolved.

## Pre-upload verification

454 core/service tests, nine tooling tests, ten input-adapter tests, 31 production-component scenarios with timing on/off, My Needs interactions, four news-operator tests, typecheck/lint and the Beta 0 release guard passed. Production iOS JavaScript/Hermes export also passes. Native/network boundaries in component tests are mocked; these are not physical iPhone results.

The inspected cloud source archive contains 302 files. Required runtime timing, native camera, comparison and release-guard files match the authoritative workspace. Previously completed side-chat hashes are preserved. Secrets, private diagnostics, server tooling/state and generated native projects are excluded. Source manifest/checkpoint and test logs are in `artifacts/iphone-build7-2026-10-17/`.

## Acceptance still needed on the phone

After TestFlight delivery: verify version 0.1.0 (7), scan a spread/cereal/sauce, check concise explanations within each alternative card, and check that neutral improvements remain yellow. Confirm camera capture, background/cancellation behavior, matching thumbnails and source show/hide. Check shutter sound on this iPhone and compare first-card timing with observed behavior. Up to three means fewer are valid when fewer candidates pass. Continue treating model nutrition as estimates and use the optional source checks when needed.

No additional AI budget used for this release; the last reservation checkpoint is $1.10 against the authorized $2 limit. Physical acceptance and extra tester invitations remain separate.

## Verified delivery

EAS `fb02640c-903f-4a89-807c-aa58ec7f8d1e`; submission `03c51136-998b-45af-bb7a-0c5e8559d012`; Apple build `a5b4a2a4-7c1f-47c6-9df0-2845ef54b372`; app `6823645787`. Exact build is attached to the existing private owner group, with no extra invitations/public distribution. Encryption declaration remains false and is verified. No backend restart, OTA update or paid model call was needed.

IPA: 56,335,461 bytes; SHA-256 `ad7f96849693a613d127fd31806f1f606fb8be45f02d211d8a314dd3ab720fd0`; arm64, minimum iOS 16.4, iphoneos27.0. Bundle/team/store provisioning, CMS signature, expiry, ZIP integrity, permission descriptions, scene lifecycle, compiled shelf models, new explanation/timing strings and native quiet-capture selectors were checked. Full local code-signature trust-chain validation was not performed on Linux; Apple acceptance is independently verified.

Expo Doctor retains its existing patch-version warning, recorded in the cloud build logs. No dependency upgrade or clean dependency-security clearance is claimed. Source hashes match the frozen 302-file cloud manifest after upload.

Open TestFlight → Health & Grocery → Update and confirm **0.1.0 (7)**. No access key or new invitation is needed. The source-only/pending-build statuses in earlier dated documents are historical; device acceptance and mandatory timing removal before Beta 1 remain open.

Build-specific English TestFlight testing notes were saved and read back successfully for the exact Apple build. They cover explanations/colors, camera behavior, images, source toggles and Wi-Fi/cellular checks.
