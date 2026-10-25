import { z } from 'zod';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { verifyRuleEnvelope, verifiedRuleContents, invalidateVerifiedRulePack, type RuleTrustPolicy, type VerifiedRulePack } from './signedRules.ts';
export const ruleTrustStateSchema = z.object({
 version:z.literal(1), sequence:z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
 digest:z.string().regex(/^[a-f0-9]{64}$/), envelope:z.string().max(524288),
}).strict();
export type RuleTrustState=z.infer<typeof ruleTrustStateSchema>;
export interface RuleTrustRepository {
 read():Promise<unknown|null>;
 /** Envelope, sequence and digest must be replaced in one durable transaction. */
 write(state:RuleTrustState):Promise<void>;
}
function digest(json:string) {
 const envelope=JSON.parse(json);
 return bytesToHex(sha256(new TextEncoder().encode(JSON.stringify([envelope.keyId,envelope.payload]))));
}
function copyPolicy(p:RuleTrustPolicy):RuleTrustPolicy {
 if(!Number.isSafeInteger(p.minimumSequence)||p.minimumSequence<1) throw Error('Invalid sequence floor.');
 return {keys:{...p.keys},revokedKeyIds:[...p.revokedKeyIds],minimumSequence:p.minimumSequence};
}
/** One owner per repository. This trust state is separate from personal archive restore/reset. */
export class RulePackStore {
 private current:VerifiedRulePack|null=null;
 private saved:RuleTrustState|null=null;
 private loaded=false;
 private tail:Promise<unknown>=Promise.resolve();
 private policy:RuleTrustPolicy;
 private generation=0;
 private repository:RuleTrustRepository; private clock:()=>number;
 constructor(repository:RuleTrustRepository, policy:RuleTrustPolicy, clock=Date.now){this.repository=repository;this.clock=clock;this.policy=copyPolicy(policy);}
 get active():VerifiedRulePack|null {return verifiedRuleContents(this.current,this.clock())?this.current:null;}
 updatePolicy(policy:RuleTrustPolicy):void {
  this.policy=copyPolicy(policy);this.generation++;
  if(this.current)invalidateVerifiedRulePack(this.current);
  this.current=null;
 }
 private enqueue<T>(work:()=>Promise<T>):Promise<T>{
  const next=this.tail.then(work);this.tail=next.catch(()=>{});return next;
 }
 private verify(json:string){
  return verifyRuleEnvelope(json,{...this.policy,minimumSequence:Math.max(this.policy.minimumSequence,this.saved?.sequence??1),now:this.clock()});
 }
 initialize():Promise<void>{
  return this.enqueue(async()=>{
   if(this.loaded)throw Error('Rule store already initialized.');
   const raw=await this.repository.read();
   const state=raw===null?null:ruleTrustStateSchema.parse(raw);
   if(state&&(digest(state.envelope)!==state.digest || JSON.parse(JSON.parse(state.envelope).payload).sequence!==state.sequence))throw Error('Stored rule metadata mismatch.');
   this.saved=state;this.loaded=true;
   if(!state)return;
   // Expired/revoked packs retain the floor, but never activate.
   try{this.current=this.verify(state.envelope);}catch{this.current=null;}
  });
 }
 install(json:string):Promise<VerifiedRulePack>{
  return this.enqueue(async()=>{
   if(!this.loaded)throw Error('Initialize rule storage first.');
   const generation=this.generation;
   const handle=this.verify(json);
   const hash=digest(json);
   if(this.saved&&handle.sequence===this.saved.sequence&&hash!==this.saved.digest){
    invalidateVerifiedRulePack(handle);throw Error('Different payload at an accepted sequence.');
   }
   const state:RuleTrustState={version:1,sequence:handle.sequence,digest:hash,envelope:json};
   try{await this.repository.write(state);}catch(error){invalidateVerifiedRulePack(handle);throw error;}
   this.saved=state;
   if(this.current)invalidateVerifiedRulePack(this.current);
   this.current=null;
   if(generation!==this.generation||!verifiedRuleContents(handle,this.clock())){
    invalidateVerifiedRulePack(handle);throw Error('Rule trust changed while saving. Pack remains inactive.');
   }
   this.current=handle;return handle;
  });
 }
}
