import {join} from 'node:path';
import {DUAL_FOOD_CONSENT,dualFoodRequestSchema,dualModels,activePhotoModels,sourceFoodResultSchema,type SourceFoodResult,type DualModel} from '../../../packages/core/src/dualAiFoodReview.ts';
import {type AiPhotoPreview,type EstimatedFood,estimatedFoodSchema,photoPreviewOf} from '../../../packages/core/src/aiFoodReview.ts';
import {parseReviewIdentity} from './aiFoodReviewProvider.ts';
import {dualIdentityKey,mergeDualReviews} from './dualPhotoReview.ts';
import {buildWebReviewRequest,parseWebReview,webReviewInstructions,type WebReview} from './webPhotoReview.ts';
import {cleanProductJpeg} from './photoImage.ts';
import {ProductPhotoError,buildProductPhotoRequest,parseProductPhotoResponse} from './productPhotoProvider.ts';
import {createPhotoStreamTransport,PhotoStreamFailure} from './photoStreamTransport.ts';
import {readPrivateKey,createSharedReportBudget} from './realReportProvider.ts';
import {recordDiagnostic,diagnosticHash,newTrace,type BetaDiagnostics} from './betaDiagnostics.ts';
type Transport=(request:Record<string,unknown>,signal:AbortSignal,onText?:(text:string)=>void)=>Promise<string>;
export function createWebClaudeTransport(key:string,fetcher:typeof fetch=fetch):Transport{
 return async(request,parent)=>{
  const signal=AbortSignal.any([parent,AbortSignal.timeout(80000)]);
  signal.throwIfAborted();
  const response=await fetcher('https://api.anthropic.com/v1/messages',{method:'POST',redirect:'error',signal,
   headers:{'x-api-key':key,'anthropic-version':'2023-06-01','Content-Type':'application/json'},body:JSON.stringify({...request,stream:false})});
  if(!response.ok||!response.body){void response.body?.cancel().catch(()=>{});throw new PhotoStreamFailure('claude_web_http_'+response.status);}
  const reader=response.body.getReader(),decoder=new TextDecoder();let raw='',bytes=0;
  try{for(;;){const next=await reader.read();if(next.done)break;bytes+=next.value.length;if(bytes>3000000)throw new PhotoStreamFailure('claude_web_response_limit');raw+=decoder.decode(next.value,{stream:true});}}
  finally{await reader.cancel();}
  signal.throwIfAborted();return raw+decoder.decode();
 };
}
export function mergeWebReviews(reviews:WebReview[],now=Date.now(),audit?:Parameters<typeof mergeDualReviews>[3],expectedModels:readonly DualModel[]=dualModels):SourceFoodResult{
 const ordered=[...reviews].sort((a,b)=>dualModels.indexOf(a.model)-dualModels.indexOf(b.model));
 // A completed search with no matching nutrition supplies no numeric evidence.
 // Preserve the sourced review as explicitly partial; do not compare it to nulls.
 const sourced=ordered.filter(r=>{const food=estimatedFoodSchema.safeParse(r.envelope.original);return food.success&&r.sources.has(dualIdentityKey(food.data));});
 const merged=mergeDualReviews(sourced.length?sourced:ordered,undefined,now,audit,expectedModels);
 const attach=(food:EstimatedFood)=>{
  const key=dualIdentityKey(food);
  // Nutrition is kept from the same provider selected by mergeDualReviews.
  const owner=ordered.find(r=>[r.envelope.original,...r.envelope.alternatives].some(raw=>{
   const parsed=estimatedFoodSchema.safeParse(raw);return parsed.success&&dualIdentityKey(parsed.data)===key&&JSON.stringify(parsed.data.nutrition)===JSON.stringify(food.nutrition);
  }));
  return {...food,nutritionSource:owner?.sources.get(key)??null};
 };
 return sourceFoodResultSchema.parse({...merged,schemaVersion:5,basis:'model-web-search',
  original:merged.original?attach(merged.original):null,alternatives:merged.alternatives.map(attach)});
}
export interface WebPhotoProvider{available():boolean;recognize(input:unknown,signal:AbortSignal,onProgress?:(result:SourceFoodResult)=>void,trace?:string,onIdentity?:(identity:AiPhotoPreview)=>void):Promise<SourceFoodResult>}
export function createWebPhotoProvider(options:{gpt:Transport;claude?:Transport;identity?:Transport;reservePair:()=>Promise<void>;audit?:BetaDiagnostics}):WebPhotoProvider{
 const models:readonly DualModel[]=options.claude?dualModels:activePhotoModels;
 let active=false;
 return {available:()=>true,async recognize(input,parent,onProgress,trace=newTrace(),onIdentity){
  const parsed=dualFoodRequestSchema.parse(input);parent.throwIfAborted();
  if(active)throw new ProductPhotoError('PHOTO_BUSY');
  let image:string;try{image=cleanProductJpeg(parsed.imageBase64);}catch{throw new ProductPhotoError('INVALID_PRODUCT_IMAGE');}
  active=true;const started=Date.now(),signal=AbortSignal.any([parent,AbortSignal.timeout(85000)]);let preview:AiPhotoPreview|null=null,progressSent=false;
  const previewAbort=new AbortController();let previewTask=Promise.resolve();
  try{
   await options.reservePair();signal.throwIfAborted();
   if(options.identity&&onIdentity){
    const request=buildProductPhotoRequest(image);
    recordDiagnostic(options.audit,trace,{kind:'model_query',model:'gpt-6-luna',promptHash:diagnosticHash(request.instructions),rulesHash:diagnosticHash('identity-preview-only-v1'),maxOutputTokens:800,imageDetail:'high',personalContext:false});
    previewTask=options.identity(request,AbortSignal.any([signal,previewAbort.signal,AbortSignal.timeout(5000)])).then(raw=>{
     const identity=photoPreviewOf(parseProductPhotoResponse(raw));
     if(!signal.aborted&&!previewAbort.signal.aborted&&!preview&&!progressSent&&['identified','uncertain'].includes(identity.status)){
      preview=identity;onIdentity(identity);
     }
    }).catch(()=>{/* Preview is optional and cannot downgrade a completed web review. */});
   }
   const settled=await Promise.allSettled(models.map(async model=>{
    try{
     recordDiagnostic(options.audit,trace,{kind:'model_query',model,promptHash:diagnosticHash(webReviewInstructions),rulesHash:diagnosticHash('web-confirmed-model-values-v1'),maxOutputTokens:6500,imageDetail:'high',personalContext:false});
     const raw=await (model==='gpt-6-luna'?options.gpt:options.claude!)(buildWebReviewRequest(image,model),signal,text=>{
      if(!preview&&!progressSent&&!signal.aborted){const identity=parseReviewIdentity(text);if(identity){preview=identity;onIdentity?.(identity);}}
     });
     signal.throwIfAborted();
     const review=parseWebReview(raw,model),usage=JSON.parse(raw).usage;
     const tokens=(n:unknown)=>typeof n==='number'&&Number.isInteger(n)&&n>=0&&n<=10000000?n:null;
     recordDiagnostic(options.audit,trace,{kind:'web_usage',model,inputTokens:tokens(usage?.input_tokens),outputTokens:tokens(usage?.output_tokens),cachedTokens:tokens(usage?.cache_read_input_tokens??usage?.input_tokens_details?.cached_tokens),searches:review.searches,sourcedFoods:review.sources.size,elapsedMs:Date.now()-started});
     const one=mergeWebReviews([review]),original=one.original;
     if(models.length>1&&onProgress&&!progressSent&&original?.nutritionSource&&(!preview||JSON.stringify(preview)===JSON.stringify(photoPreviewOf(original.identity)))){
      progressSent=true;onProgress?.({...one,reviewState:'checking',alternatives:[]});
     }
     return review;
    }catch(error){
     const code=error instanceof PhotoStreamFailure?error.code:error instanceof Error&&error.name==='ZodError'?'web_response_schema_invalid':error instanceof SyntaxError?'web_response_json_invalid':signal.aborted?'web_timeout_or_cancelled':'web_request_failed';
     recordDiagnostic(options.audit,trace,{kind:'failure',stage:model==='gpt-6-luna'?'dual_gpt':'dual_claude',code,elapsedMs:Date.now()-started});throw error;
    }
   }));
   signal.throwIfAborted();
   const reviews=settled.flatMap(row=>row.status==='fulfilled'?[row.value]:[]);
   if(!reviews.length)throw new ProductPhotoError('PHOTO_OUTCOME_UNKNOWN');
   return mergeWebReviews(reviews,Date.now(),event=>recordDiagnostic(options.audit,trace,event),models);
  }finally{previewAbort.abort();await previewTask;image='';parsed.imageBase64='';active=false;}
 }};
}
export function loadWebPhotoProvider(root:string,audit?:BetaDiagnostics):WebPhotoProvider|undefined{
 if(process.env.GROCERY_DUAL_PHOTO_CONSENT!==DUAL_FOOD_CONSENT)return undefined;
 try{const reserveReviews=createSharedReportBudget(root,'product-photo',1),reservePreview=createSharedReportBudget(root,'product-photo',1);
 return createWebPhotoProvider({audit,identity:createPhotoStreamTransport(readPrivateKey(join(root,'.tools/openai/api-key')),fetch,5000),gpt:createPhotoStreamTransport(readPrivateKey(join(root,'.tools/openai/api-key')),fetch,80000),
  reservePair:async()=>{await reserveReviews();await reservePreview();}});}catch{return undefined;}
}
