# Public TestFlight beta preparation — November 3, 2026

## Verified outcome

NutriGlimpse 1.0 (29) was accepted for **TestFlight Beta App Review** on November 3 at 6:54:55 a.m. Eastern. Later on November 3, Apple approval was verified: beta review `APPROVED`; external testing is now `IN_BETA_TESTING`. The separate App Store version was approved and its manual release accepted November 9 (READY_FOR_DISTRIBUTION); the public US listing is verified live.

The external group **NutriGlimpse - Public Beta (US)** is created. Its build relationship confirms build29 only. Feedback is enabled. Apple Silicon Mac and Apple Vision availability are off for this group; intended devices are iPhone and iPad running iOS/iPadOS 16.4 or later. The owner internal group remains present.

English beta description, feedback email (`help@serveforward.us`), privacy URL, approved private review contact and no-login review instructions are saved. What to Test now covers onboarding, product identification, nutrition, alternatives, shelf batches/Finish, location, larger text and reliability. No new binary, App Store resubmission, app/backend deployment or model call was needed.

## Public invitation link

**Active public invitation:** [https://testflight.apple.com/join/pA6z7nPH](https://testflight.apple.com/join/pA6z7nPH)

The link is enabled with **10,000 external tester enrollments**. Independent Apple API readback verifies enabled=true, limitEnabled=true, limit=10000, exact build29 membership, APPROVED beta review and external IN_BETA_TESTING. The public invitation page returned HTTP200 with title "Join the NutriGlimpse beta - TestFlight - Apple" and TestFlight installation / View NutriGlimpse Beta instructions. No full/unavailable message was present. Installation by any new tester is not claimed.

The activation helper was updated to recognize Apple's documented BETA_APPROVED state as eligible to start testing. It retained approval, exact build/group, expiry and device checks. Starting testing completed before enabling the invitation; the server read back IN_BETA_TESTING. No duplicate group, build or review submission was created.

The public invitation is now published on [https://serveforward.us/nutriglimpse](https://serveforward.us/nutriglimpse) as a prominent "Join the free beta on TestFlight" button next to "Watch the demo", with short iPhone/iPad installation instructions. [Webpage copy](app-store/public-beta-webpage-copy.txt) contains the live URL. Browser click reached Apple's NutriGlimpse invitation page. Both page routes and the new CSS return HTTP200; the existing demo video still supports byte-range HTTP206. The origin HTML matches the deployed file; Cloudflare adds its existing analytics script at the edge. Video/poster/icon, the main homepage and backend files retain their prior hashes. Backup and verification: ServeForward/releases/nutriglimpse-testflight-20261103. No service restart was required.

## App Store option added - November 9

NutriGlimpse 1.0 (29) is approved and released on the US App Store. The public listing returns200 and Apple's catalog shows version1.0 at USD0. The webpage now uses the official Download on the App Store badge as its primary action, while keeping the existing TestFlight invitation and demo. Beta access remains separate. Page/asset hashes and demo range requests pass; browser visual verification was unavailable because local browser use is disabled.

## Audience and capacity

The description and webpage copy specify **US participants aged 21 and older**. This is intended-audience wording, not geographic enforcement. Apple's public-link criteria support device/OS filters, not country restrictions. Anyone can forward the link. App Store USA territory settings do not geographically restrict TestFlight public invitations.

The 10,000 figure is an enrollment ceiling, not simultaneous server capacity. Read-only inspection of the deployed frozen server confirms **two concurrent product-photo requests and two concurrent shelf-grid requests**. Excess requests receive busy/rate-limit responses. A large-load benchmark was not run; capacity for 10,000 active shoppers is not claimed. Start with a small wave. Queueing, load measurement, provider quotas/spend alerts and staged concurrency increases need engineering before a large campaign. Provider billing remains owner-managed; no obsolete $2 cap was reinstated.

Existing app-attestation deferral and shelf-model licensing uncertainty are unchanged, not newly cleared by this preparation.

## Verification and remaining steps

- Build29: VALID, unexpired, minimum OS 16.4, encryption=false and internal state IN_BETA_TESTING.
- Beta approval, external testing and the active public link/cap are confirmed by independent readback.
- Direct group/build relationship confirms exactly build29. Expanded Apple listings intermittently returned empty lists or HTTP500 after submission; direct object/relationship reads established the saved state. No duplicate group, upload or beta submission was made.
- Public health, support and privacy URLs return HTTP200 with a browser user agent. Plain Python's default user agent received HTTP errors; this was not diagnosed as an app outage. The backend service remains active.
- The App Store submission ID/date are unchanged; review is COMPLETE and the November 9 manual release was accepted. Public TestFlight invitation access remains enabled. No individual tester invitations or messages were sent.
- Build29 expires January 27, 2027, approximately 8:06 p.m. Eastern. Continued beta testing beyond expiry requires a newer build.

Remaining: begin a small testing wave using the published webpage invitation. No Apple beta approval, account, Mac connection, tester-email list or access-key dependency remains for invitations. Capacity measurement, queueing and provider-limit work remain before broad promotion. The discussed 10-photo/2-shelf then 20-photo/4-shelf levels are future load-test targets, not measured or deployed capacity.

Private snapshots, receipts, pre-change values and read/activation helpers are in `artifacts/testflight-public-beta-2026-11-03`. Private credentials and review-contact phone numbers are excluded from public docs.

Sources: [Apple external testers guide](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/), [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/).
