import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mergeFoodCache,parseFoodCache,foodIsStale,searchCatalog,betaCatalogUrl} from '../src/catalogClient.ts';
import {type PublicFood} from '../src/publicFood.ts';
const food:PublicFood={provider:'usda',id:'123',barcode:null,name:'Oats',brand:null,ingredients:null,dataType:'Foundation',basis:'100g',nutrients:{caloriesKcal:null,saturatedFatG:1,fiberG:10,sodiumMg:0,sugarsG:null},sourceUrl:'https://fdc.nal.usda.gov/food-details/123/nutrients',retrievedAt:'2026-10-13T00:00:00.000Z',sourceDate:null,license:'CC0-1.0',certifications:'unverified',availability:'unverified'};
test('offline food cache bounds records and refuses older replacement without inventing missing values',()=>{
 const prior=Array.from({length:100},(_,i)=>({...food,id:String(i)}));
 const merged=mergeFoodCache(prior,food);assert.equal(merged.length,100);assert.equal(merged[0].id,'123');
 assert.equal(merged[0].nutrients.caloriesKcal,null);
 const old={...food,name:'Old',retrievedAt:'2020-01-01T00:00:00.000Z'};
 assert.equal(mergeFoodCache([food],old)[0].name,'Oats');
 assert.throws(()=>parseFoodCache([...prior,food]));assert.throws(()=>mergeFoodCache([], {...food,basis:'serving'}));
 assert.equal(foodIsStale(food,Date.parse('2026-10-21T00:00:00Z')),true);
 assert.equal(foodIsStale(food,Date.parse('2026-10-14T00:00:00Z')),false);
});
test('catalog client sends only explicit query without credentials to fixed HTTPS host, validates responses',async()=>{
 let calls=0;
 const fake:typeof fetch=async(input,init)=>{
  calls++;assert.equal(String(input),betaCatalogUrl+'/v2/catalog/search/oats');assert.equal(new Headers(init?.headers).get('authorization'),null);
  assert.equal(init?.body,undefined);assert.equal(init?.redirect,'error');
  return new Response(JSON.stringify({schemaVersion:2,synthetic:false,foods:[{...food,stale:false}],coverage:'limited'}));
 };
 const result=await searchCatalog('oats','name',new AbortController().signal,fake);
 assert.deepEqual(result,[food]);
 await assert.rejects(searchCatalog('x','name',new AbortController().signal,fake));
 await assert.rejects(searchCatalog('bad','barcode',new AbortController().signal,fake));assert.equal(calls,1);
 await assert.rejects(searchCatalog('oats','name',new AbortController().signal,async()=>new Response('{}',{status:401})));
 await assert.rejects(searchCatalog('oats','name',new AbortController().signal,async()=>new Response(JSON.stringify({schemaVersion:1,synthetic:true,foods:[]}))));
});
