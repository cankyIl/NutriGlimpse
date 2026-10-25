# GPT-only product and shelf reviews — build 17 released from the Mac

Status: October 18, 2026, America/New_York. **Build 0.1.0 (17) compiled on the Mac, uploaded and verified Apple VALID / IN_BETA_TESTING for the existing owner group. GPT-only backend is deployed. Phone installation and physical acceptance are not yet confirmed.**

## Requested behavior and implementation

Claude Haiku is removed from all three production review loaders: the v5 web-sourced normal-photo path, the v4 path used for outside shelf alternatives/older clients, and the shelf-grid path. Each loads only the existing OpenAI credential and dispatches GPT-6 Luna. The optional bounded visual identity preview is also GPT-only; it never supplies nutrition. No new account or key is needed.

A successful review from the one configured model is complete, not partial. Expected-model completion is passed explicitly into the shared comparison logic; old dual-review schema values and regression fixtures remain readable. Historical Claude adapters are dormant and production loaders do not construct them. Requests from a phone cannot select or re-enable Claude.

The v4/v5 public capabilities both report only gpt-6-luna. Review request accounting reserves one review rather than two; the optional identity preview remains a separate GPT request. No old dollar cap was restored. The provider budget/reservation ledger is not a claim about billed charges.

Nutrition sources, missing values, serving/units, category/equal-weight comparisons, dietary restrictions, deduplication and the three-alternative maximum retain their checks. Single-model completion does not establish independently verified label accuracy. Source checking is still model-driven web search; no separate manufacturer-page scraper was added. Missing nutrition remains unknown. Older/shelf nutrition remains explicitly estimated.

## Phone and existing-build behavior

New scan responses already stop producing failed-second-review and cross-model disagreement states for existing builds. Version 17 updates capture/shelf privacy text to identify only OpenAI, replaces waiting text with Checking nutrition and alternatives, and uses neutral uncertainty wording for historical incomplete/conflicting results. Existing build 16 may retain its older disclosure/wait copy until updated.

News, measurements, report/lipid processing, native input, artwork, store fixes and both detector assets were preserved. No private scan photo was replayed or retained. No other persistent service was restarted, and clinical/privacy gates remain unchanged.

## Verification

- Full check: 580 core/service tests; nine tooling, ten report-input adapters, 11 news collector tests and news UI checks; all workspace typechecks and mobile lint passed.
- 57 production photo/home interaction scenarios passed with timing off and on; ten shelf-screen scenarios passed. These mock native/network boundaries and are not physical camera acceptance.
- New regressions cover GPT-only complete results, three passing alternatives, no extra provider/retry on failure, unknown source/nutrient holds, shelf-cell completion and cached repeat dispatch, and all production loaders working with only an OpenAI fixture key.
- iOS export passed. The fresh cloud archive has 326 files; six existing paths changed from build 16, no added/removed paths. Files exactly matched current source at freeze.
- Deployed public manufacturer-image scan: identity 1.501 seconds, complete result 11.459 seconds; models=[gpt-6-luna], reviewState=complete, sodium 620 mg per 125 g, linked source https://www.wegmans.com/shop/product/51558. No alternatives passed the unchanged checks. This single public-fixture result is not broad accuracy/latency acceptance.
- Public v4/v5 capabilities are available and GPT-only; other persistent service identities/start times are unchanged.

Evidence: artifacts/gpt-only-2026-10-18/ and artifacts/iphone-build17-2026-10-18/.

## Release dependency

EAS accepted the source upload but refused to create the cloud build because the account's free monthly iOS build allowance is exhausted. The tool reports reset on November 1, 2026. A subsequent build list contains no build 17. There is no compiled build-17 IPA, TestFlight upload or owner availability claim.

The user can restore EAS capacity through a chosen plan, wait for reset, or provide an accessible Mac with signing for a local build. No purchase or subscription change was made. Current TestFlight build 16 continues working with the deployed GPT-only backend. Preserve its completed release archive.

Before retrying the prepared build, recheck EAS/Apple for duplicates, verify current source against the frozen manifest, and retain the failed-attempt evidence. Do not reuse a stale archive over newer side-chat changes.

Remaining independent latency work: separate original-product facts from alternative research, carefully reuse recent exact-product sourced facts, and measure cold/repeat cases across multiple scans. Removing Claude eliminates its dispatch and disagreement; it does not guarantee fast web retrieval.

## User selected local Mac builds — October 18 follow-up

The user chose to use the existing Mac for now. No paid Expo plan is needed for that route. Authoritative development and the backend stay on project-server; the Mac is the iPhone build/signing machine. We will retain TestFlight distribution.

