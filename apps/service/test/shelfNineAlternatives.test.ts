import {test} from 'node:test';
import assert from 'node:assert/strict';
import {projectRoot} from '../src/projectPaths.ts';
import {parseAlternatives,createShelfNineProvider,createSingleShelfNineProvider} from '../src/shelfNineProvider.ts';
import {partialShelfRows} from '../src/shelfNineStream.ts';
import {compactFood} from '../src/compactPhotoReview.ts';
import {food,grid} from '../../../packages/core/test/shelfGridFixtures.ts';
import {checkedShelfFood,SHELF_NINE_CONSENT,SHELF_RESPONSE_CONSENT,type ShelfNineProduct,type ShelfNineResult} from '../../../packages/core/src/shelfNine.ts';
import {estimatedBenefitsDecision,type EstimatedFood} from '../../../packages/core/src/aiFoodReview.ts';
import {journalRecordSchema,type JournalRecord} from '../src/responseJournal.ts';
import {betaEventSchema,type BetaEvent} from '../src/betaDiagnostics.ts';
import {sameShelfAlternativeOriginal,type ShelfAlternativeDecision} from '../src/shelfAlternativePolicy.ts';
const input=()=>({...grid(1),schemaVersion:2 as const,consentVersion:SHELF_NINE_CONSENT,capacity:9 as const,batchIndex:0,shareHealth:false,context:{healthConditions:[],dietaryRestrictions:[],store:null}});
const record=(f:EstimatedFood):ShelfNineProduct=>({cellNumbers:[1],food:checkedShelfFood(f),reasons:[],sourceUrls:[],nutritionStatus:'estimated'});
const wireRow=(f:EstimatedFood)=>({cell_numbers:[1],food:compactFood(f),reasons:[],source_urls:[],nutrition_status:'estimated'});
const alt=(f:EstimatedFood)=>({compared_cell:1,food:compactFood(f),reasons:['Model benefit'],source_urls:[],nutrition_status:'estimated',store_name:'Wegmans',aisle:'4',retailer_product_url:null});
const wire=(a:EstimatedFood,b:EstimatedFood[])=>({products:[wireRow(a)],alternatives:b.map(alt),unidentified_cells:[],total_duplicates_removed:0,limitations:[]});
const returned=(v:unknown,model='gemini')=>model==='gemini'?{status:'completed',steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify(v)}]}]}:{status:'completed',output:[{type:'message',status:'completed',content:[{type:'output_text',text:JSON.stringify(v)}]}]};
const sauce=(name:string,sodium:number,protein=3,fiber=2):EstimatedFood=>({...food(name,sodium),category:'Pasta Sauce',servingGrams:125,servingText:'125 g',nutrition:{...food().nutrition,caloriesKcal:80,carbohydrateG:12,sodiumMg:sodium,sugarsG:6,addedSugarsG:1,fiberG:fiber,proteinG:protein}});
const tick=async()=>{for(let i=0;i<60;i++)await Promise.resolve();};
test('shelf accepts meaningful neutral and red improvements, keeps red last and reports small protein tradeoff',()=>{
 const a=sauce('Original sauce',900),red=sauce('Better red sauce',500),neutral=sauce('Low sodium sauce',100,2);
 const decisions:ShelfAlternativeDecision[]=[];
 const out=parseAlternatives([alt(red),alt(neutral)],[record(a)],false,d=>decisions.push(d));
 assert.equal(out.length,2);assert.deepEqual(out.map(a=>a.food.rating),['neutral','not_healthy']);
 assert.equal(out[0].food.nutrition.proteinG,2);assert.match(out[0].reasons.join(' '),/Less sodium.*less protein/i);
 assert.ok(decisions[0].codes.includes('relative_improvement_keeps_red_rating'));
 assert.ok(decisions[1].codes.includes('small_shelf_tradeoff_proteinG'));
 // Existing callers keep their previous policy until explicitly opting into shelf tradeoffs.
 assert.ok(estimatedBenefitsDecision(a,neutral).reasons.includes('equal_weight_loses_proteinG'));
});
test('small cereal fiber tradeoff is allowed only when its main concern improves, category aliases match',()=>{
 const a=food('Sweet cereal');a.category='Cold Cereal';a.nutrition.addedSugarsG=12;a.nutrition.sugarsG=13;
 const b=food('Less sweet cereal');b.category='Cereal';b.nutrition.fiberG=4;
 assert.equal(parseAlternatives([alt(b)],[record(a)],false).length,1);
 b.nutrition.fiberG=3;assert.equal(parseAlternatives([alt(b)],[record(a)],false).length,0);
 b.nutrition.fiberG=4;b.nutrition.addedSugarsG=12;b.nutrition.sugarsG=13;
 assert.equal(parseAlternatives([alt(b)],[record(a)],false).length,0);
});
test('missing core values, trans fat, incoherent portions, category mismatch and worsening stay rejected with reasons',()=>{
 const a=sauce('Original sauce',900);
 const cases:[string,(b:EstimatedFood)=>void][]=[
  ['missing_transFatG',b=>b.nutrition.transFatG=null],
  ['alternative_trans_fat_not_zero',b=>b.nutrition.transFatG=0.1],
  ['serving_weight_missing',b=>b.servingGrams=null],
  ['sugar_or_fiber_inconsistent',b=>b.nutrition.addedSugarsG=8],
  ['category_mismatch',b=>b.category='Cheese'],
  ['equal_weight_worsens_saturatedFatG',b=>b.nutrition.saturatedFatG=4],
  ['equal_weight_loses_fiberG',b=>b.nutrition.fiberG=0],
  ['no_meaningful_improvement',b=>b.nutrition.sodiumMg=900],
 ];
 for(const [expected,modify] of cases){
  const b=sauce('Alternative',100);modify(b);const decisions:ShelfAlternativeDecision[]=[];
  assert.equal(parseAlternatives([alt(b)],[record(a)],false,d=>decisions.push(d)).length,0,expected);
  assert.ok(decisions[0].codes.includes(expected),JSON.stringify(decisions));
 }
 const b=sauce('Tiny serving',100);b.servingGrams=10;
 assert.equal(parseAlternatives([alt(b)],[record(a)],false).length,0);
});
test('duplicate, bad cell and malformed proposals are diagnosed; missing ancillary links do not block',()=>{
 const a=sauce('Original',900),b=sauce('Better',100),decisions:ShelfAlternativeDecision[]=[];
 const out=parseAlternatives([alt(b),alt(b),{...alt(b),compared_cell:9}],[record(a)],false,d=>decisions.push(d));
 assert.equal(out.length,1);assert.equal(out[0].aisle,'4');assert.equal(out[0].retailerUrl,null);
 assert.deepEqual(decisions.map(d=>d.codes[0]),['meaningful_improvement','duplicate_or_scanned_product','original_cell_missing']);
 const rejected:ShelfAlternativeDecision[]=[];parseAlternatives([{}],[record(a)],false,d=>rejected.push(d));assert.equal(rejected[0].codes[0],'invalid_alternative_schema');
});
test('stream parser accepts completed alternatives only and ignores injected keys inside strings/nested records',()=>{
 const a=sauce('Original',900),b=sauce('Better',100);
 const v={products:[{...wireRow(a),note:'"alternatives":[{}]'}],alternatives:[alt(b)]},text=JSON.stringify(v);
 const cut=text.indexOf('"alternatives":[')+16;
 assert.deepEqual(partialShelfRows(text,'alternatives',3),[alt(b)]);
 assert.deepEqual(partialShelfRows(text.slice(0,cut+10),'alternatives',3),[]);
 assert.deepEqual(partialShelfRows('{"products":[{"nested":{"alternatives":[{}]}}],"other":"alternatives"}','alternatives',3),[]);
});
test('accepted Gemini and GPT alternatives stream before their transport completes; final retains both',async()=>{
 const a=sauce('Original',900),b=sauce('Better Gemini',100),c=sauce('Better GPT',200);
 let endGemini!:(v:unknown)=>void,endGpt!:(v:unknown)=>void,gptText!:(text:string)=>void;const progress:ShelfNineResult[]=[];
 const p=createShelfNineProvider({root:projectRoot,gemini:async(_r,_s,h)=>{
  const text=JSON.stringify(wire(a,[b]));h?.onText?.(text.slice(0,-1));return new Promise(r=>endGemini=r);
 },gpt:async(_r,_s,h)=>{gptText=h!.onText!;return new Promise(r=>endGpt=r);}});
 let done=false;const pending=p.recognize(input(),new AbortController().signal,r=>progress.push(r)).then(r=>{done=true;return r;});await tick();
 assert.ok(progress.some(r=>r.primaryComplete&&r.alternatives.length===1));assert.equal(done,false);
 endGemini(returned(wire(a,[b])));await tick();assert.equal(done,false);
 gptText(JSON.stringify(wire(a,[c])).slice(0,-1));await tick();assert.ok(progress.some(r=>r.alternatives.length===2));assert.equal(done,false);
 endGpt(returned(wire(a,[c]),'gpt'));const final=await pending;
 assert.equal(final.alternatives.length,2);assert.equal(final.alternatives[0].food.identity.name,'Better Gemini');
});
test('both responses, partial errors, empty proposals and all decision codes are journaled without input photos',async()=>{
 const a=sauce('Original',900),b=sauce('Better',100),bad=sauce('Invalid',100);bad.nutrition.transFatG=null;
 const records=new Map<string,JournalRecord>(),events:BetaEvent[]=[];
 const p=createShelfNineProvider({root:projectRoot,responseJournal:{record:(id,r)=>{journalRecordSchema.parse(r);records.set(id,r);}},audit:{record:(_id,e)=>{betaEventSchema.parse(e);events.push(e);}},gemini:async()=>returned(wire(a,[b,bad])),gpt:async()=>returned(wire(a,[]),'gpt')});
 await p.recognize(input(),new AbortController().signal);
 assert.equal(records.size,3);const providers=[...records.values()].filter(r=>r.shelf?.stage==='provider');assert.equal(providers.length,2);
 assert.equal(providers.find(r=>r.model==='gemini-3.5-flash-lite')?.primary.answerText,JSON.stringify(wire(a,[b,bad])));
 assert.deepEqual(providers.map(r=>r.shelf?.proposed).sort(),[0,2]);
 assert.ok(events.some(e=>e.kind==='shelf_alternatives'&&e.decisions.some(d=>d.codes.includes('missing_transFatG'))));
 assert.doesNotMatch(JSON.stringify([...records.values()]),new RegExp(input().imageBase64));
 const failed:JournalRecord[]=[];
 const q=createSingleShelfNineProvider({root:projectRoot,responseJournal:{record:(_id,r)=>failed.push(r)},gemini:async(_r,_s,h)=>{h?.onText?.('partial public response');throw Error('private error');},gpt:async()=>null});
 await assert.rejects(q.recognize(input(),new AbortController().signal));
 assert.equal(failed.at(-1)?.primary.answerText,'partial public response');assert.equal(failed.at(-1)?.outcome,'failed');assert.doesNotMatch(JSON.stringify(failed),/private error/);
});
test('health-sharing clients require the updated diagnostic notice; logging failures never fail a scan',async()=>{
 const a=sauce('Original',900),writes:JournalRecord[]=[];
 const make=()=>createSingleShelfNineProvider({root:projectRoot,responseJournal:{record:(_id,r)=>writes.push(r)},gemini:async()=>returned(wire(a,[])),gpt:async()=>null});
 await make().recognize({...input(),shareHealth:true},new AbortController().signal);assert.equal(writes.length,0);
 await make().recognize({...input(),shareHealth:true,diagnosticConsentVersion:SHELF_RESPONSE_CONSENT},new AbortController().signal);assert.equal(writes.length,2);
 const p=createShelfNineProvider({root:projectRoot,responseJournal:{record:()=>{throw Error('disk');}},gemini:async()=>returned(wire(a,[])),gpt:async()=>returned(wire(a,[]),'gpt')});
 assert.equal((await p.recognize(input(),new AbortController().signal)).products.length,1);
});

