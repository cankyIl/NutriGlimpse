import {test} from 'node:test';
import assert from 'node:assert/strict';
import {availabilityLocation,availabilityProduct,findNearbyAvailability} from '../src/nearbyAvailability.ts';
const product={brand:'Post',name:'Shredded Wheat',variant:'Original Spoon Size',size:'16.4 oz'};
const location={kind:'coordinates' as const,latitude:42.30,longitude:-71.71};
const result={schemaVersion:2,status:'no-matches',listings:[],checkedAt:new Date().toISOString(),source:'Google via SerpApi',cached:false};
test('location selects chosen store before approximate GPS; identity excludes OCR and personal fields',()=>{
 assert.deepEqual(availabilityLocation({id:'way/123'},{latitude:42,longitude:-71}),{kind:'store',id:'way/123'});
 assert.deepEqual(availabilityLocation(null,{latitude:42.295123,longitude:-71.712345}),location);
 assert.equal(availabilityLocation(null,null),null);
 assert.deepEqual(availabilityProduct({status:'identified',...product,visibleText:['Private writing']}),product);
});
test('native-compatible client sends only typed product/location, no credentials; independent requests start together',async()=>{
 let calls=0;const resolvers:((response:Response)=>void)[]=[];
 const fetcher:typeof fetch=async(url,init)=>{
  calls++;assert.ok(String(url).endsWith('/v2/availability/search'));assert.equal(new Headers(init?.headers).has('Authorization'),false);
  const body=JSON.parse(String(init?.body));assert.deepEqual(Object.keys(body).sort(),['location','product']);assert.equal(init?.redirect,'error');
  return new Promise(resolve=>resolvers.push(resolve));
 };
 const requests=[1,2,3].map(n=>findNearbyAvailability({product:{...product,name:product.name+n},location},new AbortController().signal,fetcher));
 assert.equal(calls,3);resolvers[2](Response.json(result));assert.equal((await requests[2]).status,'no-matches');
 resolvers[0](Response.json(result));resolvers[1](Response.json(result));await Promise.all(requests);
});
test('invalid input, cancellation, oversized and unsafe responses cannot leak into cards',async()=>{
 let calls=0;const fetcher:typeof fetch=async()=>{calls++;return Response.json(result);};
 const controller=new AbortController();controller.abort();await assert.rejects(findNearbyAvailability({product,location},controller.signal,fetcher));assert.equal(calls,0);
 await assert.rejects(findNearbyAvailability({...{product,location},profile:{}} as never,new AbortController().signal,fetcher));assert.equal(calls,0);
 await assert.rejects(findNearbyAvailability({product,location},new AbortController().signal,async()=>new Response('x'.repeat(20001))));
 await assert.rejects(findNearbyAvailability({product,location},new AbortController().signal,async()=>Response.json({...result,listings:[{url:'javascript:alert(1)'}]})));
});

test('new client accepts each truthful provider attribution and rejects legacy schema or unknown source',async()=>{
 for(const source of ['Google via SerpApi','Google via Serper','Google via SerpApi + Serper']){
  const value=await findNearbyAvailability({product,location},new AbortController().signal,async()=>Response.json({...result,source}));
  assert.equal(value.source,source);
 }
 for(const invalid of [{...result,schemaVersion:1},{...result,source:'Made up inventory'}]){
  await assert.rejects(findNearbyAvailability({product,location},new AbortController().signal,async()=>Response.json(invalid)));
 }
});
