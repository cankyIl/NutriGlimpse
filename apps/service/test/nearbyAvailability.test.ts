import {test} from 'node:test';
import assert from 'node:assert/strict';
import type {AddressInfo} from 'node:net';
import {createNearbyAvailability,matchAvailabilityTitle,parseAvailability,resolveAvailabilityTarget,type SearchCity} from '../src/nearbyAvailability.ts';
import {availabilityBudget} from '../src/availabilityBudget.ts';
import {createAppServer} from '../src/server.ts';
import type {AvailabilityRequest} from '../../../packages/core/src/nearbyAvailability.ts';
import type {StoreDirectory} from '../../../packages/core/src/storeDetection.ts';
const cities:SearchCity[]=[
 {name:'Shrewsbury,Massachusetts,United States',latitude:42.2959,longitude:-71.7128},
 {name:'Northborough,Massachusetts,United States',latitude:42.32,longitude:-71.641},
 {name:'Westborough,Massachusetts,United States',latitude:42.2694,longitude:-71.6162},
];
const store={id:'way/137270170',name:'Wegmans',address:'9102;9106;9108;9110;9112;9113;9114 Shops Way Northborough 01532',coordinates:{latitude:42.29131045,longitude:-71.6705109},polygon:null,sourceUrl:'https://www.openstreetmap.org/way/137270170'};
const directory={stores:[store]} as StoreDirectory;
const input:AvailabilityRequest={product:{brand:'Classico',name:'Tomato & Basil Pasta Sauce',variant:null,size:'24 oz'},location:{kind:'store',id:store.id}};
const target={queryLocation:'9102 Shops Way, Northborough, MA 01532',providerLocation:cities[1].name,coordinates:store.coordinates};
const shaws={title:'Classico Tomato & Basil Pasta Sauce - 24 Oz',source:"Shaw's",price:'$3.99',link:'https://www.shaws.com/home?storeId=2470&productId=128350143',shipping:'Pick up today'};
const targetRow={...shaws,source:'Target',link:'https://www.target.com/p/food/-/A-13386252?sid=1496S',shipping:undefined,price:'$2.99'};
const data=(rows:unknown[]=[shaws])=>({search_metadata:{status:'Success'},shopping_results:rows});
const response=(rows:unknown[]=[shaws])=>new Response(JSON.stringify(data(rows)),{headers:{'Content-Type':'application/json'}});
test('same brand and exact variant, package checks across sauce, cereal and butter',()=>{
 assert.ok(matchAvailabilityTitle(input.product,shaws.title));
 for(const title of ['Classico Traditional Sweet Basil Tomato Pasta Sauce 24 oz','Classico Spicy Tomato & Basil Pasta Sauce 24 oz','Classico Organic Tomato & Basil Pasta Sauce 24 oz','Prego Tomato & Basil Pasta Sauce 24 oz','Classico Tomato & Basil Pasta Sauce 15 oz'])assert.equal(matchAvailabilityTitle(input.product,title),null,title);
 assert.equal(matchAvailabilityTitle(input.product,'(2 pack) Classico Tomato & Basil Pasta Sauce 24 oz')?.packNote,'2-pack');
 assert.equal(matchAvailabilityTitle(input.product,'Classico Tomato & Basil Pasta Sauce')?.packNote,'Check package size');
 const cereal={brand:'Post',name:'Shredded Wheat',variant:'Original Spoon Size',size:null};
 assert.ok(matchAvailabilityTitle(cereal,'Post Original Spoon Sized Shredded Wheat Cereal 16.4 oz'));
 assert.ok(matchAvailabilityTitle(cereal,'Post Spoon Size Shredded Wheat, Whole Grain Breakfast Cereal, High Fiber, Kosher, Crunchy 16.4oz Box'));
 assert.equal(matchAvailabilityTitle(cereal,'Post Frosted Shredded Wheat Original Spoon Size Cereal'),null);
 const butter={brand:'Land O Lakes',name:'Butter',variant:'with Canola Oil',size:'15 oz'};
 assert.ok(matchAvailabilityTitle(butter,'Land O Lakes Butter with Canola Oil 15 oz'));
 assert.equal(matchAvailabilityTitle(butter,'Land O Lakes Butter with Olive Oil 15 oz'),null);
});
test('address preference, rounded GPS, canonical city selection and outside coverage',()=>{
 const resolved=resolveAvailabilityTarget(input,directory,cities)!;
 assert.equal(resolved.queryLocation,'9102 Shops Way, Northborough, MA 01532');
 const gps=resolveAvailabilityTarget({...input,location:{kind:'coordinates',latitude:42.295123,longitude:-71.712345}},directory,cities)!;
 assert.equal(gps.queryLocation,'42.30, -71.71');assert.equal(gps.providerLocation,cities[0].name);
 assert.equal(resolveAvailabilityTarget({...input,location:{kind:'store',id:'node/123'}},directory,cities),null);
 assert.equal(resolveAvailabilityTarget({...input,location:{kind:'coordinates',latitude:0,longitude:0}},directory,cities),null);
});
test('pickup requires positive evidence and a local branch; AI prose is never inventory',()=>{
 const rows=[{...shaws,source:'Unknown store',link:'https://example.com/product'},targetRow,shaws,
  {...shaws,title:'Prego Tomato & Basil Pasta Sauce 24 oz'},
  {...shaws,shipping:'Out of stock. Pick up today'},
  {...shaws,link:'javascript:alert(1)'},{...shaws,link:'https://secret@example.com/'},
  {...shaws,link:'https://127.0.0.1/admin'}];
 const parsed=parseAvailability({...data(rows),ai_overview:{text:'All stores have stock'}},input.product,target,cities);
 assert.equal(parsed.length,3);assert.equal(parsed[0].status,'pickup-today');assert.equal(parsed[0].address,'50 Boston Turnpike Rd, Shrewsbury, MA 01545');
 assert.equal(parsed[1].status,'nearby-listing');assert.equal(parsed[2].status,'listing');
 assert.ok(parsed.every(p=>p.sponsored));
 assert.equal(parseAvailability(data([shaws]),input.product,{...target,coordinates:{latitude:30,longitude:-90}},cities).length,0);
 assert.deepEqual(parseAvailability({search_metadata:{status:'Success'},ai_overview:{text:'Stock everywhere'}},input.product,target,cities),[]);
});
test('Local Stores & Options uses product-specific stock text, not mere nearby store presence',()=>{
 const cereal={brand:'Post',name:'Shredded Wheat',variant:'Original Spoon Size',size:null};
 const place={title:'Walmart Supercenter',address:'200 Otis St, Northborough, MA 01532',
  gps_coordinates:{latitude:42.285151,longitude:-71.656396},links:{website:'https://www.walmart.com/store/2158-northborough-ma/'},
  extensions:['In stock: Post Spoon Size Shredded Wheat · Updated today']};
 const parsed=parseAvailability({...data([]),local_results:{places:[place,{...place,title:'Wegmans',extensions:[]},{...place,title:'Other',extensions:['In stock: Post Frosted Shredded Wheat']}] }},cereal,target,cities);
 assert.equal(parsed.length,1);assert.equal(parsed[0].status,'in-stock');assert.equal(parsed[0].packNote,'Check package size');
 assert.equal(parsed[0].address,place.address);assert.equal(parsed[0].sponsored,false);
 assert.equal(parseAvailability({...data([]),local_results:{places:[{...place,extensions:['Out of stock: Post Spoon Size Shredded Wheat']}] }},cereal,target,cities).length,0);
});
test('three distinct alternatives dispatch simultaneously, finish independently and cache without quota use',async()=>{
 let calls=0,reservations=0;const release:((r:Response)=>void)[]=[],queries:string[]=[];
 const provider=createNearbyAvailability({key:'private-test-key',directory,cities,reserve:()=>{reservations++;return true;},fetcher:async(url,init)=>{
  calls++;const parsed=new URL(String(url));assert.equal(parsed.origin,'https://serpapi.com');assert.equal(parsed.searchParams.get('engine'),'google_ads');assert.equal(init?.redirect,'error');
  assert.ok(!parsed.searchParams.has('profile'));queries.push(parsed.searchParams.get('q')!);return new Promise(resolve=>release.push(resolve));
 }});
 const make=(name:string)=>({...input,product:{...input.product,name}});
 const requests=['Tomato & Basil Pasta Sauce','Tomato Sauce','Basil Sauce'].map(name=>provider.lookup(make(name),new AbortController().signal));
 assert.equal(calls,3,'All searches start before any result finishes');
 assert.ok(queries.every(q=>q.endsWith('in stock at Wegmans near 9102 Shops Way, Northborough, MA 01532')));
 assert.equal(queries[0],'Find Classico Tomato & Basil Pasta Sauce in stock at Wegmans near 9102 Shops Way, Northborough, MA 01532');
 assert.ok(queries.every(q=>q.includes('Wegmans')),'Retain the selected retailer as well as the branch address');
 release[1](response([]));assert.equal((await requests[1]).status,'no-matches');
 release[2](new Response('',{status:503}));assert.equal((await requests[2]).status,'unavailable');
 release[0](response());const result=await requests[0];assert.equal(result.listings[0].status,'pickup-today');
 assert.ok(!JSON.stringify(result).includes('private-test-key'));
 assert.equal((await provider.lookup(input,new AbortController().signal)).cached,true);assert.equal(calls,3);assert.equal(reservations,3);
});
test('duplicate callers share one request; cancellation is isolated and final cancellation aborts upstream',async()=>{
 let calls=0,upstream:AbortSignal|undefined,release:(r:Response)=>void=()=>{};
 const provider=createNearbyAvailability({key:'test',directory,cities,reserve:()=>true,fetcher:async(_url,init)=>{
  calls++;upstream=init?.signal??undefined;return new Promise(resolve=>{release=resolve;});
 }});
 const first=new AbortController(),second=new AbortController();
 const a=provider.lookup(input,first.signal),b=provider.lookup(input,second.signal);
 const rejected=assert.rejects(a);first.abort();await rejected;assert.equal(upstream?.aborted,false);assert.equal(calls,1);
 release(response());assert.equal((await b).status,'ok');
 const third=new AbortController(),fourth=new AbortController(),other={...input,product:{...input.product,name:'Another Sauce'}};
 const c=provider.lookup(other,third.signal),d=provider.lookup(other,fourth.signal);
 const failures=Promise.all([assert.rejects(c),assert.rejects(d)]);third.abort();fourth.abort();await failures;assert.equal(upstream?.aborted,true);
 release(response([]));
});
test('upstream timeout and overlarge payload return failure, never false out-of-stock',async()=>{
 const slow=createNearbyAvailability({key:'test',directory,cities,reserve:()=>true,timeoutMs:10,fetcher:async(_url,init)=>new Promise((_r,reject)=>init!.signal!.addEventListener('abort',()=>reject(Error('secret URL'))))});
 assert.equal((await slow.lookup(input,new AbortController().signal)).status,'unavailable');
 const huge=createNearbyAvailability({key:'test',directory,cities,reserve:()=>true,fetcher:async()=>new Response('x'.repeat(2000001))});
 assert.equal((await huge.lookup(input,new AbortController().signal)).status,'unavailable');
 let calls=0;const capped=createNearbyAvailability({key:'test',directory,cities,reserve:()=>false,fetcher:async()=>{calls++;return response();}});
 assert.equal((await capped.lookup(input,new AbortController().signal)).status,'limit-reached');assert.equal(calls,0);
});
test('count-only budget bounds hour and calendar-month reservations',()=>{
 let now=Date.UTC(2026,9,17,10);const ledger=availabilityBudget(':memory:',()=>now,3,5);
 try{
  assert.equal(ledger.reserve(),true);assert.equal(ledger.reserve(),true);assert.equal(ledger.reserve(),true);assert.equal(ledger.reserve(),false);
  now+=3600000;assert.equal(ledger.reserve(),true);assert.equal(ledger.reserve(),true);assert.equal(ledger.reserve(),false);
  now=Date.UTC(2026,10,1);assert.equal(ledger.reserve(),true);
 }finally{ledger.close();}
});
test('HTTP contract rejects personal data, URLs and oversized requests; failed search leaves photo endpoints working',async()=>{
 let calls=0;const availability=createNearbyAvailability({key:'test',directory,cities,reserve:()=>true,fetcher:async()=>{calls++;return response();}});
 const server=createAppServer({accessMode:'open-beta',availability});await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+(server.address() as AddressInfo).port;
 try{
  const post=(body:unknown)=>fetch(base+'/v1/availability/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  for(const body of [{...input,profile:{}},{...input,photo:'private'}, {...input,location:{kind:'url',url:'http://localhost'}}, {...input,product:{...input.product,visibleText:['private']}}])assert.equal((await post(body)).status,400);
  assert.equal((await post({...input,extra:'x'.repeat(3000)})).status,413);
  assert.equal((await fetch(base+'/v1/availability/search')).status,405);
  assert.equal(calls,0);const result=await post(input);assert.equal(result.status,200);assert.equal(result.headers.get('cache-control'),'no-store');assert.equal((await result.json()).listings[0].status,'pickup-today');
  assert.equal((await fetch(base+'/v3/photos/capabilities')).status,200);
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});

test('selected retailer leads suitable listings without upgrading branch or stock evidence',()=>{
 const wegmans={...shaws,source:'Wegmans',link:'https://www.wegmans.com/shop/product/fixture',shipping:undefined};
 const items=parseAvailability(data([targetRow,shaws,wegmans]),input.product,{...target,selectedRetailer:'Wegmans'},cities);
 assert.equal(items[0].retailer,'Wegmans');assert.equal(items[0].status,'listing');assert.equal(items[0].address,null);
 assert.equal(items[1].retailer,"Shaw's");
});
