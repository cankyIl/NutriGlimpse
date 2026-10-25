from pathlib import Path
import os,json,time,statistics
R=Path(__file__).resolve().parents[2];O=R/'artifacts/shelf-eval';M=O/'models/shelfset'
os.environ['YOLO_CONFIG_DIR']=str(R/'.tools/shelf-eval-cache/ultralytics');os.environ['MPLCONFIGDIR']=str(R/'.tools/shelf-eval-cache/matplotlib')
import torch,numpy as np,ultralytics
from PIL import Image,ImageOps,ImageDraw
from ultralytics import YOLO
torch.set_num_threads(4);model=YOLO(str(M/'shelf_server.pt'));rows=[]
for size in [640,1280]:
 d=O/('shelfset-'+str(size));d.mkdir(exist_ok=True)
 for p in sorted((O/'fixtures').glob('*.jpg')):
  im=ImageOps.exif_transpose(Image.open(p)).convert('RGB');im.thumbnail((1600,1600));arr=np.asarray(im)[:,:,::-1].copy();times=[]
  for i in range(10):
   torch.cuda.synchronize();t=time.perf_counter();r=model.predict(arr,imgsz=size,conf=.25,device=0,rect=False,verbose=False,max_det=300)[0];torch.cuda.synchronize()
   if i>=2:times.append((time.perf_counter()-t)*1000)
  boxes=[{'xyxy':b.xyxy[0].cpu().tolist(),'confidence':float(b.conf)} for b in r.boxes]
  canvas=im.copy();draw=ImageDraw.Draw(canvas)
  for j,b in enumerate(boxes):draw.rectangle(b['xyxy'],outline='#00ee55',width=2);draw.text((b['xyxy'][0],b['xyxy'][1]),str(j+1),fill='red',stroke_width=1,stroke_fill='white')
  canvas.save(d/(p.stem+'.jpg'),quality=90)
  row={'model':'ShelfSet pretrained YOLO26s','image':p.stem,'size':size,'count':len(boxes),'medianWallMs':statistics.median(times),'p95WallMs':float(np.percentile(times,95)),'times':times,'boxes':boxes,'ultralytics':ultralytics.__version__};rows.append(row)
  print(p.stem,size,len(boxes),round(row['medianWallMs'],1),flush=True)
(O/'shelfset-results.json').write_text(json.dumps(rows,indent=2)+'\n')
