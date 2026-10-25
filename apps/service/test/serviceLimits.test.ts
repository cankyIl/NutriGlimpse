import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { connect, type AddressInfo } from 'node:net';
import { createAppServer } from '../src/server.ts';
async function withService(work: (port: number) => Promise<void>, options = {}) {
  const server=createAppServer(options);
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  try { await work((server.address() as AddressInfo).port); }
  finally { server.closeAllConnections(); await new Promise<void>(resolve=>server.close(()=>resolve())); }
}
test('catalog rate limit is bounded and refills without identifying users or trusting forwarded headers', async () => {
  let time=0;
  await withService(async port => {
    const url=`http://127.0.0.1:${port}/v1/catalog/samples`;
    assert.equal((await fetch(url)).status,200);
    assert.equal((await fetch(url,{headers:{'X-Forwarded-For':'192.0.2.10'}})).status,429);
    assert.equal((await fetch(`http://127.0.0.1:${port}/health`)).status,200);
    time=1000; assert.equal((await fetch(url)).status,200);
  }, {catalogBurst:1,refillPerSecond:1,now:()=>time});
});
test('query text and unsupported methods fail without reflecting content', async () => {
  await withService(async port => {
    const base=`http://127.0.0.1:${port}`;
    const response=await fetch(base+'/health?name=SYNTHETIC-PRIVATE');
    assert.equal(response.status,400); assert.ok(!(await response.text()).includes('SYNTHETIC-PRIVATE'));
    assert.equal((await fetch(base+'/health',{method:'PUT',body:'private'})).status,405);
    const head=await fetch(base+'/health',{method:'HEAD'});
    assert.equal(head.status,200); assert.equal(await head.text(),'');
  });
});
test('GET bodies and malformed raw requests are rejected while service stays healthy', async () => {
  await withService(async port => {
    const status=await new Promise<number>(resolve=>{
      const req=request({host:'127.0.0.1',port,path:'/health',method:'GET',headers:{'Content-Length':'5'}},res=>{res.resume();resolve(res.statusCode!);});
      req.end('hello');
    });
    assert.equal(status,400);
    const result=await new Promise<string>((resolve,reject)=>{
      const socket=connect(port,'127.0.0.1');let response='';
      socket.on('connect',()=>socket.write('INVALID HTTP\r\n\r\n'));
      socket.on('data',data=>response+=data);socket.on('end',()=>resolve(response));socket.on('error',reject);
    });
    assert.match(result,/400 Bad Request/);
    assert.equal((await fetch(`http://127.0.0.1:${port}/health`)).status,200);
  });
});
test('invalid limiter configuration is rejected before opening sockets', () => {
  assert.throws(()=>createAppServer({catalogBurst:0}));
  assert.throws(()=>createAppServer({refillPerSecond:Infinity}));
});
