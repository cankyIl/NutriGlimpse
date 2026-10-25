import {createHash} from 'node:crypto';
import {lstatSync,readFileSync,mkdirSync} from 'node:fs';
import {z} from 'zod';
import {availabilityRequestSchema,availabilityResultSchema,safeAvailabilityLink,sameRetailer,type AvailabilityRequest,type AvailabilityResult,type AvailabilityProduct,type AvailabilityListing} from '../../../packages/core/src/nearbyAvailability.ts';
import {straightLineMiles,type Coordinates} from '../../../packages/core/src/stores.ts';
import {storeDisplayAddress} from '../../../packages/core/src/storePresentation.ts';
import type {StoreDirectory} from '../../../packages/core/src/storeDetection.ts';
import {availabilityBudget} from './availabilityBudget.ts';

export type SearchCity=Coordinates&{name:string};
export type Target={selectedRetailer?:string;queryLocation:string;providerLocation:string;coordinates:Coordinates};
const normalize=(v:string)=>v.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/['’]/g,'').replace(/\bsized\b/g,'size').replace(/[^a-z0-9.]+/g,' ').trim();
const units=/\b(\d+(?:\.\d+)?)\s*(fl\s*oz|ounces?|oz|grams?|g|kilograms?|kg|pounds?|lbs?|milliliters?|ml|liters?|l)\b/i;
function sizeOf(v:string){
 const m=units.exec(v);if(!m)return null;const u=m[2].toLowerCase().replace(/\s/g,'');
 const volume=['floz','ml','milliliter','milliliters','l','liter','liters'].includes(u);
 const factor=u==='floz'?29.5735:u==='l'||u.startsWith('liter')?1000:u==='kg'||u.startsWith('kilogram')?1000:u==='oz'||u.startsWith('ounce')?28.3495:u.startsWith('lb')||u.startsWith('pound')?453.592:1;
 return {amount:Number(m[1])*factor,volume};
}
const stop=new Set('a an the and with for of in by jar jars bottle bottles box boxes pack packs size ounce ounces oz gram grams g lb fl ct count'.split(' '));
const tokens=(v:string)=>normalize(v.replace(units,' ')).split(/\s+/).filter(w=>w&&!stop.has(w)&&!['original','classic','regular'].includes(w)&&!/^\d+(?:\.\d+)?$/.test(w));
const variantWords='sweet traditional spicy roasted garlic cheese vodka organic unsweetened sweetened salted unsalted reduced light fat free chocolate vanilla strawberry blueberry raspberry honey cinnamon maple peanut almond frosted unfrosted bran multigrain gluten decaf whipped spread canola olive skim low plain italian tomato basil'.split(' ');
/** Brand + name + explicit variant must agree. Different sizes/formulations never masquerade as the requested package. */
export function matchAvailabilityTitle(product:AvailabilityProduct,title:string):{packNote:string|null}|null{
 const wanted=new Set(tokens([product.brand,product.name,product.variant].filter(Boolean).join(' '))),found=new Set(tokens(title));
 if(!tokens(product.brand).every(t=>found.has(t))||!tokens(product.name+' '+(product.variant??'')).every(t=>found.has(t)))return null;
 if(variantWords.some(t=>found.has(t)!==wanted.has(t)))return null;
 const desired=sizeOf(product.size??''),actual=sizeOf(title);
 if(desired&&actual&&(desired.volume!==actual.volume||Math.abs(desired.amount-actual.amount)>Math.max(1,desired.amount*0.02)))return null;
 const pack=/(?:\bpack\s*of\s*(\d+)|\b(\d+)\s*[- ]?pack\b|\b(\d+)\s*x\b)/i.exec(title);
 const count=pack?Number(pack[1]??pack[2]??pack[3]):1;
 if(!Number.isFinite(count)||count>24)return null;
 return {packNote:count>1?count+'-pack':desired&&!actual?'Check package size':!desired?'Check package size':null};
}
export function resolveAvailabilityTarget(input:AvailabilityRequest,directory:StoreDirectory,cities:SearchCity[]):Target|null{
 const store=input.location.kind==='store'?directory.stores.find(s=>s.id===(input.location as {id:string}).id):null;
 if(input.location.kind==='store'&&!store)return null;
 const raw=store?.coordinates??input.location as Coordinates;
 const coordinates=store?raw:{latitude:Math.round(raw.latitude*100)/100,longitude:Math.round(raw.longitude*100)/100};
 let closest:SearchCity|undefined,distance=Infinity;
 for(const city of cities){const d=straightLineMiles(coordinates,{latitude:city.latitude,longitude:city.longitude});if(d<distance){closest=city;distance=d;}}
 if(!closest||distance>50)return null;
 return {selectedRetailer:store?.name,coordinates,providerLocation:closest.name,queryLocation:store&&store.address?storeDisplayAddress(store):coordinates.latitude.toFixed(2)+', '+coordinates.longitude.toFixed(2)};
}
// Branch ids verified against retailer store locators, 2026-10-17. Other branches
// remain explicit unconfirmed listings; never infer a branch from chain name alone.
const branches=[
 {host:'shaws.com',parameter:'storeId',id:'2470',address:'50 Boston Turnpike Rd, Shrewsbury, MA 01545',city:'Shrewsbury,Massachusetts,United States'},
 {host:'target.com',parameter:'sid',id:'1496S',address:'330 Turnpike Rd, Westborough, MA 01581',city:'Westborough,Massachusetts,United States'},
 {host:'target.com',parameter:'region_id',id:'1496',address:'330 Turnpike Rd, Westborough, MA 01581',city:'Westborough,Massachusetts,United States'},
 {host:'walmart.com',parameter:'wl13',id:'2158',address:'200 Otis St, Northborough, MA 01532',city:'Northborough,Massachusetts,United States'},
];
const rowSchema=z.object({title:z.string().min(1).max(500),source:z.string().min(1).max(160),link:z.string().max(2000),price:z.string().max(40).optional(),shipping:z.string().max(200).optional(),delivery:z.string().max(200).optional(),location:z.string().max(160).optional(),extensions:z.array(z.string().max(200)).max(20).optional()});
export function parseAvailability(data:unknown,product:AvailabilityProduct,target:Target,cities:SearchCity[]):AvailabilityListing[]{
 if(!data||typeof data!=='object')throw Error('Invalid provider result');
 const d=data as Record<string,unknown>;if(d.error||!d.search_metadata||typeof d.search_metadata!=='object'||(d.search_metadata as {status?:string}).status!=='Success')throw Error('Incomplete provider result');
 const result:AvailabilityListing[]=[];
 // Google's Local Stores & Options can provide exact product stock evidence
 // together with a branch address and coordinates in the SAME response.
 const local=d.local_results;
 const places=local&&typeof local==='object'&&!Array.isArray(local)?(local as {places?:unknown}).places:local;
 if(Array.isArray(places))for(const value of places.slice(0,20)){
  const parsed=z.object({title:z.string().min(1).max(160),address:z.string().min(1).max(500),
   gps_coordinates:z.object({latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180)}),
   links:z.object({website:z.string().max(2000)}),extensions:z.array(z.string().max(500)).max(20),
   sponsored:z.boolean().optional(),
  }).safeParse(value);
  if(!parsed.success)continue;const place=parsed.data;
  if(!safeAvailabilityLink(place.links.website)||straightLineMiles(target.coordinates,place.gps_coordinates)>15)continue;
  for(const extension of place.extensions){
   const stock=/^In stock:\s*(.+?)(?:\s*[·•]\s*.*)?$/i.exec(extension);
   if(!stock)continue;const match=matchAvailabilityTitle(product,stock[1]);if(!match)continue;
   result.push({retailer:place.title,title:stock[1],url:place.links.website,price:null,address:place.address,locationLabel:null,
    status:'in-stock',sponsored:place.sponsored===true,packNote:match.packNote});
   break;
  }
 }
 for(const [section,sponsored] of [['shopping_results',true],['immersive_products',false]] as const){
  const rows=d[section];if(!Array.isArray(rows))continue;
  for(const raw of rows.slice(0,60)){
   const parsed=rowSchema.safeParse(raw);if(!parsed.success)continue;const row=parsed.data;
   const match=matchAvailabilityTitle(product,row.title);if(!match||!safeAvailabilityLink(row.link))continue;
   const url=new URL(row.link),evidence=[row.shipping,row.delivery,...row.extensions??[]].filter(Boolean).join(' ');
   if(/\b(out of stock|unavailable|sold out)\b/i.test(evidence))continue;
   const branch=branches.find(b=>(url.hostname===b.host||url.hostname.endsWith('.'+b.host))&&url.searchParams.get(b.parameter)===b.id);
   const city=branch?cities.find(c=>c.name.replace(/\s*,\s*/g,',')===branch.city):undefined;
   if(city&&straightLineMiles(target.coordinates,{latitude:city.latitude,longitude:city.longitude})>15)continue;
   const nearby=/\bnearby\b/i.test(row.location??'')?row.location!:null;
   const distance=/\b(\d+(?:\.\d+)?)\s*mi\b/.exec(nearby??'');if(distance&&Number(distance[1])>15)continue;
   const local=!!(branch&&city)||!!nearby;
   const pickup=/\bpick\s*up today\b/i.test(evidence)&&local;
   const address=branch&&city?branch.address:null;
   const entry:AvailabilityListing={retailer:row.source,title:row.title,url:row.link,price:row.price??null,address,
    locationLabel:address?null:nearby,status:pickup?'pickup-today':local?'nearby-listing':'listing',sponsored,packNote:match.packNote};
   if(result.some(r=>r.retailer===entry.retailer&&r.address===entry.address&&r.packNote===entry.packNote))continue;
   result.push(entry);
  }
 }
 return rankAvailabilityListings(result,target.selectedRetailer);
}
export function rankAvailabilityListings(result:AvailabilityListing[],selectedRetailer?:string):AvailabilityListing[]{
 const rank=(r:AvailabilityListing)=>r.status==='pickup-today'?0:r.status==='in-stock'?1:r.status==='nearby-listing'?2:3;
 const sorted=result.sort((a,b)=>Number(sameRetailer(selectedRetailer,b.retailer))-Number(sameRetailer(selectedRetailer,a.retailer))||rank(a)-rank(b)||Number(!!a.packNote)-Number(!!b.packNote));
 const seen=new Set<string>();
 return sorted.filter(row=>{
  const key=row.address?new URL(row.url).hostname.replace(/^www\./,'')+'|'+normalize(row.address):row.retailer;
  if(seen.has(key))return false;seen.add(key);return true;
 }).slice(0,3);
}

