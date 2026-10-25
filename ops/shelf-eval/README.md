# Pretrained shelf detector evaluation — 2026-10-14

Authoritative workspace: `/path/to/NutriGlimpse`, host `project-server`, user `developer`.

**Decision: pretrained YOLOE-11s has not passed shelf detection quality. Physical iPhone performance is unverified.** All images are licensed public fixtures; no user's health data or camera photos were used. No training, paid APIs, cloud GPU charges, or service deployment occurred.

## Reproduce in the prepared isolated environment

Run from the repository root. `.tools/shelf-eval-venv` contains Python 3.11.14, PyTorch 2.7.1+cu126, Ultralytics 8.3.203, Core ML Tools 8.3.0; full pins are in `requirements.lock.txt`. For another CUDA machine, install that lock using the PyTorch cu126 index as an extra index. The official CLIP tokenizer is pinned by Git commit. All cache directories must remain under this workspace. The first run created Ultralytics' generic settings in `/tmp/Ultralytics` because its config directory did not yet exist; corrected scripts now create the scoped config first.

```bash
python3 ops/shelf-eval/fetch_fixtures.py
python3 ops/shelf-eval/fetch_models.py
.tools/shelf-eval-venv/bin/python ops/shelf-eval/evaluate.py
.tools/shelf-eval-venv/bin/python ops/shelf-eval/threshold_probe.py
.tools/shelf-eval-venv/bin/python ops/shelf-eval/verify_detection_conversion.py
.tools/shelf-eval-venv/bin/python ops/shelf-eval/export_coreml.py
```

Evaluation reruns overwrite only `artifacts/shelf-eval` evaluation outputs. Prompted PT serialization can change file hashes; export regenerates the manifest to match. Source weights and fixture bytes are pinned and verified before evaluation.

`evaluate.py` compares three prompt sets at confidence 0.25. It converts the pretrained segmentation model to the official detection-only architecture: all 592/592 detection parameters load from released weights, no random detection parameters or training. The exact raw detection outputs match the original segmentation model before prompt checkpoint serialization/fusion on a deterministic test tensor (`conversion-parity.json`). Exported FP16 Core ML predictions still require Apple runtime parity testing.

`threshold_probe.py` uses the saved category prompt checkpoint at confidence 0.10/0.05, full images and four overlapping tiles. Images are oriented and resized longest edge ≤ 1600 pixels, then detector inputs letterboxed to 640 × 640. Tiles overlap by one third of each tile width/height (60% image spans with 40% origins). Boxes translate to full-image coordinates and merge with class-agnostic IoU 0.5 NMS. Its one-pass timing includes cold effects and is **not a benchmark**.

The detector is only a package locator; it does not verify SKU, ingredients, nutrition, dietary compliance, or health rankings.

## Optional bounded comparison already executed

ShelfSet commit `b1dfbd2f67e38a0ead05d0b653c675569ef8a02a`, `models/shelf_server.pt`, was downloaded directly from the repository (20 MB). Its advertised Drive folder no longer contains the advertised model files; no datasets were downloaded. Comparison uses a separate overlay of Ultralytics 8.4.14 under `.tools/shelf-eval-venv/compare-libs`, leaving YOLOE's pinned environment unchanged:

```bash
PYTHONPATH="$PWD/.tools/shelf-eval-venv/compare-libs" .tools/shelf-eval-venv/bin/python ops/shelf-eval/compare_shelfset.py
.tools/shelf-eval-venv/bin/python ops/shelf-eval/score_spotcheck.py
```

ShelfSet weights/README/LICENSE/source hash are under `artifacts/shelf-eval/models/shelfset/`. Its repository's MIT assertion does not settle upstream Ultralytics licensing or scraped training-image rights. These weights are **comparison only; not bundled in the application**.

## Artifacts

- `artifacts/shelf-eval/report.md`: findings and scope limits.
- `results.json`: 12 original runs, full boxes, eight warm server timings per run.
- `threshold-results.json`: 16 threshold/tile probes, full-image boxes.
- `shelfset-results.json`: 8 comparison runs at 640/1280 pixels, eight warm timings each.
- `spotcheck-results.json`: exploratory manually selected target matching, not independent benchmark accuracy.
- `models/ShelfYOLOE.mlpackage`: 18.2 MiB fixed-prompt FP16/NMS Core ML model for diagnostic device testing.
- `models/ShelfYOLOE.json`: exact labels, source hashes, export file hashes, input/output contract, unaccepted quality status.
- Per-configuration folders: annotated photographs. These derivative images retain the source photograph's license; see `ATTRIBUTION.md`.

No end-to-end two-frames-per-second claim is supported until a physical iPhone runs the instrumented build and passes sustained latency, dropped-frame, thermal, and detection-quality checks.
