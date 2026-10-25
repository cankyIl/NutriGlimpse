import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {AddressInfo} from 'node:net';
import {approvedGroceryPrompt,buildGroceryRequest,createGroceryProvider,loadGroceryProvider} from '../src/groceryReviewProvider.ts';
import {adaptSimpleGroceryAnswer} from '../src/geminiSimpleReview.ts';
import {resolveGeminiGroundingSources,nativeAisleEvidence} from '../src/geminiGroundingSources.ts';
import {createAppServer} from '../src/server.ts';
import {GROCERY_CONSENT,groceryResultSchema,groceryWireSchema,type GroceryContext} from '../../../packages/core/src/groceryReview.ts';
const context:GroceryContext={healthConditions:['noConcern'],dietaryRestrictions:[],store:{name:'Price Chopper',town:'Shrewsbury',state:'MA',branch:'731 Boston Turnpike'}};
const row=(n=0)=>({title:n?'Fixture plain cereal '+n:'Fixture sweet cereal',nutrition:{sugarsG:n?1:13,addedSugarsG:n?0:13,sodiumMg:n?0:210,carbohydrateG:34,fiberG:n?4:2,proteinG:n?5:2,transFatG:0},rating:n?'healthy':'not_healthy',reasons:[n?'Lower sugar':'High in added sugars'],uncertainties:[],source_url:null,retailer_url:null,image_url:null,store:'Price Chopper',aisle:null});
const fixture=()=>({product:row(),alternatives:[row(1),row(2),row(3)]});
const native=(value:unknown=fixture(),c=context)=>adaptSimpleGroceryAnswer(value,c,new Set(),[],{allowUnverifiedEstimates:true});
const redirect='https://vertexaisearch.cloud.google.com/grounding-api-redirect/'+'b'.repeat(40);
const productUrl='https://www.pricechopper.com/shop/product/fixture-cereal';

