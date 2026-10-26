import {mergeParallelShelf} from './shelfNineMerge.ts';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {shelfNineRequestSchema,shelfNineResultSchema,shelfNineProductSchema,shelfNineAlternativeSchema,assertNineAssociation,checkedShelfFood,isShelfHealthy,shelfNineModel,type ShelfNineRequest,type ShelfNineResult,type ShelfNineProduct,type ShelfNineAlternative} from '../../../packages/core/src/shelfNine.ts';
import {shelfProductKey,SHELF_GRID_MAX_BYTES} from '../../../packages/core/src/shelfGrid.ts';
import {estimatedBenefitsDecision,type EstimatedFood} from '../../../packages/core/src/aiFoodReview.ts';
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
// Extract only complete array records. Partial strings/numbers never become facts.
export function partialShelfProducts(text:string):unknown[]{
 const match=/^\s*\{\s*"products"\s*:\s*\[/.exec(text);if(!match)return [];
 let i=match[0].length;const values:unknown[]=[];
 while(i<text.length&&values.length<9){
  while(/[\s,]/.test(text[i]??'')&&i<text.length)i++;
  if(text[i]!== '{')break;
  const start=i;let depth=0,quoted=false,escape=false,done=false;
  for(;i<text.length;i++){const c=text[i];
   if(quoted){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;}
   else if(c==='"')quoted=true;else if(c==='{'||c==='[')depth++;else if(c==='}'||c===']'){depth--;if(depth===0){i++;done=true;break;}}
  }
  if(!done)break;
  try{values.push(JSON.parse(text.slice(start,i)));}catch{break;}
 }
 return values;
}
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
export function parseAlternatives(raw:unknown,products:ShelfNineProduct[],grounded:boolean):ShelfNineAlternative[]{
 if(products.some(p=>isShelfHealthy(p.food)))return [];
 const rows=Array.isArray(raw)?raw.slice(0,3):[],out:ShelfNineAlternative[]=[],seen=new Set(products.map(p=>shelfProductKey(p.food)));
 for(const raw of rows)try{
  const row=z.object({compared_cell:z.number().int(),food:z.unknown(),reasons:z.array(z.string()).max(2).optional(),source_urls:z.array(z.string()).max(4).optional(),nutrition_status:z.string().optional(),store_name:z.string().nullable().optional(),aisle:z.string().nullable().optional(),retailer_product_url:z.string().nullable().optional()}).parse(raw);
  const original=products.find(p=>p.cellNumbers.includes(row.compared_cell))?.food;
  const details=safeDetails(row,grounded),key=shelfProductKey(details.food);
  if(!original||!original.rating||!isShelfHealthy(details.food)||seen.has(key)||!estimatedBenefitsDecision(original,details.food).benefits.length)continue;
  const text=(s:string|null|undefined)=>s?.trim().slice(0,200)||null;
  const url=shelfNineAlternativeSchema.shape.retailerUrl.safeParse(row.retailer_product_url??null);
  out.push(shelfNineAlternativeSchema.parse({...details,comparedCell:row.compared_cell,storeName:text(row.store_name),aisle:text(row.aisle),retailerUrl:url.success?url.data:null}));seen.add(key);
 }catch{/* Missing ancillary store/source fields must not suppress valid nutrition. */}
 return out;
}
type Transport=GroceryTransport;
export interface ShelfNineProvider{recognize(input:unknown,signal:AbortSignal,progress?:(r:ShelfNineResult)=>void):Promise<ShelfNineResult>}
export function createSingleShelfNineProvider(options:{root:string;gemini:Transport;gpt:Transport;directory?:StoreDirectory;audit?:BetaDiagnostics;model?:GroceryModel}):ShelfNineProvider{
 const cache=new Map<string,{hash:string;until:number;promise:Promise<ShelfNineResult>;pending:boolean}>(),sessions=new Set<string>();let active=0;
 return {async recognize(raw,parent,progress){
  const input=shelfNineRequestSchema.parse(raw);parent.throwIfAborted();
  const hash=createHash('sha256').update(JSON.stringify(input)).digest('hex'),key=input.sessionId+':'+input.batchId;
  for(const [k,v] of cache)if(!v.pending&&v.until<Date.now())cache.delete(k);
  input.context=normalizeGroceryLocation(input.context);
  const old=cache.get(key);if(old){if(old.hash!==hash)throw Error('SHELF_BATCH_CONFLICT');return old.promise;}
  if(active>=2||cache.size>=256)throw Error('SHELF_BUSY');
  let image=cleanProductJpeg(input.imageBase64,{maxBytes:SHELF_GRID_MAX_BYTES,maxDimension:2048,width:input.width,height:input.height});
  const model=options.model??'gemini-3.5-flash-lite',trace=newTrace(),start=Date.now();active++;sessions.add(input.sessionId);
  const log=(stage:string,code?:string)=>recordDiagnostic(options.audit,trace,{kind:'shelf_batch',sessionId:input.sessionId,batchId:input.batchId,stage,model,cells:input.cells.map(c=>c.cell),elapsedMs:Date.now()-start,...(code?{code}:{})});
  const entry={hash,until:Date.now()+15*60000,pending:true,promise:Promise.resolve({} as ShelfNineResult)};
  const run=async()=>{
   const signal=AbortSignal.any([parent,AbortSignal.timeout(180000)]);let products:ShelfNineProduct[]=[],alternatives:ShelfNineAlternative[]=[],html:string|null=null;
   const result=(complete:boolean)=>shelfNineResultSchema.parse({schemaVersion:2,sessionId:input.sessionId,batchId:input.batchId,batchIndex:input.batchIndex,model,complete,
    products,alternatives:complete?alternatives:[],duplicatesRemoved:products.reduce((n,p)=>n+p.cellNumbers.length-1,0),
    unresolvedCells:input.cells.filter(c=>!products.some(p=>p.cellNumbers.includes(c.cell))).map(c=>c.cell),searchSuggestionsHtml:html});
   const send=()=>{try{progress?.(result(false));}catch{log('progress_failed');}};
   try{
    log('started');let pending=input.cells,lastProgress='',firstProduct=false;
    for(let attempt=0;attempt<2&&pending.length;attempt++){
     signal.throwIfAborted();const attemptInput={...input,cells:pending};
     try{
      log(attempt?'recovery_dispatch':'dispatch');
      const response=await (model.startsWith('gemini')?options.gemini:options.gpt)(buildShelfNineRequest(options.root,attemptInput,image,options.directory,model),signal,{onText:text=>{
       if(signal.aborted)return;
       try{
        const partial=parseShelfNineProducts(partialShelfProducts(text),attemptInput);
        const joined=mergeBatchProducts([...products.filter(p=>!p.cellNumbers.some(c=>pending.some(x=>x.cell===c))),...partial]);
        const stamp=JSON.stringify(joined);
        if(stamp!==lastProgress&&partial.length){if(!firstProduct){firstProduct=true;log('first_product');}lastProgress=stamp;const before=products;products=joined;send();products=before;}
       }catch{/* Wait for a complete valid association; do not invent positions. */}
      }});
      signal.throwIfAborted();const evidence=parseGroceryResponse(response,model);
      const wire=z.object({products:z.array(z.unknown()).max(9),unidentified_cells:z.array(z.number().int()).max(9).optional(),alternatives:z.array(z.unknown()).max(3).optional()}).passthrough().parse(evidence.value);
      const found=parseShelfNineProducts(wire.products,attemptInput,evidence.searches>0,code=>log('cell_rejected',code));
      const explicit=new Set(wire.unidentified_cells??[]);
      if([...explicit].some(c=>!pending.some(p=>p.cell===c)||found.some(p=>p.cellNumbers.includes(c))))throw Error('SHELF_INVALID_ASSOCIATION');
      products=mergeBatchProducts([...products,...found]);
      html=evidence.html??html;
      const extra=parseAlternatives(wire.alternatives,products,evidence.searches>0);
      alternatives=[...alternatives,...extra].filter((a,i,all)=>all.findIndex(b=>shelfProductKey(a.food)===shelfProductKey(b.food))===i).slice(0,3);
      recordDiagnostic(options.audit,trace,{kind:'shelf_usage',model,inputTokens:evidence.inputTokens,outputTokens:evidence.outputTokens,cachedTokens:evidence.cachedTokens,elapsedMs:Date.now()-start,cells:pending.length});
      send();pending=pending.filter(c=>!found.some(p=>p.cellNumbers.includes(c.cell))&&!explicit.has(c.cell));
     }catch(error){
      const retry=error instanceof SyntaxError||error instanceof z.ZodError||error instanceof TypeError||
       error instanceof GroceryProviderError&&(/PROVIDER_HTTP_5/.test(error.code)||error.code==='PROVIDER_QUOTA')||
       error instanceof PhotoStreamFailure&&/^provider_http_(408|429|5)/.test(error.code);
      log('dispatch_failed',signal.aborted?'cancelled':retry?'recoverable_provider_error':'provider_error');
      if(signal.aborted)throw error;
      if(!retry||attempt===1){if(!products.length)throw error;break;}
     }
    }
    signal.throwIfAborted();
    if(products.some(p=>isShelfHealthy(p.food)))alternatives=[];
    const output=result(true);assertNineAssociation(input,output);log('complete');return output;
   }finally{image='';input.imageBase64='';active--;sessions.delete(input.sessionId);entry.pending=false;}
  };
  entry.promise=run();cache.set(key,entry);return entry.promise;
 }};
}

export function createShelfNineProvider(options:{root:string;gemini:Transport;gpt:Transport;directory?:StoreDirectory;audit?:BetaDiagnostics;supplementWaitMs?:number}):ShelfNineProvider{
 const gemini=createSingleShelfNineProvider({...options,model:'gemini-3.5-flash-lite'});
 const gpt=createSingleShelfNineProvider({...options,model:'gpt-6-luna'});
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
   let primary:ShelfNineResult|undefined,secondary:ShelfNineResult|undefined,closed=false;
   const emit=(result:ShelfNineResult)=>{if(parent.aborted||closed)return;try{progress?.(result);}catch{/* Observer failures cannot fail a model request. */}};
   // Calling Gemini first initiates its dispatch; GPT starts immediately without awaiting it.
   const first=gemini.recognize(input,parent,r=>emit({...r,primaryComplete:false}));
   const second=gpt.recognize(input,secondarySignal).then(r=>{
    secondary=r;
    if(primary)emit({...mergeParallelShelf(primary,r),complete:false,primaryComplete:true});
    return r;
   }).catch(()=>undefined);
   let timer:ReturnType<typeof setTimeout>|undefined;
   try{
    try{primary=await first;}catch(error){
     parent.throwIfAborted();
     // A failed Gemini request does not turn GPT into a competing verdict.
     // A complete GPT answer may stand alone as an explicitly attributed fallback.
     const fallback=await second;if(!fallback)throw error;
     const result={...fallback,primaryComplete:true,products:fallback.products.map(p=>({...p,sourceModel:'gpt-6-luna' as const}))};
     assertNineAssociation(input,result);return result;
    }
    parent.throwIfAborted();
    emit({...mergeParallelShelf(primary,secondary),complete:false,primaryComplete:true});
    if(!secondary)await Promise.race([second,new Promise<void>(resolve=>{timer=setTimeout(resolve,options.supplementWaitMs??20000);})]);
    parent.throwIfAborted();
    const result=mergeParallelShelf(primary,secondary);assertNineAssociation(input,result);return result;
   }finally{closed=true;if(timer)clearTimeout(timer);secondaryController.abort();input.imageBase64='';entry.pending=false;}
  };
  entry.promise=run();cache.set(key,entry);return entry.promise;
 }};
}

export function loadShelfNineProvider(root:string,audit?:BetaDiagnostics,directory?:StoreDirectory){
 try{
  const gemini=createGroceryTransport('gemini-3.5-flash-lite',readGeminiKey(join(root,'.tools/gemini/api-key')));
  const openai=createPhotoStreamTransport(readPrivateKey(join(root,'.tools/openai/api-key')),fetch,90000);
  const gpt:GroceryTransport=async(request,signal,hooks)=>JSON.parse(await openai(request,signal,hooks?.onText));
  return createShelfNineProvider({root,gemini,gpt,audit,directory});
 }catch{return undefined;}
}
