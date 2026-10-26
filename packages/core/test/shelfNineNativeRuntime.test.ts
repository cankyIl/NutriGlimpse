import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {grid,food} from './shelfGridFixtures.ts';
import {SHELF_NINE_CONSENT,type ShelfNineRequest,type ShelfNineResult} from '../src/shelfNine.ts';
import {ShelfNineSession} from '../src/shelfNineSession.ts';
import {reviewShelfNine} from '../src/shelfNineClient.ts';

// Use the actual package installed by React Native's setUpXHR.js. Node's native
// AbortSignal has newer methods and hid a failure before the first phone upload.
const require=createRequire(import.meta.url);
const native=require('abort-controller/dist/abort-controller');
async function withPhoneRuntime(work:()=>Promise<void>){
 const savedController=globalThis.AbortController,savedSignal=globalThis.AbortSignal;
 globalThis.AbortController=native.AbortController;globalThis.AbortSignal=native.AbortSignal;
 try{await work();}finally{globalThis.AbortController=savedController;globalThis.AbortSignal=savedSignal;}
}
const input=():ShelfNineRequest=>({...grid(1),schemaVersion:2,consentVersion:SHELF_NINE_CONSENT,capacity:9,batchIndex:0,shareHealth:false,context:{healthConditions:[],dietaryRestrictions:[],store:null}});
const result=(i:ShelfNineRequest):ShelfNineResult=>({schemaVersion:2,sessionId:i.sessionId,batchId:i.batchId,batchIndex:i.batchIndex,model:'gemini-3.5-flash-lite',complete:true,
 products:i.cells.map(c=>({cellNumbers:[c.cell],food:food(c.packageId),reasons:[],sourceUrls:[],nutritionStatus:'estimated'})),alternatives:[],unresolvedCells:[],duplicatesRemoved:0,searchSuggestionsHtml:null});
const line=(type:string,r:ShelfNineResult)=>new TextEncoder().encode(JSON.stringify({type,result:r})+'\n');
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));

test('phone runtime uploads and processes all 25 captured packages, including streamed progress and Finish tail',async()=>withPhoneRuntime(async()=>{
 assert.equal(typeof (new AbortController().signal as unknown as {throwIfAborted?:unknown}).throwIfAborted,'undefined');
 const requests:ShelfNineRequest[]=[],acks:string[]=[],progressCounts:number[]=[];
 const fetcher=(async(_url,options)=>{
  const i=JSON.parse(String(options?.body)) as ShelfNineRequest;requests.push(i);const r=result(i);
  return new Response(new ReadableStream<Uint8Array>({async start(controller){
   controller.enqueue(line('progress',{...r,complete:false,primaryComplete:true}));
   await tick();controller.enqueue(line('result',r));controller.close();
  }}));
 }) as typeof fetch;
 const session=new ShelfNineSession('phone-25',input().context,false,(i,s,onProgress)=>reviewShelfNine(i,s,fetcher,r=>{onProgress(r);progressCounts.push(session.processed);}),()=>{},b=>acks.push(b));
 for(const [index,count] of [9,9,7].entries()){
  const g=grid(count,'batch-'+index);
  assert.equal(session.accept({...g,runId:session.id,capacity:9,cells:g.cells.map((c,j)=>({...c,packageId:'package-'+(index*9+j+1),photo:'local-preview'}))}),true);
 }
 session.finish();
 for(let n=0;n<30&&session.phase!=='complete';n++)await tick();
 assert.deepEqual(requests.map(r=>r.cells.length),[9,9,7]);assert.equal(session.processed,25);assert.equal(session.unresolved,0);
 assert.equal(session.error,'');assert.equal(session.phase,'complete');assert.equal(session.products.length,25);
 assert.equal(acks.length,3);assert.ok(progressCounts.includes(9));assert.ok(progressCounts.includes(25));
 assert.ok(session.products.every(p=>p.photo==='local-preview'));
}));

test('phone runtime rejects an already-cancelled scan without uploading',async()=>withPhoneRuntime(async()=>{
 const controller=new AbortController();controller.abort();let uploads=0;
 await assert.rejects(reviewShelfNine(input(),controller.signal,(async()=>{uploads++;return new Response();}) as typeof fetch),/cancelled/i);
 assert.equal(uploads,0);
}));

test('phone runtime cancellation stops a pending stream and forwards the abort to transport',async()=>withPhoneRuntime(async()=>{
 const parent=new AbortController();let uploadSignal:AbortSignal|undefined,streamCancelled=false;
 const fetcher=(async(_url,options)=>{
  uploadSignal=options?.signal??undefined;
  return new Response(new ReadableStream<Uint8Array>({cancel(){streamCancelled=true;}}));
 }) as typeof fetch;
 const pending=reviewShelfNine(input(),parent.signal,fetcher);
 const rejected=assert.rejects(pending,/cancelled/i);
 await tick();parent.abort();await rejected;
 assert.equal(uploadSignal?.aborted,true);assert.equal(streamCancelled,true);
}));

test('phone runtime cancellation at stream completion does not deliver a final result',async()=>withPhoneRuntime(async()=>{
 const parent=new AbortController(),i=input();
 const fetcher=(async()=>new Response(new ReadableStream<Uint8Array>({start(controller){
  controller.enqueue(line('result',result(i)));
 },pull(controller){parent.abort();controller.close();}}))) as typeof fetch;
 await assert.rejects(reviewShelfNine(i,parent.signal,fetcher),/cancelled/i);
}));

test('phone runtime still rejects results associated with a different shelf batch',async()=>withPhoneRuntime(async()=>{
 const i=input(),r={...result(i),batchId:'different-batch'};
 await assert.rejects(reviewShelfNine(i,new AbortController().signal,(async()=>new Response(line('result',r))) as typeof fetch),/Shelf batch mismatch/);
}));
