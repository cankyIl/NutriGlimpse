import { z } from 'zod';
const text = (max:number) => z.string().min(1).max(max);
const reference = z.object({page:z.number().int().min(1).max(10),lineIds:z.array(text(80)).min(1).max(30)}).strict();
const field = <T extends z.ZodTypeAny>(value:T) => z.object({value,source:reference,uncertain:z.boolean()}).strict().nullable();
const issues = z.array(z.enum(['partial-source','illegible','ambiguous-unit','ambiguous-date','missing-label','unresolved-item'])).max(6);
const amount = z.number().finite().nonnegative().max(100000);
const nutrient = (unit:'g'|'mg'|'kcal') => field(z.object({amount,unit:z.literal(unit)}).strict());
export const productExtractionSchema = z.object({
 schemaVersion:z.literal(1), kind:z.literal('product-label'),
 name:field(text(300)), variant:field(text(300)), ingredients:field(text(10000)), allergens:field(text(2000)),
 frontLabelText:field(text(4000)).optional(),advisoryStatement:field(text(2000)).optional(),
 additionalNutrients:z.object({transFat:nutrient('g'),potassium:nutrient('mg'),magnesium:nutrient('mg'),calcium:nutrient('mg')}).strict().optional(),
 servingText:field(text(200)), servingGrams:field(z.number().finite().positive().max(100000)),
 nutritionBasis:z.enum(['per-serving','per-100g','unknown']),
 nutrients:z.object({calories:nutrient('kcal'),fiber:nutrient('g'),saturatedFat:nutrient('g'),sodium:nutrient('mg'),sugars:nutrient('g')}).strict(),
 issues,
}).strict();
const quantity=z.object({amount:z.number().finite().positive().max(10000),unit:z.enum(['item','lb','kg'])}).strict();
export const receiptExtractionSchema=z.object({
 schemaVersion:z.literal(1),kind:z.literal('receipt'),
 retailerText:field(text(200)),printedDateText:field(text(80)),
 lines:z.array(z.object({
  id:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),description:field(text(500)),
  kind:z.enum(['food','non-food','refund','discount','tax','unknown']),
  quantity:field(quantity),
 }).strict()).max(300),
 issues,
}).strict().refine(value=>new Set(value.lines.map(line=>line.id)).size===value.lines.length,'Duplicate line identifiers');
export type ExtractionSource = ReadonlyArray<{page:number;lineIds:readonly string[]}>;
function validateReferences(value:unknown, source:ExtractionSource):void {
 const pages=new Map<number,Set<string>>();
 if(!source.length||source.length>10)throw Error('Invalid extraction source.');
 for(const page of source){
  if(!Number.isInteger(page.page)||page.page<1||page.page>10||pages.has(page.page)||page.lineIds.length>2000)throw Error('Invalid extraction source.');
  const ids=new Set(page.lineIds);
  if(ids.size!==page.lineIds.length||[...ids].some(id=>!id.length||id.length>80))throw Error('Invalid extraction source.');
  pages.set(page.page,ids);
 }
 function visit(node:unknown):void{
  if(!node||typeof node!=='object')return;
  if('source' in node){
   const ref=(node as {source:z.infer<typeof reference>}).source;
   const allowed=pages.get(ref.page);
   if(!allowed||new Set(ref.lineIds).size!==ref.lineIds.length||ref.lineIds.some(id=>!allowed.has(id)))throw Error('Extraction references unavailable source text.');
  }
  for(const child of Object.values(node))visit(child);
 }
 visit(value);
}
function parse<T extends z.ZodTypeAny>(json:string,schema:T,source:ExtractionSource):z.infer<T>{
 if(json.length>180000)throw Error('Extraction response exceeds limit.');
 const result=schema.parse(JSON.parse(json));
 validateReferences(result,source);
 return result;
}
/** Structured data only. This does not redact text, establish identity, or authorize storage/disclosure. */
export function parseProductExtraction(json:string,source:ExtractionSource){
 return {status:'needs-review' as const,identityVerified:false as const,certificationVerified:false as const,
  data:parse(json,productExtractionSchema,source)};
}
export function parseReceiptExtraction(json:string,source:ExtractionSource){
 return {status:'needs-review' as const,coverageVerified:false as const,
  data:parse(json,receiptExtractionSchema,source)};
}
