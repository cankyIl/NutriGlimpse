# Build 26 — combined shelf, profile and aisle release

October 25, 2026, America/New_York.

Status: backend deployed and verified; signed native build is in progress. Not yet uploaded or available in TestFlight. Build 25 remains the released app until Apple acceptance is recorded below.

## Included work

- Side-chat v2 Shelf Camera: nine-package 3x3 grids, parallel Gemini/GPT requests, two in-flight batches, streamed product records, Gemini priority and bounded GPT gap filling, duplicate handling and final partial-grid processing. Existing v1 shelf recovery/rating fixes remain available for older clients.
- Side-chat My Needs: multiple health concerns, including High Cholesterol / Heart Health; saved profile compatibility retained.
- Single-product aisle/section display uses Gemini's returned value without requiring a source link. General notices are consolidated at entry; nutrition checks and product-specific holds remain.
- A narrow integration correction aligns the initial agreement and product-photo privacy wording with the already implemented shelf consent and returned-aisle behavior. No model prompt was changed.
- Existing artwork, news, photo recognition, location/nearest-store selection, sharing choices, source toggles and protected report handling are preserved.

## Checks before packaging

The combined workspace passed 797 core/service tests, TypeScript and mobile lint, nine tooling checks, ten report-input checks, 76 photo UI scenarios in both timing modes, needs/onboarding checks, 11 news tests and news UI, shelf-nine UI and 12 existing shelf-grid scenarios. Four build-provenance tests and iOS JavaScript/Hermes export passed. A first provenance-test invocation used the wrong Python import context; running the test directly passed without an application-source change.

The 350-file mobile archive was compared to the tested workspace, with hashes recorded. The Mac uses this frozen archive. Native output/signatures and the exact submitted IPA will be verified after compilation. Side-chat code was preserved; only the version number and two integration disclosure sentences changed after the combined starting snapshot.

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
