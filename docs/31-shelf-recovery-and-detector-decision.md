# Shelf recovery tests and detector decision

October 14, 2026 (America/New_York). User deadline: October 23.

## Decision

Advance **two pretrained retail detectors for an explicit iPhone comparison: ShelfSet YOLO26s and SKU-110K YOLO11s**. Reject the tested YOLOE/OCR crop-union recovery: its modest recall gain comes with many extra incorrect boxes. ShelfSet looks stronger for cereal, chips and provisionally boxed cookies; SKU-110K looks stronger for cheese. Neither earns universal acceptance. No custom training or paid API calls were used.

This is a candidate comparison for further testing, not acceptance of the finished Shelf Scan experience. The model locates generic retail packages; it does not identify brands, formulations, nutrition, dietary suitability or health rankings. Reliable product identification and real iPhone speed remain separate requirements.

## Measured comparison

Three new licensed shelf sections contain **51 annotated visible package fronts**: cereal/muesli 14, chips 19, and a Washington DC Safeway cheese section 18. Predictions on explicitly ambiguous/truncated packages are excluded according to frozen ignore boxes. Price tags, signs and display fixtures remain negative examples. Correct means a one-to-one match with at least 0.50 intersection-over-union.

| Method | Correct package matches | Incorrect boxes | Missed fronts | Precision on this sample | Recall on this sample | Provisional gate |
|---|---:|---:|---:|---:|---:|---|
| YOLOE full frame | 41/51 | 7 | 10 | 85.4% | 80.4% | Fail |
| YOLOE + OCR-selected crops | 42/51 | 26 | 9 | 61.8% | 82.4% | Fail |
| ShelfSet YOLO26s | 46/51 | 2 | 5 | 95.8% | 90.2% | Fail |
| SKU-110K YOLO11s | 46/51 | 5 | 5 | 90.2% | 90.2% | Pass |

Precision excludes detections overlapping the frozen ignore regions: 5 ignored predictions for YOLOE, 5 for recovery, 11 for ShelfSet and 13 for SKU-110K. These denominators must accompany the results; the percentages are not general store-wide accuracy estimates.

| Scene | YOLOE | YOLOE recovery | ShelfSet | SKU-110K |
|---|---:|---:|---:|---:|
| Cereal/muesli — 14 fronts | 14 | 14 | 14 | 14 |
| Chips — 19 fronts | 18 | 19 | 19 | 16 |
| Cheese — 18 fronts | 9 | 9 | 13 | 16 |

The predeclared advancement gate requires overall precision and recall >=85%, with each image's precision and recall >=75%. ShelfSet has fewer false boxes overall but misses five of 18 cheese fronts (72.2% recall), below the scene floor. SKU-110K meets the floor on all three scenes; it has more errors on chips. Neither approach is uniformly best.

### Original challenge cross-check

The earlier angled cereal display exposes a material weakness that the favorable new aggregate does not capture. On exploratory selected-target labels, ShelfSet matched **26 of 28 cereal packages**, while SKU-110K matched **11 of 28**. Both matched all 12 selected cookie packages. These labels were selected after earlier inspection and are neither blind nor exhaustive, so they are counterexamples and diagnostic evidence, not a second general-accuracy score.

The next iPhone build lets the tester choose either model explicitly and run both on the same shelf. A future category-specific policy is a hypothesis suggested by these results; combining the best per-category counts would be selection-biased and must not be reported as independently validated performance. Validate that policy on fresh examples before adopting it. The diagnostic keeps one inference per sampled frame; it does not run both models for every frame.

The fourth new photograph, crowded overlapping biscuit wrappers in Ghana, was assigned to **qualitative stress testing before predictions** because visible wrapper boundaries could not be labeled reliably. SKU-110K detects no packages there; ShelfSet and YOLOE produce unreliable broad/partial regions. This is a known failure case requiring a different viewpoint or an unresolved result, not a claimed success. Original wide/oblique development photographs remain additional challenges; the three scored crops do not establish whole-aisle coverage.

