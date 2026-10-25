import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedProductPage,createProductPageReader,hasNutritionTable,productPageText,publicIPv4,type PageDependencies} from '../src/geminiSearchPages.ts';
import {exactSourceUrl} from '../src/geminiPhotoAdapter.ts';
import {createSearchSession,createSerperProductSearch} from '../src/geminiBoundedSearch.ts';
const url='https://www.thegoodcrispcompany.com/products/new-variety-pack';
const second='https://giantfood.com/groceries/crisps-variety-pack.html';
const table='Classic Original Nutrition Facts Calories 140 Total Fat 7g Sodium 170mg Carbohydrate 18g Dietary Fiber 2g Sugars 0g Protein 1g';
const address={address:'93.184.216.34',family:4};
const ok=(text=table)=>({status:200,type:'text/html',text});
const signal=()=>new AbortController().signal;
const searchResponse=()=>Response.json({organic:[{link:url,title:'Manufacturer',snippet:'Product'},{link:second,title:'Retailer',snippet:'Nutrition'}]});

test('new manufacturer and retailer domains need no hardcoded brand entry',()=>{
 assert.equal(allowedProductPage(url)?.href,url);assert.equal(allowedProductPage(second)?.href,second);
 for(const bad of ['https://169.254.169.254/latest','https://2130706433/data','https://0x7f000001/data','https://127.1/data','https://localhost./data','https://internal/data','https://a.internal/data','https://a.local/data','https://a.home/data','https://a.onion/data','https://a.arpa/data','https://user:password@manufacturer.com/product','https://manufacturer.com:8443/product','http://manufacturer.com/product'])assert.equal(allowedProductPage(bad),null,bad);
});
test('only public IPv4 addresses are eligible for pinned HTTPS',()=>{
 for(const ip of ['0.0.0.0','10.2.3.4','127.2.3.4','169.254.169.254','172.16.0.1','172.31.255.255','192.168.0.1','100.64.0.1','100.127.255.255','192.0.2.1','192.88.99.1','198.18.0.1','198.51.100.1','203.0.113.1','224.0.0.1','255.255.255.255','256.1.1.1','1.2.3','::1'])assert.equal(publicIPv4(ip),false,ip);
 assert.equal(publicIPv4(address.address),true);
});
test('DNS is checked and pinned, including on every redirect',async()=>{
 const requests:string[]=[];const hosts:string[]=[];
 const reader=createProductPageReader({resolve:async host=>{hosts.push(host);return [address];},request:async(u,p)=>{
  requests.push(u.href);assert.deepEqual(p,address);return requests.length===1?{status:301,type:'text/html',text:'',location:second}:ok();
 }});
 const page=await reader(url,signal());assert.equal(page?.url,second);assert.match(page?.text??'',/Sodium 170mg/);
 assert.deepEqual(hosts,['www.thegoodcrispcompany.com','giantfood.com']);assert.equal(requests.length,2);
});
test('mixed private DNS or a public redirect to private DNS is never requested',async()=>{
 let requests=0;const reader=createProductPageReader({resolve:async host=>host.includes('goodcrisp')?[address]:[{address:'10.0.0.2',family:4}],request:async()=>{requests++;return {status:302,type:'text/html',text:'',location:second};}});
 assert.equal(await reader(url,signal()),null);assert.equal(requests,1);
 const mixed=createProductPageReader({resolve:async()=>[address,{address:'192.168.50.10',family:4}],request:async()=>{requests++;return ok();}});
 assert.equal(await mixed(url,signal()),null);assert.equal(requests,1);
});
test('redirects cannot switch to HTTP or credentials and redirect loops are bounded',async()=>{
 for(const location of ['http://manufacturer.com/product','https://user:secret@manufacturer.com/product','https://127.0.0.1/private']){
  let calls=0;const reader=createProductPageReader({resolve:async()=>[address],request:async()=>{calls++;return {status:302,type:'text/html',text:'',location};}});
  assert.equal(await reader(url,signal()),null);assert.equal(calls,1);
 }
 let calls=0;const loop=createProductPageReader({resolve:async()=>[address],request:async()=>{calls++;return {status:302,type:'text/html',text:'',location:url};}});
 assert.equal(await loop(url,signal()),null);assert.equal(calls,3);
});
test('cancellation releases a stuck resolver and prevents requests',async()=>{
 let requested=false;const reader=createProductPageReader({resolve:()=>new Promise(()=>{}),request:async()=>{requested=true;return ok();}});
 const c=new AbortController(),pending=reader(url,c.signal);c.abort();assert.equal(await pending,null);assert.equal(requested,false);
});
test('binary content and error pages do not become nutrition evidence',async()=>{
 for(const response of [{status:403,type:'text/html',text:table},{status:200,type:'image/jpeg',text:table}]){
  const reader=createProductPageReader({resolve:async()=>[address],request:async()=>response});assert.equal(await reader(url,signal()),null);
 }
});
test('an unreadable or sparse primary page falls back within the same Google query',async()=>{
 for(const first of [null,{url,text:'Calories 140 Saturated Fat 3g'}]){
  let queries=0;const reads:string[]=[],signals:AbortSignal[]=[];
  const search=createSerperProductSearch('fixture',async()=>{queries++;return searchResponse();},async(u,s)=>{reads.push(u);signals.push(s);return u===url?first:{url:u,text:table};});
  const hits=await search('variety pack nutrition',signal());assert.equal(queries,1);assert.deepEqual(reads,[url,second]);assert.equal(signals[0],signals[1]);assert.equal(hits[1].pageText,table);
  if(first)assert.equal(hits[0].pageText,first.text,'partial source remains available');
 }
});
test('a useful primary table avoids a second page request',async()=>{
 let reads=0;const search=createSerperProductSearch('fixture',async()=>searchResponse(),async u=>{reads++;return {url:u,text:table};});
 const hits=await search('variety pack nutrition',signal());assert.equal(reads,1);assert.equal(hits[0].pageText,table);
});
test('both page reads are bounded, cached across concurrent queries, and do not add Google queries',async()=>{
 let queries=0,reads=0;const search=createSerperProductSearch('fixture',async()=>{queries++;return searchResponse();},async()=>{reads++;return null;});
 const s=createSearchSession(search,signal());await Promise.all([s.execute(['a','b','c']),s.execute(['d','e','f','g'])]);
 assert.equal(queries,6);assert.equal(reads,2);assert.equal(s.snapshot().attempted,6);assert.equal(s.snapshot().blocked,1);
});
test('redirect destinations are verified aliases; the original result URL remains available',async()=>{
 const dest='https://www.thegoodcrispcompany.com/products/current-variety-pack';
 const search=createSerperProductSearch('fixture',async()=>searchResponse(),async u=>({url:dest,text:table}));
 const s=createSearchSession(search,signal());await s.execute(['nutrition']);const snapshot=s.snapshot();
 assert.ok(snapshot.urls.includes(url));assert.ok(snapshot.urls.includes(dest));
 assert.equal(snapshot.records[0].results[0].url,url);assert.equal(snapshot.records[0].results[0].resolvedUrl,dest);
 assert.ok(!snapshot.urls.includes('https://manufacturer.com/guessed-product'));
});
test('page extraction keeps flavor headings and separate values rather than creating a merged table',()=>{
 const text=productPageText('<h1>Variety Pack</h1><h2>Classic Original</h2><div>'+table+'</div><h2>Sour Cream and Onion</h2><div>Nutrition Facts Calories 150 Sodium 230mg Protein 1g</div>');
 assert.match(text,/Classic Original.*Sodium 170mg.*Sour Cream and Onion.*Sodium 230mg/s);
 assert.equal(hasNutritionTable(text),true);assert.equal(hasNutritionTable('Calories 140 Saturated Fat 3g'),false);
});

