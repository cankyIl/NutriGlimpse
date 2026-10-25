import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prepareNewsRequest,newsRequestSchema,buildNewsSelection,validateNewsSelection,generalNewsCache,fetchSelectedNews} from '../src/newsSelection.ts';
import {article,pool,newsNow} from './fixtures/news.ts';
import {newsDay} from '../src/newsPersonalization.ts';
test('news request whitelists useful context and excludes personal identifiers, measurements and labs',()=>{
 const profile={primary:'diabetes' as const,conditions:['diabetes' as const,'hypertension' as const],restrictions:['vegetarian' as const],age:52,gender:'male' as const,pregnancy:'not-pregnant' as const,
 name:'Never transmit',location:{latitude:42,longitude:-71},lipids:{ldl:180},bodyMeasurements:{height:{value:70,unit:'in'},weight:{value:188,unit:'lb'}}};
 const input=prepareNewsRequest(profile as Parameters<typeof prepareNewsRequest>[0]);
 assert.deepEqual(input,{mode:'personalized',preferences:{primary:'diabetes',conditions:['diabetes','hypertension'],restrictions:['vegetarian']}});
 for(const field of ['name','location','lipids','bodyMeasurements','gender','age'])assert.ok(!JSON.stringify(input).includes('"'+field+'"'));
 assert.deepEqual(prepareNewsRequest({age:70,pregnancy:'pregnant'}),{mode:'personalized',preferences:{ageGroup:'65-plus',pregnancy:'pregnant'}});
});
test('missing or non-specific details and explicit opt-out request general news',()=>{
 for(const profile of [undefined,null,{}, {age:52,gender:'male' as const}, {primary:'noConcern' as const,conditions:[],restrictions:[]}])assert.deepEqual(prepareNewsRequest(profile),{mode:'general'});
 assert.deepEqual(prepareNewsRequest({primary:'diabetes'},false),{mode:'general'});
 assert.deepEqual(prepareNewsRequest({primary:'generalFitness'}),{mode:'personalized',preferences:{primary:'generalFitness'}});
});
test('server rejects arbitrary profile data and ambiguous mode payloads',()=>{
 for(const input of [
  {mode:'general',preferences:{conditions:['diabetes']}},
  {mode:'personalized',preferences:{}},
  {mode:'personalized',preferences:{age:52,conditions:['diabetes']}},
  {mode:'personalized',preferences:{conditions:['unknown']}},
  {mode:'personalized',preferences:{conditions:['diabetes','diabetes']}},
  {mode:'personalized',preferences:{primary:'diabetes'},name:'private'},
 ])assert.equal(newsRequestSchema.safeParse(input).success,false);
});
test('server chooses relevant stories and always returns an independent general fallback without profile data',()=>{
 const input=pool([article(0),article(1,{tags:['hypertension']}),article(2,{tags:['diabetes']}),article(3),article(4),article(5)]);
 const p=buildNewsSelection(input,prepareNewsRequest({primary:'hypertension'}),newsNow);
 assert.equal(p.articles[0].id,article(1).id);assert.equal(p.personalized,true);
 const general=buildNewsSelection(input,{mode:'general'},newsNow);
 assert.equal(general.personalized,false);assert.deepEqual(p.generalArticles,general.articles);
 const saved=generalNewsCache(p);assert.deepEqual(saved.articles,general.articles);
 assert.ok(!('preferences' in saved));assert.ok(!('personalized' in saved));assert.ok(!('generalArticles' in saved));
 assert.deepEqual(Object.keys(p).sort(),['articles','editionDate','generalArticles','generatedAt','maxAgeDays','personalized','schemaVersion','selectionPolicy','timeZone'].sort());
});
test('server may return general news when there is no matching topic and cannot restore expired stories',()=>{
 const p=pool([article(1)]);
 const output=buildNewsSelection(p,prepareNewsRequest({primary:'ckd'}),newsNow);
 assert.equal(output.personalized,false);assert.equal(output.articles.length,1);
 assert.equal(buildNewsSelection(p,{mode:'general'},newsNow+8*86400000).articles.length,0);
 assert.throws(()=>validateNewsSelection({...output,generalArticles:[article(1),article(1)]},newsNow));
 assert.throws(()=>validateNewsSelection({...output,preferences:{conditions:['diabetes']}},newsNow));
});
test('selection is posted privately to one endpoint without request data in the URL',async()=>{
 const current={...pool([]),generatedAt:new Date().toISOString(),editionDate:newsDay(Date.now())};
 const input=prepareNewsRequest({primary:'diabetes'}),output=buildNewsSelection(current,input);
 let calls=0;
 const fetcher:typeof fetch=async(url,init)=>{
  calls++;assert.ok(String(url).endsWith('/v2/news/selection'));assert.equal(new URL(String(url)).search,'');
  assert.equal(init?.method,'POST');assert.equal(init?.cache,'no-store');assert.equal(init?.redirect,'error');
  assert.deepEqual(JSON.parse(String(init?.body)),input);
  assert.deepEqual(init?.headers,{'Content-Type':'application/json'});
  return new Response(JSON.stringify(output));
 };
 assert.equal((await fetchSelectedNews(input,new AbortController().signal,fetcher)).schemaVersion,2);assert.equal(calls,1);
 const controller=new AbortController();controller.abort();await assert.rejects(fetchSelectedNews(input,controller.signal,fetcher));assert.equal(calls,1);
 await assert.rejects(fetchSelectedNews(input,new AbortController().signal,async()=>new Response(' '.repeat(160001))));
 await assert.rejects(fetchSelectedNews(input,new AbortController().signal,async()=>new Response('',{status:503})));
});
