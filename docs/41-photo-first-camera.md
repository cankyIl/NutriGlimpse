# Photo-first camera implementation and acceptance

Updated October 16, 2026 (America/New_York). Authoritative source: `/path/to/NutriGlimpse`.

## Implemented behavior

The first screen exposes **Scan Your Product**, **Shelf Camera**, **Barcode Camera**, and **Scan Nutrient Table** as separate actions. Product scanning opens a still-photo camera directly. It never silently substitutes barcode scanning or introduces fictional-source menus.

The iPhone captures a still image in memory, corrects its orientation, downsamples to at most 2,048 pixels, and uses Apple Vision to read visible text locally. Brand/product/variant text is matched against 4,677 included public USDA/Open Food Facts records. Results require the user to confirm the exact package and flavor before food facts and inline alternatives open. This is package-text recognition, not a general visual object classifier: unreadable names, logo-only fronts, loose produce and unlisted products can fail. No match is a normal supported result. Retake, name search and nutrition-table scanning are available; the included catalog does not require a tester key or internet connection.

Shelf Camera opens its live view after the included category facts and local model are ready. The current category is shown; pause to change it. Products accumulate for confirmation/review and nutrient comparison within that category. Original/reduced-sugar variants remain separate. Exact visible product-name lines now outrank longer pack-size listings, but text never automatically confirms identity. Category cache is bounded to two pools, and each pool to 500 records. This is not retailer stock information.

Barcode Camera is a separate optional route with checksum/format validation, duplicate suppression, permission recovery and manual fallback. Scan Nutrient Table uses the same in-memory still camera and opens the existing editable nutrient review directly; missing amounts and serving weight remain unknown, and the user must check the label.

## Privacy and failure behavior

The new iPhone camera uses AVCapturePhotoOutput in-memory bytes; it does not write a source file, use a photo-library picker, upload an image/OCR text, or persist raw OCR. It requests camera access only. Image decoding is bounded to 24 MiB; bridge output is bounded to 300 lines and 16,000 characters. Native reading has a 20-second timeout and the app has a 25-second recovery timeout. Work is invalidated on interruption, navigation, loss of foreground and memory pressure. Late photo callbacks cannot navigate after cancellation. Nutrient-review handoff is memory-only, single-use and expires after 30 seconds.

The existing file/photo-library/receipt import route remains gated for its separate native privacy acceptance; this implementation does not remove that gate. The shared report route and its tests are unchanged. No new paid OpenAI calls, backend personal-content storage or portfolio-service changes were made. Android/web do not yet implement this new native still-photo view; they show a clear search fallback. Existing Android shelf source is unchanged by the iPhone native work.

Nutrition, dietary-restriction, exact-variant, freshness and clinical gates remain. Unknown certification and inventory remain unknown. Source attribution and ODbL reuse information remain available. The included snapshot is a build-time public catalog, not a new source acquisition or claim of complete retailer coverage.

## Verification

- Typecheck and lint pass.
- 338 core/service/application tests, seven tooling tests and ten report-adapter tests pass (355 total). Seven new tests cover identity confirmation, ambiguous variants, low-confidence/unmatched input, malformed geometry/limits, packaged-catalog validation, ephemeral handoff, and exact-name ordering.
- Production `MemoryPhotoReader.swift` compiled and ran on the M2 Mac. Nineteen synthetic checks pass: front/variant text, orientation, downsampling, nutrient text, blank/empty/corrupt/oversized inputs and ten repeated reads.
- Actual Apple Vision output was replayed through the production TypeScript matching and nutrient readers. Four package cases suggest the expected variant first while requiring confirmation; the nutrient case preserves amount/unit and missing-value semantics.
- A stratified **text-only** retrieval benchmark found the expected record or same identity in the first five suggestions in 201/201 cases. Server p95 was about 18 ms. This supplies complete catalog names/brands; it is **not** a camera recognition accuracy result, phone-speed measurement, independent gold standard, or retailer coverage result.
- Signed iPhone Release build succeeds; source hash, artifact tree, signature and provisioning for the connected phone verify. Update installation and bundle lookup succeed. Automated launch was blocked by the phone being locked; unlock/open and physical-camera feedback are pending. Compilation/installation do not close physical-camera acceptance.

