import {join} from 'node:path';
import {readFileSync} from 'node:fs';
import {dualFoodRequestSchema,dualFoodResultSchema,dualModels,activePhotoModels,DUAL_FOOD_CONSENT,type DualFoodResult,type DualModel} from '../../../packages/core/src/dualAiFoodReview.ts';
import type {AiPhotoPreview} from '../../../packages/core/src/aiFoodReview.ts';
import {buildAiReviewRequest,parseReviewIdentity,parseReviewProgress,aiReviewInstructions} from './aiFoodReviewProvider.ts';
import {compactReviewInstructions} from './compactPhotoReview.ts';
import {buildClaudeReviewRequest} from './claudePhotoTransport.ts';
import {createPhotoStreamTransport,PhotoStreamFailure} from './photoStreamTransport.ts';
import {mergeDualReviews,readDualEnvelope,type ReviewEnvelope} from './dualPhotoReview.ts';
import {cleanProductJpeg} from './photoImage.ts';
import {ProductPhotoError} from './productPhotoProvider.ts';
import {createSharedReportBudget,readPrivateKey} from './realReportProvider.ts';
import {createServerScanTimer,type ServerTimingStage} from './scanTiming.ts';
import {recordDiagnostic,diagnosticHash,newTrace,archiveDiagnosticRules,type BetaDiagnostics} from './betaDiagnostics.ts';
type Transport=(request:Record<string,unknown>,signal:AbortSignal,onText?:(text:string)=>void,onTiming?:(stage:ServerTimingStage)=>void)=>Promise<string>;
type ReviewPhase='request'|'transport'|'preview'|'response';
// Fixed codes only; never retain provider bodies, exception messages or schema values.
function failureCode(error:unknown,phase:ReviewPhase):string{
 if(error instanceof PhotoStreamFailure)return error.code;
 if(error instanceof Error&&error.name==='ZodError')return 'dual_'+phase+'_schema_invalid';
 if(error instanceof SyntaxError)return 'dual_'+phase+'_json_invalid';
 if(error instanceof Error&&(error.name==='TimeoutError'||error.name==='AbortError'))return 'dual_'+phase+'_timeout_or_abort';
 if(error instanceof TypeError){
  const cause=error.cause as {code?:unknown}|undefined;
  const codes:Record<string,string>={ENOTFOUND:'dns_failed',EAI_AGAIN:'dns_temporary',ECONNRESET:'connection_reset',ECONNREFUSED:'connection_refused',ETIMEDOUT:'connection_timeout',UND_ERR_CONNECT_TIMEOUT:'connect_timeout',UND_ERR_HEADERS_TIMEOUT:'headers_timeout',UND_ERR_BODY_TIMEOUT:'body_timeout',UND_ERR_SOCKET:'socket_failed',CERT_HAS_EXPIRED:'tls_certificate_expired',UNABLE_TO_VERIFY_LEAF_SIGNATURE:'tls_verification_failed'};
  return 'dual_'+phase+'_'+(typeof cause?.code==='string'&&Object.hasOwn(codes,cause.code)?codes[cause.code]:'type_error');
 }
 return 'dual_'+phase+'_unexpected_error';
}
export interface DualPhotoProvider{available():boolean;recognize(input:unknown,signal:AbortSignal,onProgress?:(result:DualFoodResult)=>void,trace?:string,onIdentity?:(identity:AiPhotoPreview)=>void):Promise<DualFoodResult>}
export function createDualPhotoProvider(options:{gpt:Transport;claude?:Transport;reservePair:()=>Promise<void>;audit?:BetaDiagnostics;timingEnabled?:boolean;ruleHashes?:{promptHash:string;rulesHash:string}}):DualPhotoProvider{
 const models:readonly DualModel[]=options.claude?dualModels:activePhotoModels;
 let active=false,budgetUnavailable=false;
 return {available:()=>!budgetUnavailable,async recognize(input,parent,onProgress,trace=newTrace(),onIdentity){
  const parsed=dualFoodRequestSchema.parse(input);parent.throwIfAborted();
  if(active)throw new ProductPhotoError('PHOTO_BUSY');if(budgetUnavailable)throw new ProductPhotoError('PHOTO_BUDGET_UNAVAILABLE');
  let image:string;try{image=cleanProductJpeg(parsed.imageBase64);}catch{throw new ProductPhotoError('INVALID_PRODUCT_IMAGE');}
  active=true;const signal=AbortSignal.any([parent,AbortSignal.timeout(65000)]),started=Date.now();
  const timer=createServerScanTimer(options.timingEnabled===true,options.audit,trace,'provider');
  let previewModel:DualModel|undefined,progressSent=false;
  try{
   try{await options.reservePair();}catch{budgetUnavailable=true;throw new ProductPhotoError('PHOTO_BUDGET_UNAVAILABLE');}
   signal.throwIfAborted();
   const tasks=models.map(async model=>{
    let phase:ReviewPhase='request',previewFailed=false;
    try{
     const request=model===dualModels[0]?buildAiReviewRequest(image):buildClaudeReviewRequest(image);
     recordDiagnostic(options.audit,trace,{kind:'model_query',model,promptHash:options.ruleHashes?.promptHash??diagnosticHash(aiReviewInstructions+'\n'+compactReviewInstructions),rulesHash:options.ruleHashes?.rulesHash??diagnosticHash('unarchived-dual-rules'),maxOutputTokens:4500,imageDetail:'high',personalContext:false});
     phase='transport';
     const raw=await (model===dualModels[0]?options.gpt:options.claude!)(request,signal,onProgress||onIdentity?text=>{
      try{
      if(signal.aborted)return;
      if(!previewModel){const identity=parseReviewIdentity(text);if(identity){previewModel=model;onIdentity?.(identity);}}
      if(previewModel!==model||progressSent)return;
      const progress=parseReviewProgress(text);if(!progress?.original)return;
      progressSent=true;timer('first_result');
      const {model:ignored,...record}=progress;void ignored;
      onProgress?.(dualFoodResultSchema.parse({...record,schemaVersion:4,models:[model],alternatives:[],reviewState:'checking',estimatesDiffer:false}));
      }catch(error){previewFailed=true;throw error;}
     }:undefined,options.timingEnabled&&model===dualModels[0]?timer:undefined);
     signal.throwIfAborted();phase='response';return {model,envelope:readDualEnvelope(raw)};
    }catch(error){
     recordDiagnostic(options.audit,trace,{kind:'failure',stage:model===dualModels[0]?'dual_gpt':'dual_claude',code:parent.aborted?'cancelled':signal.aborted?'provider_timeout':failureCode(error,previewFailed?'preview':phase),elapsedMs:Date.now()-started});
     throw error;
    }
   });
   const settled=await Promise.allSettled(tasks);signal.throwIfAborted();timer('model_complete');
   const reviews=settled.flatMap(row=>row.status==='fulfilled'?[row.value]:[]) as {model:DualModel;envelope:ReviewEnvelope}[];
   if(!reviews.length)throw new ProductPhotoError('PHOTO_OUTCOME_UNKNOWN');
   return mergeDualReviews(reviews,previewModel,Date.now(),event=>recordDiagnostic(options.audit,trace,event),models);
  }catch(error){if(signal.aborted)throw new ProductPhotoError('PHOTO_CANCELLED');if(error instanceof ProductPhotoError)throw error;throw new ProductPhotoError('PHOTO_OUTCOME_UNKNOWN');}
  finally{image='';parsed.imageBase64='';active=false;}
 }};
}
export function loadDualPhotoProvider(root:string,environment:NodeJS.ProcessEnv=process.env,audit?:BetaDiagnostics):DualPhotoProvider|undefined{
 if(environment.GROCERY_DUAL_PHOTO_CONSENT!==DUAL_FOOD_CONSENT)return undefined;
 try{
  const ruleHashes=audit?archiveDiagnosticRules(root,aiReviewInstructions+'\n'+compactReviewInstructions,'\n// Dual union and identity rules\n'+readFileSync(join(root,'apps/service/src/dualPhotoReview.ts'),'utf8')):undefined;
  return createDualPhotoProvider({audit,ruleHashes,timingEnabled:environment.GROCERY_BUILD_STAGE==='beta0'&&environment.GROCERY_BETA_SCAN_TIMING==='true',
   gpt:createPhotoStreamTransport(readPrivateKey(join(root,'.tools/openai/api-key'))),
   reservePair:createSharedReportBudget(root,'product-photo',1)});
 }catch{return undefined;}
}
