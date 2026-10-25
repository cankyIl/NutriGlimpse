# Shelf detector iPhone benchmark and local package reader

This local Expo module compares **two pretrained diagnostic detectors** and supplies bounded, on-device package text/barcode evidence for the continuous Shelf Scan screen. The native module does not retrieve nutrition or make health recommendations. Its default benchmark mode draws candidate boxes without package reading. Neither detector is an accepted universal replacement. Performance on angled cereal and crowded cheese differs materially. Dataset results do not establish iPhone performance.

## Explicit model selection

- `shelfset` (default) selects `ShelfSetDiagnostic`.
- `sku110k` selects `ShelfSKU11Diagnostic`.
- Each selection must have its own compiled model and matching JSON manifest. Missing or incompatible resources fail closed. No model is silently substituted.
- Original `ShelfYOLOE` model, manifest and notice are preserved under `reference/YOLOE/`. They are excluded from compiled resources and are not a selectable fallback.
- Models are cached one at a time and reloaded only when selection changes. Every summary preserves the actual model ID, source checkpoint fingerprint, exported Core ML specification fingerprint, app/build versions, prompts/classes, preprocessing and rights status. A stopped run retains its own identity even if another model starts immediately.

## Build and exported model contract

- iOS 16.4+, Expo SDK 57; a signed physical iPhone build is required. Expo Go and Android do not contain this module.
- The podspec bundles `ios/Resources/*.mlpackage`, JSON manifests and source/license notices. Xcode must compile each model to `.mlmodelc` inside `ShelfBenchmarkModels.bundle`.
- Both diagnostic exports use RGB 640 by 640 input, confidence 0.25, IoU 0.50 and one real class: `product`. The 79 exact-zero padding score columns work around an upstream Core ML NMS export defect. They are **not** additional product classes; runtime excludes them from candidates.
- Outputs are NMS `confidence` and normalized center-coordinate `coordinates` arrays. Vision receives confidence and IoU scalar inputs through `VNCoreMLModel.featureProvider`, because the exporter marks those additional inputs required despite describing them as optional.
- Each bundled export's files were checked against its recorded SHA256 hashes when copied. Export/static/PyTorch checks do not establish Core ML numerical parity.
- The source can be typechecked/linted on Linux. Swift compilation, Core Video buffer processing, Core ML execution and sustained camera performance still require Mac/iPhone checks.

## JavaScript API

Import `ShelfBenchmarkModelId`, `getShelfBenchmarkAvailabilityAsync(modelId = 'shelfset')`, `ShelfBenchmarkView`, `subscribeShelfBenchmarkCompletions`, `subscribeShelfScanStates` and event types from this directory. Availability confirms the requested compiled model resource exists; starting loads and validates its contract.

Mount the view with the selected `modelId`, `active=false`, a unique `runId`, `durationSeconds=30` or `300`, and event callbacks. Start with a fresh ID and `active=true`; stop with `active=false`. Model changes apply only to a new run. A finished/interrupted run does not auto-resume. Register the module-level completion subscription once in the session-memory store and deduplicate by run ID. This preserves summaries when the view is removed; view events still handle current-screen controls. Camera permission alerts alone must not be treated as app backgrounding.

## Continuous scan mode

Set `mode="scan"` to scan until an explicit stop; omitting mode preserves the timed benchmark. `durationSeconds` remains required for API compatibility but is ignored in scan mode. Pause sets `active=false`; resume uses a fresh native `runId`. JavaScript owns the logical session and its previous collected products. Native scan completion never creates a benchmark summary or overwrites benchmark timing history.

- Detection still admits at most two full frames per second, with one detector inference in flight. Package identification does **not** run twice per second.
- A separate utility queue reads at most one detected package at a time. Read admissions are at least one second apart; a successful evidence result also delays the next admission by at least one second. Process-wide token leases enforce reader exclusivity across navigation and replacement view instances; stale completions cannot release another job. There is no pending crop queue. A two-second watchdog requests Vision cancellation; if cancellation takes longer, that job keeps the only reader slot until it actually returns.
- Each read uses the original portrait camera buffer and a normalized detected region. It tries EAN-13, EAN-8, UPC-E and ITF-14 first. With no usable barcode, it requests accurate English Vision OCR without language correction. These are local Apple APIs, not cloud calls.
- Barcode payloads must be ASCII digits of the declared format's exact length. The reader sends at most two 64-character-bounded barcode values; checksum, catalog uniqueness and product identity belong to the local resolver. UPC-A represented by Vision as EAN-13 keeps its leading zero for the resolver to normalize. No arbitrary barcode format is guessed.
- OCR evidence is capped at 12 lines and **240 characters total**, with whitespace/control characters normalized. The reader returns raw evidence, never an asserted product match. Every OCR-based interpretation requires user confirmation, including a high-confidence OCR result.
- Scheduling hints use at most 96 recent regions, a tiny local visual fingerprint and a six-second expiry to prioritize unread packages. Small/blurred/missed packages may not be read. Overlap or a fingerprint never establishes identity. Every successful job gets a fresh `observationId`; `trackIdHint` is only an optional scheduling hint. JavaScript deduplicates using validated barcode/evidence rules.
- `onObservations` returns `{runId, sequence, observations}` with at most one observation. Each includes a normalized **source-image, top-left-origin** `rect`, detector confidence, compact barcode/text evidence and `needsConfirmation=true`. No pixels, image path or image hash crosses the native bridge.
- `onScanState` emits running or terminal state. Register `subscribeShelfScanStates` in session memory when navigation/unmount must remain observable; both callback routes can report the same state, so handlers must be idempotent. Late evidence is rejected after stop, background entry, view removal or a new run epoch. Low-memory warnings stop capture and request cancellation.
- Native storage is bounded: one detector frame, at most one reader frame, one reusable detector input buffer, at most 96 region hints and 600 recent detector-latency samples. Frames and region hints are discarded as work finishes/stops. Extracted evidence belongs to the app's memory-only scan session, not persistent History or catalog membership.
- Switching apps pauses capture. The first camera permission alert does not cancel startup. There is no guessed inactivity timeout or automatic resume. No health profile, network request, image file, analytics event or persistent scan record is created here.

