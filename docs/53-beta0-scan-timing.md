# Temporary Beta 0 scan timing

Requested October 17, 2026 in the camera/performance side conversation. The user explicitly requires removal before Beta 1 and local regression checks before uploading a build.

## Status

Implemented in source and locally tested on project-server. **The server portion was deployed with DEV-18 / FB-29. Phone timing is compiled and available in TestFlight build 7; physical timing measurements remain pending.** No service restart, build-number change, EAS build/submission, OTA update or paid AI request was performed by this side conversation. Native iOS compilation passed in build 7; physical timing validation remains pending. The silent-shutter change from this side conversation remains in the same native source.

## Measurements

One random server-issued scan trace correlates numeric events. The phone uses monotonic elapsed durations from the shutter press; native camera preparation uses its own monotonic durations; the server uses monotonic request/provider clocks. Device/server wall clocks are never subtracted.

| Measurement | Meaning and limit |
|---|---|
| Native capture | Native capture request to encoded photo delivery; includes camera/JPEG capture processing |
| Native preparation | OCR and barcode/JPEG work, with separate overlapping durations; these must not be added together |
| Phone photo ready | Shutter tap to prepared native result reaching JavaScript; includes scheduling and bridge delay |
| Upload start | Request serialized and fetch about to begin |
| Response headers / first checked result | What the phone actually receives; headers may arrive together with the first card |
| First-card layout | React Native layout callback for the original card, a display proxy; not exact screen-pixel presentation |
| Alternatives 1/2/3 and completion | First arrival of each eligible alternative count and completion, not image-download completion |
| Server request stages | Body received, provider start, first checked result queued, final response queued |
| Provider stages | Model dispatch, headers, first text, first checked original and complete model response |

Exact one-way upload time is not claimed. The read-only summary calculates a **combined outbound/return network and client-parsing residual** from client request-to-result duration minus the corresponding server duration. Missing/inconsistent values remain null. If a scan fails or is cancelled before a response trace reaches the phone, there is no correlatable client report. Layout can be absent if the screen is never laid out; no invented display timing is filled in.

## Privacy and bounds

- New timing records contain a random per-scan trace, app version/build, a fixed outcome and allowlisted numeric durations only. No photo, OCR, product name, health profile, location, credentials, user/device ID, free-form error text or network identity is added to timing records.
- Existing separate product-decision diagnostics are described in document 52; this change does not expand their product fields.
- Phone retains at most one in-memory recorder; no disk history, retry, background queue or extra model request. At most one small report is sent after completion/failure. A successful scan allows up to two seconds for its layout callback without delaying the result. Report delivery times out after four seconds and never changes a scan's outcome.
- Backend receiver is write-only, disabled by default, accepts at most 2 KiB, two concurrent reports, and only one report for a recent server-issued recognition trace (three-minute lifetime / 64 pending traces). Strict schemas reject unexpected fields. No public log-reading endpoint exists.
- Uses the existing private diagnostics store: seven-day retention / 2,000-event cap / restrictive file permissions. Older events can be evicted sooner at the row cap.
- Owner authorized these temporary diagnostics. Include the short-lived diagnostic notice in additional tester onboarding.

## Enable / inspect / disable

Client: explicit `EXPO_PUBLIC_BUILD_STAGE=beta0`, app version `0.1.0`; set `EXPO_PUBLIC_BETA_SCAN_TIMING=false` to disable in a build. Other stages and versions are off.

Server: both `GROCERY_BUILD_STAGE=beta0` and `GROCERY_BETA_SCAN_TIMING=true`, plus existing private diagnostics. These settings are active after the coordinated DEV-18 backend deployment; no existing build-6 phone timing report is expected. Set the timing switch false to stop collection independently.

Read-only operator command from the remote project:

```
python3 ops/read-scan-timings.py --limit 2
```

No timing reports are expected from build 6. The backend is deployed and native build 7 is available in TestFlight. Install build 7 and repeat two or three normal product-photo scans. The summary then reports measured durations without printing product or health data. Check the first-card layout proxy against a physical observation before treating it as perceived latency.

