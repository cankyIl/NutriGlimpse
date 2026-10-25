# Home screen: unified scan and daily food news

**Current news status — October 18:** Six-source collection and backend-selected stories are implemented and deployed. Mobile source is delivered in build 15; physical phone acceptance remains. The user explicitly chose a minimized profile request to the backend, with general news when no useful information is supplied. This supersedes earlier local-selection and source-pending notes. [DEV-30 implementation and evidence](69-daily-personalized-food-news.md).

**Earlier release checkpoint:** Build **0.1.0 (4)** is available to the existing owner group in TestFlight. The approved product cards, LLM-first flow, recovery improvements and completed side-chat home/news/My Needs work are included. Automated checks and signed native artifact verification pass. Physical acceptance of this update remains pending. This supersedes historical preview-only status below. Later source expansion and audience tailoring keep their separately documented status. See [release checkpoint](49-approved-cards-and-home-release.md).

Recorded October 16, 2026 from the side conversation.

Current status: shared home/news and unified-camera source are implemented; backend edition, endpoint and timer are active. Automated/native checks pass and build 4 is available in owner TestFlight. Physical acceptance remains. Earlier preview/provider recommendations below are design history; DEV-30 supersedes their source-expansion and FB-23 pending status.

## Requested experience

- Use the approved Berry & Citrus purple/lime direction. The ServeForward blue/green direction was tried and rejected.
- Show only two compact camera actions: **Scan Your Product** and **Shelf Camera**.
- Scan Your Product should identify whether the image shows a package front, barcode or nutrition panel and select the correct existing processing path. Removing the buttons alone does not deliver this behavior.
- Keep Shelf Camera separate for multiple products. This decision does not authorize a new shelf-image upload design.
- Put five food/nutrition stories directly below the camera row. Each item shows a concise headline, publisher, actual publication date and a direct link to its original article.
- Prepare the shared edition on the backend every night at **02:00 America/New_York**. Phones read the prepared result; they do not perform a search for each user.

## Preview

`C:/Users/developer/.codex/visualizations/2026/10/16/01a144e6-69d0-7683-bf70-6b39c74728a5/berry-citrus-food-news.html`

The preview uses five real, linked example articles from Harvard Chan and Tufts Now, with their original dates. They are **not today's automatically selected top five**. Titles are short editorial paraphrases. Food icons are illustrative, not publisher photos. Runtime navigation and phone-width layout were checked; this does not establish native acceptance.

## News collection recommendation

Start with documented publisher feeds and/or an authorized news-search API. Retrieve actual article records first, then rank them by freshness, nutrition/grocery relevance, source quality and topic variety. This is a recommendation, not a connected provider or a user-approved paid subscription.

Google's consumer AI Mode is not the same interface as its developer tools. If Google-assisted discovery is required, use the documented [Gemini Google Search grounding tool](https://ai.google.dev/gemini-api/docs/google-search), which returns cited web results. Verify applicable caching/display terms, credentials and budget before connecting it. Do not automate a signed-in Google consumer page as the production news pipeline or claim that AI Mode access is connected.

