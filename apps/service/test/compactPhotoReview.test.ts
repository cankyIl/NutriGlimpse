import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {createRequire} from 'node:module';
import {compactFood,expandCompactFood,compactReviewSchema,nutrientKeys} from '../src/compactPhotoReview.ts';
import {buildAiReviewRequest,createAiReviewProvider,parseAiReview,parseReviewProgress,parseReviewIdentity} from '../src/aiFoodReviewProvider.ts';
import {createAppServer} from '../src/server.ts';
import {reviewProductPhoto} from '../../../packages/core/src/aiFoodClient.ts';
import {AI_FOOD_CONSENT,photoPreviewOf,type EstimatedFood,type AiPhotoPreview} from '../../../packages/core/src/aiFoodReview.ts';
const NativeController=createRequire(import.meta.url)('abort-controller/dist/abort-controller').AbortController as typeof AbortController;
const original:EstimatedFood={identity:{status:'identified',brand:'Fixture',name:'Cereal "Curly } {"',variant:'Honey',size:'12 oz',visibleText:['Honey','Whole oats']},category:'cereal',servingText:'40 g',servingGrams:40,ingredients:'oats, "} {", sugar',rating:'not_healthy',nutrition:{caloriesKcal:150,saturatedFatG:0.5,transFatG:0,sugarsG:12,addedSugarsG:12,carbohydrateG:32,sodiumMg:180,fiberG:3,proteinG:3,potassiumMg:120,calciumMg:90,ironMg:3,magnesiumMg:null}};
const alt=(name:string):EstimatedFood=>({...original,identity:{...original.identity,name,variant:null,visibleText:[]},rating:'healthy',nutrition:{...original.nutrition,sugarsG:1,addedSugarsG:1,fiberG:5}});
const full={status:'identified',original,alternatives:['A','B','C','D','E'].map(alt)};
const compact={s:full.status,o:compactFood(original),a:full.alternatives.map(compactFood)};
const envelope=(value:unknown)=>JSON.stringify({status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
const text=JSON.stringify(compact),final=parseAiReview(envelope(compact),0);
const segment=(marker:number,body:Buffer)=>{const head=Buffer.alloc(4);head[0]=255;head[1]=marker;head.writeUInt16BE(body.length+2,2);return Buffer.concat([head,body]);};
const jpeg=Buffer.concat([Buffer.from([255,216]),segment(0xc0,Buffer.from([8,0,100,0,100,1,1,17,0])),segment(0xda,Buffer.from([1,1,0,0,63,0])),Buffer.from([0,255,0,2,255,217])]).toString('base64');
test('compact wire format is lossless, shorter and preserves all existing review decisions',()=>{
 assert.deepEqual(expandCompactFood(compactFood(original)),original);
 for(const food of full.alternatives)assert.deepEqual(expandCompactFood(compactFood(food)),food);
 assert.deepEqual(final,parseAiReview(envelope(full),0));assert.equal(final.alternatives.length,3);
 assert.ok(compactReviewSchema.safeParse(compact).success);
 assert.ok(text.length<JSON.stringify(full).length*0.8,'At least 20% fewer fixture JSON characters without dropping fields');
 const request=buildAiReviewRequest('fixture');assert.equal(request.model,'gpt-6-luna');assert.equal(request.max_output_tokens,4500);assert.equal(request.reasoning.effort,'none');assert.equal(request.input[0].content[1].detail,'high');
 assert.equal(Object.keys(nutrientKeys).length,Object.keys(original.nutrition).length);
 assert.match(request.instructions,/FIVE/);assert.match(request.instructions,/No internet/);
});
test('every compact split exposes identity earlier, but no nutrient card until a complete valid food',()=>{
 let firstIdentity=-1,firstFood=-1,lastCount=0;
 for(let i=0;i<=text.length;i++){
  const prefix=text.slice(0,i),identity=parseReviewIdentity(prefix),progress=parseReviewProgress(prefix);
  if(identity){if(firstIdentity<0)firstIdentity=i;assert.deepEqual(identity,photoPreviewOf(original.identity));assert.ok(!('rating' in identity));}
  if(progress?.original){if(firstFood<0)firstFood=i;assert.deepEqual(progress.original,final.original);assert.ok(progress.alternatives.length>=lastCount);lastCount=progress.alternatives.length;assert.deepEqual(progress.alternatives,final.alternatives.slice(0,lastCount));}
 }
 assert.ok(firstIdentity>0&&firstIdentity<firstFood);assert.ok(firstFood<text.length);assert.equal(lastCount,3);
 const uncertain=text.replace('"s":"identified"','"s":"uncertain"');assert.equal(parseReviewIdentity(uncertain)?.status,'uncertain');assert.equal(parseReviewProgress(uncertain)?.original?.rating,null);
 for(const raw of ['',text.slice(0,60),text.replace('"s":"identified"','"s":"no-product"')])assert.equal(parseReviewIdentity(raw),null);
});
test('compact invalid/missing/unknown data never becomes safe nutrition or drops a valid original',()=>{
 for(const bad of [{...compact.a[0],extra:'x'},{...compact.a[0],n:{...compact.a[0].n,tf:undefined}},{...compact.a[0],n:{...compact.a[0].n,tf:null}},{...compact.a[0],n:{...compact.a[0].n,tf:1}},{...compact.a[0],g:1}]){
  const result=parseAiReview(envelope({...compact,a:[bad,...compact.a.slice(1)]}),0);assert.deepEqual(result.original,final.original);assert.equal(result.alternatives.length,3);assert.equal(result.alternatives[0].identity.name,'B');
 }
 assert.equal(parseAiReview(envelope({...compact,o:{...compact.o,n:{...compact.o.n,tf:null}}}),0).original?.rating,null);
 assert.throws(()=>parseAiReview(envelope({...compact,other:true})));assert.throws(()=>parseAiReview(envelope({...compact,a:[...compact.a,compact.a[0]]})));
});
test('real HTTP opt-in delivers identity before nutrition and final three; old clients receive no identity events',async()=>{
 let release!:()=>void,seen!:()=>void;const gate=new Promise<void>(r=>release=r),previewSeen=new Promise<void>(r=>seen=r);
 let calls=0,reservations=0,progress=0,finished=false;
 const aiReviews=createAiReviewProvider({reserveBudget:async()=>{reservations++;},transport:async(_request,_signal,onText)=>{calls++;onText?.(text.slice(0,text.indexOf(',"c"')));if(calls===1)await gate;onText?.(text);return envelope(compact);}});
 const server=createAppServer({accessMode:'open-beta',aiReviews});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+(server.address() as AddressInfo).port+'/v3/photos/recognize';
 try{
  const pending=reviewProductPhoto(jpeg,new NativeController().signal,(_url,init)=>fetch(url,init),()=>progress++,undefined,identity=>{assert.deepEqual(identity,photoPreviewOf(original.identity));seen();}).then(value=>{finished=true;return value;});
  await previewSeen;assert.equal(progress,0);assert.equal(finished,false);release();assert.equal((await pending).alternatives.length,3);
  const legacy=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},body:JSON.stringify({imageBase64:jpeg,consentVersion:AI_FOOD_CONSENT})});const rows=(await legacy.text()).trim().split('\n').map(row=>JSON.parse(row));
  assert.ok(rows.every(row=>['progress','result'].includes(row.type)));assert.equal(rows.at(-1).result.alternatives.length,3);assert.equal(calls,2);assert.equal(reservations,2);
 }finally{release();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
test('identity previews reject extra claims, repeats, changes and interrupted streams without retry',async()=>{
 const identity=photoPreviewOf(original.identity),event=(type:string,result:unknown)=>JSON.stringify({type,result})+'\n';
 const preview=event('identity',identity),done=event('result',final),progress=event('progress',{...final,alternatives:[]});
 for(const rows of [preview,preview+preview+done,progress+preview+done,event('identity',{...identity,rating:'healthy'})+done,event('identity',{...identity,name:'Different cereal'})+done,preview+event('error',{code:'x'}),preview+event('result',{...final,original:null})]){
  let calls=0;await assert.rejects(reviewProductPhoto(jpeg,new NativeController().signal,async()=>{calls++;return new Response(rows,{headers:{'Content-Type':'application/x-ndjson'}});},()=>{},undefined,()=>{}));assert.equal(calls,1);
 }
 let seen=0;const controller=new NativeController();await assert.rejects(reviewProductPhoto(jpeg,controller.signal,async()=>new Response(preview+done,{headers:{'Content-Type':'application/x-ndjson'}}),()=>{},undefined,()=>{seen++;controller.abort();}),/cancelled/i);assert.equal(seen,1);
});
test('new preview-capable clients still accept legacy JSON responses without a preview',async()=>{
 const previews:AiPhotoPreview[]=[];const result=await reviewProductPhoto(jpeg,new NativeController().signal,async()=>Response.json(final),()=>{},undefined,value=>previews.push(value));assert.deepEqual(result,final);assert.deepEqual(previews,[]);
});


test('extra or oversized auxiliary label snippets do not discard valid nutrition',()=>{
 const row=compactFood(original);
 const many={...row,t:Array.from({length:9},(_,i)=>'Visible package snippet '+i)};
 const expanded=expandCompactFood(many);
 assert.equal(expanded.identity.visibleText.length,6);assert.deepEqual(expanded.nutrition,original.nutrition);
 assert.equal(expanded.identity.name,original.identity.name);
 const result=parseAiReview(envelope({...compact,o:many}),0);
 assert.deepEqual(result.original?.nutrition,final.original?.nutrition);assert.equal(result.alternatives.length,3);
 assert.deepEqual(expandCompactFood({...row,t:['x'.repeat(161),'Visible title']}).identity.visibleText,['Visible title']);
 assert.throws(()=>expandCompactFood({...many,n:{...row.n,na:-1}}));
 assert.throws(()=>expandCompactFood({...many,n:{...row.n,tf:'0'}}));
 assert.throws(()=>expandCompactFood({...many,t:[{text:'Not a string'}]}));
 assert.equal(parseAiReview(envelope({...compact,o:{...many,n:{...row.n,tf:null}}}),0).original?.rating,null);
});
