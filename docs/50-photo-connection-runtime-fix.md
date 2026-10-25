# Build 5 — correction for false connection failures

**Status:** Build **0.1.0 (5)** is available to the existing owner group in TestFlight. Updated October 17, 2026 (Eastern). User installation/physical acceptance is not claimed.

## User report and cause

The owner reports every photo fails after waiting, on home Wi-Fi, with “Could not connect. Check your connection and try again.” Five recent backend entries show completed v3 reviews. A separate bounded public-fixture request through the actual HTTPS endpoint returned HTTP 200, valid schema 3 and three alternatives in 8.5 seconds.

The root cause is in `packages/core/src/aiFoodClient.ts`: after receiving the response it called `parent.throwIfAborted()`. React Native 0.86.3 installs the `abort-controller/dist/abort-controller` implementation through `Libraries/Core/setUpXHR.js`; its signal has `.aborted` but no `throwIfAborted` method. The resulting TypeError was caught and mislabeled as a network failure. This also affected per-card source and image checks. A successful server review therefore failed on the phone before display.

The previous Node tests used Node's AbortSignal, which supports that method. Browser component checks mocked the client boundary. Those tests and a successful native compilation did not exercise this runtime incompatibility. The new regression uses the actual installed React Native controller, not a substitute stub. Before the fix it reproduces the exact user message for a valid response.

## Correction

- Use portable `.aborted` checks; no new dependency or framework upgrade.
- Do not dispatch an already-cancelled request; preserve cancellation after response/body reading.
- Distinguish actual transport failure from gateway unavailability, malformed/unexpected response, busy service, exhausted allowance and provider timeout. Do not blame the user's connection for parsing/programming failures.
- Keep strict result validation, bounded requests, one paid call per attempt, explicit retry and all existing privacy/dietary/rating gates. No server or model prompt change was needed.
- Preserve every build-4 feature and completed side-chat change. Runtime diff is confined to the shared photo client plus the build number; add one regression test file.

## Evidence

Six focused cases: 5 failed / 1 passed before, **6 passed after**. They exercise valid review/source/media replies using the React Native signal, cancellation before dispatch/during reading, HTML gateway errors, invalid JSON/schema, busy/budget/provider errors and actual transport failure. Full checks: **415 core/service tests, 7 tooling tests, 10 report-adapter tests, 23 production-component scenarios; typecheck/lint pass**. No claim of a completed physical-phone retest.

Only one additional paid call was made for the public HTTPS diagnosis; no user photograph was collected or retained. Current shared reservation **$0.76 across 38 dispatches**, including user scans; this is not actual billing. The $2 budget and $1.80 admission gate remain.

## Delivery

- EAS build: `c9b500e2-c40a-4dc6-acbb-6e5729a09bab`; version **0.1.0 (5)**.
- Source manifest: 231 hashes, rechecked after upload. Snapshot: `build5-source.tgz`.
- Signed arm64 IPA verified: SHA-256 `06c3689b1372d48d94b423d8da8aa09f6d035949b482309a9bdcac52fa84ea00`. Expected bundle/team, store profile, both retained shelf detectors, key-free UI and corrected response message present.
- Submission: `f3820394-67fd-40f6-9d9e-6a884fe67cb7`, **FINISHED**. Apple build: `683e7fc3-913f-414f-985a-c254bfc1cdf8`, **VALID / IN_BETA_TESTING**.
- Existing private owner group contains this exact build; encryption declaration remains false. No additional invitations or backend restart.
- Update through **TestFlight → Health & Grocery → Update**, verify **0.1.0 (5)**, then retest a package photo and its Food Facts/source check.

Evidence directory: `/path/to/NutriGlimpse/artifacts/photo-connection-2026-10-16/`. Build-4 release evidence is retained as history in [the prior release record](49-approved-cards-and-home-release.md).
