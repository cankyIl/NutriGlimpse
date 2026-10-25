import {exactSourceUrl} from './geminiPhotoAdapter.ts';
import {groceryUrl} from '../../../packages/core/src/groceryReview.ts';
import {readProductPage} from './geminiSearchPages.ts';

const googleRedirect=(value:unknown):value is string=>{
 if(typeof value!=='string'||!groceryUrl.safeParse(value).success)return false;
 const url=new URL(value);
 return url.hostname==='vertexaisearch.cloud.google.com'&&/^\/grounding-api-redirect\/[A-Za-z0-9_=-]{20,}$/.test(url.pathname)&&!url.search&&!url.hash;
};
const foods=(value:any):any[]=>[value?.product,...(Array.isArray(value?.alternatives)?value.alternatives.slice(0,12):[])].filter(Boolean);

/** Google-issued redirects establish citation provenance, not verification of each nutrient.
 * Supports both the older source-list answer and the simple per-food answer.
 * Only Google is contacted; redirect destinations are never fetched here.
 */
export async function resolveGeminiGroundingSources(value:unknown,urls:ReadonlySet<string>,searches:number,signal:AbortSignal,fetcher:typeof fetch=fetch){
 const output=structuredClone(value) as any,verified=new Set<string>([...urls].filter(url=>!googleRedirect(url)));
 if(!searches)return {value:output,urls:verified};
 const rows=foods(output);
 const candidates=[...urls,...(Array.isArray(output?.sources)?output.sources.map((s:any)=>s?.url):[]),...rows.flatMap(food=>[food.source_url,food.retailer_url,food.aisle?.source_url])];
 const redirects=[...new Set(candidates.filter(googleRedirect))].slice(0,12),resolved=new Map<string,string>();
 for(let start=0;start<redirects.length;start+=4){
  signal.throwIfAborted();
  await Promise.all(redirects.slice(start,start+4).map(async url=>{
   try{
    const response=await fetcher(url,{method:'GET',redirect:'manual',signal:AbortSignal.any([signal,AbortSignal.timeout(4000)])});
    void response.body?.cancel().catch(()=>{});
    if(![301,302,303,307,308].includes(response.status))return;
    const destination=exactSourceUrl(response.headers.get('location'));
    if(destination&&new URL(destination).hostname!=='vertexaisearch.cloud.google.com'){resolved.set(url,destination);verified.add(destination);}
   }catch{/* Unsupported citations remain unverified; never retry a destination. */}
  }));
 }
 signal.throwIfAborted();
 for(const source of Array.isArray(output?.sources)?output.sources:[])if(resolved.has(source.url))source.url=resolved.get(source.url);
 for(const food of rows){
  for(const field of ['source_url','retailer_url'])if(resolved.has(food[field]))food[field]=resolved.get(food[field]);
  if(food.aisle&&resolved.has(food.aisle.source_url))food.aisle.source_url=resolved.get(food.aisle.source_url);
 }
 return {value:output,urls:verified};
}

/** Check only an aisle source actually supplied by native grounding. No search/model call.
 * Branch/town and exact aisle matching still happen in the existing card adapter.
 */
export async function nativeAisleEvidence(value:unknown,urls:ReadonlySet<string>,signal:AbortSignal,reader=readProductPage){
 const grounded=new Set([...urls].flatMap(url=>exactSourceUrl(url)??[]));
 const targets=[...new Set(foods(value).filter(food=>(food.aisle?.number!=null||food.aisle?.section)).flatMap(food=>{
  const url=exactSourceUrl(food.aisle?.source_url);return url&&grounded.has(url)?[url]:[];
 }))].slice(0,4);
 if(!targets.length)return [];
 const bounded=AbortSignal.any([signal,AbortSignal.timeout(2500)]);
 const results=await Promise.all(targets.map(async url=>{
  try{const page=await reader(url,bounded);return page?{url,resolvedUrl:page.url,pageText:page.text}:null;}
  catch{return null;}
 }));
 signal.throwIfAborted();
 return [{status:'ok',results:results.filter(row=>row!==null)}];
}
