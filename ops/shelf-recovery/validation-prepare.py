#!/usr/bin/env python3
"""Prepare/verify public recovery validation images. No ML inference, training or API fees."""
from pathlib import Path
import argparse, hashlib, json, urllib.request
from PIL import Image, ImageOps
ROOT=Path(__file__).resolve().parents[2]
MANIFEST=ROOT/"ops/shelf-recovery/validation-manifest.json"
DEST=ROOT/"artifacts/shelf-recovery/validation"
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--fetch",action="store_true",help="Download missing licensed originals and rebuild final crops; verify all hashes.")
    args=p.parse_args()
    m=json.loads(MANIFEST.read_text())
    old=json.loads((ROOT/"ops/shelf-eval/fixtures.json").read_text())
    oldhash={x["sha256"] for x in old}
    assert m["status"]=="frozen"
    assert len(m["images"])==3 and sum(len(x["boxes"]) for x in m["images"])==51
    DEST.mkdir(parents=True,exist_ok=True)
    for item in m["images"]+m["qualitativeImages"]:
        original=DEST/Path(item["originalPath"]).name
        final=DEST/Path(item["path"]).name
        if args.fetch and not original.exists():
            request=urllib.request.Request(item["sourceUrl"],headers={"User-Agent":"HealthGroceryShelfValidation/1.0"})
            data=urllib.request.urlopen(request,timeout=60).read()
            if hashlib.sha256(data).hexdigest()!=item["sourceSha256"]:
                raise ValueError("Remote original changed: "+item["id"])
            original.write_bytes(data)
        assert original.exists(),str(original)+" missing; use --fetch"
        assert sha(original)==item["sourceSha256"],"Original mismatch: "+item["id"]
        assert item["sourceSha256"] not in oldhash,"Original evaluation image reused"
        if args.fetch and not final.exists():
            image=ImageOps.exif_transpose(Image.open(original)).convert("RGB")
            assert image.size==(item["originalWidth"],item["originalHeight"])
            image=image.crop(item["cropXYXY"]).resize((item["width"],item["height"]),Image.Resampling.LANCZOS)
            image.save(final)
        assert final.exists(),str(final)+" missing; use --fetch"
        assert sha(final)==item["sha256"],"Crop hash mismatch (check Pillow version): "+item["id"]
        assert Image.open(final).size==(item["width"],item["height"])
        for b in item.get("boxes",[])+item.get("ignore_boxes",[]):
            assert 0<=b[0]<b[2]<=item["width"] and 0<=b[1]<b[3]<=item["height"],(item["id"],b)
        print(item["id"],"quantitative" if item["quantitativeScoringEligible"] else "qualitative",len(item.get("boxes",[])),"labels",item["license"])
    if (DEST/"manifest.json").exists():
        assert (DEST/"manifest.json").read_bytes()==MANIFEST.read_bytes(),"Tracked and artifact manifests differ"
    print("Verified four distinct source files, three scored crops, 51 boxes, one qualitative crop.")
if __name__=="__main__":
    main()
