# Shelf detector feasibility results — October 14, 2026

**YOLOE-11s does not yet pass the shelf detection quality requirement.** A working Core ML export is ready for diagnostic iPhone benchmarking, but no physical iPhone inference or 2 images per second result has been obtained. Server performance cannot establish phone performance.

## What actually ran

On `project-server` (Intel i5-10400F, NVIDIA GTX 1660 SUPER 6 GB), pretrained YOLOE-11s was evaluated without any training. The official segmentation checkpoint was loaded into the official detection-only architecture, with all 592/592 detector parameters supplied. A deterministic raw-output comparison of original segmentation versus detection-only architecture produced max absolute difference 0.0 before later FP16 export. This validates that removing the mask branch did not initialize or change detector parameters, not that Core ML predictions match PyTorch.

Four real public photos cover a close cereal display, wide cereal shelf, wide cookies/cakes shelf, and cheese tubs. They are convenience-selected photos from Canada, UK, and Turkey—not representative US store sampling. Source, photographer, license, and SHA256 are recorded in `fixtures/sources.json` and `ATTRIBUTION.md`. They are not user photos. We ran 12 initial combinations (3 prompt sets × 4 photos), then 16 low-threshold/tile probes. No held-out test set, independent reviewer, or formal accuracy claim exists.

The three prompt sets were generic packaging, category packaging, and a single "packaged food product" prompt. Category packaging was strongest of these limited trials. Its fixed labels are: cereal box, cookie package, cheese package, food box, food bag, food container, bottle, jar.

## Detection counts are not accuracy

| Photograph | YOLOE full frame, confidence 0.25 | YOLOE full frame, 0.10 | YOLOE four tiles, 0.10 | ShelfSet 640, 0.25 (comparison only) |
|---|---:|---:|---:|---:|
| Close cereal display | 4 | 17 | 15 | 29 |
| Wide cereal shelf | 9 | 48 | 95 | 85 |
| Wide cookies/cakes | 0 | 15 | 72 | 194 |
| Cheese tubs | 4 | 7 | 11 | 3 |

High counts can include cartons, grouped products, repeated/partial boxes, or false detections. All full boxes and overlaid images are preserved. We did not equate number of detections with products correctly identified.

Visual review found these material defects:

- At the default 0.25 threshold, YOLOE missed most visible cereal packages and every package in the cookies image.
- Lowering the threshold recovered packages but also produced boxes spanning multiple neighboring packages and retail display cartons.
- Four overlapping 640 px tiles recovered more small packages on wide shelves, but did not reliably separate stacked cookie/cake boxes. Some cartons and empty/near-empty display trays remained detections.
- The close cereal photo still had many missed boxes; extra tiles sometimes reduced usable matches, so tiling is not a blanket correction.
- ShelfSet's pretrained shelf-specific model separated individual cereal and cookie packages much better in these particular images. Correction after a closer October 14 review: the cheese photograph has two clearly visible front tubs; ShelfSet at 640 pixels finds both and also falsely detects a promotional price sign. Its 1280-pixel trial finds none. The earlier wording that it missed almost all cheese tubs was unsupported. This small photograph does not establish general cheese-category performance.

A small exploratory manual spot check was added after viewing model outputs: 28 selected cereal packages and 12 cookie/cake packages, matched one-to-one at IoU ≥ 0.5. YOLOE full-frame 0.10 matched 13/28 cereal targets and 0/12 cookie targets; four-tile 0.10 matched 6/28 and 6/12. ShelfSet 640 matched 26/28 and 12/12. These are post-hoc target counts, not exhaustive labels, independently reviewed ground truth, precision, recall for the whole image, or a publishable accuracy percentage. Labels and method are stored for review in `ops/shelf-eval/spotcheck-labels.json` and `spotcheck-results.json`.

## Timing and export

Across the 12 initial YOLOE runs, two warm-up passes preceded eight timed passes per run. Median server wall time ranged 13.0–16.4 ms; maximum per-run 95th percentile was 17.5 ms. This includes the in-memory PyTorch predict call, preprocessing and NMS, excludes file decode, camera capture, tracking, OCR, network and product identification, and uses a desktop NVIDIA GPU. These are short warm measurements, not a thermal soak or phone benchmark.

The four-tile probes required four model passes and full-image NMS. Their recorded one-pass timings include cold effects and should not be presented as a stable throughput benchmark.

`models/ShelfYOLOE.mlpackage` exported successfully using Core ML Tools 8.3.0, fixed 640 × 640 RGB input, FP16 weights, NMS, 8 prompt labels, confidence 0.10, IoU 0.50. The package is 18.2 MiB. Outputs are `confidence` [N, 8] FLOAT32 and `coordinates` [N, 4] FLOAT32 relative center-x/center-y/width/height. The exporter provides scalar threshold inputs whose description calls them optional, but their protobuf optional flags are not set; the native diagnostic module supplies their values explicitly. Class-agnostic duplicate suppression is also needed after Vision output to match Python's IoU 0.5 policy.

Core ML Tools warns PyTorch 2.7.1 is newer than its tested 2.5.0 version; Linux cannot execute Core ML runtime. Successful conversion is **not** an Apple compile or numerical equivalence result. Apple runtime validation and physical-device timing remain required.

## Reproducibility and licenses

- Official checkpoint URL: https://github.com/ultralytics/assets/releases/download/v8.3.0/yoloe-11s-seg.pt
- SHA256: `8e439445c87338b79d9ce21dec109f4621e26df67e94d26ea1a98c1e64dce3e3`.
- Ultralytics 8.3.203, Python 3.11.14, PyTorch 2.7.1+cu126; full dependency lock in `ops/shelf-eval/requirements.lock.txt`.
- MobileCLIP text encoder hash and source model verification in `fetch_models.py`; source license text retained in `models/Ultralytics-LICENSE.txt` and `models/YOLOE-LICENSE.txt`.
- Export sidecar `models/ShelfYOLOE.json` records source/prompted checkpoint and every export-file hash. Original YOLOE license source pinned to THU-MIG/yoloe commit `40cd606cabdbe2b566d6f14a6b162c89206e9a1b`; license bytes match AGPL text from pinned Ultralytics 8.3.203.
- ShelfSet comparison pinned to commit `b1dfbd2f67e38a0ead05d0b653c675569ef8a02a`, using Ultralytics 8.4.14 in a separate package overlay. Source manifest, weights hash, README and license are under `models/shelfset/`. Repository MIT claims do not settle upstream YOLO26 licensing or its scraped training-image rights. Do not bundle this comparison model without resolving those questions.

All source code and downloaded artifacts remain under the authoritative remote workspace. Public fixtures and reviewed overlay copies were explicitly transferred to the local `review-copies/2026-10-14-shelf-eval` folder. No app user data was retained or uploaded. No paid calls, training, or public service deployments occurred.

## Decision for the deadline

Continue physical iPhone diagnostic benchmarking with the exported YOLOE model to measure camera scheduling and inference. Do not describe it as shelf-ready, and do not allow unverified regions to become confident product identities or health rankings. The decisive remaining issue is package separation/recall across cereal, cookies and cheese, followed by a real iPhone sustained 2 fps result and end-to-end identity evaluation. No further model search or training was run in this bounded evaluation.
