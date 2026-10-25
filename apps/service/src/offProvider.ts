import {z} from 'zod';
import {existsSync,readFileSync} from 'node:fs';
import {normalizeBarcode} from '../../../packages/core/src/barcode.ts';
import {normalizeOffFood} from './offNormalization.ts';
import type {PublicDatabase} from './publicDatabase.ts';
export const offConfigSchema=z.object({enabled:z.literal(true),contactEmail:z.string().email().max(254).regex(/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+$/),shareAlikeAcceptedAt:z.string().datetime(),publicCatalogUrl:z.literal('https://grocery.serveforwad.com/v1/catalog/export'),staging:z.boolean()}).strict();
export type OffConfig=z.infer<typeof offConfigSchema>;
export function loadOffConfig(path:string):OffConfig|null{return existsSync(path)?offConfigSchema.parse(JSON.parse(readFileSync(path,'utf8'))):null;}
export async function fetchOffFood(code:string,config:OffConfig,fetcher:typeof fetch=fetch){
 const barcode=normalizeBarcode(code);if(!barcode)throw Error('Invalid barcode');
 offConfigSchema.parse(config);
 const host=config.staging?'world.openfoodfacts.net':'world.openfoodfacts.org';
 const headers:Record<string,string>={'User-Agent':`CongressGroceryBeta/0.1 (${config.contactEmail})`};
 if(config.staging)headers.Authorization='Basic '+Buffer.from('off:off').toString('base64');
 const fields='code,product_name,brands,ingredients_text,countries_tags,categories_tags,nutrition_data_per,nutrition_data_prepared,serving_quantity,serving_quantity_unit,last_modified_t,data_quality_errors_tags,nutriments,labels,labels_tags,allergens,allergens_tags,traces,traces_tags,image_front_small_url';
 const response=await fetcher(`https://${host}/api/v3.4/product/${barcode}.json?fields=${fields}`,{headers,signal:AbortSignal.timeout(8000),redirect:'error'});
 if(response.status===404)return null;
 if(!response.ok||!response.body)throw Error('OFF unavailable');
 const reader=response.body.getReader(),parts:Uint8Array[]=[];let bytes=0;
 try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>256000)throw Error('OFF response too large');parts.push(part.value);}}finally{await reader.cancel();}
 // Pin 3.4: OFF documents a breaking nutrition structure change in 3.5.
 const value=JSON.parse(Buffer.concat(parts).toString('utf8'));
 if(value.status===0)return null;
 try{return normalizeOffFood(value,barcode);}catch(error){if(error instanceof z.ZodError)return null;throw error;}
}
/** One in-flight request, >=5 seconds between starts (<=12/min), bounded negative cache and upstream cooldown. */
export function createOffLookup(db:PublicDatabase,config:OffConfig,fetcher:typeof fetch=fetch,now=()=>Date.now()){
 offConfigSchema.parse(config);let next=0,busy=false;const negatives=new Map<string,number>();
 return async(code:string,refreshEvidence=false):Promise<void>=>{
  const barcode=normalizeBarcode(code);if(!barcode)throw Error('Invalid barcode');
  const cached=db.byBarcode(barcode);
  // Legacy lookup preserves USDA preference. v2 may fill missing OFF label metadata, with the same shared pacing.
  const complete=refreshEvidence?cached.some(f=>f.provider==='off'&&!f.stale&&!!f.additionalNutrients&&!!f.reportedLabel&&!!f.nutritionExtras):cached.some(f=>!f.stale);
  if(complete||busy||now()<next||(negatives.get(barcode)??0)>now())return;
  if(!db.reserveOffRequest(now()))return;
  busy=true;next=now()+5100;
  try{const food=await fetchOffFood(barcode,config,fetcher);
   // Staging is never imported into the production catalog.
   if(food&&!config.staging)db.importFoods([food]);
   else{if(negatives.size>=256)negatives.delete(negatives.keys().next().value!);negatives.set(barcode,now()+3600000);}
  }catch{next=Math.max(next,now()+60000);db.coolOffRequests(now());}finally{busy=false;}
 };
}
