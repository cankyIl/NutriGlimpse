"""Export fixed packaging prompts for physical iPhone evaluation only."""
from pathlib import Path
import os,json,hashlib,shutil
R=Path(__file__).resolve().parents[2];O=R/'artifacts/shelf-eval';M=O/'models';os.chdir(M)
os.environ['YOLO_CONFIG_DIR']=str(R/'.tools/shelf-eval-cache/ultralytics')
os.environ['MPLCONFIGDIR']=str(R/'.tools/shelf-eval-cache/matplotlib')
import torch
from ultralytics import YOLOE
import coremltools as ct
torch.set_num_threads(4)
m=YOLOE(str(M/'packaging-prompted.pt'))
assert m.task=='detect'
m.save(str(M/'ShelfYOLOE.pt'))
m=YOLOE(str(M/'ShelfYOLOE.pt'))
path=m.export(format='coreml',imgsz=640,half=True,nms=True,batch=1,device='cpu',conf=.10,iou=.50)
model=ct.models.MLModel(path,skip_model_load=True)
spec=model.get_spec()
manifest={'modelName':'ShelfYOLOE','modelFingerprint':hashlib.sha256((M/'ShelfYOLOE.pt').read_bytes()).hexdigest(),'inputSize':640,'prompts':list(m.names.values()),'confidenceThreshold':.10,'iouThreshold':.50,'sourceCheckpoint':'yoloe-11s-seg.pt','sourceCheckpointSha256':hashlib.sha256((M/'yoloe-11s-seg.pt').read_bytes()).hexdigest(),'export':'detection-only fixed prompt CoreML FP16 weights with NMS','acceptance':'evaluation only; crowded shelf recall not yet acceptable; no physical iPhone timing recorded','coremltools':ct.__version__,'inputSpec':str(spec.description.input),'outputSpec':str(spec.description.output),'files':[]}
for p in sorted(Path(path).rglob('*')):
 if p.is_file():manifest['files'].append({'path':str(p.relative_to(Path(path))),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(M/'ShelfYOLOE.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({k:v for k,v in manifest.items() if k!='files'},indent=2))
