import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {SHELF_GRID_N,shelfGridRequestSchema,assertShelfAssociation,mergeShelfProducts,shelfLeadingProducts,type ShelfProduct} from '../src/shelfGrid.ts';
import {ShelfGridSession} from '../src/shelfGridSession.ts';
import {reviewShelfGrid} from '../src/shelfGridClient.ts';
import {grid,result,food} from './shelfGridFixtures.ts';
const tick=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
const native=(n=16,id='batch-1')=>{const {schemaVersion,consentVersion,sessionId,...g}=grid(n,id);return {...g,runId:sessionId,cells:g.cells.map(c=>({...c,photo:'a-photo'}))};};
test('default 16 uses a 4x4 grid; every final partial count is accepted without fake filler cells',()=>{
 assert.equal(SHELF_GRID_N,16);
 for(let n=1;n<=16;n++){const g=shelfGridRequestSchema.parse(grid(n));assert.equal(g.cells.length,n);assert.equal(g.columns,Math.ceil(Math.sqrt(n)));assert.equal(g.rows,Math.ceil(n/g.columns));}
 for(const g of [{...grid(),capacity:12},{...grid(),cells:[...grid().cells,grid().cells[0]]},{...grid(),profile:{name:'PRIVATE'}},{...grid(),rows:3},{...grid(),cells:grid().cells.map(c=>({...c,packageId:'same'}))}])assert.equal(shelfGridRequestSchema.safeParse(g).success,false);
});
test('cell association checks IDs, revisions and counts instead of result array position',()=>{
 const g=grid(3),r=result(g);r.cells.reverse();assert.doesNotThrow(()=>assertShelfAssociation(g,r));
 for(const change of [(x:typeof r)=>{x.batchId='other';},(x:typeof r)=>{x.cells[0].revision=2;},(x:typeof r)=>{x.cells[0]=x.cells[1];},(x:typeof r)=>{x.cells.pop();}]){const bad=structuredClone(r);change(bad);assert.throws(()=>assertShelfAssociation(g,bad));}
});
test('bounded rolling queue starts before Finish, suppresses batch duplicates, flush result survives Finish',async()=>{
 const releases:(()=>void)[]=[],acks:string[]=[];
 const session=new ShelfGridSession('scan-1',async input=>{await new Promise<void>(resolve=>releases.push(resolve));return result(input);},()=>{},id=>acks.push(id));
 assert.equal(session.accept(native()),true);await tick();assert.equal(releases.length,1);
 assert.equal(session.accept(native()),false);assert.equal(session.accept(native(16,'batch-2')),true);assert.equal(session.accept(native(3,'batch-3')),true);assert.equal(session.accept(native(3,'batch-4')),false);
 session.finish();assert.equal(session.phase,'finishing');
 for(let i=0;i<3;i++){releases[i]();await tick();}
 assert.equal(session.phase,'complete');assert.equal(session.processed,35);assert.equal(session.queued,0);assert.deepEqual(acks,['batch-1','batch-2','batch-3']);
});
test('100 distinct products are processed in seven batches; display limits cannot cut off admission',async()=>{
 const session=new ShelfGridSession('scan-1',async input=>result(input),()=>{},()=>{});let count=0;
 for(let b=0;b<7;b++){const g=native(Math.min(16,100-count),'batch-'+b);g.cells=g.cells.map((c,i)=>({...c,packageId:'product-'+(count+i)}));assert.equal(session.accept(g),true);count+=g.cells.length;await tick();}
 session.finish();assert.equal(session.processed,100);assert.equal(session.products.length,100);assert.equal(session.phase,'complete');
});
test('cancellation drops queued images/results and rejects a late server reply',async()=>{
 let release!:()=>void;const s=new ShelfGridSession('scan-1',async input=>{await new Promise<void>(r=>release=r);return result(input);},()=>{},()=>{});
 s.accept(native());await tick();s.cancel();release();await tick();assert.equal(s.products.length,0);assert.equal(s.phase,'cancelled');assert.equal(s.accept(native(1,'later')),false);
});
test('same product facings merge; variants and sizes remain distinct; conflicting duplicate facts cannot become green',()=>{
 const review=result(grid(1)).cells[0].review!;
 const a:ShelfProduct={packageId:'a',review:{...review,original:food()},needsAlternatives:false};
 const b={...structuredClone(a),packageId:'b'},c={...structuredClone(a),packageId:'c'},d={...structuredClone(a),packageId:'d'};
 c.review.original!.identity.variant='Honey';d.review.original!.identity.size='800 g';
 assert.equal(mergeShelfProducts([a],[b,c,d]).length,3);
 b.review.original!.nutrition.sodiumMg=700;
 const merged=mergeShelfProducts([a],[b]);assert.equal(merged[0].review.original?.rating,null);assert.equal(shelfLeadingProducts(merged).length,0);
});
test('ranking uses equal weight, keeps category trade-offs, excludes unknown facts and respects dietary holds',()=>{
 const toRow=(id:string,f=food(id)):ShelfProduct=>({packageId:id,needsAlternatives:false,review:{...result(grid(1)).cells[0].review!,original:f}});
 const a=toRow('A'),b=toRow('B',food('B',200)),c=toRow('C',food('C',50));c.review.original!.nutrition.fiberG=3;
 const unknown=toRow('unknown');unknown.review.original!.nutrition.transFatG=null;
 assert.deepEqual(shelfLeadingProducts([a,b,c,unknown]).map(x=>x.packageId),['A','C']);
 assert.deepEqual(shelfLeadingProducts([a,b,c],false,[{key:'sodiumMg',direction:'lower'}]).map(x=>x.packageId),['C','A']);
 assert.equal(shelfLeadingProducts([a,b],true).length,0);
 const half=toRow('half');half.review.original!.servingGrams=20;for(const k of Object.keys(half.review.original!.nutrition) as (keyof ReturnType<typeof food>['nutrition'])[]){const v=half.review.original!.nutrition[k];if(v!==null)half.review.original!.nutrition[k]=v/2;}
 assert.equal(shelfLeadingProducts([a,half]).length,2);
});
test('stream client handles native AbortSignal and heartbeat; malformed association is rejected',async()=>{
 const require=createRequire(import.meta.url),NativeController=require('abort-controller/dist/abort-controller').AbortController;
 const g=grid(1),r=result(g);
 const response=(value:unknown)=>new Response(JSON.stringify({type:'keepalive'})+'\n'+JSON.stringify({type:'result',result:value})+'\n',{headers:{'Content-Type':'application/x-ndjson'}});
 const got=await reviewShelfGrid(g,new NativeController().signal,async()=>response(r));assert.deepEqual(got,r);
 await assert.rejects(reviewShelfGrid(g,new NativeController().signal,async()=>response({...r,batchId:'other'})));
 const cancelled=new NativeController();cancelled.abort();let calls=0;await assert.rejects(reviewShelfGrid(g,cancelled.signal,async()=>{calls++;return response(r);}));assert.equal(calls,0);
});

test('real iPhone native-event target metadata cannot reject a full grid or final four-package batch',async()=>{
 const sent:unknown[]=[],acks:string[]=[];
 const session=new ShelfGridSession('scan-1',async input=>{sent.push(input);return result(input);},()=>{},id=>acks.push(id));
 for(const [count,id] of [[16,'batch-full'],[4,'batch-final']] as const){
  const event={...native(count,id),target:731,nativeTimestamp:123};
  assert.equal(session.accept(event),true);await tick();
 }
 session.finish();
 assert.equal(session.processed,20);assert.equal(session.phase,'complete');
 assert.deepEqual(acks,['batch-full','batch-final']);
 assert.ok(sent.every(input=>!('target' in (input as object))&&!('nativeTimestamp' in (input as object))));
 assert.throws(()=>session['input']({...native(),cells:null as never}));
 const invalid=new ShelfGridSession('scan-1',async()=>{throw Error('must not send');},()=>{},()=>{});
 assert.throws(()=>invalid.accept({...native(),target:731,rows:1} as ReturnType<typeof native>));
 assert.equal(invalid.queued,0);
});
