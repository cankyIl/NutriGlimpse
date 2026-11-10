import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {spawnSync} from 'node:child_process';
import {createAppServer} from '../src/server.ts';
test('public support/privacy stay accessible without a key, with no reflection or scripts',async()=>{
 const server=createAppServer({authorize:()=>false,accessMode:'open-beta'});server.listen(0,'127.0.0.1');await once(server,'listening');
 const address=server.address();assert.ok(address&&typeof address==='object');const base='http://127.0.0.1:'+address.port;
 try{
  for(const route of ['/support','/privacy','/support/','/privacy?input=%3Cscript%3E']){
   const res=await fetch(base+route);assert.equal(res.status,200);const text=await res.text();
   assert.match(text,/help@serveforward.us/);assert.match(text,/<html lang="en">/);assert.doesNotMatch(text,/<script|input=%3C|api[_-]?key=/i);
   assert.equal(res.headers.get('set-cookie'),null);assert.equal(res.headers.get('referrer-policy'),'no-referrer');
   assert.match(res.headers.get('content-security-policy')??'',/style-src 'sha256-/);
  }
  const head=await fetch(base+'/support',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  const post=await fetch(base+'/privacy',{method:'POST',body:'private'});assert.equal(post.status,405);
  assert.equal((await fetch(base+'/support/unknown')).status,404);
  assert.equal((await fetch(base+'/health')).status,200);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

test('production privacy describes actual journal disablement and separate provider retention',()=>{
 const script=`
 import {createServer} from 'node:http';
 import {publicSupportRoute} from './apps/service/src/publicSupport.ts';
 const server=createServer((req,res)=>{if(!publicSupportRoute(req,res)){res.writeHead(404);res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {const res=await fetch('http://127.0.0.1:'+server.address().port+'/privacy');console.log(await res.text());}
 finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 `;
 const result=spawnSync(process.execPath,['--experimental-strip-types','--input-type=module','-e',script],{cwd:new URL('../../../',import.meta.url),env:{...process.env,GROCERY_BUILD_STAGE:'production'},encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);
 assert.match(result.stdout,/production backend does not create beta answer or processing-decision journals/);
 assert.match(result.stdout,/Google project logs are configured to expire after seven days/);
 assert.match(result.stdout,/separate development dataset contains only fictional\/public test data/);
 assert.doesNotMatch(result.stdout,/planned production|These journals are disabled when the production/);
});
