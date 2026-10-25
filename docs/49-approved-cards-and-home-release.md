# Approved product cards, LLM-first reviews and side-chat home/news

**Subsequent defect:** Physical testing revealed that build 4 uses a cancellation method unavailable in React Native. Valid review/source/media replies are mislabeled as connection failures. The original automated/native evidence below is historical and does not establish working phone scans. See [build 5 correction](50-photo-connection-runtime-fix.md).


Status: Build **0.1.0 (4)** is available to the existing owner group in TestFlight. The approved product cards, LLM-first flow, recovery improvements and completed side-chat home/news/My Needs work are included. Automated checks and signed native artifact verification pass. Physical acceptance of this update remains pending. October 16, 2026 (Eastern).

## Included

- FB-01–08: My Needs save navigation, measurement units/storage/deletion and closed weight-sharing gates preserved.
- FB-09–15: Berry & Citrus home, two compact cameras, on-device front/barcode/nutrition routing, five dated publisher stories, public news endpoint and daily refresh implementation.
- FB-16–22: independent product cards, original photo and attributed alternative reference photos, LLM-first estimated facts, general rating dots, terse reasons, up to three alternatives, independent optional source checks and explicit recovery.
- Existing v1/v2 photo routes stay compatible with installed builds. New v3 review accepts no profile, weight, lipid or location fields. No tester key, activation pass or local-fallback button returns.

## Reliability and verification

One model request replaces the previous two paid stages for the new app. A missing/bad alternative cannot throw away the original review. Response validation, bounded 60-second transport, cancellation, stage-only diagnostics and explicit retry retain budget controls. No automatic paid retry; no raw photos or provider responses are logged for users.

Five public OFF cereal-image calls completed. After requesting a fuller candidate pool, the final three repeats returned Honey Nut Cheerios with three qualifying distinct alternatives in approximately seven to nine seconds. This demonstrates the revised path, not a measured real-world accuracy rate. Exact pack identity, estimate values and camera acceptance still need physical testing. All displayed values remain estimates until independently checked against a package/source.

Automated evidence: 409 core/service tests, 7 tooling tests, 10 report-adapter tests, 23 production-component photo/home scenarios, My Needs checks, 4 news-operator tests; typecheck/lint pass. Browser layout QA uses production React Native components through React Native Web, with native icons and network boundaries mocked. 390px and 320px layouts have no horizontal overflow. This is not native camera testing.

Public image search encountered Open Food Facts HTTP 503. Cooldown and cached/placeholder behavior preserve the product review. Not every alternative has a reliable photo; guessed/generated photos are never substituted. A narrow source check imported one additional USDA All-Bran record. Optional source matches do not overwrite estimated identity or facts.

News collection has five real dated items, using publisher metadata only. Some feeds publish infrequently, so dates are shown and stories are not claimed to be today's news. NIH date-only entries retain the supplied calendar date with normalized UTC noon, not an invented publication time. Native offline caching uses public metadata in the OS cache directory. The hourly user timer is active; its tested due guard runs once per Eastern day at/after 02:00, with DST/restart catch-up and prior-edition preservation.

AI lifetime reservation: $0.62 across 31 dispatch reservations; actual billed usage may differ. $2 authorization and $1.80 reservation gate preserved. Clinical/personalization and weight-transmission gates remain closed. Shelf detectors retained, distribution permissions still deferred rather than cleared.

## Delivery

Build 0.1.0 (4) is available to the existing owner group in TestFlight. User installation is not claimed.

- EAS build: `d1d3b798-61ce-49c9-8dfa-d76c98b5a50d`; native compilation finished successfully at `2026-10-17T03:31:04.792Z`.
- EAS submission: `adefdbad-4981-4970-8059-08738b3e1a1c`; upload finished at `2026-10-17T03:32:23.454Z`. The exact verified artifact was submitted once.
- Apple app: `6823645787`; bundle `org.cac.healthgrocery.beta0`.
- IPA SHA-256: `638e862e9c35be64d58dbad676c173b023165a6ae73f3d01a447278470d58194`; 56,314,695 bytes; arm64; iOS minimum 16.4; SDK iphoneos27.0.
- Store-distribution profile belongs to the expected paid team, excludes debug entitlement/device-only signing and expires October 16, 2027. Provisioning CMS signature and archive CRC pass. Full app signature/trust-chain validation is delegated to Apple; it is not claimed from the Linux inspection.
- Both compiled shelf models are present. New card/source/news/v3 content and side-chat measurements are in the native bundle; old key/fallback screens are absent. Hermes stores the estimate disclosure as UTF-16; the artifact inspector checks both string encodings.
- Source: all 230 manifest entries still match the uploaded build inputs. No source changes, OTA update or replacement build occurred after this final upload. Server-only response-length schema constraints were separately tested and live-validated before deployment.
- Encryption declaration is false for non-exempt encryption, consistent with the reviewed release declaration. No new encryption implementation was introduced.
- Apple build: `95c05633-ce98-4bdf-9ed1-26aab7eb6943`; processing **VALID**; internal state **IN_BETA_TESTING**. The existing private **Beta 0 - Owner Testing** group contains this exact build and its single existing owner. No additional testers were invited.
- Owner installation: open TestFlight, choose Health & Grocery, tap **Update**, confirm **0.1.0 (4)**. The revised photo disclosure is expected once; no tester key or activation pass is required.

Two earlier build-4 attempts (`3299df01-ab4b-4220-bb51-ebe2b51ac6c3` and `b82f5277-2302-4440-818e-e1ba101ba6e4`) were canceled before Apple submission to include background-photo cleanup and dietary/duplicate guards. They are not extra uploads.

Backend v3 and legacy v2 capabilities, news endpoint/conditional ETag and portfolio HTTP 200 pass after deployment. An immediate restart-time probe briefly returned 502; the subsequent running-service verification passed. Public-news timer is active. Expo Doctor retains the recorded patch-version warnings; this is not a claim of a clean dependency audit.

Evidence directory: `/path/to/NutriGlimpse/artifacts/approved-cards-2026-10-16/` (build/status logs, native artifact verification, release delivery, live fixture records, tests, visual checks, deployment and documentation hashes).

## Owner acceptance still needed

1. Photograph the same Honey Nut Cheerios package repeatedly; confirm the original card opens, its photo/facts stay together and useful alternatives appear. Record an error code if a request fails; do not assume the five fixture checks prove phone accuracy.
2. Expand Food Facts and optional USDA/OFF check on different cards; confirm no facts bleed between products. Source records are possible matches, and recalled values stay clearly estimated.
3. Try a single barcode and a full nutrition table through Scan Your Product. Check cancel/background recovery and Shelf Camera separately.
4. Verify My Needs Save return, units/persistence/deletion, compact home layout, article links/offline behavior and large text on the phone.

Missing reference photos remain possible during source outages; safe placeholders are expected. No personalized medical, verified gluten-safety, retailer-stock or measured shelf-accuracy claim was added.

## Later side-chat additions

Completed FB-01–15 are included. Later documentation-only EatingWell/Clean Eating source expansion and FB-23 audience-tailored news requests are preserved in the shared feedback documents; their runtime integration is not part of this build. Source and release configuration were checked against the final uploaded manifest.
