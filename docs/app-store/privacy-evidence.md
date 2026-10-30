# App Store privacy evidence — release candidate, October 27, 2026

This is engineering evidence; the public policy is now live at https://grocery.serveforwad.com/privacy. The owner confirmed Apple privacy-label publication on October 29; see privacy-answers.md for the prepared proposal and readback limits. Build 29 is Apple VALID, and the matching frozen production backend and updated policy are deployed. Build 28 owner acceptance and build 29 targeted native evidence are recorded.

## Actual data paths

| Flow | Data leaving phone | Destination/use | Release handling and remaining evidence |
|---|---|---|---|
| Product photo / shelf | Resized product photo or grid; selected store/town; optional shared health/preferences | Our backend → Gemini and OpenAI, including web search | Explicit sharing choices preserved. Name, report pixels and exact GPS excluded from prompts. Production disables persisted beta answer/decision journals. Provider retention still applies. |
| No store selected | Fresh coordinates rounded to two decimal places | Backend nearby-store selection; town/public store names sent to models | Source: groceryContext.ts and groceryLocation.ts. No home street address in model context. |
| Retailer/image lookup | Product identity, selected public store or approximate location context | SerpApi / Serper, retailer/product image hosts | Availability response cache is memory-only, up to five minutes with expiry timers. These services and infrastructure require disclosure; do not equate absence of model GPS with no location processing. |
| Optional lipid analysis | Supported measurements, units, comparison signs, page numbers, printed date | Backend → OpenAI | Separate accepted agreement; raw report/identifying text excluded. Request uses store:false and background:false. Report-derived health context can later accompany scans only under scan-sharing choice. |
| Profile and local files | No upload merely from saving profile/importing locally | Encrypted device database and owner-exported backups | Backup-exclusion plugin retained. Reset clears app records; exported files are separate. Native signed-binary verification remains required. |
| Food news | Selected topics and broad audience context | Our backend selects from public daily news pool | No exact age/name/gender/measurements/lab/location/photos or LLM request. Only general edition is cached for offline use. |
| Service operations | IP/network metadata at hosting/CDN; aggregate model/budget counters | Infrastructure and backend operations | Production diagnostics flag cannot create beta stores outside beta0. Provider/infrastructure account logging settings must be checked before final retention promises. |

The shelf server retains recent result promises in a bounded memory map to avoid repeat charges for a batch. Logical expiry is 15 minutes, with removal on later requests; it is not a promise of physical memory erasure at the 15-minute instant. Production disabling the disk journal does not remove these request-deduplication caches or third-party records.

## Provider settings confirmed by owner — October 28, 2026

| Provider | Request/response logging | Optional training / product-improvement sharing | Evidence |
|---|---|---|---|
| Google Gemini / AI Studio | Enabled | Disabled | Owner confirmation in this conversation; dashboard not independently inspected. |
| OpenAI API | Enabled | Disabled | Owner confirmation in this conversation; dashboard not independently inspected. |

Owner follow-up confirms Google project-log expiry is7 days. A separate dataset contains only fictional/public test data. Deletion before launch was the owner's earlier preference; after the October29 clarification it is not treated as a mandatory release blocker. No dataset has been deleted or independently inspected. These confirmations resolve the account-setting questions, not Zero Data Retention. Provider logging remains separate from our production journal disablement. No provider setting or dataset was changed by this preparation.

## Provider retention evidence

- OpenAI: the app's request builders use store:false. That avoids normal retrievable Responses state; it does not itself eliminate abuse-monitoring retention. Standard abuse-monitoring retention is up to30 days, with policy exceptions. API data is not used for training by default; the owner confirms optional training/improvement sharing is disabled. Do not claim Zero Data Retention. [Official OpenAI documentation](https://developers.openai.com/api/docs/guides/your-data).
- Google paid Gemini: paid-service prompts/responses are not used for product improvement under the standard paid-service terms. Search grounding retains prompts/context/output for30 days for grounding/debugging purposes. [Gemini API terms](https://ai.google.dev/gemini-api/terms).
- Google abuse monitoring separately describes55-day retention of prompts/context/output. [Abuse-monitoring policy](https://ai.google.dev/gemini-api/docs/usage-policies).
- AI Studio project logs are a separate configurable store. Owner confirms7-day expiry, logging on and contribution off. A fictional/public-test dataset exists; the earlier deletion preference is under clarification, and retention of fictional/public-only test data does not by itself block release. The7-day log setting does not prove dataset expiry or override service/security retention. [Logging policy](https://ai.google.dev/gemini-api/docs/logs-policy).

## App Privacy worksheet

Health information, photos/user content and coarse location require disclosure analysis for both our backend and partners. Optional sharing does not automatically exempt collection. Do not select Data Not Collected solely because our service does not write original photos. No advertising/cross-app tracking use was found in app source; confirm provider/infrastructure configuration. Linkage and purposes must be answered from final implementation and account evidence, not guessed from anonymous UI.

Public contact is help@serveforward.us, verified receiving/replying by owner. Private Apple review contact is stored outside Git and has been saved/read back in App Store Connect. Support requests should use approximate scan time and app version; never ask for a full medical report. Explain whether applicable records can be located and what can be deleted; do not promise deletion of unidentified provider records or user-owned exported backups.

## Remaining before App Store submission

Support/privacy pages are published, tested and saved in the Apple draft. The signed candidate verifies ten proposed data types and native reasons; age/health draft answers are saved/read back. Google project-log expiry and dataset scope are owner-confirmed. October 29: production cutover and updated retention wording are complete; build28 owner acceptance and build 29 targeted native checks are recorded. App Privacy publication is owner-confirmed. The owner completed the medical-device declaration and Apple accepted the authorized App Review submission; version1.0/build29 is WAITING_FOR_REVIEW. Specific physical/Files-picker restore and full manual VoiceOver coverage are not inferred.

A deletion helper is implemented and tested; see privacy-deletion-runbook.md. The production candidate continues expiring pre-existing beta records without creating new journal files or loading response keys. This behavior is deployed and verified October 29; live public-fixture calls added no beta journal records. Provider retention and third-party deletion limitations are still separate.

## Publication and linkage evidence - October 29

The owner reports the App Privacy answers are published. Browser automation failed before publication, so the exact published values were not independently observed. The prepared linked-to-user Yes entries were conservative proposals, not proof of identity linkage for every category. Source inspection found no name, home address, phone number, consumer account or device identifier in the grocery request schema; health sharing is optional and location is limited to selected public stores or rounded coordinates. Per-request trace and shelf-session identifiers are not proof of a named shopper identity. Provider/CDN and voluntary support correspondence may have additional linkage; their exact account settings were not independently audited. This checkpoint records owner publication without asserting an unverified privacy-label readback or changing any published answer.
