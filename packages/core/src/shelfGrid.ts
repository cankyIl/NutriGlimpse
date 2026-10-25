import {z} from 'zod';
import {dualFoodResultSchema,type DualFoodResult} from './dualAiFoodReview.ts';
import {estimatedRatingDecision,comparisonPolicy,type EstimatedFood} from './aiFoodReview.ts';
export const SHELF_GRID_N=16;
export const SHELF_GRID_CONSENT='shelf-grid-dual-2026-10-18.1' as const;
export const SHELF_GRID_MAX_BYTES=3*1024*1024;
const id=z.string().regex(/^[a-zA-Z0-9-]{1,90}$/);
export const shelfCellSchema=z.object({cell:z.number().int().min(1).max(16),packageId:id,revision:z.number().int().min(1).max(100)}).strict();
export const shelfGridRequestSchema=z.object({
 schemaVersion:z.literal(1),consentVersion:z.literal(SHELF_GRID_CONSENT),sessionId:id,batchId:id,
 capacity:z.number().int().min(1).max(16),columns:z.number().int().min(1).max(4),rows:z.number().int().min(1).max(4),
 width:z.number().int().min(128).max(2048),height:z.number().int().min(128).max(2048),
 imageBase64:z.string().min(16).max(Math.ceil(SHELF_GRID_MAX_BYTES/3)*4).regex(/^[A-Za-z0-9+/]+={0,2}$/),
 cells:z.array(shelfCellSchema).min(1).max(16),
}).strict().superRefine((v,c)=>{
 if(v.cells.length>v.capacity||v.cells.length>v.columns*v.rows||v.columns!==Math.ceil(Math.sqrt(Math.min(v.capacity,v.cells.length)))||v.rows!==Math.ceil(v.cells.length/v.columns))c.addIssue({code:'custom',message:'Invalid grid layout'});
 if(new Set(v.cells.map(x=>x.packageId)).size!==v.cells.length||v.cells.some((x,i)=>x.cell!==i+1))c.addIssue({code:'custom',message:'Invalid cell manifest'});
});
export type ShelfGridRequest=z.infer<typeof shelfGridRequestSchema>;
export const shelfGridCellResultSchema=shelfCellSchema.extend({review:dualFoodResultSchema.nullable(),needsAlternatives:z.boolean(),issue:z.enum(['none','unreadable','invalid','identity-conflict'])}).strict();
export const shelfGridResultSchema=z.object({schemaVersion:z.literal(1),sessionId:id,batchId:id,cells:z.array(shelfGridCellResultSchema).min(1).max(16)}).strict();
export type ShelfGridResult=z.infer<typeof shelfGridResultSchema>;
export type ShelfGridCellResult=z.infer<typeof shelfGridCellResultSchema>;
export function assertShelfAssociation(input:Pick<ShelfGridRequest,'sessionId'|'batchId'|'cells'>,result:ShelfGridResult){
 if(result.sessionId!==input.sessionId||result.batchId!==input.batchId||result.cells.length!==input.cells.length)throw Error('Shelf batch mismatch');
 const seen=new Set<number>();
 for(const row of result.cells){const cell=input.cells.find(c=>c.cell===row.cell);if(!cell||seen.has(row.cell)||cell.packageId!==row.packageId||cell.revision!==row.revision)throw Error('Shelf cell mismatch');seen.add(row.cell);}
}
const text=(s:string|null)=>String(s??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
// Preserve formulation and size; conservative duplicates may remain instead of losing a variant.
export function shelfProductKey(food:EstimatedFood){return [food.identity.brand,food.identity.name,food.identity.variant,food.identity.size].map(text).join('|');}
export type ShelfProduct={packageId:string;review:DualFoodResult;needsAlternatives:boolean;photo?:string};
export function mergeShelfProducts(existing:ShelfProduct[],incoming:ShelfProduct[]):ShelfProduct[]{
 const map=new Map(existing.map(row=>[row.packageId,row]));
 for(const row of incoming)map.set(row.packageId,row);
 const identities=new Map<string,ShelfProduct>();
 for(const row of map.values()){
  const f=row.review.original;if(!f)continue;
  const key=f.identity.status==='identified'?shelfProductKey(f):row.packageId;
  const old=identities.get(key);
  if(!old){identities.set(key,row);continue;}
  // Repeated observations cannot upgrade missing/conflicting facts to a healthy verdict.
  const differ=JSON.stringify(old.review.original?.nutrition)!==JSON.stringify(f.nutrition)||old.review.original?.servingGrams!==f.servingGrams;
  if(differ)identities.set(key,{...old,needsAlternatives:old.needsAlternatives||row.needsAlternatives,review:{...old.review,estimatesDiffer:true,original:{...old.review.original!,rating:null}}});
 }
 return [...identities.values()];
}
export function shelfLeadingProducts(products:ShelfProduct[],restricted=false,priorities:{key:keyof EstimatedFood['nutrition'];direction:'lower'|'higher'}[]=[]):ShelfProduct[]{
 if(restricted)return [];
 const groups=new Map<string,ShelfProduct[]>();
 for(const row of products){
  const f=row.review.original;if(!f||!f.rating||row.review.reviewState==='checking'||row.review.reviewState==='identity-conflict'||row.review.estimatesDiffer||estimatedRatingDecision(f).rating===null)continue;
  const policy=comparisonPolicy(f.category);
  const key=policy.id==='general_v1'?text(f.category):policy.id;
  groups.set(key,[...(groups.get(key)??[]),row]);
 }
 const output:ShelfProduct[]=[];
 for(const rows of groups.values()){
  const focus=comparisonPolicy(rows[0].review.original!.category).focus;
  const keys=[...new Set([...priorities.map(p=>p.key),'transFatG' as const,...focus,'sodiumMg' as const,'saturatedFatG' as const,'fiberG' as const,'proteinG' as const])];
  const higher=(key:keyof EstimatedFood['nutrition'])=>key==='fiberG'||key==='proteinG';
  const value=(row:ShelfProduct,key:keyof EstimatedFood['nutrition'])=>row.review.original!.nutrition[key]!/row.review.original!.servingGrams!;
  const dominates=(a:ShelfProduct,b:ShelfProduct)=>keys.every(k=>higher(k)?value(a,k)>=value(b,k):value(a,k)<=value(b,k))&&keys.some(k=>value(a,k)!==value(b,k));
  // Preserve trade-offs. There may be several leading choices, never a forced universal winner.
  const leading=rows.filter(b=>!rows.some(a=>a!==b&&dominates(a,b)));
  leading.sort((a,b)=>{for(const k of keys){const d=(value(a,k)-value(b,k))*(higher(k)?-1:1);if(Math.abs(d)>1e-9)return d;}return a.packageId.localeCompare(b.packageId);});
  output.push(...leading);
 }
 return output;
}
