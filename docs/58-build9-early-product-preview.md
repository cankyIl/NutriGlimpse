# Build 9 — early product preview and current alternatives

October 17, 2026. User authorized inclusion of the completed side-chat preview, combined testing, TestFlight upload and plan updates.

## Included experience

The captured photo opens immediately after native preparation in the original product card. The AI identity appears next without a premature health color. Complete validated nutrition replaces that preview; up to three suitable alternatives then appear beneath it. Cancellation, leaving the result screen and backgrounding clear the transient preview and prevent late callbacks from reviving it. Unknown values remain unknown; dietary restrictions still withhold suitability claims.

The provider response uses a compact, lossless representation of all existing fields. GPT-6 Luna, high-detail input, one dispatch, five candidate proposals, the 4,500-token ceiling and all category/concern/nutrient checks remain. Earlier clients do not receive identity-preview events. Retained features include original-concern-first explanations, source show/hide controls, screenshots with app-switcher blur, supported quiet capture, Beta 0 timing, My Needs and news. Later news expansion/personalization remains backlog.

## Verification

- 468 core/service tests, nine tooling tests, ten input-adapter tests, 37 production-component scenarios with timing on/off, My Needs checks, four news-operator tests, typecheck/lint and iOS production JavaScript export pass. Native/network boundaries in screen checks are mocked.
- Three paired public-photo checks compared prior and compact formats (six paid calls). All returned valid records. Both formats recognized Honey Nut Cheerios, Land O Lakes Butter with Canola Oil and Ragú Chunky Tomato, Garlic & Onion sauce. Compact responses returned three passing alternatives for each; the sauce explanations start with lower sodium. Candidate choices and estimates can vary between calls; this small sample does not establish general accuracy or ground-truth nutrition.

| Public fixture | Previous identity / checked original | Compact identity / checked original | Previous / compact total |
|---|---|---|---|
| Honey Nut Cheerios | 2.36 / 3.84 s | 1.26 / 2.45 s | 10.60 / 6.09 s |
| Butter with canola oil | 1.82 / 2.80 s | 1.11 / 1.81 s | 7.68 / 5.81 s |
| Ragú chunky sauce | 1.76 / 2.59 s | 1.06 / 1.68 s | 8.25 / 5.44 s |

These are server-side observations from one attempt per format/product, not promised phone timings. They do not time the immediate local-photo preview. The previous sauce attempt returned no eligible alternative; the compact attempt returned three under unchanged checks. No raw user photos, personal profiles or diagnostic response rows were used or copied. The $2 budget and one-attempt/no-paid-retry policy remain.

## Deployed HTTPS compatibility

Two additional public-image calls passed against grocery.serveforwad.com: the frozen build-8 client and new build-9 client both completed. Build 8 received only its established events; build 9 received identity before the checked original. The two attempts returned three and two passing alternatives respectively, demonstrating that the three-card cap does not force unsuitable suggestions. The new-client identity arrived at 2.17 s and its checked original at 2.64 s. Portfolio and capabilities checks returned HTTP 200.

Eight paid engineering calls in this release reserved $0.16; the ledger reached $1.30 across 65 lifetime dispatches, not measured billed cost. No automatic paid retries occurred.

## Release checkpoint

Backend deployed with the compatible compact/preview protocol. Native build 0.1.0 (9) completed, its signed IPA was inspected, and Apple processing/owner TestFlight access are verified. Physical acceptance remains pending. The frozen 302-file cloud archive includes the preview plus the latest original-concern and screenshot changes and excludes private files. Source, check logs, paired live results and release verification are in `artifacts/iphone-build9-2026-10-17/`.

EAS `a7976665-5e48-442a-aee7-ab70982f9588`; submission `11218ffe-f0e1-4418-a844-0e63fe8b6d8b`; Apple `c0570076-deb0-454a-837a-f74d888efb00` (**VALID / IN_BETA_TESTING**). IPA SHA-256 `fac63cc0f5e1017017721da666aa37cce0efed17cda174a59c350e66aef78518`. Version **0.1.0 (9)** is attached only to the existing owner internal group; build-specific testing notes and encryption declaration verified. No additional invitations, OTA update or phone installation is claimed.

Native checks: arm64, iOS minimum 16.4, Xcode/iPhoneOS 27 SDK, paid-team store provisioning, ZIP integrity, expected camera/location/scene configuration, both shelf models, quiet-capture selectors and preview/concern-first/screenshot bundle markers. Provisioning CMS signature was checked; full app code-signature/issuer-chain validation was not performed on Linux. Apple accepted the package. Frozen archive source remains recorded separately from any later workspace edits.

## Physical acceptance still required

After TestFlight delivery, verify photo → name → checked color/facts → alternatives; cancel during photo/name preview, background during scanning, reopen and scan again; verify sodium-first sauce reasons, source toggle, screenshots/app-switcher blur and existing news/My Needs. Keep the current privacy/clinical gates and deferred shelf-model permission decision. Remove all temporary timing hooks, endpoint/reports and retained timings before Beta 1, including the new preview marks.
