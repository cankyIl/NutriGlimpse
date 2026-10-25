import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import type {AddressInfo} from 'node:net';
import {createTesterAuthorization} from '../src/testerAccess.ts';
import {createAppServer} from '../src/server.ts';
const key='a'.repeat(43),hash=createHash('sha256').update(key).digest('hex');
test('tester credentials require exact bearer format and valid configuration',()=>{
 assert.throws(()=>createTesterAuthorization([]));assert.throws(()=>createTesterAuthorization(['bad']));
 const authorize=createTesterAuthorization([hash]);
 assert.equal(authorize('Bearer '+key),true);
 for(const value of [undefined,key,'Bearer '+'b'.repeat(43),'Bearer '+key+' ','Basic '+key])assert.equal(authorize(value),false);
});
test('protected backend denies requests before handlers and keeps personal uploads disabled',async()=>{
 let calls=0;
 const server=createAppServer({authorize:createTesterAuthorization([hash]),fictional:async()=>{calls++;return {};}});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+(server.address() as AddressInfo).port;
 try{
  for(const path of ['/health','/v1/catalog/samples','/v1/catalog/samples?token='+key]){
   const response=await fetch(base+path);assert.equal(response.status,401);assert.equal(response.headers.get('cache-control'),'no-store');
  }
  assert.equal((await fetch(base+'/v1/fictional/extract/product',{method:'POST'})).status,401);assert.equal(calls,0);
  const preflight=await fetch(base+'/v1/catalog/search/oats',{method:'OPTIONS',headers:{Origin:'http://localhost:8081','Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization'}});
  assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),'http://localhost:8081');
  assert.equal((await fetch(base+'/v1/catalog/search/oats',{headers:{Origin:'http://localhost:8081'}})).status,401);
  assert.equal((await fetch(base+'/v1/catalog/search/oats',{method:'OPTIONS',headers:{Origin:'https://untrusted.example','Access-Control-Request-Method':'GET'}})).status,403);
  const headers={Authorization:'Bearer '+key};
  assert.equal((await fetch(base+'/health',{headers})).status,200);
  assert.equal((await fetch(base+'/v1/catalog/samples',{headers})).status,200);
  assert.equal((await fetch(base+'/v1/uploads',{method:'POST',headers,body:'private'})).status,503);
 }finally{await new Promise<void>(r=>server.close(()=>r()));}
});
