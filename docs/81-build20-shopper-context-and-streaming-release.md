# Build 20: shopper context and streamed product results

Released October 25, 2026, 10:18 a.m. Eastern. Version **0.1.0 (20)** is **VALID / IN_BETA_TESTING**, available to the existing Beta 0 - Owner Testing group. Owner installation and physical acceptance have not been observed.

## Included

- Optional, separate sharing choice for available age/gender, reported health concerns, preferences, measurements and confirmed date-resolved lipid values. Continue without sharing remains available; Privacy can clear the choice.
- Eating and food preference fields in My Needs, saved in the existing encrypted profile.
- Early product identity, then complete original and alternative cards as Gemini responds. An explicit in-progress message and cancel action remain after the first card.
- Existing native camera/onboarding fixes, 16-cell shelf flow with GPT-6 Luna, news, source toggles, artwork and both shelf detector models are preserved. Detector rights/source-publication status is unchanged.
- The approved Gemini first-person prompt and native Google Search are already live on the backend. This release does not restart or modify backend/portfolio services.

## Verification

The feature checkpoint passed full workspace checks: 697 core/service tests, tooling/report/news checks, 64 photo scenarios in both timing modes, ten shelf scenarios and iOS JavaScript export. On the Mac, dependency installation, mobile/core typechecks and lint completed; one existing hook lint warning remains. Xcode 27.1 built the signed distribution IPA successfully. Code signature was checked using codesign --verify --deep --strict. IPA checks verify the bundle/build/version, distribution provisioning, camera/location descriptions, arm64, scene lifecycle, both compiled detector models, retained news/artwork and new sharing/preference/streaming markers. Minimum supported iOS is 16.4.

An inherited package-check assertion referred to superseded privacy wording, 'up to seven days'. It was updated to assert the actual reviewed wording, 'Only bounded timing, usage and outcome codes'; the full inspection then passed. This changed the verification helper only, not the compiled source or retention behavior.

All 336 frozen release paths match the authoritative server and the Mac after compilation. No earlier source files were removed. The Mac host key matched its previously trusted identity; the existing project SSH key worked at 192.0.2.10. No credentials were changed or requested. No additional model call, paid cloud compilation, OTA or new tester invitation was made for this release.

## Release identifiers

| Item | Value |
| --- | --- |
| App | 6823645787 / org.cac.healthgrocery.beta0 |
| Version/build | 0.1.0 (20) |
| EAS submission | 09e82214-ec42-4176-a9a9-bd197567dde1 — FINISHED |
| Apple build | c593108a-511f-45cf-a6ff-b81c55846754 — VALID |
| Internal testing | IN_BETA_TESTING; existing owner group verified |
| External testing | READY_FOR_BETA_SUBMISSION; not approved for external testers by this release |
| Encryption declaration | usesNonExemptEncryption=false, verified |
| Release notes | en-US, saved and read back successfully |
| IPA size | 58,590,797 bytes |
| IPA SHA-256 | f8e47e2b819c6812c75c3b7b2059bc17453e2cbef505906d1508c6f2a006f190 |
| Source archive SHA-256 | bdf7f01ada4f4387d6839edf3d88689839f439a078329f00fa5d975b4a63a448 |

## Phone acceptance

Open TestFlight, select Health & Grocery and update to **0.1.0 (20)**. On the first product scan, choose whether to share health details. Test that a product title appears first, followed by its nutrient card and alternatives; cancel/background while it is loading, then retry a fresh scan. Save optional preferences in My Needs and confirm they persist after reopening. Exercise both the iPhone X / iOS 16.7.16 and iPhone 17, including repeat camera open/capture/back cycles, setup-to-home navigation and shelf Finish.

Automated checks and a signed build do not establish physical camera, network or nutrition accuracy. The known unverified sauce sodium mismatch (400 mg returned versus the user's 620 mg label) and broader alternative/store evidence quality remain open. The new context supports general nutrition guidance, not diagnosis, treatment or individual nutrient targets.

Evidence: /path/to/NutriGlimpse/artifacts/iphone-build20-streaming-2026-10-25/ and feature evidence in artifacts/gemini-shopper-stream-2026-10-25/. Mac release: /Users/developer/CongressAppChallenge/releases/build20/HealthGroceryBuild20.