test('a 21 percent sugar improvement at equal weight qualifies, while small and worsening comparisons do not',()=>{
 const a=food('Apple-style cereal');a.category='Cold Cereal';a.servingGrams=42;a.nutrition.addedSugarsG=13;a.nutrition.sugarsG=13;a.nutrition.proteinG=2;a.nutrition.fiberG=3;a.nutrition.sodiumMg=210;
 const b=food('Cinnamon-style cereal');b.category='Cereal';b.servingGrams=37;b.nutrition.addedSugarsG=9;b.nutrition.sugarsG=9;b.nutrition.proteinG=2;b.nutrition.fiberG=3;b.nutrition.sodiumMg=115;
 const decisions:ShelfAlternativeDecision[]=[];
 const out=parseAlternatives([alt(b)],[record(a)],false,d=>decisions.push(d));assert.equal(out.length,1);assert.equal(out[0].food.rating,'neutral');assert.equal(out[0].reasons[0],'Less added sugar');
 assert.ok(decisions[0].codes.includes('original_priority_improved'));
 b.nutrition.addedSugarsG=11;b.nutrition.sugarsG=11;assert.equal(parseAlternatives([alt(b)],[record(a)],false).length,0);
});

test('dry breakfast grains are comparable; prepared or unspecified oatmeal is not silently diluted',()=>{
 const a=food('Sweet cereal');a.nutrition.addedSugarsG=12;a.nutrition.sugarsG=13;
 const b=food('Oatmeal, Old Fashioned');b.category='Breakfast cereal/grain';b.servingText='1/2 cup dry (40 g)';
 assert.equal(parseAlternatives([alt(b)],[record(a)],false).length,1);
 for(const basis of ['1 cup prepared (200 g)','1 cup (40 g)']){b.servingText=basis;const d:ShelfAlternativeDecision[]=[];
  assert.equal(parseAlternatives([alt(b)],[record(a)],false,x=>d.push(x)).length,0);assert.match(d[0].codes[0],/preparation_basis/);
 }
});
test('alternative originals match equivalent field splits, but not another flavor, brand or package size',()=>{
 const a=food('Special K Cereal');a.identity.brand="Kellogg's";a.identity.variant='Chocolatey Delight';a.identity.size='16.3 oz';
 const b=structuredClone(a);b.identity.brand="Kellogg's Special K";b.identity.name='Chocolatey Delight Cereal';
 assert.equal(sameShelfAlternativeOriginal(a,b),true);
 for(const field of ['brand','variant','size'] as const){const changed=structuredClone(b);changed.identity[field]=field==='size'?'12 oz':field==='variant'?'Vanilla':'Wegmans';assert.equal(sameShelfAlternativeOriginal(a,changed),false);}
});

