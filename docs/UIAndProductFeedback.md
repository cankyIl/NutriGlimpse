# UI and Product Feedback

**Recorded:** October 16, 2026  
**Updated:** October 16, 2026  
**Status:** FB-01–22 implementation is included in build 4; automated/native checks pass and owner TestFlight access is confirmed. FB-07–08 personal AI use remains disabled pending review. FB-12 source expansion and FB-23 backend news selection are now implemented/deployed as DEV-30, with mobile source delivered in build 15.

The user authorized implementation of FB-01–08 in this side conversation. Work ran in `/path/to/NutriGlimpse` on project-server. The other session’s Apple/Expo signing, credentials, configuration and build upload were not changed. These changes are not in the already-built TestFlight 0.1.0 (1) package.

## Action items

| ID | Requested action | Delivered behavior | Status |
| --- | --- | --- | --- |
| FB-01 | Return home after Save My Needs | Successful save returns to the Scan home screen. Failed save stays on the page with entries retained; repeated taps cannot create duplicate saves. | Implemented; interaction checks pass |
| FB-02 | Remove “All eight conditions remain in scope. Sample ratings are illustrative …” | Removed the complete line from the shared profile editor. | Implemented |
| FB-03 | Capture and retain height and weight | Optional feet/inches or centimeters; pounds or kilograms. Safe unit conversion, input validation, editing, date confirmation, encrypted device persistence and backup/restore. Clear controls are provided. | Implemented; persistence and UI checks pass |
| FB-04 | Research credible sex/age/height/weight guidance | CDC adult BMI reference and limitations reviewed. Adult thresholds do not vary by sex; gender is not treated as sex. Children require a different reference and remain outside the existing 21+ beta scope. | Completed |
| FB-05 | Store reference data on backend | Versioned public reference rules saved at `data/guidance/weight-context-cdc-2026-10-16.json`, with source links, applicability and limitations. A regression test checks exact agreement with the executable rules. Personal measurements remain on the phone. | Implemented |
| FB-06 | Categorize privately | Current profile produces underweight, good weight, overweight or obese internally. Category is not persisted or displayed. Incomplete/invalid, stale, future-dated, unsupported-age or pregnant/unspecified-pregnancy inputs produce no category. | Implemented |
| FB-07 | Use category in product judgment | Review-gated code can prioritize already-supported nutrient explanations and alternative benefits. It cannot change general rating thresholds, invent weight/calorie targets, weaken adverse nutrient checks or bypass dietary evidence. Broader medical personalization is not enabled. | Integration implemented/tested; activation pending review |
| FB-08 | Send a simple fact to the LLM | Review-gated second-stage request supports “Weight category: overweight. BMI screening only; not a diagnosis.” Separate versioned opt-in is required. Exact height/weight, age, gender, name, location and labs are excluded. The image-identification stage receives no weight context. | Integration implemented/tested; production transmission blocked |

## Decisions and limitations

- CDC’s adult reference begins at age 20; this app retains its existing **21+ beta eligibility**. No pediatric categorization was activated.
- Adult reference thresholds: BMI below 18.5, 18.5–<25, 25–<30, and 30 or above. The requested “good weight” label maps to CDC’s healthy-weight category. BMI is a screening measure and does not distinguish muscle from fat.
- Pregnancy must be explicitly “not pregnant.” Missing or unspecified information is not inferred from gender.
- Validation bounds and a 180-day measurement freshness limit are conservative **app policies**, not CDC clinical thresholds. Saving unrelated profile changes does not silently refresh the measurement date. “These measurements are current” allows an explicit reconfirmation.
- Exact measurements are stored with units and date in the existing encrypted device profile, not in a new backend personal-data database. The internal category is recomputed from current inputs.
- Clearing fields on My Needs removes current-profile measurements after Save. Privacy → Delete saved height and weight also purges copies from saved in-app profiles and removes any weight-sharing preference. Previously exported backups are separate files.
- Both existing privacy and clinical-review gates remain closed. No new personal information was sent to OpenAI and no paid model calls were needed for testing.
- No backend restart, native rebuild, TestFlight upload, OTA update or iPhone installation was performed for this increment.

## Verification

