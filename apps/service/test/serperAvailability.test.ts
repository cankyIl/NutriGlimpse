import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {createNearbyAvailability,parseSerperAvailability,type SearchCity} from '../src/nearbyAvailability.ts';
import {availabilityBudget} from '../src/availabilityBudget.ts';
import {createAppServer} from '../src/server.ts';
import {availabilityResultSchema,legacyAvailabilityResultSchema,type AvailabilityRequest} from '../../../packages/core/src/nearbyAvailability.ts';
import type {StoreDirectory} from '../../../packages/core/src/storeDetection.ts';
const cities:SearchCity[]=[{name:'Northborough,Massachusetts,United States',latitude:42.32,longitude:-71.641},{name:'Shrewsbury,Massachusetts,United States',latitude:42.2959,longitude:-71.7128}];
const store={id:'way/137270170',name:'Wegmans',address:'9102 Shops Way Northborough 01532',coordinates:{latitude:42.29131045,longitude:-71.6705109},polygon:null,sourceUrl:'https://www.openstreetmap.org/way/137270170'};
const directory={stores:[store]} as StoreDirectory;
const input:AvailabilityRequest={product:{brand:'Classico',name:'Tomato & Basil Pasta Sauce',variant:null,size:'24 oz'},location:{kind:'store',id:store.id}};
const target={queryLocation:'9102 Shops Way, Northborough, MA 01532',providerLocation:cities[0].name,coordinates:store.coordinates};
const row={title:'Classico Tomato & Basil Pasta Sauce 24 oz',source:'Target',link:'https://www.google.com/search?ibp=oshop&q=classico',price:'$2.99'};
const pickup={...row,source:"Shaw's",link:'https://www.shaws.com/home?storeId=2470&productId=128350143',shipping:'Pick up today'};
const primary=(rows:unknown[]=[])=>Response.json({search_metadata:{status:'Success'},shopping_results:rows});
const secondary=(rows:unknown[]=[row])=>Response.json({shopping:rows});
const signal=()=>new AbortController().signal;
const isPrimary=(url:URL|RequestInfo)=>String(url).startsWith('https://serpapi.com/');
function setup(fetcher:typeof fetch,overrides:Partial<Parameters<typeof createNearbyAvailability>[0]>={}){
 let primaryCount=0,secondaryCount=0;
 const provider=createNearbyAvailability({key:'private-primary-key',serper:{key:'private-secondary-key',reserve:()=>{secondaryCount++;return true;}},directory,cities,reserve:()=>{primaryCount++;return true;},fetcher,...overrides});
 return {provider,counts:()=>[primaryCount,secondaryCount]};
}
test('Shopping fallback uses exact product/size and canonical city only; successful results cache',async()=>{
 const requests:{url:string;init:RequestInit|undefined}[]=[];
 const {provider,counts}=setup(async(url,init)=>{requests.push({url:String(url),init});return isPrimary(url)?primary():secondary();});
 const value=await provider.lookup(input,signal(),true);
 assert.equal(value.schemaVersion,2);assert.equal(value.source,'Google via Serper');assert.equal(value.status,'ok');
 assert.equal(value.listings[0].status,'listing');assert.equal(value.listings[0].address,null);
 assert.deepEqual(counts(),[1,1]);assert.equal(requests.length,2);
 const request=requests[1];assert.equal(request.url,'https://google.serper.dev/shopping');assert.equal(request.init?.method,'POST');assert.equal(request.init?.redirect,'error');
 assert.equal(new Headers(request.init?.headers).get('X-API-KEY'),'private-secondary-key');
 assert.deepEqual(JSON.parse(String(request.init?.body)),{q:'Classico Tomato & Basil Pasta Sauce 24 oz',location:cities[1].name,gl:'us',hl:'en',num:20});
 assert.ok(!JSON.stringify(value).includes('private-'));assert.ok(!String(request.init?.body).includes('9102'));
 assert.equal((await provider.lookup(input,signal(),true)).cached,true);assert.deepEqual(counts(),[1,1]);
});
test('confirmed local primary stock skips fallback when no retailer is selected',async()=>{
 for(const payload of [
  {search_metadata:{status:'Success'},shopping_results:[pickup]},
  {search_metadata:{status:'Success'},local_results:{places:[{title:'Walmart',address:'200 Otis St',gps_coordinates:store.coordinates,links:{website:'https://www.walmart.com/store/2158'},extensions:['In stock: '+row.title]}]}}
 ]){
  let calls=0;const {provider,counts}=setup(async()=>{calls++;return Response.json(payload);});
  const result=await provider.lookup({...input,location:{kind:'coordinates',...store.coordinates}},signal(),true);assert.equal(result.source,'Google via SerpApi');assert.equal(result.listings.length,1);assert.equal(calls,1);assert.deepEqual(counts(),[1,0]);
 }
});
test('generic primary listings trigger fallback; merge ranks local evidence and deduplicates to three',async()=>{
 const {provider}=setup(async url=>isPrimary(url)?primary([{...row,source:'Primary store',link:'https://example.com/product'}]):secondary([row,{...row,source:'Other store'},pickup,{...row,source:'Fourth store'}]));
 const result=await provider.lookup(input,signal(),true);
 assert.equal(result.source,'Google via SerpApi + Serper');assert.equal(result.listings.length,3);assert.equal(result.listings[0].status,'pickup-today');
 assert.deepEqual(result.listings.map(x=>x.retailer),["Shaw's",'Primary store','Target']);
 const dedup=setup(async url=>isPrimary(url)?primary([row]):secondary([row]));
 assert.equal((await dedup.provider.lookup(input,signal(),true)).source,'Google via SerpApi');
});
test('errors, exhausted primary quota, missing primary key and primary deadline each allow fallback',async()=>{
 for(const kind of ['http','quota','missing','timeout'] as const){
  const {provider,counts}=setup(async(url,init)=>{
   if(!isPrimary(url))return secondary();
   if(kind==='timeout')return new Promise((_resolve,reject)=>init!.signal!.addEventListener('abort',()=>reject(Error('timed out')),{once:true}));
   return new Response('',{status:503});
  },{...(kind==='quota'?{reserve:()=>false}:{}),...(kind==='missing'?{key:undefined}:{}),primaryTimeoutMs:5,timeoutMs:1000});
  assert.equal((await provider.lookup(input,signal(),true)).source,'Google via Serper',kind);assert.equal(counts()[1],1);
 }
});
test('fallback failure preserves usable primary results; failures never become false out-of-stock',async()=>{
 const {provider}=setup(async url=>isPrimary(url)?primary([row]):new Response('',{status:429}));
 const result=await provider.lookup(input,signal(),true);assert.equal(result.status,'ok');assert.equal(result.source,'Google via SerpApi');assert.equal(result.listings.length,1);
 for(const [first,second,expected] of [[true,true,'no-matches'],[false,true,'unavailable'],[true,false,'unavailable']] as const){
  const current=setup(async url=>isPrimary(url)?first?primary():new Response('',{status:503}):second?secondary([]):Response.json({message:'Invalid key'}));
  const value=await current.provider.lookup(input,signal(),true);assert.equal(value.status,expected);assert.deepEqual(value.listings,[]);
 }
});
test('fallback matches preserve brand, variant, package, link and local evidence checks',()=>{
 const bad=[
  {...row,title:'Prego Tomato & Basil Pasta Sauce 24 oz'},
  {...row,title:'Classico Spicy Tomato & Basil Pasta Sauce 24 oz'},
  {...row,title:'Classico Tomato & Basil Pasta Sauce 15 oz'},
  {...row,link:'javascript:alert(1)'},{...row,link:'https://127.0.0.1/'},
  {...row,link:'https://user:pass@example.com/'},
  {...row,shipping:'Out of stock'},
 ];
 assert.deepEqual(parseSerperAvailability({shopping:bad},input.product,target,cities),[]);
 const result=parseSerperAvailability({shopping:[{...row,shipping:'In stock. Pick up today',sponsored:true}]},input.product,target,cities);
 assert.equal(result[0].status,'listing','Stock or pickup prose alone does not identify a branch');assert.equal(result[0].sponsored,true);
 assert.equal(parseSerperAvailability({shopping:[{...row,title:'Classico Tomato & Basil Pasta Sauce'}]},input.product,target,cities)[0].packNote,'Check package size');
 for(const badResult of [null,[],{}, {shopping:{}},{shopping:[],error:'error'},{shopping:[],statusCode:429}])assert.throws(()=>parseSerperAvailability(badResult,input.product,target,cities));
});
test('fallback response overflow, deadline and quota are bounded without retry',async()=>{
 for(const kind of ['large','timeout','quota'] as const){
  let secondCalls=0;const {provider}=setup(async(url,init)=>{
   if(isPrimary(url))return primary();secondCalls++;
   if(kind==='large')return new Response('x'.repeat(2000001));
   return new Promise((_resolve,reject)=>init!.signal!.addEventListener('abort',()=>reject(Error('timeout')),{once:true}));
  },{fallbackTimeoutMs:5,timeoutMs:1000,...(kind==='quota'?{serper:{key:'test',reserve:()=>false}}:{})});
  const result=await provider.lookup(input,signal(),true);assert.equal(result.status,'unavailable');assert.equal(secondCalls,kind==='quota'?0:1);
 }
});
test('identical fallback callers share work; cancelling one does not cancel the other',async()=>{
 let release:(value:Response)=>void=()=>{},upstream:AbortSignal|undefined;
 const ready=Promise.withResolvers<void>();
 const {provider,counts}=setup(async(url,init)=>{
  if(isPrimary(url))return primary();upstream=init?.signal??undefined;ready.resolve();return new Promise(resolve=>{release=resolve;});
 });
 const first=new AbortController(),second=new AbortController();
 const a=provider.lookup(input,first.signal,true),b=provider.lookup(input,second.signal,true);await ready.promise;
 const rejected=assert.rejects(a);first.abort();await rejected;assert.equal(upstream?.aborted,false);
 release(secondary());assert.equal((await b).source,'Google via Serper');assert.deepEqual(counts(),[1,1]);
});
test('final cancellation during primary prevents fallback and does not populate its cache',async()=>{
 let secondCalls=0;const {provider}=setup(async(url,init)=>{
  if(!isPrimary(url)){secondCalls++;return secondary();}
  return new Promise((_r,reject)=>init!.signal!.addEventListener('abort',()=>reject(Error('abort')),{once:true}));
 });
 const controller=new AbortController(),request=provider.lookup(input,controller.signal,true),failure=assert.rejects(request);
 controller.abort();await failure;await new Promise(resolve=>setImmediate(resolve));assert.equal(secondCalls,0);
});
test('v1 and v2 cache/dispatch are isolated; old clients never receive mislabeled Serper results',async()=>{
 let calls=0;const {provider,counts}=setup(async url=>{calls++;return isPrimary(url)?primary():secondary();});
 const old=await provider.lookup(input,signal());assert.equal(old.status,'no-matches');assert.equal(old.source,'Google via SerpApi');assert.deepEqual(counts(),[1,0]);
 const modern=await provider.lookup(input,signal(),true);assert.equal(modern.source,'Google via Serper');assert.deepEqual(counts(),[2,1]);assert.equal(calls,3);
 assert.equal((await provider.lookup(input,signal())).cached,true);
});
test('nullable monthly ceiling preserves independent hourly request guard',()=>{
 let now=Date.UTC(2026,9,18);const ledger=availabilityBudget(':memory:',()=>now,2,null);
 try{
  for(let hour=0;hour<110;hour++){
   assert.equal(ledger.reserve(),true);assert.equal(ledger.reserve(),true);assert.equal(ledger.reserve(),false);now+=3600000;
  }
 }finally{ledger.close();}
});
test('HTTP v2 accepts fallback attribution while v1 keeps its old strict contract; both reject extra data',async()=>{
 const {provider}=setup(async url=>isPrimary(url)?primary():secondary());
 const server=createAppServer({accessMode:'open-beta',availability:provider});await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+(server.address() as AddressInfo).port;
 try{
  for(const version of [1,2]){
   const post=(body:unknown)=>fetch(base+'/v'+version+'/availability/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   for(const extra of [{photo:'private'},{profile:{}},{lipids:{}},{name:'Person'}])assert.equal((await post({...input,...extra})).status,400);
   const res=await post(input);assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'no-store');
   const value=await res.json();assert.equal(value.schemaVersion,version);
   if(version===1){legacyAvailabilityResultSchema.parse(value);assert.equal(value.source,'Google via SerpApi');assert.equal(value.status,'no-matches');}
   else{availabilityResultSchema.parse(value);assert.equal(value.source,'Google via Serper');assert.equal(value.status,'ok');}
  }
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});

test('last caller cancelling during Shopping aborts its upstream request',async()=>{
 const ready=Promise.withResolvers<void>();let upstream:AbortSignal|undefined;
 const {provider}=setup(async(url,init)=>{
  if(isPrimary(url))return primary();upstream=init?.signal??undefined;ready.resolve();
  return new Promise((_resolve,reject)=>upstream!.addEventListener('abort',()=>reject(Error('cancelled')),{once:true}));
 });
 const controller=new AbortController(),request=provider.lookup(input,controller.signal,true),failure=assert.rejects(request);
 await ready.promise;controller.abort();await failure;assert.equal(upstream?.aborted,true);
});

test('another retailer stock does not suppress the selected retailer fallback',async()=>{
 const {provider,counts}=setup(async url=>isPrimary(url)?primary([pickup]):secondary([{...row,source:'Wegmans',link:'https://www.wegmans.com/shop/product/fixture'}]));
 const value=await provider.lookup(input,signal(),true);
 assert.deepEqual(counts(),[1,1]);assert.equal(value.listings[0].retailer,'Wegmans');
 assert.equal(value.listings[0].status,'listing');
});
