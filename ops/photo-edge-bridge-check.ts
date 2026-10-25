import {readFileSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';
import {ocrPagesSchema} from '../packages/core/src/inputPrivacy.ts';import {processProductPhoto} from '../packages/core/src/photoRecognition.ts';import {food} from '../packages/core/test/shelfTestHelpers.ts';
const root=new URL('../artifacts/photo-fix-2026-10-16/',import.meta.url);
const before=JSON.parse(readFileSync(new URL('edge-before.json',root),'utf8')),after=JSON.parse(readFileSync(new URL('edge-after.json',root),'utf8'));
const beforeRejected=before.pages.filter((p:unknown)=>!ocrPagesSchema.safeParse([p]).success).length;
assert.ok(beforeRejected>0);assert.equal(after.pages.length,15);
for(const page of after.pages){assert.ok(ocrPagesSchema.safeParse([page]).success);assert.equal(processProductPhoto([page],()=>[food()]).ok,true);}
const output={passed:true,cases:after.pages.length,beforeRejected,afterRejected:0,scope:'Actual native OCR results through unchanged strict schema and photo handler; tilted/cropped synthetic text, not user photo'};
writeFileSync(new URL('edge-bridge.json',root),JSON.stringify(output,null,2));console.log(JSON.stringify(output));
