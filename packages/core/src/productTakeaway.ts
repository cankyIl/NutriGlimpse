import type {PublicFood} from './publicFood.ts';
import type {ComparisonMetric} from './catalogAlternatives.ts';
import {bloodPressureLabelFacts,dailyValueBand} from './labelChecks.ts';
import {verifiedGlutenEvidence} from './productLabelEvidence.ts';
const num=(n:number)=>Number(n.toFixed(1)).toString();
/** A short label summary, never an individual treatment recommendation or a safety certification. */
export function productTakeaway(food:PublicFood,restrictions:readonly string[]=[],now=Date.now()){
 const facts=bloodPressureLabelFacts(food,now),n=food.nutrients;
 const points:string[]=[],warnings:string[]=[],positives:string[]=[];
 let metric:ComparisonMetric='saturatedFatG';
 const unverified=restrictions.some(r=>r!=='glutenFree'||!verifiedGlutenEvidence(food,now));
 if(unverified)points.push('Your dietary requirements are not verified for this product.');
 if(!facts.fresh)return {title:'Check the current label',tone:'unknown' as const,points:[...points,'The saved nutrition record needs refreshing.'].slice(0,3),metric,portion:'Current package facts needed.'};
 if(!facts.servingGrams)return {title:'Not enough information to judge',tone:'unknown' as const,points:[...points,'The serving size is missing; per-100 g facts are under Details.'].slice(0,3),metric,portion:'No portion weight reported.'};
 const scale=facts.servingGrams/100;
 if(facts.sodium?.band==='high'){warnings.push('High sodium: '+num(facts.sodium.amount)+' mg.');metric='sodiumMg';}
 else if(facts.sodium?.band==='low')positives.push('Low sodium: '+num(facts.sodium.amount)+' mg.');
 if(facts.saturatedFat?.band==='high')warnings.push('High saturated fat: '+num(facts.saturatedFat.amount)+' g.');
 else if(facts.saturatedFat?.band==='low')positives.push('Low saturated fat: '+num(facts.saturatedFat.amount)+' g.');
 if(facts.transFat!==null&&facts.transFat>0)warnings.push('Trans fat reported: '+num(facts.transFat)+' g.');
 const fiber=n.fiberG!==null&&Number.isFinite(n.fiberG)&&n.fiberG>=0&&n.fiberG<=100?n.fiberG*scale:null;
 if(fiber!==null&&dailyValueBand(fiber/28*100)==='high')positives.unshift('High fiber: '+num(fiber)+' g.');
 else if(fiber!==null&&dailyValueBand(fiber/28*100)==='low'){if(!warnings.length)metric='fiberG';warnings.push('Low fiber: '+num(fiber)+' g.');}
 const incomplete=Object.values(n).some(v=>v===null||!Number.isFinite(v)||v<0)||n.caloriesKcal!>1000||n.saturatedFatG!>100||n.fiberG!>100||n.sugarsG!>100||n.sodiumMg!>100000;
 if(incomplete)points.push('Some nutrition facts are missing or cannot be used.');
 const high=facts.sodium?.band==='high'||facts.saturatedFat?.band==='high'||(facts.transFat??0)>0;
 points.push(...warnings,...positives);
 if(!warnings.length&&!positives.length&&n.sugarsG!==null&&!incomplete)points.push('Total sugars: '+num(n.sugarsG*scale)+' g; added sugars are not reported.');
 const title=unverified?'Dietary suitability unverified':incomplete?'Not enough information to judge':high?'Consider a different option':warnings.length?'Some trade-offs to consider':positives.length>=2?'Good signs on the label':'Check how it fits your day';
 return {title,tone:unverified||incomplete?'unknown' as const:high?'caution' as const:!warnings.length&&positives.length>=2?'positive' as const:'neutral' as const,
  points:points.slice(0,3),metric,portion:'Assumes 1× listed portion ('+num(facts.servingGrams)+' g).'};
}
