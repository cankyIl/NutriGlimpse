import {groceryRequestSchema,groceryResultSchema,GROCERY_CONSENT,GROCERY_RESPONSE_CONSENT,GROCERY_PARALLEL_CONSENT,type GroceryContext,type GroceryResult} from './groceryReview.ts';
import {reviewWebProductPhoto} from './webAiFoodClient.ts';
import {betaCatalogUrl} from './catalogClient.ts';
import {notifyScanTiming,type ScanTimingHook} from './scanTiming.ts';
import {aiPhotoPreviewSchema,type AiPhotoPreview} from './aiFoodReview.ts';
import {readStreamLines} from './streamLines.ts';
import type {PhotoReviewResult} from './dualAiFoodReview.ts';
export async function reviewGroceryPhoto(imageBase64:string,context:GroceryContext,parent:AbortSignal,fetcher:typeof fetch=fetch,onProgress?:(r:PhotoReviewResult)=>void,onTiming?:ScanTimingHook,onIdentity?:(i:AiPhotoPreview)=>void,retainResponse=false,parallelContextConsentVersion?:typeof GROCERY_PARALLEL_CONSENT):Promise<PhotoReviewResult>{
 if(parent.aborted)throw Error('Scan cancelled.');
 const controller=new AbortController(),abort=()=>controller.abort();
 parent.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,100000);
 try{
  // Disabled rollout uses the existing route without dispatching a Gemini call.
  const caps=await fetcher(betaCatalogUrl+'/v6/photos/capabilities',{signal:controller.signal,redirect:'error'});
  if(!caps.ok)throw Error('The scan service is temporarily unavailable. Please try again shortly.');
  const rawCaps=await caps.text();if(rawCaps.length>4096)throw Error('The scan settings could not be read.');
  const capability=JSON.parse(rawCaps);
  if(capability.schemaVersion!==6||typeof capability.available!=='boolean')throw Error('The scan settings could not be read.');
  if(!capability.available)return await reviewWebProductPhoto(imageBase64,controller.signal,fetcher,onProgress,onTiming,onIdentity);
  if(parent.aborted||controller.signal.aborted)throw Error('Scan cancelled.');
  const input=groceryRequestSchema.parse({imageBase64,context,consentVersion:GROCERY_CONSENT,...(retainResponse?{diagnosticConsentVersion:GROCERY_RESPONSE_CONSENT}:{}),...(parallelContextConsentVersion?{parallelContextConsentVersion}:{})});
  notifyScanTiming(onTiming,{stage:'uploadStartMs'});
  let response:Response;
  try{response=await fetcher(betaCatalogUrl+'/v6/photos/recognize',{method:'POST',redirect:'error',signal:controller.signal,headers:{'Content-Type':'application/json',...(onIdentity||onProgress?{Accept:onIdentity?'application/x-ndjson; preview=identity':'application/x-ndjson'}:{})},body:JSON.stringify(input)});}
  finally{input.imageBase64='';}
  notifyScanTiming(onTiming,{stage:'responseHeadersMs',traceId:response.headers.get('X-Grocery-Trace-Id')??undefined});
  if(response.ok&&(onIdentity||onProgress)&&response.headers.get('content-type')?.startsWith('application/x-ndjson')){
   if(!response.body)throw Error('The review response could not be read.');
   let final:GroceryResult|undefined,identitySeen=false,count=0;
   await readStreamLines(response.body,controller.signal,line=>{
    if(!line.trim())return;
    if(parent.aborted||controller.signal.aborted)throw Error('Scan cancelled.');
    if(final||++count>6)throw Error('The review response could not be read.');
    const event=JSON.parse(line);
    if(event.type==='identity'){
     if(!onIdentity||identitySeen)throw Error('The review response could not be read.');
     const identity=aiPhotoPreviewSchema.parse(event.result);identitySeen=true;onIdentity(identity);return;
    }
    if(event.type==='error')throw Error('This nutrition review could not finish. Please try again or use Search foods.');
    if(event.type!=='progress'&&event.type!=='result')throw Error('The review response could not be read.');
    const parsed=groceryResultSchema.parse(event.result);
    if(event.type==='result')final=parsed;else onProgress?.(parsed);
   },250000);
   if(parent.aborted||controller.signal.aborted)throw Error('Scan cancelled.');
   if(!final)throw Error('The review response could not be read.');
   return final;
  }
  const raw=await response.text();if(raw.length>250000)throw Error('The review response could not be read.');
  const value=JSON.parse(raw);
  if(!response.ok){
   if(value.code==='PROVIDER_QUOTA')throw Error('Web nutrition search is temporarily at its provider limit. Please try again later or use Search foods.');
   if(value.code==='PROVIDER_GROUNDING_MISSING')throw Error('The nutrition search did not return web sources. Please try again or scan the Nutrition Facts table.');
   if(value.code==='PROVIDER_INVALID_RESPONSE')throw Error('The product review returned an incomplete answer. Please try again or use Search foods.');
   if(value.code==='PHOTO_BUSY'||response.status===429)throw Error('Scans are busy. Please try again shortly.');
   if(value.code==='PHOTO_CONSENT_REQUIRED')throw Error('Please reopen the camera and review the photo privacy choice.');
   if(value.code==='PHOTO_TIMED_OUT'||response.status===408)throw Error('The nutrition search took too long. Please try again.');
   throw Error('This nutrition review could not finish. Please try again or use Search foods.');
  }
  if(parent.aborted||controller.signal.aborted)throw Error('Scan cancelled.');
  return groceryResultSchema.parse(value) as GroceryResult;
 }catch(error){
  if(parent.aborted)throw Error('Scan cancelled.');
  if(controller.signal.aborted)throw Error('The nutrition search took too long. Please try again.');
  if(error instanceof SyntaxError||error instanceof Error&&error.name==='ZodError')throw Error('The review response could not be read. Please try again.');
  if(error instanceof TypeError)throw Error('The scan service could not be reached. Check your connection and try again.');
  throw error;
 }finally{imageBase64='';clearTimeout(timer);parent.removeEventListener('abort',abort);}
}
