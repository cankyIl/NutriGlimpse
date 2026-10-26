import {z} from 'zod';
import {estimatedBenefitsDecision,comparisonPolicy,type EstimatedFood} from '../../../packages/core/src/aiFoodReview.ts';
import type {ShelfNineAlternative} from '../../../packages/core/src/shelfNine.ts';
export const shelfAlternativeDecisionSchema=z.object({index:z.number().int().min(0).max(20),comparedCell:z.number().int().min(1).max(9).nullable(),product:z.string().max(160).nullable(),disposition:z.enum(['accepted','rejected','unused']),codes:z.array(z.string().regex(/^[a-zA-Z0-9_]{1,100}$/)).max(30)}).strict();
export type ShelfAlternativeDecision=z.infer<typeof shelfAlternativeDecisionSchema>;
export type ShelfDecisionObserver=(decision:ShelfAlternativeDecision)=>void;
export function shelfBenefits(original:EstimatedFood,candidate:EstimatedFood){
 // Breakfast grain is a model wording variant; arbitrary grains are not cereals.
 const category=(f:EstimatedFood)=>{
  const description=f.category+' '+f.identity.name;
  const cereal=/\b(cereals?|oatmeal|oats|porridge|granola|muesli)\b/i.test(description);
  const otherFormat=/\b(bars?|cookies?|biscuits?|crackers?|drinks?|beverages?|milk|flour|powder)\b/i.test(description);
  if(cereal&&otherFormat)return {...f,category:'unsupported-cereal-format'};
  return cereal?{...f,category:'breakfast-cereal'}:f;
 };
 const a=category(original),b=category(candidate);
 if(comparisonPolicy(a.category).id==='cereal_v1'&&comparisonPolicy(b.category).id==='cereal_v1'){
  const preparation=(f:EstimatedFood)=>{
   const text=f.servingText??'';
   if(/\b(dry|uncooked|unprepared)\b/i.test(text))return 'dry';
   if(/\b(cooked|prepared|with milk|with water)\b/i.test(text))return 'prepared';
   if(/\b(oatmeal|oats|porridge|hot cereal)\b/i.test(f.category+' '+f.identity.name))return 'unknown';
   return 'dry';
  };
  const x=preparation(a),y=preparation(b);
  if(x==='unknown'||y==='unknown')return {benefits:[],reasons:['preparation_basis_unknown']};
  if(x!==y)return {benefits:[],reasons:['preparation_basis_mismatch']};
 }
 return estimatedBenefitsDecision(a,b,{shelfTradeoffs:true});
}
// Alternative association tolerates the same words split across brand/name/variant.
// It is NOT used to fill nutrients or collapse observations: those retain exact keys.
export function sameShelfAlternativeOriginal(a:EstimatedFood,b:EstimatedFood){
 if(a.identity.status!=='identified'||b.identity.status!=='identified'||!a.identity.brand||!b.identity.brand)return false;
 const tokens=(text:string)=>text.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(Boolean);
 const brands=[tokens(a.identity.brand),tokens(b.identity.brand)];
 if(!brands[0].every(t=>brands[1].includes(t))&&!brands[1].every(t=>brands[0].includes(t)))return false;
 const key=(f:EstimatedFood)=>[...new Set(tokens([f.identity.brand,f.identity.name,f.identity.variant].filter(Boolean).join(' ')).filter(t=>!['original','classic','regular','cereal','cereals','breakfast'].includes(t)))].sort().join('|');
 const size=(f:EstimatedFood)=>tokens(f.identity.size??'').join('');
 return key(a)===key(b)&&size(a)===size(b);
}
export function shelfReasons(original:EstimatedFood,candidate:EstimatedFood,decision:ReturnType<typeof shelfBenefits>){
 const tradeoffs=decision.reasons.flatMap(code=>code==='small_shelf_tradeoff_fiberG'?['Slightly less fiber']:code==='small_shelf_tradeoff_proteinG'?['Slightly less protein']:[]);
 return [...decision.benefits.slice(0,tradeoffs.length?1:2),...(tradeoffs.length?[tradeoffs.join(' and ')]:[])].slice(0,2);
}
// Preserve provider preference within each group; red warnings remain visible and last.
export const rankShelfAlternatives=(rows:ShelfNineAlternative[])=>[...rows].sort((a,b)=>Number(a.food.rating==='not_healthy')-Number(b.food.rating==='not_healthy'));
