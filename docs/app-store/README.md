# NutriGlimpse App Store preparation

Updated October 28, 2026. Preparation only: no App Review submission or public app release. Version 1.0 is in Prepare for Submission, with free pricing, USA-only availability, automatic territory expansion off and manual release verified. NutriGlimpse 1.0 (28) is Apple VALID / IN_BETA_TESTING, assigned to the existing owner TestFlight group. Encryption=false and English test notes are verified. Owner installation is not yet verified.

Support and privacy pages are public, tested and saved in the Apple draft. Release source stays isolated from the live beta. The latest signed 1.0 (28) candidate includes security/privacy updates, production cleanup and the keyboard fix. Its signature and 282 required inputs match the tested source. iPhone setup/save/restart and larger-iPhone/iPad profile/privacy interactions pass; tablet rotation and initial screenshot drafts are checked. The earlier simulator storage failure was caused by the unsigned simulator test build and is resolved with Xcode simulator signing. The corrected candidate is uploaded and Apple-accepted; physical acceptance remains pending. The required SDK motion declaration and support-email accessibility fix are included. Motion data is not requested or used.

- metadata.en-US.json: listing, verified settings and private-contact placeholders.
- privacy-policy-draft.md and support-draft.md: published-page locations and cutover requirements.
- privacy-answers.md: exact proposed App Privacy choices and remaining owner confirmation.
- privacy-evidence.md: inspected data flows and provider retention evidence.
- privacy-deletion-runbook.md: verified trace deletion and restore obligations.
- age-rating-draft.json: draft answers saved/read back in Apple, pending owner review.
- encryption-and-manifest-review.md: source inventory, required-reason evidence and remaining binary checks.
- native-verification.md: exact final signed archive, simulator evidence and remaining device acceptance.
- dependency-review.md: upstream fixes, pinned compatibility patches and residual scanner findings.
- release-checklist.md: current gates, including device acceptance and distribution rights.

Run node ops/app-store-preflight.cjs from this checkout. It reports actual local checks and deliberately remains not-ready until manual evidence is complete. It does not upload or submit. APP_STORE_PRIVATE_CONFIG may point to the ignored private review-contact file; never commit that file or contact phone.

- testflight28-owner-checklist.md: actual-phone upgrade and scan checks.
- production-cutover.md: prepared deployment and rollback steps, not executed.

Build28 is attached to the version1.0 App Store draft. Apple read-back confirms Prepare for Submission and manual release; no App Review submission occurred.
