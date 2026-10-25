from pathlib import Path
import os,json
R=Path(__file__).resolve().parents[2];O=R/'artifacts/shelf-eval';M=O/'models';os.chdir(M)
os.environ['YOLO_CONFIG_DIR']=str(R/'.tools/shelf-eval-cache/ultralytics')
import torch
from ultralytics import YOLOE
torch.set_num_threads(4)
det=YOLOE('yoloe-11s.yaml').load(str(M/'yoloe-11s-seg.pt'));seg=YOLOE(str(M/'yoloe-11s-seg.pt'))
names=['cereal box','cookie package','cheese package','food box','food bag','food container','bottle','jar'];pe=seg.get_text_pe(names);seg.set_classes(names,pe);det.set_classes(names,pe);torch.manual_seed(0)
x=torch.rand(1,3,640,640)
with torch.inference_mode():
 a=det.model.eval()(x)[0];b=seg.model.eval()(x)[0][:,:4+len(names),:]
delta=float((a-b).abs().max());assert torch.allclose(a,b,rtol=1e-4,atol=1e-4),delta
result={'method':'same seeded synthetic RGB tensor; raw detection output compared before NMS; not shelf accuracy','detectionShape':list(a.shape),'maxAbsDifference':delta,'passed':True}
(O/'conversion-parity.json').write_text(json.dumps(result,indent=2)+'\n');print(result)
