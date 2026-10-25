import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {reviewProductPhoto,checkProductSources,findProductMedia} from '../src/aiFoodClient.ts';
const require=createRequire(import.meta.url);
// This is the exact AbortController installed by React Native's setUpXHR.js.
const NativeController=require('abort-controller/dist/abort-controller').AbortController as typeof AbortController;
const result={schemaVersion:3,model:'gpt-6-luna',status:'no-product',original:null,alternatives:[],checkedAt:'2026-10-17T03:00:00.000Z',basis:'ai-estimate'};
const identity={status:'identified' as const,brand:'Fixture',name:'Cereal',variant:null,size:null,visibleText:[]};
const reply=(body:unknown,status=200)=>Response.json(body,{status});

test('successful review works with the exact React Native AbortController, without throwIfAborted',async()=>{
 const controller=new NativeController();assert.equal(typeof controller.signal.throwIfAborted,'undefined');let calls=0;
 const fetcher:typeof fetch=async()=>{calls++;return reply(result);};
 assert.deepEqual(await reviewProductPhoto('AAAAAAAA',controller.signal,fetcher),result);assert.equal(calls,1);
});
test('source and image checks also accept React Native signals',async()=>{
 const controller=new NativeController();const sources={foods:[],match:'possible',checkedAt:result.checkedAt};const media={image:null,reference:true};
 assert.deepEqual(await checkProductSources(identity,controller.signal,async()=>reply(sources)),sources);
 assert.deepEqual(await findProductMedia(identity,controller.signal,async()=>reply(media)),media);
});
test('already-cancelled photo never dispatches and cancellation during body reading stays cancelled',async()=>{
 const controller=new NativeController();controller.abort();let calls=0;
 await assert.rejects(reviewProductPhoto('AAAAAAAA',controller.signal,async()=>{calls++;return reply(result);}),/Scan cancelled/);assert.equal(calls,0);
 const mid=new NativeController();
 await assert.rejects(reviewProductPhoto('AAAAAAAA',mid.signal,async()=>({ok:true,status:200,headers:new Headers({'content-type':'application/json'}),text:async()=>{mid.abort();return JSON.stringify(result);}} as Response)),/Scan cancelled/);
});
test('HTTP gateway failures and malformed replies are distinct from device connectivity',async()=>{
 for(const status of [502,503,504])await assert.rejects(reviewProductPhoto('AAAAAAAA',new NativeController().signal,async()=>new Response('<html>gateway</html>',{status,headers:{'content-type':'text/html'}})),/server.*unavailable/i);
 await assert.rejects(reviewProductPhoto('AAAAAAAA',new NativeController().signal,async()=>new Response('broken',{headers:{'content-type':'application/json'}})),/response.*read/i);
 await assert.rejects(reviewProductPhoto('AAAAAAAA',new NativeController().signal,async()=>reply(null)),/response.*read/i);
 await assert.rejects(reviewProductPhoto('AAAAAAAA',new NativeController().signal,async()=>reply({schemaVersion:999})),/response.*read/i);
});
test('budget, busy and provider failure responses retain useful messages without retries',async()=>{
 for(const [status,code,message] of [[503,'PHOTO_BUDGET_UNAVAILABLE',/allowance/],[429,'PHOTO_BUSY',/busy/],[503,'PHOTO_OUTCOME_UNKNOWN',/review could not finish/],[408,'PHOTO_TIMED_OUT',/took too long/]] as const){
  let calls=0;await assert.rejects(reviewProductPhoto('AAAAAAAA',new NativeController().signal,async()=>{calls++;return reply({code},status);}),message);assert.equal(calls,1);
 }
});
test('only an actual transport rejection shows connection advice',async()=>{
 await assert.rejects(reviewProductPhoto('AAAAAAAA',new NativeController().signal,async()=>{throw new TypeError('Network request failed');}),/Could not connect/);
});