test('cereal purpose matching handles descriptive grain categories without accepting drinks, bars or rice',()=>{
 const a=food('Sweet cereal');a.nutrition.addedSugarsG=12;a.nutrition.sugarsG=13;
 for(const category of ['plain whole-grain oats','Hot breakfast cereal','Breakfast cereal/grain','Oatmeal']){
  const b=food('Old Fashioned Oats');b.category=category;b.servingText='1/2 cup (40 g), dry';assert.equal(parseAlternatives([alt(b)],[record(a)],false).length,1,category);
 }
 for(const name of ['Oat milk','Granola bars','Oatmeal cookies','White rice']){
  const b=food(name);b.category=name;b.servingText='40 g dry';assert.equal(parseAlternatives([alt(b)],[record(a)],false).length,0,name);
 }
});

test('GPT candidate compares against Gemini original even when GPT original nutrients are missing',async()=>{
 const a=sauce('Original',900),b=sauce('Better GPT',100),gptOriginal=structuredClone(a);gptOriginal.nutrition.addedSugarsG=null;
 const records:JournalRecord[]=[];
 const p=createShelfNineProvider({root:projectRoot,responseJournal:{record:(_id,r)=>records.push(r)},gemini:async()=>returned(wire(a,[])),gpt:async()=>returned(wire(gptOriginal,[b]),'gpt')});
 const r=await p.recognize(input(),new AbortController().signal);assert.equal(r.alternatives.length,1);assert.equal(r.products[0].food.nutrition.addedSugarsG,1);
 assert.ok(records.some(r=>r.shelf?.decisions.some(d=>d.codes.includes('pending_gemini_comparison'))));
 gptOriginal.identity.variant='Different flavor';
 const other=createShelfNineProvider({root:projectRoot,gemini:async()=>returned(wire(a,[])),gpt:async()=>returned(wire(gptOriginal,[b]),'gpt')});
 assert.equal((await other.recognize(input(),new AbortController().signal)).alternatives.length,0);
});
test('deferred GPT proposals cannot bypass nutrient holds or become unvalidated fallback alternatives',async()=>{
 const a=sauce('Original',900),b=sauce('Incomplete GPT',100);b.nutrition.transFatG=null;
 const p=createShelfNineProvider({root:projectRoot,gemini:async()=>returned(wire(a,[])),gpt:async()=>returned(wire(a,[b]),'gpt')});
 assert.equal((await p.recognize(input(),new AbortController().signal)).alternatives.length,0);
 const worse=sauce('Worse GPT',950);
 const fallback=createShelfNineProvider({root:projectRoot,gemini:async()=>{throw Error('down');},gpt:async()=>returned(wire(a,[worse]),'gpt')});
 const r=await fallback.recognize(input(),new AbortController().signal);assert.equal(r.model,'gpt-6-luna');assert.equal(r.alternatives.length,0);
});
