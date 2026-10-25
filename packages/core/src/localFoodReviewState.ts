import {localFoodReviewSchema,type LocalFoodReview} from './localFoodInput.ts';
import type {BetaSnapshot} from './beta.ts';
export function saveLocalFoodReview(snapshot:BetaSnapshot,input:LocalFoodReview,expected:LocalFoodReview|null):BetaSnapshot{
 const next=localFoodReviewSchema.parse(input),list=snapshot.foodReviews??[],current=list.find(r=>r.id===next.id);
 if(expected===null){
  if(current||[...snapshot.scans,...snapshot.receipts,...snapshot.panels].some(r=>r.id===next.id))throw Error('Identifier already saved.');
  if(list.length>=250)throw Error('Review history is full. Export or delete an older review first.');
  return {...snapshot,foodReviews:[next,...list]};
 }
 const previous=localFoodReviewSchema.parse(expected);
 if(!current||next.id!==previous.id||JSON.stringify(current)!==JSON.stringify(previous))throw Error('This review changed or was deleted. Reopen it from history.');
 if(next.createdAt!==previous.createdAt||next.synthetic!==previous.synthetic)throw Error('Review source context cannot be replaced.');
 return {...snapshot,foodReviews:list.map(r=>r.id===next.id?next:r)};
}
