# Required inclusion in the next iPhone build

User request, October 16, 2026: include the side-conversation feedback changes in the next iPhone build and coordinate with **Clarify app look and feel**.

## Release owner handoff

The completed feedback source is already in the authoritative workspace:
`/path/to/NutriGlimpse` on `project-server`.

All 21 files matched `artifacts/needs-feedback-2026-10-16/manifest.json` when checked for this handoff. Do not overwrite subsequent intentional changes to overlapping files with the old checkpoint.

The existing TestFlight **0.1.0 (1)** package does not contain this increment. Include it in the next source archive, including any isolated staging checkout used for the key-free update.

## Required content

- My Needs: successful Save returns home; failed Save retains entered values.
- Remove the old “All eight conditions remain in scope…” footer.
- Height and weight inputs, US/metric conversion, encrypted persistence, date confirmation and deletion.
- CDC adult reference rules and hidden internal category, with existing 21+ eligibility and applicability checks.
- Tested weight-context integration code, with the existing privacy and clinical-review gates still closed. Do not enable personal weight transmission as part of the build.

Details: [feedback checklist](UIAndProductFeedback.md) and [implementation notes](needs-weight-context.md).

## Overlap with the key-free work

Preserve `consentedWeightContext` and its disabled production gates in `apps/mobile/src/app/capture.tsx`. When changing the `assessProductPhoto` signature, carry its optional weight-context argument through `packages/core/src/photoAssessmentClient.ts` and adjust the added tests to the new signature.

Also retain ProfileEditor, Needs navigation, AppState, Privacy deletion, core profile/snapshot fields and the new `weightContext.ts` / `measurementForm.ts` modules.

## Verification before submission

- Check the isolated release checkout against the full checkpoint manifest. In the actual EAS archive, verify the required mobile/core runtime subset under apps/mobile/src/ and packages/core/src/. Explain intentional hash differences; do not restore old files wholesale.
- Current .easignore deliberately excludes backend source, /data/, /docs/, test tooling under /ops/ and artifacts from the mobile upload. Keep those exclusions. The executable CDC reference is embedded in packages/core/src/weightContext.ts; the separate reference JSON stays on the backend. The runtime feedback files are not excluded by the inspected EAS or Git rules.
- Run `npm run check`.
- Run `node --experimental-strip-types ops/needs-ui-check.cjs`.
- Record the new build ID and confirmation that this increment is included in the project plan.
- Physical acceptance after installation: height/weight keyboard and units, save return, restart persistence and deletion.

Prior evidence: 393 core/service + 7 tooling + 10 report-adapter tests; 14 photo-screen scenarios; My Needs interaction checks. Logs are under `artifacts/needs-feedback-2026-10-16/`.

## Coordination status

Direct session messaging was attempted twice, but the app returned a messaging-tool error. Delivery/acknowledgment through chat is **not confirmed**. This shared handoff and project-plan callout are the fallback. No competing build, upload, source rewrite, backend deployment or signing/account change was performed by this side conversation.

## Release-owner acknowledgment

Read and applied this shared handoff. Verified the baseline manifest and every runtime feedback file in the EAS archive, including intentional key-removal edits in overlapping files. The full check and My Needs harness pass. New build **0.1.0 (3)**, EAS `fa892bb8-fd30-41dc-b2a1-78e2cea45b12`, is **available to the existing owner internal TestFlight group**. Personal weight transmission remains disabled; phone acceptance is pending. See [release evidence](47-key-free-beta-update.md).
