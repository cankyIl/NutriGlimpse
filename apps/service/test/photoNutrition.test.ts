import {test} from 'node:test';
import assert from 'node:assert/strict';
import {findUsdaPhotoNutrition} from '../src/photoNutrition.ts';
const identity={status:'identified' as const,brand:'Test Brand',name:'Whole Oat Cereal',variant:null,size:null,visibleText:[]};
const row={fdcId:123,description:'Whole Oat Cereal',brandName:'Test Brand',dataType:'Branded',marketCountry:'United States',publicationDate:'2026-10-01',servingSize:40,servingSizeUnit:'g',ingredients:'Oats',gtinUpc:'00012345678905',brandedFoodCategory:'Breakfast Cereals',foodNutrients:[{nutrient:{id:1093,unitName:'MG'},amount:240},{nutrient:{id:1079,unitName:'G'},amount:12}]};
test('photo USDA lookup sends name only, fetches details for matched US branded IDs and retains missing values',async()=>{
 let calls=0;
 const result=await findUsdaPhotoNutrition(identity,'fake-test-key',new AbortController().signal,async(url,init)=>{
  calls++;assert.equal(init?.redirect,'error');assert.equal((init?.headers as Record<string,string>)['X-Api-Key'],'fake-test-key');assert.ok(!String(url).includes('fake-test-key'));const body=JSON.parse(String(init?.body));assert.ok(!('image' in body));
  if(calls===1){assert.equal(String(url),'https://api.nal.usda.gov/fdc/v1/foods/search');assert.deepEqual(body.dataType,['Branded']);return Response.json({foods:[row,{...row,fdcId:456,brandName:'Other Brand'},{...row,fdcId:789,marketCountry:'Canada'}]});}
  assert.equal(String(url),'https://api.nal.usda.gov/fdc/v1/foods');assert.deepEqual(body.fdcIds,[123]);return Response.json([row]);
 });assert.equal(calls,2);assert.equal(result.length,1);assert.equal(result[0].nutrients.sodiumMg,240);assert.equal(result[0].nutrients.sugarsG,null);assert.equal(result[0].servingGrams,40);assert.equal(result[0].provider,'usda');
});
test('USDA wrong brand, changed identity, non-US, discontinued or unsolicited detail IDs never become a match',async()=>{
 let calls=0;assert.deepEqual(await findUsdaPhotoNutrition(identity,'fake',new AbortController().signal,async()=>{calls++;return Response.json({foods:[{...row,brandName:'Other'}]});}),[]);assert.equal(calls,1);
 for(const bad of [{...row,fdcId:124},{...row,brandName:'Other'},{...row,marketCountry:'Canada'},{...row,discontinuedDate:'2025-01-01'},{...row,description:'Chocolate Whole Oat Cereal'}]){
  let n=0;const result=await findUsdaPhotoNutrition(identity,'fake',new AbortController().signal,async()=>Response.json(++n===1?{foods:[row]}:[bad]));assert.deepEqual(result,[]);
 }
});
test('USDA cancellation, unavailable source and response limit do not retry or invent nutrition',async()=>{
 let calls=0;const cancelled=new AbortController();cancelled.abort();await assert.rejects(findUsdaPhotoNutrition(identity,'fake',cancelled.signal,async()=>{calls++;return Response.json({foods:[]});}));assert.equal(calls,0);
 await assert.rejects(findUsdaPhotoNutrition(identity,'fake',new AbortController().signal,async()=>{calls++;return new Response('private upstream error',{status:429});}),/unavailable/);assert.equal(calls,1);
 await assert.rejects(findUsdaPhotoNutrition(identity,'fake',new AbortController().signal,async()=>new Response('x'.repeat(2000001))),/limit/);
});
