import {test} from 'node:test';
import assert from 'node:assert/strict';
import {guidanceLibrary,sourceServings,comparePublishedReference} from '../src/guidanceLibrary.ts';
import type {PublicFood} from '../src/publicFood.ts';
const now=Date.parse('2026-10-14T12:00:00Z');
const food:PublicFood={provider:'usda',id:'1',barcode:null,name:'Fictional fixture',brand:null,ingredients:null,dataType:'Branded',basis:'100g',servingGrams:40,nutrients:{caloriesKcal:400,saturatedFatG:5,fiberG:8,sodiumMg:900,sugarsG:12},sourceUrl:'https://fdc.nal.usda.gov/',retrievedAt:new Date(now).toISOString(),sourceDate:'2026-10-01',license:'CC0-1.0',certifications:'unverified',availability:'unverified'};
test('all source table cells render with original daily/weekly units and no auto-personalization',()=>{
 let cells=0;
 for(const table of guidanceLibrary.tables)for(const calories of table.calorieLevels){
  const rows=sourceServings(table.sourceId as 'dash'|'dga-servings',calories);
  cells+=rows.length;
  assert.ok(rows.every(r=>r.quantity&&!r.quantity.includes('undefined')&&r.examples.length&&['day','week'].includes(r.period!)));
 }
 assert.equal(cells,128);
 assert.equal(sourceServings('dash',2000).find(r=>r.foodGroup==='nuts-seeds-legumes')?.period,'week');
 assert.equal(sourceServings('dash',2600).find(r=>r.foodGroup==='nuts-seeds-legumes')?.period,'day');
 assert.notDeepEqual(sourceServings('dash',2000).find(r=>r.foodGroup.includes('dairy'))?.examples,sourceServings('dga-servings',2000).find(r=>r.foodGroup==='dairy')?.examples);
 assert.throws(()=>sourceServings('dash',2100));
 assert.equal(guidanceLibrary.personalizedRecommendationsEnabled,false);
 assert.equal(guidanceLibrary.entries.length,26);
 assert.ok(guidanceLibrary.entries.every(e=>!e.automaticPersonalization&&!e.productRecommendationEnabled));
});
test('selected published reference uses the same portion and preserves daily denominator',()=>{
 const dash=comparePublishedReference(food,40,{kind:'dash-sodium',milligrams:1500},now);
 assert.ok(dash.available);if(dash.available){assert.equal(dash.amount,360);assert.equal(dash.percentOfReference,24);assert.equal(dash.period,'day');}
 const dga=comparePublishedReference(food,40,{kind:'dga-saturated-fat',dailyEnergyKcal:2000},now);
 assert.ok(dga.available);if(dga.available){assert.equal(dga.amount,2);assert.equal(dga.percentOfReference,9);}
 // Greater than a daily reference stays visible, never clamped to an apparent allowance.
 const large=comparePublishedReference(food,500,{kind:'dash-sodium',milligrams:1500},now);
 assert.ok(large.available&&large.percentOfReference===300);
});
test('unknown facts, stale sources and invalid portions/energy cannot produce reference percentages',()=>{
 for(const grams of [0,-1,2001,NaN,Infinity])assert.equal(comparePublishedReference(food,grams,{kind:'dash-sodium',milligrams:1500},now).available,false);
 for(const dailyEnergyKcal of [0,999,3201,NaN,Infinity])assert.equal(comparePublishedReference(food,40,{kind:'dga-saturated-fat',dailyEnergyKcal},now).available,false);
 for(const patch of [{sourceDate:null},{retrievedAt:'2020-01-01T00:00:00Z'},{nutrients:{...food.nutrients,sodiumMg:null}}])assert.equal(comparePublishedReference({...food,...patch},40,{kind:'dash-sodium',milligrams:2300},now).available,false);
});
