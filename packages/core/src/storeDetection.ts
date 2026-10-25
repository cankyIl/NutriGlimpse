import {z} from 'zod';
import {coordinatesSchema,straightLineMiles,type Coordinates} from './stores.ts';
export const mappedStoreSchema=z.object({
 id:z.string().regex(/^(node|way)\/[1-9]\d*$/),name:z.string().min(1).max(200),
 address:z.string().max(500),coordinates:coordinatesSchema,
 polygon:z.array(coordinatesSchema).min(4).max(300).nullable(),
 sourceUrl:z.string().regex(/^https:\/\/www\.openstreetmap\.org\/(node|way)\/[1-9]\d*$/),
}).strict();
export const storeDirectorySchema=z.object({
 schemaVersion:z.literal(1),provider:z.literal('OpenStreetMap'),license:z.literal('ODbL-1.0'),
 attribution:z.literal('© OpenStreetMap contributors'),licenseUrl:z.literal('https://opendatacommons.org/licenses/odbl/1-0/').optional(),region:z.literal('Massachusetts'),
 retrievedAt:z.string().datetime(),sourceTimestamp:z.string().datetime(),
 stores:z.array(mappedStoreSchema).min(1).max(5000),
}).strict().refine(d=>new Set(d.stores.map(s=>s.id)).size===d.stores.length,'Duplicate stores');
export type MappedStore=z.infer<typeof mappedStoreSchema>;
export type StoreDirectory=z.infer<typeof storeDirectorySchema>;
export interface StoreDirectoryCache {read():Promise<StoreDirectory|null>;write(value:StoreDirectory):Promise<void>;clear():Promise<void>}
export type LocationFix=Coordinates&{accuracy:number|null;timestamp:number};
export type StoreMatch={store:MappedStore;distanceMetres:number};
export type Detection={state:'detected'|'ambiguous'|'nearby'|'inaccurate'|'stale-directory';selected:MappedStore|null;matches:StoreMatch[]};
const metres=(a:Coordinates,b:Coordinates)=>straightLineMiles({latitude:a.latitude,longitude:a.longitude},{latitude:b.latitude,longitude:b.longitude})*1609.344;
export function insideStore(point:Coordinates,polygon:Coordinates[]|null):boolean{
 if(!polygon)return false;
 let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j];
  if((a.latitude>point.latitude)!==(b.latitude>point.latitude)&&point.longitude<(b.longitude-a.longitude)*(point.latitude-a.latitude)/(b.latitude-a.latitude)+a.longitude)inside=!inside;
 }return inside;
}
function edgeDistance(p:Coordinates,polygon:Coordinates[]){
 const project=(q:Coordinates)=>({x:(q.longitude-p.longitude)*111320*Math.cos(p.latitude*Math.PI/180),y:(q.latitude-p.latitude)*111320});
 let distance=Infinity;
 for(let i=1;i<polygon.length;i++){
  const a=project(polygon[i-1]),b=project(polygon[i]);const dx=b.x-a.x,dy=b.y-a.y;
  const t=Math.max(0,Math.min(1,-(a.x*dx+a.y*dy)/(dx*dx+dy*dy||1)));
  distance=Math.min(distance,Math.hypot(a.x+t*dx,a.y+t*dy));
 }return distance;
}
export const AUTO_STORE_RADIUS_METRES=100;
const AUTO_STORE_MAX_ACCURACY_METRES=100;
export function detectStore(fix:LocationFix,directory:StoreDirectory,now=Date.now()):Detection{
 coordinatesSchema.parse({latitude:fix.latitude,longitude:fix.longitude});
 const matches=directory.stores.map(store=>({store,distanceMetres:store.polygon?(insideStore(fix,store.polygon)?0:edgeDistance(fix,store.polygon)):metres(fix,store.coordinates)})).filter(s=>s.distanceMetres<=5000).sort((a,b)=>a.distanceMetres-b.distanceMetres||metres(fix,a.store.coordinates)-metres(fix,b.store.coordinates)||a.store.id.localeCompare(b.store.id)).slice(0,20);
 const result=(state:Detection['state'],selected:MappedStore|null=null)=>({state,selected,matches});
 if(now-Math.min(Date.parse(directory.retrievedAt),Date.parse(directory.sourceTimestamp))>30*86400000)return result('stale-directory');
 if(fix.accuracy===null||!Number.isFinite(fix.accuracy)||fix.accuracy<0||fix.accuracy>AUTO_STORE_MAX_ACCURACY_METRES||!Number.isFinite(fix.timestamp)||now-fix.timestamp>60000||fix.timestamp>now+10000)return result('inaccurate');
 // Choose the nearest mapped store within the user-approved radius. A footprint
 // measures distance to the building, including zero while inside it. The UI
 // labels this a likely store and allows manual correction.
 const chosen=matches[0];
 return chosen&&chosen.distanceMetres<=AUTO_STORE_RADIUS_METRES?result('detected',chosen.store):result('nearby');
}
export function searchStoreDirectory(directory:StoreDirectory,query:string){
 const term=query.trim().toLowerCase();
 return term.length<2?[]:directory.stores.filter(s=>term.split(/\s+/).every(token=>(s.name+' '+s.address).toLowerCase().includes(token))).slice(0,20);
}
export async function fetchStoreDirectory(signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<StoreDirectory>{
 if(signal.aborted)throw Error('Cancelled');
 const controller=new AbortController();const abort=()=>controller.abort();
 signal.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,20000);
 try{
  const response=await fetcher('https://grocery.serveforwad.com/v1/stores/directory',{signal:controller.signal,redirect:'error'});
  if(!response.ok||response.redirected)throw Error('Store directory unavailable');
  const raw=await response.text();if(raw.length>2500000)throw Error('Directory exceeds limit');
  if(signal.aborted||controller.signal.aborted)throw Error('Cancelled');
  return storeDirectorySchema.parse(JSON.parse(raw));
 }finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
}

/** Local radius search. No geocoding or location request leaves the device. */
export function nearbyMappedStores(directory:StoreDirectory,origin:Coordinates,radiusMiles:number,query=''){
 coordinatesSchema.parse(origin);
 if(!Number.isFinite(radiusMiles)||radiusMiles<1||radiusMiles>100)throw Error('Choose a radius between 1 and 100 miles.');
 const tokens=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
 if(query.length>100)throw Error('Store search is too long.');
 return directory.stores.filter(store=>tokens.every(token=>(store.name+' '+store.address).toLowerCase().includes(token)))
 .map(store=>({store,distanceMiles:straightLineMiles(origin,store.coordinates)}))
 .filter(item=>item.distanceMiles<=radiusMiles)
 .sort((a,b)=>a.distanceMiles-b.distanceMiles||a.store.id.localeCompare(b.store.id));
}
