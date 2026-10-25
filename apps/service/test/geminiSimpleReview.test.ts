import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptSimpleGroceryAnswer} from '../src/geminiSimpleReview.ts';
import {buildGroceryRequest,createGroceryProvider} from '../src/groceryReviewProvider.ts';
import {groceryResultSchema,groceryWireSchema,GROCERY_CONSENT,type GroceryContext} from '../../../packages/core/src/groceryReview.ts';
import {createAppServer} from '../src/server.ts';
import type {AddressInfo} from 'node:net';
const context:GroceryContext={healthConditions:['noConcern'],dietaryRestrictions:[],store:{name:'Wegmans',town:'Northborough',state:'MA',branch:'9102 Shops Way'}};
const url=(i:number)=>'https://www.wegmans.com/shop/product/fixture-'+i;
const urls=new Set([0,1,2,3].map(url));
const row=(i:number)=>({title:i?'Fixture Marinara '+i:'Fixture Parmesan Romano Sauce',nutrition:{sodiumMg:i?100:620,proteinG:i?2:3,sugarsG:7,carbohydrateG:12,transFatG:null},rating:i?'healthy':'not_healthy',
 reasons:[i?'Lower sodium':'High sodium'],uncertainties:[],source_url:url(i),image_url:null,store:'Wegmans',aisle:null});
