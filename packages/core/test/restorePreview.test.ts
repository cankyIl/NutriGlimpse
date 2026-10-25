import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RestorePreview, LocalSession, newSnapshot, encryptArchive, decryptArchive } from '../src/index.ts';
test('failed new selection clears the previous restore preview',async()=>{
 const review=new RestorePreview();await review.prepare(async()=>newSnapshot());
 await assert.rejects(review.prepare(async()=>{throw Error('Wrong passphrase');}));
 assert.equal(review.preview,null);let writes=0;
 assert.equal(await review.restore(async()=>{writes++;return true;}),false);assert.equal(writes,0);
});
test('dismissal and newer selection suppress late import results',async()=>{
 const review=new RestorePreview();let resolve!:(v:ReturnType<typeof newSnapshot>)=>void;
 const old=review.prepare(()=>new Promise(r=>{resolve=r;}));
 await review.prepare(async()=>({...newSnapshot(),store:'Target'}));resolve(newSnapshot());await old;
 assert.equal(review.preview?.store,'Target');
 const late=review.prepare(()=>new Promise(r=>{resolve=r;}));review.dismiss();resolve(newSnapshot());await late;
 assert.equal(review.preview,null);
});
test('failed restore preserves disk and reviewed preview for retry; successful restore clears it',async()=>{
 let disk=newSnapshot();let fail=false;
 const session=new LocalSession({read:async()=>disk,write:async next=>{if(fail)throw Error('Disk full');disk=structuredClone(next);},clear:async()=>{}});
 await session.initialize();const review=new RestorePreview();
 await review.prepare(async()=>({...newSnapshot(),store:'Target'}));
 fail=true;assert.equal(await review.restore(s=>session.replace(s)),false);assert.equal(disk.store,'Wegmans');assert.equal(review.preview?.store,'Target');
 fail=false;assert.equal(await review.restore(s=>session.replace(s)),true);assert.equal(disk.store,'Target');assert.equal(review.preview,null);
});
test('double confirmation is single-write and cannot replace its preview during a write',async()=>{
 const review=new RestorePreview();await review.prepare(async()=>newSnapshot());let resolve!:(v:boolean)=>void;let writes=0;
 const saving=review.restore(async()=>{writes++;return new Promise(r=>{resolve=r;});});
 assert.equal(await review.restore(async()=>{writes++;return true;}),false);
 await assert.rejects(review.prepare(async()=>newSnapshot()));
 resolve(true);assert.equal(await saving,true);assert.equal(writes,1);
});
test('callers cannot mutate the reviewed snapshot through its preview',async()=>{
 const review=new RestorePreview();await review.prepare(async()=>newSnapshot());const shown=review.preview!;shown.profile.age=1;
 assert.notEqual(review.preview?.profile.age,1);await review.prepare(async()=>null);assert.equal(review.preview,null);
});
test('archive rejects short authentication tags, partial hex bytes and malformed random output',async()=>{
 const envelope={format:'grocery-beta0-archive',version:1,kdf:'scrypt-N32768-r8-p1',salt:'00'.repeat(16),nonce:'00'.repeat(12)};
 for(const ciphertext of ['00','0'.repeat(33),'zz'.repeat(16)])await assert.rejects(decryptArchive(JSON.stringify({...envelope,ciphertext}),'valid-test-passphrase'));
 await assert.rejects(encryptArchive(newSnapshot(),'valid-test-passphrase',()=>new Uint8Array(1)),/random/);
});
