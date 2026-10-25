# Shelf Camera: 16-product grids and iPhone build 14

**Updated:** October 18, 2026.
**Status:** Implemented and backend deployed. Build **0.1.0 (14)** is Apple **VALID / IN_BETA_TESTING** and available to the existing owner TestFlight group. Native/package checks and release notes are verified. Physical acceptance remains pending.

## Delivered behavior

The iPhone uses the existing Core ML/Vision package detector without a manual food-category selection. Full visible package regions are mapped into the original camera frame, cropped with padding, checked for minimum size/edge clipping and readable text, and collected into a **4 x 4 grid of up to 16 products**. Finish sends the final nonempty partial grid in a compact layout. No duplicate filler cells.

Local spatial/appearance tracking suppresses repeat observations. Cross-frame revisits require exact normalized OCR plus appearance agreement before local merging. Similar-looking variants remain distinct when evidence is insufficient; backend/client identity reconciliation removes confirmed duplicate product cards. These conservative checks cannot guarantee zero duplicates or perfect detection before physical testing.

Grid creation and JPEG encoding happen on the phone. The phone sends a versioned manifest and one image through project-server. GPT-6 Luna and Claude Haiku 5.5 process the grid concurrently. The backend validates cell associations, identities, nutrition coherence and existing rating rules. Idempotent batch IDs prevent silent duplicate paid dispatch. Maximum two server grid requests and one active batch per phone; two grids may wait locally. No raw images are logged or saved.

The screen shows product crop thumbnails, food facts and optional USDA/OFF checks inside each card. Similar-category leading choices use equal-weight comparisons and preserve trade-offs; local health-priority ordering uses existing rules. Missing facts, identity conflicts, conflicting estimates and unverified dietary/care-plan needs withhold a supported leading choice. General colored ratings are not personal medical advice.

After Finish and accepted batches complete, up to three leading products that need alternatives are checked through the existing normal photo-review flow. Each can display up to three suitable alternatives. These are explicitly outside-shelf suggestions; stock is not claimed. A different identity in the follow-up review is withheld.

Fresh shelf-photo consent names both providers and their data-policy boundary. The existing photo-off/reset control revokes this preference. Profile, lab results and precise location are not included in model requests. Backgrounding or leaving the shelf screen cancels work and clears temporary pictures/results. Android retains its existing local shelf flow.

## Verification completed

- Full typecheck and lint pass.
- 531 core/service tests pass, including 14 new grid contract, association, queue, 100-product, duplicate, cancellation, nutrition, native AbortSignal, provider/idempotency and HTTP tests.
- 9 tooling and 10 report-input adapter tests pass.
- 52 existing screen scenarios in each timing mode, the My Needs checks and 10 new shelf screen interaction scenarios pass with native/network boundaries mocked.
- Production iOS JavaScript export passes.
- Backend deployed; local/public health and photo capability checks pass. The public shelf route rejects obsolete consent before model dispatch. Portfolio remains HTTP 200.
- Frozen cloud source: 319 files; no build-13 files removed. Only the shelf path, privacy/consent, new grid modules and build number changed. Existing side-chat features are retained.
- One live 16-cell public-image test made exactly two model requests. First complete provider result: 14.086 seconds; final: 15.387 seconds. All 16 cells returned associated records. Nine cells had identity disagreements and remained unrated; seven cells had agreed identities. This public UK shelf fixture includes repeated facings and cropped/occluded packages; it is not a 16-distinct-US-product accuracy benchmark and did not run the iPhone's admission/dedup pipeline.
- Actual reported usage for that live test: GPT-6 Luna 6,253 input / 2,219 output tokens; Claude Haiku 5.5 7,793 input / 3,321 output tokens. These are measured tokens, not billed dollar amounts.

## Release tracking

EAS build: 60de0017-3b1e-4693-83ca-fbc9731c338a. Version 0.1.0 (14). Native compilation and signed-package inspection passed. Submission: 550384e3-3953-421d-8caf-09aa344c6739. Apple build: a90c1454-46d4-4520-8c09-d29a652ea1e3. Processing VALID; internal state IN_BETA_TESTING; existing owner group verified. Encryption declaration false and build-specific release notes verified. No additional tester invitation or OTA update.

IPA SHA-256: 06e9f94dc32f35b09f6ada9e8bd7f1dcd4137e4f85d8a5aed9c6a875165bfdab. Package inspection confirms arm64, version/build, store distribution profile, encryption declaration, new grid markers, approved hero asset, both retained detectors and prior side-chat feature markers. This is not a physical-phone execution test.

Implementation evidence: artifacts/shelf-grid-implementation-2026-10-18/.
Release evidence: artifacts/iphone-build14-2026-10-18/.

## Remaining physical acceptance and limits

Use a physical iPhone to test 2-5 clear home packages first, Finish a partial batch, then test a grocery shelf. Check correct brand/flavor, full-package crops, repeated panning, adjacent similar variants, photos, facts, color explanations and outside alternatives. Measure memory/heat/battery, pause/Finish responsiveness, poor connectivity and readable-cell quality. No physical performance or accuracy claim is made by automated tests or cloud compilation.

The current collector keeps the first admitted readable crop; automatic better-view replacement and dynamic quality-driven splitting are future refinements. Different-looking views of one product may still require backend merging. Existing model-distribution and clinical-review decisions remain unchanged.

## Phone check after updating

In TestFlight, update Health & Grocery to **0.1.0 (14)**. Open Shelf Camera and review the new shelf-photo consent. Start with 2-5 different, clearly visible packages at home, move slowly, and tap Finish: the app should send the partial batch and show product cards. Then test a shelf, including repeated panning and similar flavors. Check full crops, correct names, facts, ratings and any outside alternatives. Cloud compilation and automated checks do not prove those physical results.