- Full project typecheck and mobile lint.
- **393 core/service tests**, **7 tooling tests** and **10 report-adapter tests**.
- Existing **14 photo-screen scenarios**.
- New production My Needs interaction harness: navigation after success, failed-save retention/retry, duplicate-tap prevention, unit conversion/reload, invalid input, clearing, hidden category and hidden review-gated opt-in.
- Mocked native/network boundaries: these checks do not claim physical iPhone acceptance.
- Evidence: `artifacts/needs-feedback-2026-10-16/` on project-server.
- Detailed implementation and reference notes: [My Needs and internal weight context](needs-weight-context.md).

## Remaining actions

1. FB-01–08 are included in released build 3 and retained in build 4. Check the inputs, keyboard/layout, Save return, restart persistence and deletion on the updated phone.
2. Obtain qualified review of the weight-context application and verify the relevant health-data/privacy controls before activating FB-07/08. Then enable the narrowly scoped integration and obtain a fresh, explicit in-app opt-in. Category-only consent is separate from ordinary product-photo consent.
3. If weight context should change the actual colored rating or produce individual nutrition targets, define and clinically review that policy first. The delivered integration only changes the priority of verified factual explanations/benefits.

## Activity record

- **October 16, 2026:** Recorded FB-01–08 as notes only.
- **October 16, 2026:** User authorized execution. Implemented FB-01–06 and the review-gated FB-07/08 integration; verified the scoped changes and preserved the separate Apple/Expo release workflow.


## Additional feedback: compact scans and food news (October 16)

FB-09–15 add Berry & Citrus purple/lime styling, two compact scan actions, automatic photo-type detection, five original-article news links and a cached backend edition refreshed nightly at 02:00 Eastern. **The shared home/news implementation and backend timer are active; build-4 phone acceptance is pending.** Detailed action items and acceptance criteria: [home/news design](feedback-home-news-design.md).


## Ongoing enhancement register — October 16, 2026

The user requested that enhancements continue to be documented here. Keep a stable feedback ID, requested behavior, current state, dependencies, verification evidence and build inclusion for each item. Record later decisions as superseding earlier choices; do not mark a preview as implemented or a source change as installed.

| ID | Latest enhancement | Status at this documentation checkpoint |
|---|---|---|
| FB-09 | Berry & Citrus purple/lime colors; two compact camera buttons | Implemented: Berry & Citrus home and two compact actions; automated layout checks pass |
| FB-10 | Scan Your Product automatically handles a package front, barcode or nutrition table | Implemented: local front/barcode/nutrition classification; native camera acceptance pending |
| FB-11 | Five food-related news stories below the camera row, each linked to the original article with publisher/date | Implemented: dated original links with cached/offline/stale states; phone acceptance pending |
| FB-12 | Obtain and select credible, relevant food news | Six sources connected; seven-day freshness and backend selection verified. New client delivered in build 15 |
| FB-13 | Store a prepared shared news edition in the backend and serve it to the app | Implemented and deployed: atomic shared edition, validated public endpoint and ETag |
| FB-14 | Refresh news nightly at 02:00 Eastern, including stale/failure and daylight-saving behavior | Active user timer; once-per-day due guard, DST/restart catch-up and failure preservation tested |
| FB-15 | Verify on phones and include these enhancements in a subsequent iPhone build | Included in signed build 4; available in owner TestFlight; physical acceptance pending |

Detailed behavior, provider options and acceptance checks are in [the home/news design](feedback-home-news-design.md). Engineering work remains tracked in [the project plan](ImplementationProjectPlanDocument.md). Keep the authoritative server documents and their laptop mirrors synchronized after documentation checkpoints.

## Product-photo results — FB-16–22

The user reported two unavailable reviews in four Honey Nut Cheerios scans, too few alternatives, missing package photos and ambiguous placement of product details. They subsequently selected an **LLM-first display with optional USDA/Open Food Facts checks inside each product card**, and requested a preview image before another upload. This direction supersedes automatic database-first replacement for the primary product view; estimates must remain distinguishable from verified label facts.

