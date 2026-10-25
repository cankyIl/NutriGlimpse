import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {PublicDatabase} from '../src/publicDatabase.ts';
import {fetchOffFood,createOffLookup,offConfigSchema} from '../src/offProvider.ts';
import {normalizeOffFood} from '../src/offNormalization.ts';
import {createAppServer} from '../src/server.ts';
import {exportCatalog} from '../src/catalogPublication.ts';
import {mapUsda} from '../src/usda.ts';
const config=offConfigSchema.parse({enabled:true,contactEmail:'test@example.org',shareAlikeAcceptedAt:new Date().toISOString(),publicCatalogUrl:'https://grocery.serveforwad.com/v1/catalog/export',staging:false});
const code='00012345678905';
const fixture=(barcode=code)=>({status:1,product:{code:barcode,product_name:'Crunchy breakfast cereal',brands:'Test',ingredients_text:'Whole grain oats, salt',categories_tags:['en:breakfast-cereals'],countries_tags:['en:united-states'],nutrition_data_per:'100g',serving_quantity_unit:'g',serving_quantity:40,last_modified_t:Math.floor(Date.now()/1000),data_quality_errors_tags:[],nutriments:{'energy-kcal_100g':380,'saturated-fat_100g':1,fiber_100g:8,sodium_100g:0.2,sugars_100g:5}}});
test('adopted OFF records survive export with source notices and conservative comparison eligibility',()=>{
 const db=new PublicDatabase(':memory:',true);try{
 const f=normalizeOffFood(fixture(),code)!;assert.equal(f.comparisonGroup,'breakfast-cereal');assert.equal(f.nutrients.sodiumMg,200);assert.equal(f.servingGrams,40);db.importFoods([f]);
 assert.equal(db.comparable('breakfast-cereal').length,1);assert.equal(exportCatalog(db).foods[0].license,'ODbL-1.0');
 assert.equal(normalizeOffFood({product:{...fixture().product,categories_tags:[]}},code)?.comparisonGroup,undefined);
 assert.equal(normalizeOffFood({product:{...fixture().product,serving_quantity_unit:'ml'}},code),null);
 assert.throws(()=>db.importFoods([{...f,healthProfile:{}}]));
 }finally{db.close();}
});
test('public download is complete and reusable without tester credentials; other routes remain protected',async()=>{
 const db=new PublicDatabase(':memory:',true);db.importFoods([normalizeOffFood(fixture(),code)]);
 db.importFoods([mapUsda({fdcId:123,description:'Oats',dataType:'Branded',foodNutrients:[]},'123')]);
 const server=createAppServer({catalog:db,authorize:h=>h==='Bearer secret'});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+(server.address() as AddressInfo).port;
 try{
 const response=await fetch(base+'/v1/catalog/export');assert.equal(response.status,200);assert.match(response.headers.get('content-disposition')!,/attachment/);
 const result=await response.json();assert.equal(result.foods.length,2);assert.equal(result.license,'ODbL-1.0');assert.ok(!JSON.stringify(result).includes('Bearer secret'));
 assert.equal((await fetch(base+'/v1/catalog/search/oats')).status,401);
 assert.equal((await fetch(base+'/v1/catalog/export',{method:'POST',body:'private'})).status,401);
 assert.equal((await fetch(base+'/v1/catalog/export?private=x')).status,401);
 const credits=await fetch(base+'/data-sources');assert.match(await credits.text(),/opendatacommons.org/);
 assert.equal((await(await fetch(base+'/v1/catalog/export',{method:'HEAD'})).text()),'');
 }finally{await new Promise<void>(r=>server.close(()=>r()));db.close();}
});
test('provider uses fixed HTTPS host, app contact, all validation fields, strict redirects and no secret',async()=>{
 let calls=0;
 const fake:typeof fetch=async(url,options)=>{calls++;assert.match(String(url),/^https:\/\/world.openfoodfacts.org\/api\/v3.4\/product\/00012345678905.json/);assert.ok(String(url).includes('countries_tags'));assert.equal(options?.redirect,'error');assert.equal((options?.headers as Record<string,string>)['User-Agent'],'CongressGroceryBeta/0.1 (test@example.org)');assert.equal((options?.headers as Record<string,string>).Authorization,undefined);return new Response(JSON.stringify(fixture()));};
 assert.equal((await fetchOffFood(code,config,fake))?.barcode,code);assert.equal(calls,1);
 await assert.rejects(fetchOffFood('invalid',config,fake));assert.equal(calls,1);
 await assert.rejects(fetchOffFood(code,config,async()=>new Response('x'.repeat(256001))));
 await assert.rejects(fetchOffFood(code,config,async()=>new Response(JSON.stringify(fixture('00000000000000')))));
 assert.equal(await fetchOffFood(code,config,async()=>new Response('{}',{status:404})),null);
 assert.equal(await fetchOffFood(code,config,async()=>new Response(JSON.stringify({product:{code}}))),null);
 assert.equal(normalizeOffFood({product:{...fixture().product,serving_quantity:'40'}},code)?.servingGrams,40);
});
test('lookup caches successful data, respects fresh USDA identity and pauses after upstream failure',async()=>{
 const db=new PublicDatabase(':memory:',true);let time=1000,calls=0;
 const lookup=createOffLookup(db,config,async()=>{calls++;return new Response(JSON.stringify(fixture()));},()=>time);
 try{await lookup(code);await lookup(code);assert.equal(calls,1);assert.equal(db.byBarcode(code).length,1);
 db.importFoods([mapUsda({fdcId:777,description:'USDA identity',dataType:'Branded',gtinUpc:'00045914791828',foodNutrients:[]},'777')]);time+=6000;await lookup('00045914791828');assert.equal(calls,1);
 const badDb=new PublicDatabase(':memory:',true);const bad=createOffLookup(badDb,config,async()=>{calls++;return new Response('',{status:429});},()=>time);
 const other='00045914791828';await bad(other);time+=10000;await bad(other);assert.equal(calls,2);time+=60000;await bad(other);assert.equal(calls,3);badDb.close();
 }finally{db.close();}
});
test('upstream misses are bounded/cached; concurrent distinct requests cannot bypass pacing',async()=>{
 const db=new PublicDatabase(':memory:',true);let calls=0,time=1000;
 const lookup=createOffLookup(db,config,async()=>{calls++;return new Response('{}',{status:404});},()=>time);
 try{await Promise.all([lookup(code),lookup('00045914791828')]);assert.equal(calls,1);time+=6000;await lookup(code);assert.equal(calls,1);await lookup('00045914791828');assert.equal(calls,2);}finally{db.close();}
});
test('staging fixtures cannot enter production catalog and injected contact headers are rejected',async()=>{
 assert.throws(()=>offConfigSchema.parse({...config,contactEmail:'x@example.org\r\nAuthorization: bad'}));
 const db=new PublicDatabase(':memory:',true);
 try{const lookup=createOffLookup(db,{...config,staging:true},async(_url,options)=>{assert.ok((options?.headers as Record<string,string>).Authorization.startsWith('Basic '));return new Response(JSON.stringify(fixture()));});await lookup(code);assert.equal(db.exportFoods().length,0);}finally{db.close();}
});
test('authenticated barcode route imports validated provider data and failure preserves cached fallback',async()=>{
 const db=new PublicDatabase(':memory:',true);let calls=0;
 const server=createAppServer({catalog:db,authorize:h=>h==='Bearer secret',offLookup:createOffLookup(db,config,async()=>{calls++;return new Response(JSON.stringify(fixture()));})});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+(server.address() as AddressInfo).port+'/v1/catalog/barcodes/'+code;
 try{assert.equal((await fetch(url)).status,401);assert.equal(calls,0);const data=await(await fetch(url,{headers:{Authorization:'Bearer secret'}})).json();assert.equal(data.foods[0].provider,'off');assert.equal(data.foods[0].stale,false);assert.equal(data.attribution.license,'ODbL-1.0');}finally{await new Promise<void>(r=>server.close(()=>r()));db.close();}
});

