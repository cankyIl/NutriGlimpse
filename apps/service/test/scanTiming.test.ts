import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {createAppServer} from '../src/server.ts';
import {createAiReviewProvider} from '../src/aiFoodReviewProvider.ts';
import {createPhotoStreamTransport} from '../src/photoStreamTransport.ts';
import {createServerScanTimer} from '../src/scanTiming.ts';
import {betaEventSchema,type BetaEvent} from '../src/betaDiagnostics.ts';
import {reviewProductPhoto} from '../../../packages/core/src/aiFoodClient.ts';
import {AI_FOOD_CONSENT} from '../../../packages/core/src/aiFoodReview.ts';
const segment=(marker:number,body:Buffer)=>{const h=Buffer.alloc(4);h[0]=255;h[1]=marker;h.writeUInt16BE(body.length+2,2);return Buffer.concat([h,body]);};
const jpeg=Buffer.concat([Buffer.from([255,216]),segment(0xc0,Buffer.from([8,0,100,0,100,1,1,17,0])),segment(0xda,Buffer.from([1,1,0,0,63,0])),Buffer.from([0,255,0,2,255,217])]).toString('base64');
const original={identity:{status:'identified',brand:'Fixture',name:'Cereal',variant:null,size:null,visibleText:[]},category:'cereal',servingText:'40g',servingGrams:40,ingredients:null,rating:'not_healthy',nutrition:{caloriesKcal:150,saturatedFatG:0.5,transFatG:0,sugarsG:12,addedSugarsG:12,carbohydrateG:32,sodiumMg:180,fiberG:3,proteinG:3,potassiumMg:null,calciumMg:null,ironMg:null,magnesiumMg:null}};
const raw=JSON.stringify({status:'identified',original,alternatives:['A','B','C'].map(name=>({...original,identity:{...original.identity,name},rating:'healthy',nutrition:{...original.nutrition,sugarsG:1,addedSugarsG:1,fiberG:5}}))});
const envelope={status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:raw}]}]};
const sse=(type:string,value:unknown)=>'data: '+JSON.stringify({type,...value as object})+'\n\n';
async function fixture(enabled=true){
 const rows:{trace:string;event:BetaEvent}[]=[];const audit={record:(trace:string,event:BetaEvent)=>{betaEventSchema.parse(event);rows.push({trace,event});}};let calls=0;
 const transport=createPhotoStreamTransport('fixture',async()=>{calls++;return new Response(sse('response.output_text.delta',{content_index:0,delta:raw})+sse('response.completed',{response:envelope}),{headers:{'Content-Type':'text/event-stream'}});});
 const provider=createAiReviewProvider({timingEnabled:enabled,audit,reserveBudget:async()=>{},transport});
 const server=createAppServer({accessMode:'open-beta',scanTimingEnabled:enabled,diagnostics:audit,aiReviews:provider});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+(server.address() as AddressInfo).port;
 return {rows,url,calls:()=>calls,close:async()=>{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}};
}
async function scan(f:Awaited<ReturnType<typeof fixture>>){
 let trace='';const hooks:string[]=[];const result=await reviewProductPhoto(jpeg,new AbortController().signal,(_u,init)=>fetch(f.url+'/v3/photos/recognize',init),()=>{},event=>{hooks.push(event.stage);trace=event.traceId??trace;});
 return {result,trace,hooks};
}
const report=(trace:string)=>({schemaVersion:1,traceId:trace,appVersion:'0.1.0',build:'7',outcome:'completed',marks:{photoReadyMs:500,uploadStartMs:510,firstResultMs:1000,firstCardLayoutMs:1050,completedMs:2000,endedMs:2000}});
const post=(url:string,value:unknown)=>fetch(url+'/v3/photos/timing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
test('local HTTP scan correlates native/client/server timings without extra AI calls or changed alternatives',async()=>{
 const f=await fixture();try{
  const {result,trace,hooks}=await scan(f);assert.equal(result.alternatives.length,3);assert.equal(f.calls(),1);assert.deepEqual(hooks,['uploadStartMs','responseHeadersMs']);
  assert.ok(f.rows.every(r=>r.trace===trace));const stages=f.rows.flatMap(r=>r.event.kind==='scan_server_timing'?[r.event.stage]:[]);
  for(const stage of ['body_received','provider_start','model_dispatch','model_headers','model_first_text','first_result','model_complete','response_sent'])assert.ok(stages.includes(stage as never),stage);
  assert.equal((await post(f.url,report(trace))).status,204);assert.equal((await post(f.url,report(trace))).status,404);
  const timing=f.rows.filter(r=>r.event.kind==='scan_client_timing');assert.equal(timing.length,1);assert.equal(timing[0].trace,trace);assert.ok(!JSON.stringify(timing).includes(jpeg));assert.equal(f.calls(),1);
 }finally{await f.close();}
});
test('timing switched off preserves recognition and refuses reports without collecting timing events',async()=>{
 const f=await fixture(false);try{const {result,trace}=await scan(f);assert.equal(result.alternatives.length,3);assert.equal((await post(f.url,report(trace))).status,404);assert.equal(f.rows.filter(r=>r.event.kind.startsWith('scan_')).length,0);assert.equal(f.calls(),1);}finally{await f.close();}
});
test('timing endpoint rejects personal fields, invented scans, oversized bodies and public reads',async()=>{
 const f=await fixture();try{
  const {trace}=await scan(f);assert.equal((await post(f.url,{...report(trace),imageBase64:'PRIVATE'})).status,400);assert.equal((await post(f.url,{...report(trace),marks:{endedMs:100,profile:'PRIVATE'}})).status,400);
  assert.equal((await post(f.url,report('12345678-1234-4234-8234-123456789012'))).status,404);
  assert.equal((await post(f.url,{...report(trace),padding:'x'.repeat(3000)})).status,413);assert.equal((await fetch(f.url+'/v3/photos/timing')).status,405);
  assert.equal((await post(f.url,report(trace))).status,204);assert.ok(!JSON.stringify(f.rows).includes('PRIVATE'));
 }finally{await f.close();}
});
test('server stage times use monotonic durations and each phase is recorded once',()=>{
 let t=100;const rows:BetaEvent[]=[];const mark=createServerScanTimer(true,{record:(_t,e)=>rows.push(e)},'12345678-1234-4234-8234-123456789012','provider',()=>t);
 t=130;mark('model_dispatch');t=180;mark('model_first_text');mark('model_first_text');assert.equal(rows.length,2);assert.equal(rows[1].kind==='scan_server_timing'&&rows[1].elapsedMs,80);
});
test('throwing timing hook cannot break transport or trigger another model request',async()=>{
 let calls=0;const transport=createPhotoStreamTransport('fixture',async()=>{calls++;return new Response(sse('response.output_text.delta',{content_index:0,delta:raw})+sse('response.completed',{response:envelope}),{headers:{'Content-Type':'text/event-stream'}});});
 assert.equal(await transport({},new AbortController().signal,undefined,()=>{throw Error('timing');}),JSON.stringify(envelope));assert.equal(calls,1);
});
