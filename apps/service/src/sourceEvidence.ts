import {z} from 'zod';
import {normalizeBarcode} from '../../../packages/core/src/barcode.ts';
export const retailers=['wegmans','walmart','price-chopper','whole-foods','target','shaws','trader-joes'] as const;
export const publicUrl=z.string().url().max(1500).refine(value=>{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&!u.search&&u.hostname.includes('.')&&!/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname);},'Public HTTPS reference without credentials or query required');
const token=z.string().trim().min(1).max(120), date=z.string().datetime();
export const productEvidenceSchema=z.object({
 id:token,barcode:z.string().length(14).refine(v=>normalizeBarcode(v)===v),market:z.literal('US'),
 kind:z.enum(['manufacturer-label','retailer-listing','branch-stock','certification','fodmap-measurement']),
 origin:z.enum(['public-manufacturer','public-retailer','certification-authority','licensed-dataset']),
 sourceUrl:publicUrl,observedAt:date,expiresAt:date,sourceVersion:token,
 rights:z.object({status:z.enum(['pending','permitted','restricted']),recordId:token.nullable()}).strict(),
 review:z.object({status:z.enum(['draft','approved','withdrawn']),reviewer:token.nullable(),reviewedAt:date.nullable()}).strict(),
 retailer:z.enum(retailers).nullable(),branchId:token.nullable(),
 claim:z.enum(['label-current','listed','in-stock','out-of-stock','halal','kosher','gluten-free','measured-low-fodmap']),
 productFingerprint:z.string().regex(/^[a-f0-9]{64}$/).optional(),
 label:z.object({frontLabelText:z.string().max(4000),allergenStatement:z.string().max(4000),allergenPanelReviewed:z.literal(true)}).strict().optional(),
 authorityId:token.nullable(),finding:z.enum(['supports','contradicts']),portionGrams:z.number().finite().positive().max(2000).nullable(),
}).strict().superRefine((e,ctx)=>{
 const bad=(message:string)=>ctx.addIssue({code:'custom',message});
 const claims={'manufacturer-label':['label-current','gluten-free'],'retailer-listing':['listed'],'branch-stock':['in-stock','out-of-stock'],'certification':['halal','kosher','gluten-free'],'fodmap-measurement':['measured-low-fodmap']};
 if(!claims[e.kind].includes(e.claim))bad('Claim does not match evidence kind');
 const retailerKind=['retailer-listing','branch-stock'].includes(e.kind);
 if(retailerKind!==!!e.retailer)bad('Retailer scope required only for retailer evidence');
 if(e.kind==='branch-stock'&&!e.branchId)bad('Stock requires an exact branch');
 if(!retailerKind&&e.branchId)bad('Unexpected branch scope');
 if(['certification','fodmap-measurement'].includes(e.kind)&&!e.authorityId)bad('Authority required');
 if(e.kind==='fodmap-measurement'&&!e.portionGrams)bad('Measured FODMAP evidence requires tested portion');
 if(retailerKind&&!['public-retailer','licensed-dataset'].includes(e.origin))bad('Retailer evidence needs an authorized retailer source');
 if(e.kind==='manufacturer-label'&&e.origin!=='public-manufacturer')bad('Label evidence requires a public manufacturer source');
 if(e.kind==='certification'&&e.origin!=='certification-authority')bad('Certification requires authority evidence');
 if(e.rights.status==='permitted'&&!e.rights.recordId)bad('Permitted rights need documented record');
 if(e.review.status==='approved'&&(!e.review.reviewer||!e.review.reviewedAt))bad('Approval needs reviewer and date');
 const duration=Date.parse(e.expiresAt)-Date.parse(e.observedAt);
 const maximum=e.kind==='branch-stock'?86400000:e.kind==='retailer-listing'?7*86400000:366*86400000;
 if(duration<=0||duration>maximum)bad('Evidence expiry exceeds conservative scope limit');
});
export type ProductEvidence=z.infer<typeof productEvidenceSchema>;
export function parseEvidenceRegistry(input:unknown):ProductEvidence[]{
 const rows=z.array(productEvidenceSchema).max(20000).parse(input);
 if(new Set(rows.map(e=>e.id)).size!==rows.length)throw Error('Duplicate evidence ID');return rows;
}
export interface EvidenceQuery {barcode:string;market:'US';kind:ProductEvidence['kind'];retailer?:typeof retailers[number];branchId?:string;claim:ProductEvidence['claim'];portionGrams?:number}
/** Operator audit only. Does not activate phone compatibility or replace signed clinical rules. */
export function resolveProductEvidence(rows:ProductEvidence[],q:EvidenceQuery,acceptedAuthorities:readonly string[]=[],now=Date.now(),permittedRightsRecords:readonly string[]=[]){
 if((q.kind==='branch-stock'&&(!q.branchId||!q.retailer))||(q.kind==='retailer-listing'&&!q.retailer))return {status:'unknown',evidenceIds:[]} as const;
 const matches=rows.filter(e=>e.barcode===q.barcode&&e.market===q.market&&e.kind===q.kind&&(e.claim===q.claim||q.kind==='branch-stock')&&
  (!q.retailer||e.retailer===q.retailer)&&(!e.branchId||e.branchId===q.branchId)&&
  (e.kind!=='fodmap-measurement'||e.portionGrams===q.portionGrams));
 const valid=matches.filter(e=>e.rights.status==='permitted'&&e.rights.recordId&&permittedRightsRecords.includes(e.rights.recordId)&&e.review.status==='approved'&&e.review.reviewer&&e.review.reviewedAt&&Date.parse(e.review.reviewedAt)<=now&&Date.parse(e.review.reviewedAt)>=Date.parse(e.observedAt)&&Date.parse(e.observedAt)<=now&&Date.parse(e.expiresAt)>now&&(!e.authorityId||acceptedAuthorities.includes(e.authorityId)));
 const values=new Set(valid.map(e=>e.claim===q.claim?e.finding:e.finding==='supports'?'contradicts':'supports'));
 return {status:values.size>1?'conflict':values.has('contradicts')?'contradicted':values.has('supports')?'supported':matches.length?'unverified':'unknown',evidenceIds:valid.map(e=>e.id)} as const;
}
