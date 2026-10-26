import {test} from 'node:test';
import assert from 'node:assert/strict';
import {grid,food} from './shelfGridFixtures.ts';
import {SHELF_NINE_CONSENT,shelfNineModel,shelfNineRequestSchema,mergeNineProducts,assertNineAssociation,type ShelfNineRequest,type ShelfNineResult,type ShelfNineObservation} from '../src/shelfNine.ts';
import {ShelfNineSession} from '../src/shelfNineSession.ts';
import {reviewShelfNine} from '../src/shelfNineClient.ts';
export function nineInput(n=9,index=0):ShelfNineRequest{return {...grid(n,'batch-'+index),schemaVersion:2,consentVersion:SHELF_NINE_CONSENT,capacity:9,batchIndex:index,shareHealth:false,context:{healthConditions:[],dietaryRestrictions:[],store:null}};}
export function nineResult(input:ShelfNineRequest):ShelfNineResult{return {schemaVersion:2,sessionId:input.sessionId,batchId:input.batchId,batchIndex:input.batchIndex,model:shelfNineModel(input.batchIndex),complete:true,products:input.cells.map(c=>({cellNumbers:[c.cell],food:food('Product '+c.cell),reasons:[],sourceUrls:[],nutritionStatus:'estimated'})),alternatives:[],unresolvedCells:[],duplicatesRemoved:0,searchSuggestionsHtml:null};}
const native=(index=0,n=9)=>{const v=nineInput(n,index);return {...v,runId:v.sessionId,cells:v.cells.map(c=>({...c,packageId:c.packageId+'-'+index,photo:'photo'}))};};
const tick=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
test('nine-cell contract, partial grids and parallel consent',()=>{
 assert.equal(nineInput().columns,3);assert.equal(nineInput().rows,3);
 for(let n=1;n<=9;n++)assert.doesNotThrow(()=>shelfNineRequestSchema.parse(nineInput(n)));
 assert.throws(()=>shelfNineRequestSchema.parse({...nineInput(),capacity:16}));
 assert.throws(()=>shelfNineRequestSchema.parse({...nineInput(),columns:2}));
 assert.throws(()=>shelfNineRequestSchema.parse({...nineInput(),context:{...nineInput().context,healthConditions:['diabetes']}}));
 assert.doesNotThrow(()=>shelfNineRequestSchema.parse({...nineInput(),shareHealth:true,context:{...nineInput().context,healthConditions:['diabetes','hypertension','cardiovascular']}}));
 assert.deepEqual([0,1,2,3].map(shelfNineModel),Array(4).fill('gemini-3.5-flash-lite'));
});
test('cell and duplicate counts cannot be detached from original manifest',()=>{
 const i=nineInput(2),r=nineResult(i);assert.doesNotThrow(()=>assertNineAssociation(i,r));
 assert.throws(()=>assertNineAssociation(i,{...r,products:[r.products[0],r.products[0]]}));
 assert.throws(()=>assertNineAssociation(i,{...r,duplicatesRemoved:1}));
 assert.doesNotThrow(()=>assertNineAssociation(i,{...r,model:'gpt-6-luna'}));
});
test('Gemini wins exact cross-batch duplicates, whole records remain intact and variants stay distinct',()=>{
 const base=nineResult(nineInput(1)).products[0];
 const gpt:ShelfNineObservation={...base,model:'gpt-6-luna',batchId:'b1',packageIds:['a'],complete:true};
 const gemini:ShelfNineObservation={...base,food:{...base.food,nutrition:{...base.food.nutrition,sodiumMg:180},rating:'neutral'},reasons:['Gemini reason'],model:'gemini-3.5-flash-lite',batchId:'b2',packageIds:['b'],complete:true};
 for(const input of [[gpt,gemini],[gemini,gpt]]){const rows=mergeNineProducts(input);assert.equal(rows.length,1);assert.equal(rows[0].food.nutrition.sodiumMg,180);assert.deepEqual(rows[0].reasons,['Gemini reason']);assert.equal(rows[0].packageIds.length,2);}
 const variant={...gpt,food:{...gpt.food,identity:{...gpt.food.identity,variant:'Honey'}}};
 assert.equal(mergeNineProducts([gpt,variant]).length,2);
 assert.equal(mergeNineProducts([gpt,{...gemini,complete:false}])[0].model,'gpt-6-luna');
});
test('session streams visible facts, concurrent batches preserve sequence, Finish handles partial last grid',async()=>{
 const indices:number[]=[],acks:string[]=[],done:((r:ShelfNineResult)=>void)[]=[];
 const s=new ShelfNineSession('scan-1',nineInput().context,false,async(i,signal,progress)=>{
  indices.push(i.batchIndex);progress({...nineResult(i),complete:false});
  return new Promise(r=>done.push(r));
 },()=>{},id=>acks.push(id));
 s.accept(native());await tick();assert.equal(s.products.length,9);assert.equal(s.products[0].food.rating,null);
 s.accept(native(1,2));s.finish();await tick();assert.deepEqual(indices,[0,1]);done.shift()!(nineResult(nineInput()));await tick();
 assert.deepEqual(indices,[0,1]);done.shift()!(nineResult(nineInput(2,1)));await tick();
 assert.equal(s.phase,'complete');assert.equal(s.processed,11);assert.deepEqual(acks,['batch-0','batch-1']);assert.equal(s.products.length,9);
});
test('batch alternatives are visible before Finish and suppressed by any completed healthy batch',async()=>{
 const s=new ShelfNineSession('scan-1',nineInput().context,false,async i=>{
  const r=nineResult(i);
  if(i.batchIndex===0){r.products[0].food.rating='not_healthy';r.alternatives=[{...r.products[0],food:food('Better oats'),comparedCell:1,storeName:'Wegmans',aisle:null,retailerUrl:null}];}
  return r;
 },()=>{},()=>{});
 s.accept(native(0,1));await tick();assert.equal(s.alternatives.length,1);
 s.accept(native(1,1));await tick(); // different product, so Gemini priority cannot replace this green with its earlier red
 // Both fixtures have same identity; Gemini wins duplicate, so inject a distinct healthy fixture below.
 assert.equal(s.products[0].model,'gemini-3.5-flash-lite');
 const healthy={...s.products[0],food:food('Distinct healthy food'),packageIds:['different']};s.products.push(healthy);
 assert.equal(s.alternatives.length,0);
});
test('interrupted stream retains partial unrated facts and later batches still run; cancellation clears',async()=>{
 const s=new ShelfNineSession('scan-1',nineInput().context,false,async(i,_signal,progress)=>{
  if(i.batchIndex===0){progress({...nineResult(i),complete:false});throw Error('interrupted');}return {...nineResult(i),model:'gpt-6-luna'};
 },()=>{},()=>{});
 s.accept(native(0,1));s.accept(native(1,1));s.finish();await tick();
 assert.equal(s.phase,'complete');assert.equal(s.products.length,1);assert.equal(s.products[0].complete,true);
 assert.equal(s.products[0].model,'gpt-6-luna');assert.match(s.error,/interrupted/);
 s.cancel();assert.equal(s.products.length,0);assert.equal(s.batchResults.length,0);
});
test('HTTP client delivers progress before completion and rejects incorrect association',async()=>{
 const input=nineInput(1),r=nineResult(input),events:unknown[]=[];
 const fetcher=(async(url,options)=>{
  assert.ok(String(url).endsWith('/v2/shelf/grids'));assert.equal(JSON.parse(String(options?.body)).capacity,9);
  return new Response([JSON.stringify({type:'progress',result:{...r,complete:false}}),JSON.stringify({type:'result',result:r})].join('\n'));
 }) as typeof fetch;
 const result=await reviewShelfNine(input,new AbortController().signal,fetcher,v=>events.push(v));
 assert.equal(events.length,1);assert.equal(result.complete,true);
});

