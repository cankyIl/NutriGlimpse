# NutriGlimpse App Store preparation

Updated October 28, 2026. Preparation only: no App Review submission or public app release. Version 1.0 is in Prepare for Submission, with free pricing, USA-only availability, automatic territory expansion off and manual release verified. The released TestFlight app remains 0.1.0 (27).

Support and privacy pages are now public, tested, and saved in the Apple draft. Release source stays isolated from the live beta. The previously signed 1.0 (28) archive predates the security updates and privacy-manifest correction: preserve it as evidence, but rebuild before upload.

- metadata.en-US.json: listing, verified settings and private-contact placeholders.
- privacy-policy-draft.md and support-draft.md: published-page locations and cutover requirements.
- privacy-answers.md: exact proposed App Privacy choices and remaining owner confirmation.
- privacy-evidence.md: inspected data flows and provider retention evidence.
- privacy-deletion-runbook.md: verified trace deletion and restore obligations.
- age-rating-draft.json: draft answers saved/read back in Apple, pending owner review.
- encryption-and-manifest-review.md: source inventory, required-reason evidence and remaining binary checks.
- native-verification.md: historical signed archive, clearly separated from the latest unbuilt source.
- dependency-review.md: upstream fixes, pinned compatibility patches and residual scanner findings.
- release-checklist.md: current gates, including device acceptance and distribution rights.

Run node ops/app-store-preflight.cjs from this checkout. It reports actual local checks and deliberately remains not-ready until manual evidence is complete. It does not upload or submit. APP_STORE_PRIVATE_CONFIG may point to the ignored private review-contact file; never commit that file or contact phone.
