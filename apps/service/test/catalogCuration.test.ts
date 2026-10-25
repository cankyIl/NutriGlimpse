import {comparisonGroups} from '../../../packages/core/src/comparisonGroups.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {classifyGrocery,classifyUsdaGrocery} from '../src/catalogCuration.ts';
import {PublicDatabase} from '../src/publicDatabase.ts';
import {mapUsda} from '../src/usda.ts';
import {createAppServer} from '../src/server.ts';
test('category rules reject deceptive same-keyword forms and preserve only gram-based US grocery comparisons',()=>{
 for(const name of ['Peanut butter chocolate cereal bars','PEANUT BUTTER CANDIES','PEANUT BUTTER CLUSTERS','Chobani Yogurt, Peanut Butter Dream','Smuckers Uncrustables Peanut Butter & Strawberry','Yoplait Lowfat Yogurt with Granola','S2 Clearly Crafted Apple Sweet Potato & Granola Organic','Activia Strawberry & Cereal Yogurt'])assert.equal(classifyGrocery(name),null,name);
 assert.equal(classifyGrocery('Plain yogurt drink'),null);
 assert.equal(classifyGrocery('Whole wheat bread crumbs'),null);
 assert.equal(classifyGrocery('Creamy peanut butter'),'peanut-butter');
 assert.equal(classifyGrocery('Whole wheat bread'),'sliced-bread');
 const base={fdcId:1,description:'Creamy peanut butter',brandedFoodCategory:'Nut & Seed Butters',dataType:'Branded',servingSize:32,servingSizeUnit:'GRM',marketCountry:'US',foodNutrients:[]};
 assert.equal(mapUsda(base,'1').comparisonGroup,'peanut-butter');
 assert.equal(mapUsda({...base,servingSizeUnit:'ml'},'1').comparisonGroup,undefined);
 assert.equal(mapUsda({...base,discontinuedDate:'2025-01-01'},'1').comparisonGroup,undefined);
 assert.equal(mapUsda({...base,marketCountry:'Canada'},'1').comparisonGroup,undefined);
});
test('comparable endpoint is authenticated, bounded and rejects unknown groups without personal request bodies',async()=>{
 const db=new PublicDatabase(':memory:');
 const food=mapUsda({fdcId:1,description:'Creamy peanut butter',brandedFoodCategory:'Nut & Seed Butters',brandName:'Great Value',brandOwner:'Owner',gtinUpc:'016000275287',ingredients:'Peanuts',publicationDate:new Date().toISOString().slice(0,10),dataType:'Branded',servingSize:32,servingSizeUnit:'GRM',marketCountry:'US',foodNutrients:[[1008,'KCAL',600],[1258,'G',10],[1079,'G',8],[1093,'MG',100],[2000,'G',5]].map(([id,unitName,amount])=>({nutrient:{id,unitName},amount}))},'1');
 assert.equal(food.brand,'Great Value');db.importFoods([food]);assert.equal(db.search('Great Value')[0].id,'1');assert.equal(db.comparable('peanut-butter').length,1);assert.equal(db.comparable('granola').length,0);assert.throws(()=>db.comparable("' OR 1=1"));
 const server=createAppServer({catalog:db,catalogBurst:comparisonGroups.length+3,authorize:value=>value==='Bearer test'});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 try{
  const base='http://127.0.0.1:'+(server.address() as AddressInfo).port+'/v1/catalog/comparable/';
  assert.equal((await fetch(base+'peanut-butter')).status,401);
  const response=await fetch(base+'peanut-butter',{headers:{Authorization:'Bearer test'}});
  assert.equal(response.status,200);const body=await response.json();assert.equal(body.foods[0].id,'1');assert.equal(body.limit,500);
  for(const group of comparisonGroups)assert.equal((await fetch(base+group,{headers:{Authorization:'Bearer test'}})).status,200,group);
  assert.equal((await fetch(base+'bad',{headers:{Authorization:'Bearer test'}})).status,400);
 }finally{await new Promise<void>(r=>server.close(()=>r()));db.close();}
});

test('expanded comparison groups separate food forms, meals and disguised keyword matches',()=>{
 const pairs=[['Whole wheat penne','dry-pasta'],['Tomato basil pasta sauce','tomato-pasta-sauce'],['Chunky salsa','salsa'],['Roasted garlic hummus','hummus'],['Lowfat cottage cheese','cottage-cheese'],['Sharp cheddar cheese','cheddar-cheese'],['Soft flour tortillas','flour-tortillas'],['White corn tortillas','corn-tortillas'],['Salted potato chips','potato-chips'],['Corn tortilla chips','tortilla-chips'],['Mini pretzels','pretzels'],['Sea salt popcorn','ready-popcorn'],['Creamy almond butter','almond-butter'],['Roasted salted almonds','plain-almonds']];
 for(const [name,group] of pairs)assert.equal(classifyGrocery(name),group,name);
 for(const name of ['Spaghetti with meat sauce','Macaroni and cheese dinner','Fresh penne pasta','Alfredo pasta sauce','Salsa con queso','Hummus pretzel snack pack','Pineapple cottage cheese','Cheddar cheese sauce','Chocolate covered pretzels','Microwave popcorn','Popcorn chicken','Unpopped popcorn kernels','Butter Popcorn Seasoning','JIFFY POP Stovetop Popping Pan Popcorn','Hard and Soft Taco Shells and Flour Tortillas','Chocolate covered almonds','Mixed Nuts Walnuts Almonds Pecans','Specklemint Almonds','Toffee Popcorn with Peanuts','Almond butter chocolate cups','STOUFFERS Spaghetti & Meatballs','Shredded Beef Salsa Roja Tamale','Salsa Verde Fiesta Twists','Salsa Verde Avocado Yogurt Dressing','Lunchables Tortilla Chips, Cheese Dip & Salsa'])assert.equal(classifyGrocery(name),null,name);
});
test('candidate selection excludes incomplete and stale records before applying the cap',()=>{
 const db=new PublicDatabase(':memory:');
 const base=mapUsda({fdcId:7,description:'Salsa',brandedFoodCategory:'Dips & Salsa',brandName:'PICS',gtinUpc:'016000275287',ingredients:'Tomatoes',publicationDate:new Date().toISOString().slice(0,10),dataType:'Branded',servingSize:30,servingSizeUnit:'g',marketCountry:'US',foodNutrients:[[1008,'KCAL',30],[1258,'G',0],[1079,'G',2],[1093,'MG',300],[2000,'G',3]].map(([id,unitName,amount])=>({nutrient:{id,unitName},amount}))},'7');
 try{
  db.importFoods([{...base,id:'8',nutrients:{...base.nutrients,fiberG:null}},{...base,id:'9',retrievedAt:'2020-01-01T00:00:00.000Z'},base]);
  assert.deepEqual(db.comparable('salsa').map(f=>f.id),['7']);
  assert.equal(db.search('PICS').length,3);
 }finally{db.close();}
});

test('USDA comparison classification requires corroborating source category',()=>{
 assert.equal(classifyUsdaGrocery('Granola','Snack, Energy & Granola Bars'),null);
 assert.equal(classifyUsdaGrocery('Penne','Ready-Made Combination Meals'),null);
 assert.equal(classifyUsdaGrocery('Penne'),null);
 assert.equal(classifyUsdaGrocery('Penne','Pasta/Noodles'),'dry-pasta');
});
