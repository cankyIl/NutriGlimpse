# Pretrained YOLOE: shelf and iPhone feasibility

Updated October 14, 2026 (America/New_York). Delivery deadline: **October 23, 2026**, as set by the user. This is the original no-training evaluation plan, superseded for active detector selection by [the recovery decision](31-shelf-recovery-and-detector-decision.md); it does not certify that the complete app or iPhone benchmark has passed.

## Recovery update — October 14

The authorized recovery test failed: 42 correct boxes and 26 incorrect boxes, versus baseline 41 and 7 on 51 labeled fronts. Two pretrained shelf-specific candidates are now bundled for explicit device comparison: ShelfSet and SKU-110K YOLO11s. Neither is an accepted universal detector. See [the measured comparison, counterexamples and limitations](31-shelf-recovery-and-detector-decision.md). The original YOLOE binary is retained as historical evidence but is not selected by the current diagnostic.

## Original approved direction

Use pretrained YOLOE rather than waiting for custom detector training. The first candidate is YOLOE-11s with fixed packaging prompts exported to Apple Core ML. Configuring prompts is not training. Preserve the complete Shelf Scan product contract in [the implementation specification](26-shelf-scan-implementation-spec.md).

The benchmark is a diagnostic surface, not the finished ranked Shelf Scan experience. It detects package regions. A region is not a confirmed brand, formulation, ingredient list, certification, or health assessment. No detector confidence becomes a clinical-confidence score.

## Separate evidence

| Check | Evidence required | Status as of October 14 |
|---|---|---|
| Model provenance | Original weights URL, version, file digest, license, prompt list, export settings | Recorded; source and exported-file hashes verified |
| Real shelf detection | Original photo provenance, saved model output, reviewed missed/merged/false regions | Four licensed photos tested; quality did not pass |
| Server performance | Actual hardware, input size, warmup, distribution of measured latency | GTX 1660 SUPER; 13.0–16.4 ms warm medians; never iPhone evidence |
| Core ML export | Saved package, exact output contract, model digest | 18.2 MiB FP16 package exported and bundled; Apple execution pending |
| iOS compilation | Successful signed/native build log and build ID | Prebuild and iOS JavaScript export passed; Swift compilation pending Mac/Xcode setup |
| Physical iPhone performance | Device/OS/build/model, actual completed frames and elapsed time, latency percentiles, thermal status | Not tested |
| Complete Shelf Scan | Identification, category matching, deduplication, privacy, profile ranking and lifecycle acceptance | Not established by this diagnostic |

## Shelf evaluation protocol

Use a small reproducible set of real public shelf images whose source and permitted use are recorded. Development evaluation fixtures are separate from user photos; the app must not retain user camera images. Include tightly packed boxes and varied package shapes. Explicitly list missing categories, stores and lighting conditions.

Compare a small number of prompt sets on a development subset. Hold out different images for a check of the selected configuration where enough independent images are available. Do not count adjacent video frames as independent evaluation data. Keep confidence threshold, NMS setting, input resize and model version with every result. Review visible package boundaries and compare predictions to annotations where available. A few pictures are a feasibility sample, not a coverage or accuracy certification.

No custom training, paid cloud compute, OpenAI calls, or production data uploads are needed for this detector evaluation. Existing backend and health-processing gates stay in place.

## Physical iPhone protocol

Install a signed native Release build containing the exact exported model. Expo Go, a web preview, Linux/PyTorch speed and an iOS JavaScript export do not verify this requirement.

1. Run a 30-second quick test on a stationary shelf. Confirm that drawn boxes track actual packages and are aligned with the portrait preview.
2. Run a five-minute sustained test while slowly scanning a shelf, including stopping and reversing movement. Keep the phone unplugged if practical; record the actual conditions. Record model loading separately from steady-state inference.
3. Repeat with a different package category and less favorable lighting. Record missed or merged packages separately from speed.
4. Navigate away, background the app, deny camera permission, interrupt a run, and reopen. The camera must stop, late callbacks must not revive a run, and an interrupted run must not receive a pass.
5. Terminate and reopen the app. No camera images or previous benchmark results should be restored from disk. Normal non-shelf saved preferences/results keep their existing policy.

Configure frame admission for **2 Hz (500 ms)** with one active inference and no growing frame queue. Count completed inferences, not merely camera callbacks or frames scheduled. Report elapsed wall time, admitted/completed/dropped counts, completed FPS, p50/p95 latency, and thermal conditions. Measure the complete native detection operation including image preparation and output decoding; this does not include asynchronous product identification or ranking.