| ID | Enhancement | Current state |
|---|---|---|
| FB-16 | Diagnose intermittent review failures; improve recovery | Implemented: one model stage, bounded timeouts, alternative isolation and explicit recovery; exact historical failures not proven |
| FB-17 | Seek up to three distinct suitable alternatives | Implemented: up to five candidates checked for three distinct alternatives; final three public fixtures return three |
| FB-18 | Real small photos on original and alternatives | Implemented: transient original photo and attributed matching OFF reference photos; missing/upstream-failed photos use package icon |
| FB-19 | LLM-first product information, clearly identified estimates | Implemented: LLM-first estimates, independently guarded general ratings; no personal data sent |
| FB-20 | Optional USDA/OFF check inside the same product card | Implemented: optional per-card source check; possible matches never silently replace primary facts |
| FB-21 | Consistent per-product Food Facts button and inline expansion | Implemented: Food Facts expands inside its own card; interaction checks pass |
| FB-22 | Show an image before upload; continuously document enhancements | Preview approved; implementation and native checks complete; build 4 available in owner TestFlight |

See [product-photo design, evidence and acceptance steps](48-product-photo-enhancements.md). The approved preview uses Berry & Citrus; FB-09–15 home/news implementation is included in the combined build. Sample ratings and nutrient values are illustrative. Existing FB-01–08 runtime changes were included in released build 0.1.0 (3); their earlier next-build handoff above is historical. Medical-personalization and weight-transmission gates remain closed.


## Approved combined implementation checkpoint

FB-09–22 have moved from preview/requested to implemented and automated-tested. FB-01–08 remain included. Build 4 native checks pass and owner TestFlight access is verified. Physical acceptance is not yet claimed. See [release evidence and current limitations](49-approved-cards-and-home-release.md).


## FB-12 source expansion requested October 16, 2026

User-selected additions: **The Nutrition Source, EatingWell and Clean Eating**. The Nutrition Source is already configured in the shared news collector. EatingWell and Clean Eating are now connected through their RSS feeds; ScienceDaily nutrition RSS was added October 18. Only dated headline links are retained. Favor useful food/grocery content with credible sourcing; distinguish evergreen education from recent news. The 30-50 article pool is a target, not a guaranteed daily volume.

See [current source roles and release boundary](69-daily-personalized-food-news.md). The October 16 documentation-only checkpoint is superseded by the October 18 source/backend implementation; native release remains separate.


## FB-23 Audience tailored news — delivered in build 15

The user requested news tailored to the audience using relevant information already entered in My Needs. Prioritize useful stories for selected interests/concerns, General Fitness or No Concern, dietary preferences and restrictions, while retaining a varied general-food selection. Use age/demographics only where specifically applicable; do not infer a diagnosis or activate private weight/lab transmission.

**Status: implemented and backend deployed October 18; mobile source delivered in build 15; physical acceptance pending.** The user explicitly chose backend selection: send only useful topic-related profile fields, choose up to five from the daily pool, and request general news when details are missing/non-specific or General is selected. No profile data goes to publishers, AI or news logs. Only general stories are cached offline. Existing personalized-medical gates remain closed. [DEV-30 implementation and evidence](69-daily-personalized-food-news.md).

