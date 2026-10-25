import {reviewGroceryPhoto} from '../../../packages/core/src/groceryClient.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {groceryWireSchema,groceryRequestSchema,groceryResultSchema,groceryAisleLabel,GROCERY_CONSENT,type GroceryFood,type GroceryContext,type GroceryWire} from '../../../packages/core/src/groceryReview.ts';
import {groceryContext} from '../../../packages/core/src/groceryContext.ts';
import {validateGroceryReview} from '../src/groceryReviewValidation.ts';
import {buildGroceryRequest,parseGroceryResponse,createGroceryProvider,createGroceryTransport,GroceryProviderError} from '../src/groceryReviewProvider.ts';
import {createAppServer} from '../src/server.ts';
import type {AddressInfo} from 'node:net';
const url='https://www.wegmans.com/shop/product/fixture-sauce';
const context:GroceryContext={healthConditions:['hypertension'],dietaryRestrictions:[],store:{name:'Wegmans',town:'Northborough',state:'MA',branch:'9102 Shops Way'}};
function food(id='original',sodium=620):GroceryFood{
 const nutrition={caloriesKcal:80,totalFatG:2,saturatedFatG:0.5,transFatG:0,sodiumMg:sodium,carbohydrateG:12,fiberG:3,sugarsG:7,addedSugarsG:2,proteinG:3,potassiumMg:400,calciumMg:null,ironMg:null,magnesiumMg:null,phosphorusMg:null,vitaminDmcg:null};
 return {id,identity:{kind:'packaged',status:'identified',brand:'Fixture',name:id==='original'?'Tomato Sauce':'Marinara '+id,variant:null,size:'24 oz',category:'pasta sauce'},
 serving:{text:'1/2 cup (125 g)',grams:125,milliliters:null,basis:'package_label',sourceId:'s1'},nutrition,
 nutrientEvidence:Object.entries(nutrition).filter(([,v])=>v!==null).map(([nutrient])=>({nutrient:nutrient as keyof typeof nutrition,sourceId:'s1'})),
 ingredients:null,ingredientSourceId:null,dietaryEvidence:[],assessment:{rating:sodium>=460?'not_healthy':'neutral',primaryConcern:'sodiumMg',highlightNutrients:['sodiumMg'],reasons:[{text:'High sodium per serving',nutrientKeys:['sodiumMg'],sourceIds:['s1']}],limitations:[]},
 image:{kind:'none',url:null,sourceId:null},
 availability:{status:'branch_listed',storeName:'Wegmans',town:'Northborough',state:'MA',branch:'9102 Shops Way',sourceId:'s1',aisleNumber:'A12',section:'Pasta sauces',aisleSourceId:'s1',aisleEvidence:'branch_specific'}};
}
function fixture():GroceryWire{
 return {schemaVersion:'gemini-grocery-review-v1',status:'complete',original:food(),recommendationMode:'alternatives',
 recommendations:[400,350,200].map((s,i)=>({type:'alternative',food:food('alternative'+i,s),comparisonBasis:{kind:'equal_mass',amount:125,unit:'g'},benefits:[{text:'Less sugar',nutrientKeys:['sugarsG'],sourceIds:['s1']}],reasonShortfall:null,tradeoffs:[]})),
 recommendationShortfall:null,sources:[{id:'s1',kind:'retailer',url,title:'Fixture nutrition label'}],safetyReminder:'Check the label.'};
}
const validate=(f=fixture(),c=context,urls=new Set([url]))=>validateGroceryReview(f,c,urls);
test('three category-appropriate alternatives pass and sodium explanation comes first',()=>{
 const {review}=validate();assert.equal(review.original?.nutrition.sodiumMg,620);assert.equal(review.recommendations.length,3);
 assert.equal(review.original?.assessment.rating,'not_healthy');assert.equal(review.recommendations[0].benefits[0].text,'Less sodium');
});
test('nutrition without actual grounding is cleared, not remembered',()=>{
 const {review}=validate(fixture(),context,new Set());assert.equal(review.original?.nutrition.sodiumMg,null);assert.equal(review.original?.assessment.rating,null);assert.equal(review.recommendations.length,0);
});
test('missing nutrient source never becomes a zero or a green rating',()=>{
 const f=fixture();f.original!.nutrientEvidence=f.original!.nutrientEvidence.filter(e=>e.nutrient!=='transFatG');const {review}=validate(f);
 assert.equal(review.original?.nutrition.transFatG,null);assert.equal(review.original?.assessment.rating,null);
});
test('incorrect serving mass blocks a nutrition rating',()=>{
 const f=fixture();f.original!.serving.grams=1;const {review}=validate(f);assert.equal(review.original?.assessment.rating,null);assert.equal(review.recommendations.length,0);
});
test('missing mass does not treat milliliters as grams',()=>{
 const f=fixture();f.original!.serving.grams=null;f.original!.serving.milliliters=125;assert.equal(validate(f).review.original?.assessment.rating,null);
});
test('equal-weight checks reject a smaller-serving sodium illusion',()=>{
 const f=fixture();f.recommendations[0].food.serving.grams=20;const {review}=validate(f);assert.equal(review.recommendations.length,2);
});
test('duplicate variants do not pad the recommendations',()=>{
 const f=fixture();f.recommendations[1].food.identity={...f.recommendations[0].food.identity};assert.equal(validate(f).review.recommendations.length,2);
});
test('missing gluten-free proof prevents claiming suitability',()=>{
 const {review}=validate(fixture(),{...context,healthConditions:['celiac'],dietaryRestrictions:['glutenFree']});assert.equal(review.original?.assessment.rating,null);assert.equal(review.recommendations.length,0);
});
test('kidney concerns do not enable personalized potassium/protein advice',()=>{
 const {review}=validate(fixture(),{...context,healthConditions:['ckd']});assert.equal(review.original?.assessment.rating,null);assert.equal(review.recommendationMode,'none');
});
test('aisle accepts string/number, but wrong branch and wrong retailer are hidden',()=>{
 assert.equal(groceryAisleLabel(validate().review.original!),'Aisle A12 · Pasta sauces');
 const f=fixture();(f.original!.availability as any).aisleNumber=7;assert.equal(groceryAisleLabel(validate(f).review.original!),'Aisle 7 · Pasta sauces');
 f.original!.availability.branch='Other address';assert.equal(groceryAisleLabel(validate(f).review.original!),null);
 const g=fixture();g.sources[0].url='https://www.target.com/p/fixture';assert.equal(groceryAisleLabel(validate(g,context,new Set(['https://www.target.com/p/fixture'])).review.original!),null);
});
test('unsafe source URLs and unsupported medical statuses are rejected',()=>{
 const f=fixture();f.sources[0].url='http://127.0.0.1/private';assert.throws(()=>groceryWireSchema.parse(f));
 const g=fixture();(g.original!.assessment as any).rating='safe_for_celiac';assert.throws(()=>groceryWireSchema.parse(g));
});
test('request rejects names, lab results and raw coordinates',()=>{
 const base={imageBase64:'aaaaaaaa',consentVersion:GROCERY_CONSENT,context};
 for(const extra of [{name:'Person'},{labs:{ldl:150}},{latitude:42.3}])assert.equal(groceryRequestSchema.safeParse({...base,context:{...context,...extra}}).success,false);
});
test('context uses reviewed store address and omits all unrelated profile fields',()=>{
 const c=groceryContext({primary:'hypertension',conditions:['hypertension'],restrictions:[]},{id:'way/137270170',name:'Wegmans',address:'9102 Shops Way Northborough 01532',coordinates:{latitude:42,longitude:-71},polygon:null,sourceUrl:'https://www.openstreetmap.org/way/137270170'});
 assert.equal(c.store?.town,'Northborough');assert.equal(c.store?.state,'MA');assert.equal(c.store?.branch,'9102 Shops Way, Northborough, MA 01532');assert.equal('coordinates' in c,false);
});
test('Gemini uses the approved prompt and Interactions search without changing the older GPT tool',()=>{
 const a=buildGroceryRequest('image',context,'gemini-3.5-flash-lite'),b=buildGroceryRequest('image',context,'gpt-6-luna');
 assert.equal(a.model,'gemini-3.5-flash-lite');assert.equal(a.store,false);
 assert.equal((a.tools as any)[0].type,'google_search');assert.equal((b.tools as any)[0].type,'web_search');assert.equal(b.store,false);
 assert.match((a.input as any)[0].text,/Give me the nutrients table for the product/);
 assert.match((a.input as any)[0].text,/Wegmans, Northborough/);
 assert.doesNotMatch(JSON.stringify(a),/api-key|hypertension/);
});
test('provider response records real token counts and excludes thought text',()=>{
 const raw={candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'private reasoning'},{text:JSON.stringify(fixture())}]},groundingMetadata:{groundingChunks:[{web:{uri:url}}],webSearchQueries:['fixture sauce nutrition'],searchEntryPoint:{renderedContent:'<div>Search</div>'}}}],usageMetadata:{promptTokenCount:100,candidatesTokenCount:200,thoughtsTokenCount:30}};
 const parsed=parseGroceryResponse(raw,'gemini-3.5-flash-lite');assert.equal(parsed.inputTokens,100);assert.equal(parsed.thinkingTokens,30);assert.equal(parsed.searches,1);assert.ok(parsed.urls.has(url));
});
test('quota and partial generation are classified, never misreported as connection failure',async()=>{
 const transport=createGroceryTransport('gemini-3.5-flash-lite','fixture-key',async()=>new Response('{}',{status:429}));
 await assert.rejects(transport({},new AbortController().signal),(e:unknown)=>e instanceof GroceryProviderError&&e.code==='PROVIDER_QUOTA');
 assert.throws(()=>parseGroceryResponse({candidates:[{finishReason:'MAX_TOKENS'}]},'gemini-3.5-flash-lite'),/PROVIDER_INCOMPLETE/);
});
test('disabled route advertises compatibility fallback without exposing secrets',async()=>{
 const server=createAppServer({accessMode:'open-beta'});await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const base='http://127.0.0.1:'+(server.address() as AddressInfo).port;const response=await fetch(base+'/v6/photos/capabilities');const body=await response.json();assert.equal(body.schemaVersion,6);assert.equal(body.available,false);assert.deepEqual(body.models,['gemini-3.5-flash-lite']);}
 finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
test('provider validates output and emits only bounded context-free diagnostics',async()=>{
 const events:any[]=[];const provider=createGroceryProvider({model:'gemini-3.5-flash-lite',audit:{record:(_trace,e)=>events.push(e)},transport:async()=>({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(fixture())}]},groundingMetadata:{groundingChunks:[{web:{uri:url}}],webSearchQueries:['fixture sauce nutrition']}}]})});
 const imageBase64=Buffer.from('ffd8ffc00011080020002003011100021100031100ffda000c03010002110311003f0000ffd9','hex').toString('base64');
 const result=await provider.recognize({imageBase64,context,consentVersion:GROCERY_CONSENT},new AbortController().signal);
 groceryResultSchema.parse(result);assert.equal(result.alternatives.length,3);assert.ok(events.some(e=>e.kind==='grocery_usage'));assert.doesNotMatch(JSON.stringify(events),/hypertension|Northborough|imageBase64|9102/);
});

