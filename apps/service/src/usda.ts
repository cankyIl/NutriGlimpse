import {classifyUsdaGrocery} from './catalogCuration.ts';
import { z } from 'zod';
import { normalizeBarcode } from '../../../packages/core/src/barcode.ts';
import { foodSchema, type PublicFood } from './publicDatabase.ts';
const schema=z.object({
 fdcId:z.number().int().positive(),description:z.string().min(1).max(500),dataType:z.enum(['Foundation','SR Legacy','Survey (FNDDS)','Branded']),
 brandedFoodCategory:z.string().max(200).optional(),servingSize:z.number().finite().positive().optional(),servingSizeUnit:z.string().optional(),marketCountry:z.string().optional(),discontinuedDate:z.string().optional(),
 gtinUpc:z.string().optional(),brandOwner:z.string().max(500).optional(),brandName:z.string().max(500).optional(),ingredients:z.string().max(10000).optional(),publicationDate:z.string().max(40).optional(),
 foodNutrients:z.array(z.object({nutrient:z.object({id:z.number(),unitName:z.string()}),amount:z.number().finite().nonnegative().optional()})).max(1000)
});
export function mapUsda(value:unknown,expectedId:string,now=new Date().toISOString()):PublicFood{
 const data=schema.parse(value);
 if(String(data.fdcId)!==expectedId)throw new Error('USDA identity mismatch');
 const group=data.dataType==='Branded'&&['g','GRM'].includes(data.servingSizeUnit??'')&&['US','United States'].includes(data.marketCountry??'')&&!data.discontinuedDate?classifyUsdaGrocery(data.description,data.brandedFoodCategory):null;
 const nutrient=(id:number,unit:string)=>{const matches=data.foodNutrients.filter(n=>n.nutrient.id===id);const n=matches.length===1&&matches[0].nutrient.unitName.toUpperCase()===unit?matches[0].amount??null:null;return n!==null&&n>(unit==='MG'?100000:unit==='G'?100:1000)?null:n;};
 return foodSchema.parse({provider:'usda',id:expectedId,barcode:data.gtinUpc?normalizeBarcode(data.gtinUpc):null,name:data.description,
 ...(group?{comparisonGroup:group,categoryEvidence:'category-rules-v2'}:{}),
 servingGrams:['g','GRM'].includes(data.servingSizeUnit??'')?data.servingSize??null:null,
 brand:data.brandName?.trim()||data.brandOwner||null,...(data.brandOwner?{brandOwner:data.brandOwner}:{}),ingredients:data.ingredients??null,dataType:data.dataType,basis:'100g',
 additionalNutrients:{transFatG:nutrient(1257,'G'),potassiumMg:nutrient(1092,'MG'),magnesiumMg:nutrient(1090,'MG'),calciumMg:nutrient(1087,'MG')},
 nutritionExtras:{proteinG:nutrient(1003,'G'),carbohydrateG:nutrient(1005,'G'),addedSugarsG:nutrient(1235,'G'),ironMg:nutrient(1089,'MG'),vitaminDMcg:nutrient(1114,'UG'),vitaminCMg:nutrient(1162,'MG')},
 nutrients:{caloriesKcal:nutrient(1008,'KCAL'),saturatedFatG:nutrient(1258,'G'),fiberG:nutrient(1079,'G'),sodiumMg:nutrient(1093,'MG'),sugarsG:nutrient(2000,'G')},
 sourceUrl:'https://fdc.nal.usda.gov/food-details/'+expectedId+'/nutrients',retrievedAt:now,sourceDate:data.publicationDate??null,license:'CC0-1.0',certifications:'unverified',availability:'unverified'});
}
export async function fetchUsda(id:string,key:string,fetcher:typeof fetch=fetch,parent?:AbortSignal,usBrandedOnly=false):Promise<PublicFood>{
 if(!/^[1-9]\d{0,9}$/.test(id)||!key.trim())throw new Error('USDA ID and key required');
 // Key is a header, never part of the source URL saved to the catalog.
 const timeout=AbortSignal.timeout(10000),signal=parent?AbortSignal.any([parent,timeout]):timeout;
 signal.throwIfAborted();
 const response=await fetcher('https://api.nal.usda.gov/fdc/v1/food/'+id,{headers:{'X-Api-Key':key},redirect:'error',signal});
 if(!response.ok||!response.body)throw new Error('USDA source unavailable');
 const reader=response.body.getReader();let size=0;const parts:Uint8Array[]=[];
 try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>1000000)throw new Error('USDA response exceeds limit');parts.push(part.value);}}finally{await reader.cancel();}
 const data=JSON.parse(Buffer.concat(parts).toString('utf8'));
 if(usBrandedOnly&&(data.dataType!=='Branded'||!['US','United States'].includes(data.marketCountry)||data.discontinuedDate))throw Error('Current US formulation required');
 return mapUsda(data,id);
}
