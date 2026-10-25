import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dailyValueBand,bloodPressureLabelFacts,inspectGlutenLabel,labelCheckPolicy} from '../src/labelChecks.ts';
import {comparableAlternatives} from '../src/catalogAlternatives.ts';
import type {PublicFood} from '../src/publicFood.ts';
const now=Date.parse('2026-10-14T12:00:00Z');
const food:PublicFood={provider:'usda',id:'1',barcode:'00012345678905',name:'Fixture',brand:'Fixture',ingredients:'Corn',dataType:'Branded',basis:'100g',comparisonGroup:'breakfast-cereal',categoryEvidence:'category-rules-v4',servingGrams:40,nutrients:{caloriesKcal:400,saturatedFatG:5,fiberG:8,sodiumMg:900,sugarsG:12},sourceUrl:'https://fdc.nal.usda.gov/',retrievedAt:new Date(now).toISOString(),sourceDate:'2026-10-01',license:'CC0-1.0',certifications:'unverified',availability:'unverified'};
test('FDA guide boundaries stay separate from claim thresholds and personal sodium limits',()=>{
 for(const [percent,band] of [[0,'low'],[5,'low'],[5.00001,'between'],[10,'between'],[19.99999,'between'],[20,'high']] as const)assert.equal(dailyValueBand(percent),band);
 for(const v of [-1,NaN,Infinity])assert.equal(dailyValueBand(v),null);
 const facts=bloodPressureLabelFacts(food,now);
 assert.equal(facts.sodium?.amount,360);assert.equal(facts.sodium?.band,'between');
 assert.equal(facts.saturatedFat?.percent,10);assert.equal(facts.saturatedFat?.band,'between');
 assert.equal(bloodPressureLabelFacts({...food,servingGrams:100,nutrients:{...food.nutrients,sodiumMg:140}},now).sodium?.band,'between');
 assert.equal(bloodPressureLabelFacts({...food,servingGrams:100,nutrients:{...food.nutrients,sodiumMg:460,saturatedFatG:4}},now).sodium?.band,'high');
 assert.equal(bloodPressureLabelFacts({...food,servingGrams:100,nutrients:{...food.nutrients,saturatedFatG:4}},now).saturatedFat?.band,'high');
 assert.equal(labelCheckPolicy.personalizedRecommendationsEnabled,false);
 assert.equal(labelCheckPolicy.certificationDecisionsEnabled,false);
});
test('missing, invalid or stale evidence never produces a positive nutrient classification',()=>{
 for(const servingGrams of [undefined,null,0,-5,NaN,Infinity,2001]){
  const result=bloodPressureLabelFacts({...food,servingGrams},now);
  assert.equal(result.sodium,null);assert.equal(result.saturatedFat,null);
 }
 for(const patch of [{sourceDate:null},{sourceDate:'2020-01-01'},{retrievedAt:'2020-01-01T00:00:00Z'},{sourceDate:'2099-01-01'},{retrievedAt:'2099-01-01T00:00:00Z'}]){
  assert.equal(bloodPressureLabelFacts({...food,...patch},now).sodium,null);
 }
 for(const value of [null,-1,NaN,Infinity,100001])assert.equal(bloodPressureLabelFacts({...food,nutrients:{...food.nutrients,sodiumMg:value}},now).sodium,null);
 assert.deepEqual(bloodPressureLabelFacts(food,now).unavailable,['trans fat','potassium','magnesium','calcium']);
});
test('token boundaries avoid maltodextrin, maltose and buckwheat false positives',()=>{
 const result=inspectGlutenLabel({ingredients:'Buckwheat, maltodextrin, maltose, rice'});
 assert.deepEqual(result.ingredientTerms,[]);assert.equal(result.status,'unknown');
 assert.equal(result.eligibleForStrictGlutenFree,false);
 for(const ingredient of ['WHEAT flour','barley malt','rye','triticale','spelt','kamut','farro','durum','semolina','einkorn','emmer','brewer’s yeast','bleached flour','oats']){
  assert.ok(inspectGlutenLabel({ingredients:ingredient}).ingredientTerms.length,ingredient);
 }
});
test('a claim cannot override ingredient concerns or certify a product',()=>{
 for(const ingredients of ['Wheat flour','Wheat starch processed to remove gluten','Malt','Corn']){
  const result=inspectGlutenLabel({ingredients,frontLabelText:'Certified Gluten-Free',allergenStatement:'Contains: Wheat. Made in a facility that also processes wheat.'});
  assert.equal(result.claimObserved,true);
  assert.equal(result.wheatDeclaration,true);assert.equal(result.advisory,true);
  assert.equal(result.suitability,'unverified');assert.equal(result.eligibleForStrictGlutenFree,false);
 }
 for(const frontLabelText of ['Not gluten-free','Not certified GF','Not certified gluten-free','No gluten-free certification'])assert.equal(inspectGlutenLabel({ingredients:'Corn',frontLabelText}).claimObserved,false);
 assert.equal(inspectGlutenLabel({ingredients:'Corn',frontLabelText:'Made with no gluten-containing ingredients'}).claimObserved,false);
});
test('advisories and allergen declarations are distinct, and absence of all evidence stays unknown',()=>{
 const advisory=inspectGlutenLabel({ingredients:'Corn',allergenStatement:'May contain wheat.'});
 assert.equal(advisory.advisory,true);assert.equal(advisory.wheatDeclaration,false);
 const contains=inspectGlutenLabel({ingredients:'Corn',allergenStatement:'Contains: Wheat'});
 assert.equal(contains.wheatDeclaration,true);assert.equal(contains.advisory,false);
 assert.equal(inspectGlutenLabel({ingredients:null}).missing.length,3);
 assert.equal(inspectGlutenLabel({ingredients:'x'.repeat(10001)}).status,'unknown');
});
test('strict gluten-free exclusion remains in force despite favorable nutrient differences',()=>{
 const alternative={...food,id:'2',barcode:'00000000000002',ingredients:'Corn. Gluten-free.',nutrients:{...food.nutrients,sodiumMg:100}};
 assert.equal(comparableAlternatives(food,[alternative],'sodiumMg',[],now).length,1);
 assert.equal(comparableAlternatives(food,[alternative],'sodiumMg',['glutenFree'],now).length,0);
});
