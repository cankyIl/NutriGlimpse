import {estimatedRatingDecision} from '../../../packages/core/src/aiFoodReview.ts';
import {partialShelfRows} from './shelfNineStream.ts';
import {publicModelReturn,recordResponse,responseCodeHash,type ResponseJournal,type JournalRecord} from './responseJournal.ts';
import {mergeParallelShelf} from './shelfNineMerge.ts';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {shelfNineRequestSchema,shelfNineResultSchema,shelfNineProductSchema,shelfNineAlternativeSchema,assertNineAssociation,checkedShelfFood,isShelfHealthy,shelfNineModel,SHELF_RESPONSE_CONSENT,type ShelfNineRequest,type ShelfNineResult,type ShelfNineProduct,type ShelfNineAlternative} from '../../../packages/core/src/shelfNine.ts';
import {shelfProductKey,SHELF_GRID_MAX_BYTES} from '../../../packages/core/src/shelfGrid.ts';
import {shelfBenefits,shelfReasons,rankShelfAlternatives,type ShelfDecisionObserver,type ShelfAlternativeDecision} from './shelfAlternativePolicy.ts';
import type {StoreDirectory} from '../../../packages/core/src/storeDetection.ts';
import type {GroceryModel} from '../../../packages/core/src/groceryReview.ts';
import {groceryLocationSentence,normalizeGroceryLocation} from './groceryLocation.ts';
import {shopperPrompt} from './groceryShopperPrompt.ts';
import {wireFood,expandCompactFood} from './compactPhotoReview.ts';
import {createGroceryTransport,parseGroceryResponse,readGeminiKey,GroceryProviderError,type GroceryTransport} from './groceryReviewProvider.ts';
import {createPhotoStreamTransport,PhotoStreamFailure} from './photoStreamTransport.ts';
import {readPrivateKey} from './realReportProvider.ts';
import {cleanProductJpeg} from './photoImage.ts';
import {newTrace,recordDiagnostic,type BetaDiagnostics} from './betaDiagnostics.ts';
const object=(properties:Record<string,unknown>)=>({type:'object',additionalProperties:false,properties,required:Object.keys(properties)});
const strings=(max:number)=>({type:'array',maxItems:max,items:{type:'string'}});
const nullableString={anyOf:[{type:'string'},{type:'null'}]};
const details={food:wireFood,reasons:strings(2),source_urls:strings(4),nutrition_status:{type:'string',enum:['verified','estimated','unknown']}};
export const shelfNineWireSchema=object({
 products:{type:'array',maxItems:9,items:object({cell_numbers:{type:'array',minItems:1,maxItems:9,items:{type:'integer'}},...details})},
 unidentified_cells:{type:'array',maxItems:9,items:{type:'integer'}},
 total_duplicates_removed:{type:'integer'},
 alternatives:{type:'array',maxItems:3,items:object({compared_cell:{type:'integer'},...details,store_name:nullableString,aisle:nullableString,retailer_product_url:nullableString})},
 limitations:strings(4),
});
// Gemini's grammar compiler cannot serve the nested bounded OpenAI schema.
// Keep field/type/enum requirements; enforce every size/association/nutrition bound locally.
export function geminiShelfSchema(value:unknown):unknown{
 if(Array.isArray(value))return value.map(geminiShelfSchema);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!['minItems','maxItems','minLength','maxLength','minimum','maximum'].includes(key)).map(([key,v])=>[key,geminiShelfSchema(v)]));
 return value;
}
export function shelfNinePrompt(root:string,input:ShelfNineRequest,directory?:StoreDirectory){
 return readFileSync(join(root,'apps/service/prompts/shelf-nine.txt'),'utf8')
  .replace('{{SHOPPER_CONTEXT}}',shopperPrompt(input.context))
  .replace('{{STORE_SENTENCE}}',groceryLocationSentence(input.context,directory))
  .replace('{{OCCUPIED_CELL_NUMBERS}}',input.cells.map(c=>c.cell).join(', '));
}
export function buildShelfNineRequest(root:string,input:ShelfNineRequest,image:string,directory?:StoreDirectory,model:GroceryModel='gemini-3.5-flash-lite'){
 const prompt=shelfNinePrompt(root,input,directory);
 const limit=Math.min(12000,1500+input.cells.length*900);
 if(model==='gemini-3.5-flash-lite')return {model,store:false,
  input:[{type:'text',text:prompt},{type:'image',mime_type:'image/jpeg',data:image}],
  tools:[{type:'google_search'}],generation_config:{max_output_tokens:limit,thinking_level:'minimal'},
  response_format:{type:'text',mime_type:'application/json',schema:geminiShelfSchema(shelfNineWireSchema)}};
 return {model,store:false,instructions:prompt,reasoning:{effort:'none'},max_output_tokens:limit,
  tools:[{type:'web_search',external_web_access:true,search_context_size:'low'}],max_tool_calls:6,
  input:[{role:'user',content:[{type:'input_image',image_url:'data:image/jpeg;base64,'+image,detail:'original'}]}],
  text:{format:{type:'json_schema',name:'shelf_nine',strict:true,schema:shelfNineWireSchema}}};
}
// Partial strings and numbers never become facts.
export const partialShelfProducts=(text:string)=>partialShelfRows(text,'products',9);

