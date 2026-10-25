import {z} from 'zod';
import {weightContextSchema,weightReasonOrder,weightBenefitOrder,type WeightCategory} from './weightContext.ts';
import {foodSchema,type PublicFood} from './publicFood.ts';
import {photoIdentitySchema,productPhotoRequestSchema,PRODUCT_PHOTO_MODEL,type PhotoIdentity} from './productPhoto.ts';
import {currentLabelSource} from './labelChecks.ts';
import {comparisonReady} from './catalogAlternatives.ts';
import {verifiedGlutenEvidence} from './productLabelEvidence.ts';

export const PHOTO_ASSESSMENT_CONSENT='product-photo-assessment-2026-10-16.1' as const;
export const FOOD_RATING_POLICY='general-label-2026-10-16.1' as const;
export const foodRatings=['very_healthy','healthy','neutral','not_healthy'] as const;
export type FoodRating=typeof foodRatings[number];
export const ratingPresentation={
 very_healthy:{label:'Very healthy',color:'#166534'},
 healthy:{label:'Healthy',color:'#86C94A'},
 neutral:{label:'Neutral',color:'#FACC15'},
 not_healthy:{label:'Not healthy',color:'#DC2626'},
} as const;
export const ratingReasons={
 high_sodium:'High sodium for this portion.',high_saturated_fat:'High saturated fat for this portion.',
 trans_fat:'Trans fat is reported.',high_added_sugar:'High added sugar for this portion.',
 low_sodium:'Low sodium.',low_saturated_fat:'Low saturated fat.',low_added_sugar:'Little added sugar.',
 high_fiber:'High in fiber.',fiber:'Provides fiber.',protein:'Provides protein.',mixed:'Mixed nutrition benefits and trade-offs.',
} as const;
export const benefitLabels={sodiumMg:'Lower sodium',saturatedFatG:'Less saturated fat',sugarsG:'Less total sugar',addedSugarsG:'Less added sugar',fiberG:'More fiber',proteinG:'More protein'} as const;
export const tradeoffLabels={sodiumMg:'Somewhat more sodium',saturatedFatG:'Somewhat more saturated fat',sugarsG:'Somewhat more total sugar',addedSugarsG:'Somewhat more added sugar',fiberG:'Somewhat less fiber',proteinG:'Somewhat less protein'} as const;
export type Benefit=keyof typeof benefitLabels;
const reasonSchema=z.enum(Object.keys(ratingReasons) as [keyof typeof ratingReasons,...(keyof typeof ratingReasons)[]]);
const nullableRating=z.enum(foodRatings).nullable();
export const photoAssessmentRequestSchema=productPhotoRequestSchema.extend({consentVersion:z.literal(PHOTO_ASSESSMENT_CONSENT),weightContext:weightContextSchema.optional()}).strict();
export const photoProposalSchema=z.object({identity:photoIdentitySchema,alternatives:z.array(photoIdentitySchema).max(3)}).strict();
export type PhotoProposal=z.infer<typeof photoProposalSchema>;
export const modelAssessmentSchema=z.object({assessments:z.array(z.object({key:z.string().max(60),rating:nullableRating,reasons:z.array(reasonSchema).max(3)}).strict()).max(4)}).strict();
export type ModelAssessment=z.infer<typeof modelAssessmentSchema>;
export const assessmentSchema=z.object({
 status:z.enum(['rated','insufficient_information','ai_unavailable','disagreement','uncertain_product']),
 rating:nullableRating,reasons:z.array(reasonSchema).max(3),missing:z.array(z.string().max(120)).max(20),
 alternativesNeeded:z.boolean(),scope:z.literal('general-nutrition'),policyVersion:z.literal(FOOD_RATING_POLICY),
}).strict();
export type FoodAssessment=z.infer<typeof assessmentSchema>;
const benefitSchema=z.enum(Object.keys(benefitLabels) as [Benefit,...Benefit[]]);
const alternativeSchema=z.object({food:foodSchema,assessment:assessmentSchema,benefits:z.array(benefitSchema).min(1).max(3),tradeoffs:z.array(benefitSchema).max(3).default([])}).strict();
export const photoAssessmentResponseSchema=z.object({
 schemaVersion:z.literal(2),model:z.literal(PRODUCT_PHOTO_MODEL),identity:photoIdentitySchema,foods:z.array(foodSchema).max(1),
 assessment:assessmentSchema,alternatives:z.array(alternativeSchema).max(3),checkedAt:z.string().datetime(),candidatesChecked:z.number().int().min(0).max(3),
}).strict().superRefine((r,ctx)=>{
 const a=r.assessment;
 if((a.status==='rated')!==(a.rating!==null)||a.alternativesNeeded!==(a.rating==='neutral'||a.rating==='not_healthy')||(!a.alternativesNeeded&&r.alternatives.length)||(!r.foods.length&&a.rating!==null)||(r.identity.status!=='identified'&&a.rating!==null))
  ctx.addIssue({code:'custom',message:'Inconsistent rating'});
 const seen=new Set(r.foods.map(foodKey));const barcodes=new Set(r.foods.map(f=>f.barcode).filter(Boolean));
 for(const alt of r.alternatives){
  if(alt.assessment.status!=='rated'||!['healthy','very_healthy'].includes(alt.assessment.rating??'')||seen.has(foodKey(alt.food))||(alt.food.barcode&&barcodes.has(alt.food.barcode)))
   ctx.addIssue({code:'custom',message:'Invalid alternative'});
  seen.add(foodKey(alt.food));if(alt.food.barcode)barcodes.add(alt.food.barcode);
 }
});
export type PhotoAssessmentResult=z.infer<typeof photoAssessmentResponseSchema>;
export const foodKey=(f:PublicFood)=>f.provider+':'+f.id;
export const productTitle=(i:PhotoIdentity)=>[i.brand,i.name,i.variant&&!(i.name??'').toLowerCase().includes(i.variant.toLowerCase())?i.variant:null].filter(Boolean).join(' ');
export function unavailableAssessment(status:FoodAssessment['status'],missing:string[]=[]):FoodAssessment{
 return {status,rating:null,reasons:[],missing,alternativesNeeded:false,scope:'general-nutrition',policyVersion:FOOD_RATING_POLICY};
}
/** Versioned beta product-comparison rubric, NOT an FDA whole-food rating or a clinical rule. */
export function labelRating(food:PublicFood,now=Date.now(),weightCategory?:WeightCategory):FoodAssessment{
 const missing:string[]=[];
 if(!comparisonReady(food,now)||!currentLabelSource(food,now))missing.push('Current, comparable nutrition record');
 if(!food.servingGrams)missing.push('Serving weight');
 const e=food.nutritionExtras,n=food.nutrients,t=food.additionalNutrients?.transFatG;
 if(!e||e.proteinG===null||e.carbohydrateG===null)missing.push('Protein and total carbohydrate');
 if(e?.addedSugarsG===undefined||e.addedSugarsG===null)missing.push('Added sugars');
 if(t===undefined||t===null)missing.push('Trans fat');
 if(e&&((e.proteinG??0)>100||(e.carbohydrateG??0)>100||(e.addedSugarsG??0)>100||
  (e.addedSugarsG!==null&&n.sugarsG!==null&&e.addedSugarsG>n.sugarsG+0.5)||
  (e.carbohydrateG!==null&&n.sugarsG!==null&&n.sugarsG>e.carbohydrateG+0.5)))missing.push('Consistent nutrient amounts');
 if(missing.length)return unavailableAssessment('insufficient_information',missing);
 const scale=food.servingGrams!/100;
 const sodium=n.sodiumMg!*scale,sat=n.saturatedFatG!*scale,added=e!.addedSugarsG!*scale,fiber=n.fiberG!*scale,protein=e!.proteinG!*scale;
 const reasons:(keyof typeof ratingReasons)[]=[];
 if(t!>0)reasons.push('trans_fat');
 if(sodium>=460)reasons.push('high_sodium');
 if(sat>=4)reasons.push('high_saturated_fat');
 if(added>=10)reasons.push('high_added_sugar');
 let rating:FoodRating;
 if(reasons.length)rating='not_healthy';
 else{
  if(fiber>=5.6)reasons.push('high_fiber');else if(fiber>=2.8)reasons.push('fiber');
  if(protein>=5)reasons.push('protein');
  if(sodium<=115)reasons.push('low_sodium');
  if(sat<=1)reasons.push('low_saturated_fat');
  if(added<=2.5)reasons.push('low_added_sugar');
  const low=sodium<=115&&sat<=1&&added<=2.5;
  rating=low&&fiber>=5.6?'very_healthy':
   sodium<=230&&sat<=2&&added<=5&&(fiber>=2.8||protein>=5)?'healthy':'neutral';
  if(rating==='neutral')reasons.unshift('mixed');
 }
 return {status:'rated',rating,reasons:weightReasonOrder(reasons,weightCategory).slice(0,3),missing:[],alternativesNeeded:rating==='neutral'||rating==='not_healthy',scope:'general-nutrition',policyVersion:FOOD_RATING_POLICY};
}
/** The model never gets the computed answer. Conflicting/unsupported output cannot create a colored verdict. */
export function verifyModelAssessment(food:PublicFood,model:ModelAssessment|null,now=Date.now(),weightCategory?:WeightCategory):FoodAssessment{
 const expected=labelRating(food,now,weightCategory);if(expected.status!=='rated')return expected;
 if(!model)return unavailableAssessment('ai_unavailable');
 const matches=model.assessments.filter(a=>a.key===foodKey(food));
 if(matches.length!==1||matches[0].rating!==expected.rating||!matches[0].reasons.length||matches[0].reasons.some(r=>!expected.reasons.includes(r)))
  return unavailableAssessment('disagreement');
 return {...expected,reasons:matches[0].reasons};
}
/** Dietary checks stay on-device. Absence of a gluten keyword is not evidence of suitability. */
export function dietaryRatingAllowed(food:PublicFood,restrictions:readonly string[],now=Date.now()){
 return restrictions.every(r=>r==='glutenFree'&&!!verifiedGlutenEvidence(food,now));
}
const compareFields=['sodiumMg','saturatedFatG','sugarsG','addedSugarsG','fiberG','proteinG'] as const;
const absolute:Record<Benefit,number>={sodiumMg:46,saturatedFatG:0.4,sugarsG:2,addedSugarsG:1,fiberG:1.4,proteinG:2.5};
// Five percent DV is the material adverse floor for sodium/saturated fat/added sugar.
// Smaller relevant trade-offs are displayed; they are never silently described as improvements.
const adverse:Record<Benefit,number>={sodiumMg:115,saturatedFatG:1,sugarsG:5,addedSugarsG:2.5,fiberG:1.4,proteinG:2.5};
const value=(f:PublicFood,k:Benefit)=>k==='proteinG'||k==='addedSugarsG'?f.nutritionExtras?.[k]??null:f.nutrients[k];
/** Both a 25% relative improvement and an absolute floor, at equal weight. Significant regressions block promotion. */
export function verifiedAlternativeBenefits(original:PublicFood,candidate:PublicFood,now=Date.now(),weightCategory?:WeightCategory):Benefit[]{
 if(!comparisonReady(original,now)||!comparisonReady(candidate,now)||!original.servingGrams||
  candidate.comparisonGroup!==original.comparisonGroup||foodKey(original)===foodKey(candidate)||original.barcode===candidate.barcode)return [];
 // A tiny listed serving cannot earn a green alternative for a larger equal-weight comparison.
 if(!['healthy','very_healthy'].includes(labelRating({...candidate,servingGrams:original.servingGrams},now).rating??''))return [];
 const scale=original.servingGrams/100,benefits:Benefit[]=[];
 for(const k of compareFields){
  const a=value(original,k),b=value(candidate,k);if(a===null||b===null)return [];
  const positive=k==='fiberG'||k==='proteinG',delta=(positive?b-a:a-b)*scale;
  if(delta>=absolute[k]&&delta>=a*scale*0.25)benefits.push(k);
  const worse=-delta;
  if(worse>=adverse[k]&&worse>=a*scale*0.25)return [];
 }
 if((candidate.additionalNutrients?.transFatG??Infinity)>0)return [];
 const calories=original.nutrients.caloriesKcal!*scale,increase=(candidate.nutrients.caloriesKcal!-original.nutrients.caloriesKcal!)*scale;
 if(increase>=40&&increase>=calories*0.2)return [];
 return weightBenefitOrder(benefits,weightCategory).slice(0,3);
}
export function verifiedAlternativeTradeoffs(original:PublicFood,candidate:PublicFood):Benefit[]{
 const scale=(original.servingGrams??0)/100;
 return compareFields.filter(k=>{const a=value(original,k),b=value(candidate,k);return a!==null&&b!==null&&(k==='fiberG'||k==='proteinG'?a-b:b-a)*scale>=absolute[k];}).slice(0,3);
}
