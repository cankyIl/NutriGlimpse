import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadDualPhotoProvider} from '../src/dualPhotoProvider.ts';
import {loadWebPhotoProvider} from '../src/webPhotoProvider.ts';
import {loadShelfGridProvider} from '../src/shelfGridProvider.ts';
import {DUAL_FOOD_CONSENT} from '../../../packages/core/src/dualAiFoodReview.ts';
test('all production photo and shelf loaders work with only an OpenAI key; no Anthropic key is required',()=>{
 const root=mkdtempSync(join(tmpdir(),'gpt-only-')),saved=process.env.GROCERY_DUAL_PHOTO_CONSENT;
 try{
  mkdirSync(join(root,'.tools/openai'),{recursive:true,mode:0o700});
  writeFileSync(join(root,'.tools/openai/api-key'),'sk-fictional-fixture-only',{mode:0o600});
  process.env.GROCERY_DUAL_PHOTO_CONSENT=DUAL_FOOD_CONSENT;
  assert.ok(loadDualPhotoProvider(root,{GROCERY_DUAL_PHOTO_CONSENT:DUAL_FOOD_CONSENT})?.available());
  assert.ok(loadWebPhotoProvider(root)?.available());
  assert.ok(loadShelfGridProvider(root));
 }finally{
  if(saved===undefined)delete process.env.GROCERY_DUAL_PHOTO_CONSENT;else process.env.GROCERY_DUAL_PHOTO_CONSENT=saved;
  rmSync(root,{recursive:true,force:true});
 }
});
