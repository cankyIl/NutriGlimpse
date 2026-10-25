import test from 'node:test';
import assert from 'node:assert/strict';
import {readGeminiStream,partialGroceryAnswer} from '../src/geminiStream.ts';
import {approvedGroceryPrompt,buildGroceryRequest,createGroceryProvider,createGroceryTransport} from '../src/groceryReviewProvider.ts';
import {GROCERY_CONSENT,type GroceryContext} from '../../../packages/core/src/groceryReview.ts';
import {GROCERY_SHOPPER_CONSENT} from '../../../packages/core/src/groceryShopper.ts';
const context:GroceryContext={healthConditions:['diabetes'],dietaryRestrictions:[],store:{name:'Walmart',town:'Northborough',state:'MA',branch:'public address'},shopper:{consentVersion:GROCERY_SHOPPER_CONSENT,age:52,gender:'male',foodPreferences:'Unsweetened cereal',lipidPanel:{testDate:'2026-10-01',measurements:[{analyte:'ldl',rawValue:'145',unit:'mg/dL',comparator:'='}]}}};
const row=(n=0)=>({title:n?'Plain cereal '+n:'Sweet cereal',nutrition:{sodiumMg:n?20:210,sugarsG:n?1:13,carbohydrateG:34,fiberG:n?4:2,transFatG:0},rating:n?'healthy':'not_healthy',reasons:[n?'Less sugar':'Higher sugar'],source_url:null,uncertainties:[],aisle:null});
const answer={product:row(),alternatives:[row(1),row(2),row(3)]};
const model='gemini-3.5-flash-lite';
const pre=[{event_type:'interaction.created',interaction:{model,status:'in_progress'}},{event_type:'step.start',index:0,step:{type:'google_search_call',id:'s1'}},{event_type:'step.delta',index:0,delta:{type:'google_search_call',arguments:{queries:['cereal nutrition']}}},{event_type:'step.stop',index:0},{event_type:'step.start',index:1,step:{type:'google_search_result',call_id:'s1'}},{event_type:'step.delta',index:1,delta:{type:'google_search_result',is_error:false,result:[]}},{event_type:'step.stop',index:1},{event_type:'step.start',index:2,step:{type:'model_output'}}];
const delta=(text:string)=>({event_type:'step.delta',index:2,delta:{type:'text',text}});
const end=[{event_type:'step.stop',index:2},{event_type:'interaction.completed',interaction:{status:'completed',model,usage:{total_input_tokens:100,total_output_tokens:200}}}];
const wire=(events:any[])=>events.map(e=>'data: '+JSON.stringify(e)+'\r\n\r\n').join('')+'data: [DONE]\n\n';
const stream=(events:any[])=>new Response(wire(events)).body!;
test('approved first-person order inserts consented details once and keeps current store scoped',()=>{
 const p=approvedGroceryPrompt(context);assert.ok(p.indexOf('52 years old')<p.indexOf('I am giving you the product image'));
 assert.match(p,/diabetes/);assert.match(p,/LDL cholesterol 145 mg\/dL/);assert.match(p,/2026-10-01/);assert.match(p,/Walmart, Northborough, MA/);assert.doesNotMatch(p,/public address|{{/);
 const c={...context,shopper:undefined};assert.doesNotMatch(approvedGroceryPrompt(c),/52|145|diabetes|Unsweetened/);
 const r=buildGroceryRequest('image',context,model);assert.deepEqual(r.tools,[{type:'google_search'}]);assert.equal(r.store,false);assert.match(String(r.system_instruction),/not diagnoses/);
 const injection=approvedGroceryPrompt({...context,shopper:{...context.shopper!,foodPreferences:'{{STORE_SENTENCE}}'}});assert.equal(injection.split('Walmart').length,2);
});
test('partial JSON handles escapes, unicode and chunked numbers without inventing values',()=>{
 const raw=JSON.stringify({product:{...row(),title:'Café "Oats" {whole}'},alternatives:[row(1)]});
 for(let i=0;i<raw.length;i++){
  const p=partialGroceryAnswer(raw.slice(0,i));if(p.product)assert.deepEqual(JSON.parse(JSON.stringify(p.product)),JSON.parse(raw).product);
  assert.ok(p.alternatives.length<=1);
 }
 const cut=raw.indexOf('210')+1;assert.equal(partialGroceryAnswer(raw.slice(0,cut)).product,undefined);
 assert.deepEqual(JSON.parse(JSON.stringify(partialGroceryAnswer(raw).alternatives)),[row(1)]);
 assert.equal(partialGroceryAnswer('{"product":{"title":"A","title":"B"}}').product,undefined);
});
test('streamed answer and search evidence assemble without exposing thought summaries',async()=>{
 const events=[...pre.slice(0,-1),{event_type:'step.start',index:7,step:{type:'thought'}},{event_type:'step.delta',index:7,delta:{type:'thought_summary',content:{text:'PRIVATE_REASONING'}}},{event_type:'step.stop',index:7},pre.at(-1),delta(JSON.stringify(answer)),...end];
 let text='';const result=await readGeminiStream(stream(events),new AbortController().signal,s=>text=s);
 assert.deepEqual(JSON.parse(text),answer);assert.equal(result.usage.total_input_tokens,100);assert.doesNotMatch(JSON.stringify(result),/PRIVATE_REASONING/);
});
test('missing, failed, mismatched and duplicated completion never count as a finished review',async()=>{
 for(const events of [[...pre,delta('{}')],[...pre,delta('{}'),{event_type:'interaction.status_update',status:'failed'}],[...pre,delta('{}'),...end,{event_type:'step.start',index:8,step:{type:'model_output'}}],[...pre,delta('{}'),end[0],{event_type:'interaction.completed',interaction:{model,status:'completed',steps:[{type:'model_output',content:[{type:'text',text:'different'}]}]}}]])await assert.rejects(readGeminiStream(stream(events),new AbortController().signal));
});
test('first card arrives before provider completion; original and three alternatives use one request',async()=>{
 let control!:ReadableStreamDefaultController<Uint8Array>,networkCalls=0;const encode=new TextEncoder();
 const emit=(events:any[])=>control.enqueue(encode.encode(events.map(e=>'data: '+JSON.stringify(e)+'\n\n').join('')));
 const fetcher:typeof fetch=async(_url,init)=>{networkCalls++;const body=JSON.parse(String(init?.body));assert.equal(body.stream,true);return new Response(new ReadableStream({start(c){control=c;}}),{headers:{'Content-Type':'text/event-stream'}});};
 const events:any[]=[];const provider=createGroceryProvider({model,transport:createGroceryTransport(model,'fixture',fetcher),audit:{record:(_t,e)=>events.push(e)}});
 let identity=false,finished=false;const cards:any[]=[];
 const task=provider.recognize({imageBase64:Buffer.from('ffd8ffc00011080020002003011100021100031100ffda000c03010002110311003f0000ffd9','hex').toString('base64'),context,consentVersion:GROCERY_CONSENT},new AbortController().signal,r=>cards.push(r),undefined,()=>identity=true).then(r=>{finished=true;return r;});
 await new Promise(r=>setImmediate(r));emit([...pre,delta('{"product":'+JSON.stringify(row())+',"alternatives":[')]);await new Promise(r=>setImmediate(r));
 assert.equal(identity,true);assert.equal(cards.length,1);assert.equal(finished,false);assert.equal(cards[0].original.nutrition.sodiumMg,210);assert.equal(cards[0].review.recommendationShortfall,null);
 for(let n=1;n<=3;n++){emit([delta((n>1?',':'')+JSON.stringify(row(n)))]);await new Promise(r=>setImmediate(r));}
 assert.deepEqual(cards.map(r=>r.alternatives.length),[0,1,2,3]);emit([delta(']}'),...end]);control.close();const result=await task;
 assert.equal(result.alternatives.length,3);assert.equal(networkCalls,1);assert.doesNotMatch(JSON.stringify(events),/145|Unsweetened|Northborough/);assert.ok(!events.some(e=>e.kind==='decision'));
});
test('cancelling a stalled provider stream cancels its reader and returns promptly',async()=>{
 const abort=new AbortController();let cancelled=false;
 const body=new ReadableStream<Uint8Array>({start(c){c.enqueue(new TextEncoder().encode(wire(pre)));},cancel(){cancelled=true;}});
 const task=readGeminiStream(body,abort.signal);await new Promise(r=>setImmediate(r));abort.abort();await assert.rejects(task);assert.equal(cancelled,true);
});
