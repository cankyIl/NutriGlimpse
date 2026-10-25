import {projectRoot} from '../src/projectPaths.ts';
import {GROCERY_SHOPPER_CONSENT,GROCERY_SHOPPER_LEGACY_CONSENT} from '../../../packages/core/src/groceryShopper.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroceryProvider,buildGroceryRequest,type GroceryTransport} from '../src/groceryReviewProvider.ts';
import {buildAlternativeRequest,supplementContext,mergeAlternativeSupplement,startAlternativeRequest,alternativeKey} from '../src/groceryAlternativeSupplement.ts';
import {adaptSimpleGroceryAnswer} from '../src/geminiSimpleReview.ts';
import {journalRecordSchema,type JournalRecord} from '../src/responseJournal.ts';
import {betaEventSchema} from '../src/betaDiagnostics.ts';
import {GROCERY_CONSENT,GROCERY_RESPONSE_CONSENT,GROCERY_PARALLEL_CONSENT,type GroceryContext,groceryResultSchema} from '../../../packages/core/src/groceryReview.ts';
const root=projectRoot;
const context:GroceryContext={healthConditions:['noConcern'],dietaryRestrictions:[],store:{name:'Wegmans',town:'Northborough',state:'MA',branch:null}};
const imageBase64=Buffer.from('ffd8ffc00011080020002003011100021100031100ffda000c03010002110311003f0000ffd9','hex').toString('base64');
const food=(title:string,rating='healthy',sodium=100)=>({title,rating,nutrition:{sodiumMg:sodium,proteinG:2,totalFatG:1,transFatG:0},reasons:['Less sodium'],store:'Wegmans'});
const original=(rating='not_healthy')=>food('Scanned sauce',rating,620);
const gem=(product=original(),alternatives:any[]=[])=>({status:'completed',model:'gemini-3.5-flash-lite',steps:[{type:'google_search_call',id:'s',arguments:{queries:['sauce nutrition']}},{type:'google_search_result',call_id:'s',result:[]},{type:'model_output',content:[{type:'text',text:JSON.stringify({product,alternatives})}]}],usage:{total_input_tokens:100,total_output_tokens:200}});
const gpt=(alternatives:any[],extra={})=>({status:'completed',output:[{type:'message',status:'completed',content:[{type:'output_text',text:JSON.stringify({alternatives,...extra})}]}],usage:{input_tokens:200,output_tokens:300}});
const input=(c=context)=>({imageBase64,context:c,consentVersion:GROCERY_CONSENT,diagnosticConsentVersion:GROCERY_RESPONSE_CONSENT});
const signal=()=>new AbortController().signal;
const deferred=()=>{let resolve!:(v:any)=>void;const promise=new Promise<any>(r=>resolve=r);return {resolve,promise};};
const review=(alternatives:any[]=[])=>adaptSimpleGroceryAnswer({product:original(),alternatives},context,new Set(),[],{allowUnverifiedEstimates:true}).review;

