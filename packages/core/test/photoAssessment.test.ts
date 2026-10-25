import {test} from 'node:test';
import assert from 'node:assert/strict';
import {labelRating,verifyModelAssessment,verifiedAlternativeBenefits,verifiedAlternativeTradeoffs,dietaryRatingAllowed,foodKey,photoAssessmentRequestSchema,photoAssessmentResponseSchema,PHOTO_ASSESSMENT_CONSENT,unavailableAssessment} from '../src/photoAssessment.ts';
import {assessProductPhoto} from '../src/photoAssessmentClient.ts';
import type {PublicFood} from '../src/publicFood.ts';
const now=Date.parse('2026-10-16T12:00:00Z');
export const base:PublicFood={provider:'usda',id:'1',barcode:'00012345678905',name:'Original Oat Cereal',brand:'Test',ingredients:'Whole oats',dataType:'Branded',basis:'100g',comparisonGroup:'breakfast-cereal',categoryEvidence:'category-rules-v4',servingGrams:40,nutrients:{caloriesKcal:350,saturatedFatG:1,fiberG:15,sodiumMg:100,sugarsG:5},additionalNutrients:{transFatG:0,potassiumMg:100,magnesiumMg:null,calciumMg:100},nutritionExtras:{proteinG:12,carbohydrateG:70,addedSugarsG:0,ironMg:4,vitaminDMcg:null,vitaminCMg:null},sourceUrl:'https://fdc.nal.usda.gov/food-details/1/nutrients',retrievedAt:new Date(now).toISOString(),sourceDate:'2026-10-01',license:'CC0-1.0',certifications:'unverified',availability:'unverified'};
const identity={status:'identified' as const,brand:'Test',name:'Original Oat Cereal',variant:null,size:null,visibleText:[]};
const neutral={...base,nutrients:{...base.nutrients,fiberG:2}};
const model=(f:PublicFood)=>({assessments:[{key:foodKey(f),rating:labelRating(f,now).rating,reasons:labelRating(f,now).reasons}]});
test('four ratings are portion-aware and favorable labels do not require alternatives',()=>{
 assert.equal(labelRating(base,now).rating,'very_healthy');assert.equal(labelRating(base,now).alternativesNeeded,false);
 assert.equal(labelRating({...base,nutrients:{...base.nutrients,fiberG:8}},now).rating,'healthy');
 assert.equal(labelRating(neutral,now).rating,'neutral');assert.equal(labelRating(neutral,now).alternativesNeeded,true);
 assert.equal(labelRating({...base,nutrients:{...base.nutrients,sodiumMg:1150}},now).rating,'not_healthy');
 assert.equal(labelRating({...base,servingGrams:20,nutrients:{...base.nutrients,sodiumMg:1150}},now).rating,'healthy');
});
test('missing/stale/contradictory facts never create a green or a neutral placeholder',()=>{
 for(const f of [
  {...base,servingGrams:null},{...base,sourceDate:'2020-01-01'}, {...base,retrievedAt:'2026-10-01T00:00:00Z'},
  {...base,nutritionExtras:undefined},{...base,additionalNutrients:undefined},
  {...base,nutritionExtras:{...base.nutritionExtras!,addedSugarsG:null}},
  {...base,nutritionExtras:{...base.nutritionExtras!,proteinG:null}},
  {...base,nutritionExtras:{...base.nutritionExtras!,carbohydrateG:1}},
  {...base,nutritionExtras:{...base.nutritionExtras!,addedSugarsG:80}},
  {...base,nutrients:{...base.nutrients,fiberG:null}},
 ]){const a=labelRating(f,now);assert.equal(a.rating,null);assert.equal(a.status,'insufficient_information');assert.equal(a.alternativesNeeded,false);}
});
test('trans fat and added sugars cannot be offset by fiber/protein or zero calories',()=>{
 const trans={...base,additionalNutrients:{...base.additionalNutrients!,transFatG:0.01}};
 assert.equal(labelRating(trans,now).rating,'not_healthy');
 const added={...base,nutrients:{...base.nutrients,sugarsG:30},nutritionExtras:{...base.nutritionExtras!,addedSugarsG:25}};
 assert.equal(labelRating(added,now).rating,'not_healthy');assert.ok(labelRating(added,now).reasons.includes('high_added_sugar'));
});
test('AI disagreement, missing rows, duplicate rows and unsupported reasons cannot produce a color',()=>{
 assert.equal(verifyModelAssessment(base,model(base),now).rating,'very_healthy');
 assert.equal(verifyModelAssessment(base,null,now).status,'ai_unavailable');
 for(const m of [{assessments:[]},{assessments:[...model(base).assessments,...model(base).assessments]},
  {assessments:[{key:foodKey(base),rating:'not_healthy' as const,reasons:['high_sodium' as const]}]},
  {assessments:[{key:foodKey(base),rating:'very_healthy' as const,reasons:['high_sodium' as const]}]}])
  assert.equal(verifyModelAssessment(base,m,now).status,'disagreement');
});
test('alternatives require material benefit at equal weight and reject significant nutrient regressions',()=>{
 const alt={...base,id:'2',barcode:'00012345678912',servingGrams:10};
 assert.deepEqual(verifiedAlternativeBenefits(neutral,alt,now),['fiberG']);
 assert.deepEqual(verifiedAlternativeBenefits(neutral,{...alt,nutrients:{...alt.nutrients,fiberG:2.01}},now),[]);
 assert.deepEqual(verifiedAlternativeBenefits(neutral,{...alt,nutrients:{...alt.nutrients,sugarsG:20}},now),[]);
 assert.deepEqual(verifiedAlternativeBenefits(neutral,{...alt,nutrients:{...alt.nutrients,sodiumMg:1200}},now),[]);
 assert.deepEqual(verifiedAlternativeBenefits(neutral,{...alt,nutrients:{...alt.nutrients,caloriesKcal:600}},now),[]);
 assert.deepEqual(verifiedAlternativeBenefits(neutral,{...alt,comparisonGroup:'potato-chips'},now),[]);
 assert.deepEqual(verifiedAlternativeBenefits(neutral,{...alt,barcode:neutral.barcode},now),[]);
 const saltyOriginal={...neutral,nutrients:{...neutral.nutrients,sodiumMg:2000}},tinyServing={...alt,nutrients:{...alt.nutrients,sodiumMg:1200}};
 assert.equal(labelRating(tinyServing,now).rating,'neutral');
 assert.deepEqual(verifiedAlternativeBenefits(saltyOriginal,tinyServing,now),[],'Improving sodium must not hide a high-sodium equal-weight portion');
});
test('dietary requirements need verified evidence and cannot be erased by a favorable nutrition rating',()=>{
 assert.equal(dietaryRatingAllowed(base,[],now),true);
 for(const r of ['glutenFree','vegan','peanutFree','dairyFree'])assert.equal(dietaryRatingAllowed(base,[r],now),false);
});
test('small saturated-fat tradeoffs remain explicit, while a five-percent-DV regression blocks promotion',()=>{
 const original={...base,nutrients:{...base.nutrients,sugarsG:30,saturatedFatG:0},nutritionExtras:{...base.nutritionExtras!,addedSugarsG:25}};
 const candidate={...base,id:'2',barcode:'00012345678912',nutrients:{...base.nutrients,saturatedFatG:1.25}};
 assert.ok(verifiedAlternativeBenefits(original,candidate,now).includes('sugarsG'));
 assert.deepEqual(verifiedAlternativeTradeoffs(original,candidate),['saturatedFatG']);
 assert.deepEqual(verifiedAlternativeBenefits(original,{...candidate,nutrients:{...candidate.nutrients,saturatedFatG:2.5}},now),[]);
});
test('strict request rejects health/profile/location fields and old consent',()=>{
 const input={consentVersion:PHOTO_ASSESSMENT_CONSENT,imageBase64:'aGVsbG8='};
 assert.ok(photoAssessmentRequestSchema.safeParse(input).success);
 for(const extra of [{profile:{}},{lipids:{ldl:90}},{age:40},{location:'home'},{consentVersion:'old'}])
  assert.equal(photoAssessmentRequestSchema.safeParse({...input,...extra}).success,false);
});
test('response refuses alternatives on favorable/unknown ratings and duplicate products',()=>{
 const response={schemaVersion:2,model:'gpt-6-luna',identity,foods:[base],assessment:labelRating(base,now),alternatives:[],checkedAt:new Date(now).toISOString(),candidatesChecked:0};
 assert.ok(photoAssessmentResponseSchema.safeParse(response).success);
 assert.equal(photoAssessmentResponseSchema.safeParse({...response,assessment:{...response.assessment,alternativesNeeded:true}}).success,false);
 assert.equal(photoAssessmentResponseSchema.safeParse({...response,foods:[]}).success,false);
 assert.equal(photoAssessmentResponseSchema.safeParse({...response,assessment:unavailableAssessment('ai_unavailable'),alternatives:[{food:base,assessment:response.assessment,benefits:['fiberG']}]}).success,false);
});
test('assessment client sends only consented photo, validates output, cancels and never retries',async()=>{
 const response={schemaVersion:2,model:'gpt-6-luna',identity,foods:[base],assessment:labelRating(base,now),alternatives:[],checkedAt:new Date(now).toISOString(),candidatesChecked:0};
 let calls=0;const fake:typeof fetch=async(url,init)=>{calls++;assert.equal(new Headers(init?.headers).get('authorization'),null);assert.match(String(url),/\/v2\/photos\/recognize$/);assert.deepEqual(JSON.parse(String(init?.body)),{consentVersion:PHOTO_ASSESSMENT_CONSENT,imageBase64:'aGVsbG8='});return new Response(JSON.stringify(response));};
 assert.deepEqual(await assessProductPhoto('aGVsbG8=',new AbortController().signal,fake),response);assert.equal(calls,1);
 const abort=new AbortController();abort.abort();await assert.rejects(assessProductPhoto('aGVsbG8=',abort.signal,fake));assert.equal(calls,1);
 await assert.rejects(assessProductPhoto('aGVsbG8=',new AbortController().signal,async()=>{calls++;throw Error('PRIVATE');}),/could not finish/);assert.equal(calls,2);
});