## Beta 1 removal - mandatory release item

- [ ] Disable backend collection and remove the temporary launch-script settings.
- [ ] Remove `packages/core/src/scanTiming.ts`, `apps/mobile/src/state/ScanTiming.ts`, and `apps/service/src/scanTiming.ts` after removing their imports/hooks.
- [ ] Remove capture/client transport/result-layout/state hooks, native `timingEnabled` bridge property, native stopwatch fields and preparation timing payloads.
- [ ] Remove the `/v3/photos/timing` receiver, stage callbacks and the two `scan_*_timing` event schemas; remove/update temporary tests and the timing reader.
- [ ] Delete retained timing rows/exports under the applicable retention procedure; do not erase unrelated user data or diagnostics indiscriminately.
- [ ] Build with the Beta 1 stage/version. The EAS post-install guard **fails for Beta 1/production/unset stages while temporary modules/hooks remain**, even if they are switched off. It also rejects a changed app version incorrectly retaining the beta0 stage.
- [ ] Verify the Beta 1 bundle contains no timing collection/transmission hooks and makes no timing requests. Rerun recognition, cancellation, alternatives, privacy and screen checks after removal.

Keep `ops/check-scan-timing-release.cjs` and its EAS post-install hook as a negative release check; it passes once the temporary modules/hooks are removed. Do not bypass it just to release Beta 1.

## Local verification

- 440 core/service tests passed, including 11 new timing tests: real loopback HTTP streaming/correlation, timing on/off parity, three alternatives, one model dispatch, privacy/schema bounds, replay/unknown-trace rejection, cancellation and callback failures.
- Nine tooling tests (including Beta 1 release guard), ten input-adapter tests, typecheck and lint passed.
- 28 production-component screen scenarios passed both with `EXPO_PUBLIC_BUILD_STAGE=beta0` and `beta1`. The real timing hooks are exercised with mocked native/network boundaries, including one report, native durations, first-card layout, alternatives and no photo in telemetry.
- iOS production JavaScript/Hermes export passed. Native Swift compilation and physical iPhone tests remain pending. The receiver/server hooks were subsequently deployed with DEV-18, but no new client timing report or full device-readiness claim is made.
- Cloud-package rule test passes: the release checker is included, while secrets, timing data and operator scripts stay excluded.
- Read-only summary arithmetic verified on synthetic durations, including unknown values. Current private store contains no new client timing reports yet, as expected.

Evidence and pre-edit source copies: `artifacts/scan-timing-2026-10-17/`. All tests use fixtures; no additional OpenAI spend. Existing review rules, three-alternative checks, catalog/news behavior and privacy/clinical gates are retained.


Build 7 delivery checkpoint: native Swift compilation, runtime-hook/IPA verification and owner TestFlight access pass. No physical capture/timing result is claimed. See [release evidence](55-build7-alternatives-and-camera.md). Mandatory Beta 1 removal above remains open.


## October 17 - measured scans and preview timing extension

Read-only inspection found two successful build-7 scans finishing at 09:50 and 09:52 America/New_York: first checked card layout at 4.627 / 3.781 seconds, third alternative at 7.667 / 8.252 seconds, full response at 9.816 / 9.692 seconds from shutter. These are actual numeric phone/server reports; card layout is a proxy, and thumbnail loading is not measured. The previous “no new client reports yet” statement describes the earlier implementation checkpoint.

FB-32 adds optional `photoPreviewLayoutMs`, `identityPreviewMs` and `identityPreviewLayoutMs` to the same bounded numeric-only timing schema, reader and release-gated recorder. Existing `firstResultMs` / `firstCardLayoutMs` still mean the checked nutrition card, so early preview timing cannot masquerade as a faster checked result. These new marks are source-only pending the later client/backend release and are part of the mandatory Beta 1 removal above. [FB-32 details](57-compact-photo-preview.md).
