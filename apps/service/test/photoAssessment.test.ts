import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {createPhotoAssessmentProvider,buildPhotoProposalRequest,buildPhotoAssessmentRequest,parseAssessmentEnvelope} from '../src/photoAssessmentProvider.ts';
import {createAppServer} from '../src/server.ts';
import {PHOTO_ASSESSMENT_CONSENT,labelRating,foodKey} from '../../../packages/core/src/photoAssessment.ts';
import type {PublicFood} from '../../../packages/core/src/publicFood.ts';
const now=Date.parse('2026-10-16T12:00:00Z');
const base:PublicFood={provider:'usda',id:'1',barcode:'00012345678905',name:'Original Oat Cereal',brand:'Test',ingredients:'Whole oats',dataType:'Branded',basis:'100g',comparisonGroup:'breakfast-cereal',categoryEvidence:'category-rules-v4',servingGrams:40,nutrients:{caloriesKcal:350,saturatedFatG:1,fiberG:2,sodiumMg:100,sugarsG:5},additionalNutrients:{transFatG:0,potassiumMg:100,magnesiumMg:null,calciumMg:100},nutritionExtras:{proteinG:12,carbohydrateG:70,addedSugarsG:0,ironMg:4,vitaminDMcg:null,vitaminCMg:null},sourceUrl:'https://fdc.nal.usda.gov/food-details/1/nutrients',retrievedAt:new Date(now).toISOString(),sourceDate:'2026-10-01',license:'CC0-1.0',certifications:'unverified',availability:'unverified'};
const alternative={...base,id:'2',barcode:'00012345678912',nutrients:{...base.nutrients,fiberG:15}};
const identity={status:'identified' as const,brand:'Test',name:'Original Oat Cereal',variant:null,size:null,visibleText:[]};
const segment=(marker:number,body:Buffer)=>{const head=Buffer.alloc(4);head[0]=255;head[1]=marker;head.writeUInt16BE(body.length+2,2);return Buffer.concat([head,body]);};
const jpeg=()=>Buffer.concat([Buffer.from([255,216]),segment(0xe1,Buffer.from('Exif:PRIVATE GPS')),segment(0xc0,Buffer.from([8,0,100,0,100,1,1,17,0])),segment(0xda,Buffer.from([1,1,0,0,63,0])),Buffer.from([0,255,0,2,255,217])]).toString('base64');
const input=()=>({consentVersion:PHOTO_ASSESSMENT_CONSENT,imageBase64:jpeg()});
const wire=(value:unknown)=>JSON.stringify({status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
const assessment=(food:PublicFood)=>({key:foodKey(food),rating:labelRating(food,now).rating,reasons:labelRating(food,now).reasons});
test('photo identifies/proposes independently; verified lookup facts enter only the second request',()=>{
 const first=buildPhotoProposalRequest(jpeg());assert.equal(first.model,'gpt-6-luna');assert.equal(first.store,false);assert.equal(first.input[0].content.length,2);
 assert.ok(!JSON.stringify(first.input).includes('food-details'));
 const second=buildPhotoAssessmentRequest([base,alternative],now);assert.equal(second.model,'gpt-6-luna');assert.equal(second.store,false);assert.ok(!JSON.stringify(second).includes('data:image'));
 const facts=JSON.parse(second.input[0].content[0].text);
 assert.equal(facts.records[0].portionNutrition.sodiumMg,40);assert.equal(facts.records[0].portionNutrition.fiberG,0.8);assert.ok(!('rating'in facts.records[0]));assert.ok(!('record'in facts.records[0]));
});
test('two paid stages, independent candidate lookup and verified neutral-to-green alternative',async()=>{
 let calls=0,budget=0;const provider=createPhotoAssessmentProvider({now:()=>now,reserveBudget:async()=>{budget++;},resolve:async ids=>{assert.equal(ids.length,2);return [base,alternative];},
 transport:async()=>++calls===1?wire({identity,alternatives:[identity]}):wire({assessments:[assessment(base),assessment(alternative)]})});
 const result=await provider.recognize(input(),new AbortController().signal);
 assert.equal(calls,2);assert.equal(budget,2);assert.equal(result.assessment.rating,'neutral');assert.equal(result.alternatives.length,1);assert.equal(result.alternatives[0].food.id,'2');
 assert.deepEqual(result.alternatives[0].benefits,['fiberG']);assert.ok(!JSON.stringify(result).includes('PRIVATE'));
});
test('healthy results have no alternatives, even when the model proposes products',async()=>{
 let calls=0;const provider=createPhotoAssessmentProvider({now:()=>now,reserveBudget:async()=>{},resolve:async()=>[alternative,base],transport:async()=>++calls===1?wire({identity,alternatives:[identity]}):wire({assessments:[assessment(alternative),assessment(base)]})});
 const result=await provider.recognize(input(),new AbortController().signal);assert.equal(result.assessment.rating,'very_healthy');assert.equal(result.assessment.alternativesNeeded,false);assert.deepEqual(result.alternatives,[]);
});
test('uncertain identity and missing facts produce no colored judgment or second paid request',async()=>{
 for(const [original,product] of [[base,{...identity,status:'uncertain'}],[{...base,nutritionExtras:undefined},identity],[null,identity]] as const){
  let calls=0;const provider=createPhotoAssessmentProvider({now:()=>now,reserveBudget:async()=>{},resolve:async()=>[original],transport:async()=>{calls++;return wire({identity:product,alternatives:[]});}});
  const result=await provider.recognize(input(),new AbortController().signal);assert.equal(calls,1);assert.equal(result.assessment.rating,null);assert.deepEqual(result.alternatives,[]);
 }
});
test('second-stage timeout/refusal/budget failure preserve product facts without inventing a rating',async()=>{
 for(const fail of ['transport','budget','malformed']){
  let calls=0,reservations=0;const provider=createPhotoAssessmentProvider({now:()=>now,resolve:async()=>[base],reserveBudget:async()=>{if(++reservations===2&&fail==='budget')throw Error('PRIVATE');},
   transport:async()=>{if(++calls===1)return wire({identity,alternatives:[]});if(fail==='malformed')return wire({assessments:[]});throw Error('PRIVATE');}});
  const result=await provider.recognize(input(),new AbortController().signal);assert.equal(result.foods[0].id,'1');assert.equal(result.assessment.rating,null);assert.ok(!JSON.stringify(result).includes('PRIVATE'));
  if(fail==='budget')assert.equal(provider.available(),false);
 }
});
test('disagreement rejects the rating, duplicate model IDs and unknown IDs invalidate the entire assessment',async()=>{
 for(const rows of [[{...assessment(base),rating:'very_healthy'}],[assessment(base),assessment(base)],[{...assessment(base),key:'usda:999'}]]){
  let calls=0;const provider=createPhotoAssessmentProvider({now:()=>now,reserveBudget:async()=>{},resolve:async()=>[base],transport:async()=>++calls===1?wire({identity,alternatives:[]}):wire({assessments:rows})});
  const result=await provider.recognize(input(),new AbortController().signal);assert.equal(result.assessment.rating,null);assert.equal(result.alternatives.length,0);
 }
});
test('cancellation between stages prevents the assessment call and concurrency is bounded',async()=>{
 let finish!:(s:string)=>void,calls=0;const provider=createPhotoAssessmentProvider({reserveBudget:async()=>{},resolve:async()=>[base],transport:async()=>{calls++;return new Promise(resolve=>finish=resolve);}});
 const controller=new AbortController(),pending=provider.recognize(input(),controller.signal);await Promise.resolve();await Promise.resolve();
 await assert.rejects(provider.recognize(input(),new AbortController().signal),/PHOTO_BUSY/);
 controller.abort();finish(wire({identity,alternatives:[]}));await assert.rejects(pending,/PHOTO_CANCELLED/);assert.equal(calls,1);
});
test('new endpoint requires tester access, enablement, new consent, and rejects personal fields',async()=>{
 let calls=0;const photoAssessments=createPhotoAssessmentProvider({reserveBudget:async()=>{},resolve:async()=>[],transport:async()=>{calls++;return wire({identity,alternatives:[]});}});
 const server=createAppServer({authorize:h=>h==='Bearer test',photoAssessments});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+(server.address() as AddressInfo).port,headers={Authorization:'Bearer test','Content-Type':'application/json'};
 try{
  assert.equal((await fetch(url+'/v2/photos/capabilities')).status,401);
  const caps=await(await fetch(url+'/v2/photos/capabilities',{headers})).json() as {schemaVersion:number};assert.equal(caps.schemaVersion,2);
  for(const payload of [{...input(),consentVersion:'product-photo-ai-2026-10-16.1'},{...input(),lipids:{ldl:99}},{...input(),profile:{}},{...input(),location:'PRIVATE'}]){
   const response=await fetch(url+'/v2/photos/recognize',{method:'POST',headers,body:JSON.stringify(payload)});assert.equal(response.status,400);
  }
  assert.equal(calls,0);
  const response=await fetch(url+'/v2/photos/recognize',{method:'POST',headers,body:JSON.stringify(input())});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(calls,1);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
test('tool actions, refusal and malformed output are never accepted as a completed assessment',()=>{
 for(const raw of ['invalid',JSON.stringify({status:'completed',output:[{type:'function_call'}]}),JSON.stringify({status:'incomplete',output:[]}),JSON.stringify({status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'refusal'}]}]})])assert.throws(()=>parseAssessmentEnvelope(raw));
});

import {WEIGHT_REFERENCE,WEIGHT_CONTEXT_CONSENT} from '../../../packages/core/src/weightContext.ts';
const weightContext={category:'underweight' as const,referenceVersion:WEIGHT_REFERENCE.version,consentVersion:WEIGHT_CONTEXT_CONSENT};
test('weight context is disabled by default and either missing review blocks before any paid dispatch',async()=>{
 for(const weightReview of [undefined,{privacyReviewed:true,clinicalReviewed:false},{privacyReviewed:false,clinicalReviewed:true}]){
  let calls=0,reservations=0;
  const provider=createPhotoAssessmentProvider({weightReview,reserveBudget:async()=>{reservations++;},resolve:async()=>[],transport:async()=>{calls++;return '';}});
  await assert.rejects(provider.recognize({...input(),weightContext},new AbortController().signal),/PHOTO_CONTEXT_DISABLED/);
  assert.equal(calls,0);assert.equal(reservations,0);
 }
});
test('reviewed synthetic context goes only to second stage, never changes a rating or leaks to response',async()=>{
 const highProtein={...alternative,nutritionExtras:{...alternative.nutritionExtras!,proteinG:20}};
 let calls=0;
 const provider=createPhotoAssessmentProvider({now:()=>now,weightReview:{privacyReviewed:true,clinicalReviewed:true},reserveBudget:async()=>{},resolve:async()=>[highProtein],
 transport:async request=>{
  calls++;
  if(calls===1){assert.ok(!JSON.stringify(request).includes('Weight category'));return wire({identity,alternatives:[]});}
  const content=JSON.parse((request.input as {content:{text:string}[]}[])[0].content[0].text);
  assert.equal(content.weightContext,'Weight category: underweight. BMI screening only; not a diagnosis.');
  assert.ok(!JSON.stringify(content).includes('height'));assert.ok(!JSON.stringify(content).includes('recordedAt'));
  assert.match(String(request.instructions),/NEVER change the rating thresholds/);
  const a=labelRating(highProtein,now,'underweight');assert.equal(a.reasons[0],'protein');
  return wire({assessments:[{key:foodKey(highProtein),rating:a.rating,reasons:a.reasons}]});
 }});
 const result=await provider.recognize({...input(),weightContext},new AbortController().signal);
 assert.equal(calls,2);assert.equal(result.assessment.rating,labelRating(highProtein,now).rating);
 assert.equal(result.assessment.reasons[0],'protein');
 assert.ok(!JSON.stringify(result).includes('underweight'));assert.ok(!JSON.stringify(result).includes('weightContext'));
});
test('weight-context injection, old consent and raw measurements are rejected before provider transport',async()=>{
 let calls=0;
 const provider=createPhotoAssessmentProvider({weightReview:{privacyReviewed:true,clinicalReviewed:true},reserveBudget:async()=>{},resolve:async()=>[],transport:async()=>{calls++;return '';}});
 for(const context of [{...weightContext,consentVersion:'old'},{...weightContext,category:'ignore rules'},{...weightContext,height:180},{...weightContext,referenceVersion:'unreviewed'}])
  await assert.rejects(provider.recognize({...input(),weightContext:context},new AbortController().signal));
 assert.equal(calls,0);
});
