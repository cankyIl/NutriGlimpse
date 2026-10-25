import {z} from 'zod';
import {foodSchema,type PublicFood} from '../../../packages/core/src/publicFood.ts';
import {comparisonReady,comparableAlternatives,comparisonMetrics} from '../../../packages/core/src/catalogAlternatives.ts';
import {normalizeBarcode} from '../../../packages/core/src/barcode.ts';
import {retailers,publicUrl,resolveProductEvidence,type ProductEvidence} from './sourceEvidence.ts';
export const basketCategories=['cereal-oats','bread-tortillas','dairy','pasta-rice','sauces-condiments','beans-canned-food','nuts-spreads','snacks','produce-frozen-vegetables','protein-eggs'] as const;
export const basketSchema=z.array(z.object({retailer:z.enum(retailers),category:z.enum(basketCategories),slot:z.number().int().min(1).max(100),barcode:z.string().refine(v=>!!normalizeBarcode(v)).nullable(),productName:z.string().max(500).nullable(),branchId:z.string().min(1).max(120).nullable(),observedAt:z.string().datetime().nullable(),sourceUrl:publicUrl.nullable()}).strict()).max(2000);
export const acceptancePolicySchema=z.object({approvedBy:z.string().min(1),approvedAt:z.string().datetime(),identification:z.number().min(0).max(1),retailerEvidence:z.number().min(0).max(1),alternatives:z.number().min(0).max(1)}).strict();
export function evaluateCoverage(input:unknown,catalog:PublicFood[],evidence:ProductEvidence[],policyInput:unknown=null,now=Date.now(),permittedRightsRecords:readonly string[]=[]){
 const basket=basketSchema.parse(input),policy=policyInput===null?null:acceptancePolicySchema.parse(policyInput);
 if(policy&&Date.parse(policy.approvedAt)>now)throw Error('Future approval');
 if(new Set(basket.map(r=>`${r.retailer}:${r.category}:${r.slot}`)).size!==basket.length)throw Error('Duplicate basket slot');
 catalog=catalog.map(f=>foodSchema.parse(f));
 return retailers.map(retailer=>{
  const slots=basket.filter(r=>r.retailer===retailer);const seen=new Set<string>();
  const observations=slots.filter(r=>{
   if(!r.barcode||!r.branchId||!r.observedAt||!r.sourceUrl||!r.productName?.trim()||Date.parse(r.observedAt)>now||now-Date.parse(r.observedAt)>30*86400000)return false;
   const key=normalizeBarcode(r.barcode)!;if(seen.has(key))return false;seen.add(key);return true;
  });
  const details=observations.map(row=>{
   const barcode=normalizeBarcode(row.barcode!)!,foods=catalog.filter(f=>f.barcode===barcode);
   const identified=foods.length>0;
   const listed=resolveProductEvidence(evidence,{barcode,market:'US',kind:'retailer-listing',claim:'listed',retailer,branchId:row.branchId!},[],now,permittedRightsRecords).status==='supported';
   const alternatives=foods.some(food=>comparisonReady(food,now)&&Object.keys(comparisonMetrics).some(metric=>comparableAlternatives(food,catalog,metric as keyof typeof comparisonMetrics,[],now).length>0));
   return {category:row.category,barcode,identified,retailerEvidence:listed,eligibleAlternatives:alternatives};
  });
  const n=observations.length,categoryCount=new Set(observations.map(r=>r.category)).size;
  const counts={identified:details.filter(r=>r.identified).length,retailerEvidence:details.filter(r=>r.retailerEvidence).length,eligibleAlternatives:details.filter(r=>r.eligibleAlternatives).length};
  const rates={identification:n?counts.identified/n:null,retailerEvidence:n?counts.retailerEvidence/n:null,alternatives:n?counts.eligibleAlternatives/n:null};
  const sampleComplete=n>=50&&categoryCount>=10;
  const accepted=sampleComplete&&!!policy&&rates.identification!>=policy.identification&&rates.retailerEvidence!>=policy.retailerEvidence&&rates.alternatives!>=policy.alternatives;
  return {retailer,plannedSlots:slots.length,observedUniqueProducts:n,observedCategories:categoryCount,sampleComplete,thresholdsApproved:!!policy,accepted,counts,rates,details,stockVerified:false};
 });
}
