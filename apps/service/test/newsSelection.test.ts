import {test} from 'node:test';
import assert from 'node:assert/strict';
import {request as httpRequest} from 'node:http';
import {createAppServer} from '../src/server.ts';
import {article,pool} from '../../../packages/core/test/fixtures/news.ts';
import {prepareNewsRequest} from '../../../packages/core/src/newsSelection.ts';
import {newsDay} from '../../../packages/core/src/newsPersonalization.ts';
function currentPool(){
 const time=Date.now();return{...pool([article(0),article(1,{tags:['hypertension']}),article(2,{tags:['diabetes']})]),generatedAt:new Date(time).toISOString(),editionDate:newsDay(time),
 articles:[article(0),article(1,{tags:['hypertension']}),article(2,{tags:['diabetes']})].map(a=>({...a,publishedAt:new Date(time-3600000).toISOString()}))};
}
test('backend returns separate personalized/general news, never a shared personal cache or profile echo',async()=>{
 let reads=0;const sharedPool=currentPool();
 const server=createAppServer({newsPool:()=>{reads++;return{edition:sharedPool,etag:'"public"'};},catalogBurst:100});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+(server.address() as {port:number}).port+'/v2/news/selection';
 const post=(value:unknown)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
 try{
  const [diabetic,pressure,general]=await Promise.all([post(prepareNewsRequest({primary:'diabetes'})),post(prepareNewsRequest({primary:'hypertension'})),post({mode:'general'})]);
  for(const response of [diabetic,pressure,general]){assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('etag'),null);}
  const d=await diabetic.json(),h=await pressure.json(),g=await general.json();
  assert.equal(d.articles[0].id,article(2).id);assert.equal(h.articles[0].id,article(1).id);
  assert.equal(g.personalized,false);assert.deepEqual(d.generalArticles,g.articles);
  assert.ok(!('preferences' in d));assert.ok(!('profile' in d));assert.equal(reads,3);
  assert.equal((await fetch(url)).status,405);
  assert.equal((await fetch(url,{method:'POST',body:'{}'})).status,415);
  assert.equal((await post({mode:'personalized',preferences:{conditions:['diabetes'],name:'private'}})).status,400);
  assert.equal((await post({mode:'general',location:{lat:42}})).status,400);
  assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(2049)})).status,413);
  assert.equal(reads,3,'invalid requests never read or rank the pool');
  const chunked=await new Promise<number>((resolve,reject)=>{
   const r=httpRequest(url,{method:'POST',headers:{'Content-Type':'application/json','Transfer-Encoding':'chunked'}},response=>{response.resume();response.on('end',()=>resolve(response.statusCode!));});
   r.on('error',reject);r.write('x'.repeat(2049));r.end();
  });assert.equal(chunked,413);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
test('news service fails safely when collection is unavailable and rate-limits requests',async()=>{
 const server=createAppServer({catalogBurst:1,refillPerSecond:0.01});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url='http://127.0.0.1:'+(server.address() as {port:number}).port+'/v2/news/selection';
 const options={method:'POST',headers:{'Content-Type':'application/json'},body:'{"mode":"general"}'};
 try{assert.equal((await fetch(url,options)).status,503);assert.equal((await fetch(url,options)).status,429);}
 finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
