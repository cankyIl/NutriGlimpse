import {comparisonGroups} from './comparisonGroups.ts';
import {z} from 'zod';
const amount=z.number().finite().nonnegative().nullable();
export const foodSchema=z.object({
 provider:z.enum(['usda','off']), id:z.string().regex(/^[A-Za-z0-9-]{1,40}$/),
 barcode:z.string().regex(/^\d{14}$/).nullable(), name:z.string().trim().min(1).max(500),
 brand:z.string().max(500).nullable(), ingredients:z.string().max(10000).nullable(),
 brandOwner:z.string().max(500).optional(),
 dataType:z.string().max(80), basis:z.literal('100g'),
 comparisonGroup:z.enum(comparisonGroups).optional(),
 categoryEvidence:z.enum(['category-rules-v1','category-rules-v2','category-rules-v3','category-rules-v4']).optional(),
 servingGrams:z.number().finite().positive().max(2000).nullable().optional(),
 nutritionExtras:z.object({proteinG:amount,carbohydrateG:amount,addedSugarsG:amount,ironMg:amount,vitaminDMcg:amount,vitaminCMg:amount}).strict().optional(),
 image:z.object({url:z.string().regex(/^https:\/\/images\.openfoodfacts\.org\/images\/products\/[0-9/]+\/front_[a-z]{2}\.\d+\.(100|200|400)\.jpg$/),license:z.literal('CC-BY-SA-3.0'),sourceUrl:z.string().url()}).strict().optional(),
 additionalNutrients:z.object({transFatG:z.number().finite().min(0).max(100).nullable(),potassiumMg:z.number().finite().min(0).max(100000).nullable(),magnesiumMg:z.number().finite().min(0).max(100000).nullable(),calciumMg:z.number().finite().min(0).max(100000).nullable()}).strict().optional(),
 reportedLabel:z.object({source:z.literal('off'),verification:z.literal('unverified'),frontLabelText:z.string().max(10000).nullable(),labels:z.array(z.string().max(200)).max(200),allergenStatement:z.string().max(10000).nullable(),allergens:z.array(z.string().max(200)).max(200),advisoryStatement:z.string().max(10000).nullable(),traces:z.array(z.string().max(200)).max(200)}).strict().optional(),
 glutenEvidence:z.object({status:z.enum(['verified','unverified','conflict','contradicted']),reason:z.string().max(500),frontLabelText:z.string().max(10000).nullable(),allergenStatement:z.string().max(10000).nullable(),sources:z.array(z.object({kind:z.enum(['certification','manufacturer-label']),url:z.string().url(),observedAt:z.string().datetime(),expiresAt:z.string().datetime()}).strict()).max(20),proof:z.string().max(20000).nullable()}).strict().optional(),
 nutrients:z.object({caloriesKcal:amount,saturatedFatG:amount,fiberG:amount,sodiumMg:amount,sugarsG:amount}).strict(),
 sourceUrl:z.string().url(), retrievedAt:z.string().datetime(), sourceDate:z.string().max(40).nullable(),
 license:z.enum(['CC0-1.0','ODbL-1.0']), certifications:z.literal('unverified'), availability:z.literal('unverified'),
}).strict();
export type PublicFood=z.infer<typeof foodSchema>;

/** v1 clients use a strict schema: enrichment is available only on v2 routes. */
export function legacyFood<T extends PublicFood>(food:T){
 const {additionalNutrients,reportedLabel,glutenEvidence,nutritionExtras,image,brandOwner,...legacy}=food;
 return legacy;
}
/** Existing v2 clients also use strict schemas. New fields are exposed on v3/assessment routes. */
export function v2Food<T extends PublicFood>(food:T){const {nutritionExtras,image,brandOwner,...compatible}=food;return compatible;}
/** USDA supplies ISO dates and US month/day/year dates; avoid engine-dependent parsing. */
export function foodSourceTime(value:string|null):number{
 if(!value)return NaN;
 const iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value),us=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
 if(!iso&&!us)return NaN;
 const y=Number(iso?.[1]??us![3]),m=Number(iso?.[2]??us![1]),d=Number(iso?.[3]??us![2]);
 const stamp=Date.UTC(y,m-1,d),date=new Date(stamp);
 return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?stamp:NaN;
}
