import test from 'node:test';
import type {AddressInfo} from 'node:net';
import {createAppServer} from '../src/server.ts';
import {DUAL_FOOD_CONSENT} from '../../../packages/core/src/dualAiFoodReview.ts';
import assert from 'node:assert/strict';
import {compactFood} from '../src/compactPhotoReview.ts';
import {buildWebReviewRequest,parseWebReview} from '../src/webPhotoReview.ts';
import {mergeWebReviews,createWebPhotoProvider,createWebClaudeTransport} from '../src/webPhotoProvider.ts';
import {estimatedFoodSchema,type EstimatedFood} from '../../../packages/core/src/aiFoodReview.ts';
const url='https://example.com/products/tomato-sauce';
const original:EstimatedFood={identity:{status:'identified',brand:'Fixture',name:'Tomato Sauce',variant:null,size:'24 oz',visibleText:[]},category:'tomato-pasta-sauce',servingText:'1/2 cup (125 g)',servingGrams:125,nutrition:{caloriesKcal:80,saturatedFatG:0.5,transFatG:0,sugarsG:7,addedSugarsG:2,carbohydrateG:12,sodiumMg:600,fiberG:3,proteinG:3,potassiumMg:400,calciumMg:40,ironMg:0.7,magnesiumMg:null},ingredients:null,rating:'not_healthy'};
function envelope(sodium=600,source:string|null=url,alternative=false){
 const food={...original,nutrition:{...original.nutrition,sodiumMg:sodium},rating:sodium>=460?'not_healthy':'neutral'};
 const alt={...original,identity:{...original.identity,brand:'Other',name:'Marinara'},nutrition:{...original.nutrition,sodiumMg:200},rating:'healthy'};
 return {s:'identified',o:{...compactFood(food as EstimatedFood),u:source},a:alternative?[{...compactFood(alt as EstimatedFood),u:url}]:[]};
}
function gpt(value=envelope(),searched=true){
 return JSON.stringify({status:'completed',output:[...(searched?[{type:'web_search_call',status:'completed',action:{type:'search',sources:[{type:'url',url,title:'Fixture nutrition label'}]}}]:[]),{type:'message',status:'completed',role:'assistant',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
}
function claude(value=envelope()){
 return JSON.stringify({type:'message',model:'claude-haiku-5-5',role:'assistant',stop_reason:'end_turn',content:[{type:'server_tool_use',name:'web_search',id:'s1'},{type:'web_search_tool_result',tool_use_id:'s1',content:[{type:'web_search_result',url,title:'Fixture nutrition label'}]},{type:'text',text:JSON.stringify(value)}]});
}
test('both model requests require current web nutrition with bounded tools and unchanged mathematical policy',()=>{
 const a=buildWebReviewRequest('fixture','gpt-6-luna'),b=buildWebReviewRequest('fixture','claude-haiku-5-5');
 assert.equal(a.tool_choice,'required');assert.equal(a.max_tool_calls,6);
 assert.deepEqual(a.include,['web_search_call.action.sources']);
 assert.match(String(b.system),/USE WEB SEARCH/);assert.equal(b.output_config,undefined);assert.match(String(a.instructions),/never zero/);
 assert.match(String(a.instructions),/application will not perform another nutrition lookup/);
 assert.doesNotMatch(String(a.instructions),/No internet or lookup tools are available/);
 assert.equal((b.tools as {max_uses:number}[])[0].max_uses,6);
});
test('real search provenance attaches a source and never replaces or independently rechecks the returned amount',()=>{
 const review=parseWebReview(gpt(),'gpt-6-luna',Date.UTC(2026,9,18));
 assert.equal((review.envelope.original as EstimatedFood).nutrition.sodiumMg,600);
 assert.equal([...review.sources.values()][0].url,url);assert.equal(review.searches,1);
 assert.equal([...review.sources.values()][0].confirmation,'model-web-search');
 const second=parseWebReview(claude(),'claude-haiku-5-5');
 const result=mergeWebReviews([review,second]);
 assert.equal(result.schemaVersion,5);assert.equal(result.original?.rating,'not_healthy');
 assert.equal(result.original?.nutritionSource?.model,'gpt-6-luna');
});
test('no successful web search is a failed review, never an estimate fallback',()=>{
 assert.throws(()=>parseWebReview(gpt(envelope(),false),'gpt-6-luna'),/web_search_not_completed/);
});
test('missing, invented and private source links cannot confer web confirmation; unknown is not zero',()=>{
 for(const u of [null,'https://example.com/not-returned','http://127.0.0.1/private']){
  const review=parseWebReview(gpt(envelope(600,u)),'gpt-6-luna');
  const food=review.envelope.original as EstimatedFood;
  assert.equal(review.sources.size,0);assert.equal(food.rating,null);
  assert.equal(food.servingGrams,null);assert.ok(Object.values(food.nutrition).every(n=>n===null));
 }
});
test('web-confirmed sources can still disagree; no averaging and no favorable first arrival',()=>{
 const g=parseWebReview(gpt(envelope(600)),'gpt-6-luna'),c=parseWebReview(claude(envelope(300)),'claude-haiku-5-5');
 for(const reviews of [[g,c],[c,g]]){
  const result=mergeWebReviews(reviews);
  assert.equal(result.original?.rating,null);assert.equal(result.estimatesDiffer,true);
  assert.equal(result.original?.nutrition.sodiumMg,600);
  assert.equal(result.original?.nutritionSource?.model,'gpt-6-luna');
 }
});
test('web alternatives preserve equal-weight nutrition and strict data checks',()=>{
 const good=mergeWebReviews([parseWebReview(gpt(envelope(600,url,true)),'gpt-6-luna')]);
 assert.equal(good.alternatives.length,1);assert.ok(good.alternatives[0].nutritionSource);
 const bad=envelope(600,url,true);bad.a[0].n.pr=1;
 assert.equal(mergeWebReviews([parseWebReview(gpt(bad),'gpt-6-luna')]).alternatives.length,0);
 const missing=envelope();missing.o.n.tf=null;
 assert.equal(mergeWebReviews([parseWebReview(gpt(missing),'gpt-6-luna')]).original?.rating,null);
 const invalid=envelope();invalid.o.n.na=-20;
 assert.throws(()=>parseWebReview(gpt(invalid),'gpt-6-luna'));
 assert.ok(estimatedFoodSchema.safeParse(original).success);
});

test('Claude strict final-answer tool preserves searched facts without a second lookup or JSON/citation collision',()=>{
 const response=JSON.parse(claude());response.stop_reason='tool_use';
 response.content[2]={type:'tool_use',name:'submit_food_review',id:'answer',input:envelope()};
 const parsed=parseWebReview(JSON.stringify(response),'claude-haiku-5-5');
 assert.equal((parsed.envelope.original as EstimatedFood).nutrition.sodiumMg,600);
 const request=buildWebReviewRequest('fixture','claude-haiku-5-5');
 assert.deepEqual(request.tool_choice,{type:'any'});
 assert.equal((request.tools as any[])[1].strict,true);assert.equal(request.output_config,undefined);
 response.content.push(response.content[2]);
 assert.throws(()=>parseWebReview(JSON.stringify(response),'claude-haiku-5-5'),/duplicate_answer/);
});
test('web tool failures, absent finish and unsupported links cannot become nutrition confirmation',()=>{
 const response=JSON.parse(claude());
 response.stop_reason='pause_turn';
 assert.throws(()=>parseWebReview(JSON.stringify(response),'claude-haiku-5-5'),/incomplete/);
 response.stop_reason='end_turn';response.content[1].content={type:'web_search_tool_result_error',error_code:'unavailable'};
 assert.throws(()=>parseWebReview(JSON.stringify(response),'claude-haiku-5-5'),/tool_unavailable/);
});
test('Claude search transport issues one bounded call, preserves cancellation, and never leaks provider errors',async()=>{
 let calls=0;
 const transport=createWebClaudeTransport('fixture',async(_url,init)=>{
  calls++;assert.equal(JSON.parse(String(init?.body)).stream,false);
  return Response.json(JSON.parse(claude()));
 });
 assert.equal(parseWebReview(await transport({},new AbortController().signal),'claude-haiku-5-5').sources.size,1);
 assert.equal(calls,1);
 await assert.rejects(createWebClaudeTransport('fixture',async()=>new Response('secret upstream detail',{status:429}))({},new AbortController().signal),/claude_web_http_429/);
});
void createWebPhotoProvider;


test('a completed search with no confirmed source does not erase the other sourced review or claim agreement',()=>{
 const confirmed=parseWebReview(gpt(),'gpt-6-luna');
 const missing=parseWebReview(claude(envelope(300,null)),'claude-haiku-5-5');
 const result=mergeWebReviews([confirmed,missing]);
 assert.equal(result.reviewState,'partial');assert.deepEqual(result.models,['gpt-6-luna']);
 assert.equal(result.original?.nutrition.sodiumMg,600);assert.equal(result.original?.rating,'not_healthy');
 assert.equal(result.estimatesDiffer,false);
 const both=mergeWebReviews([parseWebReview(gpt(envelope(600,null)),'gpt-6-luna'),missing]);
 assert.equal(both.original?.rating,null);assert.equal(both.alternatives.length,0);
});

test('v5 HTTP route accepts product-only consent, preserves a sourced partial result and rejects profiles',async()=>{
 const row=mergeWebReviews([parseWebReview(gpt(),'gpt-6-luna')]);
 let calls=0;
 const server=createAppServer({accessMode:'open-beta',webReviews:{available:()=>true,recognize:async()=>{calls++;return row;}}});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+(server.address() as AddressInfo).port+'/v5/photos/recognize';
 try{
  const request={consentVersion:DUAL_FOOD_CONSENT,imageBase64:'AAAAAAAA'};
  const post=(body:unknown)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await post({...request,profile:{age:30}})).status,400);assert.equal(calls,0);
  const response=await post(request);assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.deepEqual(await response.json(),row);assert.equal(calls,1);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});

test('first sourced nutrition reaches the phone without waiting for the slower second review',async()=>{
 const segment=(marker:number,body:Buffer)=>{const h=Buffer.alloc(4);h[0]=255;h[1]=marker;h.writeUInt16BE(body.length+2,2);return Buffer.concat([h,body]);};
 const jpeg=Buffer.concat([Buffer.from([255,216]),segment(0xc0,Buffer.from([8,0,100,0,100,1,1,17,0])),segment(0xda,Buffer.from([1,1,0,0,63,0])),Buffer.from([0,255,0,2,255,217])]).toString('base64');
 let release!:(value:string)=>void,preview!:()=>void,finished=false;const seen:unknown[]=[];
 const progress=new Promise<void>(resolve=>preview=resolve);
 const provider=createWebPhotoProvider({reservePair:async()=>{},gpt:async()=>gpt(),claude:async()=>new Promise(resolve=>release=resolve)});
 const pending=provider.recognize({imageBase64:jpeg,consentVersion:DUAL_FOOD_CONSENT},new AbortController().signal,result=>{
  seen.push(result);assert.equal(result.reviewState,'checking');assert.equal(result.original?.nutrition.sodiumMg,600);assert.equal(result.alternatives.length,0);preview();
 }).then(result=>{finished=true;return result;});
 await progress;assert.equal(finished,false);release(claude());const result=await pending;
 assert.equal(result.reviewState,'complete');assert.equal(seen.length,1);
});

test('fast visual identity runs alongside web search; it cannot supply nutrition or block final results',async()=>{
 const segment=(marker:number,body:Buffer)=>{const h=Buffer.alloc(4);h[0]=255;h[1]=marker;h.writeUInt16BE(body.length+2,2);return Buffer.concat([h,body]);};
 const jpeg=Buffer.concat([Buffer.from([255,216]),segment(0xc0,Buffer.from([8,0,100,0,100,1,1,17,0])),segment(0xda,Buffer.from([1,1,0,0,63,0])),Buffer.from([0,255,0,2,255,217])]).toString('base64');
 let release!:(value:string)=>void,seen!:()=>void;const identitySeen=new Promise<void>(resolve=>seen=resolve);
 const provider=createWebPhotoProvider({reservePair:async()=>{},gpt:async()=>new Promise(resolve=>release=resolve),claude:async()=>claude(),identity:async request=>{
  assert.deepEqual(request.tools,[]);assert.equal(request.max_output_tokens,800);
  return JSON.stringify({status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(original.identity)}]}]});
 }});
 const pending=provider.recognize({imageBase64:jpeg,consentVersion:DUAL_FOOD_CONSENT},new AbortController().signal,undefined,undefined,identity=>{
  assert.equal(identity.name,'Tomato Sauce');assert.ok(!('nutrition' in identity));seen();
 });
 await identitySeen;release(gpt());assert.equal((await pending).reviewState,'complete');
});

