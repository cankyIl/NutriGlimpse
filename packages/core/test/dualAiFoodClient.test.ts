import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {reviewDualProductPhoto} from '../src/dualAiFoodClient.ts';
import {DUAL_FOOD_CONSENT,dualModels} from '../src/dualAiFoodReview.ts';

test('dual streamed client shows early identity/original and accepts an explicitly flagged final conflict',async()=>{
 const identity={status:'identified',brand:'Fixture',name:'Cereal',variant:null,size:null,visibleText:[]};
 const food={identity,category:'breakfast-cereal',servingText:'40 g',servingGrams:40,ingredients:null,rating:'neutral',
 nutrition:{caloriesKcal:150,saturatedFatG:0,transFatG:0,sugarsG:6,addedSugarsG:6,carbohydrateG:30,sodiumMg:100,fiberG:3,proteinG:3,potassiumMg:null,calciumMg:null,ironMg:null,magnesiumMg:null}};
 const preview={status:'identified',brand:'Fixture',name:'Cereal',variant:null,size:null};
 const progress={...result,status:'identified',original:food,models:[dualModels[0]],reviewState:'checking'};
 const final={...progress,status:'uncertain',models:[...dualModels],reviewState:'identity-conflict',original:{...food,rating:null,identity:{...identity,status:'uncertain'}}};
 const frames=[{type:'identity',result:preview},{type:'progress',result:progress},{type:'result',result:final}];
 const calls:string[]=[];
 const fetcher=async()=>new Response(frames.map(f=>JSON.stringify(f)).join('\n')+'\n',{headers:{'Content-Type':'application/x-ndjson'}});
 const actual=await reviewDualProductPhoto('AAAAAAAA',new NativeController().signal,fetcher,()=>calls.push('original'),undefined,()=>calls.push('identity'));
 assert.deepEqual(calls,['identity','original']);assert.equal(actual.reviewState,'identity-conflict');assert.equal(actual.original?.rating,null);
});

const require=createRequire(import.meta.url);
const NativeController=require('abort-controller/dist/abort-controller').AbortController as typeof AbortController;
const result={schemaVersion:4,models:[...dualModels],status:'no-product',original:null,alternatives:[],checkedAt:'2026-10-17T03:00:00.000Z',basis:'ai-estimate',reviewState:'complete',estimatesDiffer:false};
test('dual phone client uses separate consent/route and React Native signals',async()=>{
 const controller=new NativeController();assert.equal(typeof controller.signal.throwIfAborted,'undefined');
 const actual=await reviewDualProductPhoto('AAAAAAAA',controller.signal,async(url,init)=>{
  assert.ok(String(url).endsWith('/v4/photos/recognize'));
  assert.deepEqual(JSON.parse(String(init?.body)),{imageBase64:'AAAAAAAA',consentVersion:DUAL_FOOD_CONSENT});
  assert.equal(new Headers(init?.headers).has('Authorization'),false);return Response.json(result);
 });
 assert.deepEqual(actual,result);
});
test('dual client rejects malformed, legacy or overlarge results and never dispatches cancelled scans',async()=>{
 for(const body of [{...result,schemaVersion:3},{...result,models:[]},{...result,models:['invented']},{...result,profile:{}}])
  await assert.rejects(reviewDualProductPhoto('AAAAAAAA',new NativeController().signal,async()=>Response.json(body)));
 const controller=new NativeController();controller.abort();let calls=0;
 await assert.rejects(reviewDualProductPhoto('AAAAAAAA',controller.signal,async()=>{calls++;return Response.json(result);}),/cancelled/);assert.equal(calls,0);
});
