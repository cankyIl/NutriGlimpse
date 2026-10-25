import test from 'node:test';
import assert from 'node:assert/strict';
import {createSearchSession,createBoundedGeminiTransport,createSerperProductSearch} from '../src/geminiBoundedSearch.ts';
import {allowedProductPage,publicIPv4,productPageText} from '../src/geminiSearchPages.ts';
import {parseGroceryResponse} from '../src/groceryReviewProvider.ts';
const signal=()=>new AbortController().signal;
const hit={url:'https://www.wegmans.com/shop/product/fixture',title:'Fixture label',snippet:'Sodium 100 mg'};
const usage={total_input_tokens:20,total_output_tokens:30,total_cached_tokens:5,total_thought_tokens:0,total_tokens:50};
test('parallel tool batches cannot dispatch a seventh query',async()=>{
 let calls=0;const s=createSearchSession(async()=>{calls++;await new Promise(r=>setTimeout(r,3));return [hit];},signal());
 await Promise.all([s.execute(['a','b','c','d']),s.execute(['e','f','g','h'])]);
 assert.equal(calls,6);assert.equal(s.snapshot().attempted,6);assert.equal(s.snapshot().blocked,2);
 await s.execute(['i']);assert.equal(calls,6);
});
test('failed searches consume budget and repeated queries reuse even in-flight failures',async()=>{
 let calls=0;const s=createSearchSession(async()=>{calls++;throw Error('HTTP 429');},signal());
 await Promise.all([s.execute([' same ','SAME']),s.execute(['b','c','d','e','f','g'])]);
 assert.equal(calls,6);assert.equal(s.snapshot().reused,1);assert.equal(s.snapshot().records.filter(x=>x.status==='failed').length,6);
 await s.execute(['same']);assert.equal(calls,6);
});
test('budgets are per scan and invalid queries never dispatch',async()=>{
 let calls=0;const run=async()=>{calls++;return [hit];};
 const a=createSearchSession(run,signal()),b=createSearchSession(run,signal());
 await a.execute([null,'','a\nb','x'.repeat(301)]);assert.equal(calls,0);
 await a.execute(['a','b','c','d','e','f']);await b.execute(['a']);assert.equal(calls,7);
});
test('cancelled scan cannot dispatch a search',async()=>{
 const c=new AbortController();c.abort();let calls=0;
 const s=createSearchSession(async()=>{calls++;return [hit];},c.signal);
 await assert.rejects(s.execute(['test']));assert.equal(calls,0);
});
test('Gemini tool history uses only controlled search; final turn has no tools and aggregates actual usage',async()=>{
 const requests:any[]=[];let searches=0;
 const transport=createBoundedGeminiTransport(async request=>{
  requests.push(structuredClone(request));
  if(requests.length===1)return {status:'requires_action',usage,steps:[{type:'function_call',id:'c1',name:'search_products',arguments:{queries:['a','b','c','d','e','f','g','h']}}]};
  return {status:'completed',model:'gemini-3.5-flash-lite',usage,steps:[{type:'model_output',content:[{type:'text',text:'{}'}]}]};
 },async()=>{searches++;return [hit];});
 const result:any=await transport({model:'gemini-3.5-flash-lite',input:[{type:'text',text:'Public context'}],tools:[{type:'google_search'}]},signal());
 assert.equal(searches,6);assert.equal(result.boundedSearch.blocked,2);assert.equal(result.boundedSearch.modelCalls,2);
 assert.equal(result.usage.total_input_tokens,40);assert.equal(result.usage.total_tokens,100);
 assert.equal((requests[0].tools as any)[0].name,'search_products');assert.deepEqual(requests[1].tools,[]);
 assert.equal(requests[1].generation_config.tool_choice,'none');assert.equal(requests[1].store,false);
 assert.ok(requests[1].input.some((x:any)=>x.type==='function_result'));assert.equal('previous_interaction_id' in requests[1],false);
 const parsed=parseGroceryResponse(result,'gemini-3.5-flash-lite');assert.equal(parsed.searches,6);assert.ok(parsed.urls.has(hit.url));
});
test('a stubborn model cannot keep calling functions indefinitely or use native grounding',async()=>{
 let modelCalls=0,searchCalls=0;
 const transport=createBoundedGeminiTransport(async request=>{
  modelCalls++;assert.ok(!(request.tools as any[]).some(t=>t.type==='google_search'));
  return {status:'requires_action',usage,steps:[{type:'function_call',id:'x'+modelCalls,name:'search_products',arguments:{queries:['same']}}]};
 },async()=>{searchCalls++;return [hit];});
 await assert.rejects(transport({input:[]},signal()),/GEMINI_TOOL_AFTER_FINAL/);assert.equal(modelCalls,4);assert.equal(searchCalls,1);
});
test('failed-only controlled search is not accepted as successful grounding',()=>{
 assert.throws(()=>parseGroceryResponse({status:'completed',steps:[{type:'model_output',content:[{type:'text',text:'{}'}]}],boundedSearch:{limit:6,attempted:1,records:[{query:'x',status:'failed'}],urls:[]}},'gemini-3.5-flash-lite'),/GROUNDING_MISSING/);
});
test('Google search uses fixed endpoint, no redirects and one page read shared within a scan',async()=>{
 let pages=0;const s=signal(),requests:any[]=[];
 const search=createSerperProductSearch('fixture',async(u,o)=>{
  requests.push({u,o});return Response.json({organic:[{link:hit.url,title:hit.title,snippet:hit.snippet}]});
 },async url=>{pages++;return {url,text:'Complete label'};});
 await Promise.all([search('a',s),search('b',s)]);
 assert.equal(pages,1);assert.ok(requests.every(r=>r.u==='https://google.serper.dev/search'&&r.o.redirect==='error'));
 await search('c',signal());assert.equal(pages,2);
});
test('page retrieval excludes credentials, local hosts, reserved names and unusual ports',()=>{
 for(const u of ['http://www.wegmans.com/x','https://www.wegmans.com.evil.test/x','https://metadata.google.internal/x','https://localhost/x','https://service.local/x','https://[::1]/x','https://user@www.wegmans.com/x','https://127.0.0.1/x','https://www.wegmans.com:8443/x'])assert.equal(allowedProductPage(u),null);
 assert.ok(allowedProductPage(hit.url));
 for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','172.16.0.1','192.168.1.1','100.64.0.1','::1','224.0.0.1'])assert.equal(publicIPv4(ip),false);
 assert.equal(publicIPv4('8.8.8.8'),true);
});
test('product text extraction keeps nutrition and structured data without executable scripts',()=>{
 const text=productPageText('<nav>Ignore menu</nav><h1>Product</h1><script>alert(1)</script><div>Nutrition Facts Sodium 620 mg</div><script type="application/ld+json">{"nutrition":"label"}</script>');
 assert.match(text,/Nutrition Facts Sodium 620 mg/);assert.match(text,/"nutrition":"label"/);assert.doesNotMatch(text,/alert\(1\)|Ignore menu/);
});


