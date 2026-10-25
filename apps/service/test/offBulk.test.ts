import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeOffBulk,retailerBrandHints} from '../src/offBulk.ts';
import {comparisonReady} from '../../../packages/core/src/catalogAlternatives.ts';
const now=new Date().toISOString();
const fixture=()=>({code:'00012345678905',product_name:[{lang:'en',text:'Whole grain breakfast cereal'}],ingredients_text:[{lang:'en',text:'Whole grain <b>oats</b>, salt'}],brands:'Wegmans',categories_tags:['en:breakfast-cereals'],countries_tags:['en:united-states'],nutrition_data_per:'100g',serving_size:'1 cup (40 g)',serving_quantity:'40',product_quantity_unit:'g',last_modified_t:Math.floor(Date.parse(now)/1000),data_quality_errors_tags:[],nutriments:[{name:'energy-kcal',unit:'kcal','100g':380},{name:'sodium',unit:'g','100g':0.25},{name:'sugars',unit:'g','100g':6},{name:'fiber',unit:'g','100g':9},{name:'saturated-fat',unit:'g','100g':1}],obsolete:false,no_nutrition_data:false});
test('Parquet language/nutrient arrays produce source-attributed equal-weight food facts',()=>{
 const f=normalizeOffBulk(fixture(),now).food!;assert.ok(f);assert.equal(f.nutrients.sodiumMg,250);assert.equal(f.servingGrams,40);assert.equal(f.ingredients,'Whole grain oats, salt');assert.ok(comparisonReady(f));assert.equal(f.availability,'unverified');assert.equal(f.certifications,'unverified');
});
test('bulk rejects ambiguous mass, ml, prepared-only, missing basis, old and invalid barcode records',()=>{
 for(const patch of [{serving_size:'1 cup',product_quantity_unit:null},{serving_size:'240 ml',product_quantity_unit:'ml'},{nutrition_data_per:null},{nutrition_data_per:'serving'},{obsolete:true},{no_nutrition_data:true},{countries_tags:['en:france']},{last_modified_t:1},{code:'00012345678906'},{data_quality_errors_tags:null}])assert.ok(!normalizeOffBulk({...fixture(),...patch},now).food,JSON.stringify(patch));
 const noPortion=normalizeOffBulk({...fixture(),serving_size:null,serving_quantity:null},now).food!;assert.equal(noPortion.servingGrams,null);
});
test('bulk refuses duplicate, prepared-only and missing nutrient observations',()=>{
 const f=fixture();
 for(const nutriments of [f.nutriments.slice(1),[...f.nutriments,f.nutriments[0]],f.nutriments.map(n=>n.name==='sodium'?{...n,'100g':null,prepared_100g:1}:n),f.nutriments.map(n=>n.name==='sodium'?{...n,'100g':-1}:n)])assert.ok(!normalizeOffBulk({...f,nutriments},now).food);
});
test('brand hints distinguish the four requested chains without inventing current availability',()=>{
 assert.deepEqual(retailerBrandHints('Wegmans'),['wegmans']);assert.deepEqual(retailerBrandHints('Great Value, Marketside'),['walmart']);assert.deepEqual(retailerBrandHints('PICS;Market 32'),['price-chopper']);assert.deepEqual(retailerBrandHints('365 Everyday Value'),['whole-foods']);assert.deepEqual(retailerBrandHints('Pictures Foods, Whole Grain, Walmartish'),[]);
});

test('public download cache invalidates after an import and keeps full source provenance',async()=>{
 const {PublicDatabase}=await import('../src/publicDatabase.ts');const {catalogDownload}=await import('../src/catalogPublication.ts');
 const db=new PublicDatabase(':memory:',true);try{const empty=catalogDownload(db);assert.equal(JSON.parse(empty).foods.length,0);db.importFoods([normalizeOffBulk(fixture(),now).food]);const populated=catalogDownload(db);assert.notEqual(populated,empty);assert.equal(JSON.parse(populated).foods.length,1);assert.equal(catalogDownload(db),populated);}finally{db.close();}
});

test('Parquet float representation is normalized without inventing missing nutrients',()=>{
 const raw=fixture();raw.nutriments[1]['100g']=0.36000001430511475;
 assert.equal(normalizeOffBulk(raw,now).food?.nutrients.sodiumMg,360);
});

test('OFF canonical 100g values ignore original input unit and validate serving conversion',()=>{
 const f=fixture();f.nutriments[1].unit='mg';assert.equal(normalizeOffBulk(f,now).food?.nutrients.sodiumMg,250);
 const serving={...f,nutrition_data_per:'serving',nutriments:f.nutriments.map(n=>({...n,serving:n['100g']*0.4}))};
 assert.equal(normalizeOffBulk(serving,now).food?.nutrients.sodiumMg,250);
 assert.ok(!normalizeOffBulk({...serving,serving_quantity:'20'},now).food);
 assert.ok(!normalizeOffBulk({...serving,nutriments:serving.nutriments.map(n=>({...n,serving:999}))},now).food);
});
