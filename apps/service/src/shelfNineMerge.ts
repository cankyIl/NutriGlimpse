import {checkedShelfFood,isShelfHealthy,type ShelfNineProduct,type ShelfNineAlternative,type ShelfNineResult} from '../../../packages/core/src/shelfNine.ts';
import {shelfProductKey} from '../../../packages/core/src/shelfGrid.ts';
import {estimatedBenefitsDecision,estimatedRatingDecision} from '../../../packages/core/src/aiFoodReview.ts';
const same=(a:ShelfNineProduct,b:ShelfNineProduct)=>a.food.identity.status==='identified'&&b.food.identity.status==='identified'&&shelfProductKey(a.food)===shelfProductKey(b.food);
function fillProduct(primary:ShelfNineProduct,donor:ShelfNineProduct):ShelfNineProduct{
 if(!same(primary,donor)||!primary.food.servingGrams||primary.food.servingGrams!==donor.food.servingGrams)return primary;
 const nutrition={...primary.food.nutrition};let changed=false;
 for(const key of Object.keys(nutrition) as (keyof typeof nutrition)[])if(nutrition[key]===null&&donor.food.nutrition[key]!==null){nutrition[key]=donor.food.nutrition[key];changed=true;}
 if(!changed)return primary;
 const candidate={...primary.food,nutrition},check=estimatedRatingDecision(candidate);
 // Reject an incoherent combined table; never overwrite a supplied Gemini nutrient.
 if(check.reasons.some(r=>/inconsistent|exceeds|non_finite/.test(r)))return primary;
 return {...primary,food:{...candidate,rating:primary.food.rating??checkedShelfFood(candidate).rating},
  sourceUrls:[...new Set([...primary.sourceUrls,...donor.sourceUrls])].slice(0,4),nutritionStatus:'estimated'};
}
function fillRetailer(primary:ShelfNineAlternative,donor:ShelfNineAlternative):ShelfNineAlternative{
 const store=primary.storeName??donor.storeName;
 const sameStore=!!store&&!!donor.storeName&&store.toLowerCase()===donor.storeName.toLowerCase();
 return {...primary,storeName:store,aisle:primary.aisle??(sameStore?donor.aisle:null),retailerUrl:primary.retailerUrl??(sameStore?donor.retailerUrl:null)};
}
export function mergeParallelShelf(primary:ShelfNineResult,secondary?:ShelfNineResult):ShelfNineResult{
 const claimed=new Set(primary.products.flatMap(p=>p.cellNumbers));
 const products:ShelfNineProduct[]=primary.products.map(p=>{
  const donor=secondary?.products.find(s=>s.cellNumbers.some(c=>p.cellNumbers.includes(c))&&same(p,s));
  return {...(donor?fillProduct(p,donor):p),sourceModel:'gemini-3.5-flash-lite' as const};
 });
 for(const row of secondary?.products??[]){
  const cells=row.cellNumbers.filter(c=>!claimed.has(c));
  if(cells.length){products.push({...row,cellNumbers:cells,sourceModel:'gpt-6-luna'});cells.forEach(c=>claimed.add(c));}
 }
 // Merge exact identities even when one model filled an unresolved cell.
 const grouped=new Map<string,ShelfNineProduct>();
 for(const row of products){
  const key=row.food.identity.status==='identified'?shelfProductKey(row.food):'cell:'+row.cellNumbers.join(',');
  const previous=grouped.get(key);
  if(previous)grouped.set(key,{...previous,cellNumbers:[...previous.cellNumbers,...row.cellNumbers]});
  else grouped.set(key,row);
 }
 const order={healthy:0,very_healthy:0,neutral:1,not_healthy:2};
 const sorted=[...grouped.values()].sort((a,b)=>(a.food.rating?order[a.food.rating]:3)-(b.food.rating?order[b.food.rating]:3));
 const alternatives:ShelfNineAlternative[]=[];
 if(!sorted.some(p=>isShelfHealthy(p.food))){
  const seen=new Set(sorted.map(p=>shelfProductKey(p.food)));
  for(const a of primary.alternatives){
   const donor=secondary?.alternatives.find(b=>shelfProductKey(b.food)===shelfProductKey(a.food));
   alternatives.push(donor?fillRetailer(a,donor):a);seen.add(shelfProductKey(a.food));
  }
  for(const a of secondary?.alternatives??[]){
   if(alternatives.length>=3)break;
   const original=sorted.find(p=>p.cellNumbers.includes(a.comparedCell));
   const donorOriginal=secondary?.products.find(p=>p.cellNumbers.includes(a.comparedCell));
   const key=shelfProductKey(a.food);
   if(!original||!donorOriginal||!same(original,donorOriginal)||seen.has(key)||!isShelfHealthy(a.food)||!estimatedBenefitsDecision(original.food,a.food).benefits.length)continue;
   alternatives.push(a);seen.add(key);
  }
 }
 const unresolved=primary.unresolvedCells.filter(c=>!sorted.some(p=>p.cellNumbers.includes(c)));
 return {...primary,model:'gemini-3.5-flash-lite',primaryComplete:true,products:sorted,alternatives,unresolvedCells:unresolved,
  duplicatesRemoved:sorted.reduce((n,p)=>n+p.cellNumbers.length-1,0)};
}
