import {classifyOffGrocery} from './catalogCuration.ts';
import {z} from 'zod';
import {normalizeBarcode} from '../../../packages/core/src/barcode.ts';
import {foodSchema,type PublicFood} from '../../../packages/core/src/publicFood.ts';
const input=z.object({product:z.object({code:z.string(),product_name:z.string().max(500),brands:z.string().max(500).optional(),ingredients_text:z.string().max(10000).optional(),categories_tags:z.array(z.string()).max(500).optional(),serving_quantity:z.union([z.number(),z.string().regex(/^\d+(\.\d+)?$/).transform(Number)]).pipe(z.number().finite().positive().max(2000)).optional(),countries_tags:z.array(z.string()).max(300),nutrition_data_per:z.string(),nutrition_data_prepared:z.string().optional(),serving_quantity_unit:z.string().optional(),last_modified_t:z.number().finite().positive(),data_quality_errors_tags:z.array(z.string()).max(1000),nutriments:z.record(z.unknown())}).passthrough()}).passthrough();
/** Reported metadata remains unverified; no tag can confer certification. */
function reportedLabel(p:Record<string,unknown>){
 const text=(key:string)=>typeof p[key]==='string'&&(p[key] as string).length<=10000?(p[key] as string).trim()||null:null;
 const tags=(key:string)=>Array.isArray(p[key])?(p[key] as unknown[]).filter((x):x is string=>typeof x==='string'&&x.length<=200).slice(0,200):[];
 return {source:'off' as const,verification:'unverified' as const,frontLabelText:text('labels'),labels:tags('labels_tags'),allergenStatement:text('allergens'),allergens:tags('allergens_tags'),advisoryStatement:text('traces'),traces:tags('traces_tags')};
}
/** Validated US gram-based facts; optional metadata is explicitly community-reported. */
export function normalizeOffFood(value:unknown,expectedBarcode:string,now=new Date().toISOString()):PublicFood|null{
 const {product:p}=input.parse(value),barcode=normalizeBarcode(p.code);
 if(!barcode||barcode!==normalizeBarcode(expectedBarcode))throw Error('OFF identity mismatch');
 if(!p.countries_tags.includes('en:united-states')||p.data_quality_errors_tags.length||p.nutrition_data_per!=='100g'||p.nutrition_data_prepared==='on'||!/^(g|grm)$/i.test(p.serving_quantity_unit??''))return null;
 const changed=p.last_modified_t*1000;if(!Number.isFinite(changed)||changed>Date.parse(now))throw Error('Invalid OFF source timestamp');
 const amount=(key:string,multiplier=1)=>{const n=p.nutriments[key];return typeof n==='number'&&Number.isFinite(n)&&n>=0?n*multiplier:null;};
 const nutrients={caloriesKcal:amount('energy-kcal_100g'),saturatedFatG:amount('saturated-fat_100g'),fiberG:amount('fiber_100g'),sodiumMg:amount('sodium_100g',1000),sugarsG:amount('sugars_100g')};
 if(Object.entries(nutrients).some(([k,v])=>v!==null&&v>(k==='caloriesKcal'?1000:k==='sodiumMg'?100000:100)))return null;
 const extra=(key:string,multiplier:number,max:number)=>{const n=amount(key,multiplier);return n!==null&&n<=max?n:null;};
 const additionalNutrients={transFatG:extra('trans-fat_100g',1,100),potassiumMg:extra('potassium_100g',1000,100000),magnesiumMg:extra('magnesium_100g',1000,100000),calciumMg:extra('calcium_100g',1000,100000)};
 const group=classifyOffGrocery(p.product_name,p.categories_tags??[]);
 const nutritionExtras={proteinG:extra('proteins_100g',1,100),carbohydrateG:extra('carbohydrates_100g',1,100),addedSugarsG:extra('added-sugars_100g',1,100),ironMg:extra('iron_100g',1000,100000),vitaminDMcg:extra('vitamin-d_100g',1000000,100000),vitaminCMg:extra('vitamin-c_100g',1000,100000)};
 const rawImage=p.image_front_small_url;
 const image=typeof rawImage==='string'&&/^https:\/\/images\.openfoodfacts\.org\/images\/products\/[0-9/]+\/front_[a-z]{2}\.\d+\.(100|200|400)\.jpg$/.test(rawImage)?{url:rawImage,license:'CC-BY-SA-3.0',sourceUrl:'https://world.openfoodfacts.org/product/'+barcode}:undefined;
 return foodSchema.parse({...(group?{comparisonGroup:group,categoryEvidence:'category-rules-v4'}:{}),provider:'off',id:barcode,barcode,name:p.product_name,brand:p.brands??null,ingredients:p.ingredients_text??null,dataType:'Branded',basis:'100g',servingGrams:p.serving_quantity??null,nutrients,additionalNutrients,nutritionExtras,...(image?{image}:{}),reportedLabel:reportedLabel(p),sourceUrl:'https://world.openfoodfacts.org/product/'+barcode,retrievedAt:now,sourceDate:new Date(changed).toISOString().slice(0,10),license:'ODbL-1.0',certifications:'unverified',availability:'unverified'});
}
