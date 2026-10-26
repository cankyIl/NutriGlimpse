import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createShelfNineProvider} from '../src/shelfNineProvider.ts';
import {mergeParallelShelf} from '../src/shelfNineMerge.ts';
import {projectRoot} from '../src/projectPaths.ts';
import {compactFood} from '../src/compactPhotoReview.ts';
import {food,grid} from '../../../packages/core/test/shelfGridFixtures.ts';
import {SHELF_NINE_CONSENT,type ShelfNineRequest,type ShelfNineResult} from '../../../packages/core/src/shelfNine.ts';
const input=(n=1,index=0):ShelfNineRequest=>({...grid(n,'parallel-'+index),schemaVersion:2,consentVersion:SHELF_NINE_CONSENT,capacity:9,batchIndex:index,shareHealth:false,context:{healthConditions:[],dietaryRestrictions:[],store:null}});
const row=(cell=1,name='Oats')=>({cell_numbers:[cell],food:compactFood(food(name)),reasons:['Gemini explanation'],source_urls:[],nutrition_status:'estimated'});
const wire=(rows:unknown[])=>({products:rows,unidentified_cells:[],alternatives:[],total_duplicates_removed:0,limitations:[]});
const gemini=(v:unknown)=>({model:'gemini-3.5-flash-lite',status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(v)}]}]});
const gpt=(v:unknown)=>({status:'completed',output:[{type:'message',status:'completed',content:[{type:'output_text',text:JSON.stringify(v)}]}]});
const tick=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
const result=(model:'gemini-3.5-flash-lite'|'gpt-6-luna',names=['Oats']):ShelfNineResult=>({
 schemaVersion:2,sessionId:'scan-1',batchId:'parallel-0',batchIndex:0,model,complete:true,
 products:names.map((name,i)=>({cellNumbers:[i+1],food:food(name),reasons:[model+' reason'],sourceUrls:[],nutritionStatus:'estimated'})),
 alternatives:[],unresolvedCells:[],duplicatesRemoved:0,searchSuggestionsHtml:null,
});
test('both providers start on identical grid before either finishes; Gemini completion streams without waiting',async()=>{
 const started:string[]=[],progress:ShelfNineResult[]=[];
 let resolveGpt!:(v:unknown)=>void,resolveGemini!:(v:unknown)=>void;const images:string[]=[];
 const p=createShelfNineProvider({root:projectRoot,gemini:async(r,_s,h)=>{
  started.push('gemini');images.push((r.input as any)[1].data);h?.onText?.('{"products":['+JSON.stringify(row())+',');return new Promise(resolve=>{resolveGemini=resolve;});
 },gpt:async r=>{started.push('gpt');images.push((r.input as any)[0].content[0].image_url.split(',')[1]);return new Promise(resolve=>{resolveGpt=resolve;});}});
 const pending=p.recognize(input(),new AbortController().signal,r=>progress.push(r));await tick();
 assert.deepEqual(started,['gemini','gpt']);assert.equal(images[0],images[1]);assert.ok(progress.some(p=>p.products.length===1));
 resolveGemini(gemini(wire([row()])));await tick();
 assert.ok(progress.some(p=>p.primaryComplete===true&&p.complete===false&&p.products[0].food.rating==='healthy'));
 resolveGpt(gpt(wire([row(1,'Different identity')])));const final=await pending;
 assert.equal(final.products[0].food.identity.name,'Oats');assert.equal(final.model,'gemini-3.5-flash-lite');
 await p.recognize(input(),new AbortController().signal);assert.deepEqual(started,['gemini','gpt']);
});
test('fast GPT is held until Gemini, then only fills unresolved cells',async()=>{
 const progress:ShelfNineResult[]=[];let finish!:(v:unknown)=>void;
 const p=createShelfNineProvider({root:projectRoot,gemini:async()=>new Promise(r=>{finish=r;}),gpt:async()=>gpt(wire([row(1,'Wrong identity'),row(2,'Missing product')]))});
 const pending=p.recognize(input(2),new AbortController().signal,r=>progress.push(r));await tick();assert.equal(progress.length,0);
 finish(gemini({...wire([row()]),unidentified_cells:[2]}));const final=await pending;
 assert.equal(final.products.length,2);assert.equal(final.products[0].food.identity.name,'Oats');
 assert.equal(final.products.find(p=>p.cellNumbers.includes(2))?.sourceModel,'gpt-6-luna');
 assert.deepEqual(final.unresolvedCells,[]);
});
test('GPT gets its full provider deadline after Gemini; checked Gemini alternatives are already visible',async()=>{
 let aborted=false;const progress:ShelfNineResult[]=[];
 const original=row(1,'Salty oats');original.food.n.na=620;
 const alt={...row(1,'Better oats'),compared_cell:1,store_name:'Wegmans',aisle:'4',retailer_product_url:null};
 const p=createShelfNineProvider({root:projectRoot,providerTimeoutMs:35,gemini:async()=>gemini({...wire([original]),alternatives:[alt]}),gpt:async(_r,s)=>new Promise((_resolve,reject)=>{
  s.addEventListener('abort',()=>{aborted=true;reject(s.reason);},{once:true});
 })});
 // Keep the event loop alive while the unref'ed provider deadline is tested.
 const alive=setTimeout(()=>{},1000);
 try{
  const pending=p.recognize(input(),new AbortController().signal,r=>progress.push(r));await tick();
  assert.ok(progress.some(r=>r.primaryComplete&&r.alternatives.length===1));assert.equal(aborted,false);
  const final=await pending;assert.equal(final.alternatives.length,1);assert.equal(aborted,true);
 }finally{clearTimeout(alive);}
});
test('Gemini failure can use attributed GPT fallback; GPT failure never loses Gemini',async()=>{
 const a=createShelfNineProvider({root:projectRoot,gemini:async()=>{throw Error('failed');},gpt:async()=>gpt(wire([row()]))});
 const fallback=await a.recognize(input(),new AbortController().signal);assert.equal(fallback.model,'gpt-6-luna');assert.equal(fallback.products[0].sourceModel,'gpt-6-luna');
 const b=createShelfNineProvider({root:projectRoot,gemini:async()=>gemini(wire([row()])),gpt:async()=>{throw Error('failed');}});
 assert.equal((await b.recognize(input(),new AbortController().signal)).model,'gemini-3.5-flash-lite');
});
test('null-only nutrient filling requires exact identity and equal gram basis; Gemini supplied facts win',()=>{
 const a=result('gemini-3.5-flash-lite'),b=result('gpt-6-luna');
 a.products[0].food.nutrition.sodiumMg=620;a.products[0].food.rating='not_healthy';
 b.products[0].food.nutrition.sodiumMg=50;b.products[0].food.nutrition.potassiumMg=100;
 const out=mergeParallelShelf(a,b).products[0];assert.equal(out.food.nutrition.sodiumMg,620);assert.equal(out.food.nutrition.potassiumMg,100);assert.equal(out.food.rating,'not_healthy');assert.deepEqual(out.reasons,a.products[0].reasons);assert.equal(out.nutritionStatus,'estimated');
 b.products[0].food.servingGrams=80;assert.equal(mergeParallelShelf(a,b).products[0].food.nutrition.potassiumMg,null);
 b.products[0].food.servingGrams=40;b.products[0].food.identity.variant='Honey';assert.equal(mergeParallelShelf(a,b).products[0].food.nutrition.potassiumMg,null);
});
test('filled nutrients are revalidated and cannot produce an incoherent table',()=>{
 const a=result('gemini-3.5-flash-lite'),b=result('gpt-6-luna');
 a.products[0].food.nutrition.addedSugarsG=null;a.products[0].food.rating=null;b.products[0].food.nutrition.addedSugarsG=20;
 assert.equal(mergeParallelShelf(a,b).products[0].food.nutrition.addedSugarsG,null);
 b.products[0].food.nutrition.addedSugarsG=1;assert.equal(mergeParallelShelf(a,b).products[0].food.rating,'healthy');
});
test('GPT alternatives fill slots and retailer gaps, never cross-store aisle or Gemini healthy decision',()=>{
 const a=result('gemini-3.5-flash-lite'),b=result('gpt-6-luna');
 for(const r of [a,b]){r.products[0].food.nutrition.sodiumMg=620;r.products[0].food.rating='not_healthy';}
 const alternative=(name:string)=>({food:food(name),comparedCell:1,reasons:['Less sodium'],sourceUrls:[],nutritionStatus:'estimated' as const,storeName:null,aisle:null,retailerUrl:null});
 a.alternatives=[alternative('Better oats')];b.alternatives=[{...alternative('Better oats'),storeName:'Wegmans',aisle:'4'},alternative('Another oats')];
 let out=mergeParallelShelf(a,b);assert.equal(out.alternatives.length,2);assert.equal(out.alternatives[0].storeName,'Wegmans');assert.equal(out.alternatives[0].aisle,'4');
 a.alternatives[0].storeName='Target' as any;out=mergeParallelShelf(a,b);assert.equal(out.alternatives[0].aisle,null);
 a.products[0].food.rating='healthy';assert.equal(mergeParallelShelf(a,b).alternatives.length,0);
});
test('two batches can dispatch to both providers concurrently; third is bounded by capacity',async()=>{
 const calls:string[]=[],release:(()=>void)[]=[];
 const transport=(model:string)=>async(r:Record<string,unknown>)=>{calls.push(model);return new Promise<unknown>(resolve=>release.push(()=>resolve(model==='gemini'?gemini(wire([row()])):gpt(wire([row()])))));};
 const p=createShelfNineProvider({root:projectRoot,gemini:transport('gemini'),gpt:transport('gpt')});
 const a=p.recognize(input(1,0),new AbortController().signal),b=p.recognize(input(1,1),new AbortController().signal);await tick();
 assert.deepEqual(calls,['gemini','gpt','gemini','gpt']);
 await assert.rejects(p.recognize(input(1,2),new AbortController().signal),/BUSY/);
 release.forEach(f=>f());await Promise.all([a,b]);
});
