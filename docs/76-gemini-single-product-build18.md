# Build 18: Gemini single-product scans and retained GPT shelf flow

Status: October 24, 2026, 03:17 PM Eastern. **Version 0.1.0 (18) is Apple VALID / IN_BETA_TESTING and available to the existing owner-only TestFlight group.** Phone installation and physical acceptance remain unconfirmed.

## Included scope

- Single-product photos use the version-6 Gemini 3.5 Flash-Lite backend with the existing server-controlled Google lookup workflow (Serper, at most six queries) and source-aware nutrition cards.
- Shelf Camera retains on-device detection, full-package crops, duplicate checks, 16-cell rolling grids and GPT-6 Luna reviews/outside alternatives.
- Existing side-chat news, measurements/report/native features, source toggles, store behavior, approved artwork and both detector models are retained from current source.
- Personal medical recommendations remain disabled. No product search or model call was made for this release.
- The proposed quota-based provider fallback chain remains unimplemented. The latest earlier Gemini test returned one accepted alternative; cross-brand coverage, wider sauce tradeoffs, explanation quality and the ten-case comparison remain open.

## Verification

- 635 core/service tests, workspace typechecks/lint, tooling/report/news checks passed.
- 60 photo/home scenarios passed with timing disabled; the same 60 passed with timing enabled. Ten shelf UI scenarios and iOS JavaScript export passed.
- Mac mobile/core typechecks and lint passed with zero errors and one existing hook dependency warning.
- Local native build completed with Xcode 27.1 / macOS 27.0.1. Full code-signature verification passed. IPA CRC, bundle/version, paid-team App Store profile, disabled debug entitlements, permission descriptions and scene lifecycle checks passed.
- Both compiled shelf models, approved hero artwork, existing news/report feature markers and the Gemini v6 client were verified inside the IPA. These checks do not replace a physical camera test.
- All 333 frozen source files match the authoritative server and Mac after compilation; seven paths added, ten changed and none removed relative to build 17. No concurrent source change was overwritten.

## Release evidence

| Item | Verified value |
| --- | --- |
| App/version/build | 6823645787 / 0.1.0 / 18 |
| Apple build ID | c695ae4a-c735-48ce-8ca0-273d6a0edaed |
| Submission ID | e1735c81-a07f-4ab3-9c12-4fabff2ceb04 |
| Delivery | FINISHED, no reported submission error |
| Apple processing/internal state | VALID / IN_BETA_TESTING |
| TestFlight group | Existing Beta 0 - Owner Testing; only the existing owner; no new invitations |
| Encryption declaration | usesNonExemptEncryption=false |
| Release notes | en-US exact text verified |
| IPA size | 58,587,281 bytes |
| IPA SHA-256 | b6fc00862ff6b559d354ff64a4760c69448eb3eca8d16d220d45843dfb7a0e07 |
| Source archive SHA-256 | 2e85429a8fc9a0cb976706ae9ee63340b419007a4eb94859ef8d0aad7cad61d0 |
| Phone installation | Not yet confirmed |

The local Mac build ran in /Users/developer/CongressAppChallenge/releases/build18/HealthGroceryBuild18. Its previously trusted host identity was verified at 192.0.2.10. Existing Expo submission and Apple signing credentials were reused; no cloud build or plan purchase was made. Source/artifact transfers were hash-verified. Authoritative evidence is in /path/to/NutriGlimpse/artifacts/iphone-build18-2026-10-24/.

## Try this build

Open TestFlight, select Health & Grocery, and tap Update for **0.1.0 (18)**. Test one product photo, then Shelf Camera with several distinct packages; tap Finish to process a final group smaller than 16. Verify product identity, nutrient sources, alternatives and store selection. Fewer than three alternatives or unavailable aisle/stock information can still occur; this release does not claim those quality gaps solved.
