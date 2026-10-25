# Compact product review and early original-card preview (FB-32)

October 17, 2026. Implemented and locally verified on project-server. **Source only: this side conversation did not deploy the backend, create/upload a native build or send an OTA update. Build 8 excludes these newer edits.**

## Release integration update

The main release session has completed the bounded paired live checks and deployed the compatible backend. Build 9 has passed native/package checks and is available to the existing owner in TestFlight with FB-32 and the latest concern-first logic. See [current build-9 evidence](58-build9-early-product-preview.md). The source-only statements below describe the original side-chat checkpoint.

## Approved experience

1. After capture and preparation, open the original product card with the captured thumbnail and “Identifying your product…”. The photo remains transient in memory and is cleared on backgrounding, cancellation, expiry or replacement.
2. Display a complete identity-only response from the AI in that same original-card position, with “Checking nutrition…”. A possible match is explicitly uncertain. The app does not guess the name before AI responds. Thumbnail size/layout matches the original product card (64 x 86).
3. Replace the loading content with the existing checked product card when the complete original record passes validation. Only then show the rating and Food Facts/source actions. Checked alternatives stream into separate cards underneath, up to three, with the existing five-candidate pool and all eligibility checks.

## Compact internal format

Only the provider-to-backend representation changes. Short keys map losslessly to the existing identity, category, serving, 13 nutrients, ingredients, rating and visible-text fields. Instructions prohibit duplicate excerpts and unnecessary prose, while retaining all required nutrition and ingredient evidence. Unknown remains null. The public v3 product response, one-call design, GPT-6 Luna, high-detail photo, no-reasoning setting and 4,500-token ceiling are retained. No change to absolute ratings or relative comparison rules: their source text after the diagnostics marker is byte-identical to the pre-edit checkpoint.

The provider expands the compact format before running the existing validators. A malformed alternative is rejected independently; invalid/unknown nutrients never become zero or an approving rating. Full provider completion/refusal/truncation checks remain. Ingredients from memory still do not establish allergen safety or certification; existing local dietary restrictions remain authoritative for display.

Identity preview events require `Accept: application/x-ndjson; preview=identity`. Older clients receive only their existing progress/result events. New clients also accept the old JSON response. Only one strict identity event is allowed before product progress; additional claims, repeats, late events, identity changes or interrupted streams fail closed and clear the preview. Stream callbacks cannot revive a cancelled scan.

## Evidence and limits

- 468 core/service tests, nine tooling tests and ten input-adapter tests pass.
- 37 production-component scenarios pass with timing enabled and disabled, including immediate captured-photo preview before any AI output, identity before nutrition, uncertainty, cancellation/background cleanup, three alternatives, source toggles and dietary checks. Native and network boundaries are mocked.
- Workspace typecheck and mobile lint pass. iOS production JavaScript/Hermes export passes; this is not a new native Swift compile or an on-device performance measurement.
- Real loopback HTTP tests verify compact decoding, identity-first streaming, older-client compatibility, one model dispatch and one budget reservation. They use a mocked AI response and incur no paid AI calls.
- Synthetic cereal/five-alternative payload: 2,813 -> 1,680 JSON bytes (40.3% smaller), with identical field values and final decisions. A complete identity can be parsed after 106 characters versus 328 for the full first food in this fixture. These are format measurements, **not measured token savings or a promised latency reduction**.
- Additional numeric-only preview timings distinguish photo layout, identity arrival and identity layout from the existing first checked product/card timings. All remain temporary Beta 0 instrumentation and must be removed before Beta 1.

Artifacts: `artifacts/compact-photo-preview-2026-10-17/` contains pre-edit snapshots, full-check/export logs, synthetic format benchmark, verification summary and a scoped source manifest. No real user photos or product responses were copied into these artifacts. No paid model calls, deployment, build-number change, TestFlight upload, OTA update or other-service change occurred in this side conversation.

## Remaining release checks

- Completed: included in build 9; build 8 remains unchanged.
- Completed: six paired public-photo calls plus two deployed HTTPS checks under the approved budget; see build 9 for measured times and limitations. This small sample does not establish general model accuracy.
- Backend deployed and native UI delivered in build 9. Remaining: physical iPhone checks that the photo, name, rating and alternatives update in order and cancellation/backgrounding clears the photo.
- Model-to-model benchmarking is a proposed follow-up only; no additional provider accounts or paid calls were used.

References: [OpenAI latency guidance](https://developers.openai.com/api/docs/guides/latency-optimization), [React Native 0.86 Image](https://reactnative.dev/docs/0.86/image).
