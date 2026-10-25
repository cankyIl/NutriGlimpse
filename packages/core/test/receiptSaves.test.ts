import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoReceipt, newSnapshot, saveReviewedReceipt, LocalSession, type BetaSnapshot } from '../src/index.ts';
const initial=newSnapshot();
const original=demoReceipt('receipt',initial.profile,'2026-10-06T22:00:00Z');
const revised={...original,retailer:'Fictional changed store'};
const snapshot=()=>({...newSnapshot(),receipts:[structuredClone(original)]});
test('first review inserts once; subsequent changes preserve context and unrelated history',()=>{
 const first=saveReviewedReceipt(newSnapshot(),original,null);
 assert.equal(first.receipts.length,1);
 assert.throws(()=>saveReviewedReceipt(first,original,null));
 const other=demoReceipt('other',initial.profile,'2026-10-05T22:00:00Z');
 const changed=saveReviewedReceipt({...first,receipts:[original,other]},revised,original);
 assert.deepEqual(changed.receipts,[revised,other]);
 assert.equal(saveReviewedReceipt(first,original,original),first);
});
test('stale or deleted receipt cannot be overwritten or resurrected',()=>{
 assert.throws(()=>saveReviewedReceipt({...snapshot(),receipts:[revised]},original,original));
 assert.throws(()=>saveReviewedReceipt(newSnapshot(),revised,original));
 assert.throws(()=>saveReviewedReceipt(snapshot(),{...revised,id:'different'},original));
});
test('review cannot rewrite original time/profile or save malformed lines',()=>{
 for(const next of [{...revised,createdAt:'2026-10-07T00:00:00Z'},{...revised,profile:{...original.profile,age:99}},
 {...revised,lines:[original.lines[0],original.lines[0]]},{...revised,lines:[{...original.lines[0],quantity:0}]}])
  assert.throws(()=>saveReviewedReceipt(snapshot(),next,original));
});
function sessionFixture(){
 let disk:BetaSnapshot=snapshot();let fail=false;
 const session=new LocalSession({read:async()=>disk,write:async next=>{if(fail)throw Error('Storage unavailable');disk=structuredClone(next);},clear:async()=>{}});
 return {session,disk:()=>disk,fail:(value:boolean)=>{fail=value;}};
}
test('concurrent reviews serialize: only the first edit of a shared base is saved',async()=>{
 const f=sessionFixture();await f.session.initialize();
 const results=await Promise.all([f.session.commit(s=>saveReviewedReceipt(s,revised,original)),
 f.session.commit(s=>saveReviewedReceipt(s,{...original,retailer:'Stale competing edit'},original))]);
 assert.deepEqual(results,[true,false]);assert.equal(f.disk().receipts[0].retailer,revised.retailer);
});
test('storage failure preserves prior receipt and permits retry against the unchanged base',async()=>{
 const f=sessionFixture();await f.session.initialize();f.fail(true);
 assert.equal(await f.session.commit(s=>saveReviewedReceipt(s,revised,original)),false);
 assert.deepEqual(f.disk().receipts[0],original);
 f.fail(false);assert.equal(await f.session.commit(s=>saveReviewedReceipt(s,revised,original)),true);
 assert.deepEqual(f.disk().receipts[0],revised);
});
test('reset invalidates an existing review instead of silently creating a new record',async()=>{
 const f=sessionFixture();await f.session.initialize();await f.session.replace(newSnapshot());
 assert.equal(await f.session.commit(s=>saveReviewedReceipt(s,revised,original)),false);
 assert.equal(f.disk().receipts.length,0);
});
