import {productTitleKey} from '../../../packages/core/src/productTitleKey.ts';
import type {StoreDirectory} from '../../../packages/core/src/storeDetection.ts';
import {GROCERY_SHOPPER_CONSENT} from '../../../packages/core/src/groceryShopper.ts';
import {approvedGroceryPrompt} from './groceryPromptTemplate.ts';
import {SHOPPER_BOUNDARY} from './groceryShopperPrompt.ts';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {GroceryContext,GroceryWire} from '../../../packages/core/src/groceryReview.ts';
import {groceryWireSchema,GROCERY_PARALLEL_CONSENT} from '../../../packages/core/src/groceryReview.ts';
import {adaptSimpleGroceryAnswer} from './geminiSimpleReview.ts';
import type {GroceryTransport} from './groceryReviewProvider.ts';

// Legacy Google-only consent must not authorize health or store context to OpenAI.
export function supplementContext(context:GroceryContext,consentVersion:unknown):GroceryContext{
 const permitted=consentVersion===GROCERY_PARALLEL_CONSENT;
 if(permitted&&context.shopper?.consentVersion===GROCERY_SHOPPER_CONSENT)return context;
 return {healthConditions:[],dietaryRestrictions:[],store:permitted?context.store:null,...(permitted&&context.location?{location:context.location}:{})};
}
export function buildAlternativeRequest(image:string,root:string,context:GroceryContext={healthConditions:[],dietaryRestrictions:[],store:null},directory?:StoreDirectory):Record<string,unknown>{
 const schema=JSON.parse(readFileSync(join(root,'apps/service/prompts/gemini-product-photo-simple.schema.json'),'utf8'));
 function strict(node:any){if(!node||typeof node!=='object')return;if(node.properties){node.required=Object.keys(node.properties);node.additionalProperties=false;for(const v of Object.values(node.properties))strict(v);}if(node.items)strict(node.items);}
 strict(schema);
 return {model:'gpt-6-luna',store:false,...(context.shopper?{instructions:SHOPPER_BOUNDARY}:{}),
  input:[{role:'user',content:[{type:'input_text',text:approvedGroceryPrompt(context,root,directory)},{type:'input_image',image_url:'data:image/jpeg;base64,'+image,detail:'high'}]}],
  tools:[{type:'web_search',external_web_access:true,search_context_size:'low'}],max_tool_calls:3,include:['web_search_call.action.sources'],
  reasoning:{effort:'none'},max_output_tokens:5000,text:{format:{type:'json_schema',name:'grocery_alternatives',strict:true,schema}}};
}
export type SupplementState={status:'pending'|'completed'|'failed'|'timed_out'|'cancelled';elapsedMs:number;raw?:unknown;errorCode?:string};
/** No rejected background promises or post-cancellation mutation, even with an uncooperative transport. */
export function startAlternativeRequest(transport:GroceryTransport,request:Record<string,unknown>,parent:AbortSignal,timeoutMs=30000){
 const controller=new AbortController(),started=performance.now();let finished=false,state:SupplementState={status:'pending',elapsedMs:0};
 let resolve!:(s:SupplementState)=>void;const done=new Promise<SupplementState>(r=>{resolve=r;});
 let deadline:ReturnType<typeof setTimeout>|undefined;
 const settle=(next:Omit<SupplementState,'elapsedMs'>)=>{if(finished)return;finished=true;clearTimeout(deadline);parent.removeEventListener('abort',cancel);state={...next,elapsedMs:Math.round(performance.now()-started)};resolve(state);};
 const stop=(status:'cancelled'|'timed_out')=>{settle({status});controller.abort();};
 const cancel=()=>stop('cancelled');parent.addEventListener('abort',cancel,{once:true});
 if(parent.aborted)cancel();else{
  deadline=setTimeout(()=>stop('timed_out'),timeoutMs);deadline.unref();
  try{Promise.resolve(transport(request,controller.signal)).then(raw=>settle({status:'completed',raw}),()=>settle({status:controller.signal.aborted?'cancelled':'failed',errorCode:'SUPPLEMENT_REQUEST_FAILED'}));}
  catch{settle({status:'failed',errorCode:'SUPPLEMENT_REQUEST_FAILED'});}
 }
 return {cancel,snapshot:()=>state,async finish(waitMs=30000){
  if(finished)return state;
  const wait=setTimeout(()=>stop('timed_out'),waitMs);wait.unref();
  try{return await done;}finally{clearTimeout(wait);}
 }};
}
// Normalize punctuation, pack weights and default/marketing labels; retain brand and named flavor qualifiers.
export const alternativeKey=productTitleKey;
export function mergeAlternativeSupplement(primary:GroceryWire,value:unknown,context:GroceryContext,urls:ReadonlySet<string>){
 const review=structuredClone(primary),audit:{foodId:string;code:string}[]=[];
 if(!review.original||!['neutral','not_healthy'].includes(review.original.assessment.rating??'')||review.recommendations.length>=3)return {review,audit,added:0};
 // GPT's original/product field is ignored entirely. Gemini alone supplies the authoritative original.
 const data=value as {alternatives?:unknown};
 const converted=adaptSimpleGroceryAnswer({product:null,alternatives:data?.alternatives},context,urls,[],{allowUnverifiedEstimates:true,primaryOriginal:review.original,idPrefix:'gpt-'});
 audit.push(...converted.audit);
 const seen=new Set([review.original.identity.name,...review.recommendations.map(r=>r.food.identity.name)].map(alternativeKey));
 let added=0;
 for(const candidate of converted.eligible){
  const key=alternativeKey(candidate.food.identity.name);
  if(seen.has(key)){
    // Keep Gemini's identity, nutrition, rating and order. A duplicate can still supply missing display metadata.
    const existing=review.recommendations.find(r=>alternativeKey(r.food.identity.name)===key)?.food;
    if(existing&&!existing.availability.storeName&&candidate.food.availability.storeName){
     existing.availability=structuredClone(candidate.food.availability);
     for(const source of converted.review.sources.filter(s=>s.id===existing.availability.sourceId||s.id===existing.availability.aisleSourceId))if(!review.sources.some(s=>s.id===source.id)&&review.sources.length<24)review.sources.push(source);
     audit.push({foodId:existing.id,code:'duplicate_retailer_merged'});
    }
    audit.push({foodId:candidate.food.id,code:'supplement_duplicate'});continue;
   }
  if(review.recommendations.length>=3)break;
  const sources=converted.review.sources.filter(s=>s.id.startsWith(candidate.food.id+'-'));
  if(review.sources.length+sources.length>24){audit.push({foodId:candidate.food.id,code:'supplement_source_limit'});continue;}
  seen.add(key);review.recommendations.push(candidate);review.sources.push(...sources);added++;
  audit.push({foodId:candidate.food.id,code:'supplement_added'});
 }
 review.recommendationShortfall=review.recommendations.length>=3?null:primary.recommendationShortfall;
 return {review:groceryWireSchema.parse(review),audit,added};
}
