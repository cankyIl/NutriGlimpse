# Shelf detector recovery experiment

Run only in the authoritative workspace `/path/to/NutriGlimpse` on `project-server`, user `developer`. Results were produced October 14, 2026 America/New_York. No user photos, health data, custom training or paid inference were used. This is diagnostic research; no physical-iPhone result or production acceptance is claimed.

## Evidence and decision

- [Decision and limitations](../../docs/31-shelf-recovery-and-detector-decision.md).
- `protocol.json`: predeclared engineering gate and amendments made before inference.
- `validation-manifest.json`: frozen source/annotation file, SHA256 `2dc5fa159b91e97355aad8cc4b4cfab43abb07f99816a8201c38e3695b92816a`.
- [Validation preparation and image attribution](validation-README.md). Three quantitative images, 51 fronts; one qualitative biscuits stress image. Rejected draft labels are not scored.
- `artifacts/shelf-recovery/yoloe/README.md`: recovery commands, environment/policy hashes, OCR provenance and output contracts.
- `artifacts/shelf-recovery/replacements/replacement-report.md`: candidate source revisions, model hashes, exports, timings, known failures and rights.
- `artifacts/shelf-recovery/scores/`: common one-to-one IoU 0.50 measurements. Extra proposals overlapping declared ambiguous package fragments are counted separately as ignored; signs and price cards are negatives.

## Reproduce scoring without GPU/inference

These commands create `score-check/`, preserving the recorded score files. No boxes are added or removed by the adapter. Run from the authoritative repository root; the frozen manifest contains that root's absolute image paths.

```bash
python3 -m unittest discover -s ops/shelf-recovery -p 'test_*.py'
python3 ops/shelf-recovery/prepare_recovery_scores.py --output-dir artifacts/shelf-recovery/score-check
python3 ops/shelf-recovery/evaluate_proposals.py --manifest artifacts/shelf-recovery/validation/manifest.json --predictions artifacts/shelf-recovery/score-check/yoloe-baseline-predictions.json --output artifacts/shelf-recovery/score-check/yoloe-baseline.json
python3 ops/shelf-recovery/evaluate_proposals.py --manifest artifacts/shelf-recovery/validation/manifest.json --predictions artifacts/shelf-recovery/score-check/yoloe-recovery-predictions.json --output artifacts/shelf-recovery/score-check/yoloe-recovery.json
python3 ops/shelf-recovery/evaluate_proposals.py --manifest artifacts/shelf-recovery/validation/manifest.json --predictions artifacts/shelf-recovery/replacements/shelfset-validation.json --output artifacts/shelf-recovery/score-check/shelfset.json
python3 ops/shelf-recovery/evaluate_proposals.py --manifest artifacts/shelf-recovery/validation/manifest.json --predictions artifacts/shelf-recovery/replacements/sku110k-yolo11s-validation.json --output artifacts/shelf-recovery/score-check/sku110k-yolo11s.json
```

The evaluator maximizes one-to-one valid matches. A large box cannot earn multiple true positives. The gate is overall precision/recall >=85% and per-image precision/recall >=75%. These are engineering advancement thresholds on a small assistant-annotated sample, not general accuracy or medical safety claims. Original selected cereal/cookie targets are exploratory and are reported separately. Future category routing is selected from these results and requires a fresh evaluation set.

## Reproduce inference/exports

Use the original environment and commands recorded in the artifact reports. Do not mix the original Ultralytics 8.3.203 environment with the replacement's isolated 8.4.64 overlay. Keep GPU inference sequential. Rerunning inference/export overwrites its output files; preserve evidence before rerunning. OCR is a CPU RapidOCR proxy, not Apple Vision OCR.

Replacement examples:

```bash
PYTHONPATH="$PWD/artifacts/shelf-recovery/replacements/runtime" .tools/shelf-eval-venv/bin/python ops/shelf-recovery/replacement_evaluate.py --model shelfset --split validation
PYTHONPATH="$PWD/artifacts/shelf-recovery/replacements/runtime" .tools/shelf-eval-venv/bin/python ops/shelf-recovery/replacement_evaluate.py --model sku110k-yolo11s --split validation
```

Core ML exporter scripts preserve one real product class plus 79 zero-score padding classes for the upstream NMS workaround. Their manifests record file hashes, checkpoint hashes, thresholds, adapter parity and known runtime limits. Mac compilation and converted-model/device parity remain required. The source bundle is a device diagnostic handoff, not a complete portable copy of the server evaluation runtime or model-training datasets.
