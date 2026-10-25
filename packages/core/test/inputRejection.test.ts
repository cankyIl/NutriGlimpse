import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runSyntheticRejectionDiagnostic, type LocalInputAdapter } from '../src/inputPrivacy.ts';
function fixture() {
 let sessions=0; const disposed:string[]=[];const kinds:string[]=[];let cancelled=0;
 const adapter:LocalInputAdapter={
  createSessionAsync:async()=>String(++sessions), cancelSession:()=>{cancelled++;},
  disposeSessionAsync:async id=>{disposed.push(id);return true;},
  createSyntheticImageAsync:async()=>{throw Error('Unexpected image');},
  createInvalidFixtureAsync:async(_id,kind)=>{kinds.push(kind);return 'file:///owned/invalid.pdf';},
  inspectAsync:async()=>{throw Error('INPUT_UNREADABLE_OR_LIMIT_EXCEEDED');},
  renderTextAsync:async()=>{throw Error('Invalid files must not be rendered');},
 };
 return {adapter,disposed,kinds,sessions:()=>sessions,cancelled:()=>cancelled};
}
test('negative diagnostic rejects three generated fixtures and returns counts only after cleanup',async()=>{
 const f=fixture();const result=await runSyntheticRejectionDiagnostic(f.adapter,new AbortController().signal);
 assert.deepEqual(f.kinds,['empty','corrupt','oversized']);assert.deepEqual(f.disposed,['1','2','3']);
 assert.deepEqual(result,{rejected:3,cleanedSessions:3,privacyVerified:false,outboundAllowed:false});
 assert.equal(JSON.stringify(result).includes('file:'),false);
});
test('an accepted invalid fixture is a failure even when OCR returns no lines',async()=>{
 const f=fixture();f.adapter.inspectAsync=async()=>[];
 await assert.rejects(runSyntheticRejectionDiagnostic(f.adapter,new AbortController().signal),/unexpectedly accepted/);
 assert.equal(f.sessions(),1);assert.deepEqual(f.disposed,['1']);
});
test('unrelated native or fixture errors cannot masquerade as validation success',async()=>{
 const f=fixture();f.adapter.inspectAsync=async()=>{throw Error('INPUT_BUSY');};
 await assert.rejects(runSyntheticRejectionDiagnostic(f.adapter,new AbortController().signal),/not reached/);
 assert.deepEqual(f.disposed,['1']);
 f.adapter.createInvalidFixtureAsync=async()=>{throw Error('INPUT_UNREADABLE_OR_LIMIT_EXCEEDED');};
 await assert.rejects(runSyntheticRejectionDiagnostic(f.adapter,new AbortController().signal));
 assert.deepEqual(f.disposed,['1','2']);assert.equal(f.sessions(),2);
});
test('cleanup failure stops remaining cases rather than claiming the device is clean',async()=>{
 const f=fixture();f.adapter.disposeSessionAsync=async()=>false;
 await assert.rejects(runSyntheticRejectionDiagnostic(f.adapter,new AbortController().signal),/Cleanup/);
 assert.equal(f.sessions(),1);
});
test('cancellation during inspection or late allocation always cleans and is never a passing rejection',async()=>{
 for(const stage of ['allocate','inspect']){
  const f=fixture();const controller=new AbortController();
  if(stage==='allocate')f.adapter.createSessionAsync=async()=>{controller.abort();return 'late';};
  else f.adapter.inspectAsync=async()=>{controller.abort();throw Error('INPUT_UNREADABLE_OR_LIMIT_EXCEEDED');};
  await assert.rejects(runSyntheticRejectionDiagnostic(f.adapter,controller.signal),/cancelled/);
  assert.equal(f.disposed.length,1);assert.ok(f.cancelled()>0);
 }
});
test('pre-cancellation and older native builds do not allocate files',async()=>{
 const f=fixture();const controller=new AbortController();controller.abort();
 await assert.rejects(runSyntheticRejectionDiagnostic(f.adapter,controller.signal),/cancelled/);
 f.adapter.createInvalidFixtureAsync=undefined;
 await assert.rejects(runSyntheticRejectionDiagnostic(f.adapter,new AbortController().signal),/updated native build/);
 assert.equal(f.sessions(),0);
});
