# Alternatives address the original concern first — DEV-20 / FB-31

October 17, 2026. Backend deployed; **iPhone build 0.1.0 (8) is available in the existing owner TestFlight group**. Build 7 retains its older display helper; update to see the corrected ordering.

## Correction

Previously the explanation displayed only changes meeting the 25% qualifying-improvement cutoff. A sauce could qualify on sugar while a smaller real sodium reduction was omitted, despite sodium being the original's adverse reason. The new helper separates qualifying improvement from factual explanation ordering.

- Explicit adverse reasons from the original lead, in the same order as its card: trans fat, high added sugar, high sodium, high saturated fat. For neutral originals, elevated sodium/saturated fat/added sugar use the existing green limits and category ordering. No new absolute color threshold is introduced.
- The first concern must improve at equal gram weight by at least **10% and the existing absolute floor** (40 mg sodium, 1 g added sugar, 0.5 g saturated fat), or trans fat must become zero. This is an additional beta comparison guard, not a regulatory or personalized-health threshold.
- Existing qualification remains: at least one **25% + absolute-floor** benefit, supported category priority for neutral candidates, complete/coherent data, comparable identity/category, zero candidate trans fat, no red signal, retained protein/fiber and existing worsening/calorie checks. The smaller primary reduction cannot qualify alone.
- First explain the actual primary reduction, such as **Less sodium**, then other concerns and secondary improvements. This does not claim the food is **low sodium**. A synthetic 480-to-380 mg equal-weight comparison can lead with less sodium when another qualifying benefit exists.
- When additional original concerns are not meaningfully improved, disclose that before unrelated benefits (for example, **Sodium not meaningfully lower** after a qualifying sugar improvement). At most three concise lines are displayed. Neutral alternatives retain yellow.
- The prompt seeks candidates addressing the actual original concerns first. Model, image detail, response schema, 4,500-token budget, one request/no automatic retry, privacy/clinical gates and maximum three distinct alternatives are unchanged.
- Diagnostic reason codes record the original priority, whether it improved, and any unresolved secondary concern. Existing retention applies; no raw photo is saved.

## Verification

462 core/service tests, nine tooling tests, ten report-adapter tests, 33 component scenarios in both timing modes, typecheck/lint pass. Eight focused policy regressions and two rendered-card scenarios cover smaller factual sodium reductions, sugar-only distractions, threshold/absolute-floor boundaries, category overrides, secondary concerns, equal-weight manipulation and trans fat. Existing stream-prefix checks and adverse/missing-data checks pass. Private recorded-response replay is processed only in memory; no copied private rows or photos are retained in the release evidence.

The user-authorized screenshot change from the side chat is preserved: foreground capture/recording is allowed; iOS app-switcher blur and existing cleanup remain. Native compilation and physical verification are tracked separately from component tests. No additional paid model calls were made.

Evidence: `artifacts/original-concern-2026-10-17/`. Build/Apple delivery details will be added after verification. Temporary Beta 0 timing still must be removed before Beta 1.


Cloud build started: `6f07d6e7-de94-47d5-b3ff-ca90740a4899`, version **0.1.0 (8)**. The inspected 302-file archive contains the corrected helper, unchanged absolute rating functions and preserved screenshot/quiet-capture/timing/news/My Needs changes. Private files are excluded. Native compilation and Apple acceptance subsequently passed; physical acceptance is pending.


## Verified delivery

Version **0.1.0 (8)**; EAS `6f07d6e7-de94-47d5-b3ff-ca90740a4899`; submission `c7ab0835-a578-4995-85a7-806d71a10b94`; Apple `a2314ebd-afbc-4df4-9105-43ead0c0e74e`; **VALID / IN_BETA_TESTING**. Exact build attached to the existing owner-only internal group; testing notes saved/read back. No new testers or OTA update.

IPA SHA-256 `b88d5a35311b1e6d1b73a6e323f385cf1b7f0024eff2a5bebb12db722184ff33`; 56,336,712 bytes; arm64; minimum iOS 16.4; iphoneos27.0. Bundle/team/store profile, provisioning CMS signature, expiry, encryption declaration, ZIP integrity, permissions, scene lifecycle, compiled detectors, new concern-policy strings and retained native camera/timing code checked. Full local app-signature trust-chain validation is not claimed on Linux; Apple acceptance is independently confirmed. Existing Expo patch-version warning remains; no dependency-security clearance.

Production JavaScript/Hermes export passes. Frozen 302-file source manifest matches the inspected archive and matched the workspace after upload, including the completed screenshot change. Subsequent side-chat early-preview changes arrived after source freeze; they are preserved in the workspace but excluded from build 8 and its test claims. Service and portfolio HTTPS checks returned 200. All verification for this correction used fixtures or in-memory replay; no additional paid model calls or copied private scan records.

Update in TestFlight, confirm **0.1.0 (8)**, and rescan the sauce. Check that lower sodium leads, secondary benefits follow, and yellow ratings remain yellow. Check screenshot capture and app-switcher blur. Device acceptance is still needed; the server cannot prove what was rendered or heard on a phone.