test('exact simple prompt uses this request store and exposes no legacy or private instructions',()=>{
 const prompt=approvedGroceryPrompt({...context,healthConditions:['diabetes'],dietaryRestrictions:['eggFree']});
 assert.match(prompt,/You are a grocery shopping assistant/);assert.match(prompt,/I am giving you the product image/);assert.match(prompt,/I am in Price Chopper, Shrewsbury, MA/);assert.doesNotMatch(prompt,/diabetes|eggFree/);
 const request=buildGroceryRequest('photo',context,'gemini-3.5-flash-lite');
 assert.deepEqual(request.tools,[{type:'google_search'}]);assert.equal(request.system_instruction,undefined);assert.equal(request.store,false);
 assert.equal((request.input as any)[1].data,'photo');assert.equal((request.input as any)[0].text,prompt);
 assert.doesNotMatch(JSON.stringify(request),/search_products|Serper|at most six|eggFree|diabetes|731 Boston|package_size|serving_size/);
});
test('switching stores or having no selected store never reuses another store or guessed location',()=>{
 assert.match(approvedGroceryPrompt({...context,store:{name:'Wegmans',town:'Northborough',state:'MA',branch:null}}),/I am in Wegmans, Northborough, MA/);
 const prompt=approvedGroceryPrompt({...context,store:null});assert.match(prompt,/No current store or location is selected; do not assume one/);assert.doesNotMatch(prompt,/Price Chopper|Wegmans|Shrewsbury/);
});
test('default provider needs only the Gemini key, without a Serper credential',()=>{
 const dir=mkdtempSync(join(tmpdir(),'native-gemini-')),previous=process.env.GROCERY_GEMINI_ENABLED;
 try{mkdirSync(join(dir,'.tools/gemini'),{recursive:true});writeFileSync(join(dir,'.tools/gemini/api-key'),'fixture-key-for-native-only-test',{mode:0o600});process.env.GROCERY_GEMINI_ENABLED='true';assert.ok(loadGroceryProvider(dir)?.available());}
 finally{if(previous===undefined)delete process.env.GROCERY_GEMINI_ENABLED;else process.env.GROCERY_GEMINI_ENABLED=previous;rmSync(dir,{recursive:true,force:true});}
});
test('native nutrition and three suggestions remain visible as estimates without invented source provenance',()=>{
 const {review,audit}=native();groceryWireSchema.parse(review);
 assert.equal(review.original?.nutrition.sodiumMg,210);assert.equal(review.original?.assessment.rating,'not_healthy');assert.equal(review.recommendations.length,3);
 assert.equal(review.sources.length,0);assert.deepEqual(review.original?.nutrientEvidence,[]);assert.deepEqual(review.original?.assessment.reasons[0].sourceIds,[]);
 for(const food of [review.original!,...review.recommendations.map(r=>r.food)]){
  assert.ok(food.assessment.limitations.some(t=>t.includes('AI estimates, not verified')));assert.equal(food.availability.status,'unknown');assert.equal(food.availability.aisleNumber,null);
 }
 assert.ok(audit.some(e=>e.code==='nutrition_source_unconfirmed'));
 // The older sourced mode is unchanged.
 assert.equal(adaptSimpleGroceryAnswer(fixture(),context,new Set()).review.original?.assessment.rating,null);
});
test('estimates never turn missing facts into zero, retain invalid numbers, or claim allergy/clinical suitability',()=>{
 const f:any=fixture();f.product.nutrition.proteinG=-3;f.product.nutrition.sugarsG=80;f.product.nutrition.transFatG=null;
 const r=native(f).review;assert.equal(r.original?.nutrition.proteinG,null);assert.equal(r.original?.nutrition.sugarsG,null);assert.equal(r.original?.nutrition.transFatG,null);assert.equal(r.original?.nutrition.sodiumMg,210);
 for(const c of [{...context,dietaryRestrictions:['glutenFree']},{...context,healthConditions:['celiac']},{...context,healthConditions:['ckd']}]){
  const restricted=native(fixture(),c as GroceryContext).review;assert.equal(restricted.original?.assessment.rating,null);assert.equal(restricted.recommendations.length,0);assert.equal(restricted.original?.nutrition.sodiumMg,210);
 }
 const empty:any=fixture();empty.product.nutrition={};assert.equal(native(empty).review.original?.assessment.rating,null);
});
test('guessed links and guessed aisle numbers never gain verified status in native estimate mode',()=>{
 const f:any=fixture();f.product.source_url='https://www.pricechopper.com/shop/guessed';f.product.retailer_url=f.product.source_url;
 f.product.aisle={number:'4',store:'Price Chopper',town:'Shrewsbury',state:'MA',source_url:f.product.source_url};
 const r=native(f).review;assert.equal(r.sources.length,0);assert.equal(r.original?.availability.aisleNumber,null);assert.equal(r.original?.availability.status,'unknown');assert.equal(r.original?.nutrition.sodiumMg,210);
});
test('native per-food Google citation links resolve safely and update source, retailer and aisle references',async()=>{
 const f:any=fixture();f.product.source_url=redirect;f.product.retailer_url=redirect;f.product.aisle={source_url:redirect};let calls=0;
 const r=await resolveGeminiGroundingSources(f,new Set(),2,new AbortController().signal,async(url,init)=>{calls++;assert.equal(url,redirect);assert.equal(init?.redirect,'manual');return new Response(null,{status:302,headers:{location:productUrl}});});
 assert.equal(calls,1);assert.ok(r.urls.has(productUrl));assert.equal(r.value.product.source_url,productUrl);assert.equal(r.value.product.retailer_url,productUrl);assert.equal(r.value.product.aisle.source_url,productUrl);
});
test('unresolved Google redirects are not accepted as provenance, and direct unannotated URLs are not fetched',async()=>{
 let calls=0;const f:any=fixture();f.product.source_url=redirect;f.alternatives[0].source_url='https://www.pricechopper.com/shop/unannotated';
 const r=await resolveGeminiGroundingSources(f,new Set([redirect]),1,new AbortController().signal,async()=>{calls++;return new Response(null,{status:404});});
 assert.equal(calls,1);assert.equal(r.urls.size,0);
});
test('native aisle page reads are limited to grounded URLs and existing branch evidence decides display',async()=>{
 const f:any=fixture();f.product.source_url=productUrl;f.product.aisle={number:'7',store:'Price Chopper',town:'Shrewsbury',state:'MA',source_url:productUrl};let calls=0;
 const reader=async(url:string)=>{calls++;assert.equal(url,productUrl);return {url,text:'Price Chopper Shrewsbury MA. Cereal Aisle 7.'};};
 assert.deepEqual(await nativeAisleEvidence(f,new Set(),new AbortController().signal,reader),[]);assert.equal(calls,0);
 const records=await nativeAisleEvidence(f,new Set([productUrl]),new AbortController().signal,reader);
 const r=adaptSimpleGroceryAnswer(f,context,new Set([productUrl]),records,{allowUnverifiedEstimates:true});
 assert.equal(calls,1);assert.equal(r.review.original?.availability.aisleNumber,'7');
 const wrong=[{status:'ok',results:[{url:productUrl,pageText:'Price Chopper Worcester MA. Cereal Aisle 7.'}]}];
 assert.equal(adaptSimpleGroceryAnswer(f,context,new Set([productUrl]),wrong,{allowUnverifiedEstimates:true}).review.original?.availability.aisleNumber,null);
});
test('native grounded response passes the installed build-19 JSON route with estimates, alternatives and usage',async()=>{
 const events:any[]=[];let calls=0;
 const provider=createGroceryProvider({model:'gemini-3.5-flash-lite',audit:{record:(_t,event)=>events.push(event)},transport:async request=>{
  calls++;assert.deepEqual(request.tools,[{type:'google_search'}]);
  return {status:'completed',model:'gemini-3.5-flash-lite',usage:{total_input_tokens:1131,total_output_tokens:937},steps:[
   {type:'google_search_call',id:'s1',arguments:{queries:['fixture product nutrition','fixture alternative nutrition']}},
   {type:'google_search_result',call_id:'s1',is_error:false,result:[]},
   {type:'model_output',content:[{type:'text',text:JSON.stringify(fixture())}]}]};
 }});
 const server=createAppServer({accessMode:'open-beta',groceryReviews:provider});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 try{
  const imageBase64=Buffer.from('ffd8ffc00011080020002003011100021100031100ffda000c03010002110311003f0000ffd9','hex').toString('base64');
  const response=await fetch('http://127.0.0.1:'+(server.address() as AddressInfo).port+'/v6/photos/recognize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageBase64,context,consentVersion:GROCERY_CONSENT})});
  assert.equal(response.status,200);const result=groceryResultSchema.parse(await response.json());assert.equal(calls,1);assert.equal(result.original?.nutrition.sodiumMg,210);assert.equal(result.alternatives.length,3);assert.equal(result.original?.rating,'not_healthy');
  const usage=events.find(e=>e.kind==='grocery_usage');assert.equal(usage.searches,2);assert.equal(usage.inputTokens,1131);assert.equal(usage.outputTokens,937);
  assert.doesNotMatch(JSON.stringify(events),/Shrewsbury|Price Chopper|imageBase64|731 Boston/);
 }finally{await new Promise<void>(r=>server.close(()=>r()));}
});
