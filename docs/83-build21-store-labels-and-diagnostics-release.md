# Build 21: simple store labels and returned-answer diagnostics

Released October 25, 2026, 11:07 a.m. Eastern. **0.1.0 (21)** is Apple **VALID / IN_BETA_TESTING**, available to the existing owner-only TestFlight group. Phone installation and physical acceptance are not verified.

## Included

- Simple Store: Wegmans-style labels; a returned retailer name remains visible when its product link is missing. Aisle number/name is shown only for the current store with supporting branch evidence. Stock-status paragraphs are removed from this Gemini card view.
- New beta notice and versioned consent for encrypted returned-answer diagnostics: up to seven days, 200 scans and 40 MiB of encrypted payload. It discloses that responses can echo voluntarily shared health details. Photo/profile input, hidden model reasoning and credentials are not retained. Existing builds without this new notice keep minimal diagnostics.
- Existing optional health/lipid sharing, preferences, streaming, source toggles, news, artwork, shelf grids/models, reports and camera/onboarding fixes are retained.
- Backend additionally tolerates missing source links and optional JSON fields without discarding the whole answer. Valid alternative cards survive another malformed/unnamed alternative. Missing nutrients remain unknown; clinical/dietary checks are preserved. Backend source changes do not require another iPhone build.

## Verification

Full checks: 712 core/service tests, workspace typechecks/lint, tooling, report-input, onboarding and news checks. Photo harness: 68 scenarios in each timing mode. Ten shelf scenarios and iOS JS export pass. The pre-existing AiProductCard hook dependency warning remains.

Xcode 27.1 compiled the signed IPA on the Mac. Full codesign verification and package inspection pass: minimum iOS 16.4, arm64 distribution profile, camera/location descriptions, scene lifecycle, both detector models, artwork/news/sharing/streaming and new store/diagnostic markers. The Mac emitted a simulator-runtime version warning; the physical-device distribution build completed successfully. Native test boundaries are mocked; a signed build is not physical camera acceptance.

All 336 frozen source files match the authoritative server and Mac after compilation. Seven intended phone/shared files differ from build 20; no source files were removed. Side-chat features are preserved. No new testers or OTA update were added.

Final live HTTPS cereal test before the subsequent missing-field-only extension: first identity 4.999 s, original card 5.811 s, final 7.599 s; two alternatives retained Wegmans, four native queries, no retailer follow-up. Returned public answer and processing decisions were recovered from the encrypted journal. This run does not establish exact nutrition or store stock. The known nutrient/formulation accuracy and physical-device acceptance items remain open.

## Release identifiers

| Item | Value |
| --- | --- |
| App | 6823645787 / org.cac.healthgrocery.beta0 |
| Version/build | 0.1.0 (21) |
| EAS submission | fbe223f7-5401-4b52-93ac-6780286ea01c — FINISHED |
| Apple build | 22df0b1a-be96-4c4f-bb94-d3be8303855a — VALID |
| Internal testing | IN_BETA_TESTING; existing owner group verified |
| External testing | READY_FOR_BETA_SUBMISSION; not externally approved by this release |
| Encryption declaration | usesNonExemptEncryption=false, verified |
| Release notes | en-US, saved and read back |
| IPA bytes | 58,591,386 |
| IPA SHA-256 | ecef8b37e0688aaf454e05702d30e6a5821b303e74831a883a73dd8e31a16b96 |
| Source archive SHA-256 | c9a9f2a319b82337255bd3f150eec55b303616a95f5ec0e935d55ccda8e48291 |

## Phone check

Update through TestFlight to build 21. On the first photo scan, read the revised beta diagnostic notice and choose whether to share health details. Confirm original and alternatives retain their store names, omit unsupported aisles and keep Food Facts accessible. Check a streamed scan, cancel/back and repeated camera capture on iPhone X/iOS 16.7.16 and iPhone 17. Responses are stored only after the new notice is accepted; old responses cannot be recovered retroactively.

[Exact behavior, prompt and privacy details](82-store-labels-and-response-diagnostics.md). [Editable field/fallback table](Gemini-Response-JSON-Field-Handling-Draft.txt).

Evidence: artifacts/iphone-build21-retailers-2026-10-25/ and artifacts/retailer-response-journal-2026-10-25/. Mac release: /Users/developer/CongressAppChallenge/releases/build21/HealthGroceryBuild21.
