import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { RulePackManager, ruleSigningBytes, verifiedRuleContents, type RuleTrustState } from '../src/index.ts';
const now = Date.parse('2026-10-06T18:00:00Z');
const pair = generateKeyPairSync('ed25519');
const policy = { keys: { test: Buffer.from(pair.publicKey.export({format:'jwk'}).x!, 'base64url').toString('hex') }, revokedKeyIds: [], minimumSequence: 1 };
function envelope(sequence = 1) {
 const payload = JSON.stringify({schemaVersion:1,sequence,issuedAt:'2026-10-06T00:00:00Z',expiresAt:'2026-10-07T00:00:00Z',pack:{version:'fixture',sources:[],rules:[]}});
 return JSON.stringify({schemaVersion:1,keyId:'test',payload,signature:sign(null,ruleSigningBytes('test',payload),pair.privateKey).toString('hex')});
}
function fixture() {
 let disk: RuleTrustState | null = null; let writes = 0; let reads = 0;
 return { repo: { read: async () => { reads++; return structuredClone(disk); }, write: async (value: RuleTrustState) => { writes++; disk = structuredClone(value); } },
 writes: () => writes, reads: () => reads, disk: () => disk };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
test('app default has no updates; browser and damaged trust fail closed without rejecting startup', async () => {
 const f = fixture(); const disabled = new RulePackManager(f.repo, {keys:{},revokedKeyIds:[],minimumSequence:1});
 await Promise.all([disabled.initialize(), disabled.initialize()]);
 assert.equal(f.reads(),1); assert.equal(disabled.status.state,'updates-disabled');
 await assert.rejects(disabled.refresh()); assert.equal(f.writes(),0);
 const missing = new RulePackManager(undefined,policy); await missing.initialize(); assert.equal(missing.status.state,'unavailable');
 const corrupt = new RulePackManager({read:async()=>({invalid:true}),write:async()=>assert.fail()},policy,async()=>envelope(),()=>now);
 await corrupt.initialize(); assert.equal(corrupt.status.state,'unavailable'); await assert.rejects(corrupt.refresh());
});
test('concurrent refresh shares one configured source and activates only its verified durable pack', async () => {
 const f=fixture(); let reads=0; let release!:(text:string)=>void;
 const m=new RulePackManager(f.repo,policy,()=>{reads++;return new Promise(r=>{release=r;});},()=>now);
 await assert.rejects(m.refresh()); await m.initialize();
 const a=m.refresh(); const b=m.refresh(); assert.equal(a,b); await tick();
 assert.equal(m.verifiedPack,null); release(envelope()); await a;
 assert.equal(reads,1); assert.equal(f.writes(),1); assert.equal(m.status.sequence,1);
 const handle=m.verifiedPack!; m.close(); assert.equal(verifiedRuleContents(handle,now),null);
 await assert.rejects(m.refresh()); await assert.rejects(m.initialize());
});
test('shutdown aborts transport and ignores a late response even if source ignores cancellation', async () => {
 const f=fixture(); let release!:(text:string)=>void; let signal!:AbortSignal;
 const m=new RulePackManager(f.repo,policy,s=>{signal=s;return new Promise(r=>{release=r;});},()=>now);
 await m.initialize(); const update=m.refresh(); await tick(); m.close();
 assert.equal(signal.aborted,true); release(envelope()); await assert.rejects(update);
 assert.equal(f.writes(),0); assert.equal(m.status.state,'closed'); assert.equal(m.verifiedPack,null);
});
test('shutdown during durable write retains floor but cannot activate saved candidate', async () => {
 const f=fixture(); let release!:()=>void;
 const m=new RulePackManager({read:f.repo.read,write:async value=>{await new Promise<void>(r=>{release=r;});await f.repo.write(value);}},policy,async()=>envelope(3),()=>now);
 await m.initialize(); const update=m.refresh(); await tick(); m.close(); release(); await assert.rejects(update);
 assert.equal(f.disk()?.sequence,3); assert.equal(m.verifiedPack,null);
});
test('failed and oversized updates preserve prior pack; synchronous source failures allow retry', async () => {
 const f=fixture(); let mode='valid';
 const m=new RulePackManager(f.repo,policy,()=>{if(mode==='throw')throw Error('Unavailable');return Promise.resolve(mode==='large'?'x'.repeat(524289):mode==='invalid'?'{}':envelope());},()=>now);
 await m.initialize(); await m.refresh(); const prior=m.verifiedPack;
 for(const next of ['throw','large','invalid']) {mode=next;await assert.rejects(m.refresh());assert.equal(m.verifiedPack,prior);assert.equal(m.status.updateFailed,true);}
 assert.equal(f.writes(),1);mode='valid';await m.refresh();assert.equal(m.status.updateFailed,false);
});
test('close during initialization never exposes stored authorization', async () => {
 const f=fixture();const seed=new RulePackManager(f.repo,policy,async()=>envelope(),()=>now);await seed.initialize();await seed.refresh();seed.close();
 let release!:(value:unknown)=>void;
 const m=new RulePackManager({read:()=>new Promise(r=>{release=r;}),write:f.repo.write},policy,async()=>envelope(),()=>now);
 const starting=m.initialize();await tick();m.close();release(f.disk());await starting;
 assert.equal(m.status.state,'closed');assert.equal(m.verifiedPack,null);
});

test('close before dispatch does not invoke the configured source', async () => {
 const f=fixture();let calls=0;
 const m=new RulePackManager(f.repo,policy,async()=>{calls++;return envelope();},()=>now);
 await m.initialize();const update=m.refresh();m.close();await assert.rejects(update);
 assert.equal(calls,0);assert.equal(f.writes(),0);
});
