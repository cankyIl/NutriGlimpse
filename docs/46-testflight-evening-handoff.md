# October 16 evening TestFlight handoff

> Current update: **0.1.0 (3)** is available to the existing owner internal TestFlight group. It includes key-free access and the side-chat My Needs changes. Build-1 key-entry instructions below are historical; no key delivery or activation is needed for build 3. See [current update](47-key-free-beta-update.md).

The user will test this evening and has started enhancements in another chat. This chat is responsible for finishing the existing release upload and preparing owner installation.

## Fixed release

- Version **0.1.0 (1)**, app **6823645787**, bundle **org.cac.healthgrocery.beta0**.
- EAS build **7e715d3d-8968-450e-9cd4-4bfc2a294be8**.
- [Existing submission e95b2ae3-5ba2-419c-a343-82fb173c593f](https://expo.dev/accounts/buldygaur/projects/grocery-app-preview/submissions/e95b2ae3-5ba2-419c-a343-82fb173c593f).
- Retained IPA: `artifacts/eas-ios-2026-10-16/health-grocery-beta0-0.1.0-build1.ipa`.
- SHA-256, reverified October 16: `f0727c9c880725973797c5b886f6d633508c750f5e07ed3419c9f51efae34b12`.

The submission was started with this explicit completed build ID. Later source edits cannot change that uploaded artifact. Enhancements need a later numbered build to reach this installation, unless an over-the-air update is separately introduced. No such update is authorized by this handoff.

## Concurrent work boundary

This release follow-up must not edit mobile/backend source, shared app/EAS configuration, deploy or restart the backend, rebuild, publish an OTA update, restore snapshots, or revert another chat's changes. Read current documents before narrowly updating release status; preserve all unrelated plan entries. Do not rerun the broad `checkpoint-testflight-release.py` documentation rewrite against an evolving shared plan.

The app uses the shared live backend. Backend changes can affect this already-built app at runtime, so any future backend deployment must preserve the API behavior used by version 0.1.0 (1) and be checked against that client. The upload itself does not depend on future source edits or deployments. This note is not a claim that the separate chat has been contacted or that all of its changes have been reviewed.

## Completed follow-up — 11:56 a.m. Eastern

The quiet follow-up confirmed that EAS finished the upload at 11:25 a.m. Eastern and Apple processed the exact build successfully. The US-only encryption answer was recorded and read back at 11:56 a.m. Eastern. Internal state is READY_FOR_BETA_TESTING; external state is READY_FOR_BETA_SUBMISSION. The readiness automation has been deleted after completing this handoff. No duplicate upload or enhancement deployment was made.

Use the reviewed helpers under `artifacts/testflight-release-2026-10-16/`. The encryption and detector decisions are recorded in [document 45](45-testflight-release-and-encryption.md). Notify on readiness, failure or an exact action required from the user; remain quiet on unchanged queue/processing states. Stop the follow-up once the owner handoff is ready or requires user input.

## Owner invitation sent — installation steps

Owner group **Beta 0 - Owner Testing** is created, contains the verified account holder **owner@example.invalid** and build **0.1.0 (1)** only, and has automatic access to future builds disabled. Apple accepted the explicit invitation request (HTTP 201) on October 16, 2026 at 09:54 PM Eastern. The user now confirms the TestFlight app is installed on the iPhone. Physical feature acceptance is still pending. No other testers were invited.

1. On the iPhone, install Apple's **TestFlight** app if it is not already installed.
2. Open the TestFlight invitation sent to **owner@example.invalid**. Check junk/spam if it is not in the inbox.
3. Tap **View in TestFlight**, accept the invitation, and install **Health & Grocery Beta 0 — 0.1.0 (1)**.
4. On **Scan Your Product**, enter your separately supplied private app key in **Tester access key** and tap **Save tester access**. This is not your Apple password or OpenAI API key. It is saved securely on the phone.
5. Begin with a normal product photo, food facts, colored rating and alternatives, then the shelf camera and existing acceptance checklist.

The internal group already exists; there is no need to create another group or request another invitation. No Mac connection is required. The separate My Needs enhancements remain source changes for a subsequent build and are not included in 0.1.0 (1). Additional testers use the separately authorized external review/invitation path.

Evidence: `owner-testflight-setup.json` and `owner-invitation-response.json` in `artifacts/testflight-release-2026-10-16/`. Apple's send request succeeded; subsequent user feedback confirms installation. The backend key handoff was missing from the earlier instructions and is now being completed. The existing key is verified working; its delivery/entry and a successful scan are still pending.

## Subsequent build scope — side-chat inclusion confirmed

The user now requests a later update that removes tester-key entry and AI-enabled wording, and explicitly requires the side-chat enhancements to be included. This supersedes the build-1-only preparation boundary for that future update, while preserving build 1 as an immutable historical release. Live authentication removal still awaits the separately requested deployment confirmation after automatic approval review rejected it.

Use the current authoritative source, not the archived source for build 1. All 21 My Needs manifest files were checked and match; full baseline checks and My Needs interactions pass. The next build must include Save My Needs returning home, footer removal, optional height/weight in US/metric units, encrypted persistence/deletion, and the internal reference/category implementation. Existing privacy/clinical gates keep weight-context transmission disabled.

No later build is uploaded yet. Verify the final combined archive and rerun the My Needs and photo flows after applying any key-removal changes; exact baseline evidence is `artifacts/needs-feedback-2026-10-16/release-inclusion-verification.json`.
