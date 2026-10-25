import {projectRoot} from './projectPaths.ts';
import {approvedGroceryPrompt} from './groceryPromptTemplate.ts';
export {approvedGroceryPrompt} from './groceryPromptTemplate.ts';
import {buildAlternativeRequest,supplementContext,startAlternativeRequest,mergeAlternativeSupplement} from './groceryAlternativeSupplement.ts';
import {readPrivateKey} from './realReportProvider.ts';
import {publicModelReturn,recordResponse,responseCodeHash,type ResponseJournal,type JournalRecord} from './responseJournal.ts';
import {createRetailerLookup,type RetailerLookup} from './groceryRetailers.ts';
import type {StoreDirectory} from '../../../packages/core/src/storeDetection.ts';
import {readGeminiStream,partialGroceryAnswer} from './geminiStream.ts';
import {SHOPPER_BOUNDARY} from './groceryShopperPrompt.ts';
import {adaptSimpleGroceryAnswer} from './geminiSimpleReview.ts';
import {aiPhotoPreviewSchema,estimatedRatingDecision,type AiPhotoPreview} from '../../../packages/core/src/aiFoodReview.ts';
import {createServerScanTimer} from './scanTiming.ts';
import {resolveGeminiGroundingSources,nativeAisleEvidence} from './geminiGroundingSources.ts';
import {adaptApprovedGroceryAnswer} from './geminiPhotoAdapter.ts';
import {readFileSync,openSync,fstatSync,closeSync,constants} from 'node:fs';
import {join} from 'node:path';
import {groceryRequestSchema,groceryResultSchema,estimatedGroceryFood,groceryUrl,type GroceryContext,type GroceryModel,type GroceryResult} from '../../../packages/core/src/groceryReview.ts';
import {validateGroceryReview} from './groceryReviewValidation.ts';
import {cleanProductJpeg} from './photoImage.ts';
import {ProductPhotoError} from './productPhotoProvider.ts';
import {recordDiagnostic,newTrace,diagnosticHash,diagnosticFood,type BetaDiagnostics} from './betaDiagnostics.ts';
export class GroceryProviderError extends Error {readonly code:string;constructor(code:string){super(code);this.code=code;}}
export type GroceryTransportHooks={onText?:(text:string)=>void;onIdentity?:(identity:AiPhotoPreview)=>void;onStage?:(stage:"model_dispatch"|"model_first_text"|"model_complete")=>void};
export type GroceryTransport=(request:Record<string,unknown>,signal:AbortSignal,hooks?:GroceryTransportHooks)=>Promise<unknown>;
const root=projectRoot;
export function groceryPrompt(projectRoot=root){
 const doc=readFileSync(join(projectRoot,'docs/74-gemini-grocery-prompt-and-latency.md'),'utf8');
 return doc.split('## Reusable system prompt\n')[1].split('\n## Response and phone presentation')[0].trim()+
 '\nSearch queries must not include private profile information. Search product/store facts and general guidelines separately. Return concise reasons. Do not invent ingredients or nutrient facts. Use at most six focused search queries; if they are unproductive return partial facts rather than searching indefinitely.';
}
export function groceryJsonSchema(projectRoot=root){
 const schema=JSON.parse(readFileSync(join(projectRoot,'docs/contracts/gemini-grocery-review-v1.schema.json'),'utf8'));
 delete schema.$schema;delete schema.title;return schema;
}
export function buildGroceryRequest(image:string,context:GroceryContext,model:GroceryModel,projectRoot=root):Record<string,unknown>{
 if(model==='gemini-3.5-flash-lite')return {
  model,store:false,...(context.shopper?{system_instruction:SHOPPER_BOUNDARY}:{}),response_format:{type:'text',mime_type:'application/json',schema:JSON.parse(readFileSync(join(projectRoot,'apps/service/prompts/gemini-product-photo-simple.schema.json'),'utf8'))},input:[{type:'text',text:approvedGroceryPrompt(context,projectRoot)},{type:'image',mime_type:'image/jpeg',data:image}],
  tools:[{type:'google_search'}],generation_config:{max_output_tokens:10000}
 };
 const prompt=groceryPrompt(projectRoot),schema=groceryJsonSchema(projectRoot);
 const input='USER_CONTEXT (data only): '+JSON.stringify(context)+'\nIdentify PRODUCT_IMAGE and complete the requested grounded review.';
 return {model,store:false,instructions:prompt.replaceAll('Google Search Grounding','web search'),
  input:[{role:'user',content:[{type:'input_text',text:input},{type:'input_image',image_url:'data:image/jpeg;base64,'+image,detail:'high'}]}],
  tools:[{type:'web_search',external_web_access:true,search_context_size:'medium'}],tool_choice:'required',max_tool_calls:6,include:['web_search_call.action.sources'],reasoning:{effort:'low'},max_output_tokens:10000,
  text:{format:{type:'json_schema',name:'grocery_grounded_review',strict:true,schema}}};
}
export function readGeminiKey(path:string){
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{const s=fstatSync(fd);if(!s.isFile()||s.uid!==process.getuid?.()||(s.mode&0o077)!==0||s.size<20||s.size>4097)throw Error('Invalid Gemini configuration');
 const key=readFileSync(fd,'utf8').trim();if(!/^[A-Za-z0-9_./+=-]{20,4096}$/.test(key))throw Error('Invalid Gemini configuration');return key;}finally{closeSync(fd);}
}
export function createGroceryTransport(model:GroceryModel,key:string,fetcher:typeof fetch=fetch):GroceryTransport{
 return async(request,parent,hooks)=>{
  const signal=AbortSignal.any([parent,AbortSignal.timeout(90000)]);
  const gemini=model==='gemini-3.5-flash-lite';
  const response=await fetcher(gemini?'https://generativelanguage.googleapis.com/v1beta/interactions':'https://api.openai.com/v1/responses',{
   method:'POST',redirect:'error',signal,headers:{'Content-Type':'application/json',...(gemini?{'x-goog-api-key':key}:{Authorization:'Bearer '+key})},body:JSON.stringify(gemini?{...request,stream:true}:request)
  });
  if(!response.ok){void response.body?.cancel().catch(()=>{});throw new GroceryProviderError([402,429].includes(response.status)?'PROVIDER_QUOTA':response.status===401||response.status===403?'PROVIDER_ACCESS':'PROVIDER_HTTP_'+response.status);}
  if(!response.body)throw new GroceryProviderError('PROVIDER_EMPTY');
  if(gemini&&response.headers.get('content-type')?.startsWith('text/event-stream'))return readGeminiStream(response.body,signal,hooks?.onText,()=>hooks?.onStage?.('model_first_text'));
  const reader=response.body.getReader(),decoder=new TextDecoder();let raw='',size=0;
  try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>2000000)throw new GroceryProviderError('PROVIDER_RESPONSE_LIMIT');raw+=decoder.decode(value,{stream:true});}}
  finally{await reader.cancel();}
  signal.throwIfAborted();return JSON.parse(raw+decoder.decode());
 };
}
type ProviderEvidence={value:unknown;urls:Set<string>;html:string|null;queries:string[];searches:number;inputTokens:number|null;outputTokens:number|null;cachedTokens:number|null;thinkingTokens:number|null};
const tokens=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0&&n<=10000000?n:null;
export function parseGroceryResponse(raw:unknown,model:GroceryModel):ProviderEvidence{
 const data=raw as Record<string,any>;const urls=new Set<string>();let text='',html:string|null=null,queries:string[]=[],searches=0;
 const add=(url:unknown)=>{if(typeof url==='string'&&groceryUrl.safeParse(url).success)urls.add(url);};
 let inputTokens=null,outputTokens=null,cachedTokens=null,thinkingTokens=null;
 if(model==='gemini-3.5-flash-lite'){
  if(Array.isArray(data.steps)){
   if(data.status!=='completed'||data.model&&data.model!=='gemini-3.5-flash-lite')throw new GroceryProviderError('PROVIDER_INCOMPLETE');
   const successful=new Set(data.steps.filter((s:any)=>s.type==='google_search_result'&&s.is_error!==true).map((s:any)=>s.call_id));
   for(const step of data.steps){
    if(step.type==='google_search_call'&&successful.has(step.id)){
     queries.push(...(step.arguments?.queries??[]).filter((q:unknown)=>typeof q==='string'));
    }
    if(step.type==='google_search_result'&&step.is_error!==true)for(const result of step.result??[]){
     if(typeof result.search_suggestions==='string')html=(html??'')+result.search_suggestions;
    }
    if(step.type==='model_output')for(const block of step.content??[]){
     if(block.type!=='text'||typeof block.text!=='string')continue;
     text+=block.text;
     for(const annotation of block.annotations??[])if(annotation.type==='url_citation')add(annotation.url);
    }
   }
   searches=queries.length;
   if(data.boundedSearch){
    const b=data.boundedSearch;
    if(b.limit!==6||!Number.isSafeInteger(b.attempted)||b.attempted<0||b.attempted>6||!Array.isArray(b.records))throw new GroceryProviderError('PROVIDER_SEARCH_BUDGET_INVALID');
    if(!b.records.some((r:any)=>r.status==='ok'))throw new GroceryProviderError('PROVIDER_GROUNDING_MISSING');
    queries=b.records.map((r:any)=>r.query).filter((q:unknown)=>typeof q==='string');
    searches=b.attempted;
    for(const url of b.urls??[])add(url);
   }
   inputTokens=tokens(data.usage?.total_input_tokens);outputTokens=tokens(data.usage?.total_output_tokens);
   cachedTokens=tokens(data.usage?.total_cached_tokens);thinkingTokens=tokens(data.usage?.total_thought_tokens);
   if(html&&html.length>60000)html=null;
  }else{
  const candidate=data.candidates?.[0];if(!candidate||candidate.finishReason!=='STOP')throw new GroceryProviderError('PROVIDER_INCOMPLETE');
  text=(candidate.content?.parts??[]).filter((p:any)=>!p.thought&&typeof p.text==='string').map((p:any)=>p.text).join('');
  const g=candidate.groundingMetadata??{};
  for(const chunk of g.groundingChunks??[])add(chunk.web?.uri);
  html=typeof g.searchEntryPoint?.renderedContent==='string'?g.searchEntryPoint.renderedContent:null;
  queries=(g.webSearchQueries??[]).filter((q:unknown)=>typeof q==='string').slice(0,20);
  searches=queries.length;
  inputTokens=tokens(data.usageMetadata?.promptTokenCount);outputTokens=tokens(data.usageMetadata?.candidatesTokenCount);
  cachedTokens=tokens(data.usageMetadata?.cachedContentTokenCount);thinkingTokens=tokens(data.usageMetadata?.thoughtsTokenCount);

  }
 }else{
  if(data.status!=='completed'||!Array.isArray(data.output))throw new GroceryProviderError('PROVIDER_INCOMPLETE');
  for(const item of data.output){
   if(item.type==='web_search_call'&&item.status==='completed'){searches++;for(const s of item.action?.sources??[])add(s.url);if(item.action?.type==='open_page')add(item.action.url);}
   if(item.type==='message'&&item.status==='completed')for(const part of item.content??[]){
    if(part.type==='output_text'){if(part.text?.trim().startsWith('{'))text=part.text;for(const a of part.annotations??[])if(a.type==='url_citation')add(a.url);}
   }
  }
  inputTokens=tokens(data.usage?.input_tokens);outputTokens=tokens(data.usage?.output_tokens);cachedTokens=tokens(data.usage?.input_tokens_details?.cached_tokens);thinkingTokens=tokens(data.usage?.output_tokens_details?.reasoning_tokens);
 }
 if(!text||text.length>250000)throw new GroceryProviderError('PROVIDER_ANSWER_MISSING');
 return {value:JSON.parse(text.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/,'$1')),urls,html,queries:queries.map(q=>q.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,300)).slice(0,20),searches,inputTokens,outputTokens,cachedTokens,thinkingTokens};
}
export interface GroceryProvider{available():boolean;recognize(input:unknown,signal:AbortSignal,onProgress?:(result:GroceryResult)=>void,trace?:string,onIdentity?:(identity:AiPhotoPreview)=>void):Promise<GroceryResult>}
export function createGroceryProvider(options:{model:GroceryModel;transport:GroceryTransport;audit?:BetaDiagnostics;projectRoot?:string;responseJournal?:ResponseJournal;retailerLookup?:RetailerLookup;supplementTransport?:GroceryTransport;supplementTimeoutMs?:number;supplementWaitMs?:number}):GroceryProvider{
 let active=false;
 return {available:()=>true,async recognize(input,parent,onProgress,trace=newTrace(),onIdentity){
  const request=groceryRequestSchema.parse(input);parent.throwIfAborted();
  if(active)throw new ProductPhotoError('PHOTO_BUSY');
  let image:string;try{image=cleanProductJpeg(request.imageBase64);}catch{throw new ProductPhotoError('INVALID_PRODUCT_IMAGE');}
  active=true;const start=performance.now();
   let supplement:ReturnType<typeof startAlternativeRequest>|undefined,supplementDisposition='not_configured',supplementAdded=0,supplementWaitMs=0,supplementUsageRecorded=false;
  let returned:unknown,partialText='',retailerReturned:unknown,retailerPartial='',displayedReview:unknown,decisions:{foodId:string;code:string}[]=[],journalOutcome:JournalRecord['outcome']='failed',journalError:string|undefined;
  const retain=!!request.diagnosticConsentVersion&&!!options.responseJournal;
  const saveResponse=(outcome:JournalRecord['outcome'])=>{
   if(!retain)return;
   try{
    const base=options.projectRoot??root;
    recordResponse(options.responseJournal,trace,{schemaVersion:1,model:options.model,
     promptHash:responseCodeHash(readFileSync(join(base,'apps/service/prompts/gemini-product-photo-native.txt'),'utf8')),
     schemaHash:responseCodeHash(readFileSync(join(base,'apps/service/prompts/gemini-product-photo-simple.schema.json'),'utf8')),
     adapterHash:responseCodeHash(readFileSync(join(base,'apps/service/src/geminiSimpleReview.ts'),'utf8')+readFileSync(join(base,'apps/service/src/groceryRetailers.ts'),'utf8')+readFileSync(join(base,'apps/service/src/groceryAlternativeSupplement.ts'),'utf8')),
     outcome,...(journalError?{errorCode:journalError}:{}),primary:publicModelReturn(returned,partialText),
     ...(retailerReturned||retailerPartial?{retailerFollowup:publicModelReturn(retailerReturned,retailerPartial)}:{}),
     ...(displayedReview?{displayedReview}:{}),decisions,
      ...(supplement?{supplement:{model:'gpt-6-luna',status:supplement.snapshot().status,disposition:supplementDisposition,elapsedMs:supplement.snapshot().elapsedMs,waitMs:supplementWaitMs,added:supplementAdded,
       promptHash:responseCodeHash(readFileSync(join(base,'apps/service/prompts/gemini-product-photo-native.txt'),'utf8')),
       ...(supplement.snapshot().raw?{returned:publicModelReturn(supplement.snapshot().raw)}:{})}}:{})});
   }catch{console.warn('response-journal unavailable');}
  };
  try{
   const signal=AbortSignal.any([parent,AbortSignal.timeout(95000)]);
   const body=buildGroceryRequest(image,request.context,options.model,options.projectRoot);
   const timer=createServerScanTimer(true,options.audit,trace,'provider');
    let previewSent=false,progressCount=0,lastAlternatives=-1;
    const emitPartial=(text:string)=>{
     if(retain)partialText=text;
     if(signal.aborted||options.model!=='gemini-3.5-flash-lite')return;
     const partial=partialGroceryAnswer(text);
     if(!previewSent&&partial.title){
      const preview=aiPhotoPreviewSchema.safeParse({status:'identified',brand:null,name:partial.title,variant:null,size:null});
      if(preview.success){previewSent=true;onIdentity?.(preview.data);}
     }
     if(!onProgress||!partial.product||progressCount>=4)return;
     try{
      // Final source resolution is still pending. The same nutrient/restriction checks run on complete cards.
      const {review}=adaptSimpleGroceryAnswer({product:partial.product,alternatives:partial.alternatives},request.context,new Set(),[],{allowUnverifiedEstimates:true});
      if(!review.original||review.recommendations.length<=lastAlternatives)return;
      lastAlternatives=review.recommendations.length;progressCount++;review.recommendationShortfall=null;
      timer('first_result');
      onProgress(groceryResultSchema.parse({schemaVersion:6,model:options.model,status:review.original.identity.status,
       original:estimatedGroceryFood(review.original),alternatives:review.recommendations.map(r=>estimatedGroceryFood(r.food)),checkedAt:new Date().toISOString(),review,
       grounding:{searchSuggestionsHtml:null,queries:[]},timing:{providerMs:Math.round(performance.now()-start),validationMs:0}}));
     }catch{/* Wait for a complete valid card; never stream malformed/half-written values. */}
    };
    timer('model_dispatch');
    if(options.model==='gemini-3.5-flash-lite'&&options.supplementTransport){
     try{supplement=startAlternativeRequest(options.supplementTransport,buildAlternativeRequest(image,options.projectRoot??root,supplementContext(request.context,request.parallelContextConsentVersion)),signal,options.supplementTimeoutMs);supplementDisposition='pending';}
     catch{supplementDisposition='configuration_failed';}
    }
    const response=await options.transport(body,signal,{onText:emitPartial,onStage:timer,onIdentity:value=>{
     if(signal.aborted||previewSent)return;
     const preview=aiPhotoPreviewSchema.safeParse(value);if(!preview.success)return;
     previewSent=true;onIdentity?.(preview.data);
    }}),providerMs=Math.round(performance.now()-start);
    returned=response;saveResponse('received');timer('model_complete');
   const parsed=parseGroceryResponse(response,options.model),vStart=performance.now();
   if(!parsed.searches)throw new GroceryProviderError('PROVIDER_GROUNDING_MISSING');
   const evidence=options.model==='gemini-3.5-flash-lite'
    ?await resolveGeminiGroundingSources(parsed.value,parsed.urls,parsed.searches,signal):parsed;
   const adapterAudit:{foodId:string;code:string}[]=[];
    const simple=options.model==='gemini-3.5-flash-lite'&&(evidence.value as any)?.schemaVersion!=='gemini-grocery-review-v1'&&!(evidence.value as any)?.product?.identity;
    const native=options.model==='gemini-3.5-flash-lite'&&!(response as any)?.boundedSearch;
    const aisleRecords=simple&&native?await nativeAisleEvidence(evidence.value,evidence.urls,signal):(response as any)?.boundedSearch?.records;
    const adapted=simple?adaptSimpleGroceryAnswer(evidence.value,request.context,evidence.urls,aisleRecords,{allowUnverifiedEstimates:native}):null;
    const wire=adapted?adapted.review:options.model==='gemini-3.5-flash-lite'&&(evidence.value as any)?.schemaVersion!=='gemini-grocery-review-v1'
     ?adaptApprovedGroceryAnswer(evidence.value,request.context,evidence.urls,adapterAudit):evidence.value;
   let {review,audit}=adapted??validateGroceryReview(wire,request.context,evidence.urls);
   let retailerMs=0;
    if(supplement){
     const needs=review.original&&['neutral','not_healthy'].includes(review.original.assessment.rating??'');
     if(!needs||review.recommendations.length>=3){supplementDisposition=needs?'gemini_complete':'gemini_no_alternatives';supplement.cancel();}
     else{
      const waiting=performance.now(),extra=await supplement.finish(options.supplementWaitMs);supplementWaitMs=Math.round(performance.now()-waiting);signal.throwIfAborted();
      supplementDisposition=extra.status;
      if(extra.status==='completed')try{
       const parsedExtra=parseGroceryResponse(extra.raw,'gpt-6-luna');
       const merged=mergeAlternativeSupplement(review,parsedExtra.value,request.context,parsedExtra.urls);review=merged.review;audit=[...audit,...merged.audit];supplementAdded=merged.added;
       supplementDisposition=merged.added?'supplemented':'no_additional_eligible';
       if(merged.added&&onProgress&&progressCount<4&&review.original){
        progressCount++;
        onProgress(groceryResultSchema.parse({schemaVersion:6,model:options.model,status:review.original.identity.status,
         original:estimatedGroceryFood(review.original),alternatives:review.recommendations.map(r=>estimatedGroceryFood(r.food)),checkedAt:new Date().toISOString(),review,
         grounding:{searchSuggestionsHtml:parsed.html,queries:parsed.queries},timing:{providerMs:providerMs+supplementWaitMs,validationMs:0}}));
       }
       supplementUsageRecorded=true;
       recordDiagnostic(options.audit,trace,{kind:'grocery_usage',model:'gpt-6-luna',promptHash:diagnosticHash(readFileSync(join(options.projectRoot??root,'apps/service/prompts/gemini-product-photo-native.txt'),'utf8')),inputTokens:parsedExtra.inputTokens,outputTokens:parsedExtra.outputTokens,cachedTokens:parsedExtra.cachedTokens,thinkingTokens:parsedExtra.thinkingTokens,searches:parsedExtra.searches,elapsedMs:extra.elapsedMs,validationMs:0,accepted:merged.added,issues:[]});
      }catch{supplementDisposition='invalid_response';}
     }
    }
   if(options.retailerLookup){
    const retailer=await options.retailerLookup(review,request.context,signal);review=retailer.review;retailerReturned=retailer.returned;retailerPartial=retailer.partialText??'';audit=[...audit,...retailer.decisions];retailerMs=retailer.elapsedMs;
     if(retailer.returned){
      const meta=publicModelReturn(retailer.returned);recordDiagnostic(options.audit,trace,{kind:'retailer_usage',searches:retailer.searches,elapsedMs:retailer.elapsedMs,inputTokens:tokens(meta.usage.total_input_tokens),outputTokens:tokens(meta.usage.total_output_tokens)});
     }
     parsed.queries=[...parsed.queries,...retailer.queries].slice(0,20);
     const combinedHtml=(parsed.html??'')+(retailer.html??'');parsed.html=combinedHtml&&combinedHtml.length<=60000?combinedHtml:parsed.html;
     signal.throwIfAborted();
   }
   displayedReview=review;decisions=[...adapterAudit,...audit];
   recordDiagnostic(options.audit,trace,{kind:'retailer_resolution',outcomes:review.recommendations.map((r,index)=>({index,status:r.food.availability.status,aisle:r.food.availability.aisleEvidence==='branch_specific',codes:audit.filter(a=>a.foodId===r.food.id&&/retailer|store|aisle|source_limit/.test(a.code)).map(a=>a.code).slice(0,12)}))});
   const validationMs=Math.max(0,Math.round(performance.now()-vStart)-retailerMs-supplementWaitMs);
    const proposed=adapted?adapted.candidates.map(food=>({food})):(wire as any).recommendations??[];
    const reasons=(id:string)=>[...new Set([...adapterAudit,...audit].filter(x=>x.foodId===id).map(x=>x.code))].slice(0,20);
    const original=review.original?estimatedGroceryFood(review.original):null;
    if(!request.context.shopper)recordDiagnostic(options.audit,trace,{kind:'decision',status:review.status,original:original?diagnosticFood(original):null,
     originalModelRating:simple?(evidence.value as any).product?.rating??null:(wire as any).original?.assessment.rating??null,originalComputedRating:!simple&&original?estimatedRatingDecision(original).rating:null,
     originalReasons:reasons('original'),proposed:adapted?.proposedCount??proposed.length,accepted:review.recommendations.length,
     alternatives:proposed.slice(0,5).map((row:any,index:number)=>{const f=estimatedGroceryFood(row.food),accepted=review.recommendations.find(r=>r.food.id===row.food.id);return {index,food:diagnosticFood(f),computedRating:simple?null:estimatedRatingDecision(f).rating,disposition:accepted?'accepted':'rejected',displayedRating:accepted?.food.assessment.rating??null,reasons:reasons(row.food.id)};}),
     reason:original?.rating===null?'original_rating_unavailable':review.recommendations.length?'recommendations_available':'no_eligible_recommendations'});
    timer('first_result');
   recordDiagnostic(options.audit,trace,{kind:'grocery_usage',model:options.model,promptHash:diagnosticHash(options.model==='gemini-3.5-flash-lite'?readFileSync(join(options.projectRoot??root,'apps/service/prompts/gemini-product-photo-native.txt'),'utf8'):groceryPrompt(options.projectRoot)),inputTokens:parsed.inputTokens,outputTokens:parsed.outputTokens,cachedTokens:parsed.cachedTokens,thinkingTokens:parsed.thinkingTokens,searches:parsed.searches,elapsedMs:providerMs,validationMs,accepted:review.recommendations.length,issues:request.context.shopper?[]:audit.map(x=>x.code).slice(0,40)});
   const result=groceryResultSchema.parse({schemaVersion:6,model:options.model,status:review.original?.identity.status??'no-product',
    original:review.original?estimatedGroceryFood(review.original):null,alternatives:review.recommendations.map(r=>estimatedGroceryFood(r.food)),checkedAt:new Date().toISOString(),
    review,grounding:{searchSuggestionsHtml:parsed.html,queries:parsed.queries},timing:{providerMs:providerMs+retailerMs+supplementWaitMs,validationMs}});
   journalOutcome='completed';return result;
  }catch(error){
   const code=error instanceof GroceryProviderError?error.code:parent.aborted?'PHOTO_CANCELLED':error instanceof Error&&error.name==='TimeoutError'?'PHOTO_TIMED_OUT':'PROVIDER_INVALID_RESPONSE';
   journalError=code;
   if(error instanceof Error&&error.name==='ZodError'){
    const allowed=new Set(['product','alternatives','sources','original','recommendations','identity','nutrition','serving','assessment','rating','reasons','limitations','title','url','source_id','sourceId','sourceIds','nutrition_source_ids','supported_nutrients','matched_product','serving_size','verification_notes','availability','image','grounding','queries']);
    for(const issue of (error as any).issues?.slice(0,6)??[]){
     const fields=(issue.path??[]).filter((x:unknown)=>typeof x==='string'&&allowed.has(x)).join('_').slice(0,80)||'field';
     recordDiagnostic(options.audit,trace,{kind:'failure',stage:'grocery_validation',code:('schema_'+fields).slice(0,100),elapsedMs:Math.round(performance.now()-start)});
    }
   }
   recordDiagnostic(options.audit,trace,{kind:'failure',stage:'grocery_review',code,elapsedMs:Math.round(performance.now()-start)});
   if(error instanceof ProductPhotoError)throw error;
   throw new GroceryProviderError(code);
  }finally{if(supplement){supplement.cancel();if(supplementDisposition==='pending')supplementDisposition=parent.aborted?'scan_cancelled':'gemini_failed';
    if(!supplementUsageRecorded&&supplement.snapshot().status==='completed')try{
     const meta=parseGroceryResponse(supplement.snapshot().raw,'gpt-6-luna');
     recordDiagnostic(options.audit,trace,{kind:'grocery_usage',model:'gpt-6-luna',promptHash:diagnosticHash(readFileSync(join(options.projectRoot??root,'apps/service/prompts/gemini-product-photo-native.txt'),'utf8')),inputTokens:meta.inputTokens,outputTokens:meta.outputTokens,cachedTokens:meta.cachedTokens,thinkingTokens:meta.thinkingTokens,searches:meta.searches,elapsedMs:supplement.snapshot().elapsedMs,validationMs:0,accepted:0,issues:[]});
    }catch{/* Malformed public responses remain available only in the consented journal. */}
    recordDiagnostic(options.audit,trace,{kind:'alternative_supplement',model:'gpt-6-luna',status:supplement.snapshot().status,disposition:supplementDisposition,elapsedMs:supplement.snapshot().elapsedMs,waitMs:supplementWaitMs,added:supplementAdded});}
    saveResponse(journalOutcome);image='';request.imageBase64='';partialText='';active=false;}
 }};
}
export function loadGroceryProvider(projectRoot:string,audit?:BetaDiagnostics,responseJournal?:ResponseJournal,directory?:StoreDirectory){
 if(process.env.GROCERY_GEMINI_ENABLED!=='true')return undefined;
 try{const transport=createGroceryTransport('gemini-3.5-flash-lite',readGeminiKey(join(projectRoot,'.tools/gemini/api-key')));let supplementTransport:GroceryTransport|undefined;
  if(process.env.GROCERY_GPT_ALTERNATIVES_ENABLED!=='false')try{supplementTransport=createGroceryTransport('gpt-6-luna',readPrivateKey(join(projectRoot,'.tools/openai/api-key')));}catch{console.warn('grocery-alternatives: OpenAI configuration unavailable');}
  return createGroceryProvider({model:'gemini-3.5-flash-lite',projectRoot,audit,responseJournal,transport,supplementTransport,retailerLookup:createRetailerLookup(transport,r=>parseGroceryResponse(r,'gemini-3.5-flash-lite'),projectRoot,directory)});}catch{return undefined;}
}
