import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateNewsPool,selectNewsArticles,fetchNewsPool,NEWS_MAX_AGE_MS,newsDay,newsPublishers} from '../src/newsPersonalization.ts';
import {article,pool,newsNow} from './fixtures/news.ts';
import {snapshotSchema,newSnapshot} from '../src/beta.ts';
test('versioned news validates each exact publisher feed and article host',()=>{
 for(const publisher of Object.keys(newsPublishers) as (keyof typeof newsPublishers)[])assert.equal(validateNewsPool(pool([article(1,{publisher})]),newsNow).articles.length,1);
 for(const changes of [{url:'https://www.eatingwell.com.evil.test/a'},{url:'http://www.eatingwell.com/a'},{url:'https://user@www.eatingwell.com/a'},{feedUrl:'https://untrusted.test/feed'},{title:'bad\u0000headline'}])assert.throws(()=>validateNewsPool(pool([article(1,changes)]),newsNow));
});
test('dates, duplicates, unrecognized fields and collection size fail closed',()=>{
 const a=article(1);
 for(const data of [
  {...pool([a]),generatedAt:new Date(newsNow+61000).toISOString()},
  {...pool([a]),editionDate:'2026-10-17'},
  pool([article(1,{publishedAt:new Date(newsNow+1).toISOString()})]),
  pool([article(1,{publishedAt:new Date(newsNow-NEWS_MAX_AGE_MS-1).toISOString()})]),
  pool([a,a]),pool(Array.from({length:51},(_,i)=>article(i))),
  {...pool([a]),profile:{age:52}},
 ])assert.throws(()=>validateNewsPool(data,newsNow));
 assert.equal(newsDay(Date.parse('2026-10-18T02:00:00Z')),'2026-10-17');
 assert.equal(newsDay(Date.parse('2026-03-08T07:00:00Z')),'2026-03-08');
});
const candidates=()=>pool([article(0,{tags:['diabetes']}),article(1,{tags:['hypertension']}),article(2),article(3),article(4),article(5,{tags:['vegetarian']}),article(6,{tags:['generalFitness']}),article(7,{tags:['olderAdults']})]);
test('saved concerns re-rank locally and retain two general stories and source variety',()=>{
 const input=candidates(),before=JSON.stringify(input);
 const diabetic=selectNewsArticles(input,{primary:'diabetes',conditions:['diabetes']},true,newsNow);
 assert.equal(diabetic.articles[0].id,article(0).id);assert.equal(diabetic.personalized,true);assert.equal(diabetic.articles.length,5);
 const pressure=selectNewsArticles(input,{primary:'hypertension',conditions:['hypertension']},true,newsNow);
 assert.equal(pressure.articles[0].id,article(1).id);
 assert.ok(diabetic.articles.filter(a=>!a.tags.includes('diabetes')).length>=2);
 assert.ok(diabetic.articles.filter(a=>a.publisher==='EatingWell').length<=3);
 assert.equal(JSON.stringify(input),before);
});
test('missing profile and General preference use the same general selection',()=>{
 const input=candidates(),general=selectNewsArticles(input,undefined,true,newsNow);
 assert.deepEqual(selectNewsArticles(input,{},true,newsNow),general);
 assert.deepEqual(selectNewsArticles(input,{primary:'noConcern',conditions:[]},true,newsNow),general);
 assert.deepEqual(selectNewsArticles(input,{primary:'diabetes',conditions:['diabetes']},false,newsNow),general);
 assert.equal(general.personalized,false);
});
test('explicit dietary preferences, older audience and general fitness can match topics',()=>{
 assert.equal(selectNewsArticles(candidates(),{restrictions:['vegetarian']},true,newsNow).articles[0].id,article(5).id);
 assert.equal(selectNewsArticles(candidates(),{age:67},true,newsNow).articles[0].id,article(7).id);
 assert.equal(selectNewsArticles(candidates(),{age:52},true,newsNow).personalized,false);
 assert.equal(selectNewsArticles(candidates(),{primary:'generalFitness'},true,newsNow).articles[0].id,article(6).id);
 const pregnancy=pool([article(1,{tags:['pregnancy']}),article(2)]);
 assert.equal(selectNewsArticles(pregnancy,{pregnancy:'pregnant'},true,newsNow).personalized,true);
 assert.equal(selectNewsArticles(pregnancy,{pregnancy:'unspecified'},true,newsNow).personalized,false);
});
test('expired saved stories and inappropriate audience cannot be revived by relevance',()=>{
 const input=pool([article(1,{tags:['diabetes'],publishedAt:new Date(newsNow-NEWS_MAX_AGE_MS).toISOString()}),article(2,{audience:'children',tags:['diabetes']}),article(3)]);
 assert.deepEqual(selectNewsArticles(input,{primary:'diabetes'},true,newsNow+1).articles.map(a=>a.id),[article(3).id]);
 assert.equal(selectNewsArticles(input,{},true,newsNow+NEWS_MAX_AGE_MS).articles.length,0);
});
test('freshness, near-duplicates and sparse source limits remain enforced',()=>{
 const a=article(1);
 const input=pool([a,article(3,{title:a.title+' updated'}),article(5),article(7),article(9),article(2,{publishedAt:new Date(newsNow-6*86400000).toISOString(),tags:['diabetes']})]);
 const chosen=selectNewsArticles(input,{},true,newsNow).articles;
 assert.equal(chosen.filter(row=>row.publisher==='EatingWell').length,3);
 assert.equal(chosen.filter(row=>row.title.includes(a.title)).length,1);
 assert.notEqual(chosen[0].id,article(2).id);
});
test('news preference persists without breaking old snapshots or reset defaults',()=>{
 const before=newSnapshot();assert.equal(snapshotSchema.parse(before).newsPersonalization,undefined);
 assert.equal(snapshotSchema.parse({...before,newsPersonalization:false}).newsPersonalization,false);
 assert.equal(newSnapshot().newsPersonalization,undefined);
});
test('public request has no profile, location, authentication or query data and rejects oversized/aborted replies',async()=>{
 const fresh={...pool([]),generatedAt:new Date().toISOString(),editionDate:newsDay(Date.now())};
 let calls=0;
 const fetcher:typeof fetch=async(input,init)=>{
  calls++;assert.ok(String(input).endsWith('/v2/news/daily'));assert.equal(new URL(String(input)).search,'');
  assert.deepEqual(Object.keys(init!).sort(),['redirect','signal']);return new Response(JSON.stringify(fresh));
 };
 assert.equal((await fetchNewsPool(new AbortController().signal,fetcher)).schemaVersion,2);assert.equal(calls,1);
 const c=new AbortController();c.abort();await assert.rejects(fetchNewsPool(c.signal,fetcher));assert.equal(calls,1);
 await assert.rejects(fetchNewsPool(new AbortController().signal,async()=>new Response(' '.repeat(160001))));
 await assert.rejects(fetchNewsPool(new AbortController().signal,async()=>new Response('',{status:503})));
});
