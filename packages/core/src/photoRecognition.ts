import {ocrPagesSchema,type OcrPage} from './inputPrivacy.ts';
import {resolveShelfIdentity} from './shelfIdentity.ts';
import {foodSchema,type PublicFood} from './publicFood.ts';
import type {ShelfIdentityResolution} from './shelfTypes.ts';
const words=(text:string)=>text.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g,'').split(/[^a-z0-9]+/).filter(word=>word.length>=3);
const ignore=new Set('the and with for from food foods nutrition facts ingredients calories total serving servings sugar sugars sodium saturated fat protein fiber gram grams ounce ounces gluten free organic natural'.split(' '));
/** Photo OCR and ranking stay on device. Text matches always require package confirmation. */
export function recognizeProductPhoto(input:unknown,catalog:readonly PublicFood[]):ShelfIdentityResolution {
 const pages=ocrPagesSchema.parse(input);
 if(pages.length!==1||catalog.length>10000)throw Error('Use one product photo and a bounded catalog.');
 const page=pages[0];
 const lines=page.lines.filter(line=>(line.confidence??0)>=0.5&&line.text.trim()).sort((a,b)=>b.height*(b.confidence??0)-a.height*(a.confidence??0)||a.y-b.y);
 const text:{value:string;confidence:number}[]=[];let remaining=240;
 for(const line of lines){
  if(text.length>=12||remaining<3)break;
  const value=line.text.trim().slice(0,remaining);text.push({value,confidence:line.confidence??0});remaining-=value.length;
 }
 const observed=new Set(words(text.map(line=>line.value).join(' ')).filter(word=>!ignore.has(word)));
 const pool=catalog.map(food=>({food,score:[...new Set(words(food.name+' '+(food.brand??'')))].filter(word=>observed.has(word)).length}))
  .filter(item=>item.score>0).sort((a,b)=>b.score-a.score||(a.food.provider+':'+a.food.id).localeCompare(b.food.provider+':'+b.food.id)).slice(0,500).map(item=>item.food);
 const result=resolveShelfIdentity({observationId:'single-photo',text,barcodes:[]},pool);
 return {...result,reason:result.options.length?'Check the brand, product and flavor against your package before continuing.':'Could not identify this package from the visible text. Try a closer photo of the front, or search by name.'};
}
/** Narrow public snapshot: never accepts user records, OCR, images, or a claimed certification override. */
export function parseRecognitionCatalog(input:unknown):PublicFood[]{
 if(!input||typeof input!=='object'||!Array.isArray((input as {foods?:unknown}).foods))throw Error('Catalog unavailable');
 const foods=(input as {foods:unknown[]}).foods;
 if(!foods.length||foods.length>10000)throw Error('Catalog size limit');
 return foods.map(food=>foodSchema.parse(food));
}
/** Single-use, expiring, memory-only transfer to the existing nutrient review screen. */
export class PhotoReviewTransfer {
 private pending:{token:string;expires:number;pages:OcrPage[]}|null=null;
 put(token:string,pages:unknown,now=Date.now()){
  if(!/^[a-zA-Z0-9-]{1,80}$/.test(token))throw Error('Invalid transfer');
  const parsed=ocrPagesSchema.parse(pages);if(parsed.length!==1)throw Error('One photo only');
  this.pending={token,expires:now+30000,pages:structuredClone(parsed)};
 }
 take(token:string,now=Date.now()):OcrPage[]|null{
  const pending=this.pending;this.pending=null;
  return pending&&pending.token===token&&pending.expires>now?pending.pages:null;
 }
 clear(){this.pending=null;}
}

export type ProductPhotoOutcome =
 | {ok:true;result:ShelfIdentityResolution}
 | {ok:false;code:'P1'|'P2'|'P3';message:string};
/** Only fixed stage codes escape: never raw OCR, schema issues or exception text. */
export function processProductPhoto(input:unknown,loadCatalog:()=>readonly PublicFood[]):ProductPhotoOutcome {
 let pages:OcrPage[];
 try {pages=ocrPagesSchema.parse(input);if(pages.length!==1)throw Error();}
 catch{return {ok:false,code:'P1',message:'The photo was received, but its text could not be processed. Please retake it. (P1)'};}
 let catalog:readonly PublicFood[];
 try {catalog=loadCatalog();if(!catalog.length||catalog.length>10000)throw Error();}
 catch{return {ok:false,code:'P2',message:'The included product catalog could not be opened. Please reopen the app. (P2)'};}
 try{return {ok:true,result:recognizeProductPhoto(pages,catalog)};}
 catch{return {ok:false,code:'P3',message:'The photo was read, but product matching failed. Please try again or search by name. (P3)'};}
}
