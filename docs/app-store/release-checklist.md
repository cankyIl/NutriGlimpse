# App Store release checklist - October 28, 2026

No App Review submission or new TestFlight upload. Current beta remains 27. Latest signed 1.0 (28) includes security/privacy changes, production cleanup and keyboard dismissal; native simulator checks pass and verified backups are complete.

| ID | Item | Current status |
|---|---|---|
| AS-01 | Restorable baseline | Complete: build 27 IPA/source/backend/data/dependencies; 757 source hashes, three databases and isolated restore checks; encrypted off-machine copy and separate key verified. |
| AS-02 | Isolated release work | Complete: candidate branch separate from live beta. Only fixed public support/privacy routes were added to the running backend this checkpoint. Other services and app scan behavior preserved. |
| AS-03 | Apple draft and distribution | Verified again October 28: version1.0 Prepare for Submission, manual release, $0.00, USA only, future territories off. Latest uploaded build 27 is VALID. |
| AS-04 | Listing and contact | Listing/age/contact/URLs/reviewer notes saved/read back. Private contact stays outside source. Home/profile/privacy iPhone/iPad screenshot drafts captured; product/shelf captures and final selection/upload pending. |
| AS-05 | Production cleanup | Temporary timing modules/payloads/hooks/receiver removed. Production hides beta engineering UI and disables new answer journals. Legacy expiry prevents old beta records persisting indefinitely after cutover. |
| AS-06 | Production UI/source | Version1.0 candidate 28 retains identity and side-chat features. Privacy links available before terms and in Privacy & storage. Latest production Hermes export passed. Included in the final signed 28 archive and simulator build. |
| AS-07 | Public support/privacy | Complete: HTTPS pages live; GET/HEAD/method/security checks and mobile/desktop browser checks pass. Contact works per owner. Policy accurately distinguishes current beta and planned production. Final cutover wording still to update after deployment. |
| AS-08 | Privacy/age declarations | Ten collected-data categories and required-reason APIs declared in source. Detailed Apple privacy worksheet prepared; privacy label not yet published. Adult age override and health/medical topics saved/read back; final owner review pending. |
| AS-09 | Shelf distribution rights | Detectors retained as directed. SKU110K academic/noncommercial notice and ShelfSet/upstream terms remain unresolved. Deferring the question is not permission. Need owner-supplied distribution rights or approval for a permitted replacement/release scope. |
| AS-10 | Seller/health scope | Individual / Viraank Gaur confirmed. General nutrition scope and optional health features accurately described. Apple5.1.1(ix) eligibility remains a review consideration, not an automatic requirement to purchase an Organization account. |
| AS-11 | Hosted backend access | Stronger app verification remains explicitly deferred by owner. Existing rate limits do not prevent a fork using the hosted paid endpoints. No tester-key flow reintroduced. |
| AS-12 | Native archive | Complete: latest signed 28 passes distribution signature,282 source-input and ten-type/eight-manifest checks. Both approved temporary folders deleted; about 6.23 GB recovered. Proper Xcode simulator signing resolved initial storage failure. Setup/save/restart and larger-iPhone/iPad privacy/profile checks pass; no new upload. |
| AS-13 | Device acceptance | Final build needs iPhone X/iOS 16.7.16 and iPhone 17 checks: setup/save, product and shelf 9 + partial Finish, streaming, three suitable alternatives where available, dedup, permissions, background/cancel, offline/retry, reset and health-sharing choices. Fixtures do not prove camera acceptance. |
| AS-14 | iPad/screenshots/accessibility | iPad portrait/landscape navigation and initial layouts checked; truthful home/profile/privacy drafts captured on large iPhone/iPad. Product/shelf-result screenshots, full text scaling/VoiceOver/contrast/touch audit and final selection remain. No unsupported accessibility claim. |
| AS-15 | Security/dependencies | Candidate fixes implemented: upstream Zod4.6.7/node-forge1.4.2, Expo patch alignment, hash-pinned deepmerge/Zod3 compatibility patches and existing decoder fix. Clean install passes; Expo Doctor21/21. Audit still reports11 version-based entries for patched packages/parent chains. Final native archive and simulator compilation pass; physical acceptance pending. |
| AS-16 | Regression evidence | Final production checks pass:825 core/service, 18 tooling, 10 report adapters, 76 photo UI scenarios, needs/news/shelf checks; two private-deletion helper tests. iOS Hermes export passes. No live model calls. |
| AS-17 | Final submission | Finish native/device/screenshots/privacy label and rights evidence; owner reviews final listing/declarations/build and authorizes submission. Manual release retained. No promise of Apple approval. |

## Exact remaining owner actions

Mac setup and approved cleanup are complete. Signed archives, source packages, logs and rollback baseline are preserved; no further deletion approval is requested.

1. Confirm the fictional/public-test Google dataset has been deleted before public launch, as selected by the owner. Project-log expiry 7 days and Google/OpenAI logging-on/training-off are already confirmed. Report only nondefault provider/infrastructure settings not previously disclosed.
2. Provide written rights to redistribute the bundled shelf models, or approve a release path using permitted replacements. Existing models remain retained until a decision.
3. Review the concrete privacy worksheet, listing/age answers, final screenshots and device results before App Review submission. Existing seller, support and private contact details are complete.

Engineering still owns physical scan/backup acceptance, remaining accessibility and product/shelf screenshots, Apple privacy-label publication after review, production backend cutover and verification. Signed archive, core simulator UI checks and initial screenshot drafts are complete. Actual-phone observations may need owner participation; no physical acceptance is inferred from simulator tests. Before restoring, honor deletion intents and current usage/key state.
