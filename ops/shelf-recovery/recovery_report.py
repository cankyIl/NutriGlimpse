"""Summarize measured recovery results; no inferred SKU identities."""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[2];O=R/'artifacts/shelf-recovery/yoloe'
rows=json.loads((O/'original/results.json').read_text())
text="""# YOLOE + independent text recovery — October 14, 2026

The recovery experiment demonstrates useful text evidence outside YOLOE proposals, but does not establish reliable individual-package localization or exact product identity. All work ran on the remote Linux server, not an iPhone. No training or paid APIs were used.

## Frozen experiment

The original YOLOE fixed-prompt checkpoint remains unchanged. Each image receives a full-frame640x640 detector pass at confidence0.10, plus independent full-frame RapidOCR text detection/recognition on CPU. OCR runs on the whole photograph, not just YOLOE crops. Literal text, quadrilaterals and confidence remain a separate evidence channel; text boxes are never counted as verified packages.

The frozen development policy chooses up to8 text-anchored crops, each40% of original image width and height, prioritizing text outside baseline boxes. Eligible anchors have at least3 ASCII letters, OCR confidence>=0.80, and width<=35% of imagewidth. Candidate crops with IoU>0.30 against a previously selected crop are skipped. This simple filter does not eliminate all shelf signage, promotions, merged text, or price-card product names. All selected cropbounds are recorded. The original detector runs at640 on these high-resolution original-image crops. Predictions touching an interior cropedge are excluded; remaining candidates merge with baseline using class-agnostic IoU0.50 NMS.

No policy changed after the original four-image run. The exact policy and script are hashed before the new validation set is scored. Policy SHA256: `cc0c91e7ba43fb21547e1be8ec936bcdc9354f689527f97aea0b35b72e0e700f`.

## Original four-photo measurements

| Image | Baseline boxes | Recovery boxes | Eligible OCR anchors | Anchors outside baseline boxes | Selected crops | CPU OCR time | Whole pipeline time |
|---|---:|---:|---:|---:|---:|---:|---:|
"""
for r in rows:
 c=r['counts'];t=r['timing'];text+=f"| {r['image']} | {c['baselineBoxes']} | {c['recoveryBoxes']} | {c['ocrAnchors']} | {c['ocrAnchorsOutsideBaseline']} | {c['crops']} | {t['fullFrameOcrCpuMs']/1000:.2f} s | {t['pipelineWallMs']/1000:.2f} s |\n"
