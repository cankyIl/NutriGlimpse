import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { RulePackStore, ruleSigningBytes, verifiedRuleContents, type RuleTrustState } from '../src/index.ts';
const now=Date.parse('2026-10-06T16:30:00Z');
const pair=generateKeyPairSync('ed25519');
const publicKey=Buffer.from(pair.publicKey.export({format:'jwk'}).x!,'base64url').toString('hex');
const policy={keys:{test:publicKey},revokedKeyIds:[],minimumSequence:1};
function envelope(sequence:number, version='fixture'){
 const payload=JSON.stringify({schemaVersion:1,sequence,issuedAt:'2026-10-06T00:00:00Z',expiresAt:'2026-10-07T00:00:00Z',pack:{version,sources:[],rules:[]}});
 return JSON.stringify({schemaVersion:1,keyId:'test',payload,signature:sign(null,ruleSigningBytes('test',payload),pair.privateKey).toString('hex')});
}
function fixture(){
 let disk:RuleTrustState|null=null;let fail=false;
 const repository={read:async()=>structuredClone(disk),write:async(state:RuleTrustState)=>{if(fail)throw Error('Disk full');disk=structuredClone(state);}};
 return {repository,disk:()=>disk,fail:(value:boolean)=>{fail=value;}};
}
test('accepted sequence survives a fresh owner and rejects rollback or sequence reuse with changed payload',async()=>{
 const f=fixture();const a=new RulePackStore(f.repository,policy,()=>now);await a.initialize();
 await a.install(envelope(3));
 const b=new RulePackStore(f.repository,policy,()=>now);await b.initialize();assert.equal(b.active?.sequence,3);
 await assert.rejects(b.install(envelope(2)));await assert.rejects(b.install(envelope(3,'changed')));
 assert.equal(b.active?.sequence,3);assert.equal(f.disk()?.sequence,3);
});
test('failed durable update cannot activate candidate or invalidate the working previous handle',async()=>{
 const f=fixture();const store=new RulePackStore(f.repository,policy,()=>now);await store.initialize();
 const old=await store.install(envelope(1));f.fail(true);await assert.rejects(store.install(envelope(2)));
 assert.equal(store.active,old);assert.equal(f.disk()?.sequence,1);assert.ok(verifiedRuleContents(old,now));
 f.fail(false);await store.install(envelope(2));assert.equal(verifiedRuleContents(old,now),null);
});
test('updates serialize and a delayed older update cannot lower the durable floor',async()=>{
 const f=fixture();const store=new RulePackStore(f.repository,policy,()=>now);await store.initialize();
 const results=await Promise.allSettled([store.install(envelope(4)),store.install(envelope(2))]);
 assert.deepEqual(results.map(x=>x.status),['fulfilled','rejected']);assert.equal(f.disk()?.sequence,4);
});
test('revocation during a pending write disables both old and newly saved handles',async()=>{
 const f=fixture();let release!:()=>void;
 const store=new RulePackStore({read:f.repository.read,write:async(state)=>{await new Promise<void>(r=>{release=r;});await f.repository.write(state);}},policy,()=>now);
 await store.initialize();const pending=store.install(envelope(3));
 await new Promise(r=>setImmediate(r));store.updatePolicy({...policy,revokedKeyIds:['test']});release();
 await assert.rejects(pending);assert.equal(store.active,null);assert.equal(f.disk()?.sequence,3);
 const restart=new RulePackStore(f.repository,{...policy,revokedKeyIds:['test']},()=>now);await restart.initialize();assert.equal(restart.active,null);
});
test('expiry and metadata corruption fail closed; expiry never erases the floor',async()=>{
 const f=fixture();let clock=now;const store=new RulePackStore(f.repository,policy,()=>clock);await store.initialize();await store.install(envelope(3));
 clock=Date.parse('2026-10-07T00:00:00Z');assert.equal(store.active,null);
 const restart=new RulePackStore(f.repository,policy,()=>clock);await restart.initialize();assert.equal(restart.active,null);
 assert.equal(f.disk()?.sequence,3);
 const corrupt=new RulePackStore({read:async()=>({...f.disk(),sequence:1}),write:async()=>{}},policy,()=>now);
 await assert.rejects(corrupt.initialize());await assert.rejects(corrupt.install(envelope(1)));
});
test('policy object mutation cannot silently change pinned trust; explicit changes revoke existing handles',async()=>{
 const f=fixture();const mutable={keys:{test:publicKey},revokedKeyIds:[] as string[],minimumSequence:1};
 const store=new RulePackStore(f.repository,mutable,()=>now);await store.initialize();
 const active=await store.install(envelope(1));mutable.revokedKeyIds.push('test');
 assert.equal(store.active,active);store.updatePolicy(mutable);
 assert.equal(store.active,null);assert.equal(verifiedRuleContents(active,now),null);
 await assert.rejects(store.install(envelope(2)));
});
