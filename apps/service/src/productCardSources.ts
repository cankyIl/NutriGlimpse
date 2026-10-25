import {diagnosticIdentity,diagnosticText,newTrace,recordDiagnostic,type BetaDiagnostics,type BetaEvent} from './betaDiagnostics.ts';
import {z} from 'zod';
import {setTimeout as wait} from 'node:timers/promises';
import {photoIdentitySchema,matchPhotoIdentity,type PhotoIdentity} from '../../../packages/core/src/productPhoto.ts';
import {normalizeBarcode} from '../../../packages/core/src/barcode.ts';
import {productMediaSchema,sourceCheckSchema} from '../../../packages/core/src/aiFoodReview.ts';
import type {PublicFood} from '../../../packages/core/src/publicFood.ts';
import type {PublicDatabase} from './publicDatabase.ts';
const candidate=z.object({code:z.string().regex(/^\d{8,14}$/),product_name:z.string().min(1).max(500),brands:z.union([z.string().min(1).max(500),z.array(z.string().max(100)).min(1).max(20)]).transform(v=>Array.isArray(v)?v.join(', '):v),image_front_small_url:z.string().max(500),countries_tags:z.array(z.string()).max(200).optional()});
const empty={image:null,reference:true as const};
// A reference image must match the variant as well as the brand and name.
// Media records stay separate from nutritional facts and never establish dietary safety.
export function mediaDecision(identity:PhotoIdentity,raw:unknown){
 const rejected=(reason:string)=>({media:null,reason});
 const parsed=candidate.safeParse(raw);if(!parsed.success)return rejected('missing_or_invalid_media_fields');const p=parsed.data;
 if(!normalizeBarcode(p.code))return rejected('invalid_barcode');if(!p.countries_tags?.includes('en:united-states'))return rejected('not_us_product');
 const mediaName=(s:string)=>s.replace(/\bsized\b/gi,'size').replace(/\b(original|classic|regular)\b/gi,'').replace(/\s+/g,' ').trim();
 if(!matchPhotoIdentity({...identity,name:mediaName(identity.name??''),variant:identity.variant?mediaName(identity.variant)||null:null},[{provider:'off' as const,id:p.code,sourceDate:null,name:mediaName(p.product_name),brand:p.brands}]).length)return rejected('identity_or_variant_mismatch');
 const words=(s:string)=>new Set(s.toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' '));
 const wanted=words([identity.name,identity.variant].filter(Boolean).join(' ')),found=words(p.product_name);
 if(['frosted','unfrosted','bites','mini','big','spoon','chocolate','gluten','organic','flavored','bran'].some(w=>wanted.has(w)!==found.has(w)))return rejected('formulation_or_shape_mismatch');
 const result=productMediaSchema.safeParse({reference:true,image:{url:p.image_front_small_url,license:'CC-BY-SA-3.0',sourceUrl:'https://world.openfoodfacts.org/product/'+p.code}});
 return result.success?{media:result.data,reason:'matching_image'}:rejected('missing_or_unsafe_image_url');
}
export function mediaFor(identity:PhotoIdentity,raw:unknown){return mediaDecision(identity,raw).media;}
class MediaLookupFailure extends Error{readonly code:string;readonly status?:number;constructor(code:string,status?:number){super(code);this.code=code;this.status=status;}}
export function createProductCardSources(catalog:PublicDatabase,resolve:(identities:PhotoIdentity[],signal:AbortSignal)=>Promise<(PublicFood|null)[]>,contact:string,fetcher:typeof fetch=fetch,audit?:BetaDiagnostics){
 const misses=new Map<string,number>();let queue:Promise<unknown>=Promise.resolve();
 async function search(identity:PhotoIdentity,signal:AbortSignal,log:(event:Omit<Extract<BetaEvent,{kind:'lookup'}>,'kind'|'operation'|'product'>)=>void){
  const deadline=Date.now()+23000;
  while(!catalog.reserveOffSearch()){if(Date.now()>=deadline)throw new MediaLookupFailure('search_slot_timeout');await wait(250,undefined,{signal});}
  signal.throwIfAborted();
  const quote=(s:string)=>JSON.stringify(s.replace(/[\u0000-\u001f]/g,' ').slice(0,160));
  const words=(identity.name??'').replace(/[^a-zA-Z0-9 ]/g,' ').trim();
  const query='brands:'+quote(identity.brand??'')+' countries_tags:"en:united-states" '+words;
  log({outcome:'search_started',query:diagnosticText(query)!});
  const response=await fetcher('https://search.openfoodfacts.org/search',{method:'POST',redirect:'error',signal:AbortSignal.any([signal,AbortSignal.timeout(7000)]),headers:{'User-Agent':'CongressGroceryBeta/0.1 ('+contact+')','Accept':'application/json','Content-Type':'application/json'},body:JSON.stringify({q:query,page_size:20,fields:['code','product_name','brands','countries_tags','image_front_small_url'],langs:['en']})});
  if(!response.ok||!response.body){if(response.status===429||response.status>=500)catalog.coolOffSearch();void response.body?.cancel().catch(()=>{});throw new MediaLookupFailure(response.status===429?'upstream_rate_limited':'upstream_http_error',response.status);}
  const reader=response.body.getReader();let bytes=0,raw='';const decoder=new TextDecoder();
  try{for(;;){const next=await reader.read();if(next.done)break;bytes+=next.value.length;if(bytes>128000)throw new MediaLookupFailure('upstream_response_too_large');raw+=decoder.decode(next.value,{stream:true});}}finally{await reader.cancel();}
  const data=JSON.parse(raw+decoder.decode());if(data.timed_out===true||data.errors?.length)throw new MediaLookupFailure('upstream_incomplete_search');
  const rawRows=z.array(z.unknown()).max(20).parse(data.hits);
  const rejected:Record<string,number>={};for(const row of rawRows){const verdict=mediaDecision(identity,row);if(!verdict.media)rejected[verdict.reason]=(rejected[verdict.reason]??0)+1;}
  log({outcome:'search_results',count:rawRows.length,rejected,upstreamStatus:response.status});
  return rawRows.flatMap(row=>{const parsed=candidate.safeParse(row);return parsed.success?[parsed.data]:[];});
 }
 function cached(identity:PhotoIdentity){
  for(const row of catalog.mediaProducts()){const found=mediaFor(identity,row);if(found)return found;}
  const matches=matchPhotoIdentity(identity,catalog.exportFoods());
  const found=matches.find(f=>f.image);return found?.image?productMediaSchema.parse({image:found.image,reference:true}):null;
 }
 return {async sources(input:unknown,signal:AbortSignal,trace=newTrace()){
  const identity=photoIdentitySchema.parse(input),started=Date.now();
  const log=(outcome:string,count?:number,sourceIds?:string[])=>recordDiagnostic(audit,trace,{kind:'lookup',operation:'sources',product:diagnosticIdentity(identity),outcome,count,sourceIds,elapsedMs:Date.now()-started});
  log('source_lookup_started');
  try{
   const resolved=await resolve([identity],signal);signal.throwIfAborted();
   const foods=matchPhotoIdentity(identity,[...resolved.filter((f):f is PublicFood=>f!==null),...catalog.exportFoods()]),seen=new Set<string>();
   const result=sourceCheckSchema.parse({foods:foods.filter(f=>{const key=f.provider+f.id;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,3),match:'possible',checkedAt:new Date().toISOString()});
   log(result.foods.length?'possible_source_matches':'no_matching_source_record',result.foods.length,result.foods.map(f=>f.provider+':'+f.id));return result;
  }catch(error){log(signal.aborted?'cancelled':'source_lookup_failed');throw error;}
 },async media(input:unknown,signal:AbortSignal,trace=newTrace()){
  const identity=photoIdentitySchema.parse(input),started=Date.now();signal.throwIfAborted();
  const log=(event:Omit<Extract<BetaEvent,{kind:'lookup'}>,'kind'|'operation'|'product'>)=>recordDiagnostic(audit,trace,{kind:'lookup',operation:'media',product:diagnosticIdentity(identity),elapsedMs:Date.now()-started,...event});
  if(identity.status!=='identified'||!identity.brand||!identity.name){log({outcome:'identity_incomplete'});return empty;}
  const hit=cached(identity);if(hit){log({outcome:'cache_hit'});return hit;}
  const key=JSON.stringify([identity.brand,identity.name,identity.variant]);if((misses.get(key)??0)>Date.now()){log({outcome:'negative_cache_hit'});return empty;}
  log({outcome:'search_queued'});
  const task=queue.catch(()=>{}).then(async()=>{
   signal.throwIfAborted();const hit=cached(identity);if(hit){log({outcome:'cache_hit_after_queue'});return hit;}
   if((misses.get(key)??0)>Date.now()){log({outcome:'negative_cache_hit'});return empty;}
   let outcome='no_matching_image';
   try{
    const rows=await search(identity,signal,log);signal.throwIfAborted();
    const usable=rows.filter(p=>p.countries_tags?.includes('en:united-states')&&normalizeBarcode(p.code)&&productMediaSchema.safeParse({reference:true,image:{url:p.image_front_small_url,license:'CC-BY-SA-3.0',sourceUrl:'https://world.openfoodfacts.org/product/'+p.code}}).success);
    if(usable.length)catalog.cacheMediaProducts(usable);
    for(const row of usable){const found=mediaFor(identity,row);if(found){log({outcome:'matching_image',sourceIds:['off:'+row.code]});return found;}}
   }catch(error){
    if(signal.aborted){log({outcome:'cancelled'});signal.throwIfAborted();}
    outcome=error instanceof MediaLookupFailure?error.code:error instanceof Error&&error.name==='TimeoutError'?'upstream_timeout':'upstream_network_or_format_error';
    log({outcome,upstreamStatus:error instanceof MediaLookupFailure?error.status:undefined});
   }
   if(misses.size>=256)misses.delete(misses.keys().next().value!);misses.set(key,Date.now()+60000);log({outcome:outcome==='no_matching_image'?outcome:'image_unavailable'});return empty;
  });queue=task;return task;
 }};
}
