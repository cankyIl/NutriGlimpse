# App Store finalization - October 29, 2026

Apple approved NutriGlimpse 1.0 (29) on November 9, 2026. At the owner's request, the manual App Store release was accepted at 5:54 p.m. EST (22:54:11 UTC): HTTP201, followed by appStoreState=READY_FOR_SALE and appVersionState=READY_FOR_DISTRIBUTION. Free USA-only distribution was freshly verified. By 5:57 p.m. EST, the public US listing returned HTTP200 and Apple's catalog returned NutriGlimpse 1.0 at USD0. The App Store listing is live; installation on a phone has not been newly tested. Existing TestFlight access and the deployed app/backend are unchanged.

## App Store release accepted - November 9, 2026

Apple approved NutriGlimpse 1.0 (29) on November 9, 2026. At the owner's request, the manual App Store release was accepted at 5:54 p.m. EST (22:54:11 UTC): HTTP201, followed by appStoreState=READY_FOR_SALE and appVersionState=READY_FOR_DISTRIBUTION. Free USA-only distribution was freshly verified. By 5:57 p.m. EST, the public US listing returned HTTP200 and Apple's catalog returned NutriGlimpse 1.0 at USD0. The App Store listing is live; installation on a phone has not been newly tested. Existing TestFlight access and the deployed app/backend are unchanged.

Apple's new approval emails were received at 2:45 p.m. EST and identify the exact submitted review. Fresh API checks confirmed review submission COMPLETE, version PENDING_DEVELOPER_RELEASE, attached VALID build29, manual release, free pricing and only USA enabled before the single release request. The request was accepted with HTTP201; its immediate readback is READY_FOR_SALE / READY_FOR_DISTRIBUTION. Initial public lookup returned zero results and the listing returned HTTP404. A fresh 5:57 p.m. EST check confirmed propagation completed: the listing returns HTTP200 with NutriGlimpse and Apple's catalog returns exactly app6823645787, version1.0, price0 USD. The November 8 failure and support follow-up remain below as historical evidence.

