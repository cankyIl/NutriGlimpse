import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import type {AddressInfo} from 'node:net';
import {createAiReviewProvider,parseReviewProgress,parseAiReview,buildAiReviewRequest} from '../src/aiFoodReviewProvider.ts';
import {createPhotoStreamTransport} from '../src/photoStreamTransport.ts';
import {createAppServer} from '../src/server.ts';
import {AI_FOOD_CONSENT,type EstimatedFood,type AiFoodResult} from '../../../packages/core/src/aiFoodReview.ts';
import {reviewProductPhoto} from '../../../packages/core/src/aiFoodClient.ts';
const NativeController=createRequire(import.meta.url)('abort-controller/dist/abort-controller').AbortController as typeof AbortController;
const original:EstimatedFood={identity:{status:'identified',brand:'Fixture',name:'Cereal "Curly } {"',variant:null,size:null,visibleText:[]},category:'cereal',servingText:'40 g',servingGrams:40,ingredients:'oats, "} {", sugar',rating:'not_healthy',nutrition:{caloriesKcal:150,saturatedFatG:0.5,transFatG:0,sugarsG:12,addedSugarsG:12,carbohydrateG:32,sodiumMg:180,fiberG:3,proteinG:3,potassiumMg:null,calciumMg:null,ironMg:null,magnesiumMg:null}};
const alt=(name:string)=>({...original,identity:{...original.identity,name},rating:'healthy',nutrition:{...original.nutrition,sugarsG:1,addedSugarsG:1,fiberG:5}});
const review={status:'identified',original,alternatives:[{...alt('Rejected'),nutrition:{...alt('Rejected').nutrition,transFatG:null}},alt('A'),alt('B'),alt('C'),alt('D')]};
const rawText=JSON.stringify(review);
const envelope=(text=rawText)=>({status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text}]}]});
const result=parseAiReview(JSON.stringify(envelope()));
const segment=(marker:number,body:Buffer)=>{const head=Buffer.alloc(4);head[0]=255;head[1]=marker;head.writeUInt16BE(body.length+2,2);return Buffer.concat([head,body]);};
const jpeg=Buffer.concat([Buffer.from([255,216]),segment(0xc0,Buffer.from([8,0,100,0,100,1,1,17,0])),segment(0xda,Buffer.from([1,1,0,0,63,0])),Buffer.from([0,255,0,2,255,217])]).toString('base64');
const request={consentVersion:AI_FOOD_CONSENT,imageBase64:jpeg};
const event=(type:string,data:object)=>'data: '+JSON.stringify({type,...data})+'\n\n';
const stream=(lines:string)=>new Response(new ReadableStream({start(c){const data=new TextEncoder().encode(lines);for(let i=0;i<data.length;i+=13)c.enqueue(data.slice(i,i+13));c.close();}}),{headers:{'Content-Type':'text/event-stream'}});
test('partial parser exposes only whole validated foods and preserves final three checks at every split',()=>{
 let first=-1,max=0;
 for(let n=0;n<=rawText.length;n++){
  const value=parseReviewProgress(rawText.slice(0,n));if(!value)continue;if(first<0)first=n;
  assert.deepEqual(value.original,result.original);assert.ok(value.alternatives.length>=max);max=value.alternatives.length;
  assert.deepEqual(value.alternatives,result.alternatives.slice(0,max));
 }
 assert.ok(first>0&&first<rawText.length/2);assert.equal(max,3);
 assert.equal(parseReviewProgress(rawText.replace('"status":"identified"','"status":"no-product"')),null);
 const uncertain=parseReviewProgress(rawText.replace('"status":"identified"','"status":"uncertain"'));
 assert.equal(uncertain?.original?.rating,null);assert.equal(uncertain?.alternatives.length,0);
 assert.equal(buildAiReviewRequest('image').max_output_tokens,4500,'No shortened answer budget');
});
test('provider streaming retains one budget reservation, all nutrients, high image detail and final validation',async()=>{
 let reservations=0,dispatched=0;const progress:AiFoodResult[]=[];
 const transport=createPhotoStreamTransport('fixture',async(_url,init)=>{
  dispatched++;const req=JSON.parse(String(init?.body));assert.equal(req.model,'gpt-6-luna');assert.equal(req.store,false);assert.equal(req.stream,true);assert.equal(req.input[0].content[1].detail,'high');assert.deepEqual(req.tools,[]);
  return stream([...Array.from({length:Math.ceil(rawText.length/43)},(_,i)=>event('response.output_text.delta',{content_index:0,delta:rawText.slice(i*43,(i+1)*43)})),event('response.completed',{response:envelope()})].join(''));
 });
 const provider=createAiReviewProvider({reserveBudget:async()=>{reservations++;},transport});
 const final=await provider.recognize(request,new AbortController().signal,r=>progress.push(r));
 assert.equal(final.alternatives.length,3);assert.deepEqual(progress.map(p=>p.alternatives.length),[0,1,2,3]);assert.equal(reservations,1);assert.equal(dispatched,1);
 assert.deepEqual(final.original,result.original);
});
test('stream refuses missing completion, refusal, changed final content and oversized data without retry',async()=>{
 for(const data of [event('response.output_text.delta',{content_index:0,delta:rawText}),event('response.refusal.delta',{delta:'no'}),event('response.output_text.delta',{content_index:0,delta:rawText})+event('response.completed',{response:envelope('{}')}),event('response.output_text.delta',{content_index:0,delta:'x'.repeat(200001)})]){
  let calls=0;const transport=createPhotoStreamTransport('fixture',async()=>{calls++;return stream(data);});await assert.rejects(transport({},new AbortController().signal));assert.equal(calls,1);
 }
});
test('real HTTP route and native-signal client deliver the original before the gated final result',async()=>{
 let release!:()=>void,first!:()=>void;const gate=new Promise<void>(r=>release=r),seen=new Promise<void>(r=>first=r);let calls=0;
 const aiReviews=createAiReviewProvider({reserveBudget:async()=>{},transport:async(_req,_signal,onText)=>{calls++;onText?.(rawText.slice(0,rawText.indexOf(',"alternatives"')));await gate;onText?.(rawText);return JSON.stringify(envelope());}});
 const server=createAppServer({accessMode:'open-beta',aiReviews});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+(server.address() as AddressInfo).port;const rows:number[]=[];
 try{
  let finished=false;const pending=reviewProductPhoto(jpeg,new NativeController().signal,(_url,init)=>fetch(base+'/v3/photos/recognize',init),r=>{rows.push(r.alternatives.length);first();}).then(r=>{finished=true;return r;});
  await seen;assert.equal(finished,false);assert.deepEqual(rows,[0]);release();const final=await pending;
  assert.equal(final.alternatives.length,3);assert.deepEqual(rows,[0,3]);assert.equal(calls,1);
 }finally{release();server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
test('native client rejects interrupted/error/mismatched streams and never resends the photo',async()=>{
 const progress=JSON.stringify({type:'progress',result:{...result,alternatives:[]}})+'\n';
 for(const tail of ['',JSON.stringify({type:'error',code:'PHOTO_OUTCOME_UNKNOWN'})+'\n',JSON.stringify({type:'result',result:{...result,original:{...result.original,servingGrams:1}}})+'\n']){
  let calls=0;await assert.rejects(reviewProductPhoto(jpeg,new NativeController().signal,async()=>{calls++;return new Response(progress+tail,{headers:{'Content-Type':'application/x-ndjson'}});},()=>{}));assert.equal(calls,1);
 }
 const controller=new NativeController();let seen=0;
 await assert.rejects(reviewProductPhoto(jpeg,controller.signal,async()=>new Response(progress+JSON.stringify({type:'result',result})+'\n',{headers:{'Content-Type':'application/x-ndjson'}}),()=>{seen++;controller.abort();}),/cancelled/i);assert.equal(seen,1);
});

test('web stream keeps interim prose separate from the final nutrition JSON and rejects mismatched completion',async()=>{
 const answer='{"s":"no-product","o":null,"a":[]}';
 const output=[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:'Searching current labels.'}]},
 {type:'web_search_call',status:'completed',action:{type:'search',sources:[]}},
 {type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:answer}]}];
 const chunks=event('response.output_text.delta',{output_index:0,content_index:0,delta:'Searching current labels.'})+
  event('response.output_text.delta',{output_index:2,content_index:0,delta:answer});
 const seen:string[]=[];
 const transport=createPhotoStreamTransport('fixture',async()=>stream(chunks+event('response.completed',{response:{status:'completed',output}})));
 const raw=await transport({tools:[{type:'web_search'}]},new AbortController().signal,text=>seen.push(text));
 assert.deepEqual(seen,[answer]);assert.equal(JSON.parse(raw).output.length,3);
 output[2].content![0].text='different';
 await assert.rejects(createPhotoStreamTransport('fixture',async()=>stream(chunks+event('response.completed',{response:{status:'completed',output}})))({tools:[{type:'web_search'}]},new AbortController().signal),/completion_mismatch/);
});