const fixture=()=>({product:row(0),alternatives:[row(1),row(2),row(3)]});
const adapt=(f:unknown=fixture(),c=context,u=urls)=>adaptSimpleGroceryAnswer(f,c,u);
test('partial sourced nutrients retain model rating and three suggestions without package or serving requirements',()=>{
 const {review}=adapt();groceryWireSchema.parse(review);
 assert.equal(review.original?.nutrition.sodiumMg,620);assert.equal(review.original?.nutrition.transFatG,null);
 assert.equal(review.original?.assessment.rating,'not_healthy');assert.equal(review.original?.assessment.reasons[0].text,'High sodium');
 assert.equal(review.original?.serving.grams,null);assert.equal(review.original?.identity.size,null);
 assert.equal(review.recommendations.length,3);assert.equal(review.recommendations[0].benefits[0].text,'Lower sodium');
 assert.equal(review.recommendations[0].comparisonBasis.kind,'not_comparable');
 assert.ok(review.original?.assessment.limitations.some(s=>s.includes('quantity')));
});
test('one missing value cannot erase the rest, and missing values never become zero',()=>{
 const f:any=fixture();f.product.nutrition.proteinG=null;
 const r=adapt(f).review;assert.equal(r.original?.nutrition.proteinG,null);assert.equal(r.original?.nutrition.sodiumMg,620);
 assert.equal(r.original?.assessment.rating,'not_healthy');assert.equal(r.recommendations.length,3);
});
test('invalid or inconsistent individual nutrient is removed without discarding supported facts',()=>{
 const f:any=fixture();f.product.nutrition.proteinG=-10;f.product.nutrition.sugarsG=80;
 const r=adapt(f);assert.equal(r.review.original?.nutrition.proteinG,null);assert.equal(r.review.original?.nutrition.sugarsG,null);
 assert.equal(r.review.original?.nutrition.sodiumMg,620);assert.equal(r.review.original?.assessment.rating,'not_healthy');
 assert.ok(r.audit.some(a=>a.code==='invalid_proteinG'));assert.ok(r.audit.some(a=>a.code==='inconsistent_sugarsG'));
});
test('unreturned or unsafe source cannot certify remembered nutrition; identity remains useful',()=>{
 for(const u of ['https://www.wegmans.com/shop/unreturned','http://127.0.0.1/private','https://www.wegmans.com/']){
  const f=fixture();f.product.source_url=u;const r=adapt(f).review;
  assert.equal(r.original?.identity.name,f.product.title);assert.equal(r.original?.nutrition.sodiumMg,null);
  assert.equal(r.original?.assessment.rating,null);assert.equal(r.recommendations.length,0);
 }
});
test('no nutrition cannot become a green rating; original-only results remain valid',()=>{
 const f=fixture();f.product.nutrition={} as any;f.product.rating='healthy';assert.equal(adapt(f).review.original?.assessment.rating,null);
 const none=adapt({product:null,alternatives:[]}).review;assert.equal(none.status,'unidentified');
});
test('known trans fat keeps a red warning even if model says healthy',()=>{
 const f=fixture();f.product.nutrition.transFatG=0.2 as any;f.product.rating='healthy';
 const r=adapt(f);assert.equal(r.review.original?.assessment.rating,'not_healthy');assert.equal(r.review.original?.assessment.reasons[0].text,'Contains trans fat');
});
test('dietary and kidney gates stay closed without reviewed evidence; partial nutrition remains visible',()=>{
 for(const c of [{...context,dietaryRestrictions:['glutenFree'] as const},{...context,healthConditions:['ckd'] as const}]){
  const r=adapt(fixture(),c as unknown as GroceryContext).review;assert.equal(r.original?.nutrition.sodiumMg,620);
  assert.equal(r.original?.assessment.rating,null);assert.equal(r.recommendations.length,0);
 }
});
test('duplicates are removed, meaningful red suggestions are last, and no exact comparison is invented',()=>{
 const f=fixture();f.alternatives[0].rating='not_healthy';f.alternatives[2]=structuredClone(f.alternatives[1]);
 const r=adapt(f).review;assert.equal(r.recommendations.length,2);assert.equal(r.recommendations[1].food.assessment.rating,'not_healthy');
 assert.ok(r.recommendations[1].tradeoffs[0].includes('Still rated red'));assert.equal(r.recommendations[1].comparisonBasis.amount,null);
});
test('a chain-wide listing does not imply a branch aisle or stock; malformed URLs do not crash review',()=>{
 const f:any=fixture();f.product.aisle={number:7,section:'Sauce',store:'Wegmans',town:'Northborough',state:'MA',source_url:url(0)};
 assert.equal(adapt(f).review.original?.availability.aisleNumber,null);assert.equal(adapt(f).review.original?.availability.status,'chain_listed');
 f.product.aisle.source_url='not a url';assert.equal(adapt(f).review.original?.availability.aisleNumber,null);
 f.product.source_url='not a url';assert.equal(adapt(f).review.original?.assessment.rating,null);
});
test('simple prompt and response format omit size requirements and private health context',()=>{
 const r=buildGroceryRequest('image',{...context,healthConditions:['diabetes','hypertension'],dietaryRestrictions:['eggFree']},'gemini-3.5-flash-lite');
 const serialized=JSON.stringify(r);assert.doesNotMatch(serialized,/package_size|serving_size|servingGrams|diabetes|hypertension/);
 assert.match(serialized,/Wegmans/);assert.doesNotMatch(serialized,/eggFree|at most six|search_products/);assert.deepEqual(r.tools,[{type:'google_search'}]);
 assert.ok(serialized.length<20000);
});
test('v6 JSON endpoint accepts the simplified answer and preserves installed-client response shape',async()=>{
 const provider=createGroceryProvider({model:'gemini-3.5-flash-lite',transport:async()=>({status:'completed',model:'gemini-3.5-flash-lite',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(fixture())}]}],boundedSearch:{limit:6,attempted:1,records:[{query:'fixture nutrition',status:'ok'}],urls:[...urls]}})});
 const server=createAppServer({accessMode:'open-beta',groceryReviews:provider});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const imageBase64=Buffer.from('ffd8ffc00011080020002003011100021100031100ffda000c03010002110311003f0000ffd9','hex').toString('base64');
  const response=await fetch('http://127.0.0.1:'+(server.address() as AddressInfo).port+'/v6/photos/recognize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageBase64,context,consentVersion:GROCERY_CONSENT})});
  assert.equal(response.status,200);assert.match(response.headers.get('content-type')??'',/application\/json/);
  const result=groceryResultSchema.parse(await response.json());assert.equal(result.schemaVersion,6);
  assert.equal(result.original?.rating,'not_healthy');assert.equal(result.original?.nutrition.sodiumMg,620);assert.equal(result.alternatives.length,3);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

test('manufacturer nutrition and a separate grounded retailer listing remain independent',()=>{
 const f:any=fixture();const manufacturer='https://www.example.com/fixture/product';
 f.product.source_url=manufacturer;f.product.retailer_url=url(0);
 const r=adapt(f,context,new Set([...urls,manufacturer])).review;
 assert.equal(r.original?.nutrition.sodiumMg,620);assert.equal(r.original?.availability.status,'chain_listed');
 assert.equal(r.original?.availability.sourceId,'original-listing');
 assert.ok(r.original?.assessment.limitations.includes('Aisle not found for this branch.'));
});
test('missing retailer/aisle is explicitly visible without erasing sourced nutrition',()=>{
 const f:any=fixture();const manufacturer='https://www.example.com/fixture/product';f.product.source_url=manufacturer;
 const result=adapt(f,context,new Set([...urls,manufacturer]));
 assert.equal(result.review.original?.assessment.rating,'not_healthy');assert.equal(result.review.original?.availability.status,'unknown');
 assert.ok(result.review.original?.assessment.limitations.some(s=>s==='Store availability and aisle not confirmed for Wegmans.'));
 assert.ok(result.audit.some(a=>a.foodId==='original'&&a.code==='store_listing_unconfirmed'));
 assert.ok(result.audit.some(a=>a.foodId==='original'&&a.code==='aisle_not_returned'));
});
test('retailer link must be returned by the lookup and match the stated chain',()=>{
 for(const listing of ['https://www.wegmans.com/shop/unreturned','https://www.target.com/p/fixture']){
  const f:any=fixture();const manufacturer='https://www.example.com/fixture/product';f.product.source_url=manufacturer;f.product.retailer_url=listing;
  const r=adapt(f,context,new Set([...urls,manufacturer,'https://www.target.com/p/fixture'])).review;
  assert.equal(r.original?.availability.status,'unknown');assert.equal(r.original?.assessment.rating,'not_healthy');
 }
});
test('branch aisle uses returned source text, without requiring the town in the URL',()=>{
 const f:any=fixture();f.product.aisle={number:7,section:'Sauces',store:'Wegmans',town:'Northborough',state:'MA',source_url:url(0)};
 const records=[{status:'ok',results:[{url:url(0),snippet:'Northborough, MA store. Fixture Parmesan Romano Sauce. Aisle 7, Sauces.'}]}];
 const r=adaptSimpleGroceryAnswer(f,context,urls,records).review;
 assert.equal(r.original?.availability.aisleNumber,'7');assert.equal(r.original?.availability.aisleEvidence,'branch_specific');
 for(const snippet of ['Northborough, MA. Aisle 17.','Burlington, MA. Aisle 7.','No store or aisle supplied.']){
  records[0].results[0].snippet=snippet;
  assert.equal(adaptSimpleGroceryAnswer(f,context,urls,records).review.original?.availability.aisleNumber,null);
 }
});

test('rejected alternative identity and pre-filter count remain visible in bounded diagnostics',async()=>{
 const f=fixture();f.alternatives=f.alternatives.slice(0,1);f.alternatives[0].source_url='https://www.wegmans.com/shop/not-returned';
 const adapted=adapt(f);assert.equal(adapted.proposedCount,1);assert.equal(adapted.candidates.length,1);assert.equal(adapted.review.recommendations.length,0);
 const events:any[]=[];
 const provider=createGroceryProvider({model:'gemini-3.5-flash-lite',audit:{record:(_trace,event)=>events.push(event)},transport:async()=>({status:'completed',model:'gemini-3.5-flash-lite',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(f)}]}],boundedSearch:{limit:6,attempted:1,records:[{query:'fixture nutrition',status:'ok'}],urls:[...urls]}})});
 const imageBase64=Buffer.from('ffd8ffc00011080020002003011100021100031100ffda000c03010002110311003f0000ffd9','hex').toString('base64');
 const result=await provider.recognize({imageBase64,context,consentVersion:GROCERY_CONSENT},new AbortController().signal);
 assert.equal(result.alternatives.length,0);
 const decision=events.find(e=>e.kind==='decision');assert.ok(decision);assert.equal(decision.proposed,1);assert.equal(decision.accepted,0);
 assert.equal(decision.alternatives[0].food.identity.name,f.alternatives[0].title);assert.equal(decision.alternatives[0].disposition,'rejected');
 assert.ok(decision.alternatives[0].reasons.includes('nutrition_source_unconfirmed'));
 assert.doesNotMatch(JSON.stringify(events),/Northborough|9102|imageBase64|not-returned/);
});

