import {z} from 'zod';
import {foodSchema,foodSourceTime,type PublicFood} from './publicFood.ts';
export const PRODUCT_PHOTO_CONSENT='product-photo-ai-2026-10-16.1' as const;
export const PRODUCT_PHOTO_MODEL='gpt-6-luna' as const;
export const PHOTO_MAX_BYTES=1024*1024;
export const PHOTO_MAX_BODY=1400000;
const text=z.string().trim().min(1).max(160).refine(value=>!/[\u0000-\u001f\u007f]/.test(value));
export const photoIdentitySchema=z.object({
 status:z.enum(['identified','uncertain','multiple-products','no-product']),
 brand:text.nullable(),name:text.nullable(),variant:text.nullable(),size:text.nullable(),
 visibleText:z.array(text).max(6),
}).strict().superRefine((v,ctx)=>{if(v.status==='identified'&&!v.name)ctx.addIssue({code:'custom',message:'Identified product needs a name.'});});
export type PhotoIdentity=z.infer<typeof photoIdentitySchema>;
export const productPhotoRequestSchema=z.object({consentVersion:z.literal(PRODUCT_PHOTO_CONSENT),
 imageBase64:z.string().min(8).max(4*Math.ceil(PHOTO_MAX_BYTES/3)).regex(/^[A-Za-z0-9+/]+={0,2}$/).refine(value=>value.length%4===0),
}).strict();
export const productPhotoResponseSchema=z.object({schemaVersion:z.literal(1),model:z.literal(PRODUCT_PHOTO_MODEL),
 identity:photoIdentitySchema,foods:z.array(foodSchema).max(5),
}).strict();
export type ProductPhotoResult=z.infer<typeof productPhotoResponseSchema>;
const normalize=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/['’]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const words=(s:string)=>[...new Set(normalize(s).split(' ').filter(Boolean))];
const stop=new Set('the a an and with of for co company inc llc corporation food foods brand brands size pack oz ounce ounces g gram grams lb'.split(' '));
const informative=(s:string)=>words(s).filter(w=>!stop.has(w)&&!/^\d+$/.test(w));
const brandWord=(s:string)=>s.endsWith('s')?s.slice(0,-1):s;
const packageGrams=(s:string)=>{const match=/(\d+(?:\.\d+)?)\s*(ounces?|oz|grams?|g|pounds?|lbs?)\b/i.exec(s);if(!match)return null;const unit=match[2].toLowerCase();return Number(match[1])*(unit==='g'||unit.startsWith('gram')?1:unit==='oz'||unit.startsWith('ounce')?28.3495:453.592);};
// These are distinct formulations, never inferred as interchangeable.
const variants=['chocolate','vanilla','strawberry','blueberry','raspberry','honey','cinnamon','maple','peanut','almond','unsweetened','sweetened','salted','unsalted','decaf','original','confetti','birthday','berry','apple','lemon','cocoa','fruit','multigrain','multi','protein','granola'];
/** AI provides identity evidence only. Rank public records without generating nutrition facts. */
export function matchPhotoIdentity<T extends Pick<PublicFood,'name'|'brand'|'brandOwner'|'sourceDate'|'provider'|'id'>>(raw:unknown,catalog:readonly T[]):T[]{
 const identity=photoIdentitySchema.parse(raw);
 if(!['identified','uncertain'].includes(identity.status)||!identity.name||!identity.brand||catalog.length>10000)return [];
 const brand=informative(identity.brand).map(brandWord);
 if(!brand.length)return [];
 const observed=informative([identity.name,identity.variant??''].join(' '));
 const required=informative(identity.variant??'').filter(w=>!['original','classic','regular'].includes(w));
 const identityTokens=new Set(words([identity.name,identity.variant??''].join(' ')));
 const names=observed.filter(w=>!brand.includes(brandWord(w))&&!['original','classic','regular'].includes(w));
 if(!names.length&&observed.length)names.push(...observed);
 if(!names.length)return [];
 const scored:{food:T;score:number}[]=[];
 for(const food of catalog){
  const brandTokens=informative((food.brand??'')+' '+(food.brandOwner??'')+' '+food.name).map(brandWord);
  if(!brand.every(w=>brandTokens.includes(w)))continue;
  const label=new Set(words(food.name));
  if(required.some(w=>!label.has(w)))continue;
  if(variants.some(w=>w!=='original'&&identityTokens.has(w)&&!label.has(w)))continue;
  // Do not suggest a competing visible flavor, even when most name words match.
  if(variants.some(w=>label.has(w)&&!identityTokens.has(w)&&w!=='original'))continue;
  const hits=names.filter(w=>label.has(w));
  if(hits.length/ names.length<0.8)continue;
  const extra=informative(food.name).filter(w=>!identityTokens.has(w)&&!brand.includes(brandWord(w))).length;
  const size=packageGrams(identity.size??''),listedSize=packageGrams(food.name);
  const sizeBonus=size!==null&&listedSize!==null&&Math.abs(size-listedSize)<=Math.max(1,size*0.01)?30:0;
  scored.push({food,score:sizeBonus+hits.length*10-extra+(normalize(food.name)===normalize(identity.name)?20:0)});
 }
 scored.sort((a,b)=>b.score-a.score||(foodSourceTime(b.food.sourceDate)-foodSourceTime(a.food.sourceDate)||0)||a.food.provider.localeCompare(b.food.provider)||a.food.id.localeCompare(b.food.id));
 return scored.slice(0,5).map(x=>x.food);
}
export function photoIdentityMessage(identity:PhotoIdentity,hasMatches:boolean){
 if(identity.status==='multiple-products')return 'More than one product is visible. Photograph one package at a time.';
 if(identity.status==='no-product')return 'No food package could be identified. Fill the frame with the front of one package.';
 if(identity.status==='uncertain')return identity.name?'A likely product was recognized, but matching nutrition is not available. Try the Nutrition Facts table or another photo.':'The product is unclear. Try a closer photo showing its brand and flavor.';
 return hasMatches?'Opening the closest matching food record.':'The photo was recognized, but a matching nutrition record could not be found. Search by name or scan the Nutrition Facts table.';
}