text+="""
Counts are not accuracy, unique products, or successfully identified SKUs. The original photos are development examples, and the earlier exploratory labels are not independent ground truth. On those previously selected targets, cereal package matches changed13/28 to14/28 and cookie matches0/12 to8/12 atIoU0.5. The four stacked cookie/cake targets still merged. This is a limited diagnostic gain, not acceptance.

## Text that actually became available independently

- Close cereal: literal `FROSTED` and `FLAKES` observations on multiple package fronts outside YOLOE boxes, with model confidence0.94–0.99. These words are visually correct, but neither prove a complete product record nor distinguish every variant.
- Wide cookies: `Hobnobs`, `Digestives`, and `PLANTASTIC` appear outside baseline boxes. These are useful search/recognition clues, not verified UPC/SKU values.
- Wide cereal: `LOWSUGAR`, `ORIGINAL`, `GRANOLA`, `Weetos`, and `TESCO` appear independently. OCR sometimes combines neighboring packages, e.g. `Kellogg KellogHellogy` and `BIG750gBIG750g`; those strings must not be treated as a single product.
- Cheese: `Ezine Klasik` is readable on the two clear front tubs, but product names also appear on price cards. The original cheese photo has only two clear front tubs; raw detection counts do not establish missed-tub recall. Previous wording suggesting that almost all cheese tubs were missed was incorrect.
- Counterexamples: high-confidence `Price`, `Half`, shelf notices and promotional text are also returned. A truncated promotional `Favouri` became a crop anchor, while a price sign was falsely boxed by YOLOE. Text confidence is not package confidence or product identity confidence.

Recovery overlays still contain merged stacks, display cartons, duplicate/partial package regions and a cereal-bowl fragment instead of a complete cereal box. Independent OCR supplies genuinely additional evidence, but selective crops have not fixed the primary separation failures.

## Performance interpretation

CPU OCR consumed1.27–5.15seconds per original photo; complete server pipelines took1.48–5.51seconds. These are one-pass diagnostic wall times, including cold effects, on an i5-10400F with GTX1660SUPER for detection. They are not sustained benchmarks. This implementation cannot be described as completing the whole recovery pipeline twice per second. It supports testing an asynchronous selected-keyframe OCR branch while the fast camera/detector loop runs separately, but that app integration and queue behavior were not tested here.

RapidOCR/ONNXRuntime is a CPU feasibility proxy. Apple Vision OCR speed/quality, CoreML output parity, multi-frame tracking, motion blur, camera sampling, battery/thermal behavior and sustained2Hz on a physical iPhone all remain untested. Still-image repeats cannot verify temporal recovery.

## Reproduce

```bash
cd /path/to/NutriGlimpse
PYTHONPATH="$PWD/.tools/shelf-recovery-libs" .tools/shelf-eval-venv/bin/python ops/shelf-recovery/recovery_run.py --split original
```

Frozen validation commands (use the existing frozen manifests; do not relabel after seeing predictions):

```bash
PYTHONPATH="$PWD/.tools/shelf-recovery-libs" .tools/shelf-eval-venv/bin/python ops/shelf-recovery/recovery_run.py --manifest artifacts/shelf-recovery/validation/manifest.json --split validation
PYTHONPATH="$PWD/.tools/shelf-recovery-libs" .tools/shelf-eval-venv/bin/python ops/shelf-recovery/recovery_run.py --manifest artifacts/shelf-recovery/yoloe/qualitative-manifest.json --split qualitative
```

The isolated OCR overlay contains `rapidocr-onnxruntime==1.4.4`, `onnxruntime==1.23.2`, `numpy==1.26.4` and `opencv-python==4.11.0.86`. No system install or original detector-environment modification occurred. The pretrained OCR package contains three PaddleOCR-derived ONNX files; source/wheel hashes, individual model hashes and upstream licensing attribution are recorded in `ocr-provenance.json`, `RapidOCR-LICENSE.txt` and each split's `manifest.json`. This does not add OCR to the mobile app.

Every image JSON separates `baselineBoxes`, `ocrTextEvidence`, `ocrCandidateRegions`, `cropBoxes`, `recoveryBoxes` and stage timings. Coordinates are original EXIF-oriented image pixels. The accompanying JPGs separately visualize baseline boxes, text evidence, selected crops and final detector proposals. Image attribution remains in the original fixture manifest and `artifacts/shelf-eval/ATTRIBUTION.md`.
"""
if (O/'validation/results.json').exists():
 val=json.loads((O/'validation/results.json').read_text());text+='\n## Frozen validation execution\n\nExecuted the same policy without retuning on '+str(len(val))+' new frozen images. Package quality is scored separately by the common evaluator; the JSON outputs here do not equate OCRtext with package detections.\n\n'
 for r in val:text+=f"- {r['image']}: {r['counts']['baselineBoxes']} baseline boxes; {r['counts']['recoveryBoxes']} recovery boxes; {r['counts']['ocrTextLines']} OCR lines; CPU OCR {r['timing']['fullFrameOcrCpuMs']/1000:.2f} s; pipeline {r['timing']['pipelineWallMs']/1000:.2f} s.\n"
else:text+='\n## Frozen validation execution\n\nPending receipt of the new, independently labeled fixture manifest. No validation result is claimed.\n'
if (O/'qualitative/results.json').exists():
 q=json.loads((O/'qualitative/results.json').read_text())[0]
 text+=f"\nGhana biscuits were evaluated separately without package ground truth: {q['counts']['baselineBoxes']} baseline boxes and {q['counts']['recoveryBoxes']} recovery boxes; {q['counts']['ocrTextLines']} OCR lines. No package-quality score is claimed.\n"
