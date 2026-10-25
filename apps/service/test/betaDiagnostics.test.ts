import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,statSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import type {AddressInfo} from 'node:net';
import {BetaDiagnosticStore,diagnosticFood,newTrace,type BetaEvent} from '../src/betaDiagnostics.ts';
import {validateAiReview,createAiReviewProvider} from '../src/aiFoodReviewProvider.ts';
import {createProductCardSources} from '../src/productCardSources.ts';
import {PublicDatabase} from '../src/publicDatabase.ts';
import {createAppServer} from '../src/server.ts';
import {AI_FOOD_CONSENT,type EstimatedFood} from '../../../packages/core/src/aiFoodReview.ts';
const original:EstimatedFood={identity:{status:'identified',brand:'Fixture',name:'Sweet cereal',variant:null,size:null,visibleText:['PRIVATE OCR']},category:'cereal',servingText:'40g',servingGrams:40,ingredients:'PRIVATE INGREDIENT STRING',rating:'not_healthy',nutrition:{caloriesKcal:150,saturatedFatG:0.5,transFatG:0,sugarsG:12,addedSugarsG:12,carbohydrateG:32,sodiumMg:180,fiberG:3,proteinG:3,potassiumMg:null,calciumMg:null,ironMg:null,magnesiumMg:null}};
const alt=(name:string):EstimatedFood=>({...original,identity:{...original.identity,name},rating:'healthy',nutrition:{...original.nutrition,sugarsG:1,addedSugarsG:1,fiberG:5}});
const segment=(marker:number,body:Buffer)=>{const h=Buffer.alloc(4);h[0]=255;h[1]=marker;h.writeUInt16BE(body.length+2,2);return Buffer.concat([h,body]);};
const jpeg=()=>Buffer.concat([Buffer.from([255,216]),segment(0xc0,Buffer.from([8,0,100,0,100,1,1,17,0])),segment(0xda,Buffer.from([1,1,0,0,63,0])),Buffer.from([0,255,0,2,255,217])]).toString('base64');
const envelope=(value:unknown)=>JSON.stringify({status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
const event:BetaEvent={kind:'request',operation:'recognize',phase:'started'};
test('private diagnostics expire, survive restart, enforce row/size/schema bounds and 0600 files',()=>{
 const dir=mkdtempSync(join(tmpdir(),'beta-diagnostics-')),path=join(dir,'private/events.sqlite');let now=1000000000;let store=new BetaDiagnosticStore(path,()=>now,2);
 try{
  store.record(newTrace(),event);now+=1;store.record(newTrace(),event);store.record(newTrace(),event);assert.equal(store.read().length,2);
  store.record(newTrace(),{...event,imageBase64:'SECRET'} as BetaEvent);assert.equal(store.read().length,2);assert.ok(!readFileSync(path).includes(Buffer.from('SECRET')));
  assert.equal(statSync(path).mode&0o777,0o600);assert.equal(statSync(join(dir,'private')).mode&0o777,0o700);
  store.close();store=new BetaDiagnosticStore(path,()=>now,2);assert.equal(store.read().length,2);now+=7*86400000+1;assert.equal(store.read().length,0);
 }finally{store.close();rmSync(dir,{recursive:true,force:true});}
});
test('decision log explains schema, unknown nutrition, category, duplicates and accepted alternatives without raw text',()=>{
 let decision:Extract<BetaEvent,{kind:'decision'}>|undefined;
 const value={status:'identified',original,alternatives:[{}, {...alt('Unknown'),nutrition:{...alt('Unknown').nutrition,transFatG:null}}, {...alt('Wrong category'),category:'soup'},alt('Good'),alt('Good')]};
 const result=validateAiReview(value,0,e=>decision=e);assert.equal(result.alternatives.length,1);assert.ok(decision);
 assert.equal(decision.reason,'alternatives_selected');assert.equal(decision.alternatives[0].reasons[0],'invalid_alternative_schema');assert.ok(decision.alternatives[1].reasons.includes('missing_transFatG'));assert.equal(decision.alternatives[2].reasons[0],'category_mismatch');assert.equal(decision.alternatives[4].reasons[0],'duplicate_product');
 assert.ok(!JSON.stringify(decision).includes('PRIVATE'));assert.equal(decision.original?.nutrition.addedSugarsG,12);
 assert.deepEqual(validateAiReview(value,0,()=>{throw Error('disk');}),result);
});
test('spread comparison logs relative improvement without falsely awarding a green rating',()=>{
 const spread:EstimatedFood={...original,category:'butter-spread',servingGrams:14,rating:'not_healthy',nutrition:{...original.nutrition,caloriesKcal:100,carbohydrateG:0,sugarsG:0,addedSugarsG:0,sodiumMg:90,fiberG:0,proteinG:0,saturatedFatG:4}};
 const lighter={...spread,identity:{...original.identity,name:'Fictional lower-saturated-fat spread'},rating:'neutral',nutrition:{...spread.nutrition,saturatedFatG:1}};
 let decision:Extract<BetaEvent,{kind:'decision'}>|undefined;const result=validateAiReview({status:'identified',original:spread,alternatives:[lighter]},0,e=>decision=e);
 assert.equal(result.alternatives.length,1);assert.equal(result.alternatives[0].rating,'neutral');assert.equal(decision?.reason,'alternatives_selected');assert.ok(decision?.alternatives[0].reasons.includes('relative_improvement_keeps_neutral_rating'));assert.equal(decision?.alternatives[0].displayedRating,'neutral');
});
test('no proposals, green original and unavailable rating are distinct zero-alternative outcomes',()=>{
 for(const [o,expected] of [[original,'model_returned_no_alternatives'],[alt('Green'),'original_already_green'],[{...original,nutrition:{...original.nutrition,transFatG:null}},'original_rating_unavailable']] as const){
  let reason='';validateAiReview({status:'identified',original:o,alternatives:[]},0,e=>reason=e.reason);assert.equal(reason,expected);
 }
 assert.ok(!JSON.stringify(diagnosticFood({...original,identity:{...original.identity,name:'mail me@example.com https://private.test sk-SECRET'}})).includes('me@example.com'));
});
test('HTTP trace correlates dispatch and decision; invalid private fields stay out; no public log route',async()=>{
 const events:{trace:string,event:BetaEvent}[]=[];const audit={record:(trace:string,event:BetaEvent)=>{events.push({trace,event});}};
 let calls=0;const aiReviews=createAiReviewProvider({audit,reserveBudget:async()=>{},transport:async()=>{calls++;return envelope({status:'identified',original,alternatives:[alt('Good')]});}});
 const server=createAppServer({accessMode:'open-beta',diagnostics:audit,aiReviews});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+(server.address() as AddressInfo).port;
 try{
  const request={consentVersion:AI_FOOD_CONSENT,imageBase64:jpeg()};
  const response=await fetch(url+'/v3/photos/recognize',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},body:JSON.stringify(request)});await response.text();
  const trace=response.headers.get('x-grocery-trace-id');assert.ok(trace);assert.equal(calls,1);assert.ok(events.every(e=>e.trace===trace));assert.deepEqual(events.map(e=>e.event.kind),['request','model_query','decision','request']);
  const bad=await fetch(url+'/v3/photos/recognize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...request,profile:{secret:'PRIVATE PROFILE'}})});assert.equal(bad.status,400);await bad.text();assert.equal(calls,1);
  assert.ok(!JSON.stringify(events).includes(request.imageBase64));assert.ok(!JSON.stringify(events).includes('PRIVATE'));assert.equal((await fetch(url+'/v3/diagnostics')).status,404);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
test('logging failure cannot change a successful photo; failed transport logs no error-body secrets and never retries',async()=>{
 const input={consentVersion:AI_FOOD_CONSENT,imageBase64:jpeg()};const throwing={record:()=>{throw Error('disk');}};
 const good=createAiReviewProvider({audit:throwing,reserveBudget:async()=>{},transport:async()=>envelope({status:'identified',original,alternatives:[]})});assert.ok((await good.recognize(input,new AbortController().signal)).original);
 const events:BetaEvent[]=[];let calls=0;const bad=createAiReviewProvider({audit:{record:(_t,e)=>events.push(e)},reserveBudget:async()=>{},transport:async()=>{calls++;throw Error('PRIVATE body with token');}});
 await assert.rejects(bad.recognize(input,new AbortController().signal));assert.equal(calls,1);assert.ok(events.some(e=>e.kind==='failure'&&e.stage==='transport'));assert.ok(!JSON.stringify(events).includes('PRIVATE'));
});
test('image diagnostics distinguish upstream outage, mismatch, negative cache and success',async()=>{
 const product={code:'012345678905',product_name:'Sweet cereal',brands:'Fixture',countries_tags:['en:united-states'],image_front_small_url:'https://images.openfoodfacts.org/images/products/001/234/567/8905/front_en.1.200.jpg'};
 for(const mode of ['outage','mismatch','success']){
  const db=new PublicDatabase(':memory:',true),events:BetaEvent[]=[];const audit={record:(_t:string,e:BetaEvent)=>events.push(e)};
  const sources=createProductCardSources(db,async()=>[],'test@example.com',async()=>mode==='outage'?new Response('PRIVATE error',{status:503}):Response.json({hits:[mode==='mismatch'?{...product,product_name:'Chocolate cereal'}:product]}),audit);
  try{
   await sources.media(original.identity,new AbortController().signal);await sources.media(original.identity,new AbortController().signal);
   const outcomes=events.flatMap(e=>e.kind==='lookup'?[e.outcome]:[]);
   if(mode==='outage'){assert.ok(outcomes.includes('upstream_http_error'));assert.ok(outcomes.includes('negative_cache_hit'));}
   if(mode==='mismatch'){assert.ok(outcomes.includes('no_matching_image'));assert.ok(events.some(e=>e.kind==='lookup'&&Object.keys(e.rejected??{}).includes('identity_or_variant_mismatch')));}
   if(mode==='success'){assert.ok(outcomes.includes('matching_image'));assert.ok(outcomes.includes('cache_hit'));}
   await sources.sources(original.identity,new AbortController().signal);assert.ok(events.some(e=>e.kind==='lookup'&&e.outcome==='no_matching_source_record'));assert.ok(!JSON.stringify(events).includes('PRIVATE'));
  }finally{db.close();}
 }
});
