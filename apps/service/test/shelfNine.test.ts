import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {projectRoot} from '../src/projectPaths.ts';
import {buildShelfNineRequest,createSingleShelfNineProvider,partialShelfProducts,parseShelfNineProducts,geminiShelfSchema} from '../src/shelfNineProvider.ts';
import {compactFood} from '../src/compactPhotoReview.ts';
import {food,grid} from '../../../packages/core/test/shelfGridFixtures.ts';
import {SHELF_NINE_CONSENT,type ShelfNineRequest,type ShelfNineResult} from '../../../packages/core/src/shelfNine.ts';
import {createAppServer} from '../src/server.ts';
const input=(n=9,index=0):ShelfNineRequest=>({...grid(n,'b-'+index),schemaVersion:2,consentVersion:SHELF_NINE_CONSENT,capacity:9,batchIndex:index,shareHealth:false,context:{healthConditions:[],dietaryRestrictions:[],store:{name:'Wegmans',town:'Northborough',state:'MA',branch:null}}});
const row=(cell=1,name='Oats',sodium=100)=>({cell_numbers:[cell],food:compactFood(food(name,sodium)),reasons:['Short reason'],source_urls:[],nutrition_status:'estimated'});
const answer=(rows:unknown[],alternatives:unknown[]=[])=>({products:rows,unidentified_cells:[],alternatives,total_duplicates_removed:0,limitations:[]});
const gemini=(v:unknown)=>({model:'gemini-3.5-flash-lite',status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(v)}]}],usage:{total_input_tokens:10,total_output_tokens:20}});
const gpt=(v:unknown)=>({status:'completed',output:[{type:'message',status:'completed',content:[{type:'output_text',text:JSON.stringify(v)}]}],usage:{input_tokens:10,output_tokens:20}});
test('new standalone prompt, 3x3, search and minimum thinking; shopper details only with consent',()=>{
 const a=buildShelfNineRequest(projectRoot,input(),'pixels'),b=buildShelfNineRequest(projectRoot,input(9,1),'pixels',undefined,'gpt-6-luna');
 assert.equal(a.model,'gemini-3.5-flash-lite');assert.deepEqual(a.generation_config,{max_output_tokens:9600,thinking_level:'minimal'});
 assert.equal(b.model,'gpt-6-luna');assert.deepEqual(b.reasoning,{effort:'none'});
 const text=JSON.stringify(a);assert.ok(text.includes('You are receiving a numbered grid'));assert.ok(text.includes('THIS BATCH'));assert.ok(text.includes('google_search'));assert.ok(!text.includes('SHELF GRID OVERRIDE'));
 assert.ok(text.includes('Wegmans'));assert.ok(!text.includes('years old'));
});
test('stream parser never emits a truncated nutrient value or broken string',()=>{
 const r=row(),s=JSON.stringify({products:[r,row(2,'Other')]});
 const before=s.indexOf('},{')+1;
 assert.equal(partialShelfProducts(s.slice(0,before)).length,1);
 assert.deepEqual(partialShelfProducts(s),[r,row(2,'Other')]);assert.deepEqual(partialShelfProducts('{"products":[{"cell_numbers":[1],"food":'),[]);
});
test('cell validation isolates malformed foods, refuses overlap and deduplicates exact records',()=>{
 const i=input(3),rows=parseShelfNineProducts([row(1),row(2),{cell_numbers:[3],food:{bad:true}}],i);
 assert.equal(rows.length,1);assert.deepEqual(rows[0].cellNumbers,[1,2]);
 assert.throws(()=>parseShelfNineProducts([row(1),row(1)],i),/ASSOCIATION/);
 assert.throws(()=>parseShelfNineProducts([row(4)],i),/ASSOCIATION/);
 const unknown=row(1);unknown.food.n.tf=null;assert.equal(parseShelfNineProducts([unknown],i)[0].food.rating,null);
 const red=row(1,'Salty',620);red.food.r='healthy';assert.equal(parseShelfNineProducts([red],i)[0].food.rating,'not_healthy');
});
test('provider streams products before final answer, routes only the chosen model, cache is idempotent',async()=>{
 let calls=0;const progress:ShelfNineResult[]=[];
 const p=createSingleShelfNineProvider({root:projectRoot,gemini:async(_r,_s,h)=>{
  calls++;h?.onText?.('{"products":['+JSON.stringify(row())+',');if(calls===1)assert.equal(progress.length,1);
  return gemini(answer([row()]));
 },gpt:async()=>{calls++;return gpt(answer([row()]));}});
 const r=await p.recognize(input(1),new AbortController().signal,v=>progress.push(v));
 assert.equal(r.products.length,1);assert.equal(r.model,'gemini-3.5-flash-lite');
 await p.recognize(input(1),new AbortController().signal);assert.equal(calls,1);
 await p.recognize(input(1,1),new AbortController().signal);assert.equal(calls,2);
 await assert.rejects(p.recognize({...input(1),shareHealth:true},new AbortController().signal),/CONFLICT/);
});
test('batch recovery requests only missing cells; good cells and diagnostics are preserved',async()=>{
 let calls=0;
 const p=createSingleShelfNineProvider({root:projectRoot,gemini:async request=>{
  calls++;if(calls===1)return gemini(answer([row(1)]));
  assert.match(JSON.stringify(request),/Occupied cells: 2/);return gemini(answer([row(2,'Other')]));
 },gpt:async()=>{throw Error('not used');}});
 const r=await p.recognize(input(2),new AbortController().signal);
 assert.equal(calls,2);assert.equal(r.products.length,2);assert.equal(r.unresolvedCells.length,0);
});
test('healthy in batch suppresses alternatives; red batch accepts better facts without source/aisle',async()=>{
 const alternative={...row(1,'Better oats'),compared_cell:1,store_name:'Wegmans',aisle:null,retailer_product_url:null};
 const make=(sodium:number)=>createSingleShelfNineProvider({root:projectRoot,gemini:async()=>gemini(answer([row(1,'Salty oats',sodium)],[alternative])),gpt:async()=>{throw Error('not used');}});
 assert.equal((await make(620).recognize(input(1),new AbortController().signal)).alternatives.length,1);
 assert.equal((await make(100).recognize(input(1),new AbortController().signal)).alternatives.length,0);
 alternative.food.n.tf=null;
 assert.equal((await make(620).recognize(input(1),new AbortController().signal)).alternatives.length,0);
});
test('auth/ordinary permanent errors do not cause repeated requests',async()=>{
 let calls=0;const p=createSingleShelfNineProvider({root:projectRoot,gemini:async()=>{calls++;throw Error('denied');},gpt:async()=>{throw Error('not used');}});
 await assert.rejects(p.recognize(input(1),new AbortController().signal));assert.equal(calls,1);
});
test('new HTTP route enforces consent, streams events and preserves old route/health',async()=>{
 const p=createSingleShelfNineProvider({root:projectRoot,gemini:async(_r,_s,h)=>{h?.onText?.('{"products":['+JSON.stringify(row())+',');return gemini(answer([row()]));},gpt:async()=>{throw Error('not used');}});
 const server=createAppServer({accessMode:'open-beta',shelfNine:p});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+(server.address() as AddressInfo).port;
 try{
  const post=(body:unknown)=>fetch(base+'/v2/shelf/grids',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await post({...input(1),consentVersion:'old'})).status,400);
  assert.equal((await post({...input(1),context:{...input(1).context,healthConditions:['diabetes']}})).status,400);
  const response=await post(input(1));assert.equal(response.status,200);
  const events=(await response.text()).trim().split('\n').map(l=>JSON.parse(l));assert.equal(events[0].type,'progress');assert.equal(events.at(-1).type,'result');
  assert.equal((await fetch(base+'/health')).status,200);assert.equal((await fetch(base+'/v1/shelf/grids')).status,405);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});

test('Gemini schema avoids compiler state explosion without changing runtime validation',()=>{
 const schema=JSON.stringify(geminiShelfSchema({type:'array',maxItems:9,items:{type:'string',maxLength:160}}));
 assert.ok(!schema.includes('maxItems'));assert.ok(!schema.includes('maxLength'));assert.ok(schema.includes('string'));
 const rowWithOversizedNutrient=row();rowWithOversizedNutrient.food.n.na=10001;
 assert.equal(parseShelfNineProducts([rowWithOversizedNutrient],input(1)).length,0);
});
test('duplicates recovered in a second dispatch still combine and retain correct cell counts',async()=>{
 let calls=0;
 const p=createSingleShelfNineProvider({root:projectRoot,gemini:async()=>gemini(answer([row(++calls)])),gpt:async()=>{throw Error('not used');}});
 const r=await p.recognize(input(2),new AbortController().signal);
 assert.equal(calls,2);assert.equal(r.products.length,1);assert.equal(r.duplicatesRemoved,1);assert.deepEqual(r.products[0].cellNumbers,[1,2]);
});