test('grounded lower-sodium sauce accepts 1g less protein per 125g and discloses it',()=>{
 const f=fixture(),candidate=f.recommendations[0].food;
 candidate.nutrition.sodiumMg=50;candidate.nutrition.proteinG=2;
 const r=validate(f);assert.equal(r.review.recommendations.length,3);
 assert.equal(r.review.recommendations[0].benefits[0].text,'Less sodium');
 assert.ok(r.review.recommendations[0].tradeoffs.some(t=>t.includes('1 g less protein per 125 g')));
});
test('protein tradeoff cannot hide a weak sodium change, large loss, fiber loss or a portion trick',()=>{
 for(const alter of [
  (f:GroceryFood)=>{f.nutrition.sodiumMg=590;f.nutrition.proteinG=2;},
  (f:GroceryFood)=>{f.nutrition.sodiumMg=50;f.nutrition.proteinG=1.9;},
  (f:GroceryFood)=>{f.nutrition.sodiumMg=50;f.nutrition.proteinG=2;f.nutrition.fiberG=2;},
  (f:GroceryFood)=>{f.nutrition.sodiumMg=400;f.nutrition.proteinG=2;f.serving.grams=62.5;}
 ]){
  const f=fixture();alter(f.recommendations[0].food);assert.equal(validate(f).review.recommendations.length,2);
 }
});
test('red relative improvements retain red rating and sort after acceptable non-red alternatives',()=>{
 const f=fixture();f.original!.nutrition.sodiumMg=800;
 f.recommendations[0].food.nutrition.sodiumMg=550;
 f.recommendations[0].food.assessment.rating='not_healthy';
 const r=validate(f).review;assert.equal(r.recommendations.length,3);
 assert.equal(r.recommendations[2].food.id,'alternative0');assert.equal(r.recommendations[2].food.assessment.rating,'not_healthy');
 assert.ok(r.recommendations[2].tradeoffs.some(t=>t.includes('Still rated red')));
});
test('red 590mg and 600mg sauces do not meaningfully address original 620mg sodium',()=>{
 const f=fixture();f.recommendations[0].food.nutrition.sodiumMg=590;f.recommendations[1].food.nutrition.sodiumMg=600;
 f.recommendations[1].food.nutrition.addedSugarsG=0;
 const r=validate(f);assert.equal(r.review.recommendations.length,1);
 assert.ok(r.audit.some(i=>i.code==='original_priority_not_improved_sodiumMg'||i.code==='no_meaningful_improvement'));
});
test('red comparison and small protein tradeoff cannot bypass trans fat, missing source or allergy evidence',()=>{
 for(const change of [
  (f:GroceryFood)=>{f.nutrition.transFatG=0.1;},
  (f:GroceryFood)=>{f.nutrientEvidence=f.nutrientEvidence.filter(e=>e.nutrient!=='proteinG');}
 ]){
  const f=fixture();f.recommendations[0].food.nutrition.sodiumMg=50;f.recommendations[0].food.nutrition.proteinG=2;
  change(f.recommendations[0].food);assert.equal(validate(f).review.recommendations.length,2);
 }
 const f=fixture();f.recommendations[0].food.nutrition.sodiumMg=50;f.recommendations[0].food.nutrition.proteinG=2;
 assert.equal(validate(f,{...context,dietaryRestrictions:['glutenFree']}).review.recommendations.length,0);
});