Source SHA-256: `3e28dc992831be0372b309025774fa7808be246cfbdea4a0fdf39aecbae1fa5a`.
Evidence: `artifacts/photo-camera-2026-10-15/` on the server/laptop, and `artifacts/mac/photo-camera-2026-10-15/` on the Mac. Native fixture harness: `ops/photo-reader-check.swift`; catalog and bridge checks: `ops/photo-catalog-check.ts`, `ops/photo-bridge-check.ts`.

## Remaining hands-on acceptance

These are unverified until a person performs them on the installed phone. Use representative packages that the tester is permitted to photograph; no personal documents are needed.

| Test | Expected result | Status |
|---|---|---|
| Open each home action | Correct camera opens directly; no fictional-input menu | Pending physical check |
| Clear front of a catalog product | Useful candidates, explicit exact-variant confirmation, food facts/alternatives | User confirms suggestions appear (Oct 16); exact-match confirmation and facts still pending |
| Original and reduced-sugar/flavor variants | No automatic substitution; user can reject wrong candidate and retake | Pending |
| Unknown package, blur, glare, partial text | Honest no-match/retry, no fabricated facts | Pending |
| Decline camera permission, then enable in Settings | Search fallback; camera recovers on return | Pending |
| Back, app switch, lock/unlock, interruption during reading | Camera stops; no stale result or stuck reading; retry works | Pending |
| Repeat 20 photos | No crash, accumulated source images or unrecoverable camera state | Pending |
| Shelf: cereal and a second supported category | Opens camera; correct category pool; collects candidates; pause/confirm/resume works | Pending |
| Shelf: repeated and similar adjacent products | Duplicates bounded; variants require confirmation; comparisons preserve restrictions | Pending |
| Offline / grocery-store lighting | Included facts work; measure actual recognition and latency honestly | Pending |
| Nutrient table | Review shows only supported values, correction works, unknowns retained | Pending |

No additional paid provider is needed for these local iPhone checks. Wider tester distribution still needs the separate Apple/TestFlight and shelf-model distribution-rights gates. Physical-photo results will determine further tuning; do not mark this flow “rock solid” solely from automated checks.

Signed artifact tree SHA-256: `01dfb3bc2252b61f2d9d44f0cef59f7c341b23302013f7ab1623a11aeea706a4`. Provisioning still expires October 22 at 10:50 p.m. Eastern. The update preserved app data; no uninstall/reset was performed.

## October 16 — physical-photo error correction

The user confirmed that the app captures without crashing, but reported the catch-all “Could not read that photo clearly” message. That message also covered schema/catalog/matching exceptions, so it did not establish poor lighting.

Reproduced a native geometry defect with 15 angled/cropped fictional package images: 13 of the 15 actual Apple Vision outputs failed the app's strict OCR schema; 36 of 45 text boxes extended beyond their image bounds. The native reader now intersects text rectangles with image bounds, skips non-finite/empty boxes and bridges explicit numeric coordinates. The OCR schema was not weakened. All 15 repaired native outputs now pass that unchanged schema and the production photo handler.

Separated fixed, non-content error codes: P1 = malformed photo text result; P2 = catalog could not open; P3 = matching failure; N1 = nutrition review could not open. Empty/unmatched photos follow normal no-match recovery. Raw OCR, exception strings and source paths are never shown or recorded by this error handling. No user photograph or OCR was collected for debugging; the subsequent user retest confirms suggestions appear, while exact identity and food-facts checks remain pending.

Verification: typecheck/lint and 339 app/core/service + 7 tooling + 10 report-adapter tests pass (356 total); the original 19 native reader checks pass; all 15 new native edge cases pass through the production schema/handler. A catalog/matching smoke test also passes using the bundled Hermes framework with Expo's actual URL and TextDecoder code on the Mac. That harness does not replace iPhone runtime acceptance.

Signed Release build, source/artifact hashes, signature/provisioning, physical update installation and launch pass. A subsequent check found the app running, with a different process identifier; continuous lifetime of the initial launch is not claimed. An app-name-scoped crash-report listing returned no reports; this does not exclude termination/restart. No uninstall/reset occurred. Source SHA-256: `06e3b593db6131de909621a5920365c1816412930499e8b5a735a9c6fd8d0c21`. App tree SHA-256: `7c2da9c101b2538f47f2c975f93ca4cdbc935a0d9f00f3efa8220b7902583b8c`. Evidence: `artifacts/photo-fix-2026-10-16/`. User retest: “It shows product suggestions.” This confirms the capture/processing/candidate-display path for that test; exact-match accuracy and confirmation-to-facts navigation are not yet confirmed.
