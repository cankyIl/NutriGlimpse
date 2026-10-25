import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {AddressInfo} from 'node:net';
import {buildClaudeReviewRequest,createClaudePhotoTransport} from '../src/claudePhotoTransport.ts';
import {buildAiReviewRequest,createAiReviewProvider} from '../src/aiFoodReviewProvider.ts';
import {createDualPhotoProvider} from '../src/dualPhotoProvider.ts';
import {mergeDualReviews,dualIdentityKey,type ReviewEnvelope} from '../src/dualPhotoReview.ts';
import {createSharedReportBudget} from '../src/realReportProvider.ts';
import {createAppServer} from '../src/server.ts';
import {betaEventSchema} from '../src/betaDiagnostics.ts';
import {AI_FOOD_CONSENT,estimatedRatingDecision,type EstimatedFood} from '../../../packages/core/src/aiFoodReview.ts';
import {DUAL_FOOD_CONSENT,dualModels} from '../../../packages/core/src/dualAiFoodReview.ts';
const identity={status:'identified' as const,brand:'Fixture',name:'Sweet Oat Cereal',variant:null,size:null,visibleText:[]};
const original:EstimatedFood={identity,category:'breakfast-cereal',servingText:'40 g',servingGrams:40,ingredients:null,rating:'not_healthy',nutrition:{caloriesKcal:150,saturatedFatG:0.5,transFatG:0,sugarsG:12,addedSugarsG:12,carbohydrateG:32,sodiumMg:180,fiberG:3,proteinG:3,potassiumMg:null,calciumMg:null,ironMg:null,magnesiumMg:null}};
const food=(name:string,sugar=1):EstimatedFood=>({...structuredClone(original),identity:{...identity,name},rating:sugar<=5?'healthy':'neutral',nutrition:{...original.nutrition,addedSugarsG:sugar,sugarsG:sugar,fiberG:5}});
const review=(alternatives:unknown[]=[food('Plain A')],base:EstimatedFood=original):ReviewEnvelope=>({status:'identified',original:base,alternatives});
const envelope=(value:unknown)=>JSON.stringify({status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
const segment=(marker:number,body:Buffer)=>{const head=Buffer.alloc(4);head[0]=255;head[1]=marker;head.writeUInt16BE(body.length+2,2);return Buffer.concat([head,body]);};
const jpeg=()=>Buffer.concat([Buffer.from([255,216]),segment(0xe1,Buffer.from('Exif:PRIVATE GPS')),segment(0xc0,Buffer.from([8,0,100,0,100,1,1,17,0])),segment(0xda,Buffer.from([1,1,0,0,63,0])),Buffer.from([0,255,0,2,255,217])]).toString('base64');
const input=()=>({consentVersion:DUAL_FOOD_CONSENT,imageBase64:jpeg()});
const settle=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();};
test('both providers receive identical application prompt, user text and image with provider-compatible schema',()=>{
 const gpt=buildAiReviewRequest('same-photo'),claude=buildClaudeReviewRequest('same-photo');
 assert.equal(gpt.model,'gpt-6-luna');assert.equal(claude.model,'claude-haiku-5-5');
 assert.equal(claude.system,gpt.instructions);
 const schema=JSON.stringify(claude.output_config.format.schema);assert.ok(!schema.includes('maxLength'));assert.ok(!schema.includes('maxItems'));assert.ok((schema.match(/anyOf/g)||[]).length<=16);assert.ok(schema.includes('#/$defs/'));assert.deepEqual(Object.keys(claude.output_config.format.schema.properties as object),['s','o','a']);
 assert.equal(claude.messages[0].content[0].text,gpt.input[0].content[0].text);
 assert.equal(claude.messages[0].content[1].source?.data,gpt.input[0].content[1].image_url?.split(',')[1]);
 assert.equal('tools' in claude,false);assert.equal('metadata' in claude,false);
});
function claudeEvents(text:string,stop='end_turn'){
 return [{type:'message_start',message:{role:'assistant',model:dualModels[1]}},
 {type:'content_block_start',index:0,content_block:{type:'text',text:''}},
 {type:'content_block_delta',index:0,delta:{type:'text_delta',text}},
 {type:'content_block_stop',index:0},{type:'message_delta',delta:{stop_reason:stop}},{type:'message_stop'}];
}
const stream=(events:unknown[])=>new Response(events.map(e=>'data: '+JSON.stringify(e)+'\n\n').join(''),{headers:{'Content-Type':'text/event-stream'}});
test('Claude transport accepts only a completed single text block and never exposes the credential',async()=>{
 const text=JSON.stringify(review());let calls=0,progress='';
 const transport=createClaudePhotoTransport('sk-ant-private-test',async(url,init)=>{
  calls++;assert.equal(url,'https://api.anthropic.com/v1/messages');assert.equal(new Headers(init?.headers).get('x-api-key'),'sk-ant-private-test');assert.equal(init?.redirect,'error');
  assert.equal(JSON.parse(String(init?.body)).stream,true);return stream(claudeEvents(text));
 });
 const result=await transport(buildClaudeReviewRequest('fixture'),new AbortController().signal,value=>{progress=value;});
 assert.equal(progress,text);assert.equal(JSON.parse(result).output[0].content[0].text,text);assert.equal(calls,1);assert.ok(!result.includes('sk-ant'));
 for(const events of [claudeEvents(text,'max_tokens'),claudeEvents(text).slice(0,-1),[{type:'error',error:{message:'secret credential'}}]]){
  const broken=createClaudePhotoTransport('sk-ant-private-test',async()=>stream(events));
  await assert.rejects(broken({},new AbortController().signal),error=>error instanceof Error&&/claude_/.test(error.message)&&!error.message.includes('secret'));
 }
});
test('two model requests start together; original preview arrives without waiting; final union includes both',async()=>{
 const release:((raw:string)=>void)[]=[],progress:unknown[]=[];let reservations=0;const models:string[]=[];
 const transport=(model:string)=>async(request:Record<string,unknown>,_signal:AbortSignal,onText?:(text:string)=>void)=>{
  models.push(model);assert.ok(!JSON.stringify(request).includes('PRIVATE GPS'));
  onText?.(JSON.stringify(review([])));return new Promise<string>(resolve=>release.push(resolve));
 };
 const provider=createDualPhotoProvider({gpt:transport('gpt'),claude:transport('claude'),reservePair:async()=>{reservations++;}});
 const pending=provider.recognize(input(),new AbortController().signal,value=>progress.push(value));
 await settle();assert.deepEqual(models,['gpt','claude']);assert.equal(reservations,1);assert.equal(progress.length,1);
 assert.equal((progress[0] as {alternatives:unknown[]}).alternatives.length,0);
 release[1](envelope(review([food('From Claude')])));await settle();
 release[0](envelope(review([food('From GPT')])));const result=await pending;
 assert.equal(result.reviewState,'complete');assert.deepEqual(result.models,dualModels);
 assert.deepEqual(result.alternatives.map(f=>f.identity.name),['From Claude','From GPT']);
});
test('union validates all ten candidates before selection, deduplicates and keeps three passing products',()=>{
 const invalid={...food('Incomplete'),nutrition:{...food('Incomplete').nutrition,transFatG:null}};
 const bad={...food('Unsafe'),nutrition:{...food('Unsafe').nutrition,transFatG:1}};
 const wrong={...food('Wrong'),category:'protein-powder'};
 const records=[{model:dualModels[0],envelope:review([invalid,bad,wrong,food('Plain A'),food('Plain A')])},
 {model:dualModels[1],envelope:review([food('Plain A'),food('Plain B'),food('Plain C'),food('Plain D'),food('Plain E')])}];
 let candidates=0;
 const result=mergeDualReviews(records,undefined,Date.now(),event=>{betaEventSchema.parse(event);candidates=event.candidates.length;});
 assert.equal(candidates,10);assert.equal(result.alternatives.length,3);
 assert.deepEqual(result.alternatives.map(f=>f.identity.name),['Plain A','Plain B','Plain C']);
});
test('a conflicting duplicate cannot cherry-pick its favorable estimate; every original estimate must pass',()=>{
 const disputed={...food('Disputed'),nutrition:{...food('Disputed').nutrition,transFatG:1}};
 const result=mergeDualReviews([{model:dualModels[0],envelope:review([food('Disputed'),food('Good')])},{model:dualModels[1],envelope:review([disputed])}]);
 assert.deepEqual(result.alternatives.map(f=>f.identity.name),['Good']);
 const lower={...structuredClone(original),rating:'neutral' as const,nutrition:{...original.nutrition,sugarsG:6,addedSugarsG:6}};
 const both=mergeDualReviews([{model:dualModels[0],envelope:review([food('Eight sugar',8),food('One sugar')])},{model:dualModels[1],envelope:review([],lower)}]);
 assert.deepEqual(both.alternatives.map(f=>f.identity.name),['One sugar']);assert.equal(both.estimatesDiffer,true);
});
test('product disagreement withholds alternatives and a favorable color',()=>{
 const other={...structuredClone(original),identity:{...identity,name:'Another Cereal'}};
 const result=mergeDualReviews([{model:dualModels[0],envelope:review()},{model:dualModels[1],envelope:review([],other)}]);
 assert.equal(result.reviewState,'identity-conflict');assert.equal(result.original?.rating,null);assert.equal(result.original?.identity.status,'uncertain');assert.equal(result.alternatives.length,0);
});
test('one failure preserves the other complete result; both failures and cancellations do not retry',async()=>{
 let calls=0;
 const good=async()=>{calls++;return envelope(review());},bad=async()=>{calls++;throw Error('failure');};
 const provider=createDualPhotoProvider({gpt:bad,claude:good,reservePair:async()=>{}});
 const result=await provider.recognize(input(),new AbortController().signal);
 assert.equal(result.reviewState,'partial');assert.deepEqual(result.models,[dualModels[1]]);assert.equal(result.alternatives.length,1);assert.equal(calls,2);
 const both=createDualPhotoProvider({gpt:bad,claude:bad,reservePair:async()=>{}});
 await assert.rejects(both.recognize(input(),new AbortController().signal),/PHOTO_OUTCOME_UNKNOWN/);assert.equal(calls,4);
 const cancelled=new AbortController();cancelled.abort();await assert.rejects(provider.recognize(input(),cancelled.signal));assert.equal(calls,4);
 const failedBudget=createDualPhotoProvider({gpt:good,claude:good,reservePair:async()=>{throw Error('cap');}});
 await assert.rejects(failedBudget.recognize(input(),new AbortController().signal),/PHOTO_BUDGET_UNAVAILABLE/);assert.equal(calls,4);
});

test('identity matching tolerates field placement and verified parent brand but preserves flavors and other brands',()=>{
 const a={...original,identity:{...identity,brand:'General Mills',name:'Honey Nut Cheerios',variant:null}};
 const b={...original,identity:{...identity,brand:'Cheerios',name:'Cereal',variant:'Honey Nut'}};
 assert.equal(dualIdentityKey(a),dualIdentityKey(b));
 for(const other of [{...b,identity:{...b.identity,variant:'Chocolate'}},{...a,identity:{...a.identity,brand:'Other Brand'}},
  {...a,identity:{...a.identity,name:'Original Cheerios'}},{...a,identity:{...a.identity,name:'Honey Nut Cheerios Protein'}}])
  assert.notEqual(dualIdentityKey(a),dualIdentityKey(other));
 const sameName={...original,identity:{...identity,brand:'Fixture',name:'Fixture Plain',variant:'Salt Free'}};
 assert.equal(dualIdentityKey(sameName),dualIdentityKey({...sameName,identity:{...sameName.identity,name:'Plain Salt Free',variant:null}}));
 let logged=false;
 const result=mergeDualReviews([{model:dualModels[0],envelope:review([food('Plain A')],a)},{model:dualModels[1],envelope:review([food('Plain B')],b)}],undefined,Date.now(),event=>{betaEventSchema.parse(event);assert.equal(event.originals.length,2);logged=true;});
 assert.equal(result.reviewState,'complete');assert.equal(result.alternatives.length,2);assert.equal(logged,true);
});
test('cancelling an in-flight pair aborts both providers with no retry or final result',async()=>{
 let started=0,aborted=0;const controller=new AbortController();
 const waiting=async(_request:Record<string,unknown>,signal:AbortSignal)=>new Promise<string>((_resolve,reject)=>{
  started++;signal.addEventListener('abort',()=>{aborted++;reject(Error('cancelled'));},{once:true});
 });
 const provider=createDualPhotoProvider({gpt:waiting,claude:waiting,reservePair:async()=>{}});
 const pending=provider.recognize(input(),controller.signal);await settle();assert.equal(started,2);controller.abort();
 await assert.rejects(pending,/PHOTO_CANCELLED/);assert.equal(aborted,2);assert.equal(started,2);
});


test('a model-neutral original still triggers comparisons when calculated green, without inventing a green consensus',()=>{
 const base={...food('Original'),rating:'neutral' as const,nutrition:{...food('Original').nutrition,addedSugarsG:4,sugarsG:4}};
 const candidate={...food('Better'),nutrition:{...food('Better').nutrition,fiberG:6}};
 assert.equal(estimatedRatingDecision(base).rating,'healthy');
 const result=mergeDualReviews([{model:dualModels[0],envelope:review([candidate],base)},{model:dualModels[1],envelope:review([],base)}]);
 assert.equal(result.original?.rating,null);assert.equal(result.alternatives.length,1);
});


test('reject a real observed invented brand/product pairing; keep legitimate Country Style names',()=>{
 const invented={...food('Cheerios-style toasted oat cereal'),identity:{...identity,brand:"Kellogg's",name:'Cheerios-style toasted oat cereal',variant:'Plain unsweetened'}};
 const legitimate={...food('Old Country Style Muesli'),identity:{...identity,brand:"Bob's Red Mill",name:'Old Country Style Muesli',variant:null}};
 const result=mergeDualReviews([{model:dualModels[0],envelope:review([invented,legitimate])}]);
 assert.deepEqual(result.alternatives.map(f=>f.identity.name),['Old Country Style Muesli']);
 const a={...food('Plain Cheerios'),identity:{...identity,brand:'Cheerios',name:'Plain Cheerios',variant:'Original'}};
 const b={...a,identity:{...a.identity,brand:'General Mills',name:'Cheerios'}};
 assert.equal(dualIdentityKey(a),dualIdentityKey(b));
});

test('pair dispatch accounting crosses the former cutoff with two attempt records and preserves legacy history',async()=>{
 const root=mkdtempSync(join(tmpdir(),'dual-budget-')),dir=join(root,'.tools/openai'),path=join(dir,'testing-ledger.jsonl');
 mkdirSync(dir,{recursive:true,mode:0o700});
 const previous=Array.from({length:449},()=>JSON.stringify({kind:'test',reservedMicroUSD:20000})).join('\n')+'\n';
 try{
  writeFileSync(path,previous,{mode:0o600});
  const record=createSharedReportBudget(root,'product-photo-dual',2);
  await record();await record();
  const saved=readFileSync(path,'utf8');assert.ok(saved.startsWith(previous));
  const added=saved.slice(previous.length).trim().split('\n').map(row=>JSON.parse(row));
  assert.equal(added.length,4);
  assert.ok(added.every(row=>row.attemptCount===1 && row.kind==='product-photo-dual' && !('reservedMicroUSD' in row)));
  for(const invalid of [null,{attemptCount:true},{attemptCount:2},{attemptCount:'1'},{attemptCount:1,reservedMicroUSD:20000}]){
   const broken=saved+JSON.stringify(invalid)+'\n';writeFileSync(path,broken);
   await assert.rejects(record());assert.equal(readFileSync(path,'utf8'),broken);
  }
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('v4 requires new consent; old v3 remains single-provider and new v4 is independently streamed',async()=>{
 let pairs=0,old=0;
 const dualReviews=createDualPhotoProvider({gpt:async()=>envelope(review()),claude:async()=>envelope(review([food('Claude option')])),reservePair:async()=>{pairs++;}});
 const aiReviews=createAiReviewProvider({transport:async()=>{old++;return envelope(review());},reserveBudget:async()=>{}});
 const server=createAppServer({accessMode:'open-beta',aiReviews,dualReviews});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+(server.address() as AddressInfo).port;
 try{
  const post=(path:string,body:unknown)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  for(const body of [{...input(),consentVersion:AI_FOOD_CONSENT},{...input(),profile:{}},{...input(),location:{}}])assert.equal((await post('/v4/photos/recognize',body)).status,400);
  assert.equal(pairs,0);
  const result=await (await post('/v4/photos/recognize',input())).json();assert.equal(result.schemaVersion,4);assert.equal(result.alternatives.length,2);assert.equal(pairs,1);
  const legacy=await (await post('/v3/photos/recognize',{...input(),consentVersion:AI_FOOD_CONSENT})).json();assert.equal(legacy.schemaVersion,3);assert.equal(legacy.model,'gpt-6-luna');assert.equal(old,1);assert.equal(pairs,1);
  const caps=await (await fetch(base+'/v4/photos/capabilities')).json();assert.equal(caps.consentVersion,DUAL_FOOD_CONSENT);assert.deepEqual(caps.models,[dualModels[0]]);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});


test('partial reviews distinguish network, malformed JSON and invalid schema without retaining private errors',async()=>{
 const sensitive='PRIVATE_PHOTO_PROFILE_AND_SECRET';
 const cases=[
  {transport:async()=>{throw new TypeError(sensitive,{cause:{code:'ECONNRESET',message:sensitive}});},code:'dual_transport_connection_reset'},
  {transport:async()=>{throw new TypeError(sensitive,{cause:{code:sensitive}});},code:'dual_transport_type_error'},
  {transport:async()=>'{',code:'dual_response_json_invalid'},
  {transport:async()=>envelope({status:'identified',original:{private:sensitive},alternatives:[]}),code:'dual_response_schema_invalid'},
 ];
 for(const entry of cases){
  const events:unknown[]=[];
  const provider=createDualPhotoProvider({gpt:async()=>envelope(review()),claude:entry.transport,reservePair:async()=>{},audit:{record:(_trace,event)=>{betaEventSchema.parse(event);events.push(event);}}});
  const result=await provider.recognize(input(),new AbortController().signal);
  assert.deepEqual(result.models,[dualModels[0]]);assert.equal(result.reviewState,'partial');assert.equal(result.alternatives.length,1);
  const failure=events.find((row)=>typeof row==='object'&&row!==null&&'kind' in row&&row.kind==='failure') as {code:string;stage:string};
  assert.equal(failure.stage,'dual_claude');assert.equal(failure.code,entry.code);assert.ok(!JSON.stringify(events).includes(sensitive));
 }
});
test('preview callback failure is distinguished from provider response failure',async()=>{
 const events:{kind:string;code?:string}[]=[];
 const provider=createDualPhotoProvider({gpt:async()=>envelope(review()),claude:async(_request,_signal,onText)=>{onText?.(JSON.stringify(review()));return envelope(review());},reservePair:async()=>{},audit:{record:(_trace,event)=>events.push(event)}});
 const result=await provider.recognize(input(),new AbortController().signal,undefined,undefined,()=>{throw new TypeError('private callback content');});
 assert.equal(result.reviewState,'partial');assert.deepEqual(result.models,[dualModels[0]]);
 assert.equal(events.find(e=>e.kind==='failure')?.code,'dual_preview_type_error');
 assert.ok(!JSON.stringify(events).includes('private callback content'));
});
test('empty model proposals are logged separately from rejected alternatives',()=>{
 let reason='';
 const result=mergeDualReviews([{model:dualModels[0],envelope:review([])}],undefined,Date.now(),event=>{reason=event.reason;betaEventSchema.parse(event);});
 assert.equal(result.alternatives.length,0);assert.equal(reason,'model_returned_no_alternatives');
});


test('rating disagreement never inherits the faster favorable verdict or merges invented nutrient values',()=>{
 const salty={...structuredClone(original),category:'tomato-pasta-sauce',rating:'not_healthy' as const,servingGrams:100,nutrition:{...original.nutrition,addedSugarsG:2,sugarsG:4,sodiumMg:600}};
 const moderate={...structuredClone(salty),rating:'neutral' as const,nutrition:{...salty.nutrition,sodiumMg:300}};
 for(const preferred of dualModels){
  for(const ordered of [
   [{model:dualModels[0],envelope:review([],salty)},{model:dualModels[1],envelope:review([],moderate)}],
   [{model:dualModels[1],envelope:review([],moderate)},{model:dualModels[0],envelope:review([],salty)}],
  ]){
   const result=mergeDualReviews(ordered,preferred);
   assert.equal(result.reviewState,'complete');assert.equal(result.estimatesDiffer,true);
   assert.equal(result.original?.rating,null);assert.equal(result.original?.nutrition.sodiumMg,600);
   assert.deepEqual(result.original?.nutrition,salty.nutrition);
  }
 }
 const single=mergeDualReviews([{model:dualModels[1],envelope:review([],moderate)}]);
 assert.equal(single.reviewState,'partial');assert.equal(single.original?.rating,'neutral');
});

test('GPT-only legacy route is complete and keeps three checked alternatives without a second request',async()=>{
 let calls=0,reserved=0;const events:unknown[]=[];
 const provider=createDualPhotoProvider({gpt:async request=>{calls++;assert.equal(request.model,'gpt-6-luna');return envelope(review([food('Plain A'),food('Plain B'),food('Plain C'),food('Unsafe',20)]));},reservePair:async()=>{reserved++;},audit:{record:(_t,e)=>events.push(e)}});
 const result=await provider.recognize(input(),new AbortController().signal);
 assert.equal(calls,1);assert.equal(reserved,1);assert.deepEqual(result.models,['gpt-6-luna']);
 assert.equal(result.reviewState,'complete');assert.equal(result.estimatesDiffer,false);
 assert.equal(result.alternatives.length,3);assert.ok(result.alternatives.every(f=>f.identity.name!=='Unsafe'));
 assert.equal(events.filter(e=>(e as {kind:string}).kind==='model_query').length,1);
});
test('GPT-only failure surfaces an error without another provider or retry',async()=>{
 let calls=0;const provider=createDualPhotoProvider({gpt:async()=>{calls++;throw Error('offline');},reservePair:async()=>{}});
 await assert.rejects(provider.recognize(input(),new AbortController().signal),/PHOTO_OUTCOME_UNKNOWN/);
 assert.equal(calls,1);
});
