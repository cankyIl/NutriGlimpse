import {z} from 'zod';
import {estimatedFoodSchema,estimatedRatingDecision,type EstimatedFood} from './aiFoodReview.ts';
import {GROCERY_MODELS,groceryContextSchema,groceryUrl,type GroceryModel} from './groceryReview.ts';
import {shelfGridRequestSchema,shelfProductKey} from './shelfGrid.ts';
export const SHELF_NINE_CAPACITY=9;
export const SHELF_RESPONSE_CONSENT='shelf-responses-2026-10-25.1' as const;
export const SHELF_NINE_CONSENT='shelf-nine-parallel-2026-10-25.2' as const;
export const shelfNineRequestSchema=shelfGridRequestSchema.innerType().extend({
 schemaVersion:z.literal(2),consentVersion:z.literal(SHELF_NINE_CONSENT),
 capacity:z.literal(9),columns:z.number().int().min(1).max(3),rows:z.number().int().min(1).max(3),
 cells:shelfGridRequestSchema.innerType().shape.cells.max(9),
 batchIndex:z.number().int().min(0).max(100),shareHealth:z.boolean(),context:groceryContextSchema,
 diagnosticConsentVersion:z.literal(SHELF_RESPONSE_CONSENT).optional(),
}).strict().superRefine((v,c)=>{
 const n=v.cells.length;
 if(v.columns!==Math.ceil(Math.sqrt(n))||v.rows!==Math.ceil(n/v.columns)||v.cells.some((x,i)=>x.cell!==i+1)||new Set(v.cells.map(x=>x.packageId)).size!==n)c.addIssue({code:'custom',message:'Invalid grid layout'});
 if(!v.shareHealth&&(v.context.shopper||v.context.healthConditions.length||v.context.dietaryRestrictions.length))c.addIssue({code:'custom',message:'Health sharing not enabled'});
});
export type ShelfNineRequest=z.infer<typeof shelfNineRequestSchema>;
const short=z.string().trim().min(1).max(200);
export const shelfNineProductSchema=z.object({
 cellNumbers:z.array(z.number().int().min(1).max(9)).min(1).max(9),
 sourceModel:z.enum(GROCERY_MODELS).optional(),food:estimatedFoodSchema,reasons:z.array(short).max(2),
 sourceUrls:z.array(groceryUrl).max(4),nutritionStatus:z.enum(['verified','estimated','unknown']),
}).strict();
export const shelfNineAlternativeSchema=shelfNineProductSchema.omit({cellNumbers:true}).extend({
 comparedCell:z.number().int().min(1).max(9),storeName:short.nullable(),aisle:short.nullable(),retailerUrl:groceryUrl.nullable(),
}).strict();
export const shelfNineResultSchema=z.object({
 schemaVersion:z.literal(2),sessionId:z.string(),batchId:z.string(),batchIndex:z.number().int().min(0),model:z.enum(GROCERY_MODELS),
 complete:z.boolean(),primaryComplete:z.boolean().optional(),products:z.array(shelfNineProductSchema).max(9),alternatives:z.array(shelfNineAlternativeSchema).max(3),
 unresolvedCells:z.array(z.number().int().min(1).max(9)).max(9),duplicatesRemoved:z.number().int().min(0).max(8),
 searchSuggestionsHtml:z.string().max(60000).nullable(),
}).strict();
export type ShelfNineResult=z.infer<typeof shelfNineResultSchema>;
export type ShelfNineProduct=z.infer<typeof shelfNineProductSchema>;
export type ShelfNineAlternative=z.infer<typeof shelfNineAlternativeSchema>;
export const shelfNineModel=(_index:number):GroceryModel=>'gemini-3.5-flash-lite';
export const isShelfHealthy=(food:EstimatedFood)=>food.rating==='healthy'||food.rating==='very_healthy';
export function checkedShelfFood(food:EstimatedFood):EstimatedFood{
 const rating=estimatedRatingDecision(food).rating;
 return {...food,rating:rating==='very_healthy'?'healthy':rating};
}
export function assertNineAssociation(input:ShelfNineRequest,result:ShelfNineResult){
 if(result.sessionId!==input.sessionId||result.batchId!==input.batchId||result.batchIndex!==input.batchIndex)throw Error('Shelf batch mismatch');
 const seen=new Set<number>();
 for(const row of result.products)for(const cell of row.cellNumbers){
  if(!input.cells.some(c=>c.cell===cell)||seen.has(cell))throw Error('Shelf cell mismatch');seen.add(cell);
 }
 for(const cell of result.unresolvedCells){if(!input.cells.some(c=>c.cell===cell)||seen.has(cell))throw Error('Shelf unresolved mismatch');seen.add(cell);}
 if(seen.size!==input.cells.length)throw Error('Shelf missing cell');
 if(result.duplicatesRemoved!==result.products.reduce((sum,row)=>sum+row.cellNumbers.length-1,0))throw Error('Shelf duplicate count mismatch');
 if(result.alternatives.some(a=>!result.products.some(p=>p.cellNumbers.includes(a.comparedCell))))throw Error('Shelf alternative mismatch');
}
export type ShelfNineObservation=ShelfNineProduct&{model:GroceryModel;batchId:string;packageIds:string[];photo?:string;complete:boolean};
export function mergeNineProducts(rows:ShelfNineObservation[]):ShelfNineObservation[]{
 const map=new Map<string,ShelfNineObservation>();
 for(const row of rows){
  const key=row.food.identity.status==='identified'?shelfProductKey(row.food):row.batchId+':'+row.cellNumbers.join(',');
  const previous=map.get(key);
  if(!previous){map.set(key,row);continue;}
  // Prefer a completed review, then Gemini. Never average or mix model nutrient tables.
  const replace=row.complete&&!previous.complete||row.complete===previous.complete&&row.model==='gemini-3.5-flash-lite'&&previous.model!=='gemini-3.5-flash-lite';
  const chosen=replace?row:previous;
  map.set(key,{...chosen,packageIds:[...new Set([...previous.packageIds,...row.packageIds])]});
 }
 const order={healthy:0,very_healthy:0,neutral:1,not_healthy:2};
 return [...map.values()].sort((a,b)=>(a.complete&&a.food.rating?order[a.food.rating]:3)-(b.complete&&b.food.rating?order[b.food.rating]:3));
}
