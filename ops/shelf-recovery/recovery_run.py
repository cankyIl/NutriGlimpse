"""Frozen no-training YOLOE + independent OCR + selective-crop experiment.
Text regions remain evidence, never verified package/SKU detections.
"""
from pathlib import Path
import os,json,time,hashlib,argparse,statistics,re
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/shelf-recovery/yoloe';OUT.mkdir(parents=True,exist_ok=True)
for key,sub in [('YOLO_CONFIG_DIR','ultralytics'),('MPLCONFIGDIR','matplotlib')]:
 os.environ[key]=str(ROOT/'.tools/shelf-eval-cache'/sub);Path(os.environ[key]).mkdir(parents=True,exist_ok=True)
import torch,numpy as np,cv2,rapidocr_onnxruntime,onnxruntime,ultralytics
from rapidocr_onnxruntime import RapidOCR
from ultralytics import YOLOE
from PIL import Image,ImageOps,ImageDraw
from torchvision.ops import nms
POLICY={'version':'recovery-v1','baseImageMaxSide':1600,'yoloInputSize':640,'confidence':0.10,'iou':0.50,'maxDetections':300,'ocrMaxSide':2048,'ocrDetectorMaxSide':1920,'ocrTextConfidence':0.80,'ocrCpuThreads':4,'maximumCrops':8,'cropWidthFraction':.40,'cropHeightFraction':.40,'cropMaximumPairwiseIoU':.30,'cropEdgeExclusionPixels':2,'textProposalRule':'at least3 ASCII letters; confidence>=.80; textwidth<=.35 framewidth; no price-only tokens; prioritize outside fullframeYOLO boxes then confidence*sqrt(textarea); no package whitelist','coordinateSystem':'EXIF-oriented original image pixel xyxy; text quadrilaterals have enclosing xyxy','exactIdentityStatus':'not tested; OCR is literal evidence only'}
POLICY_SHA=hashlib.sha256(json.dumps(POLICY,sort_keys=True).encode()).hexdigest()
def iou(a,b):
 inter=max(0,min(a[2],b[2])-max(a[0],b[0]))*max(0,min(a[3],b[3])-max(a[1],b[1]))
 return inter/((a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-inter+1e-9)
def inside(point,b):return b[0]<=point[0]<=b[2] and b[1]<=point[1]<=b[3]
def synchronize():
 if torch.cuda.is_available():torch.cuda.synchronize()
def run_detector(model,im):
 arr=np.asarray(im)[:,:,::-1].copy();synchronize();t=time.perf_counter()
 r=model.predict(arr,imgsz=640,conf=.10,iou=.50,agnostic_nms=True,max_det=300,device=0 if torch.cuda.is_available() else 'cpu',rect=False,verbose=False)[0]
 synchronize();ms=(time.perf_counter()-t)*1000
 return [{'xyxy':b.xyxy[0].cpu().tolist(),'confidence':float(b.conf),'label':model.names[int(b.cls)]} for b in r.boxes],ms

def select_crops(texts,baseline,w,h):
 anchors=[]
 for idx,t in enumerate(texts):
  b=t['xyxy'];cx=(b[0]+b[2])/2;cy=(b[1]+b[3])/2
  t['outsideBaselineBoxes']=not any(inside((cx,cy),p['xyxy']) for p in baseline)
  t['eligibleAnchor']=t['confidence']>=.80 and len(re.findall('[A-Za-z]',t['text']))>=3 and b[2]-b[0]<=.35*w
  if not t['eligibleAnchor']:continue
  score=t['confidence']*max(0,(b[2]-b[0])*(b[3]-b[1]))**.5
  anchors.append((not t['outsideBaselineBoxes'],-score,idx,cx,cy))
 crops=[];cw=.40*w;ch=.40*h
 for _,score,idx,cx,cy in sorted(anchors):
  x=max(0,min(w-cw,cx-cw/2));y=max(0,min(h-ch,cy-ch/2));b=[int(x),int(y),int(x+cw),int(y+ch)]
  if any(iou(b,c['xyxy'])>.30 for c in crops):continue
  crops.append({'xyxy':b,'anchorTextIndex':idx,'anchorText':texts[idx]['text'],'outsideBaseline':texts[idx]['outsideBaselineBoxes']})
  if len(crops)>=8:break
 return crops

def overlay(im,boxes,path,color='#00ee55',numbers=True):
 canvas=im.copy();canvas.thumbnail((1600,1600));sx=canvas.width/im.width;sy=canvas.height/im.height;draw=ImageDraw.Draw(canvas)
 for j,b in enumerate(boxes):
  xy=[b['xyxy'][0]*sx,b['xyxy'][1]*sy,b['xyxy'][2]*sx,b['xyxy'][3]*sy];draw.rectangle(xy,outline=color,width=2)
  if numbers:draw.text((xy[0],xy[1]),str(j+1),fill='black',stroke_width=1,stroke_fill='white')
 canvas.save(path,quality=90)

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--manifest');ap.add_argument('--split',default='original');a=ap.parse_args()
 if a.manifest:
  manifest_path=Path(a.manifest);raw=manifest_path.read_bytes();m=json.loads(raw);fixtures=m['images'];manifest_sha=hashlib.sha256(raw).hexdigest()
 else:
  fixtures=[{'id':p.stem,'path':str(p)} for p in sorted((ROOT/'artifacts/shelf-eval/fixtures').glob('*.jpg'))];manifest_sha=None
 out=OUT/a.split;out.mkdir(exist_ok=True)
 modelpath=ROOT/'artifacts/shelf-eval/models/packaging-prompted.pt'
 model=YOLOE(str(modelpath));torch.set_num_threads(4)
 ocr=RapidOCR(intra_op_num_threads=4,inter_op_num_threads=1,max_side_len=2048,det_limit_side_len=1920,det_limit_type='max',text_score=.50,det_use_cuda=False,cls_use_cuda=False,rec_use_cuda=False)
 hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (Path(rapidocr_onnxruntime.__file__).parent/'models').glob('*.onnx')}
 metadata={'policy':POLICY,'policySha256':POLICY_SHA,'fixtureManifestSha256':manifest_sha,'sourceModelSha256':hashlib.sha256(modelpath.read_bytes()).hexdigest(),'ultralytics':ultralytics.__version__,'torch':torch.__version__,'ocrPackage':'rapidocr-onnxruntime==1.4.4','onnxruntime':onnxruntime.__version__,'ocrModelHashes':hashes,'gpu':torch.cuda.get_device_name(0) if torch.cuda.is_available() else None,'status':'diagnostic server experiment; not phone performance or SKU validation'}
 (out/'manifest.json').write_text(json.dumps(metadata,indent=2)+'\n')
 run_detector(model,Image.new('RGB',(640,640),(114,114,114)))
 rows=[]
 for f in fixtures:
  path=Path(f['path']);path=path if path.is_absolute() else ROOT/path
  original=ImageOps.exif_transpose(Image.open(path)).convert('RGB');w,h=original.size
  t=time.perf_counter();base=original.copy();base.thumbnail((1600,1600));baseline,base_ms=run_detector(model,base)
  for b in baseline:b['xyxy']=[b['xyxy'][0]*w/base.width,b['xyxy'][1]*h/base.height,b['xyxy'][2]*w/base.width,b['xyxy'][3]*h/base.height];b['source']='fullframe'
  ocr_start=time.perf_counter();raw,stage_times=ocr(np.asarray(original)[:,:,::-1].copy());ocr_ms=(time.perf_counter()-ocr_start)*1000
  texts=[]
  for poly,text,conf in raw or []:
   poly=np.asarray(poly).tolist();xx=[v[0] for v in poly];yy=[v[1] for v in poly];texts.append({'text':text,'confidence':float(conf),'polygon':poly,'xyxy':[min(xx),min(yy),max(xx),max(yy)]})
  selected=select_crops(texts,baseline,w,h);crop_predictions=[];crop_ms=[]
  for ci,c in enumerate(selected):
   x,y,xx,yy=c['xyxy'];cropped=original.crop((x,y,xx,yy));boxes,ms=run_detector(model,cropped);crop_ms.append(ms)
   for b in boxes:
    bx,by,bxx,byy=b['xyxy'];edge=(x>0 and bx<=2) or(y>0 and by<=2)or(xx<w and bxx>=cropped.width-2)or(yy<h and byy>=cropped.height-2)
    b['xyxy']=[bx+x,by+y,bxx+x,byy+y];b['source']='ocr-selected-crop';b['cropIndex']=ci;b['touchesInteriorCropEdge']=edge;crop_predictions.append(b)
  candidates=baseline+[b for b in crop_predictions if not b['touchesInteriorCropEdge']]
  keep=nms(torch.tensor([b['xyxy'] for b in candidates],dtype=torch.float32).reshape(-1,4),torch.tensor([b['confidence'] for b in candidates]),.50).tolist() if candidates else []
  union=[candidates[k] for k in keep];total_ms=(time.perf_counter()-t)*1000
  row={'image':f['id'],'imagePath':str(path),'imageSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'width':w,'height':h,'policySha256':POLICY_SHA,'baselineBoxes':baseline,'ocrTextEvidence':texts,'ocrCandidateRegions':selected,'cropBoxes':crop_predictions,'recoveryBoxes':union,'timing':{'baselinePredictMs':base_ms,'fullFrameOcrCpuMs':ocr_ms,'ocrStageSeconds':stage_times,'cropPredictMs':crop_ms,'pipelineWallMs':total_ms},'counts':{'baselineBoxes':len(baseline),'ocrTextLines':len(texts),'ocrAnchors':sum(t['eligibleAnchor'] for t in texts),'ocrAnchorsOutsideBaseline':sum(t['eligibleAnchor'] and t['outsideBaselineBoxes'] for t in texts),'crops':len(selected),'recoveryBoxes':len(union)},'identity':'no exact product or SKU confirmed'}
  (out/(f['id']+'.json')).write_text(json.dumps(row,indent=2)+'\n')
  overlay(original,baseline,out/(f['id']+'-baseline.jpg'));overlay(original,texts,out/(f['id']+'-ocr.jpg'),'#00aaff');overlay(original,selected,out/(f['id']+'-crops.jpg'),'#ffaa00');overlay(original,union,out/(f['id']+'-recovery.jpg'))
  rows.append(row);print(f['id'],row['counts'],{k:round(v,1) for k,v in row['timing'].items() if isinstance(v,float)},flush=True)
 (out/'results.json').write_text(json.dumps(rows,indent=2)+'\n')
if __name__=='__main__':main()
