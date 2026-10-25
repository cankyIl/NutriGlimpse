import {z} from 'zod';
import {sha256} from '@noble/hashes/sha2.js';
import {bytesToHex,hexToBytes} from '@noble/hashes/utils.js';
import {ed25519} from '@noble/curves/ed25519.js';
import type {PublicFood} from './publicFood.ts';
import {currentLabelSource,inspectGlutenLabel} from './labelChecks.ts';
import {labelEvidenceKeys} from './labelEvidenceKeys.ts';
export function productLabelFingerprint(food:PublicFood){
 return bytesToHex(sha256(new TextEncoder().encode(JSON.stringify([food.provider,food.id,food.barcode,food.name,food.brand,food.ingredients,food.servingGrams??null,food.nutrients,food.additionalNutrients??null,food.reportedLabel??null]))));
}
export const labelProofBody=z.object({version:z.literal(1),fingerprint:z.string().regex(/^[a-f0-9]{64}$/),basis:z.enum(['certification','manufacturer-label']),issuedAt:z.string().datetime(),expiresAt:z.string().datetime(),evidenceIds:z.array(z.string().min(1).max(120)).min(1).max(20),frontLabelText:z.string().max(10000),allergenStatement:z.string().max(10000)}).strict();
const envelope=z.object({keyId:z.string().max(80),payload:z.string().max(15000),signature:z.string().regex(/^[a-f0-9]{128}$/)}).strict();
export const labelSigningBytes=(keyId:string,payload:string)=>new TextEncoder().encode('grocery-product-label-v1\0'+keyId+'\0'+payload);
/** A catalog tag or caller-supplied verified flag cannot pass this check. Proofs expire within one hour. */
export function verifiedGlutenEvidence(food:PublicFood,now=Date.now(),keys:Readonly<Record<string,string>>=labelEvidenceKeys){
 try{
  if(!food.glutenEvidence?.proof||!currentLabelSource(food,now))return null;
  const e=envelope.parse(JSON.parse(food.glutenEvidence.proof)),key=Object.hasOwn(keys,e.keyId)?keys[e.keyId]:undefined;
  if(!key||!ed25519.verify(hexToBytes(e.signature),labelSigningBytes(e.keyId,e.payload),hexToBytes(key),{zip215:false}))return null;
  const b=labelProofBody.parse(JSON.parse(e.payload)),issued=Date.parse(b.issuedAt),expires=Date.parse(b.expiresAt);
  if(!Number.isFinite(now)||issued>now||expires<=now||expires-issued>3600000||expires<=issued||b.fingerprint!==productLabelFingerprint(food))return null;
  const triage=inspectGlutenLabel({ingredients:food.ingredients,frontLabelText:b.frontLabelText,allergenStatement:b.allergenStatement});
  if(!food.ingredients?.trim()||!triage.claimObserved||triage.wheatDeclaration||triage.advisory||triage.ingredientTerms.some(t=>t!=='oats'))return null;
  return b;
 }catch{return null;}
}
