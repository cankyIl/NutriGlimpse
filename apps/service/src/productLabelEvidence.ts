import {readFileSync,statSync} from 'node:fs';
import {z} from 'zod';
import {ed25519} from '@noble/curves/ed25519.js';
import {bytesToHex,hexToBytes} from '@noble/hashes/utils.js';
import {productLabelFingerprint,labelProofBody,labelSigningBytes} from '../../../packages/core/src/productLabelEvidence.ts';
import {currentLabelSource,inspectGlutenLabel} from '../../../packages/core/src/labelChecks.ts';
import type {PublicFood} from '../../../packages/core/src/publicFood.ts';
import {parseEvidenceRegistry,type ProductEvidence} from './sourceEvidence.ts';
export const labelTrustSchema=z.object({version:z.literal(1),acceptedAuthorities:z.array(z.string()).max(100),permittedRightsRecords:z.array(z.string()).max(1000),approvedReviewers:z.array(z.string()).max(100),manufacturerHosts:z.array(z.string().regex(/^[a-z0-9.-]+$/)).max(500)}).strict();
export type LabelTrust=z.infer<typeof labelTrustSchema>;
export function resolveGlutenEvidence(food:PublicFood,rows:ProductEvidence[],policy:LabelTrust,now=Date.now()){
 const unknown=(reason:string,status:'unverified'|'conflict'|'contradicted'='unverified')=>({status,reason,frontLabelText:null,allergenStatement:null,sources:[],proof:null} satisfies NonNullable<PublicFood['glutenEvidence']>);
 if(!food.barcode||!food.ingredients?.trim()||!currentLabelSource(food,now))return {summary:unknown('Current product identity, ingredients and source dates are required.'),body:null};
 const fingerprint=productLabelFingerprint(food);
 const matches=rows.filter(e=>e.barcode===food.barcode&&e.market==='US'&&e.claim==='gluten-free'&&['manufacturer-label','certification'].includes(e.kind)&&e.productFingerprint===fingerprint);
 if(matches.some(e=>e.review.status==='withdrawn'))return {summary:unknown('Product verification has been withdrawn. A new review is required.'),body:null};
 const valid=matches.filter(e=>e.label?.allergenPanelReviewed&&e.review.status==='approved'&&e.review.reviewer&&policy.approvedReviewers.includes(e.review.reviewer)&&e.review.reviewedAt&&Date.parse(e.review.reviewedAt)>=Date.parse(e.observedAt)&&Date.parse(e.review.reviewedAt)<=now&&Date.parse(e.observedAt)<=now&&now-Date.parse(e.observedAt)<=90*86400000&&Date.parse(e.expiresAt)>now&&e.rights.status==='permitted'&&!!e.rights.recordId&&policy.permittedRightsRecords.includes(e.rights.recordId)&&(e.kind==='certification'?!!e.authorityId&&policy.acceptedAuthorities.includes(e.authorityId):e.origin==='public-manufacturer'&&policy.manufacturerHosts.includes(new URL(e.sourceUrl).hostname)));
 const supports=valid.filter(e=>e.finding==='supports'),contradicts=valid.filter(e=>e.finding==='contradicts');
 if(contradicts.length)return {summary:unknown('Reviewed evidence conflicts with a gluten-free claim.',supports.length?'conflict':'contradicted'),body:null};
 if(!supports.length)return {summary:unknown('No current, reviewed certification or manufacturer claim matches this exact label.'),body:null};
 // Review ingredient and advisory conflicts across every accepted source, plus unverified catalog warnings.
 const texts=supports.map(e=>({ingredients:food.ingredients,...e.label!}));
 const reported=food.reportedLabel;
 if(reported)texts.push({ingredients:food.ingredients,frontLabelText:reported.frontLabelText??reported.labels.join(', '),allergenStatement:[reported.allergenStatement,reported.allergens.map(t=>t.replace(/^en:/,'')).join(', '),reported.advisoryStatement,reported.traces.length?'May contain '+reported.traces.join(', '):''].filter(Boolean).join('. '),allergenPanelReviewed:true});
 const triages=texts.map(t=>inspectGlutenLabel(t));
 if(triages.some(t=>t.wheatDeclaration||t.advisory||t.ingredientTerms.some(term=>term!=='oats'))||reported?.allergens.some(t=>/^en:(wheat|barley|rye|gluten)$/.test(t)))return {summary:unknown('Ingredient or allergen evidence requires review before strict gluten-free matching.','conflict'),body:null};
 const chosen=supports.find(e=>e.kind==='certification')??supports[0];
 if(!inspectGlutenLabel({ingredients:food.ingredients,...chosen.label!}).claimObserved)return {summary:unknown('A reviewed gluten-free label claim is missing.'),body:null};
 const expires=Math.min(now+3600000,...supports.map(e=>Math.min(Date.parse(e.expiresAt),Date.parse(e.observedAt)+90*86400000)));
 const body=labelProofBody.parse({version:1,fingerprint,basis:chosen.kind,issuedAt:new Date(now).toISOString(),expiresAt:new Date(expires).toISOString(),evidenceIds:supports.slice(0,20).map(e=>e.id),frontLabelText:chosen.label!.frontLabelText,allergenStatement:chosen.label!.allergenStatement});
 const summary:NonNullable<PublicFood['glutenEvidence']>={status:'verified',reason:'Exact product label reviewed against '+(chosen.kind==='certification'?'independent certification.':'a manufacturer gluten-free claim.'),frontLabelText:body.frontLabelText,allergenStatement:body.allergenStatement,sources:supports.slice(0,20).map(e=>({kind:e.kind as 'certification'|'manufacturer-label',url:e.sourceUrl,observedAt:e.observedAt,expiresAt:e.expiresAt})),proof:null};
 return {summary,body};
}
export function signLabelDecision(result:ReturnType<typeof resolveGlutenEvidence>,keyId:string,privateHex:string){
 if(!result.body)return result.summary;
 const payload=JSON.stringify(result.body),signature=bytesToHex(ed25519.sign(labelSigningBytes(keyId,payload),hexToBytes(privateHex)));
 return {...result.summary,proof:JSON.stringify({keyId,payload,signature})};
}
/** Reload operator registry/policy on each request so withdrawal is immediately reflected online. */
export function createLabelEvidenceProvider(root:string){
 const read=(file:string)=>{const p=root+'/.tools/section11/'+file;if(statSync(p).size>32000000)throw Error('Evidence exceeds limit');return JSON.parse(readFileSync(p,'utf8'));};
 return (food:PublicFood):NonNullable<PublicFood['glutenEvidence']>=>{
  try{
   const policy=labelTrustSchema.parse(read('label-trust.json')),rows=parseEvidenceRegistry(read('evidence.json'));
   const result=resolveGlutenEvidence(food,rows,policy);
   if(!result.body)return result.summary;
   const path=root+'/.tools/section11/label-signing.json';if(statSync(path).mode&0o077)throw Error('Private signing key permissions');
   const key=z.object({keyId:z.string(),privateHex:z.string().regex(/^[a-f0-9]{64}$/)}).strict().parse(read('label-signing.json'));
   return signLabelDecision(result,key.keyId,key.privateHex);
  }catch{return {status:'unverified',reason:'Reviewed label evidence is unavailable. Retry after the evidence service is restored.',frontLabelText:null,allergenStatement:null,sources:[],proof:null};}
 };
}