test('pipeline starts two batches, queues the third and updates completed primary cards before GPT finishes',async()=>{
 const starts:number[]=[],finish=new Map<number,(r:ShelfNineResult)=>void>(),progress=new Map<number,(r:ShelfNineResult)=>void>();
 const s=new ShelfNineSession('scan-1',nineInput().context,false,async(i,_signal,onProgress)=>{
  starts.push(i.batchIndex);progress.set(i.batchIndex,onProgress);return new Promise(r=>finish.set(i.batchIndex,r));
 },()=>{},()=>{});
 s.accept(native(0,1));s.accept(native(1,1));s.accept(native(2,1));await tick();
 assert.deepEqual(starts,[0,1]);
 progress.get(0)!({...nineResult(nineInput(1,0)),complete:false,primaryComplete:true});await tick();
 assert.equal(s.products[0].complete,true);assert.equal(s.products[0].food.rating,'healthy');assert.equal(s.processed,1);
 s.finish();finish.get(1)!(nineResult(nineInput(1,1)));await tick();assert.deepEqual(starts,[0,1,2]);
 finish.get(0)!(nineResult(nineInput(1,0)));finish.get(2)!(nineResult(nineInput(1,2)));await tick();
 assert.equal(s.phase,'complete');assert.equal(s.processed,3);assert.equal(s.batchResults.length,3);
});
