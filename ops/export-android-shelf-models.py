from pathlib import Path
import json,os,hashlib,time
R=Path(__file__).resolve().parents[1]
O=R/'artifacts/remote/android-shelf';O.mkdir(parents=True,exist_ok=True)
A=R/'apps/mobile/modules/shelf-benchmark/android/src/main/assets';A.mkdir(parents=True,exist_ok=True)
os.environ['YOLO_CONFIG_DIR']=str(R/'.tools/shelf-eval-cache/ultralytics')
os.environ['MPLCONFIGDIR']=str(R/'.tools/shelf-eval-cache/matplotlib')
import sys
sys.path.insert(0,str(R/'.tools/shelf-eval-venv/compare-libs'))
import torch,numpy as np,onnx,onnxruntime as ort,ultralytics
assert ultralytics.__version__=='8.4.64', 'Use pinned exporter; YOLO26 head must be preserved'
from PIL import Image,ImageOps
from ultralytics import YOLO
from torchvision.ops import nms
torch.set_num_threads(2)
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
class Adapter(torch.nn.Module):
 def __init__(self,model,end2end):super().__init__();self.model=model;self.end2end=end2end
 def forward(self,x):
  y=self.model(x)
  if isinstance(y,tuple):y=y[0]
  if self.end2end:return y[0,:,:5]
  y=y[0].transpose(0,1)
  return torch.cat((y[:,:2]-y[:,2:4]/2,y[:,:2]+y[:,2:4]/2,y[:,4:5]),1)
def tensor(path):
 im=ImageOps.exif_transpose(Image.open(path)).convert('RGB')
 w,h=im.size;ratio=min(640/w,640/h);nw,nh=round(w*ratio),round(h*ratio)
 canvas=Image.new('RGB',(640,640),(114,114,114));canvas.paste(im.resize((nw,nh),Image.Resampling.BILINEAR),((640-nw)//2,(640-nh)//2))
 return torch.from_numpy(np.asarray(canvas).copy().transpose(2,0,1)).unsqueeze(0).float()/255
def kept(data):
 rows=torch.as_tensor(data);rows=rows[rows[:,4]>=.25]
 return rows[nms(rows[:,:4],rows[:,4],.5)[:96]].numpy()
results=[]
for name,source in [('shelfset',R/'artifacts/shelf-eval/models/shelfset/shelf_server.pt'),('sku110k',R/'artifacts/shelf-recovery/replacements/models/sku110k-yolo11s/sku110k-yolo11-s640.pt')]:
 model=YOLO(str(source)).model.float().eval();head=model.model[-1];head.export=True;head.format='onnx';head.dynamic=False;head.max_det=300
 adapter=Adapter(model,model.end2end).eval();x=torch.zeros(1,3,640,640)
 target=A/(name+'.onnx')
 with torch.inference_mode():adapter(x);adapter(x)
 torch.onnx.export(adapter,x,str(target),opset_version=17,input_names=['image'],output_names=['boxes'],dynamo=False)
 onnx.checker.check_model(onnx.load(str(target)))
 options=ort.SessionOptions();options.intra_op_num_threads=2;options.inter_op_num_threads=1
 session=ort.InferenceSession(str(target),sess_options=options,providers=['CPUExecutionProvider'])
 checks=[]
 for fixture in sorted((R/'artifacts/shelf-eval/fixtures').glob('*.jpg')):
  data=tensor(fixture)
  with torch.inference_mode():expected=adapter(data).numpy()
  actual=session.run(None,{'image':data.numpy()})[0]
  expectedKept=kept(expected);actualKept=kept(actual)
  assert expected.shape==actual.shape and np.isfinite(actual).all()
  assert np.max(np.abs(expected[:,4]-actual[:,4]))<.0001
  print(json.dumps({'fixture':fixture.name,'expectedBoxes':len(expectedKept),'actualBoxes':len(actualKept),'allCoordinateError':float(np.max(np.abs(expected[:,:4]-actual[:,:4]))),'keptCoordinateError':float(np.max(np.abs(expectedKept[:,:4]-actualKept[:,:4]))) if expectedKept.shape==actualKept.shape and len(expectedKept) else None}),flush=True)
  assert expectedKept.shape==actualKept.shape and (not len(expectedKept) or np.max(np.abs(expectedKept[:,:4]-actualKept[:,:4]))<.05)
  assert len(expectedKept)==len(actualKept)
  checks.append({'fixture':fixture.name,'boxes':len(actualKept),'retainedCoordinateError':float(np.max(np.abs(expectedKept[:,:4]-actualKept[:,:4]))) if len(expectedKept) else 0,'discardedRowOrderMayDiffer':True,'maxScoreError':float(np.max(np.abs(expected[:,4]-actual[:,4])))})
 manifest={'modelId':name,'sha256':sha(target),'sourceSha256':sha(source),'bytes':target.stat().st_size,'inputSize':640,'inputShape':[1,3,640,640],'output':'N x 5: x1,y1,x2,y2,score in letterboxed pixels','confidence':.25,'iou':.5,'maxBoxes':96,'torch':torch.__version__,'onnx':onnx.__version__,'onnxruntime':ort.__version__,'diagnosticOnly':True,'distributionApproved':False,'deviceVerified':False,'parity':checks}
 (A/(name+'.json')).write_text(json.dumps(manifest,indent=2))
 results.append(manifest)
 print(json.dumps({'model':name,'bytes':manifest['bytes'],'fixtures':len(checks),'parity':'passed'}),flush=True)
(O/'export-parity.json').write_text(json.dumps(results,indent=2))