Action items and acceptance checks: [audience tailored food news](feedback-home-news-design.md#fb-23-audience-tailored-food-news). This is an enhancement after the existing shared edition and does not alter the concurrent iPhone release.


## News publisher inventory documented

The [news source register](feedback-home-news-design.md#news-source-register) now lists the discussed publisher collections, their intended role and configured/pending status, plus optional discovery services. Six collections are now configured and live-tested: The Nutrition Source, Tufts Now, NIH Research Matters, EatingWell, Clean Eating and ScienceDaily. Four additional collections remain proposals. This inventory accompanies completed FB-12/FB-23 implementation and their remaining native release/phone acceptance.

## FB-24 Photo connection failure correction

Owner reports every photo fails on home Wi-Fi. Reproduced a React Native API mismatch after successful server responses; portable cancellation checks and accurate failure messages now pass regression testing. Build **0.1.0 (5)** is available to the existing owner group in TestFlight. Physical retest pending. [Evidence](50-photo-connection-runtime-fix.md).


## FB-25 Faster photo results and reliable reference photos

**Implemented October 17, 2026; available in TestFlight build 6.** Show the complete validated original card first, then alternatives as they pass unchanged nutrition checks. Retained high-detail image input, GPT-6 Luna, full nutrient output and the five-candidate pool for three qualified alternatives. Deployed HTTPS fixture: first card 2.9 seconds; all three alternatives by 6.0 seconds; full request 8.4 seconds. Phone performance remains unmeasured. Native OCR overlaps independent preparation with unchanged quality settings.

Missing Shredded Wheat/muesli pictures were caused by sparse catalog media, an unreliable legacy search route and skipped concurrent searches. The working OFF search API now fills a persistent public metadata cache with strict reference-photo matching and attribution. Fixed client image delays removed. Matching photos for both reported cereals and Original Cheerios verified; unavailable exact matches still show a placeholder. [Evidence](51-faster-photo-results-and-images.md).

## FB-26 Toggle source details

**Implemented; available in TestFlight build 6.** Check USDA / OFF opens source facts within the selected card. The same action becomes Hide USDA / OFF and closes them; reopening reuses the fetched source response. The original estimate and other cards remain independent. Production-component interaction checks pass.


## Quiet photo capture - October 17, 2026 side conversation

**Included in TestFlight build 7; native compile passes; physical sound behavior remains to be checked.** The user requested removal of the photo shutter click. `MemoryPhotoView.swift` now enables Apple's `isShutterSoundSuppressionEnabled` on iOS 18+ only when `isShutterSoundSuppressionSupported` is true. Older/unsupported devices retain system behavior to avoid an invalid capture setting. The four-line addition leaves image quality, OCR, JPEG preparation, recognition and visual shutter feedback unchanged. Mobile typecheck and lint pass on project-server. No native compile or physical sound check was performed for this change, and no build/upload was started from this side conversation. It is not in build 6; subsequent build 7 includes it.

Apple API reference: https://developer.apple.com/documentation/avfoundation/avcapturephotosettings/isshuttersoundsuppressionenabled


## FB-27 Private beta query and decision log

**Implemented and enabled on the backend October 17, 2026.** User requested a reviewable history of why alternatives/photos are missing. New requests retain bounded structured product estimates, model/calculated/displayed ratings, every candidate's acceptance/rejection reason, safe request errors/timing and image/source lookup outcomes. Up to seven days / 2,000 private events; no raw photos, OCR, personal health data or credentials. Existing build 6 is compatible; no upload needed. Full checks pass (429 core/service tests); 12,000 synthetic cases preserve previous decisions. [Details and operator access](52-beta-decision-diagnostics.md).

Earlier scans cannot be recovered. A new scan can expose the actual decision; a synthetic spread case confirms the existing general fiber/protein requirement can eliminate lower-saturated-fat alternatives. Category-aware improvement was subsequently completed in DEV-18 / FB-29. Phone image rendering and local-only filters are not observable from backend lookup logs. Privacy notice for the short-lived diagnostics must accompany additional tester onboarding / the next native copy update.


## FB-28 Temporary scan timing - remove before Beta 1

**Implemented, backend deployed, compiled and available in TestFlight build 7; physical timing validation pending.** Record the time from shutter press through native preparation, upload/AI stages, first-card layout and alternatives. Numeric-only timing reports use the existing short-lived private diagnostics store. No photos or health information are added. Timing can be disabled; a release guard blocks Beta 1/production while temporary modules/hooks remain, even if switched off. **Removal is mandatory before Beta 1.**

440 core/service tests, nine tooling tests, ten input-adapter tests, 28 screen scenarios with timing both on and off, typecheck/lint and iOS JavaScript export pass. Build 7 subsequently passed native compilation and is available to the owner; phone retest is pending. [Measurements, controls and removal checklist](53-beta0-scan-timing.md).


## FB-29 Category-aware alternatives and rating disagreements

**Implemented, tested and deployed October 17, 2026.** A green calculation with a neutral model rating can qualify after all comparison checks. Supported spread, tomato-sauce and cereal categories can return meaningfully improved neutral alternatives while retaining yellow ratings; low fiber/protein may stay equal, but neither may decrease at equal weight. Missing nutrients, identity/category mismatch, red/trans-fat signals, worsening concerns, excessive calories and duplicates still exclude a candidate. Up to three distinct passing products, never forced padding.

454 core/service tests, nine tooling tests, ten adapters and 31 component scenarios (timing on/off), typecheck/lint pass. Frozen build-6 schema/client compatibility verified. Three public live checks respect candidate and uncertainty gates; no accuracy guarantee. Existing app displays the cards, while yellow-card relative benefit text is included in TestFlight build 7. [Policy and evidence](54-category-relative-alternatives.md).

This item is FB-29 to avoid the FB-28 identifier used by temporary scan timing. Source-only native timing/shutter changes are preserved. No new iPhone build/upload was performed.


## Build 7 release checkpoint — October 17

Improved relative explanations, supported quiet capture and temporary scan timing are now compiled and available to the existing owner in TestFlight **0.1.0 (7)**. Earlier news/My Needs/source-toggle changes are preserved. Short-lived diagnostics are disclosed in Privacy and the initial photo notice. Physical acceptance, additional news backlog and mandatory timing removal before Beta 1 remain open. [Verified release](55-build7-alternatives-and-camera.md).


## FB-30 Enable app screenshots - October 17, 2026

**Included in TestFlight build 8; physical screenshot/app-switcher checks pending.** The user confirmed that “app photos” means screenshots. Removed the session-wide screenshot restriction by allowing screen capture with the existing private-session key. Users can capture foreground app screens; the existing iOS background/app-switcher blur stays enabled. This also allows foreground screen recording. On Android the shared secure-window screenshot restriction is removed; the separate blur API is iOS-only. No screenshot monitoring, photo-library permission or new data collection was added.

Workspace typecheck and mobile lint pass. Physical iPhone screenshot and app-switcher checks remain pending in an updated build. Current published build 7 is unchanged; this side conversation did not build, upload, deploy or send an OTA update. The quiet-camera and temporary timing changes remain intact. Source: `apps/mobile/src/storage/privacyLifecycle.native.ts`. Expo SDK 57 API reference: https://docs.expo.dev/versions/v57.0.0/sdk/screen-capture/


## FB-31 Alternatives address the original concern first

Implemented, automated-tested and backend deployed; compiled and available in TestFlight build 8. Explicit original adverse reasons lead the explanation, then secondary improvements. A genuine sodium reduction below the 25% qualification cutoff can be explained accurately when another improvement meets that unchanged qualification. A candidate must also improve the leading concern by at least 10% and the existing absolute difference floor; sugar alone cannot qualify a sodium-led original. Other original concerns that are not meaningfully improved are disclosed before unrelated benefits. Colors, equal-weight comparison, completeness, zero-trans-fat/red, worsening nutrient/calorie and dietary checks remain.

462 core/service and 33 screen scenarios pass, including the sauce regression, unchanged primary concern, equal-weight portion manipulation, secondary concerns and trans-fat priority. The side-chat screenshot change is included in build 8; physical acceptance remains open.


Build 8 delivery verified: original-concern explanations and screenshot support are available to the existing owner TestFlight group. Native package contains both changes and retains the prior camera/timing/news/My Needs enhancements. [Policy, tests and delivery evidence](56-original-concern-alternatives.md).


## FB-32 Compact AI response and early original-product preview

**Backend deployed; compiled and available in TestFlight build 9. Physical acceptance pending.** The user approved speed suggestions 1 and 2. The original product card shows the captured photo first, then the AI identity, then its checked rating/food facts; alternatives remain separate cards underneath. There is no invented name or early health color. A compact provider-only format preserves every nutrition/ingredient field and the existing five-candidate/three-passing-alternative checks. Older clients remain compatible.

468 core/service tests, nine tooling tests, ten adapters, 37 screen scenarios with timing both on/off, typecheck/lint and iOS JavaScript export pass. Synthetic JSON is 40.3% smaller. The main release session subsequently completed six bounded paired live comparisons and two deployed HTTPS compatibility calls. This limited sample is not a general accuracy or physical-phone speed claim; native delivery and phone acceptance are tracked in [build 9](58-build9-early-product-preview.md). The temporary timings distinguish previews from checked results and remain scheduled for removal before Beta 1. [Implementation, evidence and release checks](57-compact-photo-preview.md). No deployment, native upload or paid model calls were performed by this side conversation.


Build 9 delivery verified: FB-32 is included with the latest concern-first alternative logic and retained side-chat work. Apple VALID / IN_BETA_TESTING and owner-group access are confirmed. Earlier source-only references describe the side-chat checkpoint. [Combined verification and phone checklist](58-build9-early-product-preview.md).


## FB-33 Accept alternatives that cross below the high-sodium cutoff

**Backend deployed; corrected sodium-first explanations delivered in TestFlight build 10.** User rejected excluding Prego/Classico solely because their sodium reduction was below 10%. A genuine drop from ≥460 mg to <460 mg at equal original serving weight now qualifies even below the percentage/amount floors. Absolute ratings and all other nutrition/dietary checks remain. The model prompt follows the same rule.

475 core/service tests and 39 screen scenarios pass; private in-memory replay changes one accepted candidate to three while preserving saturated-fat exclusions. Build-9 client compatibility and public HTTPS verified; no paid calls, new native build or OTA update. The mobile helper was subsequently compiled and delivered in build 10; its sodium-first explanation replaces the generic fallback on newly eligible cards after updating. Build 9 still uses the older helper. [Policy, tests and release boundary](59-sodium-cutoff-alternatives.md).


## FB-34 Parallel nearby availability within alternative cards

**Backend deployed October 17; mobile UI delivered in TestFlight build 10. Physical acceptance pending.** Search only the accepted alternatives, starting one independent SerpApi request per card. Show **checking location ..** inside the card; keep product facts/images/reasons available while searches run, and display each result immediately. Selected grocery-store address is preferred; otherwise send approximate coordinates. Exact product/variant/size filtering, explicit multipack/unknown-size notes, source-reported pickup/stock and unconfirmed-listing labels prevent misleading availability claims.

487 core/service tests, nine tooling tests, ten adapters and 47 component scenarios (timing on/off), typecheck/lint and iOS JavaScript export pass. Three concurrent public-HTTPS checks and result-cache reuse pass; photo routes and portfolio remain healthy. Build 10 includes these cards and is available to the owner group. No account/key is needed from the user for this integration; physical store/phone checks remain. [Detailed evidence and release checklist](60-nearby-alternative-availability.md).



## Build 10 delivery — FB-33 and FB-34

Sodium-first explanations and nearby-store cards are now compiled and available in TestFlight **0.1.0 (10)**. Apple VALID / IN_BETA_TESTING and existing owner-group access verified. Combined 487 core/service tests, nine tooling tests, ten adapters and 47 screen scenarios in each timing mode pass, with typecheck/lint, news/My Needs checks, iOS export and native/IPA inspection. Prior source-only/native-pending notes record the earlier side-chat checkpoint and are superseded by this delivery. Physical acceptance remains pending. [Build 10](61-build10-sodium-and-nearby-stores.md).


## FB-35 Shelf Camera: best fit among visible products

**Goal clarified; design discussion in progress, not implemented in build 10.** Scan cereal, bread, pasta sauce, cheese, milk or juice shelves containing comparable products across brands. Identify distinct products, weigh benefits and drawbacks against selected needs and restrictions, and highlight the best-supported choices actually observed. Keep relative ranking separate from absolute rating; preserve uncertain/missing evidence and all privacy/clinical gates. No new AI upload, spending or release in this checkpoint. [Detailed scope and remaining design](62-shelf-choice-goal-and-design-discussion.md).


**FB-35 follow-up:** Choose the best supported product from the scanned shelf, then show up to three suitable alternatives through the normal single-product flow if even that winner is Neutral or Not healthy. Preserve rating-disagreement handling and all nutrient/dietary checks. Alternatives address the winner's leading drawbacks and appear separately from the scanned products; no implied shelf presence or stock. Design requirement only; build 10 unchanged.


## FB-36 Repeat-scan consistency and missing alternative recovery

**Observed; not fixed yet.** An eligible Neutral / Not healthy result can receive an empty or undersized model alternative list, which the backend currently accepts without recovery. A subsequent diagnostic also confirmed that filtering an undersized candidate pool can leave only one passing alternative; do not relax checks or guarantee three. Another scan of the same identified formulation can use a different category and different estimated nutrients, changing candidate selection. Normalize category/formulation handling, preserve uncertainty, distinguish absence of proposals from rejected proposals, and add bounded recovery and regression checks without weakening nutrition/dietary criteria or silently increasing paid requests. Keep private diagnostic records on the server; this note contains no scan identity or raw record. Build 10 and deployed behavior are unchanged.


## FB-37 Prefer alternatives in the selected store

**Requested; not implemented in build 10.** The shopper should first see suitable alternatives associated with the store they selected, followed by clearly separated options elsewhere when necessary. Current generation ignores store context; the later availability search only finds nearby listings for already-selected alternatives. Address candidate selection and listing order together. Preserve all nutrition/dietary checks and distinguish chain association from verified branch stock. Do not infer current location from product brand. No app/backend code, new build, paid search or model call changed in this checkpoint.


## FB-38 Grocery, nutrition and heart-health landing artwork

**Implemented, tested and delivered in TestFlight 0.1.0 (11). Physical acceptance pending.** User approved the visual preview: a smaller cart with produce and cereal/chips/pasta/sauce/cheese/butter, a realistic Nutrition Facts panel with green sugar/red sodium rows, and a heart/ECG icon. Removed the requested footer text. Artwork is bundled offline, with an accessible image description and no added image network request. Berry/Citrus palette, bold food-understanding line, current-store chooser, primary scan and shelf actions, news and lower home links are preserved. Latest side-chat dual-model review and consent are included in the same frozen release. [Build 11 evidence](64-build11-grocery-landing-and-dual-review.md).


## FB-39 Oversized native home artwork

**October 18: confirmed on the user's iPhone; corrected and delivered in TestFlight build 12.** Build 11 retained the static PNG's intrinsic height, rendering the cart at 1448 × 1086 points and showing a cropped wheel. Native Yoga reproduces the defect. Explicitly clearing the inherited height restores the complete 4:3 composition at the available width. The approved artwork and all side-chat features are retained.

503 core/service tests, 52 screen scenarios per timing mode, native layout cases, lint/typecheck and iOS export pass. Build 12 compiled, passed IPA inspection, uploaded and is Apple VALID / available to the existing owner group. Corrected physical rendering still requires the user to update and verify. [Incident and release evidence](65-build12-native-home-image-fix.md).

## FB-40 Serper Google Shopping fallback

**October 18: implemented, backend deployed and delivered in TestFlight 0.1.0 (13).** Serper was configured but not called by the active availability flow. The new client now supports a bounded second search when SerpApi provides no confirmed local stock or fails. Exact brand/variant/package checks remain; generic Shopping listings never claim branch stock. Results identify the actual provider, and Privacy documents product/canonical-city sharing. Older builds retain their valid SerpApi-only contract.

517 core/service tests, nine tooling, ten adapters, 52 screen scenarios per timing mode, typecheck/lint/export and bounded live/public verification pass. No additional account input required. Native/IPA/Apple owner access verified; physical acceptance pending. [Implementation and release evidence](66-serper-shopping-fallback.md).

## FB-41 On-device shelf crops and 16-product grids

**October 18: implemented, backend deployed and delivered in TestFlight 0.1.0 (14). Physical acceptance pending.** The user's latest N = 16 supersedes the earlier 12-product draft. The iPhone detects package regions with Core ML/Vision, crops from the source frame, checks readability and repeat sightings, and builds numbered 4 x 4 grids locally. Full batches process during scanning; Finish sends the smaller remainder. GPT-6 Luna and Claude review through the backend, with strict cell association, checked ratings, product-photo cards, same-category leading choices and up to three suitable outside alternatives per selected leader when needed. No manual category choice or catalog match is required before recognition.

531 core/service tests, nine tooling, ten adapters, 52 existing screen scenarios per timing mode, My Needs and ten new shelf scenarios pass; iOS export passes. One attributed public 16-cell grid completed in 15.387 seconds; nine ambiguous cells stayed unrated. This does not establish physical accuracy. Source retains side-chat changes; original shelf detectors remain bundled. [Implementation, release and acceptance limits](68-shelf-grid16-release.md).


## October 18 — DEV-30 news implementation checkpoint

FB-12 source expansion, FB-14 freshness/retry validation and FB-23 backend selection are implemented. Six responding sources produced 23 current candidates; Clean Eating currently contributes zero because its feed is old. 550 core/service tests, 11 collector tests, focused news UI, existing photo/home and My Needs checks, typecheck/lint and iOS export pass. Backend deployed; mobile release/phone acceptance pending. [DEV-30 implementation and evidence](69-daily-personalized-food-news.md).


## Build 15 delivery — October 18

The news source expansion, freshness controls, minimized profile request, backend selection, General fallback and privacy/UI changes are now in **0.1.0 (15)**. Apple VALID / IN_BETA_TESTING and the existing owner group are verified. Earlier next-native-release notes are superseded; physical phone acceptance remains. [Release evidence](70-build15-fresh-personalized-news.md).
