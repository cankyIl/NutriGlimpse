# App Store release checklist - October 28, 2026

No App Review submission or new TestFlight upload. The current public beta remains build27. The final signed1.0(28) candidate now includes security/privacy updates and production onboarding cleanup; it is verified and backed up, not uploaded.

| ID | Item | Current status |
|---|---|---|
| AS-01 | Restorable baseline | Complete: build27 IPA/source/backend/data/dependencies; 757 source hashes, three databases and isolated restore checks; encrypted off-machine copy and separate key verified. |
| AS-02 | Isolated release work | Complete: candidate branch separate from live beta. Only fixed public support/privacy routes were added to the running backend this checkpoint. Other services and app scan behavior preserved. |
| AS-03 | Apple draft and distribution | Verified again October28: version1.0 Prepare for Submission, manual release, $0.00, USA only, future territories off. Latest uploaded build27 is VALID. |
| AS-04 | Listing and contact | Description, keywords, promotional text, copyright, subtitle, support/privacy links, categories and reviewer notes saved/read back. Private contact preserved outside source. Screenshots still pending. |
| AS-05 | Production cleanup | Temporary timing modules/payloads/hooks/receiver removed. Production hides beta engineering UI and disables new answer journals. Legacy expiry prevents old beta records persisting indefinitely after cutover. |
| AS-06 | Production UI/source | Version1.0 candidate28 retains identity and side-chat features. Privacy links available before terms and in Privacy & storage. Latest production Hermes export passed. Included in the final signed28 archive and simulator build. |
| AS-07 | Public support/privacy | Complete: HTTPS pages live; GET/HEAD/method/security checks and mobile/desktop browser checks pass. Contact works per owner. Policy accurately distinguishes current beta and planned production. Final cutover wording still to update after deployment. |
| AS-08 | Privacy/age declarations | Ten collected-data categories and required-reason APIs declared in source. Detailed Apple privacy worksheet prepared; privacy label not yet published. Adult age override and health/medical topics saved/read back; final owner review pending. |
| AS-09 | Shelf distribution rights | Detectors retained as directed. SKU110K academic/noncommercial notice and ShelfSet/upstream terms remain unresolved. Deferring the question is not permission. Need owner-supplied distribution rights or approval for a permitted replacement/release scope. |
| AS-10 | Seller/health scope | Individual / Viraank Gaur confirmed. General nutrition scope and optional health features accurately described. Apple5.1.1(ix) eligibility remains a review consideration, not an automatic requirement to purchase an Organization account. |
| AS-11 | Hosted backend access | Stronger app verification remains explicitly deferred by owner. Existing rate limits do not prevent a fork using the hosted paid endpoints. No tester-key flow reintroduced. |
| AS-12 | Native archive | Complete: final signed28 passes distribution signature,282 source-input and corrected-manifest checks. Mac setup/component mismatch resolved; simulator compilation passes. Simulator UI check failed before onboarding at storage initialization. Check simulator keychain signing and rerun after approved6GB temporary-folder cleanup; physical encryption/backup acceptance remains. |
| AS-13 | Device acceptance | Final build needs iPhoneX/iOS16.7.16 and iPhone17 checks: setup/save, product and shelf9+partial Finish, streaming, three suitable alternatives where available, dedup, permissions, background/cancel, offline/retry, reset and health-sharing choices. Fixtures do not prove camera acceptance. |
| AS-14 | iPad/screenshots/accessibility | iPad support remains enabled. Capture truthful final iPhone/iPad screens using fictional details; verify tablet layout, text scaling, VoiceOver, contrast and touch targets. No unsupported accessibility claims. |
| AS-15 | Security/dependencies | Candidate fixes implemented: upstream Zod4.6.7/node-forge1.4.2, Expo patch alignment, hash-pinned deepmerge/Zod3 compatibility patches and existing decoder fix. Clean install passes; Expo Doctor21/21. Audit still reports11 version-based entries for patched packages/parent chains. Final native archive and simulator compilation pass; physical acceptance pending. |
| AS-16 | Regression evidence | Final production checks pass:825 core/service,18 tooling,10 report adapters,76 photo UI scenarios, needs/news/shelf checks; two private-deletion helper tests. iOS Hermes export passes. No live model calls. |
| AS-17 | Final submission | Finish native/device/screenshots/privacy label and rights evidence; owner reviews final listing/declarations/build and authorizes submission. Manual release retained. No promise of Apple approval. |

## Exact remaining owner actions

Immediate: approve the two specifically identified failed/superseded Mac temporary build directories for cleanup (about6GB), or free equivalent disk space. Final signed IPAs, source archives, logs, current work and rollback backups are preserved. Initial setup/admin approval is complete; do not repeat it.

1. Confirm Google AI Studio's configured request-log expiry and whether a separate dataset of app requests exists. Logging-on/training-off was already confirmed; no keys or prompt contents are needed. Mention only any nondefault OpenAI retention or infrastructure log export if configured.
2. Provide written rights to redistribute the bundled shelf models, or approve a release path using permitted replacements. Existing models remain retained until a decision.
3. Review the concrete privacy worksheet, listing/age answers, final screenshots and device results before App Review submission. Existing seller, support and private contact details are complete.

Engineering still owns simulator screenshots, remaining encryption/backup and device checks, production backend cutover and verification. The final native archive and manifest checks are complete. Those are not tasks being transferred to the owner. Device observations may require the owner using the actual phones. Before restoring, honor deletion intents and current usage/key state.
