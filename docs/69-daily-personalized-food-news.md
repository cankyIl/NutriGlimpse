# Daily food news: sources, freshness and backend selection

Updated October 18, 2026. DEV-30 / FB-12 / FB-14 / FB-23.

## Delivery status

The six-source collector and backend selection endpoint are deployed on project-server. Mobile source, privacy copy and preferences are now delivered in **TestFlight build 0.1.0 (15)**, verified Apple VALID / IN_BETA_TESTING for the existing owner group. [DEV-31 release evidence](70-build15-fresh-personalized-news.md) supersedes this document's original source-only packaging boundary. Physical-phone acceptance remains pending.

The user explicitly chose backend selection: the phone sends only useful news-interest fields, the backend chooses the stories, and missing/non-specific information requests general news. This supersedes the earlier proposal to select stories on the phone.

Update once to build 15 for the new publishers, request format and controls. Subsequent daily news changes are served by the backend without rebuilding the app.

## Connected sources and observed freshness

Live collection at 2026-10-18 21:18 UTC: all six sources responded; 23 eligible candidates, from which the backend selects up to five per request. These are measured counts for that collection, not guaranteed daily output.

| Publisher | Collection method | Eligible within seven days |
|---|---|---:|
| Harvard — The Nutrition Source | [Publisher RSS](https://nutritionsource.hsph.harvard.edu/feed/) | 0 |
| Tufts Now | [Food & Nutrition metadata](https://now.tufts.edu/food-nutrition), bounded title/link/date parsing | 0 |
| NIH Research Matters | [Publisher RSS](https://www.nih.gov/nih-research-matters/feed.xml), filtered to nutrition | 0 |
| EatingWell | [Publisher-advertised RSS](https://feeds-api.dotdashmeredith.com/v1/rss/google/dcbd6d38-4ab3-42e8-a5f6-37a8a48ceb94) | 17 |
| Clean Eating | [Anonymous publisher RSS](https://www.cleaneatingmag.com/feed/?scope=anon) | 0 |
| ScienceDaily | [Nutrition RSS](https://www.sciencedaily.com/rss/health_medicine/nutrition.xml) | 6 |

Clean Eating's feed responded, but its newest returned item was September 15, 2025. Harvard's newest returned item was January 9, 2026; Tufts September 28; NIH September 29. None is relabeled as current news. These sources remain connected and checked daily.

The broader source register still contains unconnected ideas: Harvard Chan department news, Harvard Gazette, FDA and Food Dive. This request connects the three specifically requested additions; it does not claim the entire wider shortlist is live.

Only headline/link/date/publisher/topic metadata is retained. Article links direct readers to the publisher. No full article text, publisher images, generated summaries, model calls, paywall bypass or AI-training reuse is involved. ScienceDaily's [RSS directory](https://www.sciencedaily.com/newsfeeds.htm) describes attributed headline-feed integration. Feed access is not a license to republish full articles or images.

## Daily collection and freshness

The existing enabled systemd **user timer** runs independently of Codex and the laptop. No duplicate cron or Codex automation was created.

- Timer: `congress-food-news.timer`.
- Service: `congress-food-news.service`.
- Collector: `ops/refresh-food-news.py`.
- Runtime files: `.tools/news/pool.json`, `daily.json`, `last-run.json`.
- Time zone: **America/New_York**.
- Refresh target: **02:00 local time every day**. The timer checks hourly; the due guard does one normal collection per Eastern day at or after 02:00.
- Persistent timer and user lingering are enabled. A missed run catches up; the spring DST day catches up at 03:00 when 02:00 does not exist. The repeated autumn hour does not duplicate a completed edition.
- At most three automatic attempts per day after partial or complete source failure. Remaining hourly checks are no-ops; the next day can try again.
- Six fixed sources fetch concurrently, with eight-second source timeouts, one-MiB response bounds, no redirects, safe XML parsing, fixed article hosts and no credentials. The service has a 50-second overall limit.
- File locking prevents overlapping collectors. Atomic file replacement prevents partially written JSON. Complete failure preserves the last successful edition; partial failure retains only still-fresh metadata from the unavailable source.

Freshness is enforced in collection, backend delivery and mobile display:

1. Use the source's publication timestamp. Reject missing/invalid dates, future stories and articles older than seven days.
2. Prefer the most recent 24 hours in the ranking, with relevant recent stories available from the remainder of the seven-day window.
3. Deduplicate canonical URLs and near-identical headlines. Bound the shared candidate pool to 50, distributing slots across available sources.
4. Exclude promotional/cure claims, unrelated shopping and entertainment. EatingWell's site-wide “Healthy Recipes, Healthy Eating” slogan is removed before relevance/category classification; it must not admit shoe advertisements.
5. Label identifiable animal/laboratory findings as **Early research**. A publisher claim does not become an app medical or nutrition-rating rule.
6. Show fewer than five when necessary. Never manufacture current stories to fill the screen.
7. Expired cached stories disappear even if offline. Dates and saved/last-available states remain visible.

## Backend selection flow

1. On opening the news section, changing saved news interests, choosing For you/General, returning on a new day, or manually refreshing, the phone prepares a bounded news request.
2. It sends `POST /v2/news/selection` over the existing HTTPS backend connection.
3. The backend reads the prepared daily pool. It does **not** call a publisher, search service or LLM for the individual request.
4. The backend ranks valid stories, returns up to five and includes a separate shared general selection for offline fallback.
5. The phone displays the returned order, publisher, original date, research label and original article link. It does not independently re-rank the response.

The UI refresh check runs while the news section is focused, including foreground return. Failed/new-day refreshes retry no sooner than 15 minutes; hourly rechecks can pick up a successfully retried shared edition. Concurrent refreshes are prevented. Profile changes cancel/invalidate older requests so a late response cannot replace the new selection.

### Fields the phone may send

| Input | Sent for news? | Use |
|---|---|---|
| Selected health focus and concerns | Yes, enumerated topic identifiers | Raise stories about explicitly selected topics |
| Selected dietary preferences/restrictions | Yes, enumerated identifiers | Raise relevant educational or recipe topics |
| Age | Only a **65-plus** audience flag when applicable | Match explicitly older-adult stories; exact age is excluded |
| Pregnancy | Only an explicitly selected pregnant context | Match explicitly applicable articles |
| Name/account identifier, exact age, gender | No | Not required for current topic ranking |
| Height, weight, BMI, lipid/lab results | No | Not required; existing AI/clinical gates remain unchanged |
| Location/store, photos, contact details | No | Not needed for news selection |

Example with an explicitly selected concern:

```json
{"mode":"personalized","preferences":{"primary":"diabetes","conditions":["diabetes"]}}
```

No profile, no meaningful selected interests, or the General preference:

```json
{"mode":"general"}
```

Incomplete details work: only supplied and useful fields are included. An adult age alone below 65, unspecified pregnancy, or No Concern without other relevant selections does not invent an interest. When supplied interests have no eligible matching stories, the backend returns general stories.

### Ranking policy

Policy version: `publisher-news-2026-10-18.1`.

- Primary interest: 30 points; other stated concerns and dietary preferences: 20 each; explicit pregnancy context: 20; older-adult audience match: 12.
- Total relevance contribution capped at 40.
- Freshness: 40 for stories at most one day old; otherwise `max(0, 24 - 3 × ageInDays)`.
- Food-safety topic: additional 10.
- Sort by score, publication time and stable ID.
- Up to five stories, at most three from one publisher, with up to two general stories retained when available. Deduplication and publisher limits may reduce the count.
- Child-targeted stories are excluded from this adult app's selection.

This is topic relevance, not personalized medical treatment. A dietary tag does not certify a recipe's allergen safety or suitability. No diagnosis, drug advice, target intake or clinical rule is inferred.

## Privacy, caching and compatibility

The news POST schema rejects names, arbitrary extra fields, raw measurements/labs, unknown topics and duplicate lists. Bodies are bounded to 2 KiB; requests have a four-second read timeout, a global rate limit and an eight-request concurrency bound. Responses use **private, no-store**, carry no personalized ETag and do not echo the input profile.

News interests are used transiently for that request. The route performs no profile storage, diagnostic logging, publisher forwarding or AI calls. Other photo/report/clinical consent boundaries are unchanged. Ordinary network infrastructure still handles the connection.

For you/General is stored with the existing encrypted app settings and backup. Profile data remains in the existing encrypted phone profile. **Only the shared general edition is written to the public offline news cache**; personalized selections remain in memory. The privacy screen and onboarding explain the limited backend use.

Compatibility endpoints:

- `GET /v1/news/daily`: unchanged strict schema for installed builds, containing only the original three publishers and fresh stories. The current verified v1 response has **zero** articles because none of those publishers has an eligible item in this collection.
- `GET /v2/news/daily`: public tagged pool for bounded inspection/delivery.
- `POST /v2/news/selection`: new app path for backend-selected personalized/general stories.

The currently installed build may retain its own previously cached legacy stories until it refreshes. The new source and freshness UI behavior is not claimed on an unupdated phone.

## Verification and operational evidence

Evidence directory: `artifacts/news-refresh-2026-10-18/`.

- **550 core/service tests pass**, including publisher/schema validation, date/duplicate checks, deterministic selection, minimized request fields, no-profile fallback, independent concurrent selections, private response headers, malformed/oversized/chunked requests, rate limiting, and v1 compatibility.
- **11 collector tests pass**: seven-day boundary, old Clean Eating content, unsafe links/XML, source relevance, parallel collection, DST, bounded retries, complete/partial outages, no duplicate edition, lock handling and pool bounds.
- News component interaction harness passes: live/general cache, profile-change requests, opt-out, failed preference save, links, offline expiry, malformed cache/manual retry, next-day foreground refresh and unmount cancellation. Native/network boundaries are mocked.
- Existing **52 photo/home UI scenarios** (timing disabled) and My Needs interaction checks pass.
- Workspace typecheck, mobile lint and iOS JavaScript export pass. Subsequent DEV-31 native compilation and Apple processing also pass; physical-phone testing remains pending.
- Production HTTPS: public pool has 23 fresh candidates; general and synthetic personalized requests each return five stories. Personalized requests do not change the shared general result.
- The existing enabled timer was invoked again and did not rewrite the same-day edition. Next scheduled daily collection is October 19 at 02:00 Eastern (06:00 UTC).
- Backend health response was unchanged after deployment; portfolio process ID was unchanged and public portfolio HTTP 200 was verified.
- Shared-source fingerprints were checked immediately before the backend restart; no unrelated pending backend source changes were deployed.

Public verification used an app-identifying User-Agent. A preliminary request with Python's default User-Agent received Cloudflare 403; the app-identifying requests succeeded. This does not prove physical iPhone networking.

## Remaining release acceptance

1. Completed by DEV-31: mobile/core changes and privacy copy are included in build 15, preserving shelf and prior side-chat work.
2. On a physical phone, confirm general news without meaningful profile information, changed interests returning a new selection, For you/General persistence, article links, larger text, offline general fallback and next-day refresh.
3. Continue checking source health via `last-run.json`. An accessible source with no fresh material is different from a failed source.
4. Other proposed publishers are separate enhancements. No extra account, API key, paid news provider or user action is required for the six connected sources.