The first implementation reads one useful package region per job; it does not promise to identify every detected box immediately. Camera focus, glare, small text, barcode visibility, region alignment and actual Vision speed require signed-iPhone validation.

## Camera, preprocessing and measurement

- Portrait rear-camera preview at 1080p where supported. A process-wide camera coordinator stops the previous owner before starting another session; unique run tokens make delayed old-owner stop calls harmless. Epoch checks before/after blocking camera startup handle pause or navigation during startup. Two admissions per second use a monotonic 500 ms schedule. A process-wide lease permits exactly one detector inference in flight, and model loads/inference share one serial queue across camera views; busy deadlines are dropped, missing slots counted, and no image backlog or catch-up burst is created.
- One reusable 640 by 640 BGRA buffer receives a centered **gray 114** letterbox. Geometry uses Python-style nearest-even dimension rounding and the same integer left/top padding as Ultralytics. Explicit half-pixel bilinear sampling avoids depending on Vision's unspecified scale-fit padding.
- Vision uses `.scaleFill` on the already-square input. Output boxes are mapped back by removing letterbox padding and dividing by the pre-rounding scale, then clipped to the source image. The preview uses portrait aspect-fill geometry.
- Floating bilinear interpolation can differ from OpenCV fixed-point `INTER_LINEAR` by one 8-bit channel value. Portable fixtures currently meet that bound; this is not a claim of bit-exact on-device tensor parity. Camera color/orientation and actual model output require physical validation.
- The temporary image buffer is reused and erased after every prediction, including failures. Camera frames never become files, JavaScript images or network uploads.
- This benchmark measures **single-full-frame inference**. A timing pass does not validate tiled detection, OCR, product identification or health ranking.
- Latency includes admission, explicit letterboxing, model prediction, inverse box mapping and filtering. It excludes exposure/delivery before admission, initial model load, camera startup, buffer erasure and preview/UI rendering. Model load is reported separately; cached reuse reports zero.
- Completed FPS is measured over the full window. Thirty seconds is a quick test; 300 seconds is the sustained test. Timing passes only in a Release build after the complete window with at least 1.9 completed FPS, p95 below 500 ms, no inference failures and no serious/critical thermal state. The admission target remains 2 Hz.
- Becoming inactive during capture, background entry, camera interruption, low-memory warning or view removal stops capture and invalidates late results. Diagnostic summaries contain timing/device/model facts, no images, product identities, health profiles or persistent device identifiers. No summary is automatically saved or sent.

## Reproducible preprocessing checks

`tests/letterbox-reference.json` contains 32 landscape/portrait/square/odd-padding box cases and five independent OpenCV pixel fixtures. `tests/portable-reference-result.json` records portable math comparison only; Swift and Apple pixel-buffer execution are explicitly false there.

On a Mac, compile and run the actual Foundation-only native helpers from this module directory:

```sh
swiftc -O ios/ShelfLetterboxGeometry.swift tests/LetterboxFixtureCheck.swift -o "$TMPDIR/shelf-letterbox-check"
"$TMPDIR/shelf-letterbox-check" tests/letterbox-reference.json
```

This checks dimension rounding, padding, clipping, inverse boxes and the exact interpolation helper used by native code. It does not compile the Expo/AVFoundation module or exercise Core Video row strides. Those checks belong to the signed-device build.

## Bounded reader checks

`tests/ScanPlannerCheck.swift` exercises process-wide lease ownership/release and cooldown, admission spacing, busy-reader rejection, prioritization, changed appearance in the same location, retry cooldown, stale-region rejection, candidate eviction and text/barcode bounds. Run the actual Foundation helpers on a Mac:

```sh
swiftc -O ios/ShelfWorkAdmission.swift ios/ShelfScanReadPlanner.swift tests/ScanPlannerCheck.swift -o "$TMPDIR/shelf-scan-planner-check"
"$TMPDIR/shelf-scan-planner-check"
```

These source fixtures are not yet executed on this Linux development host, which has no Swift compiler. They do not substitute for compiling the Expo module or testing Apple Vision. Device checks must also verify scan Start/Pause/Resume, navigation during an OCR job, backgrounding, camera interruption, low-memory cancellation, changing products at the same shelf location, exact barcode normalization, and no late evidence after a stopped run. Run benchmark mode again to confirm it performs no OCR and preserves its original timing scope.

## Device acceptance and rights

Compare both candidates on the same cereal, cheese and cookie shelves. Record per-run model identity; check aligned individual boxes, missed or merged packages, false positives, preview responsiveness, FPS, p95 latency and heat. Run the five-minute test, then exercise permission denial/grant, rapid stop/restart and model switching, cross-view camera handoff, backgrounding and navigation during model load and inference.

Neither candidate has unrestricted commercial/App Store clearance: SKU110K source restrictions include academic/non-commercial research use; ShelfSet's MIT notice does not settle underlying Ultralytics or scraped training-image rights. Relevant model cards, source revisions, AGPL/MIT notices and remaining uncertainty are bundled beside each model. This is an authorized research comparison, not a declaration that the surrounding app has been relicensed or released.