test('parallel dispatch starts both requests before Gemini completes; original and first cards stream without GPT',async()=>{
 const first=deferred(),second=deferred();const starts:string[]=[],progress:any[]=[];
 const p=createGroceryProvider({model:'gemini-3.5-flash-lite',transport:async(_r,_s,h)=>{starts.push('gemini');h?.onText?.(JSON.stringify({product:original(),alternatives:[food('Gemini sauce')]}));return first.promise;},supplementTransport:async()=>{starts.push('gpt');return second.promise;}});
 const pending=p.recognize(input(),signal(),v=>progress.push(v));assert.deepEqual(starts.sort(),['gemini','gpt']);assert.equal(progress.length,1);assert.equal(progress[0].alternatives.length,1);
 first.resolve(gem(original(),[food('Gemini sauce')]));second.resolve(gpt([food('GPT sauce A'),food('GPT sauce B')]));
 const result=await pending;assert.equal(result.alternatives.length,3);assert.equal(result.review!.recommendations[0].food.identity.name,'Gemini sauce');
});
for(const rating of ['neutral','not_healthy'])for(const count of [0,1,2,3])test(`Gemini ${rating} with ${count} alternatives preserves its entries and tops up only vacant slots`,async()=>{
 const primary=Array.from({length:count},(_,n)=>food('Gemini '+n));
 const base=adaptSimpleGroceryAnswer({product:original(rating),alternatives:primary},context,new Set(),[],{allowUnverifiedEstimates:true}).review;
 const p=createGroceryProvider({model:'gemini-3.5-flash-lite',transport:async()=>gem(original(rating),primary),supplementTransport:async()=>gpt([food('GPT A'),food('GPT B'),food('GPT C')],{product:food('Wrong original','healthy',0)})});
 const r=await p.recognize(input(),signal());assert.equal(r.alternatives.length,3);assert.deepEqual(r.review!.original,base.original);assert.deepEqual(r.review!.recommendations.slice(0,count),base.recommendations);assert.equal(r.model,'gemini-3.5-flash-lite');groceryResultSchema.parse(r);
});
test('healthy, missing rating and missing identity never adopt GPT product or alternatives',async()=>{
 for(const product of [original('healthy'),{...original(),rating:null},null]){
  let aborted=false;const p=createGroceryProvider({model:'gemini-3.5-flash-lite',transport:async()=>gem(product as any),supplementTransport:async(_r,s)=>{s.addEventListener('abort',()=>{aborted=true;});return new Promise(()=>{});}});
  const r=await p.recognize(input(),signal());assert.equal(r.alternatives.length,0);assert.equal(aborted,true);
 }
});
test('deduplication handles punctuation, pack weights and title word order; later GPT choices can fill gaps',()=>{
 assert.equal(alternativeKey("Maker's Sauce 24 oz"),alternativeKey('Sauce Makers'));
 assert.notEqual(alternativeKey('Makers Sauce'),alternativeKey('Makers Low Sodium Sauce'));
 const primary=review([food("Maker's Sauce 24 oz"),food('Second sauce')]);
 const r=mergeAlternativeSupplement(primary,{alternatives:[food('Sauce Makers'),food('Second sauce'),food('Scanned sauce'),food('Third sauce')]},context,new Set());
 assert.equal(r.added,1);assert.equal(r.review.recommendations[2].food.identity.name,'Third sauce');assert.equal(r.audit.filter(a=>a.code==='supplement_duplicate'||a.code==='duplicate_food').length,3);assert.deepEqual(primary.recommendations.length,2);
});
test('source IDs are namespaced and cannot overwrite Gemini nutrition or citations',()=>{
 const uri='https://manufacturer.example/sauce';const primary=review([food('Gemini sauce')]);
 const r=mergeAlternativeSupplement(primary,{alternatives:[{...food('GPT sauce'),source_url:uri}]},context,new Set([uri]));
 assert.equal(r.added,1);const candidate=r.review.recommendations[1];assert.match(candidate.food.id,/^gpt-/);assert.ok(candidate.food.nutrientEvidence.every(e=>r.review.sources.some(s=>s.id===e.sourceId)));assert.deepEqual(r.review.original,primary.original);
});
test('GPT candidates retain field bounds, missing facts, trans-fat warnings and dietary/clinical gates',()=>{
 const primary=review();
 const r=mergeAlternativeSupplement(primary,{alternatives:[{...food('Invalid'),nutrition:{sodiumMg:999999}}, {...food('Trans fat'),nutrition:{transFatG:1,totalFatG:2}},food('Ordinary sauce')]},context,new Set());
 assert.equal(r.added,2);assert.equal(r.review.recommendations[0].food.identity.name,'Ordinary sauce');assert.equal(r.review.recommendations[1].food.assessment.rating,'not_healthy');
 for(const c of [{...context,dietaryRestrictions:['glutenFree']},{...context,healthConditions:['celiac']},{...context,healthConditions:['ckd']}])assert.equal(mergeAlternativeSupplement(primary,{alternatives:[food('GPT sauce')]},c as GroceryContext,new Set()).added,0);
});
test('malformed/failed GPT never erases Gemini result or triggers a retry',async()=>{
 for(const mode of ['throw','bad_json','bad_schema']){
  let calls=0;const p=createGroceryProvider({model:'gemini-3.5-flash-lite',transport:async()=>gem(original(),[food('Gemini sauce')]),supplementTransport:async()=>{calls++;if(mode==='throw')throw Error('private error');return mode==='bad_json'?{status:'completed',output:[]}:gpt('wrong' as any);}});
  const r=await p.recognize(input(),signal());assert.equal(r.alternatives.length,1);assert.equal(calls,1);
 }
});
test('Gemini failure cancels GPT and never promotes its answer',async()=>{
 let stopped=false;const p=createGroceryProvider({model:'gemini-3.5-flash-lite',transport:async()=>{throw Error('Gemini failure');},supplementTransport:async(_r,s)=>{s.addEventListener('abort',()=>stopped=true);return new Promise(()=>{});}});
 await assert.rejects(p.recognize(input(),signal()));assert.equal(stopped,true);
});
test('client cancellation reaches both transports and does not strand a background rejection',async()=>{
 const c=new AbortController();let aborted=0;const transport:GroceryTransport=async(_r,s)=>new Promise((_resolve,reject)=>s.addEventListener('abort',()=>{aborted++;reject(s.reason);}));
 const p=createGroceryProvider({model:'gemini-3.5-flash-lite',transport,supplementTransport:transport});const result=p.recognize(input(),c.signal);c.abort();await assert.rejects(result);assert.equal(aborted,2);
});
test('supplement waiting is bounded even if transport ignores cancellation',async()=>{
 const keepAlive=setTimeout(()=>{},500);try{
  let aborted=false;const p=createGroceryProvider({model:'gemini-3.5-flash-lite',transport:async()=>gem(original(),[food('Gemini sauce')]),supplementWaitMs:15,supplementTransport:async(_r,s)=>{s.addEventListener('abort',()=>aborted=true);return new Promise(()=>{});}});
  const start=performance.now(),r=await p.recognize(input(),signal());assert.equal(r.alternatives.length,1);assert.equal(aborted,true);assert.ok(performance.now()-start<400);
 }finally{clearTimeout(keepAlive);}
});
test('total deadline, synchronous failure and late completion settle once',async()=>{
 const keepAlive=setTimeout(()=>{},500);try{
  const d=deferred(),s=startAlternativeRequest(async()=>d.promise,{},signal(),10);assert.equal((await s.finish(200)).status,'timed_out');d.resolve(gpt([food('Late')]));await Promise.resolve();assert.equal(s.snapshot().status,'timed_out');assert.equal(s.snapshot().raw,undefined);
  const fail=startAlternativeRequest(()=>{throw Error('synchronous');},{},signal());assert.equal((await fail.finish()).status,'failed');
 }finally{clearTimeout(keepAlive);}
});
test('both models receive the identical approved prompt and photo after explicit parallel health opt-in',()=>{
 const c:GroceryContext={...context,healthConditions:['diabetes'],shopper:{consentVersion:GROCERY_SHOPPER_CONSENT,age:52,gender:'male',foodPreferences:'Unsweetened',lipidPanel:{testDate:'2026-10-01',measurements:[{analyte:'ldl',rawValue:'130',unit:'mg/dL',comparator:'='}]}}};
 const g=buildGroceryRequest(imageBase64,c,'gemini-3.5-flash-lite',root) as any;
 const o=buildAlternativeRequest(imageBase64,root,supplementContext(c,GROCERY_PARALLEL_CONSENT)) as any;
 assert.equal(g.input[0].text,o.input[0].content[0].text);assert.equal(g.system_instruction,o.instructions);
 assert.equal(o.input[0].content[1].image_url,'data:image/jpeg;base64,'+g.input[1].data);
 assert.match(o.input[0].content[0].text,/52 years old/);assert.match(o.input[0].content[0].text,/130 mg\/dL/);assert.match(o.input[0].content[0].text,/Northborough/);
 assert.equal(o.store,false);assert.equal(o.max_tool_calls,3);assert.deepEqual(o.text.format.schema.required,['product','alternatives']);
 const walk=(s:any)=>{if(s.properties){assert.deepEqual(s.required,Object.keys(s.properties));for(const v of Object.values(s.properties))walk(v);}if(s.items)walk(s.items);};walk(o.text.format.schema);
});
test('legacy, missing and declined consent never expands health sharing; only new notice permits store context',async()=>{
 for(const photo of [undefined,'old',GROCERY_PARALLEL_CONSENT])for(const health of [undefined,GROCERY_SHOPPER_LEGACY_CONSENT,GROCERY_SHOPPER_CONSENT]){
  const c:GroceryContext={...context,healthConditions:['diabetes'],dietaryRestrictions:['eggFree'],...(health?{shopper:{consentVersion:health,age:52,foodPreferences:'private preference'}}:{})};
  const filtered=supplementContext(c,photo),body=JSON.stringify(buildAlternativeRequest(imageBase64,root,filtered));
  const allowed=photo===GROCERY_PARALLEL_CONSENT&&health===GROCERY_SHOPPER_CONSENT;
  assert.equal(body.includes('private preference'),allowed);assert.equal(body.includes('Northborough'),photo===GROCERY_PARALLEL_CONSENT);
  if(!allowed){assert.deepEqual(filtered.healthConditions,[]);assert.deepEqual(filtered.dietaryRestrictions,[]);assert.equal(filtered.shopper,undefined);}
 }
 const c:GroceryContext={...context,shopper:{consentVersion:GROCERY_SHOPPER_LEGACY_CONSENT,age:52}};
 let google='',openai='';
 const p=createGroceryProvider({model:'gemini-3.5-flash-lite',transport:async r=>{google=JSON.stringify(r);return gem();},supplementTransport:async r=>{openai=JSON.stringify(r);return gpt([]);}});
 await p.recognize(input(c),signal());assert.match(google,/52 years old/);assert.doesNotMatch(openai,/52 years old|Northborough/);
});
test('consented diagnostics capture each answer, supplement provenance and timing; without consent no raw returns',async()=>{
 for(const consent of [true,false]){
  const writes:JournalRecord[]=[],events:any[]=[];const p=createGroceryProvider({model:'gemini-3.5-flash-lite',transport:async()=>gem(),supplementTransport:async()=>gpt([food('GPT sauce')]),responseJournal:{record:(_id,v)=>writes.push(v)},audit:{record:(_id,v)=>{betaEventSchema.parse(v);events.push(v);}}});
  const request=input();if(!consent)delete (request as any).diagnosticConsentVersion;await p.recognize(request,signal());
  assert.ok(events.some(e=>e.kind==='alternative_supplement'&&e.added===1));
  if(consent){const row=writes.at(-1)!;journalRecordSchema.parse(row);assert.equal(row.supplement?.added,1);assert.match(row.supplement!.returned!.answerText,/GPT sauce/);assert.doesNotMatch(JSON.stringify(row),new RegExp(imageBase64));}else assert.equal(writes.length,0);
 }
});
test('retailer enrichment runs once after merging and sees both models alternatives',async()=>{
 let calls=0,streamed=false;const p=createGroceryProvider({model:'gemini-3.5-flash-lite',transport:async()=>gem(original(),[food('Gemini sauce')]),supplementTransport:async()=>gpt([food('GPT sauce')]),retailerLookup:async review=>{calls++;assert.equal(streamed,true);assert.equal(review.recommendations.length,2);return {review,decisions:[],searches:0,elapsedMs:0,html:null,queries:[]};}});
 await p.recognize(input(),signal(),r=>{if(r.alternatives.length===2)streamed=true;});assert.equal(calls,1);
});

