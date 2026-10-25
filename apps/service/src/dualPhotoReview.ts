import {z} from 'zod';
import {estimatedFoodSchema,estimatedRatingDecision,alternativeRatingDecision,estimatedBenefitsDecision,originalComparisonConcerns,type EstimatedFood} from '../../../packages/core/src/aiFoodReview.ts';
import {dualFoodResultSchema,dualModels,type DualFoodResult,type DualModel} from '../../../packages/core/src/dualAiFoodReview.ts';
import {expandCompactReview} from './compactPhotoReview.ts';
import {parseAssessmentEnvelope} from './photoAssessmentProvider.ts';
import {validateAiReview} from './aiFoodReviewProvider.ts';
import {diagnosticFood,type BetaEvent} from './betaDiagnostics.ts';
const envelopeSchema=z.object({status:z.enum(['identified','uncertain','multiple-products','no-product']),original:z.unknown(),alternatives:z.array(z.unknown()).max(5)}).strict();
export type ReviewEnvelope=z.infer<typeof envelopeSchema>;
export function readDualEnvelope(raw:string):ReviewEnvelope{
 const envelope=envelopeSchema.parse(expandCompactReview(parseAssessmentEnvelope(raw)));
 // Original is a prerequisite. Bad candidate rows remain individually rejectable.
 validateAiReview(envelope);return envelope;
}
type Review={model:DualModel;envelope:ReviewEnvelope};

const words=(text:string)=>text.toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(Boolean);
/** Preserve formulation words; tolerate field placement and explicitly sourced parent/brand aliases only. */
export function dualIdentityKey(food:EstimatedFood){
 let brand=words(food.identity.brand??'');
 let title=words([food.identity.name,food.identity.variant].filter(Boolean).join(' '));
 const all=[...brand,...title];
 // General Mills identifies Cheerios as its brand:
 // https://www.generalmills.com/our-food/brands/cheerios (2026-10-17).
 if(['general mills','cheerios'].includes(brand.join(' '))&&all.includes('cheerios')){
  brand=['cheerios'];title=title.filter(word=>!['general','mills'].includes(word));
 }
 title=title.filter(word=>!brand.includes(word));
 if(brand.join(' ')==='cheerios'&&title.includes('original'))title=title.filter(word=>word!=='plain');
 if(['breakfastcereal','cereal','cereals','readytoeatcereal'].includes(food.category.toLowerCase().replace(/[^a-z]/g,'')))
  title=title.filter(word=>!['cereal','cereals'].includes(word));
 return brand.join(' ')+'|'+[...new Set(title)].sort().join('|');
}


function candidateIdentityProblem(food:EstimatedFood):string|null{
 const brand=words(food.identity.brand??'').join(' '),title=words([food.identity.name,food.identity.variant].filter(Boolean).join(' '));
 if(title.includes('cheerios')&&!['general mills','cheerios'].includes(brand))return 'alternative_brand_product_conflict';
 if(/\b(?:similar to|equivalent to|alternative to|any brand|store brand|generic brand)\b/i.test([food.identity.brand,food.identity.name,food.identity.variant].join(' ')))return 'alternative_approximate_identity';
 return null;
}

