import {z} from 'zod';
import {constants,openSync,closeSync,fstatSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {matchPhotoIdentity,photoIdentitySchema,type PhotoIdentity} from '../../../packages/core/src/productPhoto.ts';
import {currentLabelSource} from '../../../packages/core/src/labelChecks.ts';
import {type PublicFood} from '../../../packages/core/src/publicFood.ts';
import {mapUsda,fetchUsda} from './usda.ts';
import {labelRating} from '../../../packages/core/src/photoAssessment.ts';
import type {PublicDatabase} from './publicDatabase.ts';
const candidate=z.object({fdcId:z.number().int().positive(),description:z.string().min(1).max(500),brandName:z.string().max(500).optional(),brandOwner:z.string().max(500).optional(),marketCountry:z.string().optional(),dataType:z.literal('Branded')});
async function body(response:Response){
 if(!response.ok||!response.body)throw Error('USDA unavailable');
 const reader=response.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try{for(;;){const item=await reader.read();if(item.done)break;size+=item.value.length;if(size>2000000)throw Error('USDA response limit');chunks.push(item.value);}}
 finally{await reader.cancel();}
 return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}
/** Two bounded USDA calls at most. The photo, health profile and tester key never go to USDA. */
export async function findUsdaPhotoNutrition(raw:PhotoIdentity,key:string,parent:AbortSignal,fetcher:typeof fetch=fetch):Promise<PublicFood[]>{
 const identity=photoIdentitySchema.parse(raw);
 if(!identity.brand||!identity.name||!['identified','uncertain'].includes(identity.status))return [];
 const signal=AbortSignal.any([parent,AbortSignal.timeout(12000)]);signal.throwIfAborted();
 const tokens=[...new Set([identity.brand,identity.name,identity.variant].filter(Boolean).join(' ').normalize('NFKD').toLowerCase().replace(/['’]/g,'').match(/[a-z0-9]+/g)??[])].filter(t=>!['the','a','an','and','with','of','for'].includes(t)).slice(0,16);
 if(!tokens.length)return [];
 const query=tokens.map(t=>'+'+t).join(' ').slice(0,300);
 const headers={'X-Api-Key':key,'Content-Type':'application/json'};
 const search=z.object({foods:z.array(candidate).max(20)}).parse(await body(await fetcher('https://api.nal.usda.gov/fdc/v1/foods/search',{
  method:'POST',headers,redirect:'error',signal,body:JSON.stringify({query,dataType:['Branded'],pageSize:20,pageNumber:1})})));
 const summaries:PublicFood[]=search.foods.filter(f=>!f.marketCountry||['United States','US'].includes(f.marketCountry)).map(f=>({provider:'usda',id:String(f.fdcId),name:f.description,brand:f.brandName||f.brandOwner||null,...(f.brandOwner?{brandOwner:f.brandOwner}:{}),dataType:'Branded',barcode:null,ingredients:null,basis:'100g',nutrients:{caloriesKcal:null,saturatedFatG:null,fiberG:null,sodiumMg:null,sugarsG:null},sourceUrl:'https://fdc.nal.usda.gov/food-details/'+f.fdcId+'/nutrients',sourceDate:null,retrievedAt:new Date().toISOString(),license:'CC0-1.0',certifications:'unverified',availability:'unverified'}));
 const ids=matchPhotoIdentity(identity,summaries).slice(0,3).map(f=>Number(f.id));if(!ids.length)return [];
 const values=z.array(z.unknown()).max(3).parse(await body(await fetcher('https://api.nal.usda.gov/fdc/v1/foods',{
  method:'POST',headers,redirect:'error',signal,body:JSON.stringify({fdcIds:ids,format:'full'})})));
 const foods:PublicFood[]=[];
 for(const value of values){
  const info=z.object({fdcId:z.number().int(),dataType:z.literal('Branded'),marketCountry:z.enum(['United States','US']),discontinuedDate:z.string().optional()}).safeParse(value);
  if(!info.success||!ids.includes(info.data.fdcId)||info.data.discontinuedDate)continue;
  try{foods.push(mapUsda(value,String(info.data.fdcId)));}catch{/* Incomplete/invalid provider records do not become invented food facts. */}
 }
 signal.throwIfAborted();return matchPhotoIdentity(identity,foods);
}
function readUsdaKey(path:string){
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
 try{const stat=fstatSync(fd);if(!stat.isFile()||stat.uid!==process.getuid?.()||(stat.mode&0o077)||stat.size>256)throw Error('USDA configuration unavailable');const key=readFileSync(fd,'utf8').trim();if(!/^[A-Za-z0-9_-]{20,100}$/.test(key))throw Error('USDA configuration unavailable');return key;}finally{closeSync(fd);}
}
/** One bounded batch: original and at most three independently proposed identities.
 * Only names/IDs reach sources; never photos, ratings, user profiles, or lab results.
 * Reuses complete current records. Missing extras trigger an exact-ID refresh before name search.
 */
export function createAssessmentNutritionResolver(root:string,catalog:PublicDatabase,labelEvidence:(food:PublicFood)=>PublicFood['glutenEvidence'],fetcher:typeof fetch=fetch,offLookup?:(barcode:string,refreshEvidence?:boolean)=>Promise<void>){
 let key:string|undefined;try{key=readUsdaKey(join(root,'.tools/usda/api-key'));}catch{/* Cached source facts remain usable. */}
 return async(identities:PhotoIdentity[],parent:AbortSignal):Promise<(PublicFood|null)[]>=>{
  if(identities.length>4)throw Error('Lookup limit');
  const signal=AbortSignal.any([parent,AbortSignal.timeout(30000)]);
  let allowLookup:boolean|undefined;
  const results:(PublicFood|null)[]=[];
  for(const raw of identities){
   parent.throwIfAborted();const identity=photoIdentitySchema.parse(raw);
   let cached=matchPhotoIdentity(identity,catalog.exportFoods());
   // Identity rank comes before completeness: never prefer a worse package match just because it has more nutrients.
   let chosen=cached[0]??null;
   if(key&&(!chosen||labelRating(chosen).status!=='rated')&&!signal.aborted){
    allowLookup??=catalog.reserveAssessmentLookup();
    if(allowLookup){
     try{
      const existing=cached.find(f=>f.provider==='usda');
      const found=existing?[await fetchUsda(existing.id,key,fetcher,signal,true)]:await findUsdaPhotoNutrition(identity,key,signal,fetcher);
      parent.throwIfAborted();
      const exact=matchPhotoIdentity(identity,found);
      if(exact.length){catalog.importFoods(exact);cached=matchPhotoIdentity(identity,catalog.exportFoods());chosen=exact[0];}
     }catch{parent.throwIfAborted();/* Preserve verified cached data; no inferred nutrient fallback. */}
    }
   }
   if(chosen?.barcode&&offLookup&&(!chosen.image||labelRating(chosen).status!=='rated')&&!signal.aborted){
    try{await offLookup(chosen.barcode,true);}catch{/* Optional source/image enrichment must not discard the selected public record. */}
    parent.throwIfAborted();cached=matchPhotoIdentity(identity,catalog.exportFoods());
    chosen=cached.find(f=>f.barcode===chosen!.barcode&&labelRating(f).status==='rated')??chosen;
   }
   if(chosen){
    const sameBarcode=cached.find(f=>f.barcode&&f.barcode===chosen!.barcode&&f.image&&currentLabelSource(f));
    // Only a source-observed, exact-barcode image can decorate another provider's equivalent record.
    chosen={...chosen,...(sameBarcode?.image?{image:sameBarcode.image}:{}),glutenEvidence:labelEvidence(chosen)};
   }
   results.push(chosen);
  }
  return results;
 };
}
export function createPhotoNutritionResolver(root:string,catalog:PublicDatabase,labelEvidence:(food:PublicFood)=>PublicFood['glutenEvidence']){
 let key:string|undefined;try{key=readUsdaKey(join(root,'.tools/usda/api-key'));}catch{/* Existing public facts still work. */}
 let nextLookup=0;
 return async(identity:PhotoIdentity,signal:AbortSignal):Promise<PublicFood[]>=>{
  signal.throwIfAborted();const cached=matchPhotoIdentity(identity,catalog.exportFoods());
  const currentUsda=cached.filter(f=>f.provider==='usda'&&currentLabelSource(f)&&Object.values(f.nutrients).every(v=>v!==null));
  if(currentUsda.length)return currentUsda.map(f=>({...f,glutenEvidence:labelEvidence(f)}));
  // At most two source requests per 15 seconds, shared by all authenticated photo users.
  if(key&&Date.now()>=nextLookup){
   nextLookup=Date.now()+15000;
   try{const found=await findUsdaPhotoNutrition(identity,key,signal);signal.throwIfAborted();if(found.length){catalog.importFoods(found);return found.map(f=>({...f,glutenEvidence:labelEvidence(f)}));}}
   catch{if(signal.aborted)throw Error('Photo cancelled');}
  }
  return cached.map(f=>({...f,glutenEvidence:labelEvidence(f)}));
 };
}
