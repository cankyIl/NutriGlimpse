import {z} from 'zod';
import {foodRatings,type FoodRating} from './photoAssessment.ts';
import {photoIdentitySchema,productPhotoRequestSchema,PRODUCT_PHOTO_MODEL} from './productPhoto.ts';
import {foodSchema} from './publicFood.ts';
export const AI_FOOD_CONSENT='product-photo-estimates-2026-10-16.1' as const;
export const aiFoodRequestSchema=productPhotoRequestSchema.extend({consentVersion:z.literal(AI_FOOD_CONSENT)}).strict();
const short=z.string().trim().min(1).max(160).refine(s=>!/[\u0000-\u001f\u007f]/.test(s));
const amount=(max:number)=>z.number().finite().min(0).max(max).nullable();
export const estimatedNutrientsSchema=z.object({caloriesKcal:amount(3000),saturatedFatG:amount(200),transFatG:amount(100),sugarsG:amount(300),addedSugarsG:amount(300),carbohydrateG:amount(500),sodiumMg:amount(10000),fiberG:amount(200),proteinG:amount(300),potassiumMg:amount(10000),calciumMg:amount(5000),ironMg:amount(100),magnesiumMg:amount(5000)}).strict();
export const estimatedFoodSchema=z.object({identity:photoIdentitySchema,category:short,servingText:short.nullable(),servingGrams:amount(1000),nutrition:estimatedNutrientsSchema,ingredients:z.string().max(1500).nullable(),rating:z.enum(foodRatings).nullable()}).strict();
export type EstimatedFood=z.infer<typeof estimatedFoodSchema>;
export const aiFoodResultSchema=z.object({schemaVersion:z.literal(3),model:z.literal(PRODUCT_PHOTO_MODEL),status:z.enum(['identified','uncertain','multiple-products','no-product']),original:estimatedFoodSchema.nullable(),alternatives:z.array(estimatedFoodSchema).max(3),checkedAt:z.string().datetime(),basis:z.literal('ai-estimate')}).strict();
export type AiFoodResult=z.infer<typeof aiFoodResultSchema>;
// Identity-only preview: no rating, nutrients, ingredients or suitability claims.
export const aiPhotoPreviewSchema=z.object({status:z.enum(['identified','uncertain']),brand:short.nullable(),name:short,variant:short.nullable(),size:short.nullable()}).strict();
export type AiPhotoPreview=z.infer<typeof aiPhotoPreviewSchema>;
export function photoPreviewOf(identity:EstimatedFood['identity']):AiPhotoPreview{
 const {status,brand,name,variant,size}=identity;return aiPhotoPreviewSchema.parse({status,brand,name,variant,size});
}

