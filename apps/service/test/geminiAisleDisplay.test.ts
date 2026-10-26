import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptSimpleGroceryAnswer} from '../src/geminiSimpleReview.ts';
import {createGroceryProvider} from '../src/groceryReviewProvider.ts';
import {createRetailerLookup} from '../src/groceryRetailers.ts';
import {mergeAlternativeSupplement} from '../src/groceryAlternativeSupplement.ts';
import {groceryAisleLabel,groceryResultSchema,groceryWireSchema,GROCERY_CONSENT,type GroceryContext} from '../../../packages/core/src/groceryReview.ts';
const context:GroceryContext={healthConditions:[],dietaryRestrictions:[],store:{name:'Wegmans',town:'Northborough',state:'MA',branch:null}};
const aisle={number:'10',section:'07B - L',store:'Wegmans',town:'Northborough',state:'MA',source_url:null};
const food=(title:string,rating='healthy')=>({title,rating,nutrition:{sodiumMg:rating==='healthy'?120:620,proteinG:2,totalFatG:1,transFatG:0},store:'Wegmans',aisle,reasons:['Lower sodium']});
const answer=()=>({product:food('Fixture original','not_healthy'),alternatives:[food('Fixture low sodium sauce'),food('Fixture second sauce')]});
const adapt=(data:unknown=answer(),c=context)=>adaptSimpleGroceryAnswer(data,c,new Set(),[],{allowUnverifiedEstimates:true,preserveReturnedAisle:true});
test('Gemini aisle without URL survives the existing wire contract without claiming branch evidence or stock',()=>{
 const r=groceryWireSchema.parse(adapt().review);
 for(const f of [r.original!,...r.recommendations.map(x=>x.food)]){
  assert.equal(groceryAisleLabel(f),'Aisle 10 · 07B - L');assert.equal(f.availability.aisleEvidence,'unknown');assert.equal(f.availability.aisleSourceId,null);assert.equal(f.availability.status,'unknown');
 }
 assert.equal(r.original!.nutrition.sodiumMg,620);assert.equal(r.recommendations.length,2);
 assert.ok(adapt().audit.some(a=>a.code==='model_aisle_retained'));
});
test('absent aisle stays absent; zero, section-only, missing branch fields and malformed source links remain usable',()=>{
 for(const a of [null,{number:0},{section:'Pasta sauces'},{...aisle,source_url:'http://127.0.0.1/private',town:null,state:null}]){
  const raw:any=answer();raw.product.aisle=a;const f=adapt(raw).review.original!;
  assert.equal(groceryAisleLabel(f),a===null?null:a.number===0?'Aisle 0':a.number===undefined?'Pasta sauces':'Aisle 10 · 07B - L');assert.equal(f.availability.aisleSourceId,null);
 }
 const raw:any=answer();raw.product.aisle={number:'x'.repeat(100),section:'Sauce\nsection'};
 const f=adapt(raw).review.original!;assert.equal(f.availability.aisleNumber?.length,60);assert.equal(f.availability.section,'Sauce section');
});
test('Gemini aisle change leaves nutrition consistency, positive trans-fat and dietary holds intact',()=>{
 const raw=answer();raw.product.rating='healthy';raw.product.nutrition.transFatG=0.2;
 assert.equal(adapt(raw).review.original!.assessment.rating,'not_healthy');
 for(const c of [{...context,dietaryRestrictions:['glutenFree']},{...context,healthConditions:['ckd']}]){
  const r=adapt(answer(),c as GroceryContext).review;assert.equal(r.original!.assessment.rating,null);assert.equal(r.recommendations.length,0);assert.equal(groceryAisleLabel(r.original!),'Aisle 10 · 07B - L');
 }
 const broken:any=answer();broken.product.nutrition.proteinG=-1;broken.product.nutrition.carbohydrateG=5;broken.product.nutrition.sugarsG=30;
 const f=adapt(broken).review.original!;assert.equal(f.nutrition.proteinG,null);assert.equal(f.nutrition.sugarsG,null);assert.ok(f.assessment.limitations.some(x=>x.includes('conflict')));
});
test('GPT duplicate cannot replace Gemini aisle or nutrient values',()=>{
 const first=adapt().review;const extra={alternatives:[{...food('Fixture low sodium sauce'),aisle:{...aisle,number:'13B - R'},nutrition:{sodiumMg:0}}]};
 const merged=mergeAlternativeSupplement(first,extra,context,new Set());
 assert.equal(merged.added,0);assert.deepEqual(merged.review.recommendations,first.recommendations);
 assert.equal(groceryAisleLabel(merged.review.recommendations[0].food),'Aisle 10 · 07B - L');
});
test('retailer stage keeps Gemini aisle at the named current or nearby store even without selected store',async()=>{
 let calls=0;const lookup=createRetailerLookup(async()=>{calls++;throw Error('No extra lookup expected');},()=>{throw Error('No parse expected');},process.cwd());
 for(const c of [context,{...context,store:null}]){
  const r=adapt().review;r.recommendations[1].food.availability.storeName='Target';
  const out=await lookup(r,c,new AbortController().signal);
  assert.equal(groceryAisleLabel(out.review.recommendations[0].food),'Aisle 10 · 07B - L');assert.equal(groceryAisleLabel(out.review.recommendations[1].food),'Aisle 10 · 07B - L');
  assert.equal(out.review.recommendations[1].food.availability.storeName,'Target');
 }assert.equal(calls,0);
});
test('returned aisle belongs to its own retailer, never another chain listing',()=>{
 const raw:any=answer();const url='https://www.wegmans.com/shop/product/fixture-sauce';raw.alternatives[0]={...raw.alternatives[0],source_url:url,aisle:{...aisle,store:'Walmart'}};
 const r=adaptSimpleGroceryAnswer(raw,context,new Set([url]),[],{allowUnverifiedEstimates:true,preserveReturnedAisle:true}).review;
 assert.equal(r.recommendations[0].food.availability.storeName,'Walmart');assert.equal(r.recommendations[0].food.availability.sourceId,null);
 assert.equal(r.recommendations[0].food.availability.status,'unknown');assert.equal(groceryAisleLabel(r.recommendations[0].food),'Aisle 10 · 07B - L');
});
test('streaming and final Gemini provider responses keep the same aisle without new searches',async()=>{
 const payload=answer(),progress:any[]=[];let calls=0;
 const provider=createGroceryProvider({model:'gemini-3.5-flash-lite',transport:async(_r,_s,h)=>{
  calls++;h?.onText?.(JSON.stringify(payload));return {status:'completed',steps:[{type:'google_search_call',id:'s',arguments:{queries:['fixture nutrition']}},{type:'google_search_result',call_id:'s',result:[]},{type:'model_output',content:[{type:'text',text:JSON.stringify(payload)}]}]};
 }});
 const imageBase64=Buffer.from('ffd8ffc00011080020002003011100021100031100ffda000c03010002110311003f0000ffd9','hex').toString('base64');
 const result=groceryResultSchema.parse(await provider.recognize({imageBase64,context,consentVersion:GROCERY_CONSENT},new AbortController().signal,v=>progress.push(v)));
 assert.equal(calls,1);assert.ok(progress.length);for(const v of [...progress,result])assert.equal(groceryAisleLabel(v.review.recommendations[0].food),'Aisle 10 · 07B - L');
});