const rowSchema=z.object({cell_numbers:z.array(z.number().int()).min(1).max(9),food:z.unknown(),reasons:z.array(z.string()).max(2).optional(),source_urls:z.array(z.string()).max(4).optional(),nutrition_status:z.enum(['verified','estimated','unknown']).optional()});
const order={healthy:0,very_healthy:0,neutral:1,not_healthy:2};
function safeDetails(raw:{food?:unknown;reasons?:string[];source_urls?:string[];nutrition_status?:string},grounded:boolean){
 const food=checkedShelfFood(expandCompactFood(raw.food));
 const sourceUrls=(raw.source_urls??[]).filter(u=>shelfNineProductSchema.shape.sourceUrls.element.safeParse(u).success);
 return {food,reasons:(raw.reasons??[]).map(s=>s.trim()).filter(Boolean).map(s=>s.slice(0,200)),sourceUrls,
  nutritionStatus:raw.nutrition_status==='verified'&&grounded&&sourceUrls.length?'verified' as const:raw.nutrition_status==='unknown'?'unknown' as const:'estimated' as const};
}
export function parseShelfNineProducts(rows:unknown[],input:ShelfNineRequest,grounded=false,onIssue?:(code:string)=>void){
 const out:ShelfNineProduct[]=[],seen=new Set<number>();
 for(const raw of rows){
  const association=z.object({cell_numbers:z.array(z.number().int()).min(1).max(9)}).parse(raw);
  for(const cell of association.cell_numbers){
   if(seen.has(cell)||!input.cells.some(c=>c.cell===cell))throw Error('SHELF_INVALID_ASSOCIATION');seen.add(cell);
  }
  try{
   const row=rowSchema.parse(raw),details=safeDetails(row,grounded);
   if(!details.food.identity.name||!['identified','uncertain'].includes(details.food.identity.status))continue;
   out.push(shelfNineProductSchema.parse({cellNumbers:row.cell_numbers,...details}));
  }catch(error){const code=error instanceof z.ZodError?'schema_'+error.issues[0]?.path.join('_'):'invalid_food';onIssue?.(code.replace(/[^a-zA-Z0-9_]/g,'_').slice(0,90));}
 }
 return mergeBatchProducts(out);
}
// Independently merge repeated exact identities and derive counts from cell membership.
function mergeBatchProducts(out:ShelfNineProduct[]){
 const groups=new Map<string,ShelfNineProduct>();
 for(const row of out){const key=row.food.identity.status==='identified'?shelfProductKey(row.food):'cell:'+row.cellNumbers.join(',');
  const prior=groups.get(key);if(!prior){groups.set(key,row);continue;}
  const conflict=JSON.stringify(prior.food.nutrition)!==JSON.stringify(row.food.nutrition)||prior.food.servingGrams!==row.food.servingGrams;
  groups.set(key,{...prior,cellNumbers:[...prior.cellNumbers,...row.cellNumbers],food:conflict?{...prior.food,rating:null}:prior.food});
 }
 return [...groups.values()].sort((a,b)=>(a.food.rating?order[a.food.rating]:3)-(b.food.rating?order[b.food.rating]:3));
}
export function parseAlternatives(raw:unknown,products:ShelfNineProduct[],grounded:boolean,onDecision?:ShelfDecisionObserver,deferComparison=false):ShelfNineAlternative[]{
 const rows=Array.isArray(raw)?raw.slice(0,3):[],out:ShelfNineAlternative[]=[],seen=new Set(products.map(p=>shelfProductKey(p.food)));
 const healthy=products.some(p=>isShelfHealthy(p.food));
 rows.forEach((raw,index)=>{
  let product:string|null=null,comparedCell:number|null=null;
  const report=(disposition:'accepted'|'rejected'|'unused',codes:string[])=>onDecision?.({index,comparedCell,product,disposition,codes});
  try{
   const row=z.object({compared_cell:z.number().int().min(1).max(9),food:z.unknown(),reasons:z.array(z.string()).max(2).optional(),source_urls:z.array(z.string()).max(4).optional(),nutrition_status:z.string().optional(),store_name:z.string().nullable().optional(),aisle:z.string().nullable().optional(),retailer_product_url:z.string().nullable().optional()}).parse(raw);
   comparedCell=row.compared_cell;
   const original=products.find(p=>p.cellNumbers.includes(row.compared_cell))?.food;
   const details=safeDetails(row,grounded),key=shelfProductKey(details.food);
   product=details.food.identity.name?.slice(0,160)??null;
   if(healthy&&!deferComparison){report('unused',['healthy_product_in_batch']);return;}
   if(!original){report('rejected',['original_cell_missing']);return;}
   if(seen.has(key)){report('rejected',['duplicate_or_scanned_product']);return;}
   const check=estimatedRatingDecision(details.food);
   if(deferComparison&&check.rating===null){report('rejected',['alternative_nutrition_or_identity_incomplete',...check.reasons]);return;}
   if(deferComparison&&details.food.nutrition.transFatG!==0){report('rejected',['alternative_trans_fat_not_zero']);return;}
   const decision=deferComparison?{benefits:['pending'],reasons:['candidate_nutrition_valid','pending_gemini_comparison']}:shelfBenefits(original,details.food);
   if(!decision.benefits.length){report('rejected',decision.reasons);return;}
   const text=(s:string|null|undefined)=>s?.trim().slice(0,200)||null;
   const url=shelfNineAlternativeSchema.shape.retailerUrl.safeParse(row.retailer_product_url??null);
   out.push(shelfNineAlternativeSchema.parse({...details,reasons:deferComparison?[]:shelfReasons(original,details.food,decision),comparedCell:row.compared_cell,storeName:text(row.store_name),aisle:text(row.aisle),retailerUrl:url.success?url.data:null}));seen.add(key);
   report('accepted',decision.reasons);
  }catch(error){report('rejected',[error instanceof z.ZodError?'invalid_alternative_schema':'invalid_alternative_food']);}
 });
 return rankShelfAlternatives(out);
}