test('first original identity is emitted before search completion, with no extra model request',async()=>{
 let release!:()=>void;const waiting=new Promise<void>(r=>{release=r;});let calls=0,previews=0;
 const identity={status:'identified',brand:'Fixture',name:'Cereal',variant:null,size:null};
 const transport=createBoundedGeminiTransport(async()=>{
  if(++calls===1)return {status:'requires_action',usage,steps:[{type:'function_call',id:'c1',name:'search_products',arguments:{queries:['fixture'],product_identity:identity}}]};
  return {status:'completed',usage,steps:[{type:'model_output',content:[{type:'text',text:'{}'}]}]};
 },async()=>{await waiting;return [hit];});
 const pending=transport({input:[]},signal(),{onIdentity:value=>{assert.deepEqual(value,identity);previews++;}});
 await new Promise(r=>setImmediate(r));assert.equal(previews,1);assert.equal(calls,1);release();await pending;assert.equal(calls,2);
});
test('independent function calls overlap without exceeding the shared query cap or changing result order',async()=>{
 let release!:()=>void;const waiting=new Promise<void>(r=>{release=r;});let searches=0,models=0;const requests:any[]=[];
 const transport=createBoundedGeminiTransport(async request=>{
  requests.push(request);
  if(++models===1)return {status:'requires_action',usage,steps:[{type:'function_call',id:'a',name:'search_products',arguments:{queries:['a','b','c','d']}},{type:'function_call',id:'b',name:'search_products',arguments:{queries:['e','f','g']}}]};
  return {status:'completed',usage,steps:[{type:'model_output',content:[{type:'text',text:'{}'}]}]};
 },async()=>{searches++;await waiting;return [hit];});
 const pending=transport({input:[]},signal());await new Promise(r=>setImmediate(r));
 try{assert.equal(searches,6,'Both function-call batches should start before either completes');}finally{release();}
 const answer:any=await pending;assert.equal(answer.boundedSearch.attempted,6);assert.equal(answer.boundedSearch.blocked,1);
 assert.deepEqual(requests[1].input.filter((x:any)=>x.type==='function_result').map((x:any)=>x.call_id),['a','b']);
});
test('invalid preview cannot carry nutrition, and cancellation suppresses late preview',async()=>{
 const c=new AbortController();let previews=0;
 const transport=createBoundedGeminiTransport(async()=>{c.abort();return {status:'requires_action',usage,steps:[{type:'function_call',name:'search_products',arguments:{queries:['a'],product_identity:{status:'identified',brand:'F',name:'Cereal',variant:null,size:null,rating:'healthy'}}}]};},async()=>{throw Error('must not dispatch');});
 await assert.rejects(transport({input:[]},c.signal,{onIdentity:()=>{previews++;}}));assert.equal(previews,0);
});

