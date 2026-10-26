import {z} from 'zod';
import {productTitleKey} from '../../../packages/core/src/productTitleKey.ts';
import {groceryWireSchema,groceryNutrients,groceryUrl,type GroceryFood,type GroceryWire,type GroceryContext} from '../../../packages/core/src/groceryReview.ts';
import {exactSourceUrl} from './geminiPhotoAdapter.ts';

const optionalText=z.preprocess(v=>typeof v==='string'?v:null,z.string().nullable());
const aisleSchema=z.object({number:z.union([z.string(),z.number().int().nonnegative()]).nullable().optional().catch(null),section:optionalText,store:optionalText,town:optionalText,state:optionalText,source_url:optionalText});
const foodSchema=z.object({title:z.string().trim().min(1).max(500),nutrition:z.record(z.string(),z.unknown()).nullish().transform(v=>v??{}),
 rating:z.enum(['healthy','neutral','not_healthy']).nullable().default(null),reasons:z.array(z.string()).max(8).nullish().transform(v=>v??[]),
 uncertainties:z.array(z.string()).max(8).nullish().transform(v=>v??[]),source_url:optionalText,retailer_url:optionalText,image_url:optionalText,store:optionalText,aisle:aisleSchema.nullable().optional().catch(null)});
export const simpleGroceryAnswerSchema=z.object({product:foodSchema.nullable().optional().catch(null).transform(v=>v??null),alternatives:z.array(foodSchema.nullable().catch(null)).max(12).nullish().transform(v=>(v??[]).filter((f):f is z.infer<typeof foodSchema>=>f!==null))});
type SimpleFood=z.infer<typeof foodSchema>;
type Audit={foodId:string;code:string};
const clean=(s:string,n:number)=>s.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,n);
const norm=(s:string|null|undefined)=>(s??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const validUrl=(s:string|null|undefined)=>s&&groceryUrl.safeParse(s).success?s:null;
export function chainDomain(store:string|null|undefined,url:string){
 if(!validUrl(url))return false;
 const name=norm(store?.replace(/['’]/g,'')),host=new URL(url).hostname;
 const domain=name.includes('wegmans')?'wegmans.com':name.includes('walmart')?'walmart.com':name.includes('whole foods')?'wholefoodsmarket.com':name.includes('price chopper')?'pricechopper.com':name.includes('trader joe')?'traderjoes.com':name.includes('target')?'target.com':name.includes('shaws')?'shaws.com':name.includes('hannaford')?'hannaford.com':name.includes('aldi')?'aldi.us':name.includes('stop')&&name.includes('shop')?'stopandshop.com':name.includes('costco')?'costco.com':name.includes('market basket')?'shopmarketbasket.com':null;
 return !!domain&&(host===domain||host.endsWith('.'+domain));
}
const nutrientWords:Partial<Record<keyof GroceryFood['nutrition'],RegExp>>={sodiumMg:/sodium|salt/i,addedSugarsG:/added sugar/i,sugarsG:/sugar/i,saturatedFatG:/saturated fat/i,transFatG:/trans fat/i,fiberG:/fib(?:er|re)/i,proteinG:/protein/i,carbohydrateG:/carb/i,caloriesKcal:/calori/i};

/** Model-led general review. Preserves partial facts; never runs per-serving thresholds on unknown quantities. */
export function adaptSimpleGroceryAnswer(value:unknown,context:GroceryContext,groundedUrls:ReadonlySet<string>,searchRecords:unknown=[],options:{allowUnverifiedEstimates?:boolean;preserveReturnedAisle?:boolean;primaryOriginal?:GroceryFood;idPrefix?:string}={}):{review:GroceryWire;audit:Audit[];candidates:GroceryFood[];proposedCount:number;eligible:GroceryWire['recommendations']}{
 const input=simpleGroceryAnswerSchema.parse(value),audit:Audit[]=[],sources:GroceryWire['sources']=[],candidates:GroceryFood[]=[];
 const grounded=new Set([...groundedUrls].flatMap(u=>exactSourceUrl(u)??[]));
 const source=(url:string|null|undefined,id:string,title:string,kind?:GroceryWire['sources'][number]['kind']):string|null=>{
  const exact=exactSourceUrl(url);if(!exact||!grounded.has(exact))return null;
  sources.push({id,kind:kind??(chainDomain(context.store?.name,exact)?'retailer':new URL(exact).hostname.endsWith('.usda.gov')?'usda':'guideline'),url:exact,title:clean(title,250)});return id;
 };
 function food(raw:SimpleFood,id:string):GroceryFood{
  const issue=(code:string)=>audit.push({foodId:id,code});
  const sourceId=source(raw.source_url,id+'-source',raw.title);
  const nutrition=Object.fromEntries(Object.keys(groceryNutrients.shape).map(k=>[k,null])) as GroceryFood['nutrition'];
  const limitations=raw.uncertainties.map(s=>clean(s,180)).filter(Boolean);
  // Field bounds are independent: one omitted or invalid value never erases the other facts.
  for(const k of Object.keys(nutrition) as (keyof typeof nutrition)[]){
   const parsed=groceryNutrients.shape[k].safeParse(raw.nutrition[k]??null);
   if((sourceId||options.allowUnverifiedEstimates)&&parsed.success)nutrition[k]=parsed.data;
   else if(raw.nutrition[k]!=null)issue(sourceId||options.allowUnverifiedEstimates?'invalid_'+k:'source_not_grounded_'+k);
  }
  const inconsistent=(part:keyof typeof nutrition,total:keyof typeof nutrition)=>{
   const a=nutrition[part],b=nutrition[total];if(a!==null&&b!==null&&a>b+1){nutrition[part]=null;issue('inconsistent_'+part);limitations.unshift('Some nutrient values conflict; check the package for those amounts.');}
  };
  inconsistent('addedSugarsG','sugarsG');inconsistent('sugarsG','carbohydrateG');inconsistent('fiberG','carbohydrateG');inconsistent('saturatedFatG','totalFatG');inconsistent('transFatG','totalFatG');
  const known=Object.values(nutrition).some(n=>n!==null);
  const reasons=raw.reasons.map(s=>clean(s,110)).filter(Boolean).slice(0,3).map(text=>({text,nutrientKeys:(Object.entries(nutrientWords) as [keyof typeof nutrition,RegExp][]).filter(([k,re])=>re.test(text)&&nutrition[k]!==null).map(([k])=>k).slice(0,4),sourceIds:sourceId?[sourceId]:[]}));
  const canShowAssessment=known&&!!(sourceId||options.allowUnverifiedEstimates);
  let rating=canShowAssessment?raw.rating:null;
  if(!sourceId){issue('nutrition_source_unconfirmed');limitations.unshift(options.allowUnverifiedEstimates?'Nutrition and rating are AI estimates, not verified against a cited product label. Check the package.':'A matching nutrition source was not confirmed; check the package.');}
  if(!known){issue('nutrition_unavailable');rating=null;}
  if(Object.values(nutrition).some(n=>n===null))limitations.push('Some nutrients are unknown; missing values are not zero.');
  limitations.push('Nutrition quantity is not supplied. Check the source or label before comparing amounts.');
  // No per-serving threshold or assumed 100 g/one-portion normalization is applied here.
  if(nutrition.transFatG!==null&&nutrition.transFatG>0&&rating==='healthy'){
   rating='not_healthy';issue('positive_trans_fat');reasons.unshift({text:'Contains trans fat',nutrientKeys:['transFatG'],sourceIds:sourceId?[sourceId]:[]});
  }
  const required=[...context.dietaryRestrictions,...(context.healthConditions.includes('celiac')?['glutenFree']:[])];
  if(required.length){rating=null;issue('dietary_evidence_missing');limitations.unshift('Dietary requirements are not verified for this package. Check its label.');}
  if(context.healthConditions.includes('ckd')){rating=null;issue('kidney_targets_require_review');limitations.unshift('Kidney-related nutrient targets require your care plan.');}
  const image=validUrl(raw.image_url),imagePage=validUrl(raw.retailer_url)||validUrl(raw.source_url);
   // A package photo is display metadata, not proof of the nutrition. Keep its source separate.
   const imageSourceId=id!=='original'&&image&&imagePage?id+'-image':null;
   if(imageSourceId)sources.push({id:imageSourceId,kind:raw.retailer_url?'retailer':'manufacturer',url:imagePage,title:clean(raw.title+' reference package photo',250)});
  // Retailer discovery is separate from the nutrition source (often a manufacturer).
  const storeName=raw.store||null;
  const listingUrl=raw.retailer_url||raw.source_url;
  const listingId=listingUrl&&chainDomain(storeName,listingUrl)?(exactSourceUrl(listingUrl)===exactSourceUrl(raw.source_url)?sourceId:source(listingUrl,id+'-listing',raw.title+' retailer listing','retailer')):null;
  const availability:GroceryFood['availability']={status:listingId?'chain_listed':'unknown',storeName:storeName?clean(storeName,160):null,town:null,state:null,branch:null,sourceId:listingId,aisleNumber:null,section:null,aisleSourceId:null,aisleEvidence:'unknown'};
  const a=raw.aisle,store=context.store;
  // Gemini's aisle is display metadata. Missing branch proof must not erase it or certify it.
  if(options.preserveReturnedAisle&&a){
   const number=a.number!=null?clean(String(a.number),60)||null:null;
   const section=a.section?clean(a.section,100)||null:null;
   if(number||section){
    const aisleStore=a.store?clean(a.store,160)||availability.storeName:availability.storeName;
    // Do not attach another chain's listing to the retailer named in the aisle response.
    if(norm(aisleStore)!==norm(availability.storeName)){availability.status='unknown';availability.sourceId=null;}
    Object.assign(availability,{aisleNumber:number,section,storeName:aisleStore,
     town:a.town?clean(a.town,100)||null:null,state:a.state?clean(a.state,40)||null:null,
     aisleSourceId:source(a.source_url,id+'-aisle',raw.title+' store location','retailer')});
    issue('model_aisle_retained');
   }
  }
  // The legacy evidence path remains available; it does not gate Gemini display metadata.
  const aisleInSource=(url:string,phrase:string,town:string)=>{
   if(!Array.isArray(searchRecords)||!phrase||!town)return false;
   const target=exactSourceUrl(url),wanted=norm(phrase).split(' ');
   return searchRecords.slice(0,6).some(record=>record?.status==='ok'&&Array.isArray(record.results)&&record.results.slice(0,5).some((hit:any)=>{
    if(exactSourceUrl(hit?.url)!==target&&exactSourceUrl(hit?.resolvedUrl)!==target)return false;
    const tokens=norm([hit.snippet,hit.pageText].filter(x=>typeof x==='string').join(' ').slice(0,16000)).split(' ');
    for(let i=0;i<tokens.length;i++){
     if(!wanted.every((t,j)=>tokens[i+j]===t))continue;
     if((' '+tokens.slice(Math.max(0,i-35),i+40).join(' ')+' ').includes(' '+norm(town)+' '))return true;
    }
    return false;
   }));
  };
  if(!options.preserveReturnedAisle&&a&&store?.town&&store.state&&a.source_url&&chainDomain(store.name,a.source_url)&&norm(a.store)===norm(store.name)&&norm(storeName)===norm(store.name)&&norm(a.town)===norm(store.town)&&norm(a.state)===norm(store.state)){
   const number=a.number!=null&&aisleInSource(a.source_url,'Aisle '+String(a.number).replace(/^aisle\s*/i,''),store.town)?clean(String(a.number),60)||null:null;
   const section=a.section&&aisleInSource(a.source_url,a.section,store.town)?clean(a.section,100):null;
   if(number||section){
    const aisleId=source(a.source_url,id+'-aisle',raw.title+' store location','retailer');
    if(aisleId){Object.assign(availability,{town:store.town,state:store.state,branch:store.branch,aisleNumber:number,section,aisleSourceId:aisleId,aisleEvidence:'branch_specific'});}
   }
  }
  if(!listingId)issue('store_listing_unconfirmed');
  if(availability.aisleEvidence==='unknown')issue(a?.number!=null||a?.section?'aisle_evidence_missing':'aisle_not_returned');
  const storeNote=!listingId
   ?'Store availability'+(availability.aisleNumber===null?' and aisle':'')+' not confirmed'+(context.store?.name?' for '+context.store.name:'')+'.'
   :availability.aisleNumber===null?'Aisle not found for this branch.':null;
  if(storeNote){limitations.splice(3);limitations.push(clean(storeNote,180));}
  return {id,identity:{kind:'packaged',status:'identified',brand:null,name:clean(raw.title,160),variant:null,size:null,category:'grocery'},
   serving:{text:null,grams:null,milliliters:null,basis:'unknown',sourceId:null},nutrition,
   nutrientEvidence:sourceId?Object.entries(nutrition).filter(([,v])=>v!==null).map(([nutrient])=>({nutrient:nutrient as keyof typeof nutrition,sourceId})):[],
   ingredients:null,ingredientSourceId:null,dietaryEvidence:[],assessment:{rating,primaryConcern:reasons[0]?.nutrientKeys[0]??null,highlightNutrients:reasons.flatMap(r=>r.nutrientKeys).slice(0,4),reasons:canShowAssessment?reasons.slice(0,3):[],limitations:[...new Set(limitations)].slice(0,4)},
   image:id==='original'?{kind:'scan_photo',url:null,sourceId:null}:image&&imageSourceId?{kind:'reference',url:image,sourceId:imageSourceId}:{kind:'none',url:null,sourceId:null},availability};
 }
 const original=options.primaryOriginal??(input.product?food(input.product,'original'):null);
 const mode=original?.assessment.rating&&['neutral','not_healthy'].includes(original.assessment.rating)?'alternatives':'none';
 const seen=new Set([productTitleKey(original?.identity.name??'')]),recommendations:GroceryWire['recommendations']=[];
 for(const [i,raw] of input.alternatives.entries()){
  if(mode==='none')break;
  const id=(options.idPrefix??'')+'alternative'+i,key=productTitleKey(raw.title);
  if(seen.has(key)){audit.push({foodId:id,code:'duplicate_food'});continue;}seen.add(key);
  const f=food(raw,id);candidates.push(f);
  if(!f.assessment.rating){audit.push({foodId:id,code:'recommendation_not_supported'});continue;}
  recommendations.push({type:'alternative',food:f,comparisonBasis:{kind:'not_comparable',amount:null,unit:null},
   benefits:f.assessment.reasons,reasonShortfall:null,
   tradeoffs:[...(f.assessment.rating==='not_healthy'?['Still rated red; a relative improvement, not a healthy rating.']:[]),...raw.uncertainties.map(s=>clean(s,160)).filter(Boolean)].slice(0,3)});
 }
 recommendations.sort((a,b)=>Number(a.food.assessment.rating==='not_healthy')-Number(b.food.assessment.rating==='not_healthy'));
 const review=groceryWireSchema.parse({schemaVersion:'gemini-grocery-review-v1',status:original?'partial':'unidentified',original,recommendationMode:mode,recommendations:recommendations.slice(0,3),
  recommendationShortfall:mode==='alternatives'&&recommendations.length<3?(options.allowUnverifiedEstimates?'Only the suggestions returned for this scan are shown.':'Only the sourced suggestions found for this scan are shown.'):null,sources:sources.slice(0,24),
  safetyReminder:'Check the package for nutrition and dietary requirements. These are general comparisons, not personalized medical recommendations.'});
 return {review,audit,candidates,proposedCount:input.alternatives.length,eligible:recommendations};
}