const mass=(food:EstimatedFood,key:keyof EstimatedFood['nutrition'])=>food.servingGrams&&food.nutrition[key]!==null?food.nutrition[key]!/food.servingGrams:null;
function different(a:EstimatedFood,b:EstimatedFood){
 return Object.keys(a.nutrition).some(raw=>{const key=raw as keyof EstimatedFood['nutrition'],x=mass(a,key),y=mass(b,key);
  return x===null||y===null?x!==y:Math.abs(x-y)>Math.max(Math.abs(x),Math.abs(y))*0.03+1e-9;
 });
}
export function mergeDualReviews(reviews:Review[],preferred?:DualModel,now=Date.now(),audit?:(event:Extract<BetaEvent,{kind:'dual_decision'}>)=>void,expectedModels:readonly DualModel[]=dualModels):DualFoodResult{
 if(!reviews.length||reviews.length>2||new Set(reviews.map(r=>r.model)).size!==reviews.length)throw Error('No complete review');
 if(!expectedModels.length||reviews.some(r=>!expectedModels.includes(r.model)))throw Error('Unexpected review model');
 const complete=expectedModels.every(model=>reviews.some(r=>r.model===model));
 const ordered=[...reviews].sort((a,b)=>dualModels.indexOf(a.model)-dualModels.indexOf(b.model));
 const checked=ordered.map(r=>({...r,result:validateAiReview(r.envelope)}));
 // Preview speed must not decide the final facts or rating. Keep a stable source order.
 void preferred;
 const chosen=checked.find(r=>r.result.original)??checked[0];
 const original=chosen.result.original?structuredClone(chosen.result.original):null;
 const models=ordered.map(r=>r.model);
 const auditRecord:Extract<BetaEvent,{kind:'dual_decision'}>={kind:'dual_decision',models,reviewState:complete?'complete':'partial',original:original?diagnosticFood(original):null,originals:checked.map(r=>({model:r.model,food:r.result.original?diagnosticFood(r.result.original):null})),candidates:[],accepted:0,reason:'no_alternatives_needed'};
 const finish=(result:DualFoodResult)=>{auditRecord.reviewState=result.reviewState;auditRecord.original=result.original?diagnosticFood(result.original):null;auditRecord.accepted=result.alternatives.length;try{audit?.(auditRecord);}catch{}return dualFoodResultSchema.parse(result);};
 const base={schemaVersion:4 as const,models,status:chosen.result.status,original,alternatives:[] as EstimatedFood[],checkedAt:new Date(now).toISOString(),basis:'ai-estimate' as const,reviewState:auditRecord.reviewState as 'complete'|'partial',estimatesDiffer:false};
 if(!original)return finish(base);
 const originals=checked.flatMap(r=>r.result.original?[r.result.original]:[]);
 const conflict=checked.some(r=>!r.result.original||dualIdentityKey(r.result.original)!==dualIdentityKey(original));
 if(conflict){
  original.identity.status='uncertain';original.rating=null;auditRecord.reason='original_identity_disagreement';
  return finish({...base,status:'uncertain',reviewState:'identity-conflict'});
 }
 base.estimatesDiffer=originals.some(f=>different(original,f));
 if(originals.some(f=>f.identity.status!=='identified'||estimatedRatingDecision(f).rating===null)){
  original.rating=null;auditRecord.reason='original_facts_unavailable';return finish(base);
 }
 // A disagreement in ratings needs a package-label check, not a favorable first response.
 if(new Set(originals.map(f=>f.rating)).size>1)original.rating=null;
 const needs=checked.some(r=>{
  const raw=estimatedFoodSchema.safeParse(r.envelope.original),computed=r.result.original?estimatedRatingDecision(r.result.original).rating:null;
  return [computed,raw.success?raw.data.rating:null].some(rating=>rating==='neutral'||rating==='not_healthy');
 });
 if(!needs)return finish(base);
 const groups=new Map<string,{food:EstimatedFood;model:DualModel;index:number}[]>();
 let index=0;
 for(const review of ordered)for(const raw of review.envelope.alternatives){
  const row=estimatedFoodSchema.safeParse(raw),n=index++;
  if(!row.success){auditRecord.candidates.push({index:n,food:null,computedRating:null,disposition:'rejected',reasons:['invalid_alternative_schema']});continue;}
  const food=row.data,key=dualIdentityKey(food),rows=groups.get(key)??[];rows.push({food,model:review.model,index:n});groups.set(key,rows);
 }
 const accepted:{food:EstimatedFood;items:typeof auditRecord.candidates}[]=[];
 for(const [key,rows] of groups){
  const items=rows.map(row=>({index:row.index,food:diagnosticFood(row.food),computedRating:estimatedRatingDecision(row.food).rating,disposition:'rejected' as 'accepted'|'rejected'|'unused',reasons:[] as string[]}));
  let valid=key!==dualIdentityKey(original);
  if(!valid)for(const item of items)item.reasons.push('duplicate_original');
  const candidates=rows.map((row,i)=>{
   const identityProblem=candidateIdentityProblem(row.food);
   if(identityProblem){valid=false;items[i].reasons.push(identityProblem);}
   const rating=alternativeRatingDecision(row.food);items[i].reasons.push(...rating.reasons);
   const food={...row.food,rating:rating.rating};
   if(rating.rating===null){valid=false;return food;}
   for(const source of originals){const comparison=estimatedBenefitsDecision(source,food);items[i].reasons.push(...comparison.reasons);if(!comparison.benefits.length)valid=false;}
   return food;
  });
  if(candidates.some(f=>different(candidates[0],f)))base.estimatesDiffer=true;
  if(valid)accepted.push({food:candidates[0],items});
  else {for(const item of items){item.reasons=[...new Set([...item.reasons,'union_candidate_failed_checks'])].slice(0,20);}auditRecord.candidates.push(...items);}
 }
 // All candidates are validated before selection. Target the original leading concern first.
 const concerns=originalComparisonConcerns(original);
 accepted.sort((a,b)=>{
  for(const key of concerns){const x=mass(a.food,key),y=mass(b.food,key);if(x!==null&&y!==null&&Math.abs(x-y)>1e-9)return x-y;}
  return dualIdentityKey(a.food).localeCompare(dualIdentityKey(b.food));
 });
 for(const [i,row] of accepted.entries()){
  for(const [j,item] of row.items.entries()){item.disposition=i<3&&j===0?'accepted':'unused';item.reasons=[...new Set([...item.reasons,i>=3?'three_alternatives_selected':j?'duplicate_union_product':'union_candidate_passed'])].slice(0,20);}
  auditRecord.candidates.push(...row.items);
 }
 auditRecord.candidates.sort((a,b)=>a.index-b.index);
 base.alternatives=accepted.slice(0,3).map(r=>r.food);
 auditRecord.reason=base.alternatives.length?'union_alternatives_selected':index?'union_all_candidates_rejected':'model_returned_no_alternatives';
 return finish(base);
}
