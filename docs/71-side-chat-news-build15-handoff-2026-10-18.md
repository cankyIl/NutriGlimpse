# Side-chat handoff: daily food news and TestFlight build 15

Prepared October 18, 2026, America/New_York, for the main project chat. Source session: `01a14a70-6736-7e61-8dae-b666f37e3bf3`. This document records verified state and clarifies earlier statements; it does not authorize another build, deployment or behavior change.

Authoritative workspace: `/path/to/NutriGlimpse` on `project-server`, user `developer`, SSH alias `project-server`. Local documentation mirror: `C:/Users/developer/OneDrive/Documents/ChatGPT/Congressional App Challenge 2/docs`.

## 1. Current delivery and exact evidence

**Build 0.1.0 (15) is uploaded, Apple VALID / IN_BETA_TESTING and available to the existing owner TestFlight group. Installation and physical acceptance are not verified.** The owner has been told to open TestFlight, select Health & Grocery and update to build 15. Do not repeat the upload.

| Item | Verified value |
| --- | --- |
| EAS project | `buldygaur/grocery-app-preview` |
| Bundle identifier | `org.cac.healthgrocery.beta0` |
| EAS build | `1e3f7396-e686-489d-acc9-2db00d08343e` |
| EAS submission | `bb511d9c-d8d5-4dff-b589-e37b2b601d2a` |
| Apple build | `fcb74305-4c79-4f00-b290-2b072d3031fe` |
| App Store Connect app | `6823645787` |
| Existing owner group | `7f71e231-04c1-42e4-9911-f0cd52037323`, Beta 0 - Owner Testing |
| Encryption declaration | `usesNonExemptEncryption=false`, verified |
| English testing notes | Saved and read back for this exact build |
| IPA SHA-256 | `35d99d2ef432928dad6970ccabf9858e7d5c046313a82e6303d782284a269de4` |
| Release verification checkpoint | October 18, 5:40 p.m. Eastern / `2026-10-18T21:40:05.973056Z` |

