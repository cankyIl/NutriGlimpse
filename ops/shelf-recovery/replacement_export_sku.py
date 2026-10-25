"""Export pretrained SKU110K YOLO11s with upstream CoreML 80-score-column workaround.
This creates a research diagnostic only, not evidence of iPhone execution.
"""
from pathlib import Path
import os,json,hashlib,platform
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'artifacts/shelf-recovery/replacements'
os.environ['YOLO_CONFIG_DIR']=str(OUT/'cache/ultralytics');os.environ['MPLCONFIGDIR']=str(OUT/'cache/matplotlib')
import torch,numpy as np,ultralytics,coremltools as ct
from PIL import Image,ImageOps
from torchvision.ops import nms
from ultralytics import YOLO
from ultralytics.data.augment import LetterBox
from ultralytics.utils.export.coreml import IOSDetectModel,pipeline_coreml

def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def get_tensor(p):
 im=ImageOps.exif_transpose(Image.open(p)).convert('RGB');im.thumbnail((1600,1600))
 a=LetterBox(new_shape=(640,640),auto=False)(image=np.asarray(im)[:,:,::-1].copy())
 return torch.from_numpy(a[:,:,::-1].transpose(2,0,1).copy()).unsqueeze(0).float()/255

def main():
 torch.set_num_threads(4)
 source=OUT/'models/sku110k-yolo11s/sku110k-yolo11-s640.pt';out=OUT/'coreml';out.mkdir(parents=True,exist_ok=True)
 model=YOLO(str(source));detector=model.model.float().eval();assert not detector.end2end
 head=detector.model[-1];head.export=True;head.format='coreml';head.dynamic=False;head.max_det=300
 x=torch.zeros(1,3,640,640);adapter=IOSDetectModel(detector,x,mlprogram=True).eval();parity=[];inputs=[]
 with torch.inference_mode():
  for p in sorted((ROOT/'artifacts/shelf-eval/fixtures').glob('*.jpg')):
   a=get_tensor(p);inputs.append((p.stem,a));raw=detector(a)[0].transpose(0,1);conf,coords=adapter(a)
   assert conf.shape==(8400,80) and coords.shape==(8400,4)
   assert torch.count_nonzero(conf[:,1:])==0
   ce=float((coords*640-raw[:,:4]).abs().max());se=float((conf[:,0]-raw[:,4]).abs().max())
   assert ce<=.0002 and se==0
   xyxy=torch.cat((coords[:,:2]-coords[:,2:]/2,coords[:,:2]+coords[:,2:]/2),1)*640
   mask=conf[:,0]>=.25;scores=conf[mask,0];boxes=xyxy[mask];keep=nms(boxes,scores,.5)[:300]
   parity.append({'id':p.stem,'retainedDetections':len(keep),'maxCoordinateReconstructionErrorPx':ce,'maxConfidenceError':se,'paddingColumnsExactlyZero':True})
  adapter(x);adapter(x)
 traced=torch.jit.trace(adapter,x,strict=False)
 with torch.inference_mode():
  for row,(_,a) in zip(parity,inputs):
   ac,ab=adapter(a);tc,tb=traced(a)
   row['maxTracedConfidenceError']=float((ac-tc).abs().max());row['maxTracedCoordinateError']=float((ab-tb).abs().max())
   assert torch.allclose(ac,tc,atol=1e-6,rtol=1e-5) and torch.allclose(ab,tb,atol=1e-6,rtol=1e-5)
   row['passed']=True
 raw_model=ct.convert(traced,inputs=[ct.ImageType(name='image',shape=x.shape,scale=1/255,bias=[0,0,0])],outputs=[ct.TensorType(name='rawConfidence'),ct.TensorType(name='rawCoordinates')],convert_to='mlprogram',skip_model_load=True)
 labels={0:'product',**{i:f'__padding_{i}' for i in range(1,80)}}
 wrapped=pipeline_coreml(raw_model,(1,5,8400),metadata={'names':labels},weights_dir=raw_model.weights_dir,iou=.5,conf=.25,agnostic_nms=True)
 wrapped.short_description='SKU110K YOLO11s: academic/non-commercial diagnostic; device execution unverified'
 wrapped.author='chistopat; Ultralytics export; this project diagnostic packaging'
 wrapped.license='Research/academic/non-commercial SKU110K dataset terms; upstream Ultralytics license; not cleared for commercial distribution'
 wrapped.user_defined_metadata.update({'source_checkpoint_sha256':digest(source),'classes':str(labels),'input_size':'640','true_class_count':'1','zero_padding_columns':'79','confidence_threshold':'.25','iou_threshold':'.5','deployment_status':'Research diagnostic only; device verification pending'})
 destination=out/'ShelfSKU11Diagnostic.mlpackage';wrapped.save(str(destination));s=wrapped.get_spec();n=s.pipeline.models[-1].nonMaximumSuppression
 assert [a.name for a in s.description.input]==['image','iouThreshold','confidenceThreshold']
 assert [a.name for a in s.description.output]==['confidence','coordinates']
 assert len(n.stringClassLabels.vector)==80 and not n.pickTop.perClass and n.confidenceThreshold==.25 and n.iouThreshold==.5
 manifest={'modelName':'ShelfSKU11Diagnostic','modelFingerprint':digest(source),'sourceCheckpointSha256':digest(source),'sourceCheckpoint':str(source),'sourceRepository':'https://huggingface.co/chistopat/sku110k-yolo11-object-detector','sourceRevision':'ee1b8ac34eb3b68969ffa8165e50c43457fe4e35','inputSize':640,'prompts':['product'],'trueClassCount':1,'scoreColumnCount':80,'zeroPaddingClassLabels':list(labels.values())[1:],'confidenceThreshold':.25,'iouThreshold':.5,'agnosticNmsIouThreshold':.5,'export':'YOLO11s fixed single class; FP16 CoreML MLProgram, normalized center XYWH, class-agnostic NMS;79 zero-score columns per Ultralytics CoreML issue22309 workaround','coremltools':ct.__version__,'ultralytics':ultralytics.__version__,'torch':torch.__version__,'python':platform.python_version(),'inputSpec':str(s.description.input),'outputSpec':str(s.description.output),'pytorchAdapterParity':parity,'coremlRuntimeVerified':False,'iphoneVerified':False,'licenseStatus':'Academic/non-commercial research diagnostic only; not cleared for commercial distribution','files':[]}
 for p in sorted(destination.rglob('*')):
  if p.is_file():manifest['files'].append({'path':str(p.relative_to(destination)),'bytes':p.stat().st_size,'sha256':digest(p)})
 (out/'ShelfSKU11Diagnostic.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print(json.dumps({'path':str(destination),'bytes':sum(p['bytes'] for p in manifest['files']),'parity':parity,'classColumns':80,'coremlRuntimeVerified':False},indent=2))
if __name__=='__main__':main()
