import type {WeightContext} from './weightContext.ts';
import {betaCatalogUrl} from './catalogClient.ts';
import {PHOTO_ASSESSMENT_CONSENT,photoAssessmentRequestSchema,photoAssessmentResponseSchema,type PhotoAssessmentResult} from './photoAssessment.ts';
export async function assessProductPhoto(imageBase64:string,signal:AbortSignal,fetcher:typeof fetch=fetch,weightContext?:WeightContext):Promise<PhotoAssessmentResult>{
 const input=photoAssessmentRequestSchema.parse({consentVersion:PHOTO_ASSESSMENT_CONSENT,imageBase64,...(weightContext?{weightContext}:{})});
 if(signal.aborted)throw Error('Scan cancelled.');
 const controller=new AbortController(),abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,95000);
 try{
  const response=await fetcher(betaCatalogUrl+'/v2/photos/recognize',{method:'POST',redirect:'error',signal:controller.signal,
   headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
  input.imageBase64='';
  const raw=await response.text();if(raw.length>250000)throw Error('Oversized response');
  if(controller.signal.aborted)throw Error('Cancelled');
  if(!response.ok){
   const code=JSON.parse(raw)?.code;
   if(code==='PHOTO_BUDGET_UNAVAILABLE')throw Error('The beta scanning allowance is unavailable. Search by name or scan the nutrition table.');
   if(code==='PHOTO_CONSENT_REQUIRED')throw Error('Review the updated photo privacy choice before scanning.');
   if(code==='PHOTO_CONTEXT_DISABLED')throw Error('Photo assessment with weight context is not available yet. Turn off that preference and retry.');
   if(code==='PHOTO_BUSY')throw Error('Photo assessment is busy. Please try again shortly.');
   throw Error('Photo assessment could not finish. Please try again.');
  }
  return photoAssessmentResponseSchema.parse(JSON.parse(raw));
 }catch(error){
  if(controller.signal.aborted)throw Error(signal.aborted?'Scan cancelled.':'This scan timed out. Please try again.');
  if(error instanceof Error&&/^(The beta|Review the updated|Photo assessment)/.test(error.message))throw error;
  throw Error('Photo assessment could not finish. Check your connection and try again.');
 }finally{input.imageBase64='';clearTimeout(timer);signal.removeEventListener('abort',abort);}
}
