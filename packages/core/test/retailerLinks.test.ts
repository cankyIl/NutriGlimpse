import {test} from 'node:test';
import assert from 'node:assert/strict';
import {retailerProductLink,retailerFromName,retailerSites} from '../src/retailerLinks.ts';
import {nearbyMappedStores,searchStoreDirectory,type StoreDirectory} from '../src/storeDetection.ts';
test('retailer links contain public product words only and cannot change origin',()=>{
 for(const site of retailerSites){
  const link=retailerProductLink(site.id,{name:'Cereal & redirect=https://evil.test/#? \n test',brand:'Fixture'});
  const url=new URL(link.url);
  assert.equal(url.origin,new URL(site.url).origin);
  assert.equal(link.availability,'unknown');
  assert.equal(url.hash,'');
  assert.ok(!link.url.includes('\n'));
  assert.ok(!link.url.includes('latitude'));
  assert.deepEqual([...url.searchParams.keys()],site.parameter?[site.parameter]:[]);
 }
 assert.equal(retailerFromName('Market 32 #99'),'price-chopper');
 assert.equal(retailerFromName('Whole Foods Market Shrewsbury'),'whole-foods');
 assert.equal(retailerFromName('Trader Joe’s'),'trader-joes');
 assert.equal(retailerFromName('My Walmartish Shop'),null);
 assert.equal(retailerFromName(null),null);
});
const directory:StoreDirectory={schemaVersion:1,provider:'OpenStreetMap',license:'ODbL-1.0',attribution:'© OpenStreetMap contributors',region:'Massachusetts',retrievedAt:'2026-10-14T00:00:00Z',sourceTimestamp:'2026-10-14T00:00:00Z',stores:[0,.01,.2].map((offset,i)=>({id:('node/'+(i+1)),name:i===2?'Wegmans':'Market 32',address:'Fictional Town',coordinates:{latitude:42+offset,longitude:-71},polygon:null,sourceUrl:'https://www.openstreetmap.org/node/'+(i+1)}))};
test('local radius expands explicitly and results stay distance-ordered without changing directory',()=>{
 const before=JSON.stringify(directory),origin={latitude:42,longitude:-71};
 const near=nearbyMappedStores(directory,origin,10);
 assert.equal(near.length,2);assert.equal(near[0].distanceMiles,0);
 assert.equal(nearbyMappedStores(directory,origin,25).length,3);
 assert.equal(nearbyMappedStores(directory,origin,25,'Wegmans Town').length,1);
 assert.equal(searchStoreDirectory(directory,'Wegmans Town').length,1);
 assert.throws(()=>nearbyMappedStores(directory,origin,101));
 assert.throws(()=>nearbyMappedStores(directory,{latitude:91,longitude:0},10));
 assert.equal(JSON.stringify(directory),before);
});
