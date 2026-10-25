import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {mapUsda} from '../src/usda.ts';
import {normalizeOffFood} from '../src/offNormalization.ts';
import {createAssessmentNutritionResolver} from '../src/photoNutrition.ts';
import {PublicDatabase} from '../src/publicDatabase.ts';
import {exportCatalog} from '../src/catalogPublication.ts';
import {labelRating} from '../../../packages/core/src/photoAssessment.ts';
const stamp=new Date().toISOString(),sourceDate=stamp.slice(0,10);
const row={fdcId:123,description:'Whole Oat Cereal',brandName:'Test Brand',dataType:'Branded',marketCountry:'United States',publicationDate:sourceDate,servingSize:40,servingSizeUnit:'g',ingredients:'Oats',gtinUpc:'00012345678905',brandedFoodCategory:'Breakfast Cereals',
 foodNutrients:[[1008,'KCAL',350],[1258,'G',1],[1079,'G',15],[1093,'MG',100],[2000,'G',5],[1257,'G',0],[1003,'G',12],[1005,'G',70],[1235,'G',0],[1089,'MG',4],[1114,'UG',2],[1162,'MG',1]].map(([id,unitName,amount])=>({nutrient:{id,unitName},amount}))};
const identity={status:'identified' as const,brand:'Test Brand',name:'Whole Oat Cereal',variant:null,size:null,visibleText:[]};
const off=()=>({product:{code:'00012345678905',product_name:'Whole Oat Cereal',brands:'Test Brand',ingredients_text:'Oats',countries_tags:['en:united-states'],categories_tags:['en:breakfast-cereals'],nutrition_data_per:'100g',serving_quantity:40,serving_quantity_unit:'g',last_modified_t:Math.floor(Date.parse(stamp)/1000),data_quality_errors_tags:[],nutriments:{'energy-kcal_100g':350,'saturated-fat_100g':1,fiber_100g:15,sodium_100g:0.1,sugars_100g:5,proteins_100g:12,carbohydrates_100g:70,'added-sugars_100g':0,'trans-fat_100g':0,iron_100g:0.004,'vitamin-d_100g':0.000002,'vitamin-c_100g':0.001},image_front_small_url:'https://images.openfoodfacts.org/images/products/000/123/456/78905/front_en.1.200.jpg'}});
test('USDA and OFF map protein/carbohydrate/added-sugar/mineral units without inventing missing values',()=>{
 const a=mapUsda(row,'123',stamp),b=normalizeOffFood(off(),'00012345678905',stamp)!;
 assert.deepEqual(a.nutritionExtras,{proteinG:12,carbohydrateG:70,addedSugarsG:0,ironMg:4,vitaminDMcg:2,vitaminCMg:1});
 assert.deepEqual(b.nutritionExtras,a.nutritionExtras);assert.equal(labelRating(a).rating,'very_healthy');assert.equal(labelRating(b).rating,'very_healthy');
 assert.equal(mapUsda({...row,foodNutrients:[]},'123',stamp).nutritionExtras?.proteinG,null);
 assert.equal(mapUsda({...row,foodNutrients:[...row.foodNutrients,{nutrient:{id:1003,unitName:'G'},amount:12}]},'123',stamp).nutritionExtras?.proteinG,null);
 assert.equal(mapUsda({...row,foodNutrients:[{nutrient:{id:1003,unitName:'MG'},amount:12}]},'123',stamp).nutritionExtras?.proteinG,null);
});
test('images must be source-reported OFF thumbnails; arbitrary URLs and injection are discarded',()=>{
 assert.ok(normalizeOffFood(off(),'00012345678905',stamp)?.image);
 for(const url of ['http://images.openfoodfacts.org/images/products/123/front_en.1.200.jpg','https://evil.test/image.jpg','https://images.openfoodfacts.org.evil.test/images/products/123/front_en.1.200.jpg','https://images.openfoodfacts.org/images/products/123/front_en.1.200.jpg?tracking=abc','data:image/jpeg;base64,aGVsbG8=']){
  const raw=off();raw.product.image_front_small_url=url;assert.equal(normalizeOffFood(raw,'00012345678905',stamp)?.image,undefined);
 }
});
test('v1/v2 exports retain their schemas; v3 exposes new sourced nutrition/image evidence',()=>{
 const db=new PublicDatabase(':memory:',true);
 try{
  db.importFoods([normalizeOffFood(off(),'00012345678905',stamp)]);
  for(const version of [1,2]){const food=exportCatalog(db,version).foods[0];assert.ok(!('nutritionExtras'in food));assert.ok(!('image'in food));}
  assert.ok('nutritionExtras'in exportCatalog(db,3).foods[0]);assert.ok('image'in exportCatalog(db,3).foods[0]);
 }finally{db.close();}
});
async function fixture(action:(root:string,db:PublicDatabase)=>Promise<void>){
 const root=mkdtempSync(join(tmpdir(),'assessment-nutrition-')),db=new PublicDatabase(':memory:',true);
 try{mkdirSync(join(root,'.tools/usda'),{recursive:true});writeFileSync(join(root,'.tools/usda/api-key'),'fictional-test-key-1234567890',{mode:0o600});await action(root,db);}
 finally{db.close();rmSync(root,{recursive:true,force:true});}
}
test('complete current catalog records avoid external calls, incomplete records refresh by exact ID',async()=>{
 await fixture(async(root,db)=>{
  const complete=mapUsda(row,'123',stamp);db.importFoods([complete]);
  let calls=0;const fetcher:typeof fetch=async(url,init)=>{calls++;assert.match(String(url),/\/food\/123$/);assert.ok(!String(url).includes('fictional-test-key'));assert.equal(init?.redirect,'error');return Response.json(row);};
  const resolve=createAssessmentNutritionResolver(root,db,()=>undefined,fetcher);
  assert.equal((await resolve([identity],new AbortController().signal))[0]?.id,'123');assert.equal(calls,0);
  db.importFoods([{...complete,nutritionExtras:undefined,retrievedAt:new Date(Date.now()+1).toISOString()}]);
  const result=await resolve([identity],new AbortController().signal);assert.equal(calls,1);assert.equal(result[0]?.nutritionExtras?.proteinG,12);
 });
});
test('independent names trigger bounded search then details; cancelled and unmatched requests cannot borrow facts',async()=>{
 await fixture(async(root,db)=>{
  let calls=0;const fetcher:typeof fetch=async(url,init)=>{calls++;const body=JSON.parse(String(init?.body));assert.ok(!('profile'in body));return Response.json(String(url).endsWith('/search')?{foods:[row]}:[row]);};
  const resolve=createAssessmentNutritionResolver(root,db,()=>undefined,fetcher);
  assert.equal((await resolve([identity],new AbortController().signal))[0]?.id,'123');assert.equal(calls,2);
  const c=new AbortController();c.abort();await assert.rejects(resolve([identity],c.signal));assert.equal(calls,2);
  const other=await resolve([{...identity,brand:'Other'}],new AbortController().signal);assert.equal(other[0],null);assert.equal(calls,2,'shared source pacing should prevent another lookup batch');
  await assert.rejects(resolve(Array(5).fill(identity),new AbortController().signal),/limit/);
 });
});
test('failed lookups preserve public facts as incomplete, never add a remembered nutrient',async()=>{
 await fixture(async(root,db)=>{
  const incomplete={...mapUsda(row,'123',stamp),nutritionExtras:undefined};db.importFoods([incomplete]);
  let calls=0;const resolve=createAssessmentNutritionResolver(root,db,()=>undefined,async()=>{calls++;throw Error('PRIVATE');});
  const result=await resolve([identity],new AbortController().signal);assert.equal(calls,1);assert.equal(result[0]?.nutritionExtras,undefined);assert.equal(labelRating(result[0]!).rating,null);
 });
});
test('US formulation checks and exact-barcode OFF enrichment cannot borrow another product image',async()=>{
 await fixture(async(root,db)=>{
  const incomplete={...mapUsda(row,'123',stamp),nutritionExtras:undefined};db.importFoods([incomplete]);
  let code='';const resolve=createAssessmentNutritionResolver(root,db,()=>undefined,async()=>Response.json({...row,marketCountry:'Canada'}),async barcode=>{
   code=barcode;db.importFoods([normalizeOffFood(off(),'00012345678905',new Date().toISOString())]);
  });
  const found=(await resolve([identity],new AbortController().signal))[0]!;
  assert.equal(code,'00012345678905');assert.equal(found.provider,'off');assert.ok(found.image);assert.equal(found.nutritionExtras?.proteinG,12);
  assert.equal(db.exportFoods().find(f=>f.provider==='usda')?.nutritionExtras,undefined,'Foreign formulation must not overwrite the cached US facts');
 });
});
test('identity ranking outranks completeness so a better-known bulk cup cannot replace a closer package match',async()=>{
 await fixture(async(root,db)=>{
  const exact={...mapUsda(row,'123',stamp),nutritionExtras:undefined};
  const bulk={...mapUsda(row,'123',stamp),id:'456',name:'Whole Oat Cereal Bulk Cup',barcode:'00012345678912'};db.importFoods([exact,bulk]);
  let called='';const result=await createAssessmentNutritionResolver(root,db,()=>undefined,async url=>{called=String(url);return Response.json(row);})([identity],new AbortController().signal);
  assert.match(called,/\/food\/123$/);assert.equal(result[0]?.id,'123');
 });
});