// Observed on the real public-endpoint cereal fixture: two names for one product.
test('Original and heart-healthy marketing wording cannot create an extra copy of the same cereal',()=>{
 const primary=review([food('Wegmans Bite-Size Shredded Wheat Cereal'),food('Cheerios Cereal')]);
 const r=mergeAlternativeSupplement(primary,{alternatives:[food('Cheerios Original Heart Healthy Cereal'),food('Another Brand Bran Cereal')]},context,new Set());
 assert.equal(r.added,1);assert.equal(r.review.recommendations[2].food.identity.name,'Another Brand Bran Cereal');
 assert.notEqual(alternativeKey('Cheerios Original Cereal'),alternativeKey('Honey Nut Cheerios Cereal'));
 assert.notEqual(alternativeKey('Cheerios Original Cereal'),alternativeKey('Multi Grain Cheerios Cereal'));
});

test('the same marinara cannot occupy two slots when pasta and package weight are omitted from one title',()=>{
 const primary=review([food('Wegmans Low Sodium Smooth Marinara Pasta Sauce'),food('Wegmans Smooth Marinara Pasta Sauce')]);
 const r=mergeAlternativeSupplement(primary,{alternatives:[food('Wegmans Smooth Marinara Sauce, Low Sodium (24 oz)'),food('Another Brand Marinara Sauce')]},context,new Set());
 assert.equal(r.added,1);assert.equal(r.review.recommendations.length,3);assert.equal(r.review.recommendations[2].food.identity.name,'Another Brand Marinara Sauce');
 assert.notEqual(alternativeKey('Wegmans Parmesan Romano Pasta Sauce'),alternativeKey('Wegmans Marinara Pasta Sauce'));
});
