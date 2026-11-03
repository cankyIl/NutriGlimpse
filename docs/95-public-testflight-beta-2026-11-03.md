# Public TestFlight beta preparation — November 3, 2026

## Verified outcome

NutriGlimpse 1.0 (29) was accepted for **TestFlight Beta App Review** on November 3 at 6:54:55 a.m. Eastern. Apple reports `WAITING_FOR_REVIEW` for the beta review and `WAITING_FOR_BETA_REVIEW` for external testing. The existing App Store submission remains Waiting for Review with manual release.

The external group **NutriGlimpse - Public Beta (US)** is created. Its build relationship confirms build29 only. Feedback is enabled. Apple Silicon Mac and Apple Vision availability are off for this group; intended devices are iPhone and iPad running iOS/iPadOS 16.4 or later. The owner internal group remains present.

English beta description, feedback email (`help@serveforward.us`), privacy URL, approved private review contact and no-login review instructions are saved. What to Test now covers onboarding, product identification, nutrition, alternatives, shelf batches/Finish, location, larger text and reliability. No new binary, App Store resubmission, app/backend deployment or model call was needed.

## Public invitation link

Requested limit: **10,000 external testers**. The public link remains disabled while beta review is pending. There is no usable invitation URL yet. Apple rejected setting the tester limit while the link was disabled, so the 10,000 cap is prepared for activation, not already configured. Automatic tester notification is off until the approved build is deliberately started for external testing.

After approval, the private activation helper checks the exact build/group, expiry, approval, device scope and external-testing state. It starts testing when required, enables the public link with the 10,000 cap, and verifies Apple's actual `https://testflight.apple.com/join/...` URL. Do not substitute an internal tester invitation URL.

The owner will add the link to the NutriGlimpse webpage. [Webpage copy](app-store/public-beta-webpage-copy.txt) is ready, including a disabled “Beta access coming soon” button for now. No website was changed.

## Audience and capacity

The description and webpage copy specify **US participants aged 21 and older**. This is intended-audience wording, not geographic enforcement. Apple's public-link criteria support device/OS filters, not country restrictions. Anyone can forward the link. App Store USA territory settings do not geographically restrict TestFlight public invitations.

The 10,000 figure is an enrollment ceiling, not simultaneous server capacity. Read-only inspection of the deployed frozen server confirms **two concurrent product-photo requests and two concurrent shelf-grid requests**. Excess requests receive busy/rate-limit responses. A large-load benchmark was not run; capacity for 10,000 active shoppers is not claimed. Start with a small wave. Queueing, load measurement, provider quotas/spend alerts and staged concurrency increases need engineering before a large campaign. Provider billing remains owner-managed; no obsolete $2 cap was reinstated.

Existing app-attestation deferral and shelf-model licensing uncertainty are unchanged, not newly cleared by this preparation.

## Verification and remaining steps

- Build29: VALID, unexpired, minimum OS 16.4, encryption=false and internal state IN_BETA_TESTING.
- Beta submission receipt and independent readback confirm the review is pending.
- Direct group/build relationship confirms exactly build29. Expanded Apple listings intermittently returned empty lists or HTTP500 after submission; direct object/relationship reads established the saved state. No duplicate group, upload or beta submission was made.
- Public health, support and privacy URLs return HTTP200 with a browser user agent. Plain Python's default user agent received HTTP errors; this was not diagnosed as an app outage. The backend service remains active.
- The App Store submission ID/date and manual release are unchanged. No additional testers were emailed or invited.
- Build29 expires January 27, 2027, approximately 8:06 p.m. Eastern. Continued beta testing beyond expiry requires a newer build.

Remaining: Apple Beta App Review approval; then start testing, activate/verify the invitation link and provide it for the owner's webpage. No new Apple account, Mac connection, tester-email list or app access keys are needed for this preparation. Capacity work remains separate before broad promotion.

Private snapshots, receipts, pre-change values and read/activation helpers are in `artifacts/testflight-public-beta-2026-11-03`. Private credentials and review-contact phone numbers are excluded from public docs.

Sources: [Apple external testers guide](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/), [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/).
