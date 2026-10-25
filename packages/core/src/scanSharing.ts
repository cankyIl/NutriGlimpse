import {GROCERY_CONSENT,GROCERY_RESPONSE_CONSENT,GROCERY_PARALLEL_CONSENT} from './groceryReview.ts';
import {GROCERY_SHOPPER_CONSENT} from './groceryShopper.ts';
export const CURRENT_PHOTO_NOTICE=GROCERY_CONSENT+':'+GROCERY_RESPONSE_CONSENT+':'+GROCERY_PARALLEL_CONSENT;
/** Both persisted choices must match this notice. Legacy, absent or revoked choices fail closed. */
export function verifiedScanSharing(photoChoice:string|null,shopperChoice:string|null){
 if(photoChoice!==CURRENT_PHOTO_NOTICE)return null;
 if(shopperChoice!==GROCERY_SHOPPER_CONSENT&&shopperChoice!=='declined:'+GROCERY_SHOPPER_CONSENT)return null;
 return {parallelContextConsentVersion:GROCERY_PARALLEL_CONSENT,shareHealth:shopperChoice===GROCERY_SHOPPER_CONSENT};
}