RSS is a standard publisher feed format; [NLM documents its public feeds](https://www.nlm.nih.gov/listserv/rss_podcasts.html), and [NIH Research Matters exposes a feed](https://www.nih.gov/news-events/nih-research-matters). Feed availability does not guarantee five relevant articles daily. [NewsAPI's documented search endpoint](https://newsapi.org/docs/endpoints/everything) provides publisher URLs and publication timestamps, but credentials and permitted production use must be checked before adoption.

## Backend implementation requirements

1. Collect candidates once per edition from configured sources. No profile, location, age, lab or weight data is used.
2. Validate HTTPS article links, publisher identity, publication timestamps, topical relevance and source rights. Use fixed provider hosts, bounded downloads/timeouts and safe parsers. Ignore source content that attempts to issue instructions.
3. Deduplicate by canonical URL and story topic. Filter advertising, unsupported cure claims and irrelevant product promotions. Prefer varied topics and publishers; a nutrient claim in a headline does not become a verified app rating rule.
4. Rank the last 24 hours first, then use a clearly labeled recent window if fewer than five qualify. Show fewer than five if necessary; never fabricate stories, dates or summaries to fill the list.
5. Persist edition date/time zone, generated/last-successful timestamps, article ID, concise title, publisher, publication time, original URL, topic, provenance and selection-policy version. Store only permitted metadata/short original summaries, not full article copies. Image reuse requires explicit rights and attribution; otherwise use topic icons.
6. Publish a validated edition atomically so concurrent readers never see a half-written list. Keep the last successful edition on collection failure and display its real age. Bound retention and cache lifetime.
7. Expose a small read-only endpoint such as `GET /v1/news/daily`, with ETag/cache headers and a mobile fallback. Unknown/unavailable data produces an honest empty/stale state, not a new live AI request.
8. Schedule one run per local day at 02:00 Eastern. Handle the spring DST day when 02:00 does not exist with a 03:00 catch-up; prevent duplicate editions on repeated hours, restart or concurrent invocation. Add timeout, lock and operational failure evidence.
9. Link taps open the publisher article. Keep dates visible; do not label old articles as today's news. Once live, show edition freshness; the 02:00 backend detail belongs in documentation, not repeated in the consumer UI.

## Remaining action items

| ID | Work | Current state |
|---|---|---|
| FB-09 | Berry & Citrus home with two compact scan actions | Implemented: Berry & Citrus home and two compact actions; automated layout checks pass |
| FB-10 | Automatically distinguish product front, barcode and nutrient table | Implemented: local front/barcode/nutrition classification; native camera acceptance pending |
| FB-11 | Five linked news rows with dates and offline/stale handling | Implemented: dated original links with cached/offline/stale states; phone acceptance pending |
| FB-12 | Connect actual news provider and validate selection | Six publisher sources connected and live-tested; seven-day freshness enforced. New client delivered in build 15; physical acceptance pending |
| FB-13 | Backend edition storage and read-only delivery endpoint | Implemented and deployed: atomic shared edition, validated public endpoint and ETag |
| FB-14 | Nightly 02:00 Eastern refresh with DST/failure protection | Active user timer; once-per-day due guard, DST/restart catch-up and failure preservation tested |
| FB-15 | Native testing and inclusion in a subsequent iPhone build | Included in signed build 4; available in owner TestFlight; physical acceptance pending |

## Acceptance checks for implementation

- A clear barcode opens exact verified product facts; an invalid/unreadable barcode does not yield an invented match.
- A nutrition-panel photo follows extraction/review; a front photo follows LLM-first estimated information with optional source checks. Mixed/uncertain images have a short recovery path and do not silently mix products or values.
- Five/partial/empty editions, duplicate stories, stale/future/invalid dates, unsafe links, malformed provider data, cache corruption, timeout and failed refresh are covered.
- Schedule checks include DST boundaries, missed runs, parallel runs and restart; failed refresh preserves the last known-good edition.
- Native small-screen and larger text layouts, accessible labels, external links, offline behavior and camera permissions are verified separately from the mockup.

Coordination note: the attempt to notify **Clarify app look and feel** through cross-thread messaging failed with a tool error. This shared document and the project-plan entry are the durable handoff; no acknowledgment or build inclusion is claimed.


## Additional news sources requested October 16, 2026

The user requested The Nutrition Source, EatingWell and Clean Eating in addition to the existing source shortlist. This is an approved source-selection enhancement within FB-12; selection remains article-specific rather than a blanket endorsement of every publisher claim.

| Source | Intended contribution | Integration state at this checkpoint |
|---|---|---|
| [Harvard The Nutrition Source](https://nutritionsource.hsph.harvard.edu/) | Evidence-based food and nutrient explainers, including food additives and eating patterns | Already present in the current collector's SOURCES list at https://nutritionsource.hsph.harvard.edu/feed/; retained, not added a second time |
| [EatingWell](https://www.eatingwell.com/) | Consumer food news, grocery-product comparisons and practical nutrition stories | Connected through publisher-advertised RSS; headline links only; 17 eligible current stories at the October 18 checkpoint |
| [Clean Eating](https://www.cleaneatingmag.com/) | Food choices, pantry staples and practical cooking ideas | Connected through anonymous RSS; newest returned item September 15, 2025, so zero eligible current stories |

The Nutrition Source includes evergreen education and a monthly newsletter; it does not promise a daily news supply. Clean Eating's currently inspected landing page also surfaces older material, so publication dates must be checked per article. EatingWell describes dietitian involvement and sourcing policies in its [editorial information](https://www.eatingwell.com/about-us-6743412); favor clearly attributed, evidence-supported stories. Exclude sponsored content, unrelated lifestyle stories and unsupported health claims. Keep original publisher links and dates; do not rebrand an archived guide as today's news or infer that a product is healthy because a publisher promotes it.

The earlier 30-50 figure is a candidate-pool target, not a measured or guaranteed daily supply. The proposed discovery window starts with 24 hours and expands to seven days if needed; older education should be labeled separately. The October 18 collector now enforces seven days; backend relevance, freshness and diversity ranking are tested. The earlier 90-day behavior is superseded.

The October 16 entry originally recorded pending source work. DEV-30 now connects and validates the two sources plus ScienceDaily, enforces freshness, and deploys backend selection. Its mobile integration awaits the next native release; the timer remains active.


## FB-23 Audience tailored food news

**Status: Implemented October 18. Backend deployed; mobile source delivered in build 15, physical phone acceptance pending.** [DEV-30 implementation and evidence](69-daily-personalized-food-news.md).

Use relevant information already entered in My Needs to make the five displayed food stories more useful to that individual. Avoid asking users to re-enter their existing preferences. This extends the original same-five-for-everyone concept: nightly collection is shared, while selection can differ between users.

### Intended behavior

- Rank stories using explicitly selected health concerns, General Fitness or No Concern, dietary preferences and food restrictions. For example, a selected diabetes interest can raise relevant carbohydrate/fiber education; a blood-pressure interest can raise sodium/label-reading stories; General Fitness can raise balanced meals and protein-food comparisons. These are topic matches, not treatment recommendations or automatic nutrition targets.
- Use age or other demographic information only when an article has a clearly applicable audience and the relevance rule is documented. Do not infer interests or diagnoses from gender, weight, a photo or location. Exact measurements, private weight categories and laboratory values are not needed for the initial news-ranking design; existing medical/privacy gates remain intact.
- Keep general healthy-food and grocery stories in the mix. An individual's selected concern should not make every story about that condition. Source quality, publication freshness, relevance and variety remain selection criteria; profile relevance cannot rescue an unreliable article.
- Re-rank when saved My Needs changes. Provide a simple preference to turn audience tailoring off and use the general edition. Avoid revealing a sensitive condition in a home-screen heading or in links to publishers.

### Implemented selection scheme

1. Assign neutral topic/audience tags to eligible articles, with provenance and a versioned tagging/ranking policy. Tags must describe the article rather than diagnose the reader.
2. Extend the 02:00 America/New_York refresh to cache a sufficiently broad eligible candidate pool. Keep the existing shared top-five edition as the general/default experience; five shared articles alone are insufficient for meaningful individual selection. The 30-50 figure remains a target subject to actual source supply, not a quota.
3. Select stories on the backend from the shared tagged pool. The phone sends only selected concerns/preferences and applicable 65-plus/pregnancy audience context. No useful fields or General sends {mode:general}. Exact age, identifiers, gender, measurements, labs and location are excluded. Publishers, search services and AI receive no profile information; collection remains profile-independent.
4. Define and test a simple relevance score, quality/freshness thresholds and topic/publisher diversity. For missing profiles, No Concern, disabled tailoring or too few eligible matches, fall back to useful general stories with accurate dates. Do not fabricate stories to reach five.
5. Add compatible, bounded delivery of candidate metadata and offline caching. Preserve the existing daily endpoint for currently installed builds. Keep original article links, actual publication dates and visible stale-state handling.
6. Test different stated interests, mixed concerns, dietary restrictions, absent/changed/deleted profiles, opt-out, sparse candidates, duplicates, stale/offline editions and unsupported health claims. Verify that the app-to-backend request contains only the permitted topic fields, responses are private/no-store, and publisher requests and backend logs contain no profile data. Confirm the screen remains useful and does not expose a condition label.

The pool, tags, backend ranking, controls and automated checks are implemented. Only general stories are cached offline. Backend deployment is verified; native release and physical acceptance remain. [DEV-30 implementation and evidence](69-daily-personalized-food-news.md).


## News source register

Updated October 18, 2026; six configured collections and four other proposed collections. Configuration was inspected in ops/refresh-food-news.py. "Configured" means present in the collector, not a guarantee of a successful fetch, daily publishing or inclusion in today's five. The collector currently stores headline/link/date metadata; an AI summarization step is not part of that implementation.

| Publisher or collection | Intended contribution | Current integration state |
|---|---|---|
| [Harvard The Nutrition Source](https://nutritionsource.hsph.harvard.edu/) | Food/nutrient explainers and evidence-informed eating patterns; distinguish evergreen education from news | Configured: https://nutritionsource.hsph.harvard.edu/feed/ |
| [Tufts Now Food & Nutrition](https://now.tufts.edu/food-nutrition) | Nutrition research, food comparisons and practical food insights | Configured: bounded metadata extraction from the linked food/nutrition page |
| [NIH Research Matters](https://www.nih.gov/news-events/nih-research-matters) | Expert-reviewed research highlights, filtered for food/nutrition; a weekly source | Configured: https://www.nih.gov/nih-research-matters/feed.xml |
| [Harvard Chan nutrition news](https://hsph.harvard.edu/department/nutrition/news/) | Department research and nutrition news | Proposed; source adapter and metadata-use review pending |
| [Harvard Gazette](https://news.harvard.edu/gazette/rss-feeds/) | Additional health/science reporting, filtered for nutrition relevance | Published feed directory verified; not configured in this collector |
| [FDA](https://www.fda.gov/about-fda/contact-fda/subscribe-podcasts-and-news-feeds) | Relevant food labeling, allergen and food-safety news | Published feed directory verified; not configured in this collector |
| [Food Dive](https://www.fooddive.com/) | Food products, ingredients and reformulations; exclude corporate-only news and unsupported marketing claims | Proposed; permitted automated collection route and metadata use pending |
| [EatingWell](https://www.eatingwell.com/) | Consumer nutrition stories, grocery comparisons and practical food choices | Connected: publisher-advertised RSS, original headline links; 17 current eligible stories in the October 18 check |
| [Clean Eating](https://www.cleaneatingmag.com/) | Pantry choices and practical healthy-food/cooking ideas | Connected: anonymous RSS; zero current stories, latest returned publication September 15, 2025 |
| [ScienceDaily Nutrition](https://www.sciencedaily.com/news/health_medicine/nutrition/) | Nutrition research headlines with early-research labels when indicated | Connected: nutrition RSS; six current eligible stories in the October 18 check |

Harvard's three collections belong to one institution for source-diversity purposes. Deduplicate syndicated articles and multiple reports of the same underlying story. Published-at and updated-at dates are distinct; a routine page update does not establish a new news event.

### Discovery services and directories

- [NLM feed directory](https://www.nlm.nih.gov/listserv/rss_podcasts.html): reference for finding documented feeds, not an additional connected source.
- [NewsAPI Everything](https://newsapi.org/docs/endpoints/everything): optional multi-publisher search route; not connected. Credentials, production terms and budget require verification before use.
- [Google Search grounding through Gemini](https://ai.google.dev/gemini-api/docs/google-search): optional supported discovery route; not connected. Consumer Google AI Mode is not the app's backend interface. Credentials, cost and display/storage terms must be resolved before adoption.

For every added publisher, verify the collection method, allowed metadata/summary/image use, original links and reliable dates; test bounds, duplicates, relevance and failure preservation. No full articles or publisher photos are licensed by inclusion in this table. Use the same editorial checks for audience-tailored news under FB-23. These additions do not promise 30-50 newly published relevant articles each day.


## October 18 implementation checkpoint

[DEV-30 implementation and evidence](69-daily-personalized-food-news.md) is authoritative for source counts, backend profile selection, privacy, timer behavior, tests and native-release boundaries. The earlier documentation-only/source-pending checkpoints above describe history. No full articles, publisher images or paid AI/news service are used. Daily article updates require no new build after the new client is installed.


## Build 15 delivery — October 18

The news source expansion, freshness controls, minimized profile request, backend selection, General fallback and privacy/UI changes are now in **0.1.0 (15)**. Apple VALID / IN_BETA_TESTING and the existing owner group are verified. Earlier next-native-release notes are superseded; physical phone acceptance remains. [Release evidence](70-build15-fresh-personalized-news.md).