**Evidence:** private artifacts/testflight-public-beta-2026-11-03/app-store-audit-2026-11-09.json, app-store-release-attempt-2026-11-09.json and app-store-public-after-release-2026-11-09.json. Public link: [NutriGlimpse on the US App Store](https://apps.apple.com/us/app/nutriglimpse/id6823645787). No app/backend source, distribution territory, price or TestFlight group was changed. At the owner's subsequent request, the webpage now carries the official App Store badge; see the webpage checkpoint below.

## App Store website badge published - November 9, 2026

The official unmodified black **Download on the App Store** badge is now the primary action on [serveforward.us/nutriglimpse](https://serveforward.us/nutriglimpse), pointing to [NutriGlimpse on the US App Store](https://apps.apple.com/us/app/nutriglimpse/id6823645787). Watch the demo and the existing TestFlight link remain; beta instructions are secondary. The outdated whole-app beta wording was removed. Only the NutriGlimpse HTML, a new page-v4.css and Apple's SVG badge were deployed, with a recoverable source backup; no service restart occurred.

**Verified:** both page routes return200 with the correct badge/link; CSS and SVG return200 and match deployed SHA-256 hashes; demo range requests return206; homepage and transparency return200. Video, poster, app icon, former CSS, server and main homepage hashes are unchanged. Browser visual verification was unavailable because local browser use is disabled in Work settings. Deployment/verification/badge provenance are under ServeForward/releases/nutriglimpse-appstore-20261109, mirrored in private App Store release evidence.

## Historical release attempt - November 8 (resolved November 9)

As of November 8 at 10:03 a.m. EST, Apple still reports WAITING_FOR_REVIEW for NutriGlimpse 1.0 (29). The owner authorized public release, but Apple rejected the official release request with HTTP409 / ENTITY_ERROR.RELATIONSHIP.INVALID.INVALID_STATE: "You cannot send the latest version of the App live in the current state." The November 6 Apple Support email says Ready for Distribution, so the email and live release system conflict. The US listing returns HTTP404 and the public lookup has zero results. Free USA-only configuration is verified; the app is not publicly released.

The request targeted app 6823645787, version fd671053-0397-4200-97e5-0317e7991f63 and VALID build29 (0d16fdf3-0139-408a-9f31-16377675b241), after fresh free/US-only and manual-release checks. One release POST was attempted at 2026-11-08T15:03:16Z; fresh readback stayed WAITING_FOR_REVIEW. No duplicate request, review resubmission, new build, deployment or tester email occurred. The failed request does not make the app public.

**Dependency:** Apple must resolve the support-email/release-state contradiction. Exact response, preflight and public lookup evidence are retained privately in artifacts/testflight-public-beta-2026-11-03/app-store-release-attempt-2026-11-08.json and app-store-public-after-release-attempt-2026-11-08.json.

**Support follow-up sent - November 8, 10:05 a.m. EST:** At the owner's request, replied to Apple's existing support email with its November 6 Ready for Distribution confirmation, the exact HTTP409 release error, app/version/build identifiers and the unavailable public US listing. Asked Apple to reconcile and resolve the blocking state, confirm approval of this exact version and escalate to the responsible release team if needed. The sent reply to Apple App Review was verified in Outlook. Await Apple's response; publishing remains blocked. Message text, case number and sent receipt are retained in private release evidence.

## Signed build and source

- Source commit: 0182f18020f57e38cdc399974b45b3d95dd219d0.
- Source-package input digest: 06efe36237d86fdb2db1c4d6a0f2fa6b857b417a2b5eeb47c7cf2e53098e51d6.
- IPA SHA-256: dd161ff41b572945f894e064e699053b5089d07a6a8d41cf622dcfcf322afe17; 59,405,347 bytes.
- Apple build ID: 0d16fdf3-0139-408a-9f31-16377675b241.
- Minimum iOS 16.4; iPhone and iPad supported.
- Both compiled shelf models and side-chat features retained; model rights are not newly asserted.
- Default-size visuals are unchanged. The decorative home heading scales up to 2x to preserve whole-word wrapping; body text retains normal system scaling and the full heading remains available to accessibility.

## Verification

825 core/service, 21 tooling, 10 report-adapter and 76 photo-UI checks passed, alongside needs/news/shelf checks; eight focused runtime/privacy/expiry checks and two production-launcher checks pass. Typecheck/lint pass. All 282 native inputs, App Store signature, eight privacy manifests and ten declared data types verify. Five targeted build 29 simulator scenarios pass, including largest text on iPhone/iPad and profile persistence across installation over build 28.

Native encrypted export and share cancellation also pass. The captured fictional-profile archive decrypts with the expected passphrase, rejects a wrong passphrase and is removed from the app cache when sharing closes. Full Files-picker restore on a physical phone remains untested.

Initial native harness attempts omitted Host.swift or used an ambiguous nested text query. The unchanged host was copied and the heading locator scoped to firstMatch. Failed evidence is retained and only affected scenarios retried. The encrypted-export harness was also updated to dismiss the iOS share popover with its outside-tap behavior. No app binary change was needed for those harness corrections. Largest-text screenshots on both form factors were visually inspected.

The product model/transport test returned three alternatives, with first content at 4.775s and final result at 23.223s. The 9-cell public shelf grid streamed first cards at 5.959s, processed 9/9 cells, combined two repeat appearances into 7 products, and finalized at 90.176s. Gemini output was delivered; completion of a supplemental GPT result is not established. Healthy shelf choices suppressed outside alternatives. Nutrition/aisle claims from these model returns are not independent ground truth, and one product alternative lacked a photo.

## Production and restore

Frozen source: releases/backend-production-2026-10-29, revision 0182f18020f57e38cdc399974b45b3d95dd219d0. The production launcher runs against the existing project runtime through GROCERY_RUNTIME_ROOT, not fresh catalogs or keys. Staging used a separate port and consistent database copies; copied staging secrets were removed after shutdown. Fourteen database checkpoint copies passed integrity checks. Fifteen credential/configuration hashes were unchanged. The existing production journal files gained no new records across live calls; old records still expire after seven days.

Only congress-beta-backend.service was restarted. Portfolio, website and other user services remain active. Runtime prompt files match the reviewed release; the approved shopper prompts did not change. Public support/privacy pages, catalog, photo capabilities and selected/no-selected-store location logic pass.

Rollback: the private backend-checkpoint contains the exact former unit, database backups, source/config hashes and service state. Restore the prior unit and restart only the app service if needed; keep current keys and usage, and honor deletion intents before restoring data. The older encrypted build 27 baseline and all build 28 IPAs/source packages remain preserved.

## Apple preparation and remaining actions

All ten screenshots are processed/ordered; build 29 is attached to version 1.0, approved and released November 9. Apple reports READY_FOR_DISTRIBUTION and the public US listing is verified live. Free/USA-only settings remain. TestFlight access is verified for the existing owner group; installation of build 29 is not claimed.

The owner-authorized release of exact version 1.0 (29) was accepted on November 9 and the public US listing is verified live. Apple's approval/release-state contradiction is resolved. No publishing dependency remains. Continue ordinary app support and staged capacity verification; actual App Store installation on a phone has not been newly tested.

The local browser-control tool failed to initialize with a missing-assets-path error. Apple API draft/build checks succeeded, but no App Privacy questionnaire publication was attempted through an unverified API. The owner subsequently confirmed publishing App Privacy answers on October 29. The worksheet records the prepared proposal, not an independently verified readback of those published entries.

Full manual VoiceOver, per-device physical interruption/permissions and a complete native Files-picker backup/restore remain coverage limits. Build28's owner acceptance is retained; it is not substituted for observations never reported.

Private evidence: artifacts/appstore-finalization-2026-10-29 and artifacts/testflight-public-beta-2026-11-03. The authorized App Review submission and November 9 public-release request were accepted. Public US storefront visibility is verified; phone installation is not newly claimed. No new tester invitation or tester message was sent.

## Earlier submission validation - resolved October 29 evening

The owner explicitly approved submitting 1.0 (29) with the prepared listing and all ten screenshots. Fresh Apple checks confirmed build identity/VALID, encryption false, reviewer details, unchanged listing, ten COMPLETE screenshot assets, free USA-only distribution and manual release. Apple accepted one draft review container (17cb8679-e504-4514-9cb6-6813a2916277), but rejected adding the app version; it then had zero items and no submitted date. This historical attempt was not yet Waiting for Review. No duplicate submission was created.

Apple first reported missing content rights and regulated-medical-device declarations. USES_THIRD_PARTY_CONTENT was saved and verified under the existing owner release decision; the documented model-license uncertainty is unchanged. The next validation reported only STATE_ERROR.CANNOT_SUBMIT_MISSING_REGULATED_MEDICAL_DEVICE_APP_DECLARATION. The current public Apple API specification 4.5.1 has no medical-declaration endpoint. Browser control again failed with the missing kernel-assets path error. The owner subsequently confirmed completing the requested medical-device declaration in App Information. The saved field is not independently readable through the public API, but Apple accepted the subsequent submission and no longer rejected this declaration.

The guarded helper reuses the exact draft container, confirms the sole app-version item and build29, and preserves manual release before submitting. No release or new build is authorized by this checkpoint. Evidence: app-review-owner-authorization.json, app-review-preflight.json, app-review-api-error-detail.json, content-rights-readback.json and app-review-created-submission.json in the private finalization artifacts.

## Submission accepted - October 29, 10:54 p.m. EDT

Apple accepted the authorized review submission at 2026-10-30T02:54:28.284Z. Submission 17cb8679-e504-4514-9cb6-6813a2916277 and version fd671053-0397-4200-97e5-0317e7991f63 both read WAITING_FOR_REVIEW. The reused container has exactly one item for version 1.0 with build29 (0d16fdf3-0139-408a-9f31-16377675b241). Final checks verified the reviewed listing, ten completed screenshots, reviewer contact, free USA-only distribution, VALID build and encryption declaration. Manual release remains selected. No duplicate submission, source change, new build, deployment or public release occurred.

Evidence: app-review-submit-response.json, app-review-submission-receipt.json, app-review-created-item.json, app-review-before-submit.json and the refreshed apple-draft-readback.json. Owner authorization and previous validation failures remain preserved. No owner action is currently needed; await Apple review, then separately decide the manual public-release step. Review acceptance is not app approval and does not certify nutrition, privacy or licensing claims.

## Review-status inquiry sent - November 1

The owner requested a follow-up and completed Apple website sign-in. The inquiry was sent through the dedicated App Review Status email-support form. Apple confirmed successful receipt and assigned a case; its ID, exact text and screenshot are private artifacts under app-review-followup-2026-11-01. Build29 was freshly verified WAITING_FOR_REVIEW immediately before sending. The message requests queue confirmation and any required information or action. Apple replied on November 6 saying Ready for Distribution; the November 8 release attempt above records the conflicting live state. No expedited review, cancellation, duplicate submission or automatic release was requested.

## Public beta preparation - November 3

Build29 was separately approved for TestFlight Beta App Review on November 3. External testing is IN_BETA_TESTING and the public invitation [https://testflight.apple.com/join/pA6z7nPH](https://testflight.apple.com/join/pA6z7nPH) is enabled with a verified 10,000-enrollment cap. The public landing page returns HTTP200 and offers NutriGlimpse beta installation instructions. App Store review remains WAITING_FOR_REVIEW with manual release. No new binary or deployment occurred. See [public beta handoff](95-public-testflight-beta-2026-11-03.md) for capacity limits and webpage copy.