test('removing Google tracking from a returned product link preserves nutrients and alternatives',()=>{
 const f=fixture();f.product.source_url=url(0)+'?srsltid=tracking';f.alternatives[0].source_url=url(1)+'?utm_source=google';
 const r=adapt(f,context,new Set([url(0),url(1)+'?srsltid=different',url(2),url(3)]));
 assert.equal(r.review.original?.nutrition.sodiumMg,620);assert.equal(r.review.recommendations.length,3);
 assert.ok(!r.audit.some(a=>a.code.startsWith('source_not_grounded')));
 f.alternatives[0].source_url=url(1)+'?variant=other';assert.equal(adapt(f).review.recommendations.length,2);
});

test('structured Gemini output asks for every core nutrient but permits unknown values',()=>{
 const request=buildGroceryRequest('image',context,'gemini-3.5-flash-lite');
 const schema=(request as any).response_format.schema;
 const core=['caloriesKcal','totalFatG','saturatedFatG','transFatG','sugarsG','addedSugarsG','carbohydrateG','sodiumMg','fiberG','proteinG'];
 for(const food of [schema.properties.product,schema.properties.alternatives.items]){
  assert.deepEqual(food.properties.nutrition.required,core);
  for(const nutrient of core)assert.ok(food.properties.nutrition.properties[nutrient].type.includes('null'));
 }
 assert.match(JSON.stringify(request),/Give me the nutrients table/);
});