test('GPT-only sourced review is complete, emits no second-review wait and retains source checks',async()=>{
 const segment=(marker:number,body:Buffer)=>{const h=Buffer.alloc(4);h[0]=255;h[1]=marker;h.writeUInt16BE(body.length+2,2);return Buffer.concat([h,body]);};
 const jpeg=Buffer.concat([Buffer.from([255,216]),segment(0xc0,Buffer.from([8,0,100,0,100,1,1,17,0])),segment(0xda,Buffer.from([1,1,0,0,63,0])),Buffer.from([0,255,0,2,255,217])]).toString('base64');
 for(const source of [url,null]){
  let calls=0,progress=0;
  const provider=createWebPhotoProvider({reservePair:async()=>{},gpt:async request=>{calls++;assert.equal(request.model,'gpt-6-luna');return gpt(envelope(600,source,true));}});
  const result=await provider.recognize({imageBase64:jpeg,consentVersion:DUAL_FOOD_CONSENT},new AbortController().signal,()=>progress++);
  assert.equal(calls,1);assert.equal(progress,0);assert.equal(result.reviewState,'complete');assert.deepEqual(result.models,['gpt-6-luna']);assert.equal(result.estimatesDiffer,false);
  assert.equal(result.original?.nutritionSource?.url??null,source);
  assert.equal(result.original?.rating,source?'not_healthy':null);
  if(!source)assert.equal(result.alternatives.length,0);
 }
});
