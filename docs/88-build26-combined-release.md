# Build 26 — combined shelf, profile and aisle release

October 25, 2026, America/New_York.

Status: **build 26 is available in the existing owner TestFlight group.** Backend deployed and verified; native compilation/signature verified; EAS submission FINISHED; Apple VALID / IN_BETA_TESTING. Encryption exemption and English release notes are verified. Installation and physical iPhone acceptance are not yet verified.

## Included work

- Side-chat v2 Shelf Camera: nine-package 3x3 grids, parallel Gemini/GPT requests, two in-flight batches, streamed product records, Gemini priority and bounded GPT gap filling, duplicate handling and final partial-grid processing. Existing v1 shelf recovery/rating fixes remain available for older clients.
- Side-chat My Needs: multiple health concerns, including High Cholesterol / Heart Health; saved profile compatibility retained.
- Single-product aisle/section display uses Gemini's returned value without requiring a source link. General notices are consolidated at entry; nutrition checks and product-specific holds remain.
- A narrow integration correction aligns the initial agreement and product-photo privacy wording with the already implemented shelf consent and returned-aisle behavior. No model prompt was changed.
- Existing artwork, news, photo recognition, location/nearest-store selection, sharing choices, source toggles and protected report handling are preserved.

## Checks before packaging

The combined workspace passed 797 core/service tests, TypeScript and mobile lint, nine tooling checks, ten report-input checks, 76 photo UI scenarios in both timing modes, needs/onboarding checks, 11 news tests and news UI, shelf-nine UI and 12 existing shelf-grid scenarios. Four build-provenance tests and iOS JavaScript/Hermes export passed. A first provenance-test invocation used the wrong Python import context; running the test directly passed without an application-source change.

The 350-file mobile archive was compared to the tested workspace, with hashes recorded. The Mac uses this frozen archive. Native output/signatures and the exact submitted IPA were subsequently verified, as recorded below. Side-chat code was preserved; only the version number and two integration disclosure sentences changed after the combined starting snapshot.

## Backend deployment and live shelf check

The beta backend was restarted after source verification. Local and public HTTPS health checks passed, v6 single-product recognition remains available, and the v2 shelf endpoint rejects malformed input. Portfolio and website services kept the same processes. A Python health probe was blocked by Cloudflare's user-agent policy; the application's Node/Fetch path succeeded. No Cloudflare/security configuration was changed.

A live HTTPS shelf request used the existing package-only US fixture: Special K Chocolatey Delight, Wegmans Parmesan Romano sauce, and Apple Jacks, each repeated three times. No personal health details or private phone photo were submitted.

- All three product identities were returned; all nine cells were accounted for and six duplicate appearances combined.
- First product: 4.607 seconds. Gemini completed results: 8.759 seconds. Final response: 28.764 seconds.
- Both providers dispatched. GPT began emitting a product late and was cancelled at the bounded supplement deadline; Gemini results were retained. This is working timeout handling, not a completed GPT review.
- No alternatives were accepted in this live run. Three alternatives or correct real-world nutrition/aisle positions are not guaranteed by this check.
- These are single-run observations, not a representative latency/accuracy benchmark. Native capture and physical iPhone acceptance remain open.

## Release evidence

Evidence is retained privately under artifacts/nutriglimpse-build26-2026-10-25/. Update this section only with verified native/upload/Apple results. No new testers were contacted or invited.

## Native package and upload — verified

- 0.1.0 (26), arm64, iOS 16.4 minimum, compiled with Xcode 27.1. Full application signature verified on the Mac; distribution provisioning and encryption declaration checked.
- All 350 frozen source files match; 264 compiled feature inputs match. Approved hero artwork and native icon pixels match. Both existing compiled shelf detectors are included.
- IPA SHA-256: `6baaca4446a07ea6223482fdf68b00194e1203508feaffe0dece8488864e2cc5`.
- EAS submission `7f83c3ef-43e3-41e1-9dd5-fb9ac37026ff` is FINISHED with no submission error. This confirms upload, not Apple processing or installation.
- Release source commit: `d61806b539a82f4f07309b9e5f358a1db809d0d4`. No new tester invitations were sent.

### Apple receipt

Apple upload/build `96ff6974-c1ec-4b7c-92d5-c1a74464fa9d` is COMPLETE / VALID, with no reported upload errors or warnings. Owner-group availability is verified as IN_BETA_TESTING. usesNonExemptEncryption=false and en-US release notes are confirmed. External testing remains READY_FOR_BETA_SUBMISSION; this checkpoint does not approve or invite new external testers.

## Phone acceptance next

Open TestFlight, select NutriGlimpse and update to 0.1.0 (26). Check shelf consent, Start shelf scan, streamed cards and Finish with fewer than nine products; save multiple health concerns; rescan a single product for aisle/section display and Food Facts. Physical capture, correct product variants/nutrients and actual aisle positions still require real-device checks.