test('verified redirect page text can substantiate an aisle without accepting a guessed URL',()=>{
 const f:any=fixture();const destination=url(0)+'-current';f.product.source_url=destination;
 f.product.aisle={number:7,section:'Sauce',store:'Wegmans',town:'Northborough',state:'MA',source_url:destination};
 const records=[{status:'ok',results:[{url:url(0),resolvedUrl:destination,pageText:'Wegmans Northborough MA. Pasta Sauce Aisle 7.'}]}];
 const r=adaptSimpleGroceryAnswer(f,context,new Set([...urls,destination]),records);
 assert.equal(r.review.original?.availability.aisleNumber,'7');
});

test('native Gemini missing, null, unusable or ungrounded nutrition links never erase a valid answer',()=>{
 for(const link of [undefined,null,'not a URL','https://maker.example.com/unreturned',123]){
  const f:any=fixture();f.product.source_url=link;for(const row of f.alternatives)row.source_url=link;
  const r=adaptSimpleGroceryAnswer(f,context,new Set(),[],{allowUnverifiedEstimates:true}).review;
  assert.equal(r.original?.nutrition.sodiumMg,620);assert.equal(r.original?.assessment.rating,'not_healthy');assert.equal(r.recommendations.length,3);assert.ok(r.original?.assessment.limitations.some(l=>l.includes('AI estimates')));
 }
});
test('missing optional JSON entries are localized to their field or card, not the entire answer',()=>{
 const f:any=fixture();delete f.product.reasons;delete f.product.uncertainties;delete f.product.store;delete f.product.image_url;delete f.product.retailer_url;
 f.product.aisle={section:'Cereals'};delete f.alternatives[0].reasons;delete f.alternatives[1].title;f.alternatives[2].nutrition=null;
 const r=adaptSimpleGroceryAnswer(f,context,urls,[],{allowUnverifiedEstimates:true}).review;
 assert.equal(r.original?.assessment.rating,'not_healthy');assert.deepEqual(r.original?.assessment.reasons,[]);assert.equal(r.original?.availability.storeName,null);assert.equal(r.original?.availability.aisleNumber,null);
 assert.equal(r.recommendations.length,1);assert.equal(r.recommendations[0].food.identity.name,'Fixture Marinara 1');assert.deepEqual(r.recommendations[0].benefits,[]);
 const missing=adaptSimpleGroceryAnswer({alternatives:[]},context,new Set(),[],{allowUnverifiedEstimates:true}).review;assert.equal(missing.original,null);assert.equal(missing.status,'unidentified');
});

test('sodium-only evidence retains a returned adverse rating without requiring fiber or Tier 2 fields',()=>{
 const r=adaptSimpleGroceryAnswer({product:{title:'Sauce',rating:'not_healthy',nutrition:{sodiumMg:620},reasons:['High sodium']},alternatives:[{title:'Less sodium sauce',rating:'healthy',nutrition:{sodiumMg:120},reasons:['Less sodium']}]},context,new Set(),[],{allowUnverifiedEstimates:true}).review;
 assert.equal(r.original?.assessment.rating,'not_healthy');assert.equal(r.original?.nutrition.fiberG,null);assert.equal(r.original?.nutrition.proteinG,null);assert.equal(r.original?.nutrition.transFatG,null);assert.equal(r.recommendations.length,1);
 const missing=adaptSimpleGroceryAnswer({product:{title:'Unknown sauce',rating:'healthy',nutrition:{}}},context,new Set(),[],{allowUnverifiedEstimates:true}).review;
 assert.equal(missing.original?.assessment.rating,null);
});
