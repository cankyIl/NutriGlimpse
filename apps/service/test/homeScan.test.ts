import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptSimpleGroceryAnswer} from '../src/geminiSimpleReview.ts';
import {alternativeKey,mergeAlternativeSupplement,supplementContext,buildAlternativeRequest} from '../src/groceryAlternativeSupplement.ts';
import {createRetailerLookup,retailerDistance} from '../src/groceryRetailers.ts';
import {normalizeGroceryLocation,groceryLocationSentence} from '../src/groceryLocation.ts';
import {buildGroceryRequest,parseGroceryResponse} from '../src/groceryReviewProvider.ts';
import {PublicDatabase} from '../src/publicDatabase.ts';
import {createProductCardSources,mediaFor} from '../src/productCardSources.ts';
import {projectRoot} from '../src/projectPaths.ts';
import {GROCERY_PARALLEL_CONSENT,type GroceryContext} from '../../../packages/core/src/groceryReview.ts';
import type {StoreDirectory} from '../../../packages/core/src/storeDetection.ts';
const context:GroceryContext={healthConditions:['noConcern'],dietaryRestrictions:[],store:null,location:{latitude:42.30,longitude:-71.71,observedAt:Date.now()}};
const directory={stores:[{name:'Walmart',address:'200 Fictional Road Northborough MA',coordinates:{latitude:42.3,longitude:-71.71}},{name:'Wegmans',address:'300 Fictional Road Northborough MA',coordinates:{latitude:42.3,longitude:-71.72}},{name:'Target',address:'Boston MA',coordinates:{latitude:42.36,longitude:-71.05}}]} as StoreDirectory;
const original={title:'Honey Nut Cheerios Cereal, 10.8 oz',rating:'neutral',nutrition:{sugarsG:12,sodiumMg:210,proteinG:3,transFatG:0},reasons:['Contains added sugar']};
const plain={title:'Original Cheerios Cereal',rating:'healthy',nutrition:{sugarsG:1.5,sodiumMg:265,proteinG:4.4,transFatG:0},reasons:['Less sugar'],source_url:'https://www.heb.com/product-detail/cereal/001145176',image_url:'https://images.heb.com/is/image/HEBGrocery/001145176-1'};
const primary=()=>adaptSimpleGroceryAnswer({product:original,alternatives:[plain]},context,new Set(),[],{allowUnverifiedEstimates:true}).review;
test('photo evidence is independent of missing nutrition citation, without upgrading nutrient verification',()=>{
 const p=primary().recommendations[0].food;assert.equal(p.image.url,plain.image_url);assert.equal(p.image.kind,'reference');assert.deepEqual(p.nutrientEvidence,[]);assert.ok(p.assessment.limitations.some(s=>s.includes('AI estimates')));
 for(const bad of ['http://images.heb.com/a','https://127.0.0.1/a','https://10.0.0.1/a'])assert.equal(adaptSimpleGroceryAnswer({product:original,alternatives:[{...plain,image_url:bad}]},context,new Set(),[],{allowUnverifiedEstimates:true}).review.recommendations[0].food.image.kind,'none');
});
test('observed Cheerios duplicate contributes its retailer, never replaces Gemini nutrients or consumes a slot',()=>{
 const before=primary();const result=mergeAlternativeSupplement(before,{alternatives:[{...plain,title:'Cheerios Original, 8.9 oz',nutrition:{sodiumMg:190,sugarsG:2},store:'Walmart',retailer_url:'https://www.walmart.com/ip/10311408',image_url:null},{...plain,title:'Great Value Oats',nutrition:{},store:'Walmart'}]},context,new Set(['https://www.walmart.com/ip/10311408']));
 assert.equal(result.added,0);assert.equal(result.review.recommendations.length,1);assert.deepEqual(result.review.recommendations[0].food.nutrition,before.recommendations[0].food.nutrition);assert.equal(result.review.recommendations[0].food.availability.storeName,'Walmart');assert.ok(result.audit.some(d=>d.code==='supplement_duplicate'));assert.ok(result.audit.some(d=>d.code==='recommendation_not_supported'));assert.equal(before.recommendations[0].food.availability.storeName,null);
});
test('within-model and cross-model duplicates collapse but brand, flavor and shape distinctions survive',()=>{
 const r=adaptSimpleGroceryAnswer({product:original,alternatives:[plain,{...plain,title:'Cheerios Original, 8.9 oz'},{...plain,title:'Multi Grain Cheerios Cereal'}]},context,new Set(),[],{allowUnverifiedEstimates:true});assert.equal(r.review.recommendations.length,2);
 for(const [a,b] of [['Cheerios','Honey Nut Cheerios'],['Cheerios','Multi Grain Cheerios'],['Post Shredded Wheat','Wegmans Shredded Wheat'],['Post Spoon Size Shredded Wheat','Post Big Biscuit Shredded Wheat'],['Makers Low Sodium Sauce','Makers Sauce']])assert.notEqual(alternativeKey(a),alternativeKey(b));
});
test('title-only image lookup infers an explicitly named brand and reuses an independent photo',async()=>{
 const db=new PublicDatabase(':memory:',true);const p={code:'0016000435094',product_name:'Cheerios Original',brands:'General Mills, Cheerios',countries_tags:['en:united-states'],image_front_small_url:'https://images.openfoodfacts.org/images/products/001/600/043/5094/front_en.44.200.jpg'};db.cacheMediaProducts([p]);let calls=0;
 const api=createProductCardSources(db,async()=>[],'contact@example.invalid',async()=>{calls++;return Response.json({hits:[]});});
 const identity={status:'identified' as const,brand:null,name:'Original Cheerios Cereal, 8.9 oz',variant:null,size:null,visibleText:[]};
 try{assert.equal((await api.media(identity,new AbortController().signal)).image?.url,p.image_front_small_url);assert.equal(calls,0);assert.equal(db.exportFoods().length,0);
 for(const name of ['Honey Nut Cheerios Cereal','Multi Grain Cheerios','Different Brand Cereal'])assert.equal(mediaFor({...identity,name},p),null);
 }finally{db.close();}
});
test('no selected store uses approximate location for nearby chains and never invents an aisle',async()=>{
 assert.ok(retailerDistance(context,'Walmart',null,null,directory)!<15);assert.equal(retailerDistance(context,'Target',null,null,directory),null);assert.equal(retailerDistance(context,'Walmart',null,'NY',directory),null);
 let calls=0;const lookup=createRetailerLookup(async()=>{calls++;throw Error('Unneeded');},v=>parseGroceryResponse(v,'gemini-3.5-flash-lite'),projectRoot,directory);
 const review=primary();review.recommendations[0].food.availability.storeName='Walmart';const result=await lookup(review,context,new AbortController().signal);
 assert.equal(calls,0);assert.equal(result.review.recommendations[0].food.availability.storeName,'Walmart');assert.equal(result.review.recommendations[0].food.availability.aisleNumber,null);
});
test('home scan follows up missing retailers once, without health information, GPS or home address in provider request',async()=>{
 let calls=0;const lookup=createRetailerLookup(async request=>{calls++;const body=JSON.stringify(request);assert.match(body,/Northborough/);assert.doesNotMatch(body,/42\.3|-71\.71|observedAt|Fictional Road|diabetes/);
 const answer={items:[{id:'alternative0',title:plain.title,retailers:[{store:'Walmart',town:'Northborough',state:'MA',url:'https://www.walmart.com/ip/10311408',aisle:null}]}]};
 return {status:'completed',model:'gemini-3.5-flash-lite',steps:[{type:'google_search_call',id:'s',arguments:{queries:['cereal retailer']}},{type:'google_search_result',call_id:'s',result:[]},{type:'model_output',content:[{type:'text',text:JSON.stringify(answer)}]}]};},v=>parseGroceryResponse(v,'gemini-3.5-flash-lite'),projectRoot,directory);
 const result=await lookup(primary(),{...context,healthConditions:['diabetes']},new AbortController().signal);assert.equal(calls,1);assert.equal(result.review.recommendations[0].food.availability.storeName,'Walmart');assert.equal(result.review.recommendations[0].food.availability.status,'unknown');assert.deepEqual(result.review.recommendations[0].food.nutrition,primary().recommendations[0].food.nutrition);
});
test('stale and future fixes disappear; selected store wins; coordinates never enter either approved model prompt',()=>{
 assert.equal(normalizeGroceryLocation({...context,location:{...context.location!,observedAt:Date.now()-100000}}).location,undefined);
 assert.equal(normalizeGroceryLocation({...context,location:{...context.location!,observedAt:Date.now()+20000}}).location,undefined);
 const selected={...context,store:{name:'Wegmans',town:'Northborough',state:'MA',branch:null}};assert.equal(normalizeGroceryLocation(selected).location,undefined);
 const a=buildGroceryRequest('fixture',context,'gemini-3.5-flash-lite',projectRoot,directory) as any,b=buildAlternativeRequest('fixture',projectRoot,supplementContext(context,GROCERY_PARALLEL_CONSENT),directory) as any;
 assert.equal(a.input[0].text,b.input[0].content[0].text);assert.match(a.input[0].text,/near Northborough, MA, with no store selected/);assert.doesNotMatch(a.input[0].text,/latitude|longitude|42\.3|-71\.71|Fictional Road/);
 assert.equal(supplementContext(context,undefined).location,undefined);assert.match(groceryLocationSentence({...context,location:undefined},directory),/No current store/);
});
test('photo and location fixes preserve nutrient bounds, unknowns, trans-fat and restriction gates',()=>{
 for(const c of [{...context,healthConditions:['celiac']},{...context,healthConditions:['ckd']},{...context,dietaryRestrictions:['glutenFree']}])assert.equal(adaptSimpleGroceryAnswer({product:original,alternatives:[plain]},c as GroceryContext,new Set(),[],{allowUnverifiedEstimates:true}).review.recommendations.length,0);
 const r=adaptSimpleGroceryAnswer({product:original,alternatives:[{...plain,title:'Trans cereal',nutrition:{transFatG:1,totalFatG:2}},{...plain,title:'Missing cereal',nutrition:{}},{...plain,title:'Invalid cereal',nutrition:{sodiumMg:999999}}]},context,new Set(),[],{allowUnverifiedEstimates:true});assert.equal(r.review.recommendations.length,1);assert.equal(r.review.recommendations[0].food.assessment.rating,'not_healthy');
});