Proposed engineering gate: completed test duration, no interruptions/errors, at least 1.9 completed frames/sec (5% scheduling tolerance around the 2 Hz target), p95 detection latency below 500 ms, no serious/critical thermal event, and visually correct coordinate mapping. Display actual measurements and tolerance; never label an unmeasured build as working at 2 FPS. Speed acceptance does not establish package recall, sustained battery life, product recognition or clinical suitability. Missing metrics make the result incomplete.

No photo, health data, GPS coordinate or product identity is included in the diagnostic summary. Results are memory-only while the app is alive; starting another test does not erase prior results. The diagnostic does not send results to a server.

## Delivery checkpoints

- October 14–15: small shelf evaluation, Core ML export and signed iPhone build preparation. Evaluate observed failures before expanding the work.
- October 16–18: actual iPhone quick/soak measurements, coordinate/lifecycle fixes and confirmed-product integration if the detector is suitable.
- October 19–21: representative store/category tests and remaining scan/ranking integration; record unsupported cases honestly.
- October 22: regression checks, installation rehearsal and demonstration preparation.
- October 23: user deadline. A deadline is not a waiver of privacy, accuracy or measurement gates.

These are target checkpoints, not promises of completion. Apple membership, signing access, a compatible macOS/cloud builder and hands-on phone tests are external dependencies. Avoid spending the remaining schedule collecting a new training dataset. If the ready-made detector fails, document that result promptly and evaluate the prepared no-training fallback rather than claiming success.

## Sources

- Original model, pretrained weights and published iPhone benchmark: https://github.com/THU-MIG/yoloe
- Supported prompt/export behavior: https://docs.ultralytics.com/models/yoloe
- License: https://www.ultralytics.com/license
- Expo SDK 57 platform requirements: https://docs.expo.dev/versions/v57.0.0/

The published iPhone benchmark is background evidence only. This project's physical-device measurement starts as **not tested**. YOLOE carries AGPL obligations; downloading/evaluating it does not publish or relicense this repository, and distribution must preserve applicable notices and comply with the chosen license.

## Access update — October 14

The user confirmed paid Apple Developer membership is still pending and that a Mac is available but Xcode is not installed. Prepare the direct Xcode Personal Team route in parallel with activation; this avoids making paid membership a prerequisite for personal-device testing. Xcode installation and a compatible Mac remain dependencies. No physical-iPhone result exists. See [Mac installation steps](28-iphone-shelf-test-installation.md).


## Completed evaluation and prepared device test

Pretrained YOLOE was tested without training on four licensed public shelf photographs. The default confidence threshold missed most cereal packages and all packages in the cookies photograph. Lower thresholds and four overlapping image tiles recovered more packages, but still merged neighboring items and detected display cartons or fragments. **The detector has not passed shelf quality acceptance.** The bounded ShelfSet comparison improved cereal/cookie separation and was not added to the initial app bundle; the recovery comparison has since added it as an explicit candidate. A closer review corrected the initial cheese interpretation: at 640 pixels it found both clear front tubs plus a false price-sign detection; the 1280-pixel trial found none. General cheese coverage remains unestablished. See the [detailed results and evidence limits](30-yoloe-shelf-evaluation.md).

The initial iPhone diagnostic used the original exported YOLOE model with the eight recorded prompts, confidence 0.10, IoU 0.50, and **one full-frame inference per sample**. Four-tile server output is a separate experiment and is not what the phone benchmark measures. Runtime Core ML output parity and box alignment remain unverified until an Apple build runs.

The app includes a live native camera preview, 30-second/five-minute runs, one inference in flight, measured completed FPS and latency, thermal tracking, and previous summaries held only in app memory. Its entry is **Test shelf scanning on iPhone** on the welcome screen and capture screen; no health profile is required for this diagnostic. Failed or interrupted runs cannot pass. Actual camera pixels are neither saved nor uploaded.

Validation completed on the authoritative Linux workspace: type checking, lint, 202 application tests, three tooling tests, generated iOS project, and iOS JavaScript export. These establish source/build preparation only. Swift compilation, signing, Core ML execution, coordinate alignment, sustained iPhone performance, and complete ranked Shelf Scan remain unverified.

The [Mac helper and guide](28-iphone-shelf-test-installation.md) support a free Xcode Personal Team while paid membership is pending. The user has a Mac and has confirmed Xcode is not installed. Install Xcode and complete first launch before attempting the prepared source bundle. No EAS login or cloud build is needed for this route.
