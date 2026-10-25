import {groceryResultSchema,type GroceryResult} from './groceryReview.ts';
import {z} from 'zod';
import {estimatedFoodSchema,aiFoodResultSchema,aiFoodRequestSchema,type AiFoodResult} from './aiFoodReview.ts';
export const CLAUDE_PHOTO_MODEL='claude-haiku-5-5' as const;
export const DUAL_FOOD_CONSENT='product-photo-dual-2026-10-17.1' as const;
export const dualModels=['gpt-6-luna',CLAUDE_PHOTO_MODEL] as const;
export type DualModel=typeof dualModels[number];
// Production reviews use GPT only. Keep historical model IDs readable by older clients.
export const activePhotoModels=['gpt-6-luna'] as const;
export const dualFoodRequestSchema=aiFoodRequestSchema.extend({consentVersion:z.literal(DUAL_FOOD_CONSENT)});
export const dualFoodResultSchema=aiFoodResultSchema.omit({model:true}).extend({
 schemaVersion:z.literal(4),models:z.array(z.enum(dualModels)).min(1).max(2).refine(v=>new Set(v).size===v.length),
 reviewState:z.enum(['checking','complete','partial','identity-conflict']),
 estimatesDiffer:z.boolean(),
});
export type DualFoodResult=z.infer<typeof dualFoodResultSchema>;
const sourceUrl=z.string().url().max(1500).refine(value=>{
 const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&u.hostname.includes('.')&&
 !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[)/.test(u.hostname);
});
export const nutritionSourceSchema=z.object({
 url:sourceUrl,title:z.string().min(1).max(300),checkedAt:z.string().datetime(),model:z.enum(dualModels),
 confirmation:z.literal('model-web-search'),
}).strict();
export type NutritionSource=z.infer<typeof nutritionSourceSchema>;
export const sourcedFoodSchema=estimatedFoodSchema.extend({nutritionSource:nutritionSourceSchema.nullable()});
export const sourceFoodResultSchema=dualFoodResultSchema.extend({
 schemaVersion:z.literal(5),basis:z.literal('model-web-search'),
 original:sourcedFoodSchema.nullable(),alternatives:z.array(sourcedFoodSchema).max(3),
});
export type SourceFoodResult=z.infer<typeof sourceFoodResultSchema>;
export const photoReviewResultSchema=z.discriminatedUnion('schemaVersion',[aiFoodResultSchema,dualFoodResultSchema,sourceFoodResultSchema,groceryResultSchema]);
export type PhotoReviewResult=AiFoodResult|DualFoodResult|SourceFoodResult|GroceryResult;
