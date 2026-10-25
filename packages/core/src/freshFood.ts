import type { Product } from './types.ts';
/** Quantity arithmetic on an explicitly chosen fictional raw-food reference.
 * Preparation changes cannot inherit nutrition from the raw reference. */
export function prepareFreshReference(reference:Product,preparation:'raw'|'cooked'|'unknown',grams:number):Product{
 if(reference.form!=='fresh'||!Number.isFinite(grams)||grams<=0||grams>10000)throw Error('Choose a fresh-food reference and a weight between 0 and 10000 grams.');
 const supported=preparation==='raw'&&reference.servingGrams!==null&&reference.servingGrams>0;
 const scale=supported?grams/reference.servingGrams!:0;
 const nutrients={...reference.nutrients};
 for(const key of Object.keys(nutrients) as (keyof Product['nutrients'])[]){
  const value=nutrients[key];
  nutrients[key]=supported&&value!==null&&Number.isFinite(value)?value*scale:null;
 }
 return {...reference,id:reference.id+'-'+preparation+'-'+grams,name:reference.name,
  variant:'Generic fictional reference · '+preparation+' · weight supplied by you',serving:grams+' g',servingGrams:grams,nutrients,
  ingredients:preparation==='raw'?reference.ingredients:null,fixtureRating:null,
  compliance:{vegetarian:'unverified',eggFree:'unverified',dairyFree:'unverified',halal:'unverified',kosher:'unverified',glutenFree:'unverified'}};
}
