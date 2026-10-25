# Recovery validation fixtures

Frozen before candidate-model predictions at 2026-10-15T00:09:55.735253+00:00.

Three quantified scenes contain **51 eligible package fronts**. A fourth crowded biscuit image is **qualitative only** because wrappers cannot be separated confidently enough for honest IoU labels.

## Files and reproduction

- validation-manifest.json is the frozen source-of-truth copy. Artifact manifest.json has identical bytes.
- Manifest SHA256: 2dc5fa159b91e97355aad8cc4b4cfab43abb07f99816a8201c38e3695b92816a.
- validation-prepare.py verifies originals, crop hashes and coordinates. --fetch downloads missing originals and rebuilds final images; never fetches model weights or runs inference.
- Run from repository root: .tools/shelf-eval-venv/bin/python ops/shelf-recovery/validation-prepare.py
- Final images are PNG; original crop coordinates are in EXIF-oriented source pixels. Lanczos resizing to 1200-pixel width is recorded explicitly.
- Green annotation overlays show eligible fronts; magenta rectangles mark ignored actual-package fragments. Price tags, signs, fixtures and display cartons remain negatives.
- Earlier manifest-draft.json and ghana-biscuits-annotations.jpg are rejected draft material, **not scored ground truth**. Only the frozen manifest may drive scoring.

## Sources and licenses

Crops and annotation overlays are adaptations; retain the following credit and each image's indicated license when sharing. No author endorses this app.

### spar-cereal

- Source: [https://commons.wikimedia.org/wiki/File:SPAR_kolonial_mat_varehandel_hyller_(Supermarket_interior_GROCERY_store_aisle_shelves)_Frokostblandinger_gryn_gr%C3%B8t_kjeks_m%C3%BCsli_Axa_(cereals_oatmeal_biscuits,_muesli)_etc_Tj%C3%B8me_NORWAY_2023-08-31_IMG_1092.jpg](https://commons.wikimedia.org/wiki/File:SPAR_kolonial_mat_varehandel_hyller_(Supermarket_interior_GROCERY_store_aisle_shelves)_Frokostblandinger_gryn_gr%C3%B8t_kjeks_m%C3%BCsli_Axa_(cereals_oatmeal_biscuits,_muesli)_etc_Tj%C3%B8me_NORWAY_2023-08-31_IMG_1092.jpg)
- Author: Wolfmann
- License: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)
- Original SHA256: 51fb46c8a33e05e63c7acb494787a1581cc40f78bb409331d5d01ec262d82a89
- Crop: [769, 1511, 4506, 3655] in oriented source 5770 x 7694; final 1200 x 688.
- Eligible fronts: 14
- Notes: Two adjacent shelves, mainly flexible muesli packets rather than rigid cartons. Includes one exposed rear energy packet whose front is mostly visible.

### spar-chips

- Source: [https://commons.wikimedia.org/wiki/File:Aisle_for_snack_food_(chips,_pop_corn,_etc.)_in_Spar_Supermarket_in_Tj%C3%B8me,_Norway_2017-12-05_01.jpg](https://commons.wikimedia.org/wiki/File:Aisle_for_snack_food_(chips,_pop_corn,_etc.)_in_Spar_Supermarket_in_Tj%C3%B8me,_Norway_2017-12-05_01.jpg)
- Author: Wolfmann
- License: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)
- Original SHA256: bcf8832df59faacd507236b5eae5c2f432617b74f7cb227aede4e9d09283ce38
- Crop: [835, 1215, 2794, 2031] in oriented source 4032 x 3024; final 1200 x 500.
- Eligible fronts: 19
- Notes: Two shelves of angled flexible chip bags. Same photographer/store as cereal but a distinct photo captured six years earlier. Cropped-edge backs and next shelf fragments excluded.

### safeway-cheese

