import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptApprovedGroceryAnswer,exactSourceUrl} from '../src/geminiPhotoAdapter.ts';
import {resolveGeminiGroundingSources} from '../src/geminiGroundingSources.ts';
import {parseGroceryResponse,buildGroceryRequest,createGroceryProvider,createGroceryTransport,GroceryProviderError} from '../src/groceryReviewProvider.ts';
import {validateGroceryReview} from '../src/groceryReviewValidation.ts';
import {GROCERY_CONSENT,type GroceryContext} from '../../../packages/core/src/groceryReview.ts';
const context:GroceryContext={healthConditions:['noConcern'],dietaryRestrictions:[],store:{name:'Wegmans',town:'Northborough',state:'MA',branch:'9102 Shops Way'}};
const url=(i:number)=>'https://www.wegmans.com/shop/product/fixture-'+i;
const redirect='https://vertexaisearch.cloud.google.com/grounding-api-redirect/'+'a'.repeat(40);
function fixture(){
 const nutrients={calories:80,total_fat:2,saturated_fat:0.5,trans_fat:0,sodium:620,carbohydrates:12,dietary_fiber:3,total_sugars:7,added_sugars:2,protein:3,potassium:480,calcium:50,iron:0.7};
 const row=(i:number,sodium:number)=>({identity:{brand:'Fixture',product_name:i?'Marinara '+i:'Parmesan Romano Pasta Sauce',variant:null,package_size:'24 oz',category:'pasta sauce'},
  serving_size:'1/2 cup (125 g)',nutrition:{...nutrients,sodium},nutrition_evidence_status:'web_verified',nutrition_source_ids:Object.fromEntries(Object.keys(nutrients).map(k=>[k,'s'+i])),verification_notes:null,
  rating:i?'neutral':'not_healthy',reasons:['Less sugar'],tradeoffs:[],store_name:'Wegmans',store_address:'9102 Shops Way',town:'Northborough',state:'MA',availability_status:'retailer_listing_only',aisle:'7',section:'Pasta',retailer_url:url(i),image_url:null});
 const rows=[row(0,620),row(1,400),row(2,300),row(3,200)];
 return {shopping_location:{store_name:'Wegmans'},product:rows[0],alternatives:rows.slice(1),alternatives_shortfall:null,sources:rows.map((r,i)=>({source_id:'s'+i,url:url(i),title:r.identity.product_name,matched_product:'Fixture '+r.identity.product_name,serving_size:r.serving_size,supported_nutrients:Object.keys(nutrients),evidence_excerpt:'Sodium '+r.nutrition.sodium+' mg.'}))};
}
const checked=(value:unknown=fixture(),c=context,urls=new Set([0,1,2,3].map(url)))=>validateGroceryReview(adaptApprovedGroceryAnswer(value,c,urls),c,urls).review;
test('approved answer maps nutrients, preserves three eligible alternatives and sodium-first explanations',()=>{
 const r=checked();assert.equal(r.original?.nutrition.sodiumMg,620);assert.equal(r.recommendations.length,3);assert.equal(r.recommendations[0].benefits[0].text,'Less sodium');
 assert.equal(r.original?.identity.category,'pasta sauce');assert.equal(r.recommendations[0].food.availability.aisleNumber,null);
});
test('source id aliases and null evidence are accepted without inventing a zero',()=>{
 const f:any=fixture();f.product.nutrition.added_sugars=null;f.product.nutrition_source_ids.added_sugars=null;
 for(const s of f.sources){s.id=s.source_id;delete s.source_id;}
 const r=checked(f);assert.equal(r.original?.nutrition.addedSugarsG,null);assert.equal(r.original?.assessment.rating,null);assert.equal(r.recommendations.length,0);
});
test('homepages, misspelled and private URLs cannot prove nutrients',()=>{
 for(const u of ['https://www.wegmans.com/','https://www.uberats.com/x','http://127.0.0.1/test','https://192.168.1.2/test']){
  assert.equal(exactSourceUrl(u),null);const f=fixture();f.sources[0].url=u;assert.equal(checked(f,context,new Set([u])).original?.nutrition.sodiumMg,null);
 }
});
test('no citation provenance means no numerical facts, rating or alternatives',()=>{
 const r=checked(fixture(),context,new Set());assert.equal(r.original?.nutrition.sodiumMg,null);assert.equal(r.original?.assessment.rating,null);assert.equal(r.recommendations.length,0);
});
test('variant and serving source conflicts do not cross-populate facts',()=>{
 for(const field of ['matched_product','serving_size'] as const){const f=fixture();f.sources[0][field]=field==='matched_product'?'Fixture Tomato Basil Pasta Sauce':'1/4 cup (60 g)';assert.equal(checked(f).original?.nutrition.sodiumMg,null);}
});
test('equal-mass checks reject the smaller-serving illusion and duplicates',()=>{
 const f=fixture();f.alternatives[0].serving_size='1 tbsp (20 g)';f.sources[1].serving_size='1 tbsp (20 g)';
 assert.equal(checked(f).recommendations.length,2);
 const g=fixture();g.alternatives[1]=structuredClone(g.alternatives[0]);assert.equal(checked(g).recommendations.length,2);
});
test('nutrition source alone cannot prove gluten suitability or aisle',()=>{
 const r=checked(fixture(),{...context,dietaryRestrictions:['glutenFree']});assert.equal(r.recommendations.length,0);assert.equal(r.original?.assessment.rating,null);
 assert.equal(checked().recommendations[0].food.availability.aisleNumber,null);
});
test('healthy original does not receive an unrequested complements message',()=>{
 const f=fixture();Object.assign(f.product.nutrition,{sodium:100});f.product.rating='healthy';f.alternatives=[];
 const r=checked(f);assert.equal(r.original?.assessment.rating,'healthy');assert.equal(r.recommendationMode,'none');assert.equal(r.recommendationShortfall,null);
});
test('Interactions counts completed searches and excludes failed calls and thoughts',()=>{
 const raw={status:'completed',model:'gemini-3.5-flash-lite',usage:{total_input_tokens:100,total_output_tokens:200,total_cached_tokens:20},steps:[
  {type:'thought',text:'private reasoning'},
  {type:'google_search_call',id:'good',arguments:{queries:['product nutrition']}},
  {type:'google_search_call',id:'bad',arguments:{queries:['failed']}},
  {type:'google_search_result',call_id:'bad',is_error:true,result:[]},
  {type:'google_search_result',call_id:'good',result:[{search_suggestions:'<div>Google Search</div>'}]},
  {type:'model_output',content:[{type:'text',text:JSON.stringify(fixture()),annotations:[{type:'url_citation',url:url(0)}]}]}]};
 const p=parseGroceryResponse(raw,'gemini-3.5-flash-lite');assert.equal(p.searches,1);assert.deepEqual(p.queries,['product nutrition']);assert.equal(p.inputTokens,100);assert.equal(p.outputTokens,200);assert.equal(p.cachedTokens,20);assert.ok(p.urls.has(url(0)));
});
test('Google redirect resolution only contacts the allowed Google host with redirects disabled',async()=>{
 const f=fixture();f.sources[0].url=redirect;let calls=0;
 const r=await resolveGeminiGroundingSources(f,new Set(),1,new AbortController().signal,async(u,options)=>{
  calls++;assert.equal(u,redirect);assert.equal(options?.redirect,'manual');return new Response(null,{status:302,headers:{location:url(0)}});
 });
 assert.equal(calls,1);assert.ok(r.urls.has(url(0)));assert.equal((r.value as any).sources[0].url,url(0));
});
test('bad Google redirect destinations, failed redirect and absent search stay unsupported',async()=>{
 for(const destination of ['http://127.0.0.1/x','https://www.wegmans.com/']){
  const f=fixture();f.sources[0].url=redirect;
  const r=await resolveGeminiGroundingSources(f,new Set(),1,new AbortController().signal,async()=>new Response(null,{status:302,headers:{location:destination}}));
  assert.equal(r.urls.size,0);
 }
 let calls=0;const f=fixture();f.sources[0].url=redirect;
 await resolveGeminiGroundingSources(f,new Set(),0,new AbortController().signal,async()=>{calls++;return new Response();});assert.equal(calls,0);
});
test('conflicting source IDs fail rather than attach evidence to the wrong food',()=>{
 const f:any=fixture();f.sources[0].id='different';assert.throws(()=>checked(f),/conflicting_source/);
});
test('runtime native request shares only the public store, not private conditions or dietary details',()=>{
 const r=buildGroceryRequest('fixture',{...context,healthConditions:['hypertension','ckd'],dietaryRestrictions:['eggFree']},'gemini-3.5-flash-lite');
 assert.equal(r.store,false);assert.equal((r.tools as any)[0].type,'google_search');assert.match((r.input as any)[0].text,/Wegmans/);assert.doesNotMatch(JSON.stringify(r),/eggFree|hypertension|ckd/);
});
test('HTTP 402 and 429 are provider limits, not connectivity failures or automatic retries',async()=>{
 for(const status of [402,429]){let calls=0;const t=createGroceryTransport('gemini-3.5-flash-lite','fixture',async()=>{calls++;return new Response('{}',{status});});
 await assert.rejects(t({},new AbortController().signal),(e:unknown)=>e instanceof GroceryProviderError&&e.code==='PROVIDER_QUOTA');assert.equal(calls,1);}
});
test('successful text without a real search is not a grounded review',async()=>{
 let calls=0;const provider=createGroceryProvider({model:'gemini-3.5-flash-lite',transport:async()=>{calls++;return {status:'completed',model:'gemini-3.5-flash-lite',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(fixture())}]}]};}});
 const imageBase64=Buffer.from('ffd8ffc00011080020002003011100021100031100ffda000c03010002110311003f0000ffd9','hex').toString('base64');
 await assert.rejects(provider.recognize({imageBase64,context,consentVersion:GROCERY_CONSENT},new AbortController().signal),/PROVIDER_GROUNDING_MISSING/);assert.equal(calls,1);
});

