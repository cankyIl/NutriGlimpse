"""Fixed-config compact pretrained shelf replacement evaluation. No training."""
from pathlib import Path
import argparse,os,json,hashlib,time,statistics,math,platform
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/shelf-recovery/replacements'
os.environ['YOLO_CONFIG_DIR']=str(OUT/'cache/ultralytics')
os.environ['MPLCONFIGDIR']=str(OUT/'cache/matplotlib')
import numpy as np,torch,ultralytics
from PIL import Image,ImageOps,ImageDraw
from ultralytics import YOLO
from torchvision.ops import nms

def main():
 parser=argparse.ArgumentParser()
 parser.add_argument('--model',choices=['shelfset','sku110k-yolo11s'],required=True)
 parser.add_argument('--split',choices=['original','validation'],required=True)
 parser.add_argument('--manifest',type=Path,default=ROOT/'artifacts/shelf-recovery/validation/manifest.json')
 args=parser.parse_args()
 if args.model=='shelfset':
  modelpath=ROOT/'artifacts/shelf-eval/models/shelfset/shelf_server.pt'
 else:modelpath=OUT/'models/sku110k-yolo11s/sku110k-yolo11-s640.pt'
 if args.split=='original':
  entries=[{'id':p.stem,'path':str(p)} for p in sorted((ROOT/'artifacts/shelf-eval/fixtures').glob('*.jpg'))]
 else:
  manifest=json.loads(args.manifest.read_text());entries=manifest['images']+manifest.get('qualitativeImages',[])
 torch.set_num_threads(4)
 m=YOLO(str(modelpath))
 config={'imgsz':640,'conf':.25,'iou':.5,'max_det':300,'rect':False,'agnostic_nms':True,'device':0,'half':False,'commonPostNmsIou':.5,'timingScope':'model.predict plus GPU synchronization, excludes image loading, overlay drawing and common post-NMS','warmups':2,'timedIterations':8,'preprocessing':'EXIF orientation, RGB then BGR; original split longest edge <=1600; validation final image unchanged; Ultralytics square letterbox to640'}
 result={'model':args.model,'modelPath':str(modelpath),'modelSha256':hashlib.sha256(modelpath.read_bytes()).hexdigest(),'config':config,'ultralytics':ultralytics.__version__,'torch':torch.__version__,'python':platform.python_version(),'device':torch.cuda.get_device_name(0),'iphoneVerified':False,'images':[]}
 if args.split=='validation':result['validationManifestSha256']=hashlib.sha256(args.manifest.read_bytes()).hexdigest()
 dest=OUT/f'{args.model}-{args.split}';dest.mkdir(parents=True,exist_ok=True)
 for entry in entries:
  p=Path(entry['path']);p=p if p.is_absolute() else ROOT/p
  im=ImageOps.exif_transpose(Image.open(p)).convert('RGB')
  if args.split=='original':im.thumbnail((1600,1600))
  arr=np.asarray(im)[:,:,::-1].copy();times=[]
  for i in range(10):
   torch.cuda.synchronize();start=time.perf_counter()
   prediction=m.predict(arr,imgsz=640,conf=.25,iou=.5,max_det=300,rect=False,agnostic_nms=True,device=0,half=False,verbose=False)[0]
   torch.cuda.synchronize()
   if i>=2:times.append((time.perf_counter()-start)*1000)
  boxes=[{'xyxy':[float(v) for v in b.xyxy[0].cpu().tolist()],'confidence':float(b.conf),'classId':int(b.cls)} for b in prediction.boxes]
  raw_count=len(boxes)
  if boxes:
   keep=nms(torch.tensor([b['xyxy'] for b in boxes]),torch.tensor([b['confidence'] for b in boxes]),.5).tolist()
   boxes=[boxes[i] for i in keep]
  canvas=im.copy();draw=ImageDraw.Draw(canvas)
  for i,b in enumerate(boxes):
   draw.rectangle(b['xyxy'],outline='#00dd55',width=2)
   draw.text((b['xyxy'][0],b['xyxy'][1]),str(i+1),fill='red',stroke_width=1,stroke_fill='white')
  canvas.save(dest/(entry['id']+'.jpg'),quality=92)
  row={'id':entry['id'],'sourcePath':str(p),'sourceSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'width':im.width,'height':im.height,'boxes':boxes,'count':len(boxes),'rawCountBeforeCommonPostNms':raw_count,'medianWallMs':statistics.median(times),'p95WallMs':sorted(times)[math.ceil(.95*len(times))-1],'iterationsMs':times}
  result['images'].append(row);print(args.model,args.split,entry['id'],len(boxes),round(row['medianWallMs'],2),flush=True)
 (OUT/f'{args.model}-{args.split}.json').write_text(json.dumps(result,indent=2)+'\n')
if __name__=='__main__':main()
