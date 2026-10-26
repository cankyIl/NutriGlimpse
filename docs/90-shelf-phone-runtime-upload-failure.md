# Build 26 shelf capture-to-upload failure

October 25, 2026, America/New_York.

Status: **cause reproduced, client correction staged; not yet in TestFlight**. The existing build 26 remains affected. No server restart, provider prompt change, new build, OTA or upload occurred during this diagnosis.

## Report and retained logs

The owner reported 25 packages captured, zero processed and no results after Finish. Single-product client timing at approximately 10:38 p.m. Eastern identifies app version 0.1.0, build 26 and a completed single-product scan. The latest shelf provider log entries were earlier public-fixture runs, not this phone attempt. The service was active; public health and shelf-route probes responded. No recent service-journal error explains the attempt.

Shelf request logging currently begins after request/image validation; build 26 has no capture-to-upload telemetry. Therefore the original phone exception is not present in backend logs. The root cause below is a deterministic reproduction against the exact installed mobile dependency, not a fabricated exception recovered from that scan.

## Root cause and reproduction

React Native installs `abort-controller/dist/abort-controller` in `Libraries/Core/setUpXHR.js`. Its signal implements `aborted` and abort events but not `throwIfAborted`. The shelf HTTP client called `parent.throwIfAborted()` before its first fetch and again after reading the response. Node implements that method, so Node-based session, HTTP and mocked UI tests passed.

With the actual mobile cancellation dependency substituted into the unchanged production `ShelfNineSession` and `reviewShelfNine` code, batches of 9, 9 and 7 packages produced:

- 25 accepted package entries; zero upload attempts and zero processed products.
- 25 unresolved packages and completed session state after Finish.
- Error: `parent.throwIfAborted is not a function`.

This matches the reported symptom and explains why the backend has no corresponding model request. Camera counting does not mean an upload or model review occurred.

## Correction and verification

The two unsupported method calls now check `parent.aborted` and throw a readable cancellation error. Event-based cancellation, stream limits, response association validation, nutrition checks, provider priority and alternatives behavior are unchanged.

A new `shelfNineNativeRuntime.test.ts` suite uses the actual React Native dependency, rather than Node's AbortController. It verifies 25 packages through three requests, progressive results, the seven-package tail on Finish, pre-upload cancellation, cancellation during a stream, cancellation at completion and rejection of mismatched batch results. All five new regression cases failed before the correction and pass afterward; the eight existing shelf-nine tests also pass. Network/model responses in this suite are controlled fixtures. This is runtime compatibility evidence, not a new physical camera or vision-accuracy result.

Full `npm run check` passed: TypeScript, mobile lint, 816 core/service tests, nine tooling tests, ten report-input tests, 76 photo UI scenarios, needs/onboarding, 11 news tests plus news UI and shelf-nine UI.

Private evidence: `artifacts/shelf-phone-runtime-2026-10-25/`, including the before reproduction, failing/passing regression logs and combined checks.

## Release and follow-up

1. Include the client correction, mobile-runtime tests and already staged shelf answer-retention notice in the next tested iPhone package, preserving concurrent side-chat work.
2. Install that new build and verify live capture, streaming results, Finish with a partial batch and background cancellation. Build 26 cannot be repaired by a backend-only deployment.
3. Add bounded request-entry and phone capture/upload diagnostics so a future pre-model failure can be diagnosed directly from logs. Do not log raw photos or health profiles for that instrumentation.
4. Cross-batch duplicate normalization and model nutrition accuracy remain separate open items from the side-chat report.

## Build 27 release follow-up

The correction and accurate processing-failure messages are included in build 27. Native compilation/signing, the actual mobile cancellation-dependency tests and a live 16-package HTTPS replay passed. Upload is complete; see the [current release record](91-build27-shelf-upload-and-error-recovery.md) for Apple availability and the remaining physical acceptance boundary.