import {WEIGHT_REFERENCE,WEIGHT_CONTEXT_CONSENT} from '../src/weightContext.ts';
test('weight context prioritizes supported facts but cannot change colors, override dietary checks or accept adverse alternatives',()=>{
 const richer={...base,nutritionExtras:{...base.nutritionExtras!,proteinG:20}};
 for(const category of ['good_weight','underweight','overweight','obese'] as const){
  assert.equal(labelRating(richer,now,category).rating,labelRating(richer,now).rating);
  const adverse={...richer,additionalNutrients:{...richer.additionalNutrients!,transFatG:1}};
  assert.equal(labelRating(adverse,now,category).rating,'not_healthy');
  assert.equal(labelRating(adverse,now,category).reasons[0],'trans_fat');
  assert.equal(dietaryRatingAllowed(richer,['dairyFree'],now),false);
  assert.deepEqual(verifiedAlternativeBenefits(neutral,{...adverse,id:'2',barcode:'00012345678912'},now,category),[]);
 }
 assert.equal(labelRating(richer,now,'underweight').reasons[0],'protein');
});
test('client sends only the explicitly supplied minimal weight context, with separate consent',async()=>{
 const weightContext={category:'overweight' as const,referenceVersion:WEIGHT_REFERENCE.version,consentVersion:WEIGHT_CONTEXT_CONSENT};
 const response={schemaVersion:2,model:'gpt-6-luna',identity,foods:[base],assessment:labelRating(base,now),alternatives:[],checkedAt:new Date(now).toISOString(),candidatesChecked:0};
 let calls=0;
 const fake:typeof fetch=async(_url,init)=>{
  calls++;assert.deepEqual(JSON.parse(String(init?.body)),{consentVersion:PHOTO_ASSESSMENT_CONSENT,imageBase64:'aGVsbG8=',weightContext});
  return new Response(JSON.stringify(response));
 };
 await assessProductPhoto('aGVsbG8=',new AbortController().signal,fake,weightContext);
 assert.equal(calls,1);
});