The initial .67 and .70 connection attempts failed. Connectivity is now verified at developer@192.168.50.10 using the existing congress_iphone_mac SSH identity; the first successful-network attempt had omitted this non-default identity. The host is MacBook-Air-8.local, user developer, macOS 27.0.1, Xcode 27.1, with about 52 GiB free.

Source was transferred and extracted into /Users/developer/CongressAppChallenge/releases/build17/HealthGroceryBuild17. All 326 file hashes match the frozen/current server source. The existing Mac workspace was preserved. Node 24.15.0, Ruby 3.4.11 and CocoaPods 1.17.0 were reused; Fastlane 2.241.1 was installed in the separate release tool directory. Locked npm dependencies are installed. Mobile/core typechecks and mobile lint passed on the Mac. A whole-workspace typecheck initially stopped because the phone release package intentionally excludes backend tsconfig/source; targeted phone/shared checks passed, and the earlier authoritative server full check remains valid.

The local-build helper has completed successfully on its second attempt. The Mac has only its historical development signing identity locally; EAS local build needs its own Expo authentication to fetch the existing paid-team distribution credentials. Automatic approval review rejected exporting the server's existing Expo session, and no credential transfer occurred. The user approved a fresh supported Expo device login as buldygaur; existing paid-team distribution credentials were retrieved successfully. This is local compilation, with no Expo cloud quota use or subscription purchase. Evidence: mac-preparation.json and the Mac release folder's verification and tool/check logs.

Prepared source archive: artifacts/iphone-build17-2026-10-18/mac-build17-source.tar.gz. All 326 file hashes match current source; archive SHA-256 feaf189fa34cecba9b08e1248e14ed8a4bba01c825aa656f3bcf9e00476cebdf. No private credentials or generated projects are included. Evidence: mac-preparation.json in the same folder. Recheck source changes before building to preserve later side-chat edits.

Local compilation and artifact verification are complete. The exact verified IPA was uploaded through EAS Submit; submission finished and Apple processing/owner TestFlight readiness are now verified. The earlier Personal Team development-install script does not produce a TestFlight release and must not be reused as if it does.

## Completed Mac compilation and submission checkpoint

- Mac: Xcode 27.1 / iPhoneOS 27.1 SDK, arm64, minimum iOS 16.4. Existing project source preserved in a separate release directory.
- First local attempt stopped before native compilation because the nested npm launcher could not resolve the EAS local plugin. Attempt two used the installed EAS CLI directly and completed. Failure evidence is retained; no app source was changed for this correction.
- Mac codesign deep/strict verification passed. Bundle org.cac.healthgrocery.beta0, version 0.1.0 (17), paid team A9Q6Z8Y58M, App Store distribution provisioning, debugging off. Native profile expiry 2027-10-16T13:56:49Z.
- IPA: 58,362,178 bytes; SHA-256 c59cbee14e884b46a1c79a37ed7fe847ccdb26a5bcb1921a7cea8198d9e45b82. Matching hash verified after transfer to the server.
- Release inspection passed: both compiled shelf detectors, hero image, news/report/native features, location/scene configuration, web-source and selected-retailer UI, GPT-only disclosures and removal of retired second-review copy. A checker initially assumed ASCII for a string the compiler stored as UTF-16; the checker was corrected to check both encodings, with no app/binary change.
- Submission ID: b3d0d4a6-329f-4352-98da-5952996d6dc7. No cloud compilation or plan purchase; EAS Submit only transfers the locally built artifact to Apple. No installation or physical acceptance claimed.
- Separate Gemini request: key stored privately; Google model metadata for gemini-3.5-flash-lite accessible. No generation/photo/personal-data request or live routing change. Experiments and integration await the user-requested discussion; Gemini is not part of build 17.

## Final TestFlight verification — October 18, 2026 Eastern

Submission b3d0d4a6-329f-4352-98da-5952996d6dc7 is FINISHED. Apple build 55ea5c56-9b13-4cf9-bf86-1dae81da4569 is VALID / IN_BETA_TESTING for version 0.1.0 (17). usesNonExemptEncryption=false is verified. The existing Beta 0 - Owner Testing group is attached and remains owner-only; no additional testers were invited. The exact release notes are verified. The final source check still matches all 326 frozen phone source files. Evidence: apple-build17-status.json, testflight-notes-verification.json, final-source-check.json, eas-submit-status.json, artifact-verification.json and mac-signature-verification.json.

The user can update Health & Grocery in TestFlight to 0.1.0 (17). This confirms availability, not installation or physical camera accuracy. Gemini experiments remain on hold for discussion and are not included in this release.
