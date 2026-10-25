from pathlib import Path
import json
R=Path(__file__).resolve().parents[2];O=R/'artifacts/shelf-eval'
labels=json.loads(Path(__file__).with_name('spotcheck-labels.json').read_text())
def iou(a,b):
 x=max(a[0],b[0]);y=max(a[1],b[1]);xx=min(a[2],b[2]);yy=min(a[3],b[3]);inter=max(0,xx-x)*max(0,yy-y)
 return inter/((a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-inter+1e-9)
rows=[]
configs=[('yoloe-packaging-.25',O/'results.json',lambda x:x['promptSet']=='packaging'),('yoloe-full-.1',O/'threshold-results.json',lambda x:x['mode']=='full' and x['confidence']==.1),('yoloe-tiled-.1',O/'threshold-results.json',lambda x:x['mode']=='four-tiles' and x['confidence']==.1),('yoloe-tiled-.05',O/'threshold-results.json',lambda x:x['mode']=='four-tiles' and x['confidence']==.05),('shelfset-640-.25',O/'shelfset-results.json',lambda x:x['size']==640)]
for name,path,predicate in configs:
 for r in json.loads(path.read_text()):
  if not predicate(r) or r['image'] not in labels['images']:continue
  gt=labels['images'][r['image']]['targets'];used=set();matched=[]
  for g in gt:
   cand=sorted([(iou(g,b['xyxy']),i) for i,b in enumerate(r['boxes']) if i not in used],reverse=True)
   if cand and cand[0][0]>=.5:used.add(cand[0][1]);matched.append(True)
   else:matched.append(False)
  row={'modelConfiguration':name,'image':r['image'],'matchedSelectedTargets':sum(matched),'selectedTargets':len(gt),'targetRecall':sum(matched)/len(gt),'matched':matched};rows.append(row);print(name,r['image'],sum(matched),'/',len(gt))
(O/'spotcheck-results.json').write_text(json.dumps({'protocol':labels['protocol'],'results':rows},indent=2)+'\n')
