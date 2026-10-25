"""No-training YOLOE shelf feasibility evaluation, NOT an accuracy certification."""
from pathlib import Path
import os,json,time,hashlib,statistics,platform
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/shelf-eval';MODELS=OUT/'models';MODELS.mkdir(exist_ok=True)
os.environ['YOLO_CONFIG_DIR']=str(ROOT/'.tools/shelf-eval-cache/ultralytics')
os.environ['TORCH_HOME']=str(ROOT/'.tools/shelf-eval-cache/torch')
os.environ['HF_HOME']=str(ROOT/'.tools/shelf-eval-cache/huggingface')
os.environ['MPLCONFIGDIR']=str(ROOT/'.tools/shelf-eval-cache/matplotlib')
for k in ['YOLO_CONFIG_DIR','TORCH_HOME','HF_HOME','MPLCONFIGDIR']:Path(os.environ[k]).mkdir(parents=True,exist_ok=True)
os.chdir(MODELS)
import torch,ultralytics,cv2,numpy as np
from PIL import Image,ImageOps,ImageDraw
from ultralytics import YOLOE
PROMPTS={
 'generic':['box','bag','bottle','jar','can','carton','tub','food package'],
 'packaging':['cereal box','cookie package','cheese package','food box','food bag','food container','bottle','jar'],
 'single':['packaged food product']}
weights=MODELS/'yoloe-11s-seg.pt'
assert hashlib.sha256(weights.read_bytes()).hexdigest()=='8e439445c87338b79d9ce21dec109f4621e26df67e94d26ea1a98c1e64dce3e3'
model=YOLOE('yoloe-11s.yaml').load(str(weights))
source=YOLOE(str(weights)).model.state_dict()
missing=[k for k,v in model.model.state_dict().items() if k not in source or source[k].shape!=v.shape]
assert not missing, f'Uninitialized detector parameters: {missing}'
print('All detection parameters sourced from pretrained checkpoint',flush=True)
torch.set_num_threads(4)
manifest={'model':'yoloe-11s-seg.pt','modelSource':'https://github.com/ultralytics/assets/releases/download/v8.3.0/yoloe-11s-seg.pt','modelSha256':hashlib.sha256(weights.read_bytes()).hexdigest(),'ultralytics':ultralytics.__version__,'torch':torch.__version__,'python':platform.python_version(),'device':torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'cpu','inputSize':640,'precision':'float32','configuration':'detection-only architecture loaded entirely from pretrained segmentation checkpoint; no training','confidence':0.25,'nmsIoU':0.5,'agnosticNms':True,'note':'Server measurements; no iPhone measurements. Four convenience-selected public photos; no held-out accuracy claim.'}
(OUT/'evaluation-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
images={}
for p in sorted((OUT/'fixtures').glob('*.jpg')):
 im=ImageOps.exif_transpose(Image.open(p)).convert('RGB');im.thumbnail((1600,1600))
 images[p.stem]=np.asarray(im)[:,:,::-1].copy()
rows=[]
for key,names in PROMPTS.items():
 print('PROMPTS',key,names,flush=True)
 model.set_classes(names,model.get_text_pe(names))
 d=OUT/key;d.mkdir(exist_ok=True)
 for iid,im in images.items():
  def predict():return model.predict(im,imgsz=640,conf=.25,iou=.5,agnostic_nms=True,max_det=300,device=0 if torch.cuda.is_available() else 'cpu',rect=False,verbose=False)[0]
  for _ in range(2):predict()
  timing=[]
  for _ in range(8):
   if torch.cuda.is_available():torch.cuda.synchronize()
   t=time.perf_counter();r=predict()
   if torch.cuda.is_available():torch.cuda.synchronize()
   timing.append((time.perf_counter()-t)*1000)
  boxes=[]
  canvas=Image.fromarray(im[:,:,::-1]);draw=ImageDraw.Draw(canvas)
  for j,b in enumerate(r.boxes):
   xy=[round(x,1) for x in b.xyxy[0].cpu().tolist()]; label=names[int(b.cls)];confidence=round(float(b.conf),4)
   boxes.append({'xyxy':xy,'label':label,'confidence':confidence})
   draw.rectangle(xy,outline='#00ee55',width=3);draw.text((xy[0]+2,xy[1]+2),str(j+1)+': '+label+' '+str(confidence),fill='#000000',stroke_width=1,stroke_fill='#ffff00')
  canvas.save(d/(iid+'.jpg'),quality=90)
  row={'promptSet':key,'image':iid,'width':im.shape[1],'height':im.shape[0],'detectedBoxes':len(boxes),'wallMs':timing,'medianWallMs':statistics.median(timing),'p95WallMs':float(np.percentile(timing,95)),'lastUltralyticsStageMs':r.speed,'boxes':boxes}
  (d/(iid+'.json')).write_text(json.dumps(row,indent=2)+'\n');rows.append(row)
  print(key,iid,len(boxes),'medianMs',round(row['medianWallMs'],1),flush=True)
 model.save(str(MODELS/(key+'-prompted.pt')))
(OUT/'results.json').write_text(json.dumps(rows,indent=2)+'\n')
print('DONE',flush=True)
