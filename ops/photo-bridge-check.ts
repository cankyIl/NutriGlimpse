import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {recognizeProductPhoto} from '../packages/core/src/photoRecognition.ts';
import {readLocalProduct} from '../packages/core/src/localFoodInput.ts';
import {food} from '../packages/core/test/shelfTestHelpers.ts';
const evidence=JSON.parse(readFileSync(new URL('../artifacts/photo-camera-2026-10-15/reader-check.json',import.meta.url),'utf8'));
const catalog=[food(),food(2,{name:'Testbrand Sunrise Honey Cereal'})];
const checks:unknown[]=[];
for(const fixture of evidence.fixtures){
 if(fixture.fixture==='nutrition'){
  const draft=readLocalProduct([fixture.page]);assert.deepEqual(draft.nutrients.sodium?.value,{amount:140,unit:'mg'});assert.deepEqual(draft.nutrients.sugars?.value,{amount:4,unit:'g'});
  assert.equal(draft.servingGrams,null);assert.equal(draft.nutrients.fiber,null);checks.push({fixture:fixture.fixture,sodiumMg:140,sugarsG:4,missingFieldsRemainUnknown:true});
 }else{
  const result=recognizeProductPhoto([fixture.page],catalog);
  assert.equal(result.status,'needs_confirmation');assert.equal(result.options[0].food.id,fixture.fixture==='variant'?'unit-2':'unit-1');
  checks.push({fixture:fixture.fixture,correctFirstSuggestion:true,requiresConfirmation:true});
 }
}
const output={passed:true,scope:'Actual Apple Vision output through production TypeScript identity/nutrient readers; fictional images, not physical phone acceptance',checks};
writeFileSync(new URL('../artifacts/photo-camera-2026-10-15/bridge-check.json',import.meta.url),JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