- Source: [https://commons.wikimedia.org/wiki/File:Cheese_shelves_empty_Safeway_coronavirus_2020.jpg](https://commons.wikimedia.org/wiki/File:Cheese_shelves_empty_Safeway_coronavirus_2020.jpg)
- Author: Kurt Kaiser
- License: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)
- Original SHA256: f9a207fc5445c364fe80e372ff0949315612598fb95fbffef39432a2fedf3a19
- Crop: [296, 313, 3077, 2139] in oriented source 3456 x 4608; final 1200 x 788.
- Eligible fronts: 18
- Notes: United States source. Oblique refrigerated shelf, tubs, blocks and abundant price tags. Includes clearly separable distant blocks with unreadable text; excludes fronts dominated by price-tag occlusion.

### ghana-biscuits

- Source: [https://commons.wikimedia.org/wiki/File:Biscuits_on_display_in_a_Ghanaian_mini-market.jpg](https://commons.wikimedia.org/wiki/File:Biscuits_on_display_in_a_Ghanaian_mini-market.jpg)
- Author: Uprising Man
- License: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0)
- Original SHA256: eb73ee79da794a26fb8715195f15f723e588c3715fae675cee24f1448f604a84
- Crop: [1543, 314, 4000, 1800] in oriented source 4000 x 1800; final 1200 x 726.
- Eligible fronts: qualitative only
- Notes: Difficult oblique close-up, not an orderly frontal shelf. Wrappers overlap heavily. Labels are visible silhouette estimates with clipped boxes for clearly separable foreground wrappers; text is sparse and not SKU evidence. Highest annotation uncertainty of this pilot.

## Label protocol and limits

Single independent visual annotator; no model predictions, OCR output or candidate detections viewed before defining these boxes. Visible silhouette/front-region rectangles are approximate, not professional ground truth.

XYXY pixel rectangles around visible package fronts/silhouettes in final EXIF-oriented crop; top-left origin; no amodal completion. Some mostly visible truncated/occluded packages are labeled. These are front-region annotations, not guaranteed full physical-object extents.

Count individual separable retail package fronts/silhouettes that are mostly visible, including repeated facings and readable or unreadable packages. Clipped boxes allowed for clearly separable mostly visible foreground packages. Heavy occlusion, indistinguishable rear/edge fragments and back-only packages are ignore regions. Price tags, shelf fixtures and display cartons are not eligible products; their detections remain false positives unless a box falls inside an explicitly documented ignore region.

Annotating assistant reviewed all original/crop images and proposed overlays; root assistant reviewed the three quantitative overlays before any model predictions. No clinician/human professional annotator or product-catalog verification.

- Three quantified shelf sections containing 51 eligible package fronts, plus one qualitative crowded biscuit image. Convenience sample selected before model outputs; not statistically representative.
- SPAR cereal and chips share photographer/store across different years; not four independent stores.
- Model pretraining overlap is unknown; new to this local evaluation, not proven unseen to pretrained models.
- No temporal video, motion blur experiment or iPhone performance evidence.
- Text labels are partial literal transcriptions where legible; no catalog lookup and no asserted SKU/variant identity.
- Ghana wrapped biscuits have high boundary uncertainty; interpret separately from clearer shelf sections.
- Known original cheese-tub failure is not erased by better performance on a new scene.
- Two AI assistants supplied/reviewed subjective labels; not independent professional human ground truth. IoU is sensitive to visible-front versus full-package extents.
- No newly quantified cookie shelf; Ghana biscuit scene qualitative only. Keep original cookie and cheese-tub failures in the decision.

No recognition-model outputs, OCR output or candidate detections were consulted while choosing crops or labeling. ProductName/SKU fields are null throughout; visibleText contains partial literal text only. Repeated faces of the same product are separate package instances, not distinct SKUs.

## Reproduction verification

Pillow 12.3.0. All four PNGs regenerated in memory from source cropXYXY and final width/height match frozen hashes exactly. The optional previewCropXYXY field for spar-chips is an obsolete exploratory preview selection; ignore it. cropXYXY is authoritative. Frozen labels and image bytes remain unchanged.