## Recovery findings

The fixed recovery policy uses independent full-view RapidOCR on the CPU, at most eight text-selected 40%-width/height crops, YOLOE at 640 pixels/confidence 0.10, and common IoU 0.50 duplicate suppression. It was fixed using the original four development photographs and not tuned after validation results.

OCR reads useful words such as Frosted Flakes, Hobnobs and Digestives outside some original YOLOE boxes. It also reads shelf signs, price cards and promotional text, merges neighboring labels, and occasionally misspells brand names. On the new cheese image, outside-box text anchors were price-card text rather than newly confirmed products. Recovery adds nested boxes around printed artwork/label panels and preserves some merged packages.

On the scored sample, recovery adds **one correct package match and 19 incorrect boxes** relative to baseline. Keep text recognition as a possible asynchronous source of identification evidence, but do not deploy this crop-union algorithm. No exact SKU, temporal tracking, cloud vision or health-ranking result was established by these tests.

## Evaluation integrity and limits

- Manifest frozen before any candidate predictions: `2dc5fa159b91e97355aad8cc4b4cfab43abb07f99816a8201c38e3695b92816a`.
- Labels were prepared by an assistant and reviewed by another assistant before inference. They are not independent human-reviewed ground truth; partial visible-front conventions can affect matches.
- New source hashes differ from the original four. Candidate-model training overlap is unknown, especially for web-scraped training data. These are newly selected evaluation photographs, not proven unseen training data.
- The original plan for four quantitative scenes was amended to three quantitative plus one qualitative before inference because the biscuit wrappers were ambiguous. The stress image was retained and its failure reported.
- Models ran at fixed 640-pixel square letterbox inputs. YOLOE confidence 0.10; retail replacements 0.25; IoU 0.50. No threshold was tuned on these labels.
- Counts measure package proposals. Repeated packages can represent the same product; distinct-product/variant coverage and ranking accuracy still require a separate evaluation.

## Runtime and iPhone preparation

SKU-110K warmed server median prediction times on the three scored scenes were approximately **11.9–14.6 ms** on an NVIDIA GTX 1660 SUPER. These measure the in-memory prediction call and exclude image decoding, camera delivery, OCR, identity lookup and UI; the common final duplicate-suppression pass is also outside the reported timer. They are not iPhone measurements.

The rejected full OCR/crop recovery took approximately 0.62–2.05 seconds per new scored image and 1.48–5.51 seconds on the original photographs, on this server. It cannot be described as a demonstrated two-frame-per-second end-to-end process. Its desktop OCR engine is a proxy, not Apple's on-device Vision OCR.

Both Core ML exports are prepared and bundled for diagnostic use, with exact file hashes, source notices and output contracts: `ShelfSetDiagnostic.mlpackage` (19,180,407 bytes) and `ShelfSKU11Diagnostic.mlpackage` (19,044,898 bytes). Static output checks and PyTorch adapter parity passed. Both exports use the upstream Core ML NMS workaround: one true product score plus 79 exactly zero padding columns; the app accepts only the real product label. The native adapter now uses explicit centered gray-114 letterboxing and inverse coordinate mapping. Portable checks cover 32 geometry fixtures and five pixel fixtures; actual Swift execution and converted Core ML numerical parity remain unverified on this Linux host. Export success does not establish Apple runtime parity. Record actual device model, OS, app build and model fingerprint with 30-second and five-minute runs before accepting the 2 Hz requirement.

## Rights and distribution status

The SKU-110K weights are published by `chistopat/sku110k-yolo11-object-detector`, pinned to revision `ee1b8ac34eb3b68969ffa8165e50c43457fe4e35`; checkpoint SHA256 `b7e86554a746c2f02ee0626bcde5b77038b84692c225a642a5a5ebc150f6718a`. The author describes research/demo use and defers to SKU-110K's academic/non-commercial dataset terms. The underlying Ultralytics code/model terms also need to be respected. Preparing a private educational test does not establish clearance for public App Store distribution or relicense this app.

