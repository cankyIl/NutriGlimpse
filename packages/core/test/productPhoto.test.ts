import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {productPhotoRequestSchema,photoIdentitySchema,matchPhotoIdentity,productPhotoResponseSchema,PRODUCT_PHOTO_CONSENT} from '../src/productPhoto.ts';
import {recognizeProductPhoto} from '../src/productPhotoClient.ts';
import {productTakeaway} from '../src/productTakeaway.ts';
import type {PublicFood} from '../src/publicFood.ts';
const now=Date.parse('2026-10-16T12:00:00Z');
const base:PublicFood={provider:'usda',id:'1',barcode:'00012345678905',name:'Original Oat Cereal',brand:'Test',ingredients:'Whole oats',dataType:'Branded',basis:'100g',comparisonGroup:'breakfast-cereal',categoryEvidence:'category-rules-v4',servingGrams:40,nutrients:{caloriesKcal:350,saturatedFatG:0,fiberG:16,sodiumMg:100,sugarsG:3},sourceUrl:'https://fdc.nal.usda.gov/food-details/1/nutrients',retrievedAt:new Date(now).toISOString(),sourceDate:'10/01/2026',license:'CC0-1.0',certifications:'unverified',availability:'unverified'};
const identity={status:'identified' as const,brand:'Test',name:'Oat Cereal',variant:'Original',size:'12 oz',visibleText:['Test','Oat Cereal']};
test('source-reported parent brand resolves consumer cereal names without borrowing competing formulations',()=>{
 const cereal={...base,brand:'Cheerios',brandOwner:'General Mills, Inc.',name:'Cheerios Breakfast Cereal'};
 const photo={...identity,brand:'General Mills',name:'Cheerios',variant:'Original'};
 assert.equal(matchPhotoIdentity(photo,[cereal]).length,1);
 assert.equal(matchPhotoIdentity(photo,[{...cereal,brandOwner:'Other'}]).length,0);
 for(const flavor of ['Honey Nut','Strawberry Vanilla','Confetti','Birthday Cake','Protein Berry','Granola Apple Cinnamon','Multi Grain'])
  assert.equal(matchPhotoIdentity(photo,[{...cereal,name:flavor+' Cheerios Breakfast Cereal'}]).length,0);
});
test('identity matching never substitutes competing brand or visible flavor and requires explicit recognition',()=>{
 assert.equal(matchPhotoIdentity(identity,[base]).length,1);assert.equal(matchPhotoIdentity({...identity,status:'uncertain'},[base]).length,1);
 for(const food of [{...base,brand:'Other'}, {...base,name:'Honey Oat Cereal'}, {...base,name:'Almond Oat Cereal'}])assert.deepEqual(matchPhotoIdentity(identity,[food]),[]);
 for(const raw of [{...identity,brand:null},{...identity,status:'multiple-products'},{...identity,status:'no-product'}])assert.deepEqual(matchPhotoIdentity(raw,[base]),[]);
 assert.throws(()=>photoIdentitySchema.parse({...identity,nutrients:{sodiumMg:0}}));
 assert.throws(()=>photoIdentitySchema.parse({...identity,status:'identified',name:null}));
 assert.equal(matchPhotoIdentity({...identity,variant:'Honey'},[base]).length,0);
 assert.equal(matchPhotoIdentity(identity,Array(10001).fill(base)).length,0);
});
test('real catalog recognizes consumer brand in product name when source lists the parent manufacturer',()=>{
 const foods=JSON.parse(readFileSync('apps/mobile/assets/catalog/public-foods.json','utf8')).foods as PublicFood[];
 for(const raw of [
 {...identity,brand:'Cheerios',name:'Multi Grain Cheerios',variant:null},
 {...identity,brand:'Quaker',name:'Old Fashioned Oats',variant:null},
 {...identity,brand:'Quaker',name:'Instant Oatmeal',variant:'Maple Brown Sugar'},
 ])assert.ok(matchPhotoIdentity(raw,foods).length>0,JSON.stringify(raw));
});
test('short takeaways use serving-based label bands, rank warnings first, and never turn missing data into approval',()=>{
 const good=productTakeaway(base,[],now);assert.equal(good.title,'Good signs on the label');assert.equal(good.points.length,3);assert.match(good.portion,/40 g/);
 const high=productTakeaway({...base,nutrients:{...base.nutrients,sodiumMg:2000,saturatedFatG:15}},[],now);assert.equal(high.title,'Consider a different option');assert.match(high.points[0],/High sodium: 800 mg/);assert.equal(high.metric,'sodiumMg');assert.ok(high.points.length<=3);
 assert.equal(productTakeaway({...base,servingGrams:null},[],now).tone,'unknown');
 assert.equal(productTakeaway({...base,sourceDate:'2020-01-01'},[],now).tone,'unknown');
 for(const field of Object.keys(base.nutrients))assert.equal(productTakeaway({...base,nutrients:{...base.nutrients,[field]:null}},[],now).tone,'unknown');
 for(const restriction of ['glutenFree','dairyFree','peanutAllergy'])assert.equal(productTakeaway(base,[restriction],now).title,'Dietary suitability unverified');
 const sugar=productTakeaway({...base,nutrients:{...base.nutrients,sugarsG:50}},[],now);assert.ok(sugar.points.every(p=>!p.includes('Low sugar')));
 const trans=productTakeaway({...base,additionalNutrients:{transFatG:2,potassiumMg:null,magnesiumMg:null,calciumMg:null}},[],now);assert.equal(trans.tone,'caution');
});
test('client sends one consented image without profile, handles cancellation, validates response and does not retry errors',async()=>{
 let calls=0;const signal=new AbortController().signal,image='aGVsbG8=';
 const response={schemaVersion:1,model:'gpt-6-luna',identity,foods:[]};
 const fake:typeof fetch=async(url,init)=>{calls++;assert.equal(String(url),'https://grocery.serveforwad.com/v1/photos/recognize');assert.equal(init?.redirect,'error');assert.deepEqual(JSON.parse(String(init?.body)),{consentVersion:PRODUCT_PHOTO_CONSENT,imageBase64:image});assert.equal(new Headers(init?.headers).get('authorization'),null);return new Response(JSON.stringify(response));};
 assert.deepEqual(await recognizeProductPhoto(image,signal,fake),response);assert.equal(calls,1);
 await assert.rejects(recognizeProductPhoto(image,signal,async()=>{calls++;return new Response(JSON.stringify({code:'PHOTO_BUDGET_UNAVAILABLE'}),{status:503});}),/allowance/);assert.equal(calls,2);
 const cancel=new AbortController();cancel.abort();await assert.rejects(recognizeProductPhoto(image,cancel.signal,fake));assert.equal(calls,2);
 assert.throws(()=>productPhotoResponseSchema.parse({...response,identity:{...identity,nutrition:'invented'}}));
 await assert.rejects(recognizeProductPhoto(image,signal,async()=>new Response('x'.repeat(250001))));
});

test('full-size native base64 validates without recursive-regex overflow',()=>{assert.doesNotThrow(()=>productPhotoRequestSchema.parse({consentVersion:PRODUCT_PHOTO_CONSENT,imageBase64:Buffer.alloc(1024*1024).toString('base64')}));});

test('printed package size prefers the matching listing and inferred flavor cannot disappear',()=>{
 const raw={...identity,name:'Old Fashioned Oats',variant:'Old fashioned',size:'42 oz'};
 const make=(id:string,name:string)=>({...base,id,name});
 const matches=matchPhotoIdentity(raw,[make('1','Old Fashioned Oats'),make('2','Old Fashioned Oats 18 Oz'),make('3','Old Fashioned Oats 42 Oz')]);
 assert.equal(matches[0].id,'3');assert.deepEqual(matchPhotoIdentity({...identity,name:'Honey Oat Cereal',variant:null},[base]),[]);
 assert.deepEqual(matchPhotoIdentity(raw,[make('4','Old Fashioned Grits')]),[]);
});
