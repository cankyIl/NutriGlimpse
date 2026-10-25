import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ed25519} from '@noble/curves/ed25519.js';
import {bytesToHex,hexToBytes} from '@noble/hashes/utils.js';
import {mapUsda} from '../src/usda.ts';
import {normalizeOffFood} from '../src/offNormalization.ts';
import {normalizeOffBulk} from '../src/offBulk.ts';
import {foodSchema,legacyFood,type PublicFood} from '../../../packages/core/src/publicFood.ts';
import {bloodPressureLabelFacts} from '../../../packages/core/src/labelChecks.ts';
import {productLabelFingerprint,verifiedGlutenEvidence} from '../../../packages/core/src/productLabelEvidence.ts';
import {parseEvidenceRegistry} from '../src/sourceEvidence.ts';
import {resolveGlutenEvidence,signLabelDecision,type LabelTrust} from '../src/productLabelEvidence.ts';
import {PublicDatabase} from '../src/publicDatabase.ts';
import {createAppServer} from '../src/server.ts';
const now=Date.parse('2026-10-14T12:00:00Z'),stamp=new Date(now).toISOString();
const usda={fdcId:1,description:'Fixture corn cereal',dataType:'Branded',gtinUpc:'00012345678905',ingredients:'Corn, salt',brandName:'Fixture',brandedFoodCategory:'Breakfast Cereals',servingSize:40,servingSizeUnit:'g',marketCountry:'US',publicationDate:'2026-10-01',foodNutrients:[{nutrient:{id:1257,unitName:'G'},amount:0},{nutrient:{id:1092,unitName:'MG'},amount:500},{nutrient:{id:1090,unitName:'MG'},amount:100},{nutrient:{id:1087,unitName:'MG'},amount:250}]};
const food=():PublicFood=>({...mapUsda(usda,'1',stamp),comparisonGroup:'breakfast-cereal',categoryEvidence:'category-rules-v4',nutrients:{caloriesKcal:400,saturatedFatG:1,fiberG:8,sodiumMg:100,sugarsG:5}});
const off=()=>({product:{code:'00012345678905',product_name:'Fixture corn cereal',ingredients_text:'Corn, salt',brands:'Fixture',countries_tags:['en:united-states'],categories_tags:['en:breakfast-cereals'],nutrition_data_per:'100g',serving_quantity:40,serving_quantity_unit:'g',last_modified_t:now/1000-60,data_quality_errors_tags:[],nutriments:{'energy-kcal_100g':400,'saturated-fat_100g':1,fiber_100g:8,sodium_100g:.1,sugars_100g:5,'trans-fat_100g':0,potassium_100g:.5,magnesium_100g:.1,calcium_100g:.25,potassium_unit:'mg'},labels:'Gluten-free',labels_tags:['en:gluten-free'],allergens:'Contains: Milk',allergens_tags:['en:milk'],traces:'May contain wheat',traces_tags:['en:wheat']}});
test('USDA mineral IDs and exact units preserve a reported zero, unknowns and duplicates',()=>{
 assert.deepEqual(mapUsda(usda,'1',stamp).additionalNutrients,{transFatG:0,potassiumMg:500,magnesiumMg:100,calciumMg:250});
 assert.equal(mapUsda({...usda,foodNutrients:[]},'1',stamp).additionalNutrients?.transFatG,null);
 for(const foodNutrients of [[...usda.foodNutrients,usda.foodNutrients[1]],usda.foodNutrients.map(n=>n.nutrient.id===1092?{...n,nutrient:{...n.nutrient,unitName:'G'}}:n),usda.foodNutrients.map(n=>n.nutrient.id===1092?{...n,amount:100001}:n)]){
  assert.equal(mapUsda({...usda,foodNutrients},'1',stamp).additionalNutrients?.potassiumMg,null);
 }
});
test('OFF uses canonical grams despite an original mg input unit, keeps tags explicitly unverified',()=>{
 const f=normalizeOffFood(off(),'00012345678905',stamp)!;
 assert.deepEqual(f.additionalNutrients,{transFatG:0,potassiumMg:500,magnesiumMg:100,calciumMg:250});
 assert.equal(f.reportedLabel?.verification,'unverified');assert.deepEqual(f.reportedLabel?.labels,['en:gluten-free']);
 assert.deepEqual(f.reportedLabel?.allergens,['en:milk']);assert.deepEqual(f.reportedLabel?.traces,['en:wheat']);
 assert.equal(verifiedGlutenEvidence(f,now),null);assert.equal(f.certifications,'unverified');
 for(const value of [-1,NaN,Infinity,'10',100001]){const raw=off();Object.assign(raw.product.nutriments,{potassium_100g:value});assert.equal(normalizeOffFood(raw,'00012345678905',stamp)?.additionalNutrients?.potassiumMg,null);}
 const raw=off();delete (raw.product.nutriments as Record<string,unknown>).calcium_100g;assert.equal(normalizeOffFood(raw,'00012345678905',stamp)?.additionalNutrients?.calciumMg,null);
});
test('OFF bulk enrichment validates serving conversions without excluding a complete base label',()=>{
 const p=off().product;
 const row={code:p.code,product_name:[{lang:'en',text:p.product_name}],ingredients_text:[{lang:'en',text:p.ingredients_text}],brands:p.brands,categories_tags:p.categories_tags,countries_tags:p.countries_tags,nutrition_data_per:'serving',serving_size:'1 cup (40 g)',serving_quantity:'40',product_quantity_unit:'g',last_modified_t:p.last_modified_t,data_quality_errors_tags:[],obsolete:false,no_nutrition_data:false,labels_tags:p.labels_tags,nutriments:Object.entries(p.nutriments).filter(([k])=>k.endsWith('_100g')).map(([k,v])=>({name:k.slice(0,-5),'100g':v as number,serving:(v as number)*.4,unit:'mg'}))};
 assert.equal(normalizeOffBulk(row,stamp).food?.additionalNutrients?.potassiumMg,500);
 const bad={...row,nutriments:row.nutriments.map(n=>n.name==='potassium'?{...n,serving:999}:n)};
 assert.equal(normalizeOffBulk(bad,stamp).food?.additionalNutrients?.potassiumMg,null);
 assert.ok(normalizeOffBulk(bad,stamp).food);
});
test('one listed portion uses current mineral DVs and trans fat gets no invented percent DV',()=>{
 const facts=bloodPressureLabelFacts(food(),now);
 assert.equal(facts.potassium?.amount,200);assert.equal(facts.potassium?.percent,200/4700*100);
 assert.equal(facts.magnesium?.amount,40);assert.equal(facts.calcium?.amount,100);assert.equal(facts.transFat,0);
 assert.deepEqual(facts.unavailable,[]);assert.equal(bloodPressureLabelFacts({...food(),servingGrams:null},now).potassium,null);
 assert.equal(bloodPressureLabelFacts({...food(),retrievedAt:'2020-01-01T00:00:00Z'},now).transFat,null);
});
const trust:LabelTrust={version:1,acceptedAuthorities:['fixture-certifier'],permittedRightsRecords:['fixture-rights'],approvedReviewers:['fixture-reviewer'],manufacturerHosts:['manufacturer.example']};
const row=(f=food(),kind:'manufacturer-label'|'certification'='manufacturer-label')=>({id:'fixture-review',barcode:f.barcode!,market:'US',kind,origin:kind==='certification'?'certification-authority':'public-manufacturer',sourceUrl:'https://manufacturer.example/product/exact',observedAt:'2026-10-14T09:00:00Z',expiresAt:'2026-11-01T00:00:00Z',sourceVersion:'fixture-v1',rights:{status:'permitted',recordId:'fixture-rights'},review:{status:'approved',reviewer:'fixture-reviewer',reviewedAt:'2026-10-14T10:00:00Z'},retailer:null,branchId:null,claim:'gluten-free',authorityId:kind==='certification'?'fixture-certifier':null,finding:'supports',portionGrams:null,productFingerprint:productLabelFingerprint(f),label:{frontLabelText:'Gluten-free',allergenStatement:'Contains: Milk',allergenPanelReviewed:true}});
const privateKey='11'.repeat(32),keys={fixture:bytesToHex(ed25519.getPublicKey(hexToBytes(privateKey)))};
test('either exact reviewed certification or manufacturer claim produces a verifiable time-limited proof',()=>{
 for(const kind of ['manufacturer-label','certification'] as const){
  const f=food(),decision=resolveGlutenEvidence(f,parseEvidenceRegistry([row(f,kind)]),trust,now);
  assert.equal(decision.summary.status,'verified');
  const reviewed={...f,glutenEvidence:signLabelDecision(decision,'fixture',privateKey)};
  assert.equal(verifiedGlutenEvidence(reviewed,now,keys)?.basis,kind);
  assert.equal(verifiedGlutenEvidence(reviewed,now+3600000,keys),null);
  assert.equal(verifiedGlutenEvidence(reviewed,now-1,keys),null);
  assert.equal(verifiedGlutenEvidence(reviewed,now,{}),null);
  assert.equal(verifiedGlutenEvidence({...reviewed,ingredients:'Wheat'},now,keys),null);
  assert.equal(verifiedGlutenEvidence({...reviewed,nutrients:{...reviewed.nutrients,sodiumMg:110}},now,keys),null);
  assert.equal(verifiedGlutenEvidence({...reviewed,barcode:'00036000291452'},now,keys),null);
  const e=JSON.parse(reviewed.glutenEvidence.proof!);e.payload=e.payload.replace('Gluten-free','Gluten-free cereal');
  assert.equal(verifiedGlutenEvidence({...reviewed,glutenEvidence:{...reviewed.glutenEvidence,proof:JSON.stringify(e)}},now,keys),null);
 }
});
test('empty policy, unreviewed rights, unapproved reviewer, unknown authority and incomplete panel cannot qualify',()=>{
 const f=food();
 for(const policy of [{...trust,permittedRightsRecords:[]},{...trust,approvedReviewers:[]},{...trust,manufacturerHosts:[]}]){
  assert.equal(resolveGlutenEvidence(f,parseEvidenceRegistry([row(f)]),policy,now).body,null);
 }
 assert.equal(resolveGlutenEvidence(f,parseEvidenceRegistry([row(f,'certification')]),{...trust,acceptedAuthorities:[]},now).body,null);
 for(const patch of [{rights:{status:'pending',recordId:null}},{review:{status:'draft',reviewer:null,reviewedAt:null}},{label:undefined},{productFingerprint:undefined},{observedAt:'2026-10-14T13:00:00Z'},{expiresAt:'2026-10-14T11:00:00Z'},{label:{frontLabelText:'No gluten-containing ingredients',allergenStatement:'',allergenPanelReviewed:true}}]){
  assert.equal(resolveGlutenEvidence(f,parseEvidenceRegistry([{...row(f),...patch}]),trust,now).body,null);
 }
});
test('contradictions across manufacturer/certifier, withdrawals and new formulation all fail closed',()=>{
 const f=food(),a=row(f),b={...row(f,'certification'),id:'second',finding:'contradicts'};
 assert.equal(resolveGlutenEvidence(f,parseEvidenceRegistry([a,b]),trust,now).summary.status,'conflict');
 assert.equal(resolveGlutenEvidence(f,parseEvidenceRegistry([{...a,review:{...a.review,status:'withdrawn'}}]),trust,now).body,null);
 assert.equal(resolveGlutenEvidence({...f,ingredients:'Corn, sugar'},parseEvidenceRegistry([a]),trust,now).body,null);
 assert.equal(resolveGlutenEvidence({...f,brand:'Other'},parseEvidenceRegistry([a]),trust,now).body,null);
});
test('review cannot override ingredient or cross-contact conflict, including reported OFF warnings',()=>{
 for(const ingredients of ['Wheat flour','Barley malt','Rye','Brewer’s yeast']){
  const f={...food(),ingredients};assert.equal(resolveGlutenEvidence(f,parseEvidenceRegistry([row(f)]),trust,now).summary.status,'conflict');
 }
 for(const allergenStatement of ['Contains: Wheat','May contain wheat','Made in a facility that processes wheat']){
  const f=food(),e=row(f);e.label.allergenStatement=allergenStatement;
  assert.equal(resolveGlutenEvidence(f,parseEvidenceRegistry([e]),trust,now).summary.status,'conflict');
 }
 const f=normalizeOffFood(off(),'00012345678905',stamp)!;
 assert.equal(resolveGlutenEvidence(f,parseEvidenceRegistry([row(f)]),trust,now).summary.status,'conflict');
 // Reviewed gluten-free oats may qualify; oats without a reviewed claim never qualify.
 const oats={...food(),ingredients:'Oats, salt'};
 assert.equal(resolveGlutenEvidence(oats,parseEvidenceRegistry([row(oats)]),trust,now).summary.status,'verified');
 assert.equal(resolveGlutenEvidence(oats,[],trust,now).body,null);
});
test('v2 facts round-trip through database/cache and v1 strict clients retain their exact schema',async()=>{
 const db=new PublicDatabase(':memory:');db.importFoods([food()]);
 const service=createAppServer({catalog:db,authorize:h=>h==='Bearer fixture'});
 await new Promise<void>(resolve=>service.listen(0,'127.0.0.1',resolve));
 const port=(service.address() as {port:number}).port;
 try{
  const base='http://127.0.0.1:'+port,headers={Authorization:'Bearer fixture'};
  assert.equal((await fetch(base+'/v2/catalog/foods/usda/1')).status,401);
  const v1=await (await fetch(base+'/v1/catalog/foods/usda/1',{headers})).json();
  assert.equal(v1.schemaVersion,1);assert.equal(v1.food.additionalNutrients,undefined);assert.equal(v1.food.glutenEvidence,undefined);
  const old=foodSchema.omit({additionalNutrients:true,reportedLabel:true,glutenEvidence:true});const {stale,...one}=v1.food;assert.ok(old.safeParse(one).success);
  const v2=await (await fetch(base+'/v2/catalog/foods/usda/1',{headers})).json();
  assert.equal(v2.schemaVersion,2);const {stale:stale2,...two}=v2.food;
  assert.equal(foodSchema.parse(two).additionalNutrients?.potassiumMg,500);assert.equal(two.glutenEvidence.status,'unverified');
  assert.deepEqual(legacyFood(db.exportFoods()[0]),legacyFood(food()));
  assert.equal((await fetch(base+'/v2/catalog/foods/usda/1?bad=1',{headers})).status,400);
  assert.equal((await fetch(base+'/v2/catalog/foods/usda/1',{headers:{...headers,Origin:'https://attacker.example'}})).status,403);
 }finally{await new Promise<void>(resolve=>service.close(()=>resolve()));db.close();}
});
