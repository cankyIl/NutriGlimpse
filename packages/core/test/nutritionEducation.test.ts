import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nutritionEducationCards,nutritionSources,nutritionEducationPolicy,comparisonEducation,metricEducation} from '../src/nutritionEducation.ts';
import {foodSchema} from '../src/publicFood.ts';
test('education has traceable HTTPS sources and no personalized recommendation activation',()=>{
 assert.equal(nutritionEducationPolicy.personalizedRecommendationsEnabled,false);
 assert.equal(nutritionEducationPolicy.clinicalReviewStatus,'pending');
 for(const card of [...nutritionEducationCards,...Object.values(metricEducation)]){
  assert.ok(card.sources.length);
  for(const id of card.sources)assert.equal(new URL(nutritionSources[id].url).protocol,'https:');
 }
 for(const id of ['adaMnt','cdc','medline','adaFoods','mayo'] as const)assert.ok(nutritionSources[id]);
});
const food=foodSchema.parse({provider:'usda',id:'123',barcode:null,name:'Diabetes friendly beans with omega-3',brand:null,ingredients:null,dataType:'Branded',basis:'100g',nutrients:{caloriesKcal:null,saturatedFatG:null,fiberG:null,sodiumMg:null,sugarsG:null},sourceUrl:'https://fdc.nal.usda.gov/',retrievedAt:'2026-10-14T00:00:00Z',sourceDate:null,license:'CC0-1.0',certifications:'unverified',availability:'unverified'});
test('names and missing category evidence never assign a food-group benefit',()=>{
 assert.deepEqual(comparisonEducation(food,'sugarsG').map(c=>c.id),['sugars']);
 assert.deepEqual(comparisonEducation({...food,comparisonGroup:'canned-black-beans'},'fiberG').map(c=>c.id),['fiber']);
 assert.deepEqual(comparisonEducation({...food,comparisonGroup:'baked-beans',categoryEvidence:'category-rules-v4'},'fiberG').map(c=>c.id),['fiber']);
});
test('verified categories add general education without mutating food or supplying unknown nutrition',()=>{
 const beans={...food,comparisonGroup:'canned-black-beans' as const,categoryEvidence:'category-rules-v4' as const};
 const before=JSON.stringify(beans);
 assert.deepEqual(comparisonEducation(beans,'fiberG').map(c=>c.id),['fiber','legumes']);
 assert.equal(JSON.stringify(beans),before);
 assert.match(metricEducation.sugarsG.text,/not total carbohydrates/);
 assert.match(metricEducation.fiberG.text,/not soluble fiber/);
 assert.match(metricEducation.saturatedFatG.text,/does not prove/);
 assert.match(metricEducation.sodiumMg.text,/does not set your daily limit/);
});

test('cereal context prompts label inspection without certifying whole grains or bypassing category evidence',()=>{
 for(const comparisonGroup of ['breakfast-cereal','granola','instant-oatmeal'] as const){
  const cereal={...food,comparisonGroup,categoryEvidence:'category-rules-v4' as const,ingredients:'Rice flour, sugar'};
  const before=JSON.stringify(cereal);
  const notes=comparisonEducation(cereal,'fiberG');
  assert.deepEqual(notes.map(c=>c.id),['fiber','grain-label']);
  assert.match(notes[1].text,/alone does not verify whole-grain content/);
  assert.equal(JSON.stringify(cereal),before);
  assert.deepEqual(comparisonEducation({...cereal,categoryEvidence:undefined},'fiberG').map(c=>c.id),['fiber']);
 }
});