if (O/'validation/results.json').exists():
 text+="""\nVisual review of the frozen validation outputs found two recurring precision problems. In SPAR cereal, extra crops produced nested detections of printed label panels inside already detected whole packages. In Safeway cheese, yellow price cards became package detections; all six eligible OCR anchors outside baseline boxes were Club Price signage or its misspellings, rather than newly recognized product names. These examples show why extra text/box counts must not be presented as recovered-product coverage. No rule or threshold was adjusted after observing these validation failures.\n
The common evaluator owns package precision/recall and advance-gate results. The recovery experiment should not be accepted merely because it returns more boxes. No exact SKU/formulation, multi-frame coverage, or iPhone throughput result has been established.\n"""
scores=[]
for name in ['yoloe-baseline','yoloe-recovery']:
 score_path=R/'artifacts/shelf-recovery/scores'/f'{name}.json'
 if score_path.exists():scores.append(json.loads(score_path.read_text()))
if len(scores)==2:
 score_text="""## Decision from the frozen validation set

**Reject this selective-crop recovery union.** The unchanged policy gained one correctly localized package but added 19 false positives. Neither the original YOLOE baseline nor this recovery configuration passes the provisional advance gate.

| Configuration | Labeled packages | Correct boxes | False positives | Missed packages | Ignored predictions | Precision | Recall |
|---|---:|---:|---:|---:|---:|---:|---:|
"""
 for score in scores:
  t=score['totals'];score_text+=f"| {score['model']} | {t['groundTruth']} | {t['truePositives']} | {t['falsePositives']} | {t['falseNegatives']} | {t['ignoredPredictions']} | {t['precision']:.1%} | {t['recall']:.1%} |\n"
 score_text+="""
| Image | Configuration | Correct / false / missed | Precision | Recall |
|---|---|---:|---:|---:|
"""
 for score in scores:
  for row in score['images']:
   score_text+=f"| {row['id']} | {score['model']} | {row['truePositives']} / {row['falsePositives']} / {row['falseNegatives']} | {row['precision']:.1%} | {row['recall']:.1%} |\n"
 score_text+="""
One-to-one maximum-cardinality matching uses IoU ≥ 0.50. An unmatched prediction is ignored only when at least half its area overlaps an explicitly ignored region. The advance gate requires aggregate precision and recall ≥ 85%, and both metrics ≥ 75% for each image. Both configurations also retain one geometrically suspected merge. Five predictions per configuration are ignored, so precision excludes those five. Ghana biscuits have no eligible-package ground truth and contribute no score.

These are measurements on 51 assistant-labeled package fronts across three frozen public images, not general product accuracy or an independent human-reviewed benchmark. Model training overlap is unknown. No thresholds or crop rules changed after these outputs. Common evaluator source results: `../scores/yoloe-baseline.json` and `../scores/yoloe-recovery.json`; protocol: `../../../ops/shelf-recovery/protocol.json`.

Full-view OCR may still be useful as asynchronous literal label evidence for future recognition and catalog confirmation. It is not a validated exact-product recognizer, and this experiment does not establish a repair for merged or missed packages. The detector recovery union should not be shipped on this evidence.

Frozen fixture SHA256: `2dc5fa159b91e97355aad8cc4b4cfab43abb07f99816a8201c38e3695b92816a`. Recovery run-script SHA256: `35f493a6c5776418d6d70cab97231a70ad6ded96c75f447b55bc5cedacac4311`. Original and validation split manifests record the same policy SHA256.

"""
 text=text.replace('## Frozen experiment',score_text+'## Frozen experiment',1)
fixes={'full-frame640x640':'full-frame 640 × 640','confidence0.10':'confidence 0.10','up to8':'up to 8','each40%':'each 40%','least3':'least 3','confidence>=':'confidence ≥ ','width<=':'width ≤ ','imagewidth':'image width','IoU>':'IoU > ','at640':'at 640','cropedge':'crop edge','IoU0.50':'IoU 0.50','changed13/28 to14/28':'changed 13/28 to 14/28','matches0/12 to8/12':'matches 0/12 to 8/12','atIoU0.5':'at IoU 0.5','confidence0.94':'confidence 0.94','consumed1.27–5.15seconds':'consumed 1.27–5.15 seconds','took1.48–5.51seconds':'took 1.48–5.51 seconds','GTX1660SUPER':'GTX 1660 SUPER','sustained2Hz':'sustained 2 Hz','OCRtext':'OCR text','cropbounds':'crop bounds'}
for a,b in fixes.items():text=text.replace(a,b)
(O/'report.md').write_text(text)
