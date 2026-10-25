import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {reviewGroceryPhoto} from '../src/groceryClient.ts';
import {GROCERY_CONSENT,GROCERY_PARALLEL_CONSENT,type GroceryContext} from '../src/groceryReview.ts';
import {DUAL_FOOD_CONSENT} from '../src/dualAiFoodReview.ts';
const require=createRequire(import.meta.url);
const NativeController=require('abort-controller/dist/abort-controller').AbortController as typeof AbortController;
const context:GroceryContext={healthConditions:['hypertension'],dietaryRestrictions:[],store:{name:'Wegmans',town:'Northborough',state:'MA',branch:'9102 Shops Way'}};
const oldResult={schemaVersion:5,models:['gpt-6-luna'],status:'no-product',original:null,alternatives:[],checkedAt:'2026-10-18T00:00:00.000Z',basis:'model-web-search',reviewState:'complete',estimatesDiffer:false};
const result={schemaVersion:6,model:'gemini-3.5-flash-lite',status:'no-product',original:null,alternatives:[],checkedAt:'2026-10-18T00:00:00.000Z',
 review:{schemaVersion:'gemini-grocery-review-v1',status:'unidentified',original:null,recommendationMode:'none',recommendations:[],recommendationShortfall:'No readable package.',sources:[],safetyReminder:'Check the label.'},
 grounding:{searchSuggestionsHtml:null,queries:[]},timing:{providerMs:100,validationMs:1}};
test('Gemini request sends only the approved context and new consent, with native abort signals',async()=>{
 const calls:string[]=[];
 const actual=await reviewGroceryPhoto('AAAAAAAA',context,new NativeController().signal,async(url,init)=>{
  calls.push(String(url));if(calls.length===1)return Response.json({schemaVersion:6,available:true});
  assert.ok(String(url).endsWith('/v6/photos/recognize'));
  assert.deepEqual(JSON.parse(String(init?.body)),{imageBase64:'AAAAAAAA',context,consentVersion:GROCERY_CONSENT});
  assert.equal(new Headers(init?.headers).has('Authorization'),false);return Response.json(result);
 });assert.deepEqual(actual,result);assert.equal(calls.length,2);
});
test('disabled Gemini uses the existing streamed GPT route without sending selected conditions or store',async()=>{
 let calls=0;
 const actual=await reviewGroceryPhoto('AAAAAAAA',context,new NativeController().signal,async(url,init)=>{
  if(++calls===1)return Response.json({schemaVersion:6,available:false});
  assert.ok(String(url).endsWith('/v5/photos/recognize'));
  assert.deepEqual(JSON.parse(String(init?.body)),{imageBase64:'AAAAAAAA',consentVersion:DUAL_FOOD_CONSENT});
  return Response.json(oldResult);
 });assert.deepEqual(actual,oldResult);assert.equal(calls,2);
});
test('search quota yields a specific error without another paid request or memory fallback',async()=>{
 let calls=0;
 await assert.rejects(reviewGroceryPhoto('AAAAAAAA',context,new NativeController().signal,async()=>{
  return ++calls===1?Response.json({schemaVersion:6,available:true}):Response.json({code:'PROVIDER_QUOTA'},{status:429});
 }),/provider limit/);assert.equal(calls,2);
});
test('native cancellation before dispatch or after capabilities prevents photo/context upload',async()=>{
 for(const before of [true,false]){
  const controller=new NativeController();let calls=0;if(before)controller.abort();
  await assert.rejects(reviewGroceryPhoto('AAAAAAAA',context,controller.signal,async()=>{
   calls++;controller.abort();return Response.json({schemaVersion:6,available:true});
  }),/cancelled/);assert.equal(calls,before?0:1);
 }
});
test('malformed capabilities and responses fail clearly without leaking model text',async()=>{
 for(const caps of [{schemaVersion:5,available:true},{schemaVersion:6,available:'yes'}])
  await assert.rejects(reviewGroceryPhoto('AAAAAAAA',context,new NativeController().signal,async()=>Response.json(caps)),/settings/);
 let calls=0;
 await assert.rejects(reviewGroceryPhoto('AAAAAAAA',context,new NativeController().signal,async()=>{
  return ++calls===1?Response.json({schemaVersion:6,available:true}):Response.json({...result,model:'wrong-model'});
 }),/response could not be read/);
});
test('network failure is distinguished from provider quota',async()=>{
 await assert.rejects(reviewGroceryPhoto('AAAAAAAA',context,new NativeController().signal,async()=>{throw new TypeError('raw transport internals');}),/could not be reached/);
});


test('Gemini preview arrives while the final response is still pending, including split native stream chunks',async()=>{
 let stream!:ReadableStreamDefaultController<Uint8Array>;const encoder=new TextEncoder();let calls=0,done=false;
 const identity={status:'identified',brand:'Fixture',name:'Cereal',variant:null,size:null};
 let gotPreview!:(v:unknown)=>void;const preview=new Promise(r=>{gotPreview=r;});
 const pending=reviewGroceryPhoto('AAAAAAAA',context,new NativeController().signal,async(_url,init)=>{
  if(++calls===1)return Response.json({schemaVersion:6,available:true});
  assert.equal(new Headers(init?.headers).get('Accept'),'application/x-ndjson; preview=identity');
  return new Response(new ReadableStream({start(c){stream=c;const line=JSON.stringify({type:'identity',result:identity})+'\n';c.enqueue(encoder.encode(line.slice(0,20)));c.enqueue(encoder.encode(line.slice(20)));}}),{headers:{'Content-Type':'application/x-ndjson'}});
 },undefined,undefined,gotPreview).then(v=>{done=true;return v;});
 assert.deepEqual(await preview,identity);assert.equal(done,false);
 stream.enqueue(encoder.encode(JSON.stringify({type:'result',result})+'\n'));stream.close();assert.deepEqual(await pending,result);
});
test('Gemini preview cancellation and duplicate or unsafe events do not become a completed review',async()=>{
 const identity={status:'identified',brand:'Fixture',name:'Cereal',variant:null,size:null};
 for(const events of [[{type:'identity',result:identity},{type:'identity',result:identity}],[{type:'identity',result:{...identity,rating:'healthy'}}],[{type:'result',result},{type:'identity',result:identity}]]){
  let calls=0;await assert.rejects(reviewGroceryPhoto('AAAAAAAA',context,new NativeController().signal,async()=>++calls===1?Response.json({schemaVersion:6,available:true}):new Response(events.map(e=>JSON.stringify(e)).join('\n')+'\n',{headers:{'Content-Type':'application/x-ndjson'}}),undefined,undefined,()=>{}),/response could not be read/);
 }
 const controller=new NativeController();let calls=0;
 await assert.rejects(reviewGroceryPhoto('AAAAAAAA',context,controller.signal,async()=>++calls===1?Response.json({schemaVersion:6,available:true}):new Response(JSON.stringify({type:'identity',result:identity})+'\n'+JSON.stringify({type:'result',result})+'\n',{headers:{'Content-Type':'application/x-ndjson'}}),undefined,undefined,()=>controller.abort()),/cancelled/);
});

test('new parallel context consent is transmitted only when explicitly supplied by the caller',async()=>{
 for(const consent of [undefined,GROCERY_PARALLEL_CONSENT]){
  let calls=0;
  await reviewGroceryPhoto('AAAAAAAA',context,new NativeController().signal,async(_url,init)=>{
   if(++calls===1)return Response.json({schemaVersion:6,available:true});
   assert.equal(JSON.parse(String(init?.body)).parallelContextConsentVersion,consent);return Response.json(result);
  },undefined,undefined,undefined,false,consent);
 }
});
