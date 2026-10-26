import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {SHELF_GRID_N,shelfGridRequestSchema,assertShelfAssociation,mergeShelfProducts,shelfLeadingProducts,shelfAlternativeLeaders,type ShelfProduct} from '../src/shelfGrid.ts';
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


test('blank model-disagreement ratings recover for ranking, but conflicting facts and unfinished streams stay excluded',()=>{
 const row=(id:string,f=food(id)):ShelfProduct=>({packageId:id,photo:'fixture',needsAlternatives:true,review:{...result(grid(1)).cells[0].review!,original:f}});
 const green=row('green');green.review.original!.rating=null;
 const neutral=row('neutral');neutral.review.original!.nutrition.fiberG=1;neutral.review.original!.nutrition.proteinG=2;
 const incomplete=row('incomplete');incomplete.review.original!.nutrition.transFatG=null;
 const conflict=row('conflict');conflict.review.estimatesDiffer=true;
 const interrupted=row('interrupted');interrupted.rankingReady=false;
 const leaders=shelfLeadingProducts([neutral,green,incomplete,conflict,interrupted]);
 assert.deepEqual(leaders.map(r=>r.packageId),['green']);assert.equal(leaders[0].review.original?.rating,'healthy');
 assert.equal(green.review.original?.rating,null,'ranking does not mutate its input');
 assert.equal(shelfAlternativeLeaders(leaders).length,0);
 assert.equal(shelfLeadingProducts([green],true).length,0);
});

test('outside alternatives target one best non-green choice per category, not duplicated facings or a category with green choices',()=>{
 const row=(id:string,category:string):ShelfProduct=>{const f=food(id,300);f.category=category;return {packageId:id,photo:'fixture',needsAlternatives:true,review:{...result(grid(1)).cells[0].review!,original:f}};};
 const a=row('a','crackers'),b=row('b','crackers'),sauce=row('sauce','tomato-pasta-sauce');
 const leaders=shelfLeadingProducts([a,b,sauce]);
 assert.deepEqual(shelfAlternativeLeaders(leaders).map(r=>r.packageId),['a','sauce']);
 const green=row('green','crackers');green.review.original!.nutrition.sodiumMg=100;
 assert.deepEqual(shelfAlternativeLeaders(shelfLeadingProducts([a,b,sauce,green])).map(r=>r.packageId),['sauce']);
});

test('ranking honors higher mineral priorities only when all peers have that mineral',()=>{
 const row=(id:string,k:number|null):ShelfProduct=>{const f=food(id);f.nutrition.potassiumMg=k;return {packageId:id,needsAlternatives:false,review:{...result(grid(1)).cells[0].review!,original:f}};};
 const priority=[{key:'potassiumMg' as const,direction:'higher' as const}];
 assert.deepEqual(shelfLeadingProducts([row('low',100),row('high',300)],false,priority).map(r=>r.packageId),['high']);
 assert.equal(shelfLeadingProducts([row('unknown',null),row('known',300)],false,priority).length,2);
});

test('interrupted final stream retains valid progress facts without ranking them and continues the next batch',async()=>{
 let calls=0;const acks:string[]=[];
 const s=new ShelfGridSession('scan-1',async(input,_signal,progress)=>{calls++;if(calls===1){progress(result(input));throw Error('Interrupted');}return result(input);},()=>{},id=>acks.push(id));
 s.accept(native(1));await tick();assert.equal(s.products.length,1);assert.equal(s.products[0].review.original?.rating,null);
 assert.equal(s.products[0].rankingReady,false);assert.equal(shelfLeadingProducts(s.products).length,0);
 const next=native(1,'batch-2');next.cells[0].packageId='next-package';s.accept(next);await tick();s.finish();
 assert.equal(s.phase,'complete');assert.equal(s.products.length,2);assert.equal(s.processed,2);assert.equal(s.unresolved,1);
 assert.deepEqual(acks,['batch-1','batch-2']);assert.equal(shelfLeadingProducts(s.products).length,1);
});


test('a green non-dominated shelf choice appears before neutral trade-offs in its category',()=>{
 const row=(id:string,f:ReturnType<typeof food>):ShelfProduct=>({packageId:id,photo:'fixture',needsAlternatives:true,review:{...result(grid(1)).cells[0].review!,original:f}});
 const green=food('Green',180),neutral=food('Neutral',250);neutral.nutrition.addedSugarsG=0;neutral.nutrition.sugarsG=0;
 const leaders=shelfLeadingProducts([row('neutral',neutral),row('green',green)]);
 assert.deepEqual(leaders.map(r=>r.packageId),['green','neutral']);assert.equal(shelfAlternativeLeaders(leaders).length,0);
});


test('interrupted progress cannot replace completed facts; later matching completed evidence restores a retained partial product',()=>{
 const complete:ShelfProduct={packageId:'a',review:result(grid(1)).cells[0].review!,needsAlternatives:false};
 const partial=structuredClone(complete);partial.rankingReady=false;partial.review.reviewState='partial';partial.review.original!.rating=null;
 assert.equal(mergeShelfProducts([complete],[partial])[0].review.reviewState,'complete');
 const newFacing={...structuredClone(complete),packageId:'b'};
 const recovered=mergeShelfProducts([partial],[newFacing]);assert.equal(recovered.length,1);assert.equal(recovered[0].review.reviewState,'complete');assert.equal(shelfLeadingProducts(recovered).length,1);
});
