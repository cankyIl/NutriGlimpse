import {savedGuidance} from './guidanceLibrary.generated.ts';
import {currentLabelSource} from './labelChecks.ts';
import type {PublicFood} from './publicFood.ts';
export const guidanceLibrary=savedGuidance;
export type GuidanceSourceId='dash'|'diabetes'|'ckd'|'dga'|'dga-servings';
type ServingTable={sourceId:string;calorieLevels:number[];period?:string;rows:{foodGroup:string;period?:string;periods?:string[];ranges?:number[][];amounts?:number[];maximum?:number[];sourceAmounts?:string[]}[];servingExamples:Record<string,string[]|undefined>};
export function sourceServings(sourceId:'dash'|'dga-servings',calories:number){
 const table:ServingTable|undefined=savedGuidance.tables.find(t=>t.sourceId===sourceId);
 const index=table?.calorieLevels.indexOf(calories)??-1;
 if(!table||index<0)throw Error('Choose a calorie column printed in this source.');
 return table.rows.map(row=>{
  const range=row.ranges?.[index], amount=row.amounts?.[index], maximum=row.maximum?.[index];
  const quantity=row.sourceAmounts?.[index]??(maximum!==undefined?'Up to '+maximum:range?(range[0]===range[1]?String(range[0]):range.join('–')):String(amount));
  const period=row.periods?.[index]??row.period??table.period;
  if(!['day','week'].includes(period??'')||quantity==='undefined')throw Error('Incomplete source table.');
  const examples=table.servingExamples[row.foodGroup as keyof typeof table.servingExamples]??(row.foodGroup==='low-fat-or-fat-free-dairy'?table.servingExamples.dairy:[])??[];
  return {foodGroup:row.foodGroup,quantity,period,examples};
 });
}
export type PlanReference={kind:'dash-sodium';milligrams:1500|2300}|{kind:'dga-saturated-fat';dailyEnergyKcal:number};
export type ReferenceComparison={available:false;reason:string}|{available:true;amount:number;unit:'mg'|'g';referenceAmount:number;percentOfReference:number;sourceId:'dash'|'dga';grams:number;period:'day'};
/** Arithmetic against a user-selected published reference. No profile, ranking, diagnosis or remaining allowance. */
export function comparePublishedReference(food:PublicFood,grams:number,reference:PlanReference,now:number):ReferenceComparison{
 if(!Number.isFinite(grams)||grams<=0||grams>2000)return {available:false,reason:'Choose a portion between 0 and 2,000 g.'};
 if(!currentLabelSource(food,now))return {available:false,reason:'Current source dates are needed for this calculation.'};
 let value:number|null, referenceAmount:number,unit:'mg'|'g',sourceId:'dash'|'dga',maximum:number;
 if(reference.kind==='dash-sodium'){
  const options=savedGuidance.entries.find(e=>e.id==='dash-sodium')?.publishedValue?.options;
  if(!options?.includes(reference.milligrams))return {available:false,reason:'Choose a published DASH sodium reference.'};
  value=food.nutrients.sodiumMg;referenceAmount=reference.milligrams;unit='mg';sourceId='dash';maximum=100000;
 }else{
  const energy=reference.dailyEnergyKcal,percent=savedGuidance.entries.find(e=>e.id==='dga-saturated-fat')?.publishedValue?.max;
  if(!Number.isFinite(energy)||energy<1000||energy>3200||percent!==10)return {available:false,reason:'Enter a reference energy amount from 1,000 to 3,200 kcal/day; this is not a calorie recommendation.'};
  value=food.nutrients.saturatedFatG;referenceAmount=energy*(percent/100)/9;unit='g';sourceId='dga';maximum=100;
 }
 if(value===null||!Number.isFinite(value)||value<0||value>maximum)return {available:false,reason:'This source does not provide a valid amount for that nutrient.'};
 const amount=value*grams/100;
 return {available:true,amount,unit,referenceAmount,percentOfReference:amount/referenceAmount*100,sourceId,grams,period:'day'};
}
