import {z} from 'zod';
import {groceryShopperSchema} from './groceryShopper.ts';
import {productPhotoRequestSchema} from './productPhoto.ts';
import {estimatedFoodSchema,estimatedNutrientsSchema,type EstimatedFood} from './aiFoodReview.ts';
export const GROCERY_PARALLEL_CONSENT='grocery-parallel-context-2026-10-25.1' as const;
export const GROCERY_RESPONSE_CONSENT='scan-answer-diagnostics-2026-10-25.1' as const;
export const GROCERY_CONSENT='product-photo-grounded-2026-10-18.1' as const;
export const GROCERY_MODELS=['gemini-3.5-flash-lite','gpt-6-luna'] as const;
export type GroceryModel=typeof GROCERY_MODELS[number];
const text=(n:number)=>z.string().trim().min(1).max(n).refine(v=>! /[\u0000-\u001f\u007f]/.test(v));
const nullableText=(n:number)=>text(n).nullable();
export const groceryUrl=z.string().url().max(1500).refine(value=>{
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&u.hostname.includes('.')&&!/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[)/.test(u.hostname);}catch{return false;}
});
const amount=(n:number)=>z.number().finite().min(0).max(n).nullable();
export const groceryNutrients=estimatedNutrientsSchema.extend({totalFatG:amount(300),phosphorusMg:amount(5000),vitaminDmcg:amount(1000)});
const nutrient=groceryNutrients.keyof();
const sourceId=text(40);
const sourceIds=z.array(sourceId).max(5);
const reason=z.object({text:text(110),nutrientKeys:z.array(nutrient).max(4),sourceIds}).strict();
export const groceryFoodSchema=z.object({
 id:sourceId,
 identity:z.object({kind:z.enum(['packaged','produce','bulk','unknown']),status:z.enum(['identified','uncertain']),brand:nullableText(160),name:text(160),variant:nullableText(160),size:nullableText(100),category:text(100)}).strict(),
 serving:z.object({text:nullableText(160),grams:amount(1000),milliliters:amount(3000),basis:z.enum(['package_label','usda_reference','unknown']),sourceId:sourceId.nullable()}).strict(),
 nutrition:groceryNutrients,
 nutrientEvidence:z.array(z.object({nutrient,sourceId}).strict()).max(16),
 ingredients:nullableText(1500),ingredientSourceId:sourceId.nullable(),
 dietaryEvidence:z.array(z.object({restriction:text(80),status:z.enum(['manufacturer_claim_found','certification_found','conflict','unknown']),claim:nullableText(160),sourceIds}).strict()).max(6),
 assessment:z.object({rating:z.enum(['very_healthy','healthy','neutral','not_healthy']).nullable(),primaryConcern:nutrient.nullable(),highlightNutrients:z.array(nutrient).max(4),reasons:z.array(reason).max(3),limitations:z.array(text(180)).max(4)}).strict(),
 image:z.object({kind:z.enum(['scan_photo','reference','none']),url:groceryUrl.nullable(),sourceId:sourceId.nullable()}).strict(),
 availability:z.object({status:z.enum(['branch_stock_reported','branch_listed','chain_listed','not_found','unknown']),storeName:nullableText(160),town:nullableText(100),state:nullableText(40),branch:nullableText(200),sourceId:sourceId.nullable(),aisleNumber:nullableText(60),section:nullableText(100),aisleSourceId:sourceId.nullable(),aisleEvidence:z.enum(['branch_specific','unknown'])}).strict()
}).strict();
export type GroceryFood=z.infer<typeof groceryFoodSchema>;
export const groceryWireSchema=z.object({
 schemaVersion:z.literal('gemini-grocery-review-v1'),status:z.enum(['complete','partial','unidentified']),original:groceryFoodSchema.nullable(),
 recommendationMode:z.enum(['alternatives','complements','none']),
 recommendations:z.array(z.object({type:z.enum(['alternative','complement']),food:groceryFoodSchema,
 comparisonBasis:z.object({kind:z.enum(['equal_mass','equal_volume','meal_pairing','not_comparable']),amount:amount(3000),unit:z.enum(['g','ml']).nullable()}).strict(),
 benefits:z.array(reason).max(3),reasonShortfall:nullableText(180),tradeoffs:z.array(text(160)).max(3)}).strict()).max(3),
 recommendationShortfall:nullableText(220),
 sources:z.array(z.object({id:sourceId,kind:z.enum(['photo_label','manufacturer','retailer','usda','guideline','certifier']),url:groceryUrl.nullable(),title:text(250)}).strict()).max(24),
 safetyReminder:text(300)
}).strict();
export type GroceryWire=z.infer<typeof groceryWireSchema>;
export const groceryContextSchema=z.object({
 shopper:groceryShopperSchema.optional(),
 location:z.object({latitude:z.number().finite().min(-90).max(90),longitude:z.number().finite().min(-180).max(180),observedAt:z.number().int().nonnegative()}).strict().optional(),
 healthConditions:z.array(z.enum(['generalFitness','noConcern','cardiovascular','diabetes','hypertension','celiac','ckd','masld','weight','sibo'])).max(8),
 dietaryRestrictions:z.array(z.enum(['vegetarian','eggFree','dairyFree','halal','kosher','glutenFree'])).max(6),
 store:z.object({name:text(160),town:nullableText(100),state:nullableText(40),branch:nullableText(200)}).strict().nullable()
}).strict();
export type GroceryContext=z.infer<typeof groceryContextSchema>;
export const groceryRequestSchema=productPhotoRequestSchema.extend({consentVersion:z.literal(GROCERY_CONSENT),context:groceryContextSchema,diagnosticConsentVersion:z.literal(GROCERY_RESPONSE_CONSENT).optional(),parallelContextConsentVersion:z.literal(GROCERY_PARALLEL_CONSENT).optional()}).strict();
export const groceryResultSchema=z.object({
 schemaVersion:z.literal(6),model:z.enum(GROCERY_MODELS),status:z.enum(['identified','uncertain','no-product']),
 original:estimatedFoodSchema.nullable(),alternatives:z.array(estimatedFoodSchema).max(3),
 checkedAt:z.string().datetime(),review:groceryWireSchema,
 // Provider-owned HTML is rendered only in a script-disabled isolated WebView.
 grounding:z.object({searchSuggestionsHtml:z.string().max(60000).nullable(),queries:z.array(text(300)).max(20)}).strict(),
 timing:z.object({providerMs:z.number().int().min(0).max(180000),validationMs:z.number().int().min(0).max(180000)}).strict()
}).strict();
export type GroceryResult=z.infer<typeof groceryResultSchema>;
export function estimatedGroceryFood(f:GroceryFood):EstimatedFood{
 return estimatedFoodSchema.parse({identity:{status:f.identity.status,brand:f.identity.brand,name:f.identity.name,variant:f.identity.variant,size:f.identity.size,visibleText:[]},
 category:f.identity.category,servingText:f.serving.text,servingGrams:f.serving.grams,ingredients:f.ingredients,rating:f.assessment.rating,
 nutrition:Object.fromEntries(Object.keys(estimatedNutrientsSchema.shape).map(k=>[k,f.nutrition[k as keyof typeof f.nutrition]]))});
}
export function groceryAisleLabel(f:GroceryFood):string|null{
 const a=f.availability;if(a.aisleEvidence!=='branch_specific'||!a.aisleSourceId)return null;
 const aisle=a.aisleNumber?.replace(/^aisle\s*/i,'').trim();
 return [aisle?'Aisle '+aisle:null,a.section].filter(Boolean).join(' · ')||null;
}
