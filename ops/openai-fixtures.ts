import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { buildExtractionRequest, parseProviderResponse } from '../apps/service/src/extractionProvider.ts';
import { fictionalOcrPages, sanitizeIntake } from '../packages/core/src/intake.ts';
import assert from 'node:assert/strict';
const root='artifacts/remote/openai';
mkdirSync(root,{recursive:true});
for(const kind of ['product','receipt','report'] as const){
 const pages=sanitizeIntake(kind,fictionalOcrPages(kind)).pages;
 if(process.argv[2]==='prepare'){
 const req={...buildExtractionRequest(kind,pages,'gpt-6-luna'),reasoning:{effort:'none'},max_output_tokens:4096,service_tier:'default'};
 writeFileSync(root+'/'+kind+'-request.json',JSON.stringify(req));
 }else{
 const result=parseProviderResponse(kind,readFileSync(root+'/'+kind+'-response.json','utf8'),pages);
 const data:any='data' in result?result.data:result;
 if(kind==='product'){assert.equal(data.nutrients.sugars.value.amount,1);assert.equal(data.name.value,'Fictional plain oats');}
 if(kind==='receipt'){assert.equal(data.lines.length,4);assert.equal(data.lines[1].quantity.value.amount,1.2);}
 if(kind==='report'){assert.equal(data.testDate,'2026-09-20');assert.equal(data.measurements.length,6);}
 console.log(kind+': schema, source references and fixture assertions passed');
 }
}
