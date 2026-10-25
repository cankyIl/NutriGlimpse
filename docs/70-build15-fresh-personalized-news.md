# Build 15: fresh food news and backend selection

Updated October 18, 2026.

**Status: Build 0.1.0 (15) is Apple VALID / IN_BETA_TESTING and available to the existing owner TestFlight group.** Build-specific notes and encryption answer are verified. Physical iPhone acceptance remains pending.

## Included changes

- EatingWell, Clean Eating and ScienceDaily join Harvard Nutrition Source, Tufts Now and NIH Research Matters. Original dates are shown; articles older than seven days are excluded.
- The backend selects up to five news stories using only relevant selected interests from My Needs. No useful profile information, or choosing General, requests general news.
- For you/General preference, refresh on profile change/foreground/new day, manual refresh, general-only offline caching and expired-story removal.
- Onboarding/privacy wording explains the limited backend use. Exact age, gender, height, weight, name, location and lab results are excluded from news requests.
- Build 14's shelf grids, photo recognition, product cards, food comparisons, nearby stores and previous side-chat features are retained.

The six-source collector, backend selection and daily 02:00 Eastern schedule were already deployed and verified in [DEV-30](69-daily-personalized-food-news.md). This release did not restart or redeploy the backend. Daily article changes do not require more builds.

## Verification

- Full release check: typecheck/lint, 550 core/service tests, nine tooling tests, ten input-adapter tests, 11 news-collector tests and news UI interactions pass.
- Existing 52 photo/home scenarios pass in both timing modes, plus My Needs and ten shelf scenarios. Native/network boundaries in component tests are mocked.
- Frozen EAS archive: 324 files; relative to build 14, zero removed, eight changed, five added. Only news-related source/settings and the iPhone build number differ. Shelf-grid native code/screen and approved hero artwork hashes are unchanged.
- No shared source files changed between archive creation and final verification. Later edits, if any, belong to a subsequent release.
- Cloud native compilation passed. The signed IPA contains the backend-selection route, all six publisher names, news controls/privacy text, prior side-chat markers, hero artwork and both shelf detector models.
- Package checks confirm arm64, bundle org.cac.healthgrocery.beta0, version/build, store-distribution provisioning, no debugger entitlement, camera/location permission descriptions, scene lifecycle and encryption declaration false.
- ZIP integrity and provisioning CMS signature are checked. Full app code-signature verification and device execution are not claimed by Linux package inspection; Apple processing completed VALID.
- The existing Expo Doctor patch-alignment warning matches build 14 exactly (20 of 21 checks pass). No dependency versions were changed for this release.
- Upload finished; Apple VALID / IN_BETA_TESTING; existing owner group and exact testing notes verified. No new tester invitations, external-review submission, public release or OTA update.

## Exact release identifiers

- EAS build: 1e3f7396-e686-489d-acc9-2db00d08343e.
- Submission: bb511d9c-d8d5-4dff-b589-e37b2b601d2a.
- Apple build: fcb74305-4c79-4f00-b290-2b072d3031fe.
- App Store Connect app: 6823645787.
- Version: **0.1.0 (15)**.
- IPA SHA-256: 35d99d2ef432928dad6970ccabf9858e7d5c046313a82e6303d782284a269de4.
- Evidence: artifacts/iphone-build15-2026-10-18/.
- Frozen source: artifacts/iphone-build15-2026-10-18/cloud-archive/.

## Phone check

Open TestFlight, select Health & Grocery and update to **0.1.0 (15)**.

Check the news section with General and For you, change a health focus in My Needs and confirm the selection updates, open an article, try Refresh stories, and test offline general fallback. Check that article dates remain visible. Clean Eating currently has no eligible recent stories; connection does not guarantee a new item every day.

Retest existing product scanning and the build-14 shelf flow. Only hands-on testing can establish physical-device networking, layout and behavior. Installation is not claimed.

Earlier DEV-30 next-build entries are superseded by this verified delivery. Personal medical recommendations and existing provider/model-distribution decisions are unchanged.
