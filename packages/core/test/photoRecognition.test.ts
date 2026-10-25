import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {recognizeProductPhoto,parseRecognitionCatalog,PhotoReviewTransfer,processProductPhoto} from '../src/photoRecognition.ts';
import {food} from './shelfTestHelpers.ts';
const pages=(text:string,confidence=0.99)=>[{page:1,width:1000,height:1000,lines:text?[{id:'line',text,x:10,y:10,width:900,height:100,confidence}]:[]}];
const catalog=[food(),food(2,{name:'Testbrand Sunrise Honey Cereal'}),food(3,{name:'Otherbrand Sunrise Original Cereal',brand:'Otherbrand'})];
test('front-package text suggests the right brand and original variant first, never confirms automatically',()=>{
 const result=recognizeProductPhoto(pages('Testbrand Sunrise Original Cereal'),catalog);
 assert.equal(result.status,'needs_confirmation');assert.equal(result.food,null);assert.equal(result.identityMethod,null);
 assert.equal(result.options[0].food.id,'unit-1');assert.ok(result.options.every(option=>option.food.brand==='Testbrand'));
});
test('ambiguous variants remain choices, not invented exact identity',()=>{
 const result=recognizeProductPhoto(pages('Testbrand Sunrise'),catalog);
 assert.deepEqual(new Set(result.options.map(option=>option.food.id)),new Set(['unit-1','unit-2']));
});
test('blank, unrelated, generic nutrition text and low confidence do not become a product',()=>{
 for(const [text,confidence] of [['',1],['UNLISTED QUASAR',1],['Nutrition Facts calories total sugar sodium',1],['Testbrand Sunrise',0.1]] as const){
  const result=recognizeProductPhoto(pages(text,confidence),catalog);assert.equal(result.status,'unmatched');assert.equal(result.options.length,0);
 }
});
test('photo bridge rejects out-of-frame, duplicate, multi-page and oversized catalog input',()=>{
 assert.throws(()=>recognizeProductPhoto([{...pages('Testbrand')[0],lines:[{...pages('x')[0].lines[0],x:990}]}],catalog));
 assert.throws(()=>recognizeProductPhoto([...pages('x'),{...pages('x')[0],page:2}],catalog));
 assert.throws(()=>recognizeProductPhoto(pages('x'),Array(10001).fill(food())));
});
test('included public catalog validates, has attribution, bounded candidate output and no automatic photo match',()=>{
 const snapshot=JSON.parse(readFileSync(new URL('../../../apps/mobile/assets/catalog/public-foods.json',import.meta.url),'utf8'));
 const foods=parseRecognitionCatalog(snapshot);assert.ok(foods.length>4000);assert.ok(snapshot.attribution);assert.ok(snapshot.licenseUrl);
 const result=recognizeProductPhoto(pages('Cheerios General Mills Honey Nut'),foods);
 assert.ok(result.options.length>0&&result.options.length<=5);assert.notEqual(result.status,'confirmed');
 assert.ok(result.options.some(option=>/cheerios/i.test(option.food.name)));
 assert.throws(()=>parseRecognitionCatalog({foods:[{...food(),certifications:'verified'}]}));
});
test('nutrient photo handoff is isolated, one-use, expiring and clearable',()=>{
 const transfer=new PhotoReviewTransfer(),original=pages('Nutrition Facts');
 transfer.put('test-1',original,100);original[0].lines[0].text='changed';
 assert.equal(transfer.take('test-1',101)?.[0].lines[0].text,'Nutrition Facts');assert.equal(transfer.take('test-1',102),null);
 transfer.put('test-2',original,100);assert.equal(transfer.take('test-2',30100),null);
 transfer.put('test-3',original,100);assert.equal(transfer.take('wrong',101),null);assert.equal(transfer.take('test-3',102),null);
 transfer.put('test-4',original,100);transfer.clear();assert.equal(transfer.take('test-4',101),null);
 transfer.put('older',original,100);transfer.put('newer',original,100);assert.equal(transfer.take('older',101),null);
 assert.throws(()=>transfer.put('file:///photo',original));
});

test('an exact visible name outranks pack-size variants without auto-confirming',()=>{
 const exact=food(20,{name:'Peanut Butter Granola Bars',brand:'Testbrand'});
 const variants=Array.from({length:8},(_,i)=>food(30+i,{name:`Testbrand Crunchy Peanut Butter Granola Bars ${i+5} Count`,brand:'Testbrand'}));
 const page=pages('Peanut Butter Granola Bars');page[0].lines.push({...page[0].lines[0],id:'brand',text:'Testbrand',y:200});
 const result=recognizeProductPhoto(page,[...variants,exact]);assert.equal(result.options[0].food.id,exact.id);assert.equal(result.status,'needs_confirmation');
});

test('photo failures identify format/catalog/matcher stages without leaking OCR or internal errors',()=>{
 const badFormat=processProductPhoto([{page:1}],()=>{throw Error('must not load');});assert.equal(badFormat.ok,false);if(!badFormat.ok)assert.equal(badFormat.code,'P1');
 const brokenCatalog=processProductPhoto(pages('PRIVATE OCR'),()=>{throw Error('PRIVATE PATH');});assert.equal(brokenCatalog.ok,false);if(!brokenCatalog.ok){assert.equal(brokenCatalog.code,'P2');assert.ok(!brokenCatalog.message.includes('PRIVATE'));}
 const brokenMatching=processProductPhoto(pages('PRIVATE OCR'),()=>[null] as never);assert.equal(brokenMatching.ok,false);if(!brokenMatching.ok)assert.equal(brokenMatching.code,'P3');
 const unreadable=processProductPhoto(pages(''),()=>catalog);assert.equal(unreadable.ok,true);if(unreadable.ok)assert.equal(unreadable.result.status,'unmatched');
 const valid=processProductPhoto(pages('Testbrand Sunrise Original'),()=>catalog);assert.equal(valid.ok,true);
});
