#!/usr/bin/env python3
"""Frozen, one-to-one proposal evaluation. No source-photo/model execution."""
import argparse, hashlib, json
from pathlib import Path

def area(b): return max(0,b[2]-b[0])*max(0,b[3]-b[1])
def intersection(a,b):
    return max(0,min(a[2],b[2])-max(a[0],b[0]))*max(0,min(a[3],b[3])-max(a[1],b[1]))
def iou(a,b):
    inter=intersection(a,b); union=area(a)+area(b)-inter
    return inter/union if union else 0.0

def evaluate(truth,predictions,ignored=(),threshold=.5):
    pairs={i:sorted([j for j,g in enumerate(truth) if iou(p,g)>=threshold], key=lambda j:(-iou(p,truth[j]),j)) for i,p in enumerate(predictions)}
    matched={}
    def augment(i,seen):
        for j in pairs[i]:
            if j in seen: continue
            seen.add(j)
            if j not in matched or augment(matched[j],seen):
                matched[j]=i
                return True
        return False
    for i in sorted(pairs, key=lambda i:(len(pairs[i]),i)):
        augment(i,set())
    matched_predictions=set(matched.values())
    ignored_predictions=[i for i,p in enumerate(predictions) if i not in matched_predictions and area(p)>0 and any(intersection(p,g)/area(p)>=.5 for g in ignored)]
    false=[i for i in range(len(predictions)) if i not in matched_predictions and i not in ignored_predictions]
    merged=[]
    for i,p in enumerate(predictions):
        covered=[j for j,g in enumerate(truth) if area(g)>0 and intersection(p,g)/area(g)>=.7]
        if len(covered)>=2 and area(p)>1.5*max(area(truth[j]) for j in covered): merged.append({'prediction':i,'truthIndices':covered})
    tp=len(matched); fn=len(truth)-tp; fp=len(false)
    return {'groundTruth':len(truth),'predictions':len(predictions),'truePositives':tp,'falsePositives':fp,'falseNegatives':fn,'ignoredPredictions':len(ignored_predictions),'precision':tp/(tp+fp) if tp+fp else 0.0,'recall':tp/(tp+fn) if tp+fn else 0.0,'matches':[{'truth':j,'prediction':i,'iou':iou(truth[j],predictions[i])} for j,i in sorted(matched.items())],'falsePositiveIndices':false,'missedTruthIndices':[j for j in range(len(truth)) if j not in matched],'suspectedMerges':merged,'duplicatePredictions':sum(bool(pairs[i]) for i in false)}

def read_boxes(rows):
    return [row['xyxy'] if isinstance(row,dict) else row for row in rows]

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--manifest',required=True); ap.add_argument('--predictions',required=True); ap.add_argument('--output',required=True)
    args=ap.parse_args(); manifest_bytes=Path(args.manifest).read_bytes(); manifest=json.loads(manifest_bytes); pred=json.loads(Path(args.predictions).read_text())
    if manifest.get('status')!='frozen': raise ValueError('Validation manifest must be frozen before scoring.')
    by_id={row['id']:row for row in pred['images']}
    if len(by_id)!=len(pred['images']): raise ValueError('Duplicate prediction image identifiers')
    result={'model':pred.get('model','unknown'),'configuration':pred.get('config'), 'manifestSha256':hashlib.sha256(manifest_bytes).hexdigest(),'predictionsSha256':hashlib.sha256(Path(args.predictions).read_bytes()).hexdigest(),'iouThreshold':.5,'images':[],'limitation':'Small assistant-labeled validation set; training overlap unknown. This does not establish SKU identity or physical iPhone performance.'}
    for row in manifest['images']:
        if row['id'] not in by_id: raise ValueError('Missing predictions for '+row['id'])
        p=by_id[row['id']]
        if p['width']!=row['width'] or p['height']!=row['height']: raise ValueError('Coordinate size mismatch for '+row['id'])
        if hashlib.sha256(Path(row['path']).read_bytes()).hexdigest()!=row['sha256']: raise ValueError('Changed validation image '+row['id'])
        metrics=evaluate(read_boxes(row['boxes']),read_boxes(p['boxes']),read_boxes(row.get('ignore_boxes',[])))
        result['images'].append({'id':row['id'],**metrics})
    sums={key:sum(row[key] for row in result['images']) for key in ['groundTruth','predictions','truePositives','falsePositives','falseNegatives','ignoredPredictions','duplicatePredictions']}
    sums['precision']=sums['truePositives']/(sums['truePositives']+sums['falsePositives']) if sums['truePositives']+sums['falsePositives'] else 0
    sums['recall']=sums['truePositives']/sums['groundTruth'] if sums['groundTruth'] else 0
    sums['suspectedMerges']=sum(len(row['suspectedMerges']) for row in result['images'])
    result['totals']=sums
    result['provisionalAdvanceGatePassed']=sums['precision']>=.85 and sums['recall']>=.85 and all(row['precision']>=.75 and row['recall']>=.75 for row in result['images'])
    output=Path(args.output); output.parent.mkdir(parents=True,exist_ok=True); output.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'model':result['model'],'totals':sums,'provisionalAdvanceGatePassed':result['provisionalAdvanceGatePassed']}))
if __name__=='__main__': main()