test('actual v6 HTTP route and client deliver identity before final nutrition without a second request', {timeout:4000}, async()=>{
 const identity={status:'identified' as const,brand:'Fixture',name:'Tomato Sauce',variant:null,size:'24 oz'};
 let release!:()=>void;const gate=new Promise<void>(r=>{release=r;});let modelCalls=0,finished=false;
 const provider=createGroceryProvider({model:'gemini-3.5-flash-lite',transport:async(_request,_signal,hooks)=>{
  modelCalls++;hooks?.onIdentity?.(identity);await gate;
  return {candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(fixture())}]},groundingMetadata:{groundingChunks:[{web:{uri:url}}],webSearchQueries:['fixture sauce nutrition']}}]};
 }});
 const server=createAppServer({accessMode:'open-beta',groceryReviews:provider});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+(server.address() as AddressInfo).port;
 const imageBase64=Buffer.from('ffd8ffc00011080020002003011100021100031100ffda000c03010002110311003f0000ffd9','hex').toString('base64');
 let gotPreview!:(value:unknown)=>void;const preview=new Promise(r=>{gotPreview=r;});
 const controller=new AbortController();
 const pending=reviewGroceryPhoto(imageBase64,context,controller.signal,async(target,init)=>fetch(base+new URL(String(target)).pathname,init),undefined,undefined,gotPreview).then(result=>{finished=true;return result;});
 try{assert.deepEqual(await preview,identity);assert.equal(finished,false);assert.equal(modelCalls,1);release();const result=await pending;assert.equal(result.schemaVersion,6);assert.equal(result.alternatives.length,3);}
 finally{release();controller.abort();await pending.catch(()=>{});await new Promise<void>(r=>server.close(()=>r()));}
});
