import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {createShelfGridProvider,buildShelfRequest,parseShelfCells} from '../src/shelfGridProvider.ts';
import {PhotoStreamFailure} from '../src/photoStreamTransport.ts';
import {betaEventSchema,type BetaEvent} from '../src/betaDiagnostics.ts';
import {shelfLeadingProducts,shelfAlternativeLeaders} from '../../../packages/core/src/shelfGrid.ts';
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


test('shelf rating uses coherent facts even when GPT supplies another color; essential facts still gate it',async()=>{
 const green=food('Wheat Thins Original');green.rating='neutral';
 const neutral=food('Ritz Drizzled Minis');neutral.nutrition.fiberG=1;neutral.nutrition.proteinG=2;neutral.nutrition.saturatedFatG=3;neutral.rating='not_healthy';
 const red=food('High Sodium');red.nutrition.sodiumMg=620;red.rating='healthy';
 const missing=food('Missing trans fat');missing.nutrition.transFatG=null;
 const impossible=food('Impossible');impossible.nutrition.sugarsG=200;
 const uncertain=food('Uncertain');uncertain.identity.status='uncertain';
 const events:BetaEvent[]=[];
 const provider=createShelfGridProvider({gpt:async()=>envelope([green,neutral,red,missing,impossible,uncertain].map((f,i)=>({cell:i+1,food:compactFood(f)}))),reservePair:async()=>{},audit:{record:(_t,e)=>events.push(betaEventSchema.parse(e))}});
 const r=await provider.recognize(grid(6),new AbortController().signal);
 assert.deepEqual(r.cells.map(c=>c.review?.original?.rating),['healthy','neutral','not_healthy',null,null,null]);
 assert.deepEqual(r.cells.map(c=>c.needsAlternatives),[false,true,true,false,false,false]);
 assert.ok(events.some(e=>e.kind==='shelf_batch'&&e.stage==='rating_reconciled'&&e.modelRating==='neutral'&&e.computedRating==='healthy'));
 const rows=r.cells.flatMap(c=>c.review?[{packageId:c.packageId,review:c.review,needsAlternatives:c.needsAlternatives,photo:'fixture'}]:[]);
 const leaders=shelfLeadingProducts(rows);
 assert.ok(leaders.some(p=>p.review.original?.identity.name==='Wheat Thins Original'));
 assert.equal(shelfAlternativeLeaders(leaders).length,0);
});

test('invalid food/missing row is retried alone; valid neighbors and their facts survive recovery',async()=>{
 let calls=0,reserves=0;const events:BetaEvent[]=[],requests:string[]=[];
 const good=food('Keep original facts',175);
 const provider=createShelfGridProvider({gpt:async request=>{
  calls++;requests.push(JSON.stringify(request));
  return calls===1?envelope([{cell:1,food:compactFood(good)},{cell:2,food:{bad:true}},{cell:3}]):envelope([{cell:2,food:compactFood(food('Recovered 2'))},{cell:3,food:compactFood(food('Recovered 3'))}]);
 },reservePair:async()=>{reserves++;},audit:{record:(_t,e)=>events.push(betaEventSchema.parse(e))}});
 const input=grid(3),r=await provider.recognize(input,new AbortController().signal);
 assert.equal(calls,2);assert.equal(reserves,2);assert.ok(requests[1].includes('Occupied cells: 2, 3.'));
 assert.equal(r.cells[0].review?.original?.nutrition.sodiumMg,175);assert.ok(r.cells.every(c=>c.issue==='none'));
 assert.ok(events.some(e=>e.kind==='shelf_batch'&&e.stage==='retry'&&e.batchId===input.batchId&&e.cells.join(',')==='2,3'));
 await provider.recognize(input,new AbortController().signal);assert.equal(calls,2);
 assert.equal(JSON.stringify(events).includes(input.imageBase64),false);
});

test('unreadable/unnamed uncertain cells do not throw away neighboring products or incur a pointless retry',async()=>{
 let calls=0;const unknown=food();unknown.identity.status='uncertain';unknown.identity.name=null;
 const p=createShelfGridProvider({gpt:async()=>{calls++;return envelope([{cell:1,food:compactFood(food())},{cell:2,food:compactFood(unknown)},{cell:3,food:null}]);},reservePair:async()=>{}});
 const r=await p.recognize(grid(3),new AbortController().signal);
 assert.equal(calls,1);assert.ok(r.cells[0].review?.original);assert.deepEqual(r.cells.slice(1).map(c=>c.issue),['unreadable','unreadable']);
});

test('failed cell recovery preserves good cells and records the terminal outcome',async()=>{
 let calls=0;const events:BetaEvent[]=[];
 const p=createShelfGridProvider({gpt:async()=>{calls++;if(calls===2)throw new PhotoStreamFailure('provider_http_503');return envelope([{cell:1,food:compactFood(food())},{cell:2,food:{bad:true}}]);},reservePair:async()=>{},audit:{record:(_t,e)=>events.push(betaEventSchema.parse(e))}});
 const r=await p.recognize(grid(2),new AbortController().signal);
 assert.equal(calls,2);assert.ok(r.cells[0].review?.original);assert.equal(r.cells[1].issue,'invalid');
 assert.ok(events.some(e=>e.kind==='shelf_batch'&&e.stage==='dispatch_failed'&&e.attempt===2));
 assert.ok(events.some(e=>e.kind==='shelf_batch'&&e.stage==='complete'&&e.cells.join(',')==='1'));
});

test('temporary provider failure retries once; auth failures and cancellation never retry',async()=>{
 for(const code of ['provider_http_503','provider_http_401']){
  let calls=0;const events:BetaEvent[]=[];
  const p=createShelfGridProvider({gpt:async()=>{calls++;if(calls===1)throw new PhotoStreamFailure(code);return response(1);},reservePair:async()=>{},audit:{record:(_t,e)=>events.push(betaEventSchema.parse(e))}});
  if(code.endsWith('503')){assert.ok((await p.recognize(grid(1),new AbortController().signal)).cells[0].review);assert.equal(calls,2);}
  else {await assert.rejects(p.recognize(grid(1),new AbortController().signal));assert.equal(calls,1);assert.ok(events.some(e=>e.kind==='shelf_batch'&&e.stage==='models_failed'));}
 }
 const c=new AbortController();let calls=0;
 const p=createShelfGridProvider({gpt:async()=>{calls++;c.abort();throw new PhotoStreamFailure('provider_http_503');},reservePair:async()=>{}});
 await assert.rejects(p.recognize(grid(1),c.signal));assert.equal(calls,1);
});

test('permanent malformed response exhausts at most one recovery and logs parse failure with batch correlation',async()=>{
 let calls=0;const events:BetaEvent[]=[];
 const p=createShelfGridProvider({gpt:async()=>{calls++;return '{';},reservePair:async()=>{},audit:{record:(_t,e)=>events.push(betaEventSchema.parse(e))}});
 await assert.rejects(p.recognize(grid(1),new AbortController().signal));assert.equal(calls,2);
 assert.ok(events.some(e=>e.kind==='shelf_batch'&&e.stage==='parse_failed'&&e.code==='invalid_json'&&e.sessionId==='scan-1'&&e.batchId==='batch-1'));
});
