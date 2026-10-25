import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,statSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {PrivateResponseJournal,publicModelReturn,journalRecordSchema,type JournalRecord} from '../src/responseJournal.ts';
import {createRetailerLookup,retailerDistance} from '../src/groceryRetailers.ts';
import {adaptSimpleGroceryAnswer} from '../src/geminiSimpleReview.ts';
import {createGroceryProvider,parseGroceryResponse} from '../src/groceryReviewProvider.ts';
import {GROCERY_CONSENT,GROCERY_RESPONSE_CONSENT,type GroceryContext,groceryWireSchema} from '../../../packages/core/src/groceryReview.ts';
import type {StoreDirectory} from '../../../packages/core/src/storeDetection.ts';
const root='/path/to/NutriGlimpse';
const context:GroceryContext={healthConditions:['noConcern'],dietaryRestrictions:[],store:{name:'Wegmans',town:'Northborough',state:'MA',branch:'9102 Shops Way'}};
const product=(n:number)=>({title:'Fixture sauce '+n,nutrition:{sodiumMg:n?100:620},rating:n?'healthy':'not_healthy',reasons:[n?'Less sodium':'High sodium'],source_url:'https://maker.example.com/product-'+n});
const value={product:product(0),alternatives:[1,2,3].map(product)};
const urls=new Set([0,1,2,3].map(n=>product(n).source_url));
const review=()=>adaptSimpleGroceryAnswer(value,context,urls).review;
const wire=(v:unknown,links:string[]=[])=>({status:'completed',model:'gemini-3.5-flash-lite',steps:[{type:'google_search_call',id:'s',arguments:{queries:['public product retailer']}},{type:'google_search_result',call_id:'s',result:[]},{type:'model_output',content:[{type:'text',text:JSON.stringify(v),annotations:links.map(url=>({type:'url_citation',url}))}]}],usage:{total_input_tokens:100,total_output_tokens:200}});
const listing=(store='Wegmans',town='Northborough',url='https://www.wegmans.com/shop/product/fixture-sauce-1')=>({store,town,state:'MA',url,aisle:null});
const items=(listings:any[])=>({items:[{id:'alternative0',title:'Fixture sauce 1',retailers:listings}]});
const directory={stores:[{name:'Wegmans',address:'9102 Shops Way Northborough MA',coordinates:{latitude:42.3,longitude:-71.7}},{name:'Target',address:'Shrewsbury MA',coordinates:{latitude:42.3,longitude:-71.71}},{name:'Walmart',address:'Boston MA',coordinates:{latitude:42.36,longitude:-71.05}}]} as StoreDirectory;
const parse=(v:unknown)=>parseGroceryResponse(v,'gemini-3.5-flash-lite');
const signal=()=>new AbortController().signal;
test('one retailer follow-up includes only product names and public store, prefers current store, preserves nutrition',async()=>{
 let calls=0;const rows=[listing('Target','Shrewsbury','https://www.target.com/p/fixture-sauce'),listing()];
 const lookup=createRetailerLookup(async(request)=>{calls++;assert.deepEqual(request.tools,[{type:'google_search'}]);assert.doesNotMatch(JSON.stringify(request),/"image"|diabetes|"shopper"|"age"|private/i);assert.match(JSON.stringify(request),/Northborough/);return wire(items(rows),rows.map(r=>r.url));},parse,root,directory);
 const before=review(),result=await lookup(before,{...context,healthConditions:['diabetes']},signal());
 assert.equal(calls,1);assert.equal(result.review.recommendations.length,3);assert.equal(result.review.recommendations[0].food.availability.storeName,'Wegmans');assert.equal(result.review.recommendations[0].food.availability.status,'chain_listed');assert.deepEqual(result.review.recommendations[0].food.nutrition,before.recommendations[0].food.nutrition);
 assert.equal(before.recommendations[0].food.availability.status,'unknown');groceryWireSchema.parse(result.review);
});
test('nearby retailer is allowed, distant/wrong-state stores are not; no remote aisle is shown',async()=>{
 assert.equal(retailerDistance(context,'Wegmans','Northborough','NY',directory),null);
 assert.equal(retailerDistance(context,'Walmart','Boston','MA',directory),null);
 assert.ok(retailerDistance(context,'Target','Shrewsbury','MA',directory)!<15);
 const row=listing('Target','Shrewsbury','https://www.target.com/p/fixture-sauce');
 const lookup=createRetailerLookup(async()=>wire(items([row]),[row.url]),parse,root,directory);
 const result=await lookup(review(),context,signal());assert.equal(result.review.recommendations[0].food.availability.storeName,'Target');assert.equal(result.review.recommendations[0].food.availability.aisleEvidence,'unknown');
});
test('retailer mismatch, unreturned URL and changed identity cannot become a store label',async()=>{
 for(const kind of ['domain','ungrounded','identity']){
  const row=listing();if(kind==='domain')row.store='Target';const data=items([row]);if(kind==='identity')data.items[0].title='Different sauce';
  const lookup=createRetailerLookup(async()=>wire(data,kind==='ungrounded'?[]:[row.url]),parse,root,directory);
  const result=await lookup(review(),context,signal());assert.equal(result.review.recommendations[0].food.availability.status,'unknown');assert.equal(result.review.recommendations.length,3);
 }
});
test('no extra request for already identified retailers or absent store',async()=>{
 let calls=0;const lookup=createRetailerLookup(async()=>{calls++;throw Error('unneeded');},parse,root,directory);
 await lookup(review(),{...context,store:null},signal());const known=review();for(const r of known.recommendations){r.food.availability.status='chain_listed';r.food.availability.storeName='Wegmans';}await lookup(known,context,signal());assert.equal(calls,0);
});
test('failed retailer lookup is not retried and retains public partial answer for diagnostics',async()=>{
 let calls=0;const lookup=createRetailerLookup(async(_request,_signal,hooks)=>{calls++;hooks?.onText?.('partial public answer');throw Error('private error details');},parse,root,directory);
 const result=await lookup(review(),context,signal());assert.equal(calls,1);assert.equal(result.review.recommendations.length,3);assert.equal(result.partialText,'partial public answer');assert.ok(result.decisions.every(d=>d.code==='retailer_lookup_failed'));
});
test('grounded aisle name without a number is accepted only for current store evidence',()=>{
 const u=product(1).source_url,retailer='https://www.wegmans.com/shop/product/fixture-sauce';
 const item={...product(1),retailer_url:retailer,store:'Wegmans',aisle:{number:null,section:'Pasta sauces',store:'Wegmans',town:'Northborough',state:'MA',source_url:retailer}};
 const data={product:product(0),alternatives:[item]};
 const records=[{status:'ok',results:[{url:retailer,pageText:'Wegmans Northborough MA. Pasta sauces section.'}]}];
 const result=adaptSimpleGroceryAnswer(data,context,new Set([...urls,u,retailer]),records).review;
 assert.equal(result.recommendations[0].food.availability.section,'Pasta sauces');assert.equal(result.recommendations[0].food.availability.aisleNumber,null);
 item.aisle.town='Burlington';assert.equal(adaptSimpleGroceryAnswer(data,context,new Set([...urls,retailer]),records).review.recommendations[0].food.availability.aisleEvidence,'unknown');
});
const record=():JournalRecord=>({schemaVersion:1,model:'gemini-3.5-flash-lite',promptHash:'a'.repeat(64),schemaHash:'b'.repeat(64),adapterHash:'c'.repeat(64),outcome:'completed',primary:publicModelReturn(wire(value,[...urls])),displayedReview:review(),decisions:[{foodId:'alternative0',code:'current_store_identified'}]});
test('journal stores authenticated ciphertext with private permissions and can recover exact public answer',()=>{
 const folder=mkdtempSync(join(tmpdir(),'grocery-journal-test-'));const journal=new PrivateResponseJournal(folder);
 try{const trace=randomUUID(),data=record();journal.record(trace,data);assert.deepEqual(journal.read(trace),data);assert.equal(statSync(folder).mode&0o777,0o700);for(const file of ['encryption.key','responses.sqlite'])assert.equal(statSync(join(folder,file)).mode&0o777,0o600);assert.ok(!readFileSync(join(folder,'responses.sqlite')).includes(Buffer.from('Fixture sauce')));assert.equal(journal.list().length,1);}
 finally{journal.close();rmSync(folder,{recursive:true,force:true});}
});
test('journal enforces seven-day expiry, row bound and byte bound; rejects unexpected request fields',()=>{
 const folder=mkdtempSync(join(tmpdir(),'grocery-journal-test-'));let now=Date.now();let journal=new PrivateResponseJournal(folder,()=>now,2);
 try{const first=randomUUID();journal.record(first,record());now++;journal.record(randomUUID(),record());now++;journal.record(randomUUID(),record());assert.equal(journal.list().length,2);assert.equal(journal.read(first),null);now+=7*86400000+1;assert.equal(journal.list().length,0);
 assert.equal(journalRecordSchema.safeParse({...record(),imageBase64:'forbidden'}).success,false);assert.equal(journalRecordSchema.safeParse({...record(),submittedProfile:{age:52}}).success,false);
 journal.close();journal=new PrivateResponseJournal(folder,()=>now,2,10);journal.record(randomUUID(),record());assert.equal(journal.list().length,0);
 }finally{journal.close();rmSync(folder,{recursive:true,force:true});}
});
test('public answer extraction omits hidden reasoning, request image, secret envelope and profile',()=>{
 const raw:any=wire(value,[...urls]);raw.secret='private secret';raw.input={image:'private image',profile:{age:52}};raw.steps.unshift({type:'model_output',content:[{type:'thought',text:'private reasoning',signature:'private signature'}]});
 const output=publicModelReturn(raw);assert.doesNotMatch(JSON.stringify(output),/private|signature|profile/);assert.equal(output.answerText,JSON.stringify(value));assert.equal(output.usage.total_input_tokens,100);assert.equal(output.searchQueries.length,1);
});
const imageBase64=Buffer.from('ffd8ffc00011080020002003011100021100031100ffda000c03010002110311003f0000ffd9','hex').toString('base64');
test('only new diagnostic consent captures returned answer and final decision, without photo/profile inputs',async()=>{
 const writes:JournalRecord[]=[];const provider=createGroceryProvider({model:'gemini-3.5-flash-lite',transport:async()=>wire(value,[...urls]),responseJournal:{record:(_id,v)=>writes.push(v)}});
 await provider.recognize({imageBase64,context,consentVersion:GROCERY_CONSENT},signal());assert.equal(writes.length,0);
 await provider.recognize({imageBase64,context,consentVersion:GROCERY_CONSENT,diagnosticConsentVersion:GROCERY_RESPONSE_CONSENT},signal());assert.equal(writes.length,2);assert.equal(writes[1].outcome,'completed');journalRecordSchema.parse(writes[1]);assert.equal(writes[1].primary.answerText,JSON.stringify(value));assert.doesNotMatch(JSON.stringify(writes),new RegExp(imageBase64));
});
test('malformed model output is retained with failure classification after consent',async()=>{
 const writes:JournalRecord[]=[];const provider=createGroceryProvider({model:'gemini-3.5-flash-lite',transport:async()=>({status:'completed',model:'gemini-3.5-flash-lite',steps:[{type:'model_output',content:[{type:'text',text:'public malformed response: not JSON'}]}]}),responseJournal:{record:(_id,v)=>writes.push(v)}});
 await assert.rejects(provider.recognize({imageBase64,context,consentVersion:GROCERY_CONSENT,diagnosticConsentVersion:GROCERY_RESPONSE_CONSENT},signal()));assert.equal(writes.at(-1)?.outcome,'failed');assert.match(writes.at(-1)!.primary.answerText,/public malformed response/);journalRecordSchema.parse(writes.at(-1));
});
test('journal failure cannot prevent a completed scan',async()=>{
 const provider=createGroceryProvider({model:'gemini-3.5-flash-lite',transport:async()=>wire(value,[...urls]),responseJournal:{record:()=>{throw Error('disk problem');}}});
 const result=await provider.recognize({imageBase64,context,consentVersion:GROCERY_CONSENT,diagnosticConsentVersion:GROCERY_RESPONSE_CONSENT},signal());assert.equal(result.alternatives.length,3);
});

test('a suggested current-store name survives missing retailer citation without an extra search or stock claim',async()=>{
 let calls=0;const lookup=createRetailerLookup(async()=>{calls++;throw Error('unneeded');},parse,root,directory);
 const input=review();for(const r of input.recommendations)r.food.availability.storeName='Wegmans';
 const result=await lookup(input,context,signal());assert.equal(calls,0);assert.ok(result.review.recommendations.every(r=>r.food.availability.storeName==='Wegmans'&&r.food.availability.status==='unknown'&&r.food.availability.sourceId===null));
});
