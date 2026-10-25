import {comparisonGroups,catalogCandidateLimit} from './comparisonGroups.ts';
import {z} from 'zod';
import {foodSchema,type PublicFood} from './publicFood.ts';
import {normalizeBarcode} from './barcode.ts';
export const betaCatalogUrl='https://grocery.serveforwad.com';
export interface PublicFoodCache { read():Promise<PublicFood[]>; save(food:PublicFood):Promise<void>; clear():Promise<void> }
export function parseFoodCache(value:unknown){return z.array(foodSchema).max(100).parse(value);}
export function mergeFoodCache(current:unknown,food:unknown):PublicFood[]{
 const list=parseFoodCache(current), next=foodSchema.parse(food);
 const old=list.find(f=>f.provider===next.provider&&f.id===next.id);
 const chosen=old&&Date.parse(old.retrievedAt)>Date.parse(next.retrievedAt)?old:next;
 return [chosen,...list.filter(f=>f.provider!==next.provider||f.id!==next.id)].slice(0,100);
}
export function foodIsStale(food:PublicFood,now=Date.now()){return now-Date.parse(food.retrievedAt)>7*86400000;}
export async function searchCatalog(query:string,mode:'name'|'barcode',signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<PublicFood[]>{
 const term=query.trim();
 if(mode==='name'&&(term.length<2||term.length>80||/[\u0000-\u001f\u007f]/.test(term)))throw new Error('Enter a food name between 2 and 80 characters.');
 const barcode=mode==='barcode'?normalizeBarcode(term):null;
 if(mode==='barcode'&&!barcode)throw new Error('Check the barcode digits.');
 const controller=new AbortController();
 const abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});
 if(signal.aborted)controller.abort();
 const timer=setTimeout(abort,15000);
 try{
  const response=await fetcher(betaCatalogUrl+'/v2/catalog/'+(mode==='barcode'?'barcodes/'+barcode:'search/'+encodeURIComponent(term)),{signal:controller.signal,redirect:'error'});
  if(!response.ok)throw new Error('Food lookup is unavailable. Try saved foods or retry later.');
  const text=await response.text();if(text.length>400000)throw new Error('Food response is too large.');
  const result=z.object({schemaVersion:z.literal(2),synthetic:z.literal(false),foods:z.array(foodSchema.extend({stale:z.boolean()})).max(20)}).passthrough().parse(JSON.parse(text));
  return result.foods.map(({stale,...food})=>foodSchema.parse(food));
 }finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
}

export async function fetchComparableFoods(group:import('./catalogAlternatives.ts').ComparisonGroup,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<PublicFood[]>{
 if(!comparisonGroups.includes(group))throw Error('Invalid comparison request');
 if(signal.aborted)throw Error('Cancelled');
 const controller=new AbortController();const abort=()=>controller.abort();signal.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,15000);
 try{
  const response=await fetcher(betaCatalogUrl+'/v2/catalog/comparable/'+group,{signal:controller.signal,redirect:'error'});
  if(!response.ok)throw Error('Comparable catalog unavailable');
  const raw=await response.text();if(raw.length>7500000)throw Error('Comparable catalog exceeds limit');
  if(signal.aborted||controller.signal.aborted)throw Error('Cancelled');
  return z.object({schemaVersion:z.literal(2),synthetic:z.literal(false),foods:z.array(foodSchema.extend({stale:z.boolean()})).max(catalogCandidateLimit)}).passthrough().parse(JSON.parse(raw)).foods.map(({stale,...food})=>foodSchema.parse(food));
 }finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
}
