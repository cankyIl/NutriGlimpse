import {groceryWireSchema,estimatedGroceryFood,type GroceryWire,type GroceryFood,type GroceryContext} from '../../../packages/core/src/groceryReview.ts';
import {estimatedRatingDecision,estimatedBenefitsDecision,estimatedIdentityKey} from '../../../packages/core/src/aiFoodReview.ts';
const key=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]/g,'');
const urlKey=(s:string)=>{try{const u=new URL(s);u.hash='';return u.href;}catch{return '';}};
const retailerDomain=(store:string,url:string)=>{
 const name=key(store),host=new URL(url).hostname.replace(/^www\./,'');
 const domains=name.includes('wegmans')?['wegmans.com']:name.includes('walmart')?['walmart.com']:name.includes('pricechopper')?['pricechopper.com']:name.includes('wholefoods')?['wholefoodsmarket.com']:name.includes('traderjoe')?['traderjoes.com']:[];
 return domains.some(d=>host===d||host.endsWith('.'+d));
};
const rank={very_healthy:0,healthy:1,neutral:2,not_healthy:3};
type Audit={code:string;foodId:string};
export function validateGroceryReview(value:unknown,context:GroceryContext,groundedUrls:ReadonlySet<string>):{review:GroceryWire;audit:Audit[]}{
 // A numeric aisle is normalized before strict validation; no other coercion.
 const input=structuredClone(value) as Record<string,unknown>;
 const rows=[input?.original,...(Array.isArray(input?.recommendations)?input.recommendations.map(x=>x?.food):[])];
 for(const raw of rows){const a=raw?.availability;if(a&&typeof a.aisleNumber==='number'&&Number.isSafeInteger(a.aisleNumber)&&a.aisleNumber>=0)a.aisleNumber=String(a.aisleNumber);}
 const review=groceryWireSchema.parse(input),audit:Audit[]=[];
 if(new Set(review.sources.map(s=>s.id)).size!==review.sources.length)throw Error('grocery_duplicate_sources');
 const urls=new Set([...groundedUrls].map(urlKey));
 const sources=new Map(review.sources.filter(s=>s.kind==='photo_label'&&s.url===null||s.url&&urls.has(urlKey(s.url))).map(s=>[s.id,s]));
 review.sources=[...sources.values()];
 const has=(id:string|null)=>!!id&&sources.has(id);
 const issue=(f:GroceryFood,code:string)=>audit.push({code,foodId:f.id});
 function food(f:GroceryFood){
  const serving=has(f.serving.sourceId)&&(f.serving.grams!==null&&f.serving.grams>0||f.serving.milliliters!==null&&f.serving.milliliters>0)&&!!f.serving.text;
  const evidence=new Map(f.nutrientEvidence.filter(e=>has(e.sourceId)).map(e=>[e.nutrient,e.sourceId]));
  for(const k of Object.keys(f.nutrition) as (keyof typeof f.nutrition)[]){
   if(!serving||!evidence.has(k)){if(f.nutrition[k]!==null)issue(f,'unsupported_'+k);f.nutrition[k]=null;}
  }
  f.nutrientEvidence=f.nutrientEvidence.filter(e=>has(e.sourceId)&&f.nutrition[e.nutrient]!==null);
  if(!serving){f.serving={text:null,grams:null,milliliters:null,basis:'unknown',sourceId:null};issue(f,'serving_evidence_missing');}
  if(!has(f.ingredientSourceId)){f.ingredients=null;f.ingredientSourceId=null;}
  f.dietaryEvidence=f.dietaryEvidence.map(e=>e.sourceIds.some(has)?e:{...e,status:'unknown',claim:null,sourceIds:[]});
  f.assessment.reasons=f.assessment.reasons.filter(e=>e.sourceIds.length>0&&e.sourceIds.every(has)&&e.nutrientKeys.every(k=>f.nutrition[k]!==null));
  f.assessment.highlightNutrients=f.assessment.highlightNutrients.filter(k=>f.nutrition[k]!==null);
  if(f.assessment.primaryConcern&&f.nutrition[f.assessment.primaryConcern]===null)f.assessment.primaryConcern=null;
  if(f.image.kind==='reference'&&(!f.image.url||!has(f.image.sourceId))){f.image={kind:'none',url:null,sourceId:null};}
  const a=f.availability,store=context.store,source=has(a.sourceId)?sources.get(a.sourceId!):undefined;
  const chain=!!store&&!!a.storeName&&key(store.name)===key(a.storeName);
  const branch=chain&&!!store?.branch&&!!a.branch&&key(store.branch)===key(a.branch)&&!!store.town&&!!a.town&&key(store.town)===key(a.town)&&!!store.state&&!!a.state&&key(store.state)===key(a.state);
  if(!source||source.kind!=='retailer'||!chain||!source.url||!retailerDomain(store!.name,source.url)){a.status='unknown';a.sourceId=null;}
  else if(!branch&&['branch_stock_reported','branch_listed'].includes(a.status)){a.status='chain_listed';issue(f,'branch_not_matched');}
  if(!branch||!has(a.aisleSourceId)||sources.get(a.aisleSourceId!)?.kind!=='retailer'||!sources.get(a.aisleSourceId!)?.url||!retailerDomain(store!.name,sources.get(a.aisleSourceId!)!.url!)||a.aisleEvidence!=='branch_specific'){
   if(a.aisleNumber||a.section)issue(f,'aisle_evidence_missing');
   a.aisleNumber=null;a.section=null;a.aisleSourceId=null;a.aisleEvidence='unknown';
  }
  const checked=estimatedRatingDecision(estimatedGroceryFood(f));
  // Preserve the existing completeness/mass/sugar checks and conservative disagreements.
  if(checked.rating===null){f.assessment.rating=null;issue(f,'nutrition_incomplete_or_inconsistent');for(const reason of checked.reasons)issue(f,reason);}
  else if(f.assessment.rating&&f.identity.kind!=='produce'&&rank[checked.rating]>rank[f.assessment.rating])f.assessment.rating=checked.rating;
  if(context.healthConditions.includes('ckd')){
   f.assessment.rating=null;issue(f,'kidney_targets_require_review');
   f.assessment.limitations=[...f.assessment.limitations,'Kidney-related nutrient targets depend on your care plan.'].slice(0,4);
  }
  const required=[...context.dietaryRestrictions,...(context.healthConditions.includes('celiac')?['glutenFree']:[])];
  const eligible=required.every(restriction=>f.dietaryEvidence.some(e=>key(e.restriction)===key(restriction)&&['manufacturer_claim_found','certification_found'].includes(e.status)&&e.sourceIds.some(id=>['manufacturer','certifier','photo_label'].includes(sources.get(id)?.kind??''))));
  if(!eligible){f.assessment.rating=null;issue(f,'dietary_evidence_missing');}
  return eligible&&checked.rating!==null&&f.assessment.rating!==null;
 }
 const original=review.original;
 if(!original){review.recommendations=[];review.recommendationMode='none';review.status='unidentified';return {review,audit};}
 food(original);
 const seen=new Set([estimatedIdentityKey(estimatedGroceryFood(original))]);
 const mode=original.assessment.rating===null?'none':['healthy','very_healthy'].includes(original.assessment.rating)?(review.recommendationMode==='none'?'none':'complements'):'alternatives';
 review.recommendationMode=mode;
 const proposed=review.recommendations.length;
 review.recommendations=review.recommendations.filter(row=>{
  const f=row.food,eligible=food(f),id=estimatedIdentityKey(estimatedGroceryFood(f));
  if(seen.has(id)){issue(f,'duplicate_food');return false;}seen.add(id);
  if(!eligible||mode==='none'||row.type!==(mode==='alternatives'?'alternative':'complement')){issue(f,'recommendation_not_eligible');return false;}
  row.benefits=row.benefits.filter(e=>e.sourceIds.length>0&&e.sourceIds.every(has)&&e.nutrientKeys.every(k=>f.nutrition[k]!==null));
  if(mode==='alternatives'){
   const decision=estimatedBenefitsDecision(estimatedGroceryFood(original),estimatedGroceryFood(f),{groundedTradeoffs:true});
   if(!decision.benefits.length){for(const code of decision.reasons)issue(f,code);return false;}
   // Deterministic nutrient comparisons lead, rather than a model's unrelated benefit.
   row.benefits=decision.benefits.map(text=>({text,nutrientKeys:[],sourceIds:[...new Set(f.nutrientEvidence.map(e=>e.sourceId))].slice(0,5)}));
   row.comparisonBasis={kind:'equal_mass',amount:original.serving.grams,unit:'g'};
   const tradeoffs:string[]=[];
   if(decision.reasons.includes('small_sauce_protein_tradeoff')){
    const loss=original.nutrition.proteinG!-f.nutrition.proteinG!*original.serving.grams!/f.serving.grams!;
    tradeoffs.push(Number(loss.toFixed(2))+' g less protein per '+original.serving.grams+' g.');
   }
   if(f.assessment.rating==='not_healthy')tradeoffs.push('Still rated red; this is a relative improvement, not a healthy rating.');
   row.tradeoffs=[...new Set([...tradeoffs,...row.tradeoffs])].slice(0,3);

  }else{
   if(!['healthy','very_healthy'].includes(f.assessment.rating!)||!row.benefits.length){issue(f,'complement_not_supported');return false;}
   row.comparisonBasis={kind:'meal_pairing',amount:null,unit:null};
  }
  if(row.benefits.length<3)row.reasonShortfall='Only the supported benefits are shown.';
  return true;
 }).sort((a,b)=>Number(a.food.assessment.rating==='not_healthy')-Number(b.food.assessment.rating==='not_healthy')).slice(0,mode==='complements'?2:3);
 if(mode==='none'){review.recommendationShortfall=original.assessment.rating===null?'More nutrition or dietary evidence is needed before suggesting a change.':null;}
 else if(review.recommendations.length<(mode==='complements'?2:3)){
  review.recommendationShortfall=review.recommendations.length<proposed?'Some suggestions did not pass the nutrition, dietary or comparison checks.':review.recommendationShortfall??'The review did not confirm additional suitable options.';
 }
 if(original.assessment.rating===null||review.recommendationShortfall||audit.length)review.status='partial';
 review.safetyReminder='Please double-check packaging, PLU stickers and store signage for nutrition, allergens, sourcing and location before purchasing.';
 return {review:groceryWireSchema.parse(review),audit};
}
