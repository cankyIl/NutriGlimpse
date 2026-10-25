import { test } from 'node:test';
import assert from 'node:assert/strict';
import { products, sampleProfile, sampleAlternatives, compareAtEqualWeight } from '../src/index.ts';
test('equal-weight comparison uses the original single portion and retains all nutrient differences',()=>{
 const c=compareAtEqualWeight(products[0],products[1])!;
 assert.equal(c.grams,55);
 assert.deepEqual(c.nutrients.find(n=>n.key==='saturatedFat'),{key:'saturatedFat',original:5,candidate:0.6875});
 assert.equal(c.nutrients.find(n=>n.key==='fiber')?.candidate,5.5);
 assert.equal(c.nutrients.length,5);
});
test('missing weights and invalid numbers never become zero or a usable comparison',()=>{
 for(const weight of [null,0,-1,Infinity,NaN]) assert.equal(compareAtEqualWeight(products[0],{...products[1],servingGrams:weight}),null);
 const c=compareAtEqualWeight(products[0],{...products[1],nutrients:{...products[1].nutrients,sodium:null,calories:Infinity}})!;
 assert.equal(c.nutrients.find(n=>n.key==='sodium')?.candidate,null);
 assert.equal(c.nutrients.find(n=>n.key==='calories')?.candidate,null);
});
test('smaller serving cannot fake improvement at equal weight despite good fixture rating',()=>{
 const deceptive={...products[1],servingGrams:1,nutrients:{...products[1].nutrients,saturatedFat:1}};
 assert.deepEqual(sampleAlternatives(products[0],[deceptive],sampleProfile,'Wegmans'),[]);
});
test('retailer preference cannot bypass conflicts, unknown certifications or absent weight',()=>{
 const invalid=[{...products[1],id:'conflict',compliance:{...products[1].compliance,dairyFree:'conflict' as const}},
 {...products[1],id:'unknown',compliance:{...products[1].compliance,dairyFree:'unverified' as const}},
 {...products[1],id:'no-weight',servingGrams:null}];
 assert.deepEqual(sampleAlternatives(products[0],invalid,{...sampleProfile,restrictions:['dairyFree']},'Wegmans'),[]);
});
test('eligible alternatives prefer retailer without dropping material nutrient downsides',()=>{
 const elsewhere={...products[1],id:'elsewhere',retailers:['Target']};
 const local={...products[1],id:'local',nutrients:{...products[1].nutrients,sodium:100}};
 assert.deepEqual(sampleAlternatives(products[0],[elsewhere,local],sampleProfile,'Wegmans').map(p=>p.id),['local','elsewhere']);
 const sodium=compareAtEqualWeight(products[0],local)!.nutrients.find(n=>n.key==='sodium')!;
 assert.equal(sodium.original,90);assert.equal(sodium.candidate,137.5);
 assert.deepEqual(sampleAlternatives(products[0],[local],{...sampleProfile,conditions:['cardiovascular','hypertension']},'Wegmans'),[]);
});