type Transport=GroceryTransport;
export interface ShelfNineProvider{recognize(input:unknown,signal:AbortSignal,progress?:(r:ShelfNineResult)=>void):Promise<ShelfNineResult>}
interface ShelfProviderOptions{root:string;gemini:Transport;gpt:Transport;directory?:StoreDirectory;audit?:BetaDiagnostics;responseJournal?:ResponseJournal;providerTimeoutMs?:number}
const distinctAlternatives=(rows:ShelfNineAlternative[])=>rankShelfAlternatives(rows.filter((a,i,all)=>all.findIndex(b=>shelfProductKey(a.food)===shelfProductKey(b.food))===i).slice(0,3));
const retainShelfResponse=(input:ShelfNineRequest)=>!input.shareHealth||input.diagnosticConsentVersion===SHELF_RESPONSE_CONSENT;
const journalHashes=(root:string)=>({promptHash:responseCodeHash(readFileSync(join(root,'apps/service/prompts/shelf-nine.txt'),'utf8')),schemaHash:responseCodeHash(JSON.stringify(shelfNineWireSchema)),adapterHash:responseCodeHash(['apps/service/src/shelfNineProvider.ts','apps/service/src/shelfNineMerge.ts','apps/service/src/shelfAlternativePolicy.ts','packages/core/src/aiFoodReview.ts'].map(f=>readFileSync(join(root,f),'utf8')).join('\n'))});
export function createSingleShelfNineProvider(options:ShelfProviderOptions&{model?:GroceryModel;deferComparison?:boolean}):ShelfNineProvider{
 const cache=new Map<string,{hash:string;until:number;promise:Promise<ShelfNineResult>;pending:boolean}>();let active=0;
 return {async recognize(raw,parent,progress){
  const input=shelfNineRequestSchema.parse(raw);parent.throwIfAborted();
  const hash=createHash('sha256').update(JSON.stringify(input)).digest('hex'),key=input.sessionId+':'+input.batchId;
  for(const [k,v] of cache)if(!v.pending&&v.until<Date.now())cache.delete(k);
  input.context=normalizeGroceryLocation(input.context);
  const old=cache.get(key);if(old){if(old.hash!==hash)throw Error('SHELF_BATCH_CONFLICT');return old.promise;}
  if(active>=2||cache.size>=256)throw Error('SHELF_BUSY');
  let image=cleanProductJpeg(input.imageBase64,{maxBytes:SHELF_GRID_MAX_BYTES,maxDimension:2048,width:input.width,height:input.height});
  const model=options.model??'gemini-3.5-flash-lite',trace=newTrace(),start=Date.now();active++;
  const log=(stage:string,code?:string)=>recordDiagnostic(options.audit,trace,{kind:'shelf_batch',sessionId:input.sessionId,batchId:input.batchId,stage,model,cells:input.cells.map(c=>c.cell),elapsedMs:Date.now()-start,...(code?{code}:{})});
  const retain=retainShelfResponse(input)&&!!options.responseJournal,hashes=retain?journalHashes(options.root):undefined;
  const entry={hash,until:Date.now()+15*60000,pending:true,promise:Promise.resolve({} as ShelfNineResult)};
  const run=async()=>{
   const signal=AbortSignal.any([parent,AbortSignal.timeout(options.providerTimeoutMs??180000)]);
   let products:ShelfNineProduct[]=[],alternatives:ShelfNineAlternative[]=[],html:string|null=null;
   const result=(complete:boolean,rows=products,extra=alternatives,ready=false)=>shelfNineResultSchema.parse({schemaVersion:2,sessionId:input.sessionId,batchId:input.batchId,batchIndex:input.batchIndex,model,complete,...(ready?{primaryComplete:true}:{}),
    products:rows,alternatives:complete||ready?extra:[],duplicatesRemoved:rows.reduce((n,p)=>n+p.cellNumbers.length-1,0),
    unresolvedCells:input.cells.filter(c=>!rows.some(p=>p.cellNumbers.includes(c.cell))).map(c=>c.cell),searchSuggestionsHtml:html});
   const send=(snapshot:ShelfNineResult)=>{try{progress?.(snapshot);}catch{log('progress_failed');}};
   try{
    log('started');let pending=input.cells,lastProgress='',firstProduct=false;
    for(let attempt=0;attempt<2&&pending.length;attempt++){
     signal.throwIfAborted();const attemptInput={...input,cells:pending},responseTrace=newTrace();
     let response:unknown,partialText='',proposed=0;const decisions:ShelfAlternativeDecision[]=[];
     const save=(outcome:JournalRecord['outcome'],errorCode?:string)=>{
      if(!retain)return;
      recordResponse(options.responseJournal,responseTrace,{schemaVersion:1,model,...hashes!,outcome,...(errorCode?{errorCode}:{}),primary:publicModelReturn(response,partialText),
       shelf:{sessionId:input.sessionId,batchId:input.batchId,batchIndex:input.batchIndex,stage:'provider',requestTrace:trace,attempt,proposed,accepted:decisions.filter(d=>d.disposition==='accepted').length,decisions,result:result(false,products,alternatives,true)}});
     };
     try{
      log(attempt?'recovery_dispatch':'dispatch');
      response=await (model.startsWith('gemini')?options.gemini:options.gpt)(buildShelfNineRequest(options.root,attemptInput,image,options.directory,model),signal,{onText:text=>{
       if(signal.aborted)return;partialText=text;
       try{
        const partial=parseShelfNineProducts(partialShelfProducts(text),attemptInput);
        const joined=mergeBatchProducts([...products.filter(p=>!p.cellNumbers.some(c=>pending.some(x=>x.cell===c))),...partial]);
        // An outside alternative cannot be shown until all scanned cells are known:
        // a later healthy scanned product would otherwise invalidate the suggestion.
        const ready=input.cells.every(c=>joined.some(p=>p.cellNumbers.includes(c.cell)));
        const extra=ready?distinctAlternatives([...alternatives,...parseAlternatives(partialShelfRows(text,'alternatives',3),joined,false,undefined,options.deferComparison)]):[];
        const snapshot=result(false,joined,extra,ready),stamp=JSON.stringify(snapshot);
        if(stamp!==lastProgress&&partial.length){if(!firstProduct){firstProduct=true;log('first_product');}lastProgress=stamp;send(snapshot);}
       }catch{/* Wait for a complete valid association; never invent positions or truncated facts. */}
      }});
      save('received');signal.throwIfAborted();const evidence=parseGroceryResponse(response,model);
      const wire=z.object({products:z.array(z.unknown()).max(9),unidentified_cells:z.array(z.number().int()).max(9).optional(),alternatives:z.array(z.unknown()).max(3).optional()}).passthrough().parse(evidence.value);
      proposed=wire.alternatives?.length??0;
      const found=parseShelfNineProducts(wire.products,attemptInput,evidence.searches>0,code=>log('cell_rejected',code));
      const explicit=new Set(wire.unidentified_cells??[]);
      if([...explicit].some(c=>!pending.some(p=>p.cell===c)||found.some(p=>p.cellNumbers.includes(c))))throw Error('SHELF_INVALID_ASSOCIATION');
      products=mergeBatchProducts([...products,...found]);html=evidence.html??html;
      const extra=parseAlternatives(wire.alternatives,products,evidence.searches>0,d=>decisions.push(d),options.deferComparison);
      alternatives=!options.deferComparison&&products.some(p=>isShelfHealthy(p.food))?[]:distinctAlternatives([...alternatives,...extra]);
      recordDiagnostic(options.audit,trace,{kind:'shelf_alternatives',sessionId:input.sessionId,batchId:input.batchId,model,stage:'provider',attempt,proposed,accepted:decisions.filter(d=>d.disposition==='accepted').length,decisions,responseTrace:retain?responseTrace:null});
      recordDiagnostic(options.audit,trace,{kind:'shelf_usage',model,inputTokens:evidence.inputTokens,outputTokens:evidence.outputTokens,cachedTokens:evidence.cachedTokens,elapsedMs:Date.now()-start,cells:pending.length});
      save('completed');pending=pending.filter(c=>!found.some(p=>p.cellNumbers.includes(c.cell))&&!explicit.has(c.cell));
      send(result(false,products,alternatives,pending.length===0));
     }catch(error){
      const retry=error instanceof SyntaxError||error instanceof z.ZodError||error instanceof TypeError||
       error instanceof GroceryProviderError&&(/PROVIDER_HTTP_5/.test(error.code)||error.code==='PROVIDER_QUOTA')||
       error instanceof PhotoStreamFailure&&/^provider_http_(408|429|5)/.test(error.code);
      const code=signal.aborted?(parent.aborted?'CANCELLED':'PROVIDER_TIMEOUT'):retry?'RECOVERABLE_PROVIDER_ERROR':'PROVIDER_ERROR';
      save('failed',code);log('dispatch_failed',code.toLowerCase());
      if(signal.aborted)throw error;
      if(!retry||attempt===1){if(!products.length)throw error;break;}
     }
    }
    signal.throwIfAborted();
    const output=result(true);assertNineAssociation(input,output);log('complete');return output;
   }finally{image='';input.imageBase64='';active--;entry.pending=false;}
  };
  entry.promise=run();cache.set(key,entry);return entry.promise;
 }};
}

