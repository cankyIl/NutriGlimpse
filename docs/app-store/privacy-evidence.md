# App Store privacy evidence — release candidate, October 27, 2026

This is engineering evidence; the public policy is now live at https://grocery.serveforwad.com/privacy. Apple privacy-label answers remain unpublished; see privacy-answers.md. App/backend production configuration must move together. TestFlight27 and current beta scan behavior remain unchanged.

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

This resolves the open yes/no account-setting question. It does not establish Zero Data Retention or a particular project log-expiry setting. Production app/server journal disablement remains independent of provider logging; do not change request store:false options to create extra provider-side state. Verify applicable log periods/dataset exceptions when finalizing the retention schedule. No provider setting was changed by this preparation.

## Provider retention evidence

- OpenAI: the app's request builders use store:false. That avoids normal retrievable Responses state; it does not itself eliminate abuse-monitoring retention. Standard abuse-monitoring retention is up to30 days, with policy exceptions. API data is not used for training by default; the owner confirms optional training/improvement sharing is disabled. Do not claim Zero Data Retention. [Official OpenAI documentation](https://developers.openai.com/api/docs/guides/your-data).
- Google paid Gemini: paid-service prompts/responses are not used for product improvement under the standard paid-service terms. Search grounding retains prompts/context/output for30 days for grounding/debugging purposes. [Gemini API terms](https://ai.google.dev/gemini-api/terms).
- Google abuse monitoring separately describes55-day retention of prompts/context/output. [Abuse-monitoring policy](https://ai.google.dev/gemini-api/docs/usage-policies).
- AI Studio project logs are a separate configurable store. Logging defaults depend on API/project creation date; a paid key alone does not prove it is off. Logs can be retained7/14/28/55 days; datasets can persist longer. The owner confirms logging on and contribution off; the configured period and any retained datasets are not independently verified. [Logging policy](https://ai.google.dev/gemini-api/docs/logs-policy).

## App Privacy worksheet

Health information, photos/user content and coarse location require disclosure analysis for both our backend and partners. Optional sharing does not automatically exempt collection. Do not select Data Not Collected solely because our service does not write original photos. No advertising/cross-app tracking use was found in app source; confirm provider/infrastructure configuration. Linkage and purposes must be answered from final implementation and account evidence, not guessed from anonymous UI.

Public contact is help@serveforward.us, verified receiving/replying by owner. Private Apple review contact is stored outside Git and has been saved/read back in App Store Connect. Support requests should use approximate scan time and app version; never ask for a full medical report. Explain whether applicable records can be located and what can be deleted; do not promise deletion of unidentified provider records or user-owned exported backups.

## Remaining before App Store submission

Support/privacy pages are published, tested and saved in the Apple draft. Native manifest declarations are corrected in source; ten proposed data types are documented in privacy-answers.md. Age/health questionnaire draft answers are saved/read back. The exact Google project-log expiry/dataset exceptions remain an owner confirmation. Final owner review, native/device verification and publication of Apple's privacy label remain open.

A deletion helper is implemented and tested; see privacy-deletion-runbook.md. The production candidate continues expiring pre-existing beta records without creating new journal files or loading response keys. This behavior is tested but not yet deployed. Provider retention and third-party deletion limitations are still separate.