[EAS build](https://expo.dev/accounts/buldygaur/projects/grocery-app-preview/builds/1e3f7396-e686-489d-acc9-2db00d08343e) · [Submission](https://expo.dev/accounts/buldygaur/projects/grocery-app-preview/submissions/bb511d9c-d8d5-4dff-b589-e37b2b601d2a).

Release evidence root: `/path/to/NutriGlimpse/artifacts/iphone-build15-2026-10-18/`.

- `release-summary.json`: consolidated verified release status.
- `build-status.json`, `eas-submit-status.json`, `apple-build15-status.json`: saved provider status.
- `artifact-verification.json`: package inspection; `testflight-notes-verification.json`: exact notes read-back.
- `build15-source-manifest.json`, `build15-source.tgz`, `cloud-archive/`, `source-delta.json`, `source-post-build-check.json`: fixed source and preservation evidence.
- `check.log`, `photo-ui-timing.log`, `needs-ui.log`, `shelf-grid-ui.log`: automated checks.
- `dependency-warning-comparison.json`: unchanged Expo Doctor patch-alignment warning.
- `health-grocery-beta0-0.1.0-build15.ipa`: the exact submitted package.

No new tester invitation, external Beta App Review submission, public release or OTA update was made. The release did not restart the backend. Credentials were reused securely and are not included here.

### Backend deployment

The news backend was deployed before build 15. This local systemd deployment has **no separate cloud deployment ID**; its recorded identity is the service start time plus source hashes:

- Service: `congress-beta-backend.service`, loopback `127.0.0.1:3002`, public host `https://grocery.serveforwad.com`.
- Start: October 18, 5:22:34 p.m. Eastern / `2026-10-18 21:22:34 UTC`.
- Read-only check at handoff: active/running, PID `231957`. PID is an observation, not a durable deployment identifier.
- Evidence: `/path/to/NutriGlimpse/artifacts/news-refresh-2026-10-18/deployment.json` and `public-verification.json`.
- Deployment verification: 23 fresh candidates, five general and five synthetic personalized selections, private/no-store selection headers, unchanged backend health and unchanged portfolio PID; portfolio HTTPS returned 200.
- No additional deployment or model/search call was performed to prepare this handoff.

## 2. What this news increment changed

The user requested EatingWell, Clean Eating and ScienceDaily, daily freshness, and news selected on the backend from useful profile fields. The backend selection decision supersedes the earlier proposal to rank on the phone.

Delivered: six-source concurrent collection; seven-day article cutoff; bounded candidate pool; deterministic backend selection; For you/General controls; refresh on relevant profile changes, focus/foreground and new day; manual refresh; shared-general-only disk cache; privacy/onboarding copy; legacy API compatibility. News collection uses no LLM and incurs no model inference charges.

### Complete implementation file inventory

Paths below are relative to `/path/to/NutriGlimpse`; exact before/after hashes are in `artifacts/news-refresh-2026-10-18/edits.json`, and deployment hashes in `deployment.json`.

| Area | Files |
| --- | --- |
| Collector/operator tests | `ops/refresh-food-news.py`, `ops/test-food-news.py`, `ops/news-ui-check.cjs` |
| Core contracts/ranking | `packages/core/src/newsPersonalization.ts`, `packages/core/src/newsSelection.ts`, `packages/core/src/beta.ts` |
| Core tests | `packages/core/test/fixtures/news.ts`, `packages/core/test/newsPersonalization.test.ts`, `packages/core/test/newsSelection.test.ts` |
| Backend | `apps/service/src/foodNews.ts`, `apps/service/src/newsSelectionRoute.ts`, `apps/service/src/server.ts`, `apps/service/src/startBeta.ts` |
| Backend tests | `apps/service/test/foodNews.test.ts`, `apps/service/test/newsSelection.test.ts` |
| Mobile | `apps/mobile/src/ui/FoodNews.tsx`, `apps/mobile/src/storage/newsCache.native.ts`, `apps/mobile/src/state/AppState.tsx`, `apps/mobile/src/app/privacy.tsx`, `apps/mobile/src/app/onboarding.tsx` |
| Check wiring/release number | `package.json`; subsequently `apps/mobile/app.json` changed iOS build number 14 to 15 |
| Documentation | `docs/69-daily-personalized-food-news.md`, `docs/70-build15-fresh-personalized-news.md`, `docs/ImplementationProjectPlanDocument.md`, `docs/feedback-home-news-design.md`, `docs/UIAndProductFeedback.md`; this handoff is a new file |

The frozen EAS source contains 324 files. Relative to build 14: **zero removed, eight changed and five added**. The eight changed files are app.json, onboarding.tsx, privacy.tsx, AppState.tsx, newsCache.native.ts, FoodNews.tsx, root package.json and core beta.ts. The five additions are the two news core modules, two corresponding tests and the news fixture. Backend/operator files are deployed/tested separately and are not claimed to be bundled into the mobile IPA.

No unfinished news implementation or unreleased news client edits were found. This does not mean every project backlog item is complete.

## 3. Shelf preservation and correction of the earlier diagnostics statement

**The news work and build-15 release did not change shelf diagnostics or logging behavior.** The startup diff adds only the news-pool reader/options; the server diff adds the news routes. It retains the existing shelf provider and diagnostics wiring. The privacy-screen diff adds the Food news paragraph without rewriting the shelf disclosure.

Read-only comparison of build 14 and build 15 manifests found **80 shelf-related/hero-artwork paths with identical hashes**. Native shelf modules, shelf grids, shelf UI, both detector models and the approved home artwork remain. Signed-package inspection also found the grid, prior feature and model markers.

Earlier statements that there was no server shelf data referred to the **older, pre-build-14 local shelf flow**, including the October 17 check described in `docs/67-shelf-camera-current-flow.md`. They must not be applied to the new iPhone grid flow. The older sections of that document remain historical; `docs/68-shelf-grid16-release.md` is the delivered build-14 description.

Build 14 already introduced:

- On-phone full-package detection/cropping, quality/admission and repeat-sighting checks, and grids of up to 16 products.
- Consented grid upload through the backend, parallel GPT-6 Luna/Claude review, checked cell associations, final partial-grid handling and temporary results.
- Source-defined diagnostic events `model_query`, `shelf_usage`, `shelf_cell` and bounded failure codes, with per-cell product decisions and token/timing counts. Existing outside-alternative reviews use the normal photo-review diagnostics.
- Seven-day / 2,000-event retention in the existing private diagnostic store. No raw pictures, health profiles or precise location are included. The request/diagnostic schemas remain bounded.

Relevant source: `apps/service/src/shelfGridProvider.ts`, `betaDiagnostics.ts`, `startBeta.ts`. This handoff inspected source contracts only and **did not inspect private scan rows or assert that a particular user shelf scan reached the server**. A later authorized investigation must identify build/version, time and route before interpreting absent events. Older local-only scans cannot be reconstructed from the new server diagnostics.

Other retained side-chat features include independent parallel availability lookups, SerpApi exact-address queries, Serper Shopping fallback, dual-model product review/alternative union, product cards/source toggles, early original-product preview, My Needs, temporary Beta 0 timing and the approved home layout. See docs 60, 63, 66 and 68 for their separate implementation/acceptance limits. Availability does not become guaranteed branch stock, and two model estimates do not become verified label facts.

## 4. Exact backend request and privacy boundaries

New phone path: `POST /v2/news/selection`, using the prepared shared pool. No per-user publisher/search/LLM retrieval occurs. The response includes up to five selected stories plus a separate shared general selection for offline fallback.

Allowed request fields:

- `primary`: a specific selected focus, including General Fitness; No Concern is omitted.
- `conditions`: explicitly selected, enumerated concerns.
- `restrictions`: explicitly selected, enumerated dietary preferences.
- `ageGroup`: only `65-plus` when applicable, never the exact age.
- `pregnancy`: only `pregnant` when explicitly selected.

Example: `{"mode":"personalized","preferences":{"primary":"diabetes","conditions":["diabetes"]}}`.

**General, null/missing profile, or no meaningful preferences sends exactly `{"mode":"general"}` with no preferences object.** It does not send an empty full profile. If meaningful interests are sent but no eligible article matches, the backend returns a general selection. In that case the request still contained the supplied interests; a general response is not proof of a general request.

Adult age below 65 alone, unspecified pregnancy or No Concern without other interests does not generate an interest. General Fitness is an explicit interest. Normal onboarding starts with No Concern/empty conditions/unspecified pregnancy. The historical internal sample snapshot is not itself evidence that a user selected a condition; reset returns to setup before news is shown.

Not sent: name/account identifier, exact age, sex/gender, height, weight, BMI, lipid/lab results, location, store, photos or contact details. Personal medical/weight-context AI gates were not enabled. This news authorization must not be reused to send health context with product photos or shelf grids.

The strict schema rejects extras, unknown topics, duplicate lists and raw measurements. Bounds: 2 KiB body, four-second read deadline, shared rate limit, eight concurrent requests. Selection responses use `Cache-Control: private, no-store`; there is no personalized ETag or profile echo. News preferences are transient in request memory, not stored/logged in the application or forwarded to publishers. Ordinary network infrastructure sees the connection. Opening an article contacts its publisher normally; this is not a promise of network anonymity.

### Profile change, background, offline and deletion: precise behavior

| Event | Actual implementation |
| --- | --- |
| Saved relevant profile fields change | A serialized minimized request key changes immediately. The old selection no longer qualifies for display; focus-effect cleanup aborts/invalidates the old request, and a new request runs. General cached stories can show while waiting. Late old responses cannot replace the new result. |
| Switch to General | The preference is saved with encrypted app settings. It changes the request to General and invalidates the personalized display. Failed saves leave the existing preference and show an error. |
| App backgrounds | Periodic refresh checks do not start while backgrounded. **Backgrounding alone does not explicitly erase the news selection or abort an already running news request.** It may remain in memory until unmount/process termination. This differs from the photo/shelf image lifecycle. |
| Return to foreground | While the news section is focused, freshness/retry checks run; retry/new-day checks respect a 15-minute minimum interval. An hourly recheck can discover a successful replacement edition. |
| Screen loses focus/unmounts | Focus cleanup aborts/invalidate requests and removes timers/listeners. Unmount discards component memory; merely losing focus can leave React state mounted. |
| Offline after a successful same-profile response | The current memory-only selection may remain, labeled as last available after a failed refresh. It is not written to disk. Do not describe every offline state as necessarily general. |
| Cold/restarted app offline or profile changed offline | Only shared general stories can be restored from disk. Expired articles are filtered out; no personalized disk edition exists. |
| Reset all app data | Replaces encrypted profile/settings with a new setup snapshot and returns through the existing setup/agreement gate, unmounting the news UI. Existing request cleanup applies. **The public general-news cache file is not explicitly deleted by reset**; it contains no personalized selection/preferences. Exported backups remain separate files. |

The intended implemented policy is general-only **persisted** caching, with reuse of the current selection during a warm session or failed refresh. It was not an immediate-background-erasure policy. Thus the main chat's observation of `edition = current ?? cached` is correct; wording that implies personalized memory is always cleared on background or every offline transition would be wrong.

The cache file is `food-news-v2.json` under the native app cache directory. For you/General and the profile live in the existing encrypted repository/backups. If the product requires immediate erasure of news memory on background or removal of even public news cache on reset, those are additional changes, not delivered behavior. Physical reset/foreground checks remain open.

## 5. Daily operations, sources and failure semantics

Existing systemd **user timer** `congress-food-news.timer` is enabled/active; `loginctl show-user developer -p Linger` returned yes. No duplicate cron or Codex automation was created.

The timer checks hourly in America/New_York; the collector's due guard runs the normal edition once per day at/after **02:00 Eastern**. Next expected daily collection after this checkpoint: October 19 at 02:00 Eastern / 06:00 UTC. Hourly timer wakeups before that can be harmless no-ops. Persistent scheduling and the guard cover missed runs, spring 02:00-to-03:00 DST catch-up and repeated autumn hours.

Service: `congress-food-news.service`; command: `/usr/bin/python3 /path/to/NutriGlimpse/ops/refresh-food-news.py`; working directory is the project; overall timeout 50 seconds, memory bound 128 MiB. An inactive/dead oneshot after success is normal. Six sources fetch concurrently with eight-second timeouts, bounded one-MiB responses, fixed hosts, safe XML and no redirects. Locking prevents overlap and atomic file replacement prevents partial JSON.

Live collection checkpoint: October 18, 5:18 p.m. Eastern. **Six sources responded successfully; only two supplied eligible fresh articles.**

| Source | Eligible items | Newest returned publication | Status |
| --- | ---: | --- | --- |
| Harvard — The Nutrition Source | 0 | January 9, 2026 | Responded; no current stories |
| Tufts Now Food & Nutrition | 0 | September 28, 2026 | Responded; no current stories |
| NIH Research Matters, nutrition-filtered | 0 | September 29, 2026 | Responded; no current stories |
| EatingWell | 17 | October 18, 2026 | Fresh candidates supplied |
| Clean Eating | 0 | September 15, 2025 | Responded; no current stories |
| ScienceDaily nutrition | 6 | October 18, 2026 | Fresh candidates supplied |

Total: 23 eligible candidates, five stories per verified selection. These counts are a checkpoint, not a guaranteed daily supply. The feed URLs and publisher roles are in `docs/69-daily-personalized-food-news.md` and the source map in `packages/core/src/newsPersonalization.ts`.

Freshness/filtering: actual publication dates, no future/missing-date items, maximum seven days, preference for the latest 24 hours, URL/headline deduplication, bounded 50-candidate pool, promotional/unrelated-content rejection and identifiable animal/lab research labeling. At most three articles per publisher in the final five, retaining general stories where possible. Child-targeted material is excluded by the available classification; tags are metadata heuristics, not full-text clinical review or dietary certification.

Failure handling:

- A responding source with only old content is `no-current-stories`, not failed. It contributes zero and does not cause failure retries that day.
- Partial failure preserves only still-fresh items from the unavailable source; successfully fetched sources use their fresh results.
- Complete failure preserves the previous successful files. Backend and client continue to filter out articles after seven days; preserved files do not make old stories current.
- Partial/complete failures allow at most three automatic attempts that Eastern day; later hourly wakeups are no-ops until the next day.
- Fewer than five eligible/diverse stories means fewer are shown. No fabricated dates, summaries or filler.
- No alert/notification service was added. Operators must inspect source health/journal or separately implement approved monitoring.

Operational files: `/path/to/NutriGlimpse/.tools/news/pool.json`, `daily.json`, `last-run.json`. `last-run.json` exposes per-source items/expired/rejected/eligible/newest/status, failedFeeds, attempts and publication status without user data.

Read-only operator checks:

```sh
systemctl --user show congress-food-news.timer -p ActiveState -p UnitFileState -p NextElapseUSecRealtime -p LastTriggerUSec
systemctl --user status congress-food-news.service --no-pager
journalctl --user -u congress-food-news.service -n 20 --no-pager
cat /path/to/NutriGlimpse/.tools/news/last-run.json
```

Do not force a collection merely to read status. `--force` is available for deliberate operator recovery but changes the edition and calls publishers.

Only attributed headline/link/date/publisher/topic metadata is reused. No full article text, publisher images, generated summaries, paywall bypass or AI training reuse. Connecting RSS does not confer rights to republish full articles/images.

Compatibility: `/v1/news/daily` retains the strict original-three-publisher schema and currently has zero fresh articles; `/v2/news/daily` serves the tagged pool; `/v2/news/selection` serves the new client. Build 15 is the one-time client update. Subsequent daily content/ranking updates within this contract can be backend-only. Older installed clients may retain their old cached stories until refreshing.

## 6. Which backlog items are complete, and which are not

| Item | Current classification |
| --- | --- |
| FB-12: requested EatingWell/Clean Eating/ScienceDaily additions | Implemented, live-tested, deployed, included in build 15. Clean Eating's lack of fresh output is source health, not missing adapter code. |
| FB-14: 02:00 Eastern refresh/freshness/failure/DST handling | Implemented and enabled; automated guard/failure tests and same-day no-republish check passed. The next unattended nightly run is not claimed to have happened yet. |
| FB-23: audience/topic selection and General mode | Implemented on backend as requested, tested, deployed, included in build 15. Earlier on-phone-ranking plan is superseded. |
| DEV-30 next-native-build task | Completed by DEV-31/build 15. Do not rebuild it as unfinished work. |
| Phone acceptance for news and retained shelf/photo/store features | Open. No installed build-15 observation or physical accuracy/performance acceptance recorded. |
| Wider publisher proposals | Open: Harvard Chan department news, Harvard Gazette, FDA and Food Dive. These are distinct from the six configured collections; permitted routes and validation remain per-source work. |
| Full article/summary/image redistribution | Not implemented or licensed by this feature. |

The plan and feedback files contain dated historical checklists that still say source/native work was pending, including October 16 FB-23 tasks and October 18 pre-release wording. Their top status and DEV-31 delivery reconciliation supersede those packaging statements. Some current dependency text still refers to build 14 as latest; the next plan reconciliation should say **build 15, which includes build 14's shelf flow**. Do not mark all nine/ten discussed publishers connected or physical acceptance complete. This handoff did not rewrite shared plan sections while the main chat was active.

Other existing open work remains separate: FB-37 selected-store/nearest-store tie-break for nutritionally comparable alternatives within ±3%; physical coverage/latency/accuracy testing; better shelf-crop replacement/adaptive splitting; Beta 0 timing removal before Beta 1; dependency advisories; clinician-reviewed medical rules; exact manufacturer/certifier evidence; guaranteed retailer inventory permissions; and deferred detector distribution/source-publication decisions. Existing credentials do not need to be recreated for the delivered news feature.

## 7. Test evidence and limits

Recorded release checks, not rerun merely for this documentation task:

- Workspace typecheck and mobile lint.
- 550 core/service tests, nine tooling tests and ten input-adapter tests.
- Eleven collector tests covering dates, stale sources, safe parsing/links, parallel collection, DST, bounded retries, complete/partial outages, locks and pool bounds.
- News interaction harness: live/general cache, profile-change selection, General opt-out, failed-save handling, links, offline expiry, malformed cache/manual retry, foreground next-day refresh and unmount cancellation. Native/network boundaries mocked; not a complete physical reset test.
- 52 photo/home scenarios with timing off, and the same 52 with timing enabled using `EXPO_PUBLIC_BUILD_STAGE=beta0`; My Needs interaction checks; ten shelf-screen scenarios.
- iOS JavaScript export, EAS native compile and package inspection.
- Expo Doctor: 20/21 checks pass; the existing SDK patch-alignment warning matches build 14. Dependencies were not changed or the warning hidden.
- ZIP integrity, version/bundle/arm64, distribution provisioning, no debug entitlement, permission descriptions, encryption flag, scene lifecycle, hero and detector/feature markers. Provisioning CMS was verified; full app codesign chain/device execution was not verified on Linux. Apple processing completed VALID.

News deployment evidence: `artifacts/news-refresh-2026-10-18/{core-service-tests.log,news-checks.log,photo-ui.log,needs-ui.log,typecheck.log,lint.log,ios-export.log,public-verification.json}`. Public checks used an app-identifying User-Agent; the preliminary default Python User-Agent received Cloudflare 403. This does not establish iPhone network behavior.

Recommended physical acceptance, using synthetic profile selections if preferred:

1. Verify TestFlight displays build 15 and update; do not infer installation from availability.
2. With No Concern/empty interests, confirm General-equivalent news; test explicit For you vs General, save/relaunch persistence and article links.
3. Change a health focus and verify the old selection is invalidated, including a slow response from the previous focus.
4. Check dates, larger text/VoiceOver, manual refresh, airplane-mode cold start (general cache), airplane-mode after a successful personalized response, seven-day expiry and foreground after a new day.
5. Test Reset all app data and confirm setup returns and old personalized selection is not shown; note public cached headlines may survive as documented.
6. Recheck normal product-photo flow, three-where-eligible alternatives, USDA/OFF toggles, availability and shelf partial/full grids. For shelf, test repeated panning, similar flavors, cancellation/background, memory/heat and real network conditions.
7. After October 19 02:00 Eastern, inspect `last-run.json` and journal for the unattended edition. Verify actual source output, not just timer enabled state.

## 8. Source drift and active-work checkpoint

Read-only handoff checks on October 18 at approximately 5:45 p.m. Eastern:

- All **324 frozen build-15 manifest paths matched**, none missing or changed.
- All **21 news deployment source fingerprints matched** the deployed checkpoint.
- The 80 shelf/hero paths compared between build 14 and 15 were unchanged.
- A scoped scan found no source file newer than the build-15 manifest under mobile source/modules, service source, core source or ops (excluding generated/dependency directories).
- The workspace Git status is broadly untracked, so **do not call it Git-clean or use Git status alone as release identity**. Frozen/deployment hashes are the evidence. Documentation and runtime data naturally change outside the mobile manifest.
- No build/submission/test session owned by this side chat remains running. The normal backend/preview and enabled news timer remain; no new paid job was launched. This is not a claim that the main or another chat is idle, or that no future concurrent edit can occur.

The only new mutation for this handoff is this documentation file and its laptop mirror. The previously approved five documentation copies were already mirrored with matching SHA-256 hashes. Verify current source before any future deployment/build, preserve concurrent changes and treat later changes as a subsequent numbered release.
