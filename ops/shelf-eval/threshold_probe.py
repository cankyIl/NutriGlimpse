from pathlib import Path
import os,json,time
R=Path(__file__).resolve().parents[2];O=R/'artifacts/shelf-eval';M=O/'models'
os.environ['YOLO_CONFIG_DIR']=str(R/'.tools/shelf-eval-cache/ultralytics');Path(os.environ['YOLO_CONFIG_DIR']).mkdir(parents=True,exist_ok=True)
os.environ['MPLCONFIGDIR']=str(R/'.tools/shelf-eval-cache/matplotlib');os.chdir(M)
import torch,cv2
from PIL import Image,ImageOps,ImageDraw
from ultralytics import YOLOE
import numpy as np
torch.set_num_threads(4)
model=YOLOE(str(M/'packaging-prompted.pt'))
rows=[]
for p in sorted((O/'fixtures').glob('*.jpg')):
 im=ImageOps.exif_transpose(Image.open(p)).convert('RGB');im.thumbnail((1600,1600));w,h=im.size
 for mode in ['full','four-tiles']:
  tiles=[(0,0,w,h)] if mode=='full' else [(0,0,int(w*.6),int(h*.6)),(int(w*.4),0,w,int(h*.6)),(0,int(h*.4),int(w*.6),h),(int(w*.4),int(h*.4),w,h)]
  for conf in [.10,.05]:
   boxes=[];torch.cuda.synchronize();t=time.perf_counter()
   for x1,y1,x2,y2 in tiles:
    r=model.predict(np.asarray(im.crop((x1,y1,x2,y2)))[:,:,::-1].copy(),imgsz=640,conf=conf,iou=.5,agnostic_nms=True,max_det=300,device=0,rect=False,verbose=False)[0]
    for b in r.boxes:
     x,y,xx,yy=b.xyxy[0].cpu().tolist();boxes.append({'xyxy':[x+x1,y+y1,xx+x1,yy+y1],'confidence':float(b.conf),'label':model.names[int(b.cls)]})
   torch.cuda.synchronize();ms=(time.perf_counter()-t)*1000
   # NMS merge identical boxes from overlapping tiles.
   from torchvision.ops import nms
   keep=nms(torch.tensor([b['xyxy'] for b in boxes]).reshape(-1,4),torch.tensor([b['confidence'] for b in boxes]),.5).tolist() if boxes else []
   boxes=[boxes[i] for i in keep];d=O/('probe-'+mode+'-'+str(conf));d.mkdir(exist_ok=True)
   canvas=im.copy();draw=ImageDraw.Draw(canvas)
   for j,b in enumerate(boxes):
    draw.rectangle(b['xyxy'],outline='#00ee55',width=2);draw.text((b['xyxy'][0],b['xyxy'][1]),str(j+1),fill='red',stroke_width=1,stroke_fill='white')
   canvas.save(d/(p.stem+'.jpg'),quality=90)
   row={'image':p.stem,'mode':mode,'confidence':conf,'count':len(boxes),'onePassWallMs':ms,'boxes':boxes};rows.append(row)
   print(p.stem,mode,conf,len(boxes),round(ms,1),flush=True)
(O/'threshold-results.json').write_text(json.dumps(rows,indent=2)+'\n')