/** Shopping rows are product listings. Only explicit pickup evidence tied to a known nearby branch can be promoted. */
export function parseSerperAvailability(data:unknown,product:AvailabilityProduct,target:Target,cities:SearchCity[]):AvailabilityListing[]{
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Invalid Serper result');
 const d=data as Record<string,unknown>;
 if(d.error||d.message||!Array.isArray(d.shopping)||(typeof d.statusCode==='number'&&d.statusCode>=400))throw Error('Incomplete Serper result');
 const ordinary:unknown[]=[],sponsored:unknown[]=[];
 for(const value of d.shopping.slice(0,60)){
  if(!value||typeof value!=='object'||Array.isArray(value))continue;
  const row=value as Record<string,unknown>;
  (row.sponsored===true?sponsored:ordinary).push(row);
 }
 return parseAvailability({search_metadata:{status:'Success'},immersive_products:ordinary,shopping_results:sponsored},product,target,cities);
}
type SerperConfig={key:string;reserve:()=>boolean};
type SearchOptions={key?:string;serper?:SerperConfig;directory:StoreDirectory;cities:SearchCity[];reserve:()=>boolean;fetcher?:typeof fetch;now?:()=>number;timeoutMs?:number;primaryTimeoutMs?:number;fallbackTimeoutMs?:number};
export function createNearbyAvailability({key,serper,directory,cities,reserve,fetcher=fetch,now=()=>Date.now(),timeoutMs=18000,primaryTimeoutMs=10000,fallbackTimeoutMs=7000}:SearchOptions){
 const cache=new Map<string,{until:number;result:AvailabilityResult}>();
 const pending=new Map<string,{promise:Promise<AvailabilityResult>;controller:AbortController;users:number}>();
 let active=0;
 const empty=(status:AvailabilityResult['status'],source:AvailabilityResult['source']='Google via SerpApi'):AvailabilityResult=>({schemaVersion:2,status,listings:[],checkedAt:new Date(now()).toISOString(),source,cached:false});
 async function readProvider(url:URL|string,init:RequestInit,signal:AbortSignal,deadline:number):Promise<unknown>{
  if(signal.aborted)throw Error('Cancelled');
  const controller=new AbortController(),abort=()=>controller.abort();
  signal.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(abort,deadline);
  try{
   const response=await fetcher(url,{...init,signal:controller.signal,redirect:'error'});
   if(!response.ok||response.redirected||!response.body){void response.body?.cancel().catch(()=>{});throw Error('Provider unavailable');}
   const reader=response.body.getReader(),decoder=new TextDecoder();let bytes=0,raw='';
   try{for(;;){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>2000000)throw Error('Too large');raw+=decoder.decode(part.value,{stream:true});}}finally{await reader.cancel().catch(()=>{});}
   if(signal.aborted||controller.signal.aborted)throw Error('Cancelled');
   return JSON.parse(raw+decoder.decode());
  }finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
 }
 async function primary(input:AvailabilityRequest,target:Target,signal:AbortSignal,deadline:number):Promise<AvailabilityResult>{
  if(signal.aborted||!key)return empty('unavailable');
  if(!reserve())return empty('limit-reached');
  try{
   const phrase=[input.product.brand,input.product.name,input.product.variant].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
   const url=new URL('https://serpapi.com/search.json');
   for(const [k,v] of Object.entries({engine:'google_ads',q:'Find '+phrase+' in stock '+(target.selectedRetailer?'at '+target.selectedRetailer+' near ':'near me at ')+target.queryLocation,location:target.providerLocation,hl:'en',gl:'us',api_key:key,output:'json'}))url.searchParams.set(k,v);
   const data=await readProvider(url,{headers:{Accept:'application/json'}},signal,deadline);
   const listings=parseAvailability(data,input.product,target,cities);
   return availabilityResultSchema.parse({...empty(listings.length?'ok':'no-matches'),listings});
  }catch{return empty('unavailable');}
 }
 async function fallback(input:AvailabilityRequest,target:Target,signal:AbortSignal):Promise<AvailabilityResult>{
  const source='Google via Serper';
  if(signal.aborted||!serper)return empty('unavailable',source);
  if(!serper.reserve())return empty('limit-reached',source);
  try{
   const q=[input.product.brand,input.product.name,input.product.variant,input.product.size].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
   const data=await readProvider('https://google.serper.dev/shopping',{method:'POST',headers:{'X-API-KEY':serper.key,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({q,location:target.providerLocation,gl:'us',hl:'en',num:20})},signal,fallbackTimeoutMs);
   const listings=parseSerperAvailability(data,input.product,target,cities);
   return availabilityResultSchema.parse({...empty(listings.length?'ok':'no-matches',source),listings});
  }catch{return empty('unavailable',source);}
 }
 async function search(input:AvailabilityRequest,target:Target,signal:AbortSignal,allowFallback:boolean):Promise<AvailabilityResult>{
  if(active>=6)return empty('unavailable');
  active++;
  try{
   const canFallback=allowFallback&&!!serper;
   const first=await primary(input,target,signal,canFallback?Math.min(primaryTimeoutMs,timeoutMs):timeoutMs);
   if(!canFallback||signal.aborted||first.listings.some(row=>(row.status==='pickup-today'||row.status==='in-stock')&&(!target.selectedRetailer||sameRetailer(target.selectedRetailer,row.retailer))))return first;
   const second=await fallback(input,target,signal);
   if(signal.aborted)return empty('unavailable');
   const listings=rankAvailabilityListings([...first.listings,...second.listings],target.selectedRetailer);
   if(listings.length){
    const hasFirst=listings.some(row=>first.listings.includes(row)),hasSecond=listings.some(row=>second.listings.includes(row));
    const source=hasFirst&&hasSecond?'Google via SerpApi + Serper':hasSecond?'Google via Serper':'Google via SerpApi';
    return availabilityResultSchema.parse({...empty('ok',source),listings});
   }
   const status=first.status==='no-matches'&&second.status==='no-matches'?'no-matches':first.status==='limit-reached'&&second.status==='limit-reached'?'limit-reached':'unavailable';
   return empty(status,'Google via SerpApi + Serper');
  }finally{active--;}
 }
 return {async lookup(raw:unknown,signal:AbortSignal,allowFallback=false):Promise<AvailabilityResult>{
  const input=availabilityRequestSchema.parse(raw);if(signal.aborted)throw Error('Cancelled');
  const target=resolveAvailabilityTarget(input,directory,cities);if(!target)return empty('unsupported-area');
  // Keep legacy consumers isolated: they neither dispatch Serper nor receive its attribution.
  const id=createHash('sha256').update(JSON.stringify([input.product,target,allowFallback])).digest('hex');
  const hit=cache.get(id);if(hit&&hit.until>now())return {...hit.result,cached:true};
  let entry=pending.get(id);
  if(!entry){
   const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
   entry={controller,users:0,promise:Promise.resolve(empty('unavailable'))};
   const own=entry;
   entry.promise=search(input,target,controller.signal,allowFallback).then(result=>{
    if(!controller.signal.aborted){if(cache.size>=256)cache.delete(cache.keys().next().value!);const item={until:now()+(result.status==='ok'||result.status==='no-matches'?300000:15000),result};cache.set(id,item);const expiry=setTimeout(()=>{if(cache.get(id)===item)cache.delete(id);},Math.max(0,item.until-now()));expiry.unref();}
    return result;
   }).finally(()=>{clearTimeout(timer);if(pending.get(id)===own)pending.delete(id);});
   pending.set(id,entry);
  }
  const shared=entry;shared.users++;
  return new Promise((resolve,reject)=>{
   let done=false;
   const finish=()=>{if(done)return false;done=true;signal.removeEventListener('abort',abort);shared.users--;if(!shared.users&&pending.get(id)===shared){shared.controller.abort();pending.delete(id);}return true;};
   const abort=()=>{if(finish())reject(Error('Cancelled'));};
   signal.addEventListener('abort',abort,{once:true});
   shared.promise.then(result=>{if(finish())resolve(result);},()=>{if(finish())resolve(empty('unavailable'));});
   if(signal.aborted)abort();
  });
 }};
}
export function loadNearbyAvailability(root:string,directory:StoreDirectory){
 let budget:ReturnType<typeof availabilityBudget>|undefined,serperBudget:ReturnType<typeof availabilityBudget>|undefined;
 const privateKey=(name:string)=>{
  try{
   const path=root+'/.secrets/'+name,info=lstatSync(path);
   if(!info.isFile()||info.isSymbolicLink()||(info.mode&0o777)!==0o600||info.uid!==process.getuid?.())return undefined;
   const key=readFileSync(path,'utf8').trim();return key&&!/\s/.test(key)&&key.length<=256?key:undefined;
  }catch{return undefined;}
 };
 try{
  const key=privateKey('serpapi-availability-test.key'),serperKey=privateKey('serper-availability-test.key');
  if(!key&&!serperKey)return undefined;
  const citySchema=z.array(z.object({name:z.string().max(200),latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180)})).min(1).max(30000);
  const cities=citySchema.parse(JSON.parse(readFileSync(root+'/data/serpapi-us-cities.json','utf8')).cities);
  mkdirSync(root+'/.tools/availability',{recursive:true,mode:0o700});
  budget=availabilityBudget(root+'/.tools/availability/usage.sqlite');
  // A per-hour request guard, not an invented spending limit. Provider credits are user-managed.
  if(serperKey)serperBudget=availabilityBudget(root+'/.tools/availability/serper-usage.sqlite',undefined,45,null);
  return {...createNearbyAvailability({key,serper:serperKey?{key:serperKey,reserve:()=>serperBudget!.reserve()}:undefined,directory,cities,reserve:()=>budget!.reserve()}),close:()=>{budget?.close();serperBudget?.close();}};
 }catch{budget?.close();serperBudget?.close();return undefined;}
}