export function createShelfNineProvider(options:ShelfProviderOptions):ShelfNineProvider{
 const gemini=createSingleShelfNineProvider({...options,model:'gemini-3.5-flash-lite'});
 const gpt=createSingleShelfNineProvider({...options,model:'gpt-6-luna',deferComparison:true});
 const cache=new Map<string,{hash:string;until:number;pending:boolean;promise:Promise<ShelfNineResult>}>();
 return {async recognize(raw,parent,progress){
  parent.throwIfAborted();const input=shelfNineRequestSchema.parse(raw);
  const key=input.sessionId+':'+input.batchId,hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
  for(const [k,v] of cache)if(!v.pending&&v.until<Date.now())cache.delete(k);
  const prior=cache.get(key);if(prior){if(prior.hash!==hash)throw Error('SHELF_BATCH_CONFLICT');return prior.promise;}
  if(cache.size>=256)throw Error('SHELF_BUSY');
  const entry={hash,until:Date.now()+15*60000,pending:true,promise:Promise.resolve({} as ShelfNineResult)};
  const run=async()=>{
   const secondaryController=new AbortController(),secondarySignal=AbortSignal.any([parent,secondaryController.signal]);
   let primary:ShelfNineResult|undefined,secondary:ShelfNineResult|undefined,primaryStream:ShelfNineResult|undefined,secondaryStream:ShelfNineResult|undefined,closed=false;
   const emit=(result:ShelfNineResult)=>{if(parent.aborted||closed)return;try{progress?.(result);}catch{/* Observers cannot fail a model request. */}};
   const emitMerged=()=>{const p=primary??primaryStream;if(p)emit({...mergeParallelShelf(p,secondary??secondaryStream),complete:false,primaryComplete:true});};
   // Both models start immediately. Complete, checked alternatives stream while
   // the other model is working; no post-Gemini short deadline cancels GPT.
   const first=gemini.recognize(input,parent,r=>{if(r.primaryComplete){primaryStream=r;emitMerged();}else emit({...r,primaryComplete:false});});
   const second=gpt.recognize(input,secondarySignal,r=>{if(r.primaryComplete){secondaryStream=r;emitMerged();}}).then(r=>{secondary=r;emitMerged();return r;}).catch(()=>undefined);
   try{
    try{primary=await first;}catch(error){
     parent.throwIfAborted();const fallback=await second;if(!fallback)throw error;
     const checked=mergeParallelShelf({...fallback,alternatives:[]},fallback);
     const result={...checked,model:'gpt-6-luna' as const,primaryComplete:true,products:checked.products.map(p=>({...p,sourceModel:'gpt-6-luna' as const}))};
     assertNineAssociation(input,result);return result;
    }
    parent.throwIfAborted();emitMerged();await second;parent.throwIfAborted();
    const decisions:ShelfAlternativeDecision[]=[],result=mergeParallelShelf(primary,secondary,d=>decisions.push(d));assertNineAssociation(input,result);
    const trace=newTrace(),proposed=primary.alternatives.length+(secondary?.alternatives.length??0),retain=retainShelfResponse(input)&&!!options.responseJournal;
    recordDiagnostic(options.audit,trace,{kind:'shelf_alternatives',sessionId:input.sessionId,batchId:input.batchId,model:'parallel',stage:'merge',attempt:0,proposed,accepted:result.alternatives.length,decisions,responseTrace:retain?trace:null});
    if(retain)recordResponse(options.responseJournal,trace,{schemaVersion:1,model:'parallel',...journalHashes(options.root),outcome:'completed',primary:publicModelReturn(undefined),shelf:{sessionId:input.sessionId,batchId:input.batchId,batchIndex:input.batchIndex,stage:'merge',requestTrace:trace,attempt:0,proposed,accepted:result.alternatives.length,decisions,result}});
    return result;
   }finally{closed=true;secondaryController.abort();input.imageBase64='';entry.pending=false;}
  };
  entry.promise=run();cache.set(key,entry);return entry.promise;
 }};
}

export function loadShelfNineProvider(root:string,audit?:BetaDiagnostics,directory?:StoreDirectory,responseJournal?:ResponseJournal){
 try{
  const gemini=createGroceryTransport('gemini-3.5-flash-lite',readGeminiKey(join(root,'.tools/gemini/api-key')));
  const openai=createPhotoStreamTransport(readPrivateKey(join(root,'.tools/openai/api-key')),fetch,90000);
  const gpt:GroceryTransport=async(request,signal,hooks)=>JSON.parse(await openai(request,signal,hooks?.onText));
  return createShelfNineProvider({root,gemini,gpt,audit,directory,responseJournal});
 }catch{return undefined;}
}
