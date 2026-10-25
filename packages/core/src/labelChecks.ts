import {foodSourceTime,type PublicFood} from './publicFood.ts';
export type LabelReviewMode='standard'|'blood-pressure'|'gluten';
export const labelCheckPolicy={version:'2026-10-14.2',personalizedRecommendationsEnabled:false,certificationDecisionsEnabled:false} as const;
export type DailyValueBand='low'|'between'|'high';
export function dailyValueBand(percent:number):DailyValueBand|null{
 if(!Number.isFinite(percent)||percent<0)return null;
 return percent<=5?'low':percent>=20?'high':'between';
}
export function currentLabelSource(food:PublicFood,now=Date.now()){
 const retrieved=Date.parse(food.retrievedAt),source=foodSourceTime(food.sourceDate);
 return Number.isFinite(now)&&Number.isFinite(retrieved)&&Number.isFinite(source)&&retrieved<=now+300000&&now-retrieved<=7*86400000&&source<=now+86400000&&now-source<=3*366*86400000;
}
export function bloodPressureLabelFacts(food:PublicFood,now=Date.now()){
 const fresh=currentLabelSource(food,now),grams=food.servingGrams;
 const validPortion=typeof grams==='number'&&Number.isFinite(grams)&&grams>0&&grams<=2000;
 const measure=(value:number|null,dv:number,max:number)=>{
  if(!fresh||!validPortion||value===null||!Number.isFinite(value)||value<0||value>max)return null;
  const amount=value*grams/100,percent=amount/dv*100;
  return {amount,percent,band:dailyValueBand(percent)!};
 };
 return {fresh,servingGrams:validPortion?grams:null,
  sodium:measure(food.nutrients.sodiumMg,2300,100000),
  saturatedFat:measure(food.nutrients.saturatedFatG,20,100),
  potassium:measure(food.additionalNutrients?.potassiumMg??null,4700,100000),
  magnesium:measure(food.additionalNutrients?.magnesiumMg??null,420,100000),
  calcium:measure(food.additionalNutrients?.calciumMg??null,1300,100000),
  transFat:measure(food.additionalNutrients?.transFatG??null,1,100)?.amount??null,
  unavailable:([['trans fat',food.additionalNutrients?.transFatG],['potassium',food.additionalNutrients?.potassiumMg],['magnesium',food.additionalNutrients?.magnesiumMg],['calcium',food.additionalNutrients?.calciumMg]] as const).filter(([,n])=>n===null||n===undefined).map(([name])=>name),
  personalizedRecommendation:false as const};
}
export interface GlutenLabelText{
 ingredients:string|null;
 frontLabelText?:string|null;
 allergenStatement?:string|null;
}
const clean=(v:unknown)=>typeof v==='string'&&v.length<=10000?v.normalize('NFKC').replace(/[’‘]/g,"'").replace(/[‐‑–—]/g,'-').toLowerCase():null;
/** Text triage only: no absence-of-keyword, label claim or advisory can certify suitability. */
export function inspectGlutenLabel(input:GlutenLabelText){
 const ingredients=clean(input.ingredients),front=clean(input.frontLabelText),allergens=clean(input.allergenStatement);
 const mentions=(text:string|null,pattern:RegExp)=>!!text&&pattern.test(text);
 const claim=mentions(front,/\b(?:gluten[\s-]+free|certified\s+gf)\b/)&&!mentions(front,/\b(?:not|non)(?:\s+certified)?\s+(?:gluten[\s-]+free|gf)\b|\b(?:no|without)\s+(?:gluten[\s-]+free|gf)\s+certification\b/);
 // These are review terms, not automatic "contains gluten" findings. This handles processed wheat starch,
 // uncertain malt sources and negated phrases conservatively without asserting a medical conclusion.
 const ingredientTerms: string[]=[];
 for(const term of ['wheat','barley','rye','triticale','spelt','kamut','farro','durum','semolina','einkorn','emmer','malt','malted']){
  if(mentions(ingredients,new RegExp('\\b'+term+'\\b')))ingredientTerms.push(term);
 }
 for(const [term,pattern] of [['brewer’s yeast',/\bbrewer'?s?\s+yeast\b/],['bleached flour',/\bbleached\s+flour\b/],['oats',/\b(?:oats|oatmeal)\b/]] as const){
  if(mentions(ingredients,pattern))ingredientTerms.push(term);
 }
 const wheatDeclaration=mentions(allergens,/\bcontains\s*:\s*[^.;\n]*\bwheat\b/)||mentions(allergens,/\bcontains\s+wheat\b/);
 const advisory=mentions(allergens,/\b(?:may contain|facility|shared equipment|also processes)\b/)&&mentions(allergens,/\b(?:wheat|barley|rye|gluten)\b/);
 return {
  status:ingredientTerms.length?'ingredient-review':claim?'claim-unverified':'unknown',
  ingredientTerms,claimObserved:claim,wheatDeclaration,advisory,
  missing:[!ingredients?.trim()?'ingredient list':null,!front?.trim()?'front-label claim evidence':null,!allergens?.trim()?'allergen/advisory evidence':null].filter((v):v is string=>v!==null),
  suitability:'unverified' as const,eligibleForStrictGlutenFree:false as const,
 };
}
