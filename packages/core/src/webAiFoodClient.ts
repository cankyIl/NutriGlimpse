import {notifyScanTiming,type ScanTimingHook} from './scanTiming.ts';
import {readStreamLines} from './streamLines.ts';
import {aiPhotoPreviewSchema,photoPreviewOf,type AiPhotoPreview} from './aiFoodReview.ts';
import {betaCatalogUrl} from './catalogClient.ts';
import {DUAL_FOOD_CONSENT as AI_FOOD_CONSENT,dualFoodRequestSchema as aiFoodRequestSchema,sourceFoodResultSchema as aiFoodResultSchema,type SourceFoodResult as AiFoodResult} from './dualAiFoodReview.ts';


class PhotoRequestError extends Error {}
const unreadable=()=>new PhotoRequestError('The review response could not be read. Please try again.');
async function post(path:string,input:unknown,parent:AbortSignal,fetcher:typeof fetch,onProgress?:(result:AiFoodResult)=>void,onTiming?:ScanTimingHook,onIdentity?:(identity:AiPhotoPreview)=>void){
 // React Native's AbortSignal supports .aborted, but not throwIfAborted().
 if(parent.aborted)throw new PhotoRequestError('Scan cancelled.');
 const controller=new AbortController(),abort=()=>controller.abort();
 parent.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,path==='recognize'?100000:35000);
 let stage:'transport'|'response'='transport';
 try{
  const body=JSON.stringify(input);notifyScanTiming(onTiming,{stage:'uploadStartMs'});
  const response=await fetcher(betaCatalogUrl+'/v5/photos/'+path,{method:'POST',redirect:'error',signal:controller.signal,headers:{'Content-Type':'application/json',...(onProgress||onIdentity?{'Accept':onIdentity?'application/x-ndjson; preview=identity':'application/x-ndjson'}:{})},body});
  notifyScanTiming(onTiming,{stage:'responseHeadersMs',traceId:response.headers.get('X-Grocery-Trace-Id')??undefined});
  stage='response';
  if(response.ok&&(onProgress||onIdentity)&&response.headers.get('content-type')?.startsWith('application/x-ndjson')){
   if(!response.body)throw unreadable();let final:AiFoodResult|undefined,count=0,firstOriginal:string|undefined,preview:AiPhotoPreview|undefined;
   await readStreamLines(response.body,controller.signal,line=>{
    if(!line.trim())return;if(parent.aborted||controller.signal.aborted)throw new PhotoRequestError('Scan cancelled.');
    if(final||++count>(onIdentity?7:6))throw unreadable();let event;try{event=JSON.parse(line);}catch{throw unreadable();}
    if(event.type==='error')throw new PhotoRequestError('This review could not finish. Please try again.');
    if(event.type==='identity'){
     if(!onIdentity||preview||firstOriginal!==undefined)throw unreadable();
     const parsed=aiPhotoPreviewSchema.safeParse(event.result);if(!parsed.success)throw unreadable();
     preview=parsed.data;onIdentity(preview);return;
    }
    if(!['progress','result'].includes(event.type))throw unreadable();
    const parsed=aiFoodResultSchema.safeParse(event.result);if(!parsed.success)throw unreadable();
    const result=parsed.data,original=JSON.stringify(result.original);
    if(event.type==='progress'&&preview&&(!result.original||JSON.stringify(photoPreviewOf(result.original.identity))!==JSON.stringify(preview)))throw unreadable();
    if(event.type==='progress'&&firstOriginal!==undefined&&original!==firstOriginal)throw unreadable();
    if(event.type==='progress'){if(!result.original)throw unreadable();firstOriginal=original;onProgress?.(result);}else final=result;
   },250000);
   if(!final||parent.aborted||controller.signal.aborted)throw unreadable();return final;
  }
  const raw=await response.text();
  if(parent.aborted||controller.signal.aborted)throw new PhotoRequestError('Scan interrupted.');
  if(raw.length>250000)throw unreadable();
  let value:unknown;
  try{value=JSON.parse(raw);}catch{if(!response.ok)throw new PhotoRequestError('The scan server is temporarily unavailable. Please try again shortly.');throw unreadable();}
  const code=value!==null&&typeof value==='object'&&'code' in value?value.code:null;
  if(!response.ok){
   if(code==='PHOTO_BUSY'||response.status===429)throw new PhotoRequestError('Scans are busy. Please try again shortly.');
   if(code==='PHOTO_BUDGET_UNAVAILABLE')throw new PhotoRequestError('The beta scan allowance is used up. Product search is still available.');
   if(code==='PHOTO_TIMED_OUT'||code==='SOURCE_TIMED_OUT'||response.status===408)throw new PhotoRequestError('This review took too long. Please try again.');
   if(code==='PHOTO_PROCESSING_DISABLED'||[502,504].includes(response.status))throw new PhotoRequestError('The scan server is temporarily unavailable. Please try again shortly.');
   throw new PhotoRequestError('This review could not finish. Please try again.');
  }
  return value;
 }catch(error){
  if(controller.signal.aborted||parent.aborted)throw new PhotoRequestError(parent.aborted?'Scan cancelled.':'The connection took too long. Please try again.');
  if(error instanceof PhotoRequestError)throw error;
  throw new PhotoRequestError(stage==='transport'?'Could not connect. Check your connection and try again.':'The review response was interrupted. Please try again.');
 }finally{clearTimeout(timer);parent.removeEventListener('abort',abort);}
}
export async function reviewWebProductPhoto(imageBase64:string,signal:AbortSignal,fetcher:typeof fetch=fetch,onProgress?:(result:AiFoodResult)=>void,onTiming?:ScanTimingHook,onIdentity?:(identity:AiPhotoPreview)=>void){
 const input=aiFoodRequestSchema.parse({imageBase64,consentVersion:AI_FOOD_CONSENT});
 try{const result=aiFoodResultSchema.safeParse(await post('recognize',input,signal,fetcher,onProgress,onTiming,onIdentity));if(!result.success)throw unreadable();return result.data;}
 finally{input.imageBase64='';}
}
