"""Preserve ShelfSet YOLO26 end-to-end head and wrap into Vision NMS outputs.
Diagnostic export only. Linux cannot validate CoreML execution or iPhone speed.
"""
from pathlib import Path
import os,json,hashlib,copy,platform
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/shelf-recovery/replacements'
os.environ['YOLO_CONFIG_DIR']=str(OUT/'cache/ultralytics')
os.environ['MPLCONFIGDIR']=str(OUT/'cache/matplotlib')
import torch,numpy as np,ultralytics,coremltools as ct
from PIL import Image,ImageOps
from torchvision.ops import nms
from ultralytics import YOLO
from ultralytics.data.augment import LetterBox
from ultralytics.utils.export.coreml import pipeline_coreml

def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()

class VisionAdapter(torch.nn.Module):
 def __init__(self,detector):
  super().__init__();self.detector=detector
 def forward(self,x):
  raw=self.detector(x)
  if isinstance(raw,tuple):raw=raw[0]
  xyxy=raw[0,:,:4]
  coordinates=torch.cat(((xyxy[:,:2]+xyxy[:,2:])/2,xyxy[:,2:]-xyxy[:,:2]),dim=1)/640.0
  return torch.nn.functional.pad(raw[0,:,4:5],(0,79,0,0),'constant',0),coordinates

def decode(confidence,coords):
 xyxy=torch.cat((coords[:,:2]-coords[:,2:]/2,coords[:,:2]+coords[:,2:]/2),dim=1)*640
 scores=confidence[:,0];mask=scores>=.25;xyxy=xyxy[mask];scores=scores[mask]
 keep=nms(xyxy,scores,.5)
 return xyxy[keep],scores[keep]

def main():
 torch.set_num_threads(4)
 source=ROOT/'artifacts/shelf-eval/models/shelfset/shelf_server.pt'
 out=OUT/'coreml';out.mkdir(parents=True,exist_ok=True)
 model=YOLO(str(source));detector=model.model.float().eval()
 assert detector.end2end
 head=detector.model[-1];head.export=True;head.format='coreml';head.dynamic=False;head.max_det=300
 adapter=VisionAdapter(detector).eval()
 parity=[]
 with torch.inference_mode():
  for p in sorted((ROOT/'artifacts/shelf-eval/fixtures').glob('*.jpg')):
   im=ImageOps.exif_transpose(Image.open(p)).convert('RGB');im.thumbnail((1600,1600))
   a=np.asarray(im)[:,:,::-1].copy();a=LetterBox(new_shape=(640,640),auto=False)(image=a)
   x=torch.from_numpy(a[:,:,::-1].transpose(2,0,1).copy()).unsqueeze(0).float()/255
   raw=detector(x)
   if isinstance(raw,tuple):raw=raw[0]
   confidence,coords=adapter(x)
   reconstructed=torch.cat((coords[:,:2]-coords[:,2:]/2,coords[:,:2]+coords[:,2:]/2),1)*640
   error=float((reconstructed-raw[0,:,:4]).abs().max())
   confidence_error=float((confidence[:,0]-raw[0,:,4]).abs().max())
   assert error<=.0002 and confidence_error==0
   assert confidence.shape==(300,80) and coords.shape==(300,4)
   assert torch.count_nonzero(confidence[:,1:])==0
   xyxy,scores=decode(confidence,coords)
   mask=raw[0,:,4]>=.25;ref=raw[0][mask];idx=nms(ref[:,:4],ref[:,4],.5);ref=ref[idx]
   assert len(ref)==len(xyxy)
   assert torch.allclose(ref[:,:4],xyxy,atol=.0002,rtol=0)
   parity.append({'id':p.stem,'retainedDetections':len(xyxy),'maxCoordinateReconstructionErrorPx':error,'maxConfidenceError':confidence_error,'passed':True})
 x=torch.zeros(1,3,640,640)
 with torch.inference_mode():adapter(x);adapter(x)
 traced=torch.jit.trace(adapter,x,strict=False)
 raw_model=ct.convert(traced,inputs=[ct.ImageType(name='image',shape=x.shape,scale=1/255,bias=[0,0,0])],outputs=[ct.TensorType(name='rawConfidence'),ct.TensorType(name='rawCoordinates')],convert_to='mlprogram',skip_model_load=True)
 wrapped=pipeline_coreml(raw_model,(1,5,300),metadata={'names':{0:'product',**{i:f'__padding_{i}' for i in range(1,80)}}},weights_dir=raw_model.weights_dir,iou=.5,conf=.25,agnostic_nms=True)
 wrapped.short_description='ShelfSet pretrained detector: research diagnostic only; iPhone execution unverified'
 wrapped.author='ShelfSet LLC / Data Science UA; Vision adapter by this project'
 wrapped.license='Upstream repository MIT claim; Ultralytics and training-image rights require separate review before distribution'
 wrapped.user_defined_metadata.update({'source_checkpoint_sha256':digest(source),'classes':'product','input_size':'640','preserved_end2end_head':'true','zero_padding_columns':'79','confidence_threshold':'.25','iou_threshold':'.5','deployment_status':'diagnostic evaluation only; no physical device runtime verification'})
 destination=out/'ShelfSetDiagnostic.mlpackage'
 wrapped.save(str(destination));spec=wrapped.get_spec()
 manifest={'modelName':'ShelfSetDiagnostic','modelFingerprint':digest(source),'sourceCheckpointSha256':digest(source),'sourceCheckpoint':str(source),'sourceRepository':'https://github.com/ShelfSet/shelf-object-detector','sourceRevision':'b1dfbd2f67e38a0ead05d0b653c675569ef8a02a','inputSize':640,'prompts':['product'],'trueClassCount':1,'scoreColumnCount':80,'zeroPaddingClassLabels':[f'__padding_{i}' for i in range(1,80)],'confidenceThreshold':.25,'iouThreshold':.5,'export':'Preserved YOLO26 end-to-end head; 300 candidate detections; image input; FP16 CoreML MLProgram; normalized center XYWH coordinates, class-agnostic CoreML NMS and79zero padding score columns per Ultralytics issue22309','coremltools':ct.__version__,'ultralytics':ultralytics.__version__,'torch':torch.__version__,'python':platform.python_version(),'inputSpec':str(spec.description.input),'outputSpec':str(spec.description.output),'pytorchAdapterParity':parity,'coremlRuntimeVerified':False,'iphoneVerified':False,'accuracyAccepted':False,'licenseStatus':'Research comparison only; upstream code/model and scraped training data rights unresolved for distribution','files':[]}
 for p in sorted(destination.rglob('*')):
  if p.is_file():manifest['files'].append({'path':str(p.relative_to(destination)),'bytes':p.stat().st_size,'sha256':digest(p)})
 (out/'ShelfSetDiagnostic.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print(json.dumps({'path':str(destination),'sizeBytes':sum(p['bytes'] for p in manifest['files']),'coremltools':ct.__version__,'parity':parity,'runtimeVerified':False},indent=2))
if __name__=='__main__':main()
