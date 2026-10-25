import {z} from 'zod';
import {ocrPagesSchema,type OcrPage} from './inputPrivacy.ts';
import {productExtractionSchema,receiptExtractionSchema} from './foodExtraction.ts';
import {foodSchema,type PublicFood} from './publicFood.ts';
import {retailerFromName,retailerSites} from './retailerLinks.ts';
const kinds=['food','non-food','refund','discount','tax','unknown'] as const;
export type ProductLabelDraft=z.infer<typeof productExtractionSchema>;
export type ReceiptDraft=z.infer<typeof receiptExtractionSchema>;
const product=productExtractionSchema,receipt=receiptExtractionSchema;
export const localFoodReviewSchema=z.object({
 id:z.string().uuid(),kind:z.literal('local-food-review'),createdAt:z.string().datetime(),updatedAt:z.string().datetime(),
 synthetic:z.boolean(),sourcePages:z.number().int().min(1).max(10),
 draft:z.union([product,receipt]),confirmed:z.literal(true),correctedFields:z.array(z.string().max(100)).max(1000),
 matches:z.array(z.object({lineId:z.string().max(80),food:foodSchema,confirmedAt:z.string().datetime()}).strict()).max(100),
}).strict().superRefine((record,ctx)=>{
 if(new Set(record.matches.map(m=>m.lineId)).size!==record.matches.length)ctx.addIssue({code:'custom',message:'Duplicate confirmed match'});
 if(record.draft.kind==='receipt'&&record.draft.printedDateText&&date(record.draft.printedDateText.value)!==record.draft.printedDateText.value)ctx.addIssue({code:'custom',message:'Use the reviewed printed date as YYYY-MM-DD or leave it unknown'});
 const allowed=new Set(record.draft.kind==='receipt'?record.draft.lines.filter(l=>l.kind==='food').map(l=>l.id):['product']);
 if(record.matches.some(m=>!allowed.has(m.lineId)))ctx.addIssue({code:'custom',message:'Match does not belong to a food line'});
});
export type LocalFoodReview=z.infer<typeof localFoodReviewSchema>;
const sensitive=/\b(?:visa|mastercard|amex|discover|debit|credit|cashier|loyalty|member(?:ship)?|account|authorization|auth code|customer|email|phone|telephone|ssn|patient|transaction|rewards|order number|address)\b|@|\b\d{3}[- .]\d{2}[- .]\d{4}\b|\b(?:\d[ -]?){10,}\b/i;
const safe=(text:string)=>text.length<=2000&&!sensitive.test(text);
const field=<T>(value:T,page:number,ids:string[],uncertain=false)=>({value,source:{page,lineIds:ids},uncertain});
function rows(input:unknown){return ocrPagesSchema.parse(input).flatMap(page=>page.lines.map(line=>({...line,page:page.page}))).sort((a,b)=>a.page-b.page||a.y-b.y||a.x-b.x);}
type Row=ReturnType<typeof rows>[number];
const norm=(s:string)=>s.normalize('NFKC').replace(/[‐‑–—]/g,'-').replace(/\s+/g,' ').trim();
function valueRow(row:Row){return norm(row.text);}
export function readLocalProduct(input:unknown):ProductLabelDraft{
 const lines=rows(input),issues=new Set<ProductLabelDraft['issues'][number]>();
 const out:ProductLabelDraft={schemaVersion:1,kind:'product-label',name:null,variant:null,ingredients:null,allergens:null,frontLabelText:null,advisoryStatement:null,servingText:null,servingGrams:null,nutritionBasis:'unknown',nutrients:{calories:null,fiber:null,saturatedFat:null,sodium:null,sugars:null},additionalNutrients:{transFat:null,potassium:null,magnesium:null,calcium:null},issues:[]};
 const seen=new Map<string,string>();const conflicting=new Set<string>();
 function set(key:string,value:unknown,line:Row){
  const serialized=JSON.stringify(value);
  if(seen.has(key)&&seen.get(key)!==serialized){conflicting.add(key);issues.add('partial-source');}
  else if(!seen.has(key)){seen.set(key,serialized);const f=field(value,line.page,[line.id]);if(key in out.nutrients)(out.nutrients as Record<string,unknown>)[key]=f;else if(key in out.additionalNutrients!)(out.additionalNutrients as Record<string,unknown>)[key]=f;else (out as unknown as Record<string,unknown>)[key]=f;}
 }
 const patterns:[string,RegExp,'g'|'mg'|'kcal'][]=[
  ['calories',/^calories\s*:?\s*(\d+(?:\.\d+)?)\s*(?:kcal)?$/i,'kcal'],
  ['fiber',/^(?:dietary |total )?fiber\s*:?\s*(\d+(?:\.\d+)?)\s*g(?:\s+\d+%)?$/i,'g'],
  ['saturatedFat',/^sat(?:urated)?\.?\s*fat\s*:?\s*(\d+(?:\.\d+)?)\s*g(?:\s+\d+%)?$/i,'g'],
  ['sodium',/^sodium\s*:?\s*(\d+(?:\.\d+)?)\s*mg(?:\s+\d+%)?$/i,'mg'],
  ['sugars',/^(?:total )?sugars\s*:?\s*(\d+(?:\.\d+)?)\s*g(?:\s+\d+%)?$/i,'g'],
  ['transFat',/^trans\s*fat\s*:?\s*(\d+(?:\.\d+)?)\s*g$/i,'g'],
  ['potassium',/^potassium\s*:?\s*(\d+(?:\.\d+)?)\s*mg(?:\s+\d+%)?$/i,'mg'],
  ['magnesium',/^magnesium\s*:?\s*(\d+(?:\.\d+)?)\s*mg(?:\s+\d+%)?$/i,'mg'],
  ['calcium',/^calcium\s*:?\s*(\d+(?:\.\d+)?)\s*mg(?:\s+\d+%)?$/i,'mg'],
 ];
 let per100=false,perServing=false;
 for(const line of lines){
  const text=valueRow(line);if(!safe(text))continue;
  if((line.confidence??0)<.8){issues.add('illegible');continue;}
  if(/^per 100\s*g$/i.test(text))per100=true;
  if(/^(?:amount|nutrition|nutrients) per serving$/i.test(text))perServing=true;
  const serving=/^serving size\s*:?\s*(.{1,180})$/i.exec(text);
  if(serving){
   set('servingText',serving[1],line);perServing=true;
   const grams=/(?:^|\()(\d+(?:\.\d+)?)\s*g\)?$/i.exec(serving[1]);
   if(grams&&Number(grams[1])>0&&Number(grams[1])<=2000)set('servingGrams',Number(grams[1]),line);
  }
  for(const [key,pattern,unit] of patterns){const m=pattern.exec(text);if(m&&Number(m[1])<=100000)set(key,{amount:Number(m[1]),unit},line);}
  for(const [key,pattern] of [['name',/^(?:product|product name)\s*:\s*(.{1,300})$/i],['variant',/^variant\s*:\s*(.{1,300})$/i],['ingredients',/^ingredients\s*:\s*(.{1,1900})$/i],['allergens',/^contains\s*:\s*(.{1,1900})$/i],['advisoryStatement',/^(may contain .{1,1900}|manufactured in .{1,1900}|made in a facility .{1,1900})$/i]] as const){
   const m=pattern.exec(text);if(m)set(key,m[1],line);
  }
  if(/^(?:certified )?gluten[- ]free$/i.test(text))set('frontLabelText',text,line);
 }
 for(const key of conflicting){if(key in out.nutrients)(out.nutrients as Record<string,unknown>)[key]=null;else if(key in out.additionalNutrients!)(out.additionalNutrients as Record<string,unknown>)[key]=null;else(out as unknown as Record<string,unknown>)[key]=null;}
 out.nutritionBasis=per100&&perServing?'unknown':per100?'per-100g':perServing?'per-serving':'unknown';
 if(out.nutritionBasis==='unknown')issues.add('ambiguous-unit');
 if(!out.name||!out.ingredients||Object.values(out.nutrients).some(v=>!v))issues.add('missing-label');
 out.issues=[...issues];return product.parse(out);
}
function date(raw:string):string|null{
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(raw),us=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(raw);
 if(!m&&!us)return null;
 const value=m?raw:us![3]+'-'+us![1].padStart(2,'0')+'-'+us![2].padStart(2,'0');
 const parsed=new Date(value+'T00:00:00Z');return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value?value:null;
}
export function readLocalReceipt(input:unknown):ReceiptDraft{
 const lines=rows(input),out:ReceiptDraft={schemaVersion:1,kind:'receipt',retailerText:null,printedDateText:null,lines:[],issues:['partial-source']};
 const retailers=new Set<string>(),dates=new Set<string>();
 for(const line of lines){
  const text=valueRow(line);if(!safe(text))continue;
  if((line.confidence??0)<.8){if(!out.issues.includes('illegible'))out.issues.push('illegible');continue;}
  const retailer=retailerFromName(text);
  if(retailer&&text.length<100&&!/\d+\.\d{2}/.test(text)){retailers.add(retailer);out.retailerText=field(retailerSites.find(r=>r.id===retailer)!.name,line.page,[line.id]);continue;}
  const d=/^(?:date\s*:\s*)?(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)?$/i.exec(text);
  if(d){const v=date(d[1]);if(v){dates.add(v);out.printedDateText=field(v,line.page,[line.id]);}else dates.add('invalid');continue;}
  if(/^(?:sub\s*total|total|balance|cash|change|payment|amount due|you saved|savings|tender)\b/i.test(text))continue;
  // Only receipt-style priced rows become compact item drafts. Payment/identifier text is excluded first.
  const m=/^(.*?)\s+(-?\$?\d{1,6}\.\d{2})(?:\s+[A-Z*])?$/.exec(text);
  if(!m||!m[1].trim()||out.lines.length>=300)continue;
  let description=m[1].trim(),quantity=1,unit:'item'|'lb'|'kg'='item';
  const prefix=/^(\d+(?:\.\d+)?)\s*[xX@]\s+(.+)$/.exec(description),weight=/^(.+?)\s+(\d+(?:\.\d+)?)\s*(lb|kg)$/i.exec(description);
  if(prefix){quantity=Number(prefix[1]);description=prefix[2];}
  if(weight){description=weight[1];quantity=Number(weight[2]);unit=weight[3].toLowerCase() as 'lb'|'kg';}
  if(!Number.isFinite(quantity)||quantity<=0||quantity>10000||description.length>500)continue;
  const kind=/^(?:coupon|discount)\b/i.test(description)?'discount':/(?:^-|refund|return)/i.test(m[2]+' '+description)?'refund':/^(?:sales )?tax\b/i.test(description)?'tax':/\b(?:paper towels|toilet paper|soap|detergent|shampoo|battery|batteries)\b/i.test(description)?'non-food':'unknown';
  out.lines.push({id:'p'+line.page+'-'+out.lines.length,description:field(description,line.page,[line.id]),kind,quantity:field({amount:quantity,unit},line.page,[line.id])});
 }
 if(retailers.size!==1)out.retailerText=null;
 if(dates.size!==1||dates.has('invalid')){out.printedDateText=null;if(dates.size)out.issues.push('ambiguous-date');}
 if(out.lines.some(l=>l.kind==='unknown'))out.issues.push('unresolved-item');
 return receipt.parse(out);
}
export function labelCatalogDifferences(label:ProductLabelDraft,food:PublicFood){
 const grams=label.nutritionBasis==='per-100g'?100:label.nutritionBasis==='per-serving'?label.servingGrams?.value:null;
 if(!grams||grams<=0||grams>2000)return {comparable:false as const,differences:[]};
 const mapping={calories:'caloriesKcal',fiber:'fiberG',saturatedFat:'saturatedFatG',sodium:'sodiumMg',sugars:'sugarsG'} as const;
 const differences=Object.entries(mapping).flatMap(([key,target])=>{
  const a=label.nutrients[key as keyof typeof mapping],b=food.nutrients[target];
  if(!a||b===null)return [];
  const observed=a.value.amount*100/grams;
  // Flag any material discrepancy; do not blend, choose a winner or infer clinical importance.
  return Math.abs(observed-b)>Math.max(.1,Math.abs(b)*.02)?[{nutrient:key,observed,catalog:b,unit:a.value.unit}]:[];
 });
 return {comparable:true as const,differences};
}
export function localReceiptSummary(draft:ReceiptDraft,matches:LocalFoodReview['matches']){
 const food=draft.lines.filter(l=>l.kind==='food');
 const confirmed=new Set(matches.map(m=>m.lineId));
 const matched=food.filter(l=>confirmed.has(l.id)).length,unknown=draft.lines.filter(l=>l.kind==='unknown').length;
 return {food:food.length,matched,unresolved:food.length-matched+unknown,excluded:draft.lines.length-food.length-unknown,partial:true as const};
}
export {kinds as localReceiptKinds};
