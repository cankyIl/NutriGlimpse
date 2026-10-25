import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {createAppServer,type ServiceOptions} from '../src/server.ts';
import {createPhotoAssessmentProvider} from '../src/photoAssessmentProvider.ts';
import {createRealReportProvider} from '../src/realReportProvider.ts';
import {PHOTO_ASSESSMENT_CONSENT} from '../../../packages/core/src/photoAssessment.ts';
import {assessProductPhoto} from '../../../packages/core/src/photoAssessmentClient.ts';
import {REAL_REPORT_CONSENT_VERSION} from '../../../packages/core/src/realReportEvidence.ts';
import {WEIGHT_REFERENCE,WEIGHT_CONTEXT_CONSENT} from '../../../packages/core/src/weightContext.ts';
const wire=(value:unknown)=>JSON.stringify({status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
const segment=(marker:number,body:Buffer)=>{const head=Buffer.alloc(4);head[0]=255;head[1]=marker;head.writeUInt16BE(body.length+2,2);return Buffer.concat([head,body]);};
const image=Buffer.concat([Buffer.from([255,216]),segment(0xc0,Buffer.from([8,0,100,0,100,1,1,17,0])),segment(0xda,Buffer.from([1,1,0,0,63,0])),Buffer.from([0,255,0,2,255,217])]).toString('base64');
const input={consentVersion:PHOTO_ASSESSMENT_CONSENT,imageBase64:image};
const identity={status:'no-product',brand:null,name:null,variant:null,size:null,visibleText:[]};
const headers={'Content-Type':'application/json'};
async function run(options:ServiceOptions,action:(base:string)=>Promise<void>){
 const server=createAppServer({accessMode:'open-beta',...options});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{await action('http://127.0.0.1:'+(server.address() as AddressInfo).port);}
 finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
test('key-free photo client reaches configured provider without authorization and keeps consent/field limits',async()=>{
 let calls=0,reservations=0;
 const photoAssessments=createPhotoAssessmentProvider({reserveBudget:async()=>{reservations++;},resolve:async()=>[],transport:async()=>{calls++;return wire({identity,alternatives:[]});}});
 await run({photoAssessments},async base=>{
  const cap=await fetch(base+'/v2/photos/capabilities');assert.equal(cap.status,200);assert.equal((await cap.json()).available,true);
  for(const body of [{...input,consentVersion:'old'},{...input,profile:{}},{...input,image:'PRIVATE'}]){
   assert.equal((await fetch(base+'/v2/photos/recognize',{method:'POST',headers,body:JSON.stringify(body)})).status,400);
  }
  assert.equal(calls,0);assert.equal(reservations,0);
  const fetcher:typeof fetch=async(url,init)=>{assert.equal(new Headers(init?.headers).get('authorization'),null);assert.equal(init?.redirect,'error');return fetch(base+new URL(String(url)).pathname,init);};
  const result=await assessProductPhoto(image,new AbortController().signal,fetcher);
  assert.equal(result.identity.status,'no-product');assert.equal(calls,1);assert.equal(reservations,1);
 });
});
test('key-free access still enforces budget and clinical gates before model dispatch',async()=>{
 let calls=0,reservations=0;
 const photoAssessments=createPhotoAssessmentProvider({reserveBudget:async()=>{reservations++;throw Error('private ledger');},resolve:async()=>[],transport:async()=>{calls++;return '';}});
 await run({photoAssessments},async base=>{
  const post=(body:unknown)=>fetch(base+'/v2/photos/recognize',{method:'POST',headers,body:JSON.stringify(body)});
  const context=await post({...input,weightContext:{category:'overweight',referenceVersion:WEIGHT_REFERENCE.version,consentVersion:WEIGHT_CONTEXT_CONSENT}});
  assert.equal((await context.json()).code,'PHOTO_CONTEXT_DISABLED');assert.equal(reservations,0);
  const exhausted=await post(input);assert.equal(exhausted.status,503);assert.equal((await exhausted.json()).code,'PHOTO_BUDGET_UNAVAILABLE');
  assert.equal(calls,0);assert.equal(reservations,1);
  const cap=await fetch(base+'/v2/photos/capabilities');assert.equal((await cap.json()).available,false);
 });
});
test('key-free routes retain rate/origin limits and do not open unrelated personal/admin endpoints',async()=>{
 await run({catalogBurst:2,refillPerSecond:0.001,now:()=>0},async base=>{
  assert.equal((await fetch(base+'/v2/photos/capabilities',{headers:{Origin:'https://untrusted.example'}})).status,403);
  for(const path of ['/v1/uploads','/v1/labs/analyze','/admin','/v2/photos/recognize?key=unused'])assert.equal((await fetch(base+path,{method:'POST'})).status,404);
  assert.equal((await fetch(base+'/v2/photos/capabilities')).status,200);
  assert.equal((await fetch(base+'/v2/photos/capabilities')).status,200);
  assert.equal((await fetch(base+'/v2/photos/capabilities')).status,429);
 });
});
test('optional key-free reports still require provider enablement, valid consent and typed non-identifying fields',async()=>{
 const evidence={schemaVersion:1 as const,testDate:'2026-10-01',measurements:[{analyte:'ldl' as const,rawValue:'128',unit:'mg/dL' as const,comparator:'=' as const,sourcePage:1}],issues:[]};
 const payload={consentVersion:REAL_REPORT_CONSENT_VERSION,evidence};let calls=0;
 await run({},async base=>{
  const cap=await fetch(base+'/v1/reports/capabilities');assert.equal(cap.status,200);assert.equal((await cap.json()).available,false);
  assert.equal((await fetch(base+'/v1/reports/extract',{method:'POST',headers,body:JSON.stringify(payload)})).status,503);
 });
 const realReports=createRealReportProvider({reserveBudget:async()=>{},transport:async()=>{calls++;return wire(evidence);}});
 await run({realReports},async base=>{
  for(const body of [{...payload,consentVersion:'old'},{...payload,evidence:{...evidence,name:'PRIVATE'}}])assert.equal((await fetch(base+'/v1/reports/extract',{method:'POST',headers,body:JSON.stringify(body)})).status,400);
  assert.equal(calls,0);
  const result=await fetch(base+'/v1/reports/extract',{method:'POST',headers,body:JSON.stringify(payload)});assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');assert.equal(calls,1);
 });
});
