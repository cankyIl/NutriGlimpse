import {z} from 'zod';
import {normalizeOffFood} from './offNormalization.ts';
import {foodSourceTime} from '../../../packages/core/src/publicFood.ts';
const textList=z.array(z.object({lang:z.string(),text:z.string()})).max(200).nullable();
const rowSchema=z.object({code:z.string(),product_name:textList,ingredients_text:textList,brands:z.string().nullable(),categories_tags:z.array(z.string()).nullable(),countries_tags:z.array(z.string()),nutrition_data_per:z.string().nullable(),serving_size:z.string().nullable(),serving_quantity:z.string().nullable(),product_quantity_unit:z.string().nullable(),last_modified_t:z.number().finite().positive(),data_quality_errors_tags:z.array(z.string()).nullable(),nutriments:z.array(z.object({name:z.string(),'100g':z.number().nullable(),serving:z.number().nullable().optional(),unit:z.string().nullable()})).max(500).nullable(),obsolete:z.boolean().nullable(),no_nutrition_data:z.boolean().nullable()}).passthrough();
const plain=(rows:z.infer<typeof textList>)=>{const text=rows?.find(x=>x.lang==='en')?.text??rows?.find(x=>x.lang==='main')?.text;return text?.replace(/<[^>]*>/g,'').trim();};
/** Official Parquet has language/value arrays. Never treat prepared amounts or ml as dry per-100-g data. */
export function normalizeOffBulk(value:unknown,retrievedAt:string){
 const parsed=rowSchema.safeParse(value);if(!parsed.success)return {reason:'invalid-shape' as const};
 const row=parsed.data;
 if(row.obsolete||row.no_nutrition_data)return {reason:'obsolete-or-no-nutrition' as const};
 if(!row.countries_tags.includes('en:united-states'))return {reason:'non-US' as const};
 if(row.data_quality_errors_tags===null||row.data_quality_errors_tags.length)return {reason:'quality-errors-or-unknown' as const};
 if(!['100g','serving'].includes(row.nutrition_data_per??''))return {reason:'ambiguous-nutrition-basis' as const};
 const matches=[...(row.serving_size??'').matchAll(/(?:^|[\s(])(\d+(?:\.\d+)?)\s*g(?:\b|\))/gi)];
 const grams=matches.length===1?Number(matches[0][1]):null;
 if(!grams&&!/^(g|grm)$/i.test(row.product_quantity_unit??''))return {reason:'unconfirmed-mass-unit' as const};
 if(/\bml\b|\bfl\.?\s*oz\b/i.test(row.serving_size??'')||/^(ml|l)$/i.test(row.product_quantity_unit??''))return {reason:'liquid-form' as const};
 if(row.nutrition_data_per==='serving'&&(!grams||Number(row.serving_quantity)!==grams))return {reason:'unconfirmed-serving-mass' as const};
 const nutriments:Record<string,number>={};
 // OFF schema: 100g/serving are canonical g (kcal for energy-kcal); unit describes original input only.
 // https://openfoodfacts.github.io/documentation/docs/Product-Opener/schemas/schemas/product_nutrition/
 for(const name of ['energy-kcal','saturated-fat','fiber','sodium','sugars','trans-fat','potassium','magnesium','calcium']){
  const entries=row.nutriments?.filter(x=>x.name===name)??[];
  if(entries.length===1&&entries[0]['100g']!==null){
   if(row.nutrition_data_per==='serving'){
    const expected=entries[0]['100g']*grams!/100,perServing=entries[0].serving;
    if(perServing===null||perServing===undefined||Math.abs(perServing-expected)>Math.max(0.00001,Math.abs(expected)*0.01)){
     if(['trans-fat','potassium','magnesium','calcium'].includes(name))continue;
     return {reason:'inconsistent-serving-nutrients' as const};
    }
   }
   nutriments[name+'_100g']=Number(entries[0]['100g'].toPrecision(6));
  }
 }
 try{
 const food=normalizeOffFood({product:{labels:typeof row.labels==='string'?row.labels:undefined,labels_tags:row.labels_tags,allergens:typeof row.allergens==='string'?row.allergens:undefined,allergens_tags:row.allergens_tags,traces:typeof row.traces==='string'?row.traces:undefined,traces_tags:row.traces_tags,code:row.code,product_name:plain(row.product_name),ingredients_text:plain(row.ingredients_text),brands:row.brands??undefined,categories_tags:row.categories_tags??[],countries_tags:row.countries_tags,nutrition_data_per:'100g',serving_quantity_unit:'g',...(grams?{serving_quantity:grams}:{}),last_modified_t:row.last_modified_t,data_quality_errors_tags:row.data_quality_errors_tags,nutriments}},row.code,retrievedAt);
 if(!food)return {reason:'invalid-nutrition' as const};
 if(!food.ingredients||Object.values(food.nutrients).some(x=>x===null))return {reason:'incomplete-label' as const};
 if(Date.parse(retrievedAt)-foodSourceTime(food.sourceDate)>3*366*86400000)return {reason:'old-source' as const};
 return {food};
 }catch{return {reason:'invalid-identity-or-fields' as const};}
}
/** Brand hints for coverage reporting only. No store stock/assortment assertions. */
export function retailerBrandHints(brand:string|null){
 const b=(brand??'').toLowerCase().split(/[,;]/).map(x=>x.trim());
 return [
  ['wegmans',b.some(x=>/^wegmans\b/.test(x))],
  ['walmart',b.some(x=>/^(great value|marketside|sam's choice|sams choice|walmart)\b/.test(x))],
  ['price-chopper',b.some(x=>/^(pics|price chopper|market 32)\b/.test(x))],
  ['whole-foods',b.some(x=>/^(365|whole foods)\b/.test(x))],
 ].filter(x=>x[1]).map(x=>String(x[0]));
}