test('provider reservation and cooldown survive new connections to the same database',async()=>{
 const {mkdtempSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const dir=mkdtempSync(join(tmpdir(),'off-limit-'));const a=new PublicDatabase(join(dir,'db'));const b=new PublicDatabase(join(dir,'db'));
 try{assert.equal(a.reserveOffRequest(10000),true);assert.equal(b.reserveOffRequest(10001),false);b.coolOffRequests(12000);assert.equal(a.reserveOffRequest(20000),false);assert.equal(a.reserveOffRequest(72000),true);assert.equal(b.reserveOffRequest(72000),false);}finally{a.close();b.close();rmSync(dir,{recursive:true,force:true});}
});

test('v2 lookup enriches missing label evidence once without discarding cached USDA facts or bypassing pacing',async()=>{
 const db=new PublicDatabase(':memory:',true);let time=1000,calls=0;
 db.importFoods([mapUsda({fdcId:777,description:'USDA identity',dataType:'Branded',gtinUpc:code,foodNutrients:[]},'777')]);
 const lookup=createOffLookup(db,config,async()=>{calls++;return new Response(JSON.stringify({...fixture(),product:{...fixture().product,labels_tags:['en:gluten-free']}}));},()=>time);
 try{
  await lookup(code);assert.equal(calls,0);await lookup(code,true);assert.equal(calls,1);
  assert.equal(db.byBarcode(code).length,2);assert.equal(db.byId('off',code)?.reportedLabel?.verification,'unverified');
  time+=6000;await lookup(code,true);assert.equal(calls,1);
 }finally{db.close();}
});