export const sourceCheckSchema=z.object({foods:z.array(foodSchema).max(5),match:z.literal('possible'),checkedAt:z.string().datetime()}).strict();
export const productMediaSchema=z.object({image:foodSchema.shape.image.unwrap().nullable(),reference:z.literal(true)}).strict();
// These diagnostics are emitted by the same branches that make the decision.
// Absolute color thresholds stay independent of relative alternative eligibility.
export function estimatedRatingDecision(f:EstimatedFood):{rating:FoodRating|null;reasons:string[]}{
 const n=f.nutrition;
 const result=(rating:FoodRating|null,...reasons:string[])=>({rating,reasons});
 if(f.identity.status!=='identified')return result(null,'identity_uncertain');
 if(!f.servingGrams)return result(null,'serving_weight_missing');
 if(Object.values(n).some(v=>v!==null&&!Number.isFinite(v)))return result(null,'non_finite_nutrient');
 const missing=['caloriesKcal','saturatedFatG','transFatG','sugarsG','addedSugarsG','carbohydrateG','sodiumMg','fiberG','proteinG'].filter(k=>n[k as keyof typeof n]===null);
 if(missing.length)return result(null,...missing.map(k=>'missing_'+k));
 if(n.carbohydrateG!+n.proteinG!+n.saturatedFatG!+n.transFatG!>f.servingGrams+3||n.caloriesKcal!>f.servingGrams*9+5)return result(null,'serving_mass_or_energy_inconsistent');
 if(n.addedSugarsG!>n.sugarsG!+0.5||n.sugarsG!>n.carbohydrateG!+0.5||n.fiberG!>n.carbohydrateG!+0.5)return result(null,'sugar_or_fiber_inconsistent');
 if(['saturatedFatG','transFatG','sugarsG','carbohydrateG','fiberG','proteinG'].some(k=>n[k as keyof typeof n]!>f.servingGrams!+1))return result(null,'nutrient_exceeds_serving_weight');
 const red=[...(n.transFatG!>0?['trans_fat_positive']:[]),...(n.sodiumMg!>=460?['sodium_at_least_460mg']:[]),...(n.saturatedFatG!>=4?['saturated_fat_at_least_4g']:[]),...(n.addedSugarsG!>=10?['added_sugar_at_least_10g']:[])];
 if(red.length)return result('not_healthy',...red);
 if(n.sodiumMg!<=115&&n.saturatedFatG!<=1&&n.addedSugarsG!<=2.5&&n.fiberG!>=5.6)return result('very_healthy','very_healthy_thresholds_met');
 if(n.sodiumMg!<=230&&n.saturatedFatG!<=2&&n.addedSugarsG!<=5&&(n.fiberG!>=2.8||n.proteinG!>=5))return result('healthy','healthy_thresholds_met');
 return result('neutral',...(n.sodiumMg!>230?['healthy_sodium_limit_exceeded']:[]),...(n.saturatedFatG!>2?['healthy_saturated_fat_limit_exceeded']:[]),...(n.addedSugarsG!>5?['healthy_added_sugar_limit_exceeded']:[]),...(n.fiberG!<2.8&&n.proteinG!<5?['positive_fiber_or_protein_threshold_not_met']:[]));
}
export function estimatedRating(f:EstimatedFood):FoodRating|null{return estimatedRatingDecision(f).rating;}
export function estimatedReasons(f:EstimatedFood):string[]{
 const n=f.nutrition,result:string[]=[];
 if(n.transFatG!==null&&n.transFatG>0)result.push('Contains trans fat');
 if(n.addedSugarsG!==null&&n.addedSugarsG>=10)result.push('High in added sugar');
 if(n.sodiumMg!==null&&n.sodiumMg>=460)result.push('High in sodium');
 if(n.saturatedFatG!==null&&n.saturatedFatG>=4)result.push('High in saturated fat');
 if(n.fiberG!==null&&n.fiberG>=2.8)result.push('Provides fiber');
 if(n.proteinG!==null&&n.proteinG>=5)result.push('Provides protein');
 if(n.addedSugarsG!==null&&n.addedSugarsG<=2.5)result.push('Little added sugar');
 return result.slice(0,3);
}
const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
export const estimatedIdentityKey=(f:EstimatedFood)=>norm(f.identity.brand??'')+'|'+[...new Set([f.identity.name,f.identity.variant].filter(Boolean).join(' ').toLowerCase().replace(/[^a-z0-9]+/g,' ').split(' ').filter(t=>t&&!['original','classic','regular'].includes(t)))].sort().join('|');
type ComparisonNutrient='addedSugarsG'|'sugarsG'|'sodiumMg'|'saturatedFatG'|'fiberG'|'proteinG';
export const alternativePolicyVersion='category-comparison-2026-10-17.3';
// These families change comparison priorities, never the absolute color thresholds.
const categoryAliases:Record<string,string>={
 cereal:'breakfastcereal',cereals:'breakfastcereal',readytoeatcereal:'breakfastcereal',
 butter:'butterspread',butteryspread:'butterspread',butteryspreads:'butterspread',tablebutter:'butterspread',
 pastasauce:'tomatopastasauce',marinarasauce:'tomatopastasauce',tomatosauceforpasta:'tomatopastasauce',
};
const canonicalCategory=(category:string)=>categoryAliases[norm(category)]??norm(category);
export function comparisonPolicy(category:string):{id:string;relative:boolean;focus:ComparisonNutrient[]}{
 switch(canonicalCategory(category)){
  case 'butterspread':return {id:'spread_v1',relative:true,focus:['saturatedFatG']};
  case 'tomatopastasauce':return {id:'tomato_sauce_v1',relative:true,focus:['sodiumMg','addedSugarsG','sugarsG']};
  case 'breakfastcereal':return {id:'cereal_v1',relative:true,focus:['addedSugarsG','sugarsG','fiberG','proteinG']};
  default:return {id:'general_v1',relative:false,focus:['addedSugarsG','sugarsG','sodiumMg','saturatedFatG','fiberG','proteinG']};
 }
}
type ConcernNutrient='transFatG'|'addedSugarsG'|'sodiumMg'|'saturatedFatG';
// Match the adverse reasons shown on the original card before category benefits.
export function originalComparisonConcerns(f:EstimatedFood):ConcernNutrient[]{
 const n=f.nutrition,high:ConcernNutrient[]=[];
 if(n.transFatG!==null&&n.transFatG>0)high.push('transFatG');
 if(n.addedSugarsG!==null&&n.addedSugarsG>=10)high.push('addedSugarsG');
 if(n.sodiumMg!==null&&n.sodiumMg>=460)high.push('sodiumMg');
 if(n.saturatedFatG!==null&&n.saturatedFatG>=4)high.push('saturatedFatG');
 if(high.length)return high;
 const moderate:ConcernNutrient[]=[];
 if(n.sodiumMg!==null&&n.sodiumMg>230)moderate.push('sodiumMg');
 if(n.saturatedFatG!==null&&n.saturatedFatG>2)moderate.push('saturatedFatG');
 if(n.addedSugarsG!==null&&n.addedSugarsG>5)moderate.push('addedSugarsG');
 const order=[...comparisonPolicy(f.category).focus,...moderate];
 return [...new Set(order.filter((key):key is ConcernNutrient=>moderate.includes(key as ConcernNutrient)))];
}
export function alternativeRatingDecision(f:EstimatedFood):{rating:FoodRating|null;reasons:string[]}{
 const computed=estimatedRatingDecision(f),green=(rating:FoodRating|null)=>rating==='healthy'||rating==='very_healthy';
 if(computed.rating===null)return {rating:null,reasons:computed.reasons};
 if(f.rating===null)return {rating:null,reasons:['model_rating_missing']};
 // A red signal from either side still blocks an alternative; do not erase safety disagreement.
 if(computed.rating==='not_healthy')return {rating:null,reasons:['alternative_calculated_red',...computed.reasons]};
 if(f.rating==='not_healthy')return {rating:null,reasons:['alternative_model_red']};
 if(green(computed.rating)&&f.rating==='neutral')return {rating:computed.rating,reasons:['model_neutral_calculated_green']};
 if(computed.rating==='neutral'&&green(f.rating))return {rating:'neutral',reasons:['model_green_calculated_neutral']};
 if(green(computed.rating)&&green(f.rating)&&computed.rating!==f.rating)return {rating:'healthy',reasons:['green_ratings_conservatively_reconciled']};
 return {rating:computed.rating,reasons:[]};
}
export function estimatedBenefitsDecision(a:EstimatedFood,b:EstimatedFood,options:{groundedTradeoffs?:boolean}={}):{benefits:string[];reasons:string[]}{
 const reject=(...reasons:string[])=>({benefits:[] as string[],reasons});
 const originalCheck=estimatedRatingDecision(a),candidateCheck=estimatedRatingDecision(b);
 if(originalCheck.rating===null)return reject('original_nutrition_or_identity_incomplete',...originalCheck.reasons);
 if(candidateCheck.rating===null)return reject('alternative_nutrition_or_identity_incomplete',...candidateCheck.reasons);
 if(!a.identity.brand||!a.identity.name||!b.identity.brand||!b.identity.name)return reject('identity_missing_brand_or_name');
 if(!a.servingGrams||!b.servingGrams)return reject('serving_weight_missing');
 if(canonicalCategory(a.category)!==canonicalCategory(b.category))return reject('category_mismatch');
 const policy=comparisonPolicy(a.category);
 const relativeRed=options.groundedTradeoffs===true&&policy.relative;
 if((candidateCheck.rating==='not_healthy'||b.rating==='not_healthy')&&!relativeRed)return reject('alternative_red');
 if(b.rating===null)return reject('alternative_rating_unavailable');
 if(!policy.relative&&(!['healthy','very_healthy'].includes(candidateCheck.rating)||!['healthy','very_healthy'].includes(b.rating)))return reject('unclassified_category_requires_green');
 const factor=a.servingGrams/b.servingGrams,epsilon=1e-9;
 // User-approved sodium exception: crossing below the existing high-sodium cutoff
 // at the ORIGINAL serving weight qualifies even below the percentage/amount floors.
 // An undersized candidate serving must never manufacture this crossing.
 const sodiumCrossesHighCutoff=a.nutrition.sodiumMg!>=460&&b.nutrition.sodiumMg!*factor<460;
 const improved=new Map<ComparisonNutrient,string>(),tradeoffReasons:string[]=[];
 for(const [key,label,floor] of [['addedSugarsG','Less added sugar',1],['sugarsG','Less total sugar',1],['sodiumMg','Less sodium',40],['saturatedFatG','Less saturated fat',0.5]] as const){
  const x=a.nutrition[key],y=b.nutrition[key];if(x===null||y===null)return reject('comparison_missing_'+key);
  // Preserve the existing absolute + relative worsening guard and 25% improvement floor.
  if(y*factor>x+floor+epsilon&&y*factor>x*1.1+epsilon)return reject('equal_weight_worsens_'+key);
  if(x-y*factor+epsilon>=floor&&y*factor<=x*0.75+epsilon)improved.set(key,label);
 }
 for(const [key,label] of [['fiberG','More fiber'],['proteinG','More protein']] as const){
  const x=a.nutrition[key],y=b.nutrition[key];if(x===null||y===null)return reject('comparison_missing_'+key);
  // Grounded tomato-sauce comparisons may trade up to 1g protein per 125g
  // for a substantial sodium improvement. Fiber and other food families stay protected.
  if(y*factor+epsilon<x){
   const smallSauceProteinTradeoff=options.groundedTradeoffs===true&&key==='proteinG'&&policy.id==='tomato_sauce_v1'&&improved.has('sodiumMg')&&x-y*factor<=a.servingGrams/125+epsilon;
   if(!smallSauceProteinTradeoff)return reject('equal_weight_loses_'+key);
   tradeoffReasons.push('small_sauce_protein_tradeoff');
  }
  if(y*factor-x+epsilon>=1&&y*factor+epsilon>=x*1.25)improved.set(key,label);
 }
 if(b.nutrition.transFatG!==0)return reject('alternative_trans_fat_not_zero');
 if(a.nutrition.caloriesKcal!==null&&b.nutrition.caloriesKcal!==null&&b.nutrition.caloriesKcal*factor>a.nutrition.caloriesKcal*1.2+20+epsilon)return reject('equal_weight_calories_excess');
 const magnitudeQualified=improved.size>0;
 if(sodiumCrossesHighCutoff)improved.set('sodiumMg','Less sodium');
 if(!improved.size)return reject('no_meaningful_improvement');
 if(candidateCheck.rating==='neutral'&&!policy.focus.some(key=>improved.has(key)))return reject('no_category_priority_improvement','policy_'+policy.id);
 // Percentage/absolute-floor qualification remains for other improvements.
 // Crossing the high-sodium cutoff is also sufficient for sodium and addresses
 // that concern, but never bypasses any worsening, identity or dietary checks.
 const concerns=originalComparisonConcerns(a),primary=concerns[0];
 const concernLabels:Record<ConcernNutrient,string>={transFatG:'No trans fat',addedSugarsG:'Less added sugar',sodiumMg:'Less sodium',saturatedFatG:'Less saturated fat'};
 const unresolvedLabels:Record<ConcernNutrient,string>={transFatG:'Trans fat remains a concern',addedSugarsG:'Added sugar not meaningfully lower',sodiumMg:'Sodium not meaningfully lower',saturatedFatG:'Saturated fat not meaningfully lower'};
 const floors:Record<ConcernNutrient,number>={transFatG:0,addedSugarsG:1,sodiumMg:40,saturatedFatG:0.5};
 const addressed=(key:ConcernNutrient)=>{
  const x=a.nutrition[key]!,y=b.nutrition[key]!*factor;
  return key==='transFatG'?x>0&&y===0:(key==='sodiumMg'&&sodiumCrossesHighCutoff)||(x-y+epsilon>=floors[key]&&y<=x*0.9+epsilon);
 };
 if(primary&&!addressed(primary))return reject('original_priority_not_improved_'+primary);
 const concernText=concerns.map(key=>addressed(key)?concernLabels[key]:unresolvedLabels[key]);
 const order=[...policy.focus,...improved.keys()];
 const benefits=[...new Set([...concernText,...order.flatMap(key=>improved.has(key)?[improved.get(key)!]:[])])].slice(0,3);
 return {benefits,reasons:[...tradeoffReasons,...(relativeRed&&(candidateCheck.rating==='not_healthy'||b.rating==='not_healthy')?['relative_improvement_keeps_red_rating']:[]),...(magnitudeQualified?['meaningful_improvement']:[]),...(sodiumCrossesHighCutoff?['sodium_high_cutoff_crossed']:[]),'policy_'+policy.id,...(primary?['original_priority_'+primary,'original_priority_improved']:[]),...concerns.filter(key=>!addressed(key)).map(key=>'secondary_concern_not_improved_'+key),...(candidateCheck.rating==='neutral'?['relative_improvement_keeps_neutral_rating']:[])]};
}
export function estimatedBenefits(a:EstimatedFood,b:EstimatedFood):string[]{return estimatedBenefitsDecision(a,b).benefits;}
