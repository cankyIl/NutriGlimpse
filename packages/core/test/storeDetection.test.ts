import {test} from 'node:test';
import assert from 'node:assert/strict';
import {detectStore,storeDirectorySchema,searchStoreDirectory,fetchStoreDirectory,type StoreDirectory,type MappedStore} from '../src/storeDetection.ts';
const now=Date.parse('2026-10-14T00:00:00Z');
const store:MappedStore={id:'node/1',name:'Test Grocery',address:'100 Test Road',coordinates:{latitude:42,longitude:-71},polygon:null,sourceUrl:'https://www.openstreetmap.org/node/1'};
const directory:StoreDirectory={schemaVersion:1,provider:'OpenStreetMap',license:'ODbL-1.0',attribution:'© OpenStreetMap contributors',region:'Massachusetts',retrievedAt:new Date(now).toISOString(),sourceTimestamp:new Date(now).toISOString(),stores:[store]};
const fix={latitude:42,longitude:-71,accuracy:5,timestamp:now};
test('automatic detection selects the closest store from a usable fresh fix',()=>{
 assert.equal(detectStore(fix,directory,now).selected?.id,'node/1');
 assert.equal(detectStore({...fix,accuracy:250},directory,now).state,'inaccurate');
 assert.equal(detectStore({...fix,timestamp:now-70000},directory,now).state,'inaccurate');
 assert.equal(detectStore({...fix,accuracy:null},directory,now).selected,null);
 assert.equal(detectStore({...fix,latitude:41},directory,now).state,'nearby');
 const adjacent={...store,id:'node/2',coordinates:{latitude:42.0002,longitude:-71},sourceUrl:'https://www.openstreetmap.org/node/2'};
 assert.equal(detectStore(fix,{...directory,stores:[store,adjacent]},now).selected?.id,store.id);
 assert.equal(detectStore(fix,{...directory,retrievedAt:'2020-01-01T00:00:00Z'},now).state,'stale-directory');
 assert.equal(detectStore(fix,{...directory,sourceTimestamp:'2020-01-01T00:00:00Z'},now).state,'stale-directory');
});
test('a likely footprint match accepts an inside edge and still permits manual local search',()=>{
 const polygon=[{latitude:41.999,longitude:-71.001},{latitude:42.001,longitude:-71.001},{latitude:42.001,longitude:-70.999},{latitude:41.999,longitude:-70.999},{latitude:41.999,longitude:-71.001}];
 const data={...directory,stores:[{...store,polygon}]};
 assert.equal(detectStore(fix,data,now).state,'detected');
 assert.equal(detectStore({...fix,latitude:42.00099},data,now).selected?.id,'node/1');
 assert.equal(searchStoreDirectory(data,'test road')[0].id,'node/1');
 const small=polygon.map(p=>({latitude:42+(p.latitude-42)/10,longitude:-71+(p.longitude+71)/10}));
 assert.equal(detectStore({...fix,latitude:42.0002},{...directory,stores:[{...store,polygon:small}]},now).selected?.id,store.id);
 assert.throws(()=>storeDirectorySchema.parse({...directory,stores:[store,store]}));
});
test('directory download never transmits coordinates or credentials and rejects synthetic or unbounded payloads',async()=>{
 let calls=0;const fake:typeof fetch=async(input,init)=>{calls++;assert.equal(String(input),'https://grocery.serveforwad.com/v1/stores/directory');assert.equal(init?.body,undefined);assert.equal(init?.headers,undefined);return new Response(JSON.stringify(directory));};
 assert.equal((await fetchStoreDirectory(new AbortController().signal,fake)).stores.length,1);
 const aborted=new AbortController();aborted.abort();await assert.rejects(fetchStoreDirectory(aborted.signal,fake));assert.equal(calls,1);
 await assert.rejects(fetchStoreDirectory(new AbortController().signal,async()=>new Response(JSON.stringify({...directory,provider:'Invented'}))));
});

test('near-store selection uses a 100 metre cutoff and chooses the closest nearby shop',()=>{
 const at=(metres:number)=>({...fix,latitude:42+metres/111195});
 assert.equal(detectStore(at(99),directory,now).selected?.id,store.id);
 assert.equal(detectStore(at(101),directory,now).state,'nearby');
 assert.equal(detectStore({...fix,accuracy:75},directory,now).selected?.id,store.id);
 assert.equal(detectStore({...fix,accuracy:101},directory,now).state,'inaccurate');
 const closer={...store,id:'node/3',name:'Closer Grocery',coordinates:{latitude:42.0007,longitude:-71},sourceUrl:'https://www.openstreetmap.org/node/3'};
 assert.equal(detectStore(at(90),{...directory,stores:[store,closer]},now).selected?.id,closer.id);
 assert.equal(detectStore({...fix,timestamp:now-61000},directory,now).selected,null);
});
test('large-store footprints and edge drift count as proximity, while a distant store remains unselected',()=>{
 const polygon=[{latitude:41.999,longitude:-71.001},{latitude:42.001,longitude:-71.001},{latitude:42.001,longitude:-70.999},{latitude:41.999,longitude:-70.999},{latitude:41.999,longitude:-71.001}];
 const data={...directory,stores:[{...store,polygon}]};
 assert.equal(detectStore({...fix,latitude:42.00099},data,now).selected?.id,store.id);
 assert.equal(detectStore({...fix,latitude:42.0012},data,now).selected?.id,store.id);
 assert.equal(detectStore({...fix,latitude:42.002},data,now).state,'nearby');
});
