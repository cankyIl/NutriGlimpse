import {test} from 'node:test';
import assert from 'node:assert/strict';
import {comparableAlternatives,comparisonReady} from '../src/catalogAlternatives.ts';
import type {PublicFood} from '../src/publicFood.ts';
import {fetchComparableFoods} from '../src/catalogClient.ts';
const now=Date.parse('2026-10-14T00:00:00Z');
const original:PublicFood={provider:'usda',id:'1',barcode:'00012345678905',name:'Test peanut butter',brand:'Test',ingredients:'Peanuts',dataType:'Branded',basis:'100g',comparisonGroup:'peanut-butter',categoryEvidence:'category-rules-v1',servingGrams:32,nutrients:{caloriesKcal:600,saturatedFatG:10,fiberG:6,sodiumMg:400,sugarsG:8},sourceUrl:'https://fdc.nal.usda.gov/food-details/1/nutrients',retrievedAt:new Date(now).toISOString(),sourceDate:'9/24/2026',license:'CC0-1.0',certifications:'unverified',availability:'unverified'};
const candidate=(id:string,delta:Partial<PublicFood>={}):PublicFood=>({...original,id,ingredients:'Fictional test formula '+id,barcode:id.padStart(14,'0'),nutrients:{...original.nutrients,saturatedFatG:5,sodiumMg:500},...delta});
test('real alternatives require equal category, known nutrition, fresh source and no unverified required restrictions',()=>{
 assert.equal(comparisonReady(original,now),true);
 const good=candidate('2');
 assert.equal(comparableAlternatives(original,[good],'saturatedFatG',[],now).length,1);
 for(const bad of [candidate('2',{comparisonGroup:'plain-yogurt'}),candidate('2',{ingredients:null}),candidate('2',{nutrients:{...good.nutrients,fiberG:null}}),candidate('2',{retrievedAt:'2020-01-01T00:00:00Z'}),candidate('2',{sourceDate:'2020-01-01'}),candidate('2',{nutrients:{...good.nutrients,sodiumMg:100001}})]){
  assert.equal(comparableAlternatives(original,[bad],'saturatedFatG',[],now).length,0);
 }
 for(const restriction of ['halal','kosher','glutenFree','dairyFree','eggFree','vegetarian']){
  assert.equal(comparableAlternatives(original,[good],'saturatedFatG',[restriction],now).length,0);
 }
 assert.equal(comparableAlternatives({...original,comparisonGroup:undefined},[good],'saturatedFatG',[],now).length,0);
});
test('ranking uses selected factual metric, exposes worsening nutrients, deduplicates and limits to three',()=>{
 const list=[candidate('2'),candidate('3'),candidate('4'),candidate('5'),candidate('6',{barcode:original.barcode})];
 const alternatives=comparableAlternatives(original,list,'saturatedFatG',[],now);
 assert.equal(alternatives.length,3);assert.deepEqual(alternatives[0].tradeoffs,['sodiumMg']);
 assert.equal(comparableAlternatives(original,list,'sodiumMg',[],now).length,0);
 assert.equal(comparableAlternatives(original,[candidate('9',{nutrients:{...original.nutrients,fiberG:10}})],'fiberG',[],now).length,1);
 assert.equal(comparableAlternatives(original,[candidate('2'),candidate('3',{barcode:'00000000000002'})],'saturatedFatG',[],now).length,1);
 assert.equal(comparableAlternatives(original,[candidate('2'),candidate('3',{ingredients:'Fictional test formula 2'})],'saturatedFatG',[],now).length,1);
});
test('comparison client sends category without credentials, enforces schema, cancellation and response limits',async()=>{
 
 const fake:typeof fetch=async(url,init)=>{
  assert.equal(String(url),'https://grocery.serveforwad.com/v2/catalog/comparable/peanut-butter');
  assert.equal(init?.body,undefined);assert.equal(new Headers(init?.headers).get('authorization'),null);
  return new Response(JSON.stringify({schemaVersion:2,synthetic:false,foods:[{...original,stale:false}]}));
 };
 assert.equal((await fetchComparableFoods('peanut-butter',new AbortController().signal,fake))[0].id,'1');
 const controller=new AbortController();controller.abort();
 await assert.rejects(fetchComparableFoods('peanut-butter',controller.signal,fake));
 await assert.rejects(fetchComparableFoods('peanut-butter',new AbortController().signal,async()=>new Response('x'.repeat(1500001))));
 await assert.rejects(fetchComparableFoods('peanut-butter',new AbortController().signal,async()=>new Response(JSON.stringify({schemaVersion:1,synthetic:true,foods:[]}))));
});

test('v4 expansion keeps nutrient, freshness, identity and dietary gates for every group',async()=>{
 const {comparisonGroups}=await import('../src/comparisonGroups.ts');
 for(const group of comparisonGroups){
  const base={...original,comparisonGroup:group,categoryEvidence:'category-rules-v4' as const};
  const good=candidate('2',{comparisonGroup:group,categoryEvidence:'category-rules-v4'});
  assert.equal(comparableAlternatives(base,[good],'saturatedFatG',[],now).length,1,group);
  for(const key of Object.keys(good.nutrients) as (keyof typeof good.nutrients)[]){
   assert.equal(comparisonReady({...good,nutrients:{...good.nutrients,[key]:null}},now),false);
  }
  for(const delta of [{sourceDate:'2020-01-01'},{retrievedAt:'2020-01-01T00:00:00Z'},{ingredients:null},{barcode:null}]){
   assert.equal(comparableAlternatives(base,[{...good,...delta}],'saturatedFatG',[],now).length,0);
  }
  for(const restriction of ['halal','kosher','glutenFree','dairyFree','eggFree','vegetarian','peanutAllergy']){
   assert.equal(comparableAlternatives(base,[good],'saturatedFatG',[restriction],now).length,0);
  }
 }
});
