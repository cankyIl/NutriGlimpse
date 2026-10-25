import test from 'node:test';
import assert from 'node:assert/strict';
import { conditions, restrictions, type Condition, type Restriction, type Profile } from '../src/types.ts';
import { getProduct } from '../src/fixtures.ts';
import { assessSample } from '../src/assessment.ts';
test('all condition/restriction subsets preserve uncertainty across pregnancy and adult age contexts',()=>{
 const cs=Object.keys(conditions) as Condition[], rs=Object.keys(restrictions) as Restriction[];
 const product={...getProduct('sample-oats')!,fixtureRating:null};
 let cases=0;
 for(let cm=1;cm<1<<cs.length;cm++)for(let rm=0;rm<1<<rs.length;rm++)
 for(const age of [21,80])for(const pregnancy of ['not-pregnant','pregnant','unspecified'] as const){
  const selected=cs.filter((_,i)=>cm&(1<<i));
  const profile:Profile={revision:1,age,pregnancy,primary:selected[0],conditions:selected,intent:'both',restrictions:rs.filter((_,i)=>rm&(1<<i))};
  const result=assessSample(product,profile);
  assert.ok(['Insufficient information','Restriction conflict'].includes(result.label));
  assert.equal(result.primary,profile.primary);
  assert.equal(result.profileRevision,1);
  cases++;
 }
 assert.equal(cases,97920);
});
