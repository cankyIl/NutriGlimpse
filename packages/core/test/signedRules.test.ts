import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyRuleEnvelope, verifiedRuleContents, invalidateVerifiedRulePack, ruleSigningBytes, type RuleTrustPolicy } from '../src/signedRules.ts';
import { applicableRules, type RulePack } from '../src/evidence.ts';
import { sampleProfile } from '../src/fixtures.ts';

const clock=Date.parse('2026-10-06T14:30:00Z');
const pair=generateKeyPairSync('ed25519');
const publicHex=Buffer.from(pair.publicKey.export({format:'jwk'}).x!, 'base64url').toString('hex');
const policy: RuleTrustPolicy={keys:{fixture:publicHex},revokedKeyIds:[],minimumSequence:2,now:clock};
const pack: RulePack={version:'fixture-v2',sources:[{id:'s',title:'Synthetic test source',url:'https://example.com/fixture',version:'1',checkedAt:'2026-10-05T00:00:00Z',usage:'permitted'}],
  rules:[{id:'r',version:'2',condition:'cardiovascular',sourceIds:['s'],status:'approved',reviewedBy:'synthetic-reviewer',approvedAt:'2026-10-05T00:00:00Z',minimumAge:21,pregnancy:['not-pregnant'],requiredContext:[]}]};
function envelope(overrides: Record<string,unknown> = {}, keyId='fixture') {
  const payload=JSON.stringify({schemaVersion:1,sequence:2,issuedAt:'2026-10-06T00:00:00Z',expiresAt:'2026-10-07T00:00:00Z',pack,...overrides});
  const signature=sign(null,ruleSigningBytes(keyId,payload),pair.privateKey).toString('hex');
  return JSON.stringify({schemaVersion:1,keyId,payload,signature});
}
test('portable verifier accepts Node-generated Ed25519 signatures and preserves provenance',()=>{
  const handle=verifyRuleEnvelope(envelope(),policy);
  assert.equal(handle.sequence,2); assert.equal(applicableRules(handle,sampleProfile,[],clock).length,1);
  assert.equal(verifiedRuleContents(handle,clock)?.version,'fixture-v2');
});
test('tampered payload, signature, signing key and algorithm fields fail closed',()=>{
  const data=JSON.parse(envelope());data.payload=data.payload.replace('fixture-v2','fixture-v3');
  assert.throws(()=>verifyRuleEnvelope(JSON.stringify(data),policy));
  data.signature='00'.repeat(64);assert.throws(()=>verifyRuleEnvelope(JSON.stringify(data),policy));
  assert.throws(()=>verifyRuleEnvelope(envelope({},'unknown'),policy));
  assert.throws(()=>verifyRuleEnvelope(JSON.stringify({...JSON.parse(envelope()),algorithm:'none'}),policy));
});
test('revocation, rollback, expiry, future issuance and invalid validity windows are rejected',()=>{
  assert.throws(()=>verifyRuleEnvelope(envelope(),{...policy,revokedKeyIds:['fixture']}));
  assert.throws(()=>verifyRuleEnvelope(envelope({sequence:1}),policy));
  assert.throws(()=>verifyRuleEnvelope(envelope({expiresAt:'2026-10-06T14:30:00Z'}),policy));
  assert.throws(()=>verifyRuleEnvelope(envelope({issuedAt:'2026-10-06T15:00:00Z'}),policy));
  assert.throws(()=>verifyRuleEnvelope(envelope({expiresAt:'2026-10-05T00:00:00Z'}),policy));
});
test('caller booleans, cloned handles and post-verification mutation cannot confer or change trust',()=>{
  const handle=verifyRuleEnvelope(envelope(),policy);
  assert.deepEqual(applicableRules({...handle},sampleProfile,[],clock),[]);
  assert.deepEqual(applicableRules(true as never,sampleProfile,[],clock),[]);
  assert.throws(()=>{ verifiedRuleContents(handle,clock)!.rules[0].status='withdrawn'; });
  assert.deepEqual(applicableRules(handle,sampleProfile,[],Date.parse(handle.expiresAt)),[]);
});
test('validly signed malformed or incomplete evidence still fails schema/provenance validation',()=>{
  assert.throws(()=>verifyRuleEnvelope(envelope({pack:{...pack,rules:[pack.rules[0],pack.rules[0]]}}),policy));
  assert.throws(()=>verifyRuleEnvelope(envelope({pack:{...pack,sources:[]}}),policy));
  assert.throws(()=>verifyRuleEnvelope(envelope({pack:{...pack,execute:'network-request'}}),policy));
  assert.throws(()=>verifyRuleEnvelope(envelope(),{...policy,minimumSequence:NaN}));
  assert.throws(()=>verifyRuleEnvelope('x'.repeat(524289),policy));
});
test('a valid signature cannot activate unreviewed, withdrawn or context-inapplicable rules',()=>{
  for(const status of ['draft','withdrawn'] as const){
    const handle=verifyRuleEnvelope(envelope({pack:{...pack,rules:[{...pack.rules[0],status}]}}),policy);
    assert.deepEqual(applicableRules(handle,sampleProfile,[],clock),[]);
  }
  const handle=verifyRuleEnvelope(envelope({pack:{...pack,rules:[{...pack.rules[0],requiredContext:['individual-plan']}]}}),policy);
  assert.deepEqual(applicableRules(handle,sampleProfile,[],clock),[]);
  assert.equal(applicableRules(handle,sampleProfile,['individual-plan'],clock).length,1);
  assert.deepEqual(applicableRules(handle,{...sampleProfile,pregnancy:'pregnant'},['individual-plan'],clock),[]);
});

test('invalidating cached trust immediately disables an already verified pack',()=>{
  const handle=verifyRuleEnvelope(envelope(),policy);
  assert.equal(applicableRules(handle,sampleProfile,[],clock).length,1);
  invalidateVerifiedRulePack(handle);
  assert.deepEqual(applicableRules(handle,sampleProfile,[],clock),[]);
  invalidateVerifiedRulePack(handle);
});
