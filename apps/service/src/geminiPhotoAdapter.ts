import {z} from 'zod';
import {groceryWireSchema,groceryUrl,groceryNutrients,type GroceryContext,type GroceryWire,type GroceryFood} from '../../../packages/core/src/groceryReview.ts';
import {originalComparisonConcerns,estimatedReasons} from '../../../packages/core/src/aiFoodReview.ts';
import {estimatedGroceryFood} from '../../../packages/core/src/groceryReview.ts';

const text=(max:number)=>z.string().trim().max(max);
const nullable=(max:number)=>text(max).nullable().optional();
const numeric=z.number().finite().min(0).max(10000).nullable();
const keys={
 calories:'caloriesKcal',total_fat:'totalFatG',saturated_fat:'saturatedFatG',trans_fat:'transFatG',
 sodium:'sodiumMg',carbohydrates:'carbohydrateG',dietary_fiber:'fiberG',total_sugars:'sugarsG',
 added_sugars:'addedSugarsG',protein:'proteinG',potassium:'potassiumMg',calcium:'calciumMg',iron:'ironMg'
} as const;
type InputNutrient=keyof typeof keys;
const sourceSchema=z.object({
 source_id:text(40).min(1),id:text(40).min(1).optional(),url:nullable(4096),title:text(250),
 matched_product:nullable(400),serving_size:nullable(160),
 supported_nutrients:z.array(z.enum(Object.keys(keys) as [InputNutrient,...InputNutrient[]])).max(13).default([]),
 evidence_excerpt:nullable(600),
 store_name:nullable(160),town:nullable(100),state:nullable(40),branch_address:nullable(200),
 aisle:nullable(60),section:nullable(100)
});
const foodSchema=z.object({
 identity:z.object({brand:nullable(160),product_name:text(160).min(1),variant:nullable(160),package_size:nullable(100),category:nullable(100),status:z.enum(['identified','uncertain']).optional()}),
 serving_size:nullable(160),nutrition:z.object(Object.fromEntries(Object.keys(keys).map(k=>[k,numeric.optional()]))),
 nutrition_evidence_status:z.enum(['web_verified','partially_verified','unavailable']),
 nutrition_source_ids:z.record(z.string(),z.union([text(40),z.array(text(40)).max(5)]).nullable()).default({}),
 verification_notes:z.union([text(1000),z.array(text(220)).max(8)]).nullable().optional(),
 rating:z.enum(['healthy','neutral','not_healthy']).nullable(),
 reasons:z.array(text(500)).max(8).default([]),tradeoffs:z.array(text(500)).max(8).default([]),
 store_name:nullable(160),store_address:nullable(200),town:nullable(100),state:nullable(40),
 availability_status:z.enum(['confirmed_at_branch','retailer_listing_only','unknown']).optional(),
 aisle:z.union([text(60),z.number().int().nonnegative()]).nullable().optional(),section:nullable(100),
 retailer_url:nullable(4096),image_url:nullable(4096),image_source_id:nullable(40),
 availability_source_id:nullable(40),aisle_source_id:nullable(40)
});
export const approvedGroceryAnswerSchema=z.object({
 shopping_location:z.unknown().optional(),product:foodSchema.nullable(),alternatives:z.array(foodSchema).max(12).default([]),
 alternatives_shortfall:nullable(1000),sources:z.array(sourceSchema).max(24).default([])
});
const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const clip=(s:string,n:number)=>s.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n);
const safeUrl=(u:string|null|undefined)=>u&&groceryUrl.safeParse(u).success?u:null;
export function exactSourceUrl(u:string|null|undefined):string|null{
 const url=safeUrl(u);if(!url)return null;
 const parsed=new URL(url);
 // A domain homepage or a search query is not an exact product source.
 if(parsed.pathname.replace(/\/+/g,'/')==='/'||/\/search(?:\/|$)/i.test(parsed.pathname)||parsed.hostname==='www.uberats.com')return null;
 // Search attribution changes on every query; it is not a product identifier.
 // Preserve all other parameters, especially variant, SKU, barcode and item IDs.
 for(const key of [...parsed.searchParams.keys()])if(/^(?:srsltid|gclid|fbclid|msclkid|utm_.+)$/i.test(key))parsed.searchParams.delete(key);
 parsed.hash='';return parsed.href;
}
function category(name:string,hint:string|null|undefined):string{
 const s=norm(name+' '+(hint??''));
 if(/\b(marinara|pasta sauce|tomato sauce|alfredo)\b/.test(s))return /alfredo/.test(s)?'alfredo sauce':'pasta sauce';
 if(/\b(cereal|cheerios|muesli|shredded wheat|corn flakes|raisin bran)\b/.test(s))return 'cereal';
 if(/\b(butter|buttery spread|margarine)\b/.test(s))return 'butter';
 return clip(hint||name,100);
}
function grams(serving:string|null|undefined):number|null{
 const m=serving?.match(/(?:^|[\s(])(\d+(?:\.\d+)?)\s*(?:g|grams?)(?:[\s)]|$)/i);
 return m&&Number(m[1])>0&&Number(m[1])<=1000?Number(m[1]):null;
}
function sourceMismatch(s:z.infer<typeof sourceSchema>,f:z.infer<typeof foodSchema>):string|null{
  if(!s.matched_product)return "source_identity_missing";
  if(!s.serving_size||!f.serving_size)return "source_serving_missing";
 const sourceGrams=grams(s.serving_size),foodGrams=grams(f.serving_size);
 if(sourceGrams===null||foodGrams===null)return "source_serving_weight_missing";
  if(Math.abs(sourceGrams-foodGrams)>0.001)return "source_serving_weight_mismatch";
 const wanted=norm([f.identity.brand,f.identity.product_name,f.identity.variant].filter(Boolean).join(' ')).split(' ').filter(w=>w.length>1&&!['the','original','classic','sauce','pasta'].includes(w));
 const found=new Set(norm(s.matched_product).split(' '));
 return wanted.length>0&&wanted.every(w=>found.has(w))?null:"source_identity_mismatch";
}
/** Translate the approved prompt's wire format; no catalog facts or remembered values are inserted. */
export function adaptApprovedGroceryAnswer(value:unknown,context:GroceryContext,groundedUrls:ReadonlySet<string>,audit:{foodId:string;code:string}[]=[]):GroceryWire{
 const raw=structuredClone(value) as any;
 if(Array.isArray(raw?.sources))for(const source of raw.sources){
  if(source.id&&source.source_id&&source.id!==source.source_id)throw Error('grocery_conflicting_source_id');
  source.source_id=source.source_id??source.id;
 }
 const input=approvedGroceryAnswerSchema.parse(raw);
 if(input.sources.some(s=>!s.source_id))throw Error('grocery_source_id_missing');
 const grounded=new Set([...groundedUrls].flatMap(u=>exactSourceUrl(u)??[]));
 if(new Set(input.sources.map(s=>s.source_id)).size!==input.sources.length)throw Error('grocery_duplicate_sources');
 const supported=input.sources.filter(s=>{const u=exactSourceUrl(s.url);return u&&grounded.has(u);});
 const sources:GroceryWire['sources']=supported.map(s=>({
  id:s.source_id,kind:new URL(s.url!).hostname.endsWith('usda.gov')?'usda':/\b(wegmans|walmart|target|wholefoodsmarket|pricechopper|traderjoes|shoprite|kroger|instacart)\.com$/.test(new URL(s.url!).hostname)?'retailer':'guideline',
  url:exactSourceUrl(s.url),title:clip(s.title,250)||'Product nutrition source'
 }));
 const byId=new Map(supported.map(s=>[s.source_id,s]));
  const allById=new Map(input.sources.map(s=>[s.source_id,s]));
 function food(f:z.infer<typeof foodSchema>,id:string):GroceryFood{
  const nutrition=Object.fromEntries(Object.keys(groceryNutrients.shape).map(k=>[k,null])) as GroceryFood['nutrition'];
  const evidence:GroceryFood['nutrientEvidence']=[];
  for(const [raw,k] of Object.entries(keys)){
   const n=f.nutrition[raw],ids=f.nutrition_source_ids[raw],list=Array.isArray(ids)?ids:[ids];
   const source=list.map(s=>s?byId.get(s):undefined).find(s=>s&&sourceMismatch(s,f)===null&&s.supported_nutrients.includes(raw as InputNutrient));
   if(f.nutrition_evidence_status!=='unavailable'&&source&&n!==null&&n!==undefined){nutrition[k]=n;evidence.push({nutrient:k,sourceId:source.source_id});}
   else {
    const claimed=list.flatMap(s=>s&&allById.has(s)?[allById.get(s)!]:[]);
    const reason=n==null?'provider_value_missing':f.nutrition_evidence_status==='unavailable'?'provider_evidence_unavailable':!claimed.length?'source_id_missing':!claimed.some(s=>byId.has(s.source_id))?'source_url_not_grounded':
     claimed.filter(s=>byId.has(s.source_id)).map(s=>sourceMismatch(s,f)??'source_nutrient_not_listed')[0];
    audit.push({foodId:id,code:reason+'_'+k});
   }
  }
  const sourceId=evidence[0]?.sourceId??null;
  const retailer=sources.find(s=>s.kind==='retailer'&&s.url===exactSourceUrl(f.retailer_url));
  const imageSource=byId.get(f.image_source_id??'')??(retailer?byId.get(retailer.id):undefined);
  const imageUrl=safeUrl(f.image_url);
  const known=Object.values(nutrition).some(n=>n!==null);
  const notes=Array.isArray(f.verification_notes)?f.verification_notes:f.verification_notes?[f.verification_notes]:[];
  const result:GroceryFood={
   id,identity:{kind:'packaged',status:f.identity.status??'identified',brand:f.identity.brand||null,name:f.identity.product_name,variant:f.identity.variant||null,size:f.identity.package_size||null,category:category(f.identity.product_name,f.identity.category)},
   serving:{text:f.serving_size||null,grams:grams(f.serving_size),milliliters:null,basis:sourceId?'package_label':'unknown',sourceId},
   nutrition,nutrientEvidence:evidence,ingredients:null,ingredientSourceId:null,dietaryEvidence:[],
   assessment:{rating:f.rating,primaryConcern:null,highlightNutrients:[],reasons:[],limitations:[...notes.map(t=>clip(t,180)),...(!known?['Nutrition could not be confirmed from a specific cited product source. Scan the Nutrition Facts table to check the label.']:[])].slice(0,4)},
   image:id==='original'?{kind:'scan_photo',url:null,sourceId:null}:imageSource&&imageUrl?{kind:'reference',url:imageUrl,sourceId:imageSource.source_id}:{kind:'none',url:null,sourceId:null},
   availability:{status:retailer?'chain_listed':'unknown',storeName:f.store_name||null,town:f.town||null,state:f.state||null,branch:f.store_address||null,sourceId:retailer?.id??null,aisleNumber:null,section:null,aisleSourceId:null,aisleEvidence:'unknown'}
  };
  // A generated aisle string is not evidence. Require a cited branch-specific source.
  const a=byId.get(f.aisle_source_id??'');
  const store=context.store,aisle=f.aisle==null?null:String(f.aisle);
  if(a&&store?.branch&&a.branch_address&&norm(a.branch_address)===norm(store.branch)&&a.town&&store.town&&norm(a.town)===norm(store.town)&&a.store_name&&norm(a.store_name)===norm(store.name)&&a.state&&store.state&&norm(a.state)===norm(store.state)&&aisle&&a.aisle===aisle){
   Object.assign(result.availability,{state:store.state,branch:store.branch,town:store.town,storeName:store.name,aisleNumber:aisle,section:a.section||null,aisleSourceId:a.source_id,aisleEvidence:'branch_specific'});
  }
  const estimated=estimatedGroceryFood(result),concerns=originalComparisonConcerns(estimated);
  result.assessment.primaryConcern=concerns[0]??null;
  result.assessment.highlightNutrients=concerns.slice(0,4);
  result.assessment.reasons=estimatedReasons(estimated).map(t=>({text:t,nutrientKeys:[],sourceIds:sourceId?[sourceId]:[]}));
  return result;
 }
 const original=input.product?food(input.product,'original'):null;
 return groceryWireSchema.parse({schemaVersion:'gemini-grocery-review-v1',status:original?'partial':'unidentified',original,recommendationMode:original&&!['healthy','very_healthy'].includes(original.assessment.rating??'')?'alternatives':'none',
  recommendations:input.alternatives.slice(0,3).map((f,i)=>({type:'alternative',food:food(f,'alternative'+i),comparisonBasis:{kind:'equal_mass',amount:original?.serving.grams??null,unit:'g'},benefits:[],reasonShortfall:null,tradeoffs:f.tradeoffs.slice(0,3).map(t=>clip(t,160))})),
  recommendationShortfall:input.alternatives_shortfall?clip(input.alternatives_shortfall,220):null,sources,
  safetyReminder:'Please double-check packaging, PLU stickers and store signage for nutrition, allergens, sourcing and location before purchasing.'});
}
