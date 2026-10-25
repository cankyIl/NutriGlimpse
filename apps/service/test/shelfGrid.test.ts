import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {createShelfGridProvider,buildShelfRequest,parseShelfCells} from '../src/shelfGridProvider.ts';
import {compactFood} from '../src/compactPhotoReview.ts';
import {cleanProductJpeg} from '../src/photoImage.ts';
import {createAppServer} from '../src/server.ts';
import {dualModels} from '../../../packages/core/src/dualAiFoodReview.ts';
import {grid,food} from '../../../packages/core/test/shelfGridFixtures.ts';
const envelope=(cells:unknown[])=>JSON.stringify({status:'completed',usage:{input_tokens:321,output_tokens:654},output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify({cells})}]}]});
const response=(n=16)=>envelope(Array.from({length:n},(_,i)=>({cell:i+1,food:compactFood(food('Product '+i))})));
const tick=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
test('both providers get the same 16-cell grid, numbering and prompt, never user health context',()=>{
 const g=grid(),a=buildShelfRequest(g,dualModels[0],'pixels'),b=buildShelfRequest(g,dualModels[1],'pixels');
 assert.equal(a.instructions,b.system);assert.equal(a.model,'gpt-6-luna');assert.equal(b.model,'claude-haiku-5-5');
 assert.equal(a.max_output_tokens,13000);assert.equal(b.max_tokens,13000);
 assert.ok(JSON.stringify(a).includes('original'));assert.ok(!('tools' in a));assert.ok(!('profile' in a));
 assert.throws(()=>cleanProductJpeg(g.imageBase64));
 assert.doesNotThrow(()=>cleanProductJpeg(g.imageBase64,{maxDimension:2048,width:g.width,height:g.height}));
 assert.throws(()=>cleanProductJpeg(g.imageBase64,{maxDimension:2048,width:1024,height:g.height}));
});
test('cell parser rejects duplicated/unknown IDs; malformed and missing cells remain individually unresolved',()=>{
 const g=grid(3);
 assert.equal(parseShelfCells(envelope([{cell:2,food:compactFood(food())},{cell:1,food:{bad:true}}]),g).size,1);
 assert.throws(()=>parseShelfCells(envelope([{cell:4,food:null}]),g));
 assert.throws(()=>parseShelfCells(envelope([{cell:1,food:null},{cell:1,food:null}]),g));
});
test('parallel grid requests merge all 16 products and cached repeats never incur another dispatch',async()=>{
 let calls=0,reserved=0;const events:unknown[]=[];
 const p=createShelfGridProvider({gpt:async()=>{calls++;return response();},claude:async()=>{calls++;return response();},reservePair:async()=>{reserved++;},audit:{record:(_t,e)=>events.push(e)}});
 const input=grid(),r=await p.recognize(input,new AbortController().signal);
 assert.equal(r.cells.length,16);assert.equal(r.cells.every(c=>c.review?.reviewState==='complete'),true);
 await p.recognize(input,new AbortController().signal);assert.equal(calls,2);assert.equal(reserved,1);
 await assert.rejects(p.recognize({...input,width:1024},new AbortController().signal),/CONFLICT/);
 assert.equal(events.filter(e=>(e as {kind:string}).kind==='shelf_usage').length,2);
 assert.equal(JSON.stringify(events).includes(input.imageBase64),false);
});
test('in-flight duplicate joins once; another batch in the same scan is held; cancelled results never escape',async()=>{
 const release:((s:string)=>void)[]=[];let calls=0;
 const transport=async()=>{calls++;return new Promise<string>(r=>release.push(r));};
 const p=createShelfGridProvider({gpt:transport,claude:transport,reservePair:async()=>{}});
 const controller=new AbortController(),first=p.recognize(grid(1),controller.signal);await tick();
 const same=p.recognize(grid(1),controller.signal);
 await assert.rejects(p.recognize(grid(1,'batch-2'),controller.signal),/BUSY/);
 controller.abort();release.forEach(r=>r(response(1)));await assert.rejects(first);await assert.rejects(same);assert.equal(calls,2);
 await assert.rejects(p.recognize(grid(1),new AbortController().signal));assert.equal(calls,2);
});
test('one failed provider preserves results; conflicts and missing nutrients cannot produce favorable claims',async()=>{
 const p=createShelfGridProvider({gpt:async()=>response(2),claude:async()=>{throw Error('offline');},reservePair:async()=>{}});
 const r=await p.recognize(grid(2),new AbortController().signal);assert.equal(r.cells[0].review?.reviewState,'partial');
 const incomplete=food('Other');incomplete.nutrition.transFatG=null;
 const q=createShelfGridProvider({gpt:async()=>response(2),claude:async()=>envelope([{cell:1,food:compactFood(food('Different'))},{cell:2,food:compactFood(incomplete)}]),reservePair:async()=>{}});
 const x=await q.recognize(grid(2),new AbortController().signal);assert.equal(x.cells[0].review?.original?.rating,null);assert.equal(x.cells[0].issue,'identity-conflict');
});
test('grid HTTP endpoint requires consent, rejects private fields and preserves ordinary routes',async()=>{
 let calls=0;const p=createShelfGridProvider({gpt:async()=>{calls++;return response(1);},claude:async()=>{calls++;return response(1);},reservePair:async()=>{}});
 const server=createAppServer({accessMode:'open-beta',shelfGrids:p});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+(server.address() as AddressInfo).port;
 try{
  for(const body of [{...grid(1),consentVersion:'old'},{...grid(1),profile:{name:'PRIVATE'}},{...grid(1),imageBase64:'invalid'}]){
   const res=await fetch(url+'/v1/shelf/grids',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(res.status,400);assert.ok(!(await res.text()).includes('PRIVATE'));
  }
  assert.equal(calls,0);
  const res=await fetch(url+'/v1/shelf/grids',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(grid(1))});assert.equal(res.status,200);
  const events=(await res.text()).trim().split('\n').map(l=>JSON.parse(l));assert.equal(events.at(-1).type,'result');assert.equal(calls,2);
  assert.equal((await fetch(url+'/health')).status,200);assert.equal((await fetch(url+'/v1/shelf/grids')).status,405);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});

test('GPT-only shelf checks all cells once, completes and preserves missing-nutrient holds',async()=>{
 let calls=0;const incomplete=food('Missing trans fat');incomplete.nutrition.transFatG=null;
 const p=createShelfGridProvider({gpt:async request=>{calls++;assert.equal(request.model,'gpt-6-luna');return envelope([{cell:1,food:compactFood(food('Product'))},{cell:2,food:compactFood(incomplete)}]);},reservePair:async()=>{}});
 const input=grid(2),result=await p.recognize(input,new AbortController().signal);
 assert.equal(calls,1);assert.ok(result.cells.every(c=>c.review?.reviewState==='complete'));
 assert.ok(result.cells.every(c=>JSON.stringify(c.review?.models)===JSON.stringify(['gpt-6-luna'])));
 assert.equal(result.cells[1].review?.original?.rating,null);
 await p.recognize(input,new AbortController().signal);assert.equal(calls,1);
});