test('search tracking normalizes without merging product variants or invented product paths',()=>{
 const source='https://manufacturer.com/products/crisps?variant=original&upc=123';
 assert.equal(exactSourceUrl(source+'&srsltid=googleTracking&utm_source=shopping'),source);
 assert.equal(exactSourceUrl(source+'&gclid=tracking&fbclid=tracking&msclkid=tracking#nutrition'),source);
 assert.notEqual(exactSourceUrl(source),exactSourceUrl('https://manufacturer.com/products/crisps?variant=onion&upc=123'));
 assert.notEqual(exactSourceUrl(source),exactSourceUrl('https://manufacturer.com/products/crisps?variant=original&upc=456'));
 assert.notEqual(exactSourceUrl(source),exactSourceUrl('https://manufacturer.com/products/different-crisps?variant=original&upc=123'));
});

test('selected source completion reads only returned links, at most four, without new search queries',async()=>{
 let queries=0;const reads:string[]=[];
 const hits=Array.from({length:5},(_,i)=>({url:'https://manufacturer.com/product/'+i,title:'Product '+i,snippet:'Nutrition'}));
 const search=Object.assign(async()=>{queries++;return structuredClone(hits);},{readPage:async(u:string)=>{reads.push(u);return {url:u,text:table};}});
 const session=createSearchSession(search,signal());await session.execute(['products']);
 const foods=hits.map(h=>({source_url:h.url}));
 const result=await session.completeSelectedSources({product:foods[0],alternatives:[...foods.slice(1),{source_url:'https://private.example/product'}]});
 assert.equal(queries,1);assert.equal(reads.length,4);assert.equal(result.length,4);assert.equal(session.snapshot().attempted,1);
 const duplicate=await session.completeSelectedSources({product:foods[0],alternatives:[foods[0],{source_url:'https://not-returned.com/product'}]});
 assert.equal(duplicate.length,0);assert.equal(reads.length,4);
});
test('source completion failures retain the existing partial answer evidence',async()=>{
 const search=Object.assign(async()=>[{url,title:'Product',snippet:'Calories 140'}],{readPage:async()=>{throw Error('unavailable');}});
 const s=createSearchSession(search,signal());await s.execute(['nutrition']);
 assert.deepEqual(await s.completeSelectedSources({product:{source_url:url},alternatives:[]}),[]);assert.equal(s.snapshot().records[0].results[0].snippet,'Calories 140');
});
