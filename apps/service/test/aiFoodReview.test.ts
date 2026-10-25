import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {createAiReviewProvider,parseAiReview,buildAiReviewRequest} from '../src/aiFoodReviewProvider.ts';
import {createAppServer} from '../src/server.ts';
import {AI_FOOD_CONSENT,estimatedRating,type EstimatedFood} from '../../../packages/core/src/aiFoodReview.ts';
const identity={status:'identified' as const,brand:'Fixture',name:'Sweet Oat Cereal',variant:null,size:null,visibleText:[]};
const original:EstimatedFood={identity,category:'breakfast-cereal',servingText:'1 cup (40 g)',servingGrams:40,ingredients:null,rating:'not_healthy',nutrition:{caloriesKcal:150,saturatedFatG:0.5,transFatG:0,sugarsG:12,addedSugarsG:12,carbohydrateG:32,sodiumMg:180,fiberG:3,proteinG:3,potassiumMg:null,calciumMg:null,ironMg:null,magnesiumMg:null}};
const alternative=(name:string):EstimatedFood=>({...original,identity:{...identity,name},rating:'healthy',nutrition:{...original.nutrition,addedSugarsG:1,sugarsG:1,fiberG:5}});
const envelope=(value:unknown)=>JSON.stringify({status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
const review=(alts:unknown[]=[alternative('Plain A'),alternative('Plain B'),alternative('Plain C')])=>({status:'identified',original,alternatives:alts});
const segment=(marker:number,body:Buffer)=>{const head=Buffer.alloc(4);head[0]=255;head[1]=marker;head.writeUInt16BE(body.length+2,2);return Buffer.concat([head,body]);};
const jpeg=()=>Buffer.concat([Buffer.from([255,216]),segment(0xe1,Buffer.from('Exif:PRIVATE GPS')),segment(0xc0,Buffer.from([8,0,100,0,100,1,1,17,0])),segment(0xda,Buffer.from([1,1,0,0,63,0])),Buffer.from([0,255,0,2,255,217])]).toString('base64');
const input=()=>({consentVersion:AI_FOOD_CONSENT,imageBase64:jpeg()});
test('one independent LLM request provides product and three alternatives without database dependency',async()=>{
 let calls=0,reservations=0;const provider=createAiReviewProvider({reserveBudget:async()=>{reservations++;},transport:async request=>{calls++;assert.equal(request.model,'gpt-6-luna');assert.equal(request.store,false);assert.deepEqual(request.tools,[]);assert.ok(!JSON.stringify(request).includes('PRIVATE GPS'));return envelope(review());}});
 for(let i=0;i<4;i++){const result=await provider.recognize(input(),new AbortController().signal);assert.equal(result.alternatives.length,3);assert.equal(result.original?.rating,'not_healthy');assert.equal(result.basis,'ai-estimate');}
 assert.equal(calls,4);assert.equal(reservations,4);
});
test('invalid, duplicate, incomplete, incomparable and worse alternatives never discard original',()=>{
 const bad={...alternative('Bad'),nutrition:{...alternative('Bad').nutrition,transFatG:null}};
 const wrong={...alternative('Wrong use'),category:'protein-powder'};
 const result=parseAiReview(envelope(review([{},bad,wrong,alternative('Good'),{...alternative('Good'),identity:{...alternative('Good').identity,size:'large'}}])));
 assert.equal(result.original?.identity.name,identity.name);assert.equal(result.alternatives.length,1);
 const worse={...alternative('Saltier'),nutrition:{...alternative('Saltier').nutrition,sodiumMg:230}};
 assert.equal(parseAiReview(envelope(review([worse]))).alternatives.length,0);
});
test('unknown nutrition, impossible amounts, uncertain identity and model disagreement never get favorable colors',()=>{
 for(const food of [{...alternative('x'),nutrition:{...alternative('x').nutrition,transFatG:null}}, {...alternative('x'),nutrition:{...alternative('x').nutrition,proteinG:90}}, {...alternative('x'),identity:{...identity,status:'uncertain' as const}}, {...alternative('x'),nutrition:{...alternative('x').nutrition,sugarsG:0,addedSugarsG:10}}])assert.equal(estimatedRating(food),null);
 const result=parseAiReview(envelope({status:'uncertain',original:{...alternative('x'),identity:{...identity,status:'uncertain'}},alternatives:[]}));assert.equal(result.original?.rating,null);
 const disagreement=parseAiReview(envelope({status:'identified',original:{...alternative('x'),rating:'very_healthy'},alternatives:[]}));assert.equal(disagreement.original?.rating,null);
});
test('transport/refusal/truncation are not automatically retried, and diagnostics contain no input',async()=>{
 for(const raw of ['',JSON.stringify({status:'incomplete',output:[]}),JSON.stringify({status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'refusal'}]}]})]){
  let calls=0;const diagnostics:string[]=[];const provider=createAiReviewProvider({reserveBudget:async()=>{},transport:async()=>{calls++;return raw;},diagnostic:code=>diagnostics.push(code)});
  await assert.rejects(provider.recognize(input(),new AbortController().signal),/PHOTO_OUTCOME_UNKNOWN/);assert.equal(calls,1);assert.deepEqual(diagnostics,['response_failed']);
 }
});
test('busy, cancelled and exhausted requests respect budget and release admission',async()=>{
 let finish!:(s:string)=>void,calls=0;const provider=createAiReviewProvider({reserveBudget:async()=>{},transport:async()=>{calls++;return new Promise(r=>finish=r);}}),controller=new AbortController();
 const pending=provider.recognize(input(),controller.signal);await Promise.resolve();await Promise.resolve();await assert.rejects(provider.recognize(input(),new AbortController().signal),/PHOTO_BUSY/);controller.abort();finish(envelope(review()));await assert.rejects(pending,/PHOTO_CANCELLED/);assert.equal(calls,1);
 const blocked=createAiReviewProvider({reserveBudget:async()=>{throw Error('budget');},transport:async()=>{throw Error('must not dispatch');}});await assert.rejects(blocked.recognize(input(),new AbortController().signal),/PHOTO_BUDGET_UNAVAILABLE/);assert.equal(blocked.available(),false);
});
test('v3 route remains key-free but rejects health/location fields and wrong consent before dispatch',async()=>{
 let calls=0;const aiReviews=createAiReviewProvider({reserveBudget:async()=>{},transport:async()=>{calls++;return envelope(review());}});const server=createAppServer({accessMode:'open-beta',aiReviews});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+(server.address() as AddressInfo).port;
 try{for(const payload of [{...input(),profile:{}},{...input(),location:{}},{...input(),weightContext:{}},{...input(),consentVersion:'old'}])assert.equal((await fetch(url+'/v3/photos/recognize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})).status,400);
  assert.equal(calls,0);assert.equal((await fetch(url+'/v3/photos/recognize',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input())})).status,200);assert.equal(calls,1);
  const caps=await (await fetch(url+'/v3/photos/capabilities')).json() as {schemaVersion:number};assert.equal(caps.schemaVersion,3);assert.equal((await fetch(url+'/v3/admin')).status,404);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
test('request does not send matched foods, user data, invented URLs or source tools',()=>{const request=buildAiReviewRequest('fixture');assert.equal(request.input[0].content.length,2);assert.ok(!JSON.stringify(request.input).includes('food-details'));assert.equal(request.tool_choice,'none');assert.match(request.instructions,/No internet/);});

test('name order and repeated original-variant wording cannot fill alternative slots with one product',()=>{
 const first=alternative('Original Plain Oats'),same={...alternative('Plain Oats'),identity:{...alternative('Plain Oats').identity,variant:'Original'}};
 assert.equal(parseAiReview(envelope(review([first,same]))).alternatives.length,1);
 assert.equal(estimatedRating({...alternative('Impossible'),nutrition:{...alternative('Impossible').nutrition,carbohydrateG:39,proteinG:38}}),null);
});
