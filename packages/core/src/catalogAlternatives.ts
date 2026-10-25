import {verifiedGlutenEvidence} from './productLabelEvidence.ts';
import {foodSourceTime,type PublicFood} from './publicFood.ts';
import {comparisonGroups} from './comparisonGroups.ts';
export {comparisonGroups} from './comparisonGroups.ts';
export type ComparisonGroup=typeof comparisonGroups[number];
export const comparisonMetrics={sodiumMg:'Sodium',saturatedFatG:'Saturated fat',sugarsG:'Total sugars',fiberG:'Fiber'} as const;
export type ComparisonMetric=keyof typeof comparisonMetrics;
export const nutrientUnits={caloriesKcal:'kcal',saturatedFatG:'g',fiberG:'g',sodiumMg:'mg',sugarsG:'g'} as const;
export function comparisonReady(food:PublicFood,now=Date.now()):boolean{
 const n=food.nutrients;
 return !!food.comparisonGroup&&['category-rules-v1','category-rules-v2','category-rules-v3','category-rules-v4'].includes(food.categoryEvidence??'')&&food.dataType==='Branded'&&!!food.barcode&&!!food.ingredients?.trim()&&
  Number.isFinite(foodSourceTime(food.sourceDate))&&now-foodSourceTime(food.sourceDate)<=3*366*86400000&&foodSourceTime(food.sourceDate)<=now+86400000&&
  now-Date.parse(food.retrievedAt)<=7*86400000&&Date.parse(food.retrievedAt)<=now+300000&&
  Object.values(n).every(v=>v!==null&&Number.isFinite(v)&&v>=0)&&
  n.caloriesKcal!<=1000&&n.saturatedFatG!<=100&&n.fiberG!<=100&&n.sugarsG!<=100&&n.sodiumMg!<=100000;
}
export function comparableAlternatives(original:PublicFood,candidates:PublicFood[],metric:ComparisonMetric,requiredRestrictions:readonly string[]=[],now=Date.now()){
 // Only a current signed exact-label review can satisfy glutenFree; other restrictions remain unsupported.
 if(requiredRestrictions.some(r=>r!=='glutenFree')||!comparisonReady(original,now))return [];
 const base=original.nutrients[metric]!;
 const seen=new Set<string>([original.barcode!]);
 const formulas=new Set<string>();
 return [...candidates].sort((a,b)=>foodSourceTime(b.sourceDate)-foodSourceTime(a.sourceDate)||Date.parse(b.retrievedAt)-Date.parse(a.retrievedAt)||b.id.localeCompare(a.id))
  .filter(food=>{
   if((requiredRestrictions.includes('glutenFree')&&!verifiedGlutenEvidence(food,now))||!comparisonReady(food,now)||food.comparisonGroup!==original.comparisonGroup||food.provider+food.id===original.provider+original.id||seen.has(food.barcode!))return false;
   seen.add(food.barcode!);
   const formulation=JSON.stringify([food.brand?.toLowerCase().trim(),food.ingredients?.toLowerCase().replace(/\s+/g,' ').trim(),food.nutrients]);
   if(formulas.has(formulation))return false;formulas.add(formulation);return true;
  }).map(food=>{
   const value=food.nutrients[metric]!;
   const improvement=metric==='fiberG'?value-base:base-value;
   const tradeoffs=(Object.keys(nutrientUnits) as (keyof typeof nutrientUnits)[]).filter(k=>k==='fiberG'?food.nutrients[k]!<original.nutrients[k]!:food.nutrients[k]!>original.nutrients[k]!);
   return {food,improvement,tradeoffs};
  }).filter(item=>item.improvement>0.000001)
  .sort((a,b)=>b.improvement-a.improvement||a.tradeoffs.length-b.tradeoffs.length||a.food.id.localeCompare(b.food.id)).slice(0,3);
}
