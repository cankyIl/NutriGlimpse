import {z} from 'zod';
import {coordinatesSchema,type Coordinates} from './stores.ts';
import {betaCatalogUrl} from './catalogClient.ts';
import type {PhotoIdentity} from './productPhoto.ts';

const text=z.string().trim().min(1).max(160).refine(v=>!/[\u0000-\u001f\u007f]/.test(v));
export const availabilityProductSchema=z.object({
 brand:text,name:text,variant:text.nullable(),size:text.nullable(),
}).strict();
export const availabilityLocationSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('store'),id:z.string().regex(/^(node|way)\/[1-9]\d*$/)}).strict(),
 z.object({kind:z.literal('coordinates'),...coordinatesSchema.shape}).strict(),
]);
export const availabilityRequestSchema=z.object({
 product:availabilityProductSchema,location:availabilityLocationSchema,
}).strict();
export type AvailabilityProduct=z.infer<typeof availabilityProductSchema>;
export type AvailabilityLocation=z.infer<typeof availabilityLocationSchema>;
export type AvailabilityRequest=z.infer<typeof availabilityRequestSchema>;
export function availabilityLocation(selected:{id:string}|null|undefined,origin:Coordinates|null|undefined):AvailabilityLocation|null {
 if(selected)return {kind:'store',id:selected.id};
 // About 1 km precision. Exact GPS is never sent by this feature.
 return origin?{kind:'coordinates',latitude:Math.round(origin.latitude*100)/100,longitude:Math.round(origin.longitude*100)/100}:null;
}
export function availabilityProduct(identity:PhotoIdentity):AvailabilityProduct|null {
 const parsed=availabilityProductSchema.safeParse({brand:identity.brand,name:identity.name,variant:identity.variant,size:identity.size});
 return parsed.success?parsed.data:null;
}
export function sameRetailer(selectedName:string|undefined,retailer:string):boolean {
 if(!selectedName)return false;
 const clean=(s:string)=>s.toLowerCase().replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const a=clean(selectedName),b=clean(retailer);
 const chains=['wegmans','walmart','price chopper','whole foods','trader joes','target','shaws','market basket','stop shop'];
 const chain=chains.find(name=>a===name||a.startsWith(name+' '));
 return chain?b===chain||b.startsWith(chain+' '):a===b;
}
export function safeAvailabilityLink(value:string):boolean {
 try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&
  !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[)/i.test(url.hostname)&&
  url.hostname.includes('.')&&!/\.(local|internal)$/i.test(url.hostname);}catch{return false;}
}
const listingSchema=z.object({
 retailer:text,title:z.string().min(1).max(500),url:z.string().max(2000).refine(safeAvailabilityLink),
 price:z.string().max(40).nullable(),address:z.string().max(500).nullable(),locationLabel:z.string().max(160).nullable(),
 status:z.enum(['pickup-today','in-stock','nearby-listing','listing']),sponsored:z.boolean(),
 packNote:z.string().max(100).nullable(),
}).strict();
export const availabilityResultSchema=z.object({
 schemaVersion:z.literal(2),status:z.enum(['ok','no-matches','unavailable','limit-reached','unsupported-area']),
 listings:z.array(listingSchema).max(3),checkedAt:z.string().datetime(),
 source:z.enum(['Google via SerpApi','Google via Serper','Google via SerpApi + Serper']),cached:z.boolean(),
}).strict();
export const legacyAvailabilityResultSchema=availabilityResultSchema.extend({schemaVersion:z.literal(1),source:z.literal('Google via SerpApi')});
export type AvailabilityResult=z.infer<typeof availabilityResultSchema>;
export type AvailabilityListing=AvailabilityResult['listings'][number];
export async function findNearbyAvailability(input:AvailabilityRequest,parent:AbortSignal,fetcher:typeof fetch=fetch):Promise<AvailabilityResult>{
 if(parent.aborted)throw Error('Cancelled');
 const body=JSON.stringify(availabilityRequestSchema.parse(input)),controller=new AbortController(),abort=()=>controller.abort();
 parent.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,22000);
 try{
  const response=await fetcher(betaCatalogUrl+'/v2/availability/search',{method:'POST',headers:{'Content-Type':'application/json'},body,signal:controller.signal,redirect:'error'});
  if(!response.ok||response.redirected)throw Error('Store lookup unavailable. Try again.');
  const raw=await response.text();
  if(parent.aborted||controller.signal.aborted)throw Error('Cancelled');
  if(raw.length>20000)throw Error('Store lookup unavailable.');
  return availabilityResultSchema.parse(JSON.parse(raw));
 }catch{throw Error('Store lookup unavailable. Try again.');}
 finally{clearTimeout(timer);parent.removeEventListener('abort',abort);}
}
