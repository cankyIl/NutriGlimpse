import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {AddressInfo} from 'node:net';
import {PublicDatabase} from '../src/publicDatabase.ts';
import {mapUsda,fetchUsda} from '../src/usda.ts';
import {createAppServer} from '../src/server.ts';
const raw={fdcId:123,description:'Test oats',dataType:'Branded',gtinUpc:'012345678905',foodNutrients:[{nutrient:{id:1093,unitName:'MG'},amount:2},{nutrient:{id:1258,unitName:'G'},amount:0.5}]};
test('USDA exact identity, units, missing and duplicate observations fail safely',()=>{
 const f=mapUsda(raw,'123');assert.equal(f.nutrients.sodiumMg,2);assert.equal(f.nutrients.sugarsG,null);
 assert.throws(()=>mapUsda(raw,'124'));
 assert.equal(mapUsda({...raw,foodNutrients:[{nutrient:{id:1093,unitName:'G'},amount:2}]},'123').nutrients.sodiumMg,null);
 assert.equal(mapUsda({...raw,foodNutrients:[...raw.foodNutrients,raw.foodNutrients[0]]},'123').nutrients.sodiumMg,null);
 assert.throws(()=>mapUsda({...raw,foodNutrients:[{nutrient:{id:1093,unitName:'MG'},amount:-1}]},'123'));
});
test('public DB survives restart, rejects unapproved sources and mixed invalid batches, resists old overwrite',()=>{
 const dir=mkdtempSync(join(tmpdir(),'public-catalog-'));const file=join(dir,'db.sqlite');
 let db=new PublicDatabase(file);
 try{
  const f=mapUsda(raw,'123','2026-10-13T00:00:00.000Z');
  db.importFoods([f]);db.close();db=new PublicDatabase(file);
  assert.equal(db.byBarcode('012345678905')[0].id,'123');
  db.importFoods([{...f,name:'older',retrievedAt:'2020-01-01T00:00:00.000Z'}]);assert.equal(db.byId('usda','123')?.name,'Test oats');
  assert.throws(()=>db.importFoods([{...f,id:'124'},{...f,id:'125',personalProfile:{}}]));
  assert.equal(db.byId('usda','124'),null);
  assert.throws(()=>db.importFoods([{...f,provider:'off',license:'ODbL-1.0',sourceUrl:'https://world.openfoodfacts.org/product/012345678905'}]));
  assert.throws(()=>db.importFoods([{...f,sourceUrl:'https://evil.example/'}]));
  assert.equal(db.byId('usda',"' OR 1=1"),null);
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});
test('HTTP cached catalog lookup retains provenance and never enables personal uploads',async()=>{
 const db=new PublicDatabase(':memory:');db.importFoods([mapUsda(raw,'123')]);
 const server=createAppServer({catalog:db});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 try{
  const base='http://127.0.0.1:'+(server.address() as AddressInfo).port;
  const response=await fetch(base+'/v1/catalog/foods/usda/123');assert.equal(response.status,200);
  const data=await response.json();assert.equal(data.synthetic,false);assert.equal(data.food.license,'CC0-1.0');assert.equal(data.food.certifications,'unverified');
  assert.equal((await fetch(base+'/v1/catalog/foods/usda/999')).status,404);
  assert.equal((await (await fetch(base+'/v1/catalog/search/Test%20oats')).json()).foods.length,1);
  assert.equal((await fetch(base+'/v1/catalog/search/%ZZ')).status,400);
  assert.equal((await fetch(base+'/v1/catalog/search/%00x')).status,400);
  assert.equal((await fetch(base+'/v1/catalog/barcodes/012345678906')).status,400);
  assert.equal((await fetch(base+'/v1/catalog/foods/usda/123',{method:'POST',body:'private'})).status,503);
 }finally{await new Promise<void>(r=>server.close(()=>r()));db.close();}
});
test('USDA provider bounds body, uses secret header, disables redirects and does not retry',async()=>{
 let count=0;
 const fake:typeof fetch=async(url,options)=>{count++;assert.ok(!String(url).includes('SECRET'));assert.equal((options?.headers as Record<string,string>)['X-Api-Key'],'SECRET');assert.equal(options?.redirect,'error');return new Response('x'.repeat(1000001));};
 await assert.rejects(fetchUsda('123','SECRET',fake));assert.equal(count,1);
});

test('catalog search treats SQL/wildcard text literally, reports coverage and bounds stale refresh',()=>{
 const db=new PublicDatabase(':memory:');
 try{
  db.importFoods([mapUsda(raw,'123','2020-01-01T00:00:00.000Z'),mapUsda({...raw,fdcId:124,description:'Raw apples'},'124')]);
  assert.equal(db.search('OATS')[0].id,'123');
  assert.equal(db.search('%_').length,0);
  assert.equal(db.search("' OR 1=1").length,0);
  assert.throws(()=>db.search('x'));assert.throws(()=>db.search('a'.repeat(81)));
  assert.deepEqual(db.staleUsdaIds('2021-01-01T00:00:00.000Z'),['123']);
  assert.throws(()=>db.staleUsdaIds('2021-01-01T00:00:00.000Z',100));
  assert.equal(db.coverage().find(row=>row.provider==='usda')?.records,2);
 }finally{db.close();}
});
