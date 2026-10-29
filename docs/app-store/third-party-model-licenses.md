# Shelf detector licenses and release decision

Recorded October 29, 2026. This is repository release documentation. It is not App Store listing copy, a privacy-policy statement or an end-user warning. If pushed to the public repository, this document is public.

## Owner decision

The owner explicitly instructed us to retain both pretrained shelf detectors and proceed with App Store preparation, noting that NutriGlimpse uses the model rather than the SKU-110K training dataset. No replacement choice is awaiting the owner. Do not remove or replace either detector without a separate implementation decision.

This records authorization to proceed. It does not assert an independently verified grant from third-party rights holders, and it does not assert that App Store distribution is categorically prohibited. The source links below explain the narrower uncertainty.

## What the app uses

ShelfSKU11Diagnostic and ShelfSetDiagnostic are converted pretrained models that locate package boundaries on-device. NutriGlimpse did not train or fine-tune these checkpoints. The app does not bundle or use the SKU-110K training image dataset for runtime detection. Model binaries are included in the separately signed phone build and excluded from the public Git repository; original application code is MIT-licensed. The application's MIT license does not replace third-party notices.

| Component | Identified source | Published terms and remaining question |
|---|---|---|
| ShelfSetDiagnostic | [ShelfSet LLC / Data Science UA](https://github.com/ShelfSet/shelf-object-detector), recorded revision `b1dfbd2f67e38a0ead05d0b653c675569ef8a02a` | The publisher advertises the model as MIT and its [license](https://github.com/ShelfSet/shelf-object-detector/blob/main/LICENSE) permits use, modification, distribution and sale with notices retained. Its own MIT text does not prohibit a free App Store app. The project [depends on Ultralytics](https://github.com/ShelfSet/shelf-object-detector/blob/main/requirements.txt); the precise applicable upstream obligations for the exported model have not been independently resolved. A dependency alone does not establish that our entire application is covered. |
| ShelfSKU11Diagnostic | [chistopat SKU-110K YOLO11 model](https://huggingface.co/chistopat/sku110k-yolo11-object-detector), recorded revision `ee1b8ac34eb3b68969ffa8165e50c43457fe4e35` | The publisher labels its license as other and asks that publication and downstream use remain aligned with the SKU-110K terms; it does not claim a broader license. That model-specific statement is why uncertainty remains even though NutriGlimpse uses a pretrained model and not the training dataset. No explicit blanket App Store ban was identified. |
| SKU-110K dataset | [Original dataset repository](https://github.com/eg4000/SKU110K_CVPR19#dataset) | The published dataset notice says: "The dataset is provided for the exclusive use by the recipient and solely for academic and non-commercial purposes." This is a dataset restriction. It does not expressly resolve every redistribution scenario involving trained weights, and this record does not assume it automatically governs all model outputs. |
| Ultralytics lineage | [Publisher's license explanation](https://www.ultralytics.com/license) and the accompanying AGPL text | Ultralytics states that covered code/models require AGPL compliance or an Enterprise license. Whether and how that applies to these particular exported artifacts needs interpretation. A public MIT application repository is not by itself proof of AGPL compliance. No paid license purchase is assumed mandatory solely because an app is published. |

ShelfSet describes its own training dataset as independent of SKU-110K, with SKU-110K used for evaluation only. The two models must not be treated as having identical training-data terms.

## Preserved notices and evidence

- `THIRD_PARTY_NOTICES.md` distinguishes original-code MIT coverage from third-party material.
- `apps/mobile/modules/shelf-benchmark/ios/Resources/ShelfSet-LICENSE.txt` preserves the MIT text.
- The adjacent `ShelfSet-NOTICE.txt`, `SKU110K-NOTICE.txt` and `Ultralytics-LICENSE.txt` preserve provenance and upstream notices. Their original diagnostic-stage wording is historical; this document records the current owner decision and does not rewrite upstream license text.
- Build 28 retains both compiled models. This documentation checkpoint does not change its signed binary, source inputs, app behavior, model routing or latency.

No licensor has been contacted, no permission has been fabricated, no model has been relicensed and no App Review submission has been made by this checkpoint. The active release checklist continues to track device acceptance, screenshots, privacy declarations, production backend cutover and final owner review separately.