ShelfSet is the other diagnostic candidate. Its repository's MIT assertion does not resolve underlying Ultralytics and scraped-training-image rights. No new model or app was published by this evaluation.

Public-photo credits: Wolfmann (SPAR cereal and chips) and Uprising Man (Ghana biscuits), CC BY-SA 4.0; Kurt Kaiser (Safeway cheese), CC0. Crops and annotated derivatives preserve attribution and applicable licenses. Exact source pages and transformations are in `ops/shelf-recovery/validation-README.md` and the frozen manifest.

## Correction to the initial cheese interpretation

Closer review showed that the original cheese-tub photograph has only two clearly visible front tubs. ShelfSet at 640 pixels found both plus a false promotional-sign detection; its 1280-pixel trial found none. Earlier wording that it missed almost all cheese tubs was unsupported and has been corrected in the original report. The larger new Safeway section is the quantitative cheese evidence used here.

## Next acceptance work before October 23

1. Build the dual-candidate diagnostic on the user's Mac and run it on the physical iPhone. Xcode installation/macOS compatibility and Apple signing are still external setup dependencies; a free Personal Team can support personal-device testing while paid membership is pending.
2. Verify Core ML numerical/output parity, portrait/landscape preprocessing, overlay alignment and sustained 2 Hz behavior, including thermal/interruption cases.
3. Connect clear package views to confirmed catalog identities and variants, then deduplicate products across actual moving-camera scans. Keep uncertain candidates pending and rank only sufficiently identified, assessed products.
4. Test representative US cereal, cookie and cheese aisles, including glare, overlap and poor viewing angles. Keep source photos transient according to the approved privacy design.
5. Reserve October 21–22 for regression and demonstration rehearsal. These are target checkpoints, not a guarantee that the full feature is ready; unresolved quality/privacy/distribution gates remain explicit.

## Reproduce and inspect

Authoritative workspace: `/path/to/NutriGlimpse` on `project-server`, user `developer`. Commands and frozen versions are in `ops/shelf-recovery/README.md`; raw outputs, scores and overlays are in `artifacts/shelf-recovery/`. The common evaluator has five passing tests covering duplicate predictions, missed packages, ignored regions, merge accounting and one-to-one assignment.

Primary sources: [SKU model card](https://huggingface.co/chistopat/sku110k-yolo11-object-detector), [SKU-110K dataset authors](https://github.com/eg4000/SKU110K_CVPR19), [ShelfSet repository](https://github.com/ShelfSet/shelf-object-detector), [Core ML export issue](https://github.com/ultralytics/ultralytics/issues/22309).

## Prepared comparison handoff and source checks

The new source archive is `HealthGrocery-iPhone-Detector-Comparison-2026-10-14.zip`; it supersedes the earlier YOLOE-only device-test bundle. Follow [the Mac installation guide](28-iphone-shelf-test-installation.md). The camera diagnostic has explicit candidate selection, per-run model identity, a one-at-a-time model cache, no automatic model fallback, gray-114 preprocessing, Release-only timing passes, interruption handling and process-memory-only summaries. A module-level completion event preserves results when leaving the screen or changing detectors. Images are never written or uploaded by this diagnostic.

Checks completed on the remote Linux workspace: type checking and lint; **205 application tests, three tooling tests, five proposal-evaluator tests**; exact reproduction of all four recorded score totals and per-image assignments; both exported-resource file hashes; generated iOS project and iOS JavaScript bundle. Portable geometry/pixel fixtures and read-only lifecycle review are also complete. These checks do not compile Swift or execute Apple frameworks. No measured iPhone result is available.

No user health data or private camera photos were used. No paid API request, custom training, cloud build, App Store upload or publishing operation was performed.
