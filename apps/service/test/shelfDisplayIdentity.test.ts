import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ShelfDisplayIdentities} from '../src/shelfDisplayIdentity.ts';
import {parseShelfNineProducts,parseAlternatives} from '../src/shelfNineProvider.ts';
import {mergeNineProducts,SHELF_NINE_CONSENT,type ShelfNineResult,type ShelfNineRequest} from '../../../packages/core/src/shelfNine.ts';
import {shelfProductKey} from '../../../packages/core/src/shelfGrid.ts';
import {estimatedRatingDecision} from '../../../packages/core/src/aiFoodReview.ts';
import {compactFood} from '../src/compactPhotoReview.ts';
import {food,grid} from '../../../packages/core/test/shelfGridFixtures.ts';
const input=(n=1):ShelfNineRequest=>({...grid(n),schemaVersion:2,consentVersion:SHELF_NINE_CONSENT,capacity:9,batchIndex:0,shareHealth:false,context:{healthConditions:[],dietaryRestrictions:[],store:null}});
const observed=(name:string,variant:string|null,size:string|null,brand='General Mills')=>({...food(name),identity:{...food(name).identity,brand,variant,size}});
const result=(f=food(),index=0,model:'gemini-3.5-flash-lite'|'gpt-6-luna'='gemini-3.5-flash-lite'):ShelfNineResult=>({schemaVersion:2,sessionId:'same-scan',batchId:'batch-'+index,batchIndex:index,model,complete:true,primaryComplete:true,products:[{cellNumbers:[1],food:f,reasons:[],sourceUrls:[],nutritionStatus:'estimated'}],alternatives:[],unresolvedCells:[],duplicatesRemoved:0,searchSuggestionsHtml:null});
const wire=(f=food(),cell=1)=>({cell_numbers:[cell],food:compactFood(f),reasons:[],source_urls:[]});
test('scanned ratings survive every missing core nutrient and serving weight; no missing values are invented',()=>{
 for(const key of ['caloriesKcal','saturatedFatG','transFatG','sugarsG','addedSugarsG','carbohydrateG','sodiumMg','fiberG','proteinG'] as const){
  const f=food();f.rating='not_healthy';f.nutrition[key]=null;
  const parsed=parseShelfNineProducts([wire(f)],input())[0].food;
  assert.equal(parsed.rating,'not_healthy',key);assert.equal(parsed.nutrition[key],null);assert.equal(estimatedRatingDecision(parsed).rating,null);
 }
 const f=food();f.servingGrams=null;f.rating='neutral';assert.equal(parseShelfNineProducts([wire(f)],input())[0].food.rating,'neutral');
});
test('scanned model assessment is never replaced by the local color, while missing or uncertain assessment stays unknown',()=>{
 for(const rating of ['very_healthy','healthy','neutral','not_healthy',null] as const){const f=food();f.rating=rating;f.nutrition.sodiumMg=900;assert.equal(parseShelfNineProducts([wire(f)],input())[0].food.rating,rating);}
 const f=food();f.identity.status='uncertain';assert.equal(parseShelfNineProducts([wire(f)],input())[0].food.rating,null);
});
test('repeated complete observations keep the first model assessment instead of blanking conflicting estimates',()=>{
 const a=food(),b=food();a.rating='neutral';b.rating='healthy';b.nutrition.sodiumMg=120;
 const rows=parseShelfNineProducts([wire(a),wire(b,2)],input(2));assert.equal(rows.length,1);assert.equal(rows[0].food.rating,'neutral');assert.equal(rows[0].food.nutrition.sodiumMg,a.nutrition.sodiumMg);
});
test('displayed model ratings do not bypass alternative nutrition or serving checks',()=>{
 const a=food('Original',900);a.rating='not_healthy';a.servingGrams=null;
 const original={cellNumbers:[1],food:a,reasons:[],sourceUrls:[],nutritionStatus:'estimated' as const};
 const b=food('Better'),alt=()=>({...wire(b),compared_cell:1});
 assert.equal(parseAlternatives([alt()],[original],false).length,0);
 a.servingGrams=40;b.nutrition.transFatG=null;assert.equal(parseAlternatives([alt()],[original],false).length,0);
 b.nutrition.transFatG=0;b.nutrition.addedSugarsG=null;assert.equal(parseAlternatives([alt()],[original],false).length,0);
});
test('Cinnamon Toast Crunch advertising and package-size sightings become one card on the unchanged build-27 merger',()=>{
 const ids=new ShelfDisplayIdentities();const a=observed('Cinnamon Toast Crunch','Mega Size / Family Size','27 oz / 18.8 oz');a.rating='not_healthy';
 const b=observed('Cinnamon Toast Crunch','Original; Blasted with Real Cinnamon','Family Size; package weight not legible');b.rating='not_healthy';b.servingGrams=null;
 const outputs=[ids.normalize(result(a)),ids.normalize(result(b,1,'gpt-6-luna'))];
 const cards=mergeNineProducts(outputs.flatMap(r=>r.products.map(p=>({...p,model:r.model,batchId:r.batchId,packageIds:[r.batchId],complete:true}))));
 assert.equal(cards.length,1);assert.equal(cards[0].food.rating,'not_healthy');assert.equal(cards[0].packageIds.length,2);
 assert.equal(outputs[1].products[0].food.servingGrams,null);assert.equal(b.identity.variant,'Original; Blasted with Real Cinnamon');
});
test('lower sugar variety pack matches split names and listed flavors without merging other formulations',()=>{
 const ids=new ShelfDisplayIdentities();
 const a=observed('Instant Oatmeal','Lower Sugar Variety Pack','8 count','Quaker');
 const b=observed('Instant Oatmeal Lower Sugar Variety','Maple & Brown Sugar / Apples & Cinnamon / Cinnamon & Spice','8 packets','Quaker');
 const first=ids.normalize(result(a));const next=ids.normalize(result(b,1));
 assert.equal(shelfProductKey(first.products[0].food),shelfProductKey(next.products[0].food));
 for(const [name,variant,brand] of [['Instant Oatmeal','Original','Quaker'],['Instant Oatmeal','Lower Sugar Variety Pack','Wegmans'],['Instant Oatmeal','Gluten Free Lower Sugar Variety Pack','Quaker'],['Instant Oatmeal Lower Sugar Variety','Peaches & Cream / Strawberries & Cream','Quaker']]){
  const changed=ids.normalize(result(observed(name,variant,'8 packets',brand),2));assert.notEqual(shelfProductKey(changed.products[0].food),shelfProductKey(first.products[0].food));
 }
});
test('same-brand different flavors, organic, sugar-free and gluten-free formulations remain separate',()=>{
 for(const variant of ['Chocolate','Peanut Butter','Organic','Sugar Free','Gluten Free']){
  const ids=new ShelfDisplayIdentities(),a=ids.normalize(result(observed('Cinnamon Toast Crunch','Original','18 oz'))),b=ids.normalize(result(observed('Cinnamon Toast Crunch',variant,'18 oz'),1));
  assert.notEqual(shelfProductKey(a.products[0].food),shelfProductKey(b.products[0].food),variant);
 }
});
test('same-batch aliases conserve cells and prefer Gemini without mixing nutrient tables',()=>{
 const ids=new ShelfDisplayIdentities(),a=result(observed('Cinnamon Toast Crunch','Original','18 oz'));
 a.products[0].sourceModel='gpt-6-luna';a.products[0].food.rating='healthy';
 a.products.push({...a.products[0],cellNumbers:[2],sourceModel:'gemini-3.5-flash-lite',food:{...observed('Cinnamon Toast Crunch','Blasted with Real Cinnamon','27 oz'),rating:'not_healthy',servingGrams:null}});
 const out=ids.normalize(a);assert.equal(out.products.length,1);assert.deepEqual(out.products[0].cellNumbers,[1,2]);assert.equal(out.duplicatesRemoved,1);assert.equal(out.products[0].food.rating,'not_healthy');assert.equal(out.products[0].food.servingGrams,null);
});
test('aliases are transient and scoped to one scan/context; previews cannot establish identity',()=>{
 let now=0;const ids=new ShelfDisplayIdentities(()=>now,2,3),a=result(observed('Cinnamon Toast Crunch','Original','18 oz')),b=result(observed('Cinnamon Toast Crunch','Blasted with Real Cinnamon','27 oz'),1);
 ids.normalize({...a,complete:false,primaryComplete:false});assert.equal(ids.normalize(b).products[0].food.identity.size,'27 oz');
 assert.equal(ids.normalize(a,'different-context').products[0].food.identity.size,'18 oz');
 assert.equal(ids.normalize({...a,sessionId:'another-scan'}).products[0].food.identity.size,'18 oz');
 now=16*60000;assert.equal(ids.normalize(a).products[0].food.identity.size,'18 oz');
});

test('brand/product field splits merge only when brand tokens agree and the full formulation matches',()=>{
 const ids=new ShelfDisplayIdentities();
 const a=result(observed('Zero Cinnamon Cereal','Cinnamon','6.3 oz',"Kellogg's Special K"));
 const b=result(observed('Special K Zero','Cinnamon','6.3 oz',"Kellogg's"),1);
 const first=ids.normalize(a),second=ids.normalize(b);assert.equal(shelfProductKey(first.products[0].food),shelfProductKey(second.products[0].food));
 const other=ids.normalize(result(observed('Special K Zero','Cinnamon','6.3 oz','Wegmans'),2));assert.notEqual(shelfProductKey(first.products[0].food),shelfProductKey(other.products[0].food));
});