test('Gemini completes selected source tables once without more search or exceeding four model turns',async()=>{
 let models=0,queries=0,reads=0;const requests:any[]=[];
 const original='https://manufacturer.com/product/original',alt='https://manufacturer.com/product/alternative';
 const output=(sodium:number)=>({status:'completed',usage,steps:[{type:'model_output',content:[{type:'text',text:JSON.stringify({product:{source_url:original},alternatives:[{source_url:alt,nutrition:{sodiumMg:sodium}}]})}]}]});
 const search=Object.assign(async()=>{queries++;return [{url:original,title:'Original',snippet:'Nutrition',pageText:'Calories 80 Sodium 620mg Carbohydrate 12g Protein 3g'},{url:alt,title:'Alternative',snippet:'Low Sodium'}];},{readPage:async(u:string)=>{reads++;assert.equal(u,alt);return {url:u,text:'Calories 70 Sodium 50mg Carbohydrate 10g Protein 2g Total Fat 2g'};}});
 const run=createBoundedGeminiTransport(async request=>{
  requests.push(request);models++;
  if(models===1)return {status:'requires_action',usage,steps:[{type:'function_call',id:'search1',name:'search_products',arguments:{queries:['original and alternative nutrition']}}]};
  if(models===2)return output(140);
  assert.deepEqual(request.tools,[]);assert.equal((request.generation_config as any).tool_choice,'none');
  assert.match(JSON.stringify(request.input),/Sodium 50mg/);return output(50);
 },search);
 const answer:any=await run({input:[]},signal());assert.equal(models,3);assert.equal(queries,1);assert.equal(reads,1);
 assert.equal(answer.boundedSearch.attempted,1);assert.equal(answer.usage.total_input_tokens,60);
 assert.equal(parseGroceryResponse(answer,'gemini-3.5-flash-lite').value.alternatives[0].nutrition.sodiumMg,50);
});