test('equivalent serving text uses the same explicit gram weight without relaxing variant checks',()=>{
 const f=fixture();f.sources[0].serving_size='0.5 cup (125 grams)';
 assert.equal(checked(f).original?.nutrition.sodiumMg,620);
 f.sources[0].serving_size='100 grams';assert.equal(checked(f).original?.nutrition.sodiumMg,null);
});


test('diagnostics distinguish absent values, source linkage, variant and serving failures without weakening checks',()=>{
 const checks=[
  {change:(f:any)=>{f.product.nutrition.trans_fat=null;},reason:'provider_value_missing_transFatG'},
  {change:(f:any)=>{f.product.nutrition_source_ids.sodium=null;},reason:'source_id_missing_sodiumMg'},
  {change:(f:any)=>{f.sources[0].url='https://www.wegmans.com/shop/not-returned';},reason:'source_url_not_grounded_sodiumMg'},
  {change:(f:any)=>{f.sources[0].matched_product='Fixture Tomato Basil Pasta Sauce';},reason:'source_identity_mismatch_sodiumMg'},
  {change:(f:any)=>{f.sources[0].serving_size='1 cup';},reason:'source_serving_weight_missing_sodiumMg'},
  {change:(f:any)=>{f.sources[0].serving_size='60 g';},reason:'source_serving_weight_mismatch_sodiumMg'},
  {change:(f:any)=>{f.sources[0].supported_nutrients=f.sources[0].supported_nutrients.filter((n:string)=>n!=='sodium');},reason:'source_nutrient_not_listed_sodiumMg'}
 ];
 for(const c of checks){const f=fixture(),audit:{foodId:string;code:string}[]=[];c.change(f);const wire=adaptApprovedGroceryAnswer(f,context,new Set([0,1,2,3].map(url)),audit);const result=validateGroceryReview(wire,context,new Set([0,1,2,3].map(url)));assert.ok(audit.some(x=>x.foodId==='original'&&x.code===c.reason),c.reason);assert.equal(result.review.original?.assessment.rating,null);}
});
