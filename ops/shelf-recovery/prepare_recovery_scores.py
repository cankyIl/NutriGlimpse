#!/usr/bin/env python3
"""Adapt saved recovery outputs for the common scorer, without filtering any boxes."""
import argparse, json
from pathlib import Path

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--source', default='artifacts/shelf-recovery/yoloe/validation/results.json')
    parser.add_argument('--output-dir', default='artifacts/shelf-recovery')
    args=parser.parse_args()
    rows=json.loads(Path(args.source).read_text())
    policies={row['policySha256'] for row in rows}
    if len(policies)!=1: raise ValueError('Mixed recovery policies')
    target=Path(args.output_dir); target.mkdir(parents=True,exist_ok=True)
    for name,key in [('yoloe-baseline','baselineBoxes'),('yoloe-recovery','recoveryBoxes')]:
        result={'model':name,'config':{'inputSize':640,'confidence':.1,'iou':.5,'policySha256':next(iter(policies)),'source':args.source},
          'images':[{'id':row['image'],'width':row['width'],'height':row['height'],'boxes':row[key]} for row in rows]}
        (target/(name+'-predictions.json')).write_text(json.dumps(result,indent=2)+'\n')
        print(name+': '+str(sum(len(row['boxes']) for row in result['images']))+' unchanged proposals')
if __name__=='__main__': main()
