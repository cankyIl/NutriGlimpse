import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer } from '../src/server.ts';
import { requestFictionalBackend,parseFictionalBackend } from '../../../packages/core/src/fictionalBackend.ts';
import { extractLocalIntake,fictionalOcrPages } from '../../../packages/core/src/intake.ts';
import type { AddressInfo } from 'node:net';
const example=(kind:'product'|'receipt'|'report')=>{
 const result=extractLocalIntake(kind,fictionalOcrPages(kind));
 const data=result.kind==='report'?{schemaVersion:result.data.schemaVersion,testDate:result.data.testDate,measurements:result.data.measurements,issues:result.data.issues}:result.data;
 return {schemaVersion:1,synthetic:true,model:'gpt-6-luna',kind,data};
};
test('fictional API accepts only empty fixed-example requests; client validates evidence',async()=>{
 let calls=0;
 const server=createAppServer({fictional:async kind=>{calls++;return example(kind);}});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+(server.address() as AddressInfo).port;
 try{
  for(const kind of ['product','receipt','report'] as const){const result=await requestFictionalBackend(kind,base+'/',new AbortController().signal);assert.equal(result.kind,kind);}
  assert.equal(calls,3);
  const rejected=await fetch(base+'/v1/fictional/extract/receipt',{method:'POST',body:'personal report'});
  assert.equal(rejected.status,400);assert.equal(calls,3);
  assert.equal((await fetch(base+'/v1/fictional/extract/unknown',{method:'POST'})).status,503);
  assert.equal((await fetch(base+'/v1/labs/analyze',{method:'POST',body:'private'})).status,503);
 }finally{await new Promise<void>(r=>server.close(()=>r()));}
});
test('client rejects non-synthetic data, unexpected model, source corruption, cleartext remote hosts and late cancellation',async()=>{
 assert.throws(()=>parseFictionalBackend('product',{...example('product'),synthetic:false}));
 assert.throws(()=>parseFictionalBackend('product',{...example('product'),model:'other'}));
 await assert.rejects(requestFictionalBackend('product','http://example.com/',new AbortController().signal));
 const controller=new AbortController();let calls=0;
 await assert.rejects(requestFictionalBackend('product','http://127.0.0.1/',controller.signal,(async()=>{calls++;controller.abort();return new Response(JSON.stringify(example('product')));}) as typeof fetch));
 assert.equal(calls,1);
});

test('backend provider failures are explicit and do not expose internals',async()=>{
 const server=createAppServer({fictional:async()=>{throw Error('private-key-or-provider-body');}});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 try{
 const response=await fetch('http://127.0.0.1:'+(server.address() as AddressInfo).port+'/v1/fictional/extract/product',{method:'POST'});
 assert.equal(response.status,503);assert.equal((await response.json()).code,'FICTIONAL_EXTRACTION_UNAVAILABLE');
 }finally{await new Promise<void>(r=>server.close(()=>r()));}
});

test('fictional client sends no credentials and rejects insecure destinations',async()=>{
 const fake:typeof fetch=async(input,init)=>{
  assert.equal(String(input),'https://grocery.serveforwad.com/v1/fictional/extract/product');
  assert.equal(new Headers(init?.headers).get('authorization'),null);
  assert.equal(init?.body,undefined);
  return new Response(JSON.stringify(example('product')));
 };
 assert.equal((await requestFictionalBackend('product','https://grocery.serveforwad.com',new AbortController().signal,fake)).kind,'product');
 await assert.rejects(requestFictionalBackend('product','http://other.example',new AbortController().signal,fake));
});
