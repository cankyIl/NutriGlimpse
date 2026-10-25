import { createPrivateKey, sign } from 'node:crypto';
import { ruleSigningBytes, verifyRuleEnvelope, verifiedRuleContents, type RuleTrustPolicy } from '../../../packages/core/src/signedRules.ts';
/** Offline publication preparation. The caller owns the private key; it is never returned or logged. */
export function stageRuleEnvelope(payload:string,keyId:string,privateKeyPem:string,policy:RuleTrustPolicy){
 const key=createPrivateKey(privateKeyPem);
 if(key.asymmetricKeyType!=='ed25519')throw Error('An Ed25519 signing key is required.');
 const signature=sign(null,ruleSigningBytes(keyId,payload),key).toString('hex');
 const envelope=JSON.stringify({schemaVersion:1,keyId,payload,signature});
 validatePublishedRules(envelope,policy);
 return envelope;
}
function validatePublishedRules(envelope:string,policy:RuleTrustPolicy){
 const handle=verifyRuleEnvelope(envelope,policy);
 const pack=verifiedRuleContents(handle,policy.now??Date.now());
 if(!pack||pack.rules.some(rule=>rule.status!=='approved'||!rule.reviewedBy||!rule.approvedAt)||
  pack.sources.some(source=>source.usage!=='permitted'))
  throw Error('Only reviewed rules with permitted sources may be published.');
 return handle;
}
export class RuleDistribution{
 private envelope:string;
 private policy:RuleTrustPolicy;
 constructor(envelope:string,policy:RuleTrustPolicy){
  validatePublishedRules(envelope,policy);
  this.envelope=envelope;
  this.policy={keys:{...policy.keys},revokedKeyIds:[...policy.revokedKeyIds],minimumSequence:policy.minimumSequence};
 }
 current(now=Date.now()):string|null{
  try{validatePublishedRules(this.envelope,{...this.policy,now});return this.envelope;}catch{return null;}
 }
 /** A trusted operator policy replacement can revoke an already staged bundle immediately. */
 updatePolicy(policy:RuleTrustPolicy){
  this.policy={keys:{...policy.keys},revokedKeyIds:[...policy.revokedKeyIds],minimumSequence:policy.minimumSequence};
 }
}
