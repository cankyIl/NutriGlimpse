import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {createAppServer} from '../src/server.ts';
import {createAiReviewProvider} from '../src/aiFoodReviewProvider.ts';
import {createPhotoStreamTransport} from '../src/photoStreamTransport.ts';
import {betaEventSchema,type BetaEvent} from '../src/betaDiagnostics.ts';
import {reviewProductPhoto} from '../../../packages/core/src/aiFoodClient.ts';
const segment=(marker:number,body:Buffer)=>{const h=Buffer.alloc(4);h[0]=255;h[1]=marker;h.writeUInt16BE(body.length+2,2);return Buffer.concat([h,body]);};
const jpeg=Buffer.concat([Buffer.from([255,216]),segment(0xc0,Buffer.from([8,0,100,0,100,1,1,17,0])),segment(0xda,Buffer.from([1,1,0,0,63,0])),Buffer.from([0,255,0,2,255,217])]).toString('base64');
const original={identity:{status:'identified',brand:'Fixture',name:'Cereal',variant:null,size:null,visibleText:[]},category:'cereal',servingText:'40g',servingGrams:40,ingredients:null,rating:'not_healthy',nutrition:{caloriesKcal:150,saturatedFatG:0.5,transFatG:0,sugarsG:12,addedSugarsG:12,carbohydrateG:32,sodiumMg:180,fiberG:3,proteinG:3,potassiumMg:null,calciumMg:null,ironMg:null,magnesiumMg:null}};
const raw=JSON.stringify({status:'identified',original,alternatives:['A','B','C'].map(name=>({...original,identity:{...original.identity,name},rating:'healthy',nutrition:{...original.nutrition,sugarsG:1,addedSugarsG:1,fiberG:5}}))});
const envelope={status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:raw}]}]};
const sse=(type:string,value:unknown)=>'data: '+JSON.stringify({type,...value as object})+'\n\n';
async function fixture(){
 const rows:{trace:string;event:BetaEvent}[]=[];const audit={record:(trace:string,event:BetaEvent)=>{betaEventSchema.parse(event);rows.push({trace,event});}};let calls=0;
 const transport=createPhotoStreamTransport('fixture',async()=>{calls++;return new Response(sse('response.output_text.delta',{content_index:0,delta:raw})+sse('response.completed',{response:envelope}),{headers:{'Content-Type':'text/event-stream'}});});
 const provider=createAiReviewProvider({audit,reserveBudget:async()=>{},transport});
 const server=createAppServer({accessMode:'open-beta',diagnostics:audit,aiReviews:provider});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+(server.address() as AddressInfo).port;
 return {rows,url,calls:()=>calls,close:async()=>{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}};
}
test('release HTTP scan preserves streamed identity, nutrition and three alternatives with one provider request',async()=>{
 const f=await fixture();try{
  let requests=0,trace='';const identities:unknown[]=[],progress:unknown[]=[];
  const result=await reviewProductPhoto(jpeg,new AbortController().signal,async(_url,init)=>{
   requests++;const response=await fetch(f.url+'/v3/photos/recognize',init);trace=response.headers.get('X-Grocery-Trace-Id')??'';return response;
  },value=>progress.push(value),value=>identities.push(value));
  assert.equal(result.original?.identity.name,'Cereal');assert.equal(result.alternatives.length,3);
  assert.ok(progress.length>0);assert.ok(identities.length>0);assert.equal(requests,1);assert.equal(f.calls(),1);
  assert.ok(trace);assert.equal(f.rows.some(r=>r.event.kind.startsWith('scan_')),false);
  const before=f.rows.length;
  const oldReport={schemaVersion:1,traceId:trace,appVersion:'0.1.0',build:'27',outcome:'completed',marks:{endedMs:100}};
  assert.equal((await fetch(f.url+'/v3/photos/timing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(oldReport)})).status,404);
  assert.equal(f.rows.length,before);assert.equal(f.calls(),1);
 }finally{await f.close();}
});
test('removed temporary timing events cannot enter the diagnostic schema',()=>{
 assert.equal(betaEventSchema.safeParse({kind:'scan_server_timing',clock:'provider',stage:'model_dispatch',elapsedMs:20}).success,false);
 assert.equal(betaEventSchema.safeParse({kind:'scan_client_timing',schemaVersion:1,appVersion:'0.1.0',build:'27',outcome:'completed',marks:{endedMs:100}}).success,false);
});
