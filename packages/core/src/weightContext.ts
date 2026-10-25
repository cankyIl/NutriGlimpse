import {z} from 'zod';
import type {Profile} from './types.ts';

/** Source thresholds are screening references, not individualized nutrition prescriptions. */
export const WEIGHT_REFERENCE = {
 version:'cdc-adult-bmi-2026-10-16.1',
 retrievedOn:'2026-10-16',
 source:'https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html',
 limitationsSource:'https://www.cdc.gov/bmi/faq/index.html',
 pediatricSource:'https://www.cdc.gov/bmi/child-teen-calculator/bmi-categories.html',
 sourceMinimumAge:20, betaMinimumAge:21,
 formula:'weightKg / (heightCm / 100) ** 2',
 thresholds:{underweightBelow:18.5,goodWeightBelow:25,overweightBelow:30},
 categories:['underweight','good_weight','overweight','obese'],
 sexSpecific:false,
 limitation:'BMI is a screening measure, not a diagnosis or a measure of body composition.',
 exclusions:['under-21','pregnant-or-unspecified','missing-or-invalid','stale-measurements'],
 // These are conservative app validation/freshness rules, not CDC clinical cutoffs.
 inputPolicy:{minimumHeightCm:50,maximumHeightCm:275,minimumWeightKg:10,maximumWeightKg:650,maximumAge:120,maximumMeasurementAgeDays:180},
} as const;
export const WEIGHT_CONTEXT_CONSENT='weight-context-ai-2026-10-16.1' as const;
export const weightCategorySchema=z.enum(['good_weight','underweight','overweight','obese']);
export type WeightCategory=z.infer<typeof weightCategorySchema>;
export const toHeightCm=(value:number,unit:'cm'|'in')=>unit==='cm'?value:value*2.54;
export const toWeightKg=(value:number,unit:'kg'|'lb')=>unit==='kg'?value:value*0.45359237;
export const bodyMeasurementsSchema=z.object({
 height:z.object({value:z.number().finite().positive(),unit:z.enum(['cm','in'])}).strict(),
 weight:z.object({value:z.number().finite().positive(),unit:z.enum(['kg','lb'])}).strict(),
 recordedAt:z.string().datetime(),
}).strict().superRefine((value,ctx)=>{
 const cm=toHeightCm(value.height.value,value.height.unit),kg=toWeightKg(value.weight.value,value.weight.unit),p=WEIGHT_REFERENCE.inputPolicy;
 if(cm<p.minimumHeightCm||cm>p.maximumHeightCm)ctx.addIssue({code:'custom',path:['height'],message:'Check your height and selected units.'});
 if(kg<p.minimumWeightKg||kg>p.maximumWeightKg)ctx.addIssue({code:'custom',path:['weight'],message:'Check your weight and selected units.'});
});
export type BodyMeasurements=z.infer<typeof bodyMeasurementsSchema>;
export const weightConsentSchema=z.object({version:z.literal(WEIGHT_CONTEXT_CONSENT),acceptedAt:z.string().datetime()}).strict();
export const weightContextSchema=z.object({
 category:weightCategorySchema,referenceVersion:z.literal(WEIGHT_REFERENCE.version),consentVersion:z.literal(WEIGHT_CONTEXT_CONSENT),
}).strict();
export type WeightContext=z.infer<typeof weightContextSchema>;
export type WeightReview={privacyReviewed:boolean;clinicalReviewed:boolean};

/** Recomputed from current inputs, never persisted or exposed as a user-facing diagnosis. */
export function internalWeightCategory(profile:Pick<Profile,'age'|'pregnancy'|'bodyMeasurements'>,now=Date.now()):WeightCategory|null{
 const result=bodyMeasurementsSchema.safeParse(profile.bodyMeasurements),p=WEIGHT_REFERENCE.inputPolicy;
 if(!result.success||!Number.isInteger(profile.age)||profile.age<WEIGHT_REFERENCE.betaMinimumAge||profile.age>p.maximumAge||profile.pregnancy!=='not-pregnant'||!Number.isFinite(now))return null;
 const m=result.data,age=now-Date.parse(m.recordedAt);
 if(age<0||age>p.maximumMeasurementAgeDays*86400000)return null;
 const bmi=toWeightKg(m.weight.value,m.weight.unit)/(toHeightCm(m.height.value,m.height.unit)/100)**2;
 // Do not round before comparing with the source boundaries.
 const t=WEIGHT_REFERENCE.thresholds;
 return bmi<t.underweightBelow?'underweight':bmi<t.goodWeightBelow?'good_weight':bmi<t.overweightBelow?'overweight':'obese';
}
export function consentedWeightContext(profile:Profile,review:WeightReview,now=Date.now()):WeightContext|undefined{
 if(!review.privacyReviewed||!review.clinicalReviewed)return undefined;
 const consent=weightConsentSchema.safeParse(profile.weightContextConsent);
 if(!consent.success||Date.parse(consent.data.acceptedAt)>now)return undefined;
 const category=internalWeightCategory(profile,now);
 return category?{category,referenceVersion:WEIGHT_REFERENCE.version,consentVersion:WEIGHT_CONTEXT_CONSENT}:undefined;
}
export function weightContextFact(context:WeightContext):string{
 const parsed=weightContextSchema.parse(context);
 return 'Weight category: '+parsed.category.replace('_',' ')+'. BMI screening only; not a diagnosis.';
}
/** Context can reorder factual benefits after all adverse flags, never change a color or prescribe a target. */
export function weightReasonOrder<T extends string>(values:readonly T[],category?:WeightCategory):T[]{
 if(!category||category==='good_weight')return [...values];
 const concerns=['trans_fat','high_sodium','high_saturated_fat','high_added_sugar','mixed'];
 const benefits=category==='underweight'?['protein','high_fiber','fiber']:
  ['high_fiber','fiber','low_added_sugar','protein'];
 const priority=[...concerns,...benefits];
 return values.map((value,index)=>({value,index,rank:priority.indexOf(value)}))
  .sort((a,b)=>(a.rank<0?100:a.rank)-(b.rank<0?100:b.rank)||a.index-b.index).map(x=>x.value);
}
export function weightBenefitOrder<T extends string>(values:readonly T[],category?:WeightCategory):T[]{
 if(!category||category==='good_weight')return [...values];
 const order=category==='underweight'?['proteinG','fiberG']:['fiberG','addedSugarsG','sugarsG','proteinG'];
 return [...values].sort((a,b)=>(order.includes(a)?order.indexOf(a):100)-(order.includes(b)?order.indexOf(b):100));
}
export function withoutBodyMeasurements(profile:Profile):Profile{
 const {bodyMeasurements:_measurements,weightContextConsent:_consent,...rest}=profile;
 return rest;
}
