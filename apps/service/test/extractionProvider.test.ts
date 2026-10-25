import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExtractionRequest, parseProviderResponse, executeExtractionContract, createOpenAITransport } from '../src/extractionProvider.ts';
import { fictionalOcrPages, extractLocalIntake } from '../../../packages/core/src/intake.ts';
const envelope=(text:string)=>JSON.stringify({status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text}]}]});
test('provider requests use fixed strict schema, no tools, no saved state or original media',()=>{
 for(const kind of ['product','receipt','report'] as const){
 const req=buildExtractionRequest(kind,fictionalOcrPages(kind),'reviewed-model');
 assert.equal(req.store,false);assert.equal(req.background,false);assert.equal(req.text.format.strict,true);
 assert.deepEqual(req.tools,[]);assert.equal(req.tool_choice,'none');
 assert.equal(req.input[0].content[0].type,'input_text');
 }
});
test('provider contract validates actual source references and rejects refusals, actions and incomplete output',async()=>{
 const pages=fictionalOcrPages('product');const data=extractLocalIntake('product',pages).data;
 const result=await executeExtractionContract('product',pages,'reviewed-model',async()=>envelope(JSON.stringify(data)),new AbortController().signal);
 assert.equal(result.status,'needs-review');
 for(const bad of [{status:'incomplete',output:[]},{status:'completed',output:[{type:'function_call'}]},{status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'refusal'}]}]}])
 assert.throws(()=>parseProviderResponse('product',JSON.stringify(bad),pages));
 const wrong=JSON.parse(JSON.stringify(data));wrong.name.source.page=9;
 assert.throws(()=>parseProviderResponse('product',envelope(JSON.stringify(wrong)),pages));
});
test('provider transport never retries and never exposes error bodies or API keys',async()=>{
 let count=0;
 const transport=createOpenAITransport('fake-test-key',(async()=>{count++;return new Response('private error',{status:429});}) as typeof fetch);
 await assert.rejects(transport(buildExtractionRequest('report',fictionalOcrPages('report'),'reviewed-model'),new AbortController().signal),error=>error instanceof Error&&!error.message.includes('private')&&!error.message.includes('fake-test-key'));
 assert.equal(count,1);
});
