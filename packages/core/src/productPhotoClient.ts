import {betaCatalogUrl} from './catalogClient.ts';
import {PRODUCT_PHOTO_CONSENT,productPhotoRequestSchema,productPhotoResponseSchema,type ProductPhotoResult} from './productPhoto.ts';
const messages:Record<string,string>={
 PHOTO_CONSENT_REQUIRED:'Review the photo privacy choice before sending a photo.',
 PHOTO_BUSY:'Photo recognition is busy. Please try again shortly.',
 PHOTO_BUDGET_UNAVAILABLE:'The beta scanning allowance is unavailable. You can still search by name or scan the nutrition table.',
 PHOTO_PROCESSING_DISABLED:'Photo recognition is temporarily unavailable. Search by name or scan the nutrition table.',
 INVALID_PRODUCT_IMAGE:'This photo could not be processed. Please retake it.',
 PHOTO_REQUEST_TOO_LARGE:'This photo is too large to process. Please retake it.',
};
export async function recognizeProductPhoto(imageBase64:string,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<ProductPhotoResult>{
 const input=productPhotoRequestSchema.parse({consentVersion:PRODUCT_PHOTO_CONSENT,imageBase64});
 if(signal.aborted)throw Error('Photo recognition cancelled.');
 const controller=new AbortController(),abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});
 const timeout=setTimeout(abort,50000);
 try{
  const response=await fetcher(betaCatalogUrl+'/v1/photos/recognize',{method:'POST',redirect:'error',signal:controller.signal,
   headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
  input.imageBase64='';
  const raw=await response.text();if(raw.length>250000)throw Error('Photo response exceeds limit.');
  if(controller.signal.aborted)throw Error('Photo recognition cancelled.');
  let value:unknown;try{value=JSON.parse(raw);}catch{throw Error('Photo recognition could not finish. Please try again.');}
  if(!response.ok){const code=value&&typeof value==='object'&&'code'in value?String(value.code):'';throw Error(messages[code]??'Photo recognition could not finish. Check your connection and try again.');}
  return productPhotoResponseSchema.parse(value);
 }catch(error){
  if(controller.signal.aborted)throw Error(signal.aborted?'Photo recognition cancelled.':'Photo recognition timed out. Please try again.');
  if(error instanceof Error&&Object.values(messages).includes(error.message))throw error;
  throw Error('Photo recognition could not finish. Check your connection and try again.');
 }finally{input.imageBase64='';clearTimeout(timeout);signal.removeEventListener('abort',abort);}
}
