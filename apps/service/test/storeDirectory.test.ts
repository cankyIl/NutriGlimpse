import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {createAppServer} from '../src/server.ts';
import type {StoreDirectory} from '../../../packages/core/src/storeDetection.ts';
test('public store directory exposes only shared source data and keeps every other beta endpoint authenticated',async()=>{
 const directory:StoreDirectory={schemaVersion:1,provider:'OpenStreetMap',license:'ODbL-1.0',attribution:'© OpenStreetMap contributors',region:'Massachusetts',retrievedAt:new Date().toISOString(),sourceTimestamp:new Date().toISOString(),stores:[]};
 const server=createAppServer({directory,authorize:()=>false});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 try{
  const base='http://127.0.0.1:'+(server.address() as AddressInfo).port;
  assert.equal((await fetch(base+'/v1/stores/directory')).status,200);
  assert.equal((await fetch(base+'/v1/stores/directory?lat=42')).status,401);
  assert.equal((await fetch(base+'/v1/catalog/coverage')).status,401);
  assert.equal((await fetch(base+'/v1/stores/directory',{method:'POST',body:'coordinates'})).status,401);
 }finally{await new Promise<void>(r=>server.close(()=>r()));}
});
