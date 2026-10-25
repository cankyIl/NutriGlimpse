import test from 'node:test';
import assert from 'node:assert/strict';
import { getProduct } from '../src/fixtures.ts';
import { prepareFreshReference } from '../src/freshFood.ts';
test('fresh reference scales only the confirmed raw preparation and never establishes certification',()=>{
 const apple=getProduct('sample-apple')!;
 const raw=prepareFreshReference(apple,'raw',apple.servingGrams!*2);
 assert.equal(raw.nutrients.calories,apple.nutrients.calories!*2);
 assert.equal(raw.fixtureRating,null);
 assert.ok(Object.values(raw.compliance).every(v=>v==='unverified'));
 for(const form of ['cooked','unknown'] as const)assert.ok(Object.values(prepareFreshReference(apple,form,100).nutrients).every(v=>v===null));
 for(const weight of [0,-1,Infinity,NaN,10001])assert.throws(()=>prepareFreshReference(apple,'raw',weight));
});
