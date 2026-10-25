import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAppServer} from '../src/server.ts';
import {readNewsPool,readFoodNews} from '../src/foodNews.ts';
import {article,pool,newsNow} from '../../../packages/core/test/fixtures/news.ts';
test('public pool route supports GET HEAD ETag, no auth and rejects writes',async()=>{
 const directory=mkdtempSync(join(tmpdir(),'food-news-')),path=join(directory,'pool.json');
 writeFileSync(path,JSON.stringify(pool([article(1)])));
 const server=createAppServer({newsPool:()=>readNewsPool(path,newsNow),catalogBurst:100});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+(server.address() as {port:number}).port;
 try{
  const response=await fetch(base+'/v2/news/daily');assert.equal(response.status,200);
  const body=await response.json();assert.equal(body.articles[0].publisher,'EatingWell');assert.equal(body.schemaVersion,2);
  assert.equal(response.headers.get('cache-control'),'public, max-age=900');const etag=response.headers.get('etag')!;
  const head=await fetch(base+'/v2/news/daily',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  assert.equal((await fetch(base+'/v2/news/daily',{headers:{'if-none-match':etag}})).status,304);
  assert.equal((await fetch(base+'/v2/news/daily',{method:'POST',body:'{}'})).status,405);
  assert.equal((await fetch(base+'/v1/news/daily')).status,503);
  writeFileSync(path,'broken');assert.equal((await fetch(base+'/v2/news/daily')).status,503);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));rmSync(directory,{recursive:true});}
});
test('service expires old metadata and changes ETag while preserving legacy schema',()=>{
 const directory=mkdtempSync(join(tmpdir(),'food-news-')),path=join(directory,'news.json');
 try{
  writeFileSync(path,JSON.stringify(pool([article(1)])));
  const first=readNewsPool(path,newsNow),later=readNewsPool(path,newsNow+8*86400000);
  assert.equal(later.edition.articles.length,0);assert.notEqual(first.etag,later.etag);
  const a=article(1,{publisher:'NIH Research Matters'}),{tags,kind,evidence,audience,...legacy}=a;
  const v1={schemaVersion:1,editionDate:'2026-10-18',timeZone:'America/New_York',generatedAt:new Date(newsNow).toISOString(),selectionPolicy:'publisher-rss-2026-10-16.1',articles:[legacy]};
  writeFileSync(path,JSON.stringify(v1));
  assert.equal(readFoodNews(path,newsNow).edition.articles.length,1);
  assert.equal(readFoodNews(path,newsNow+8*86400000).edition.articles.length,0);
  writeFileSync(path,'x'.repeat(160001));assert.throws(()=>readNewsPool(path));
 }finally{rmSync(directory,{recursive:true});}
});
