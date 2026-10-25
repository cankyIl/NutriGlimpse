import test from 'node:test';
import assert from 'node:assert/strict';
import {CURRENT_PHOTO_NOTICE,verifiedScanSharing} from '../src/scanSharing.ts';
import {GROCERY_SHOPPER_CONSENT,GROCERY_SHOPPER_LEGACY_CONSENT} from '../src/groceryShopper.ts';
import {GROCERY_PARALLEL_CONSENT,GROCERY_CONSENT,GROCERY_RESPONSE_CONSENT} from '../src/groceryReview.ts';
test('parallel sharing requires both newly persisted choices, not legacy or missing permission',()=>{
 for(const p of [null,GROCERY_CONSENT+':'+GROCERY_RESPONSE_CONSENT,'bad'])assert.equal(verifiedScanSharing(p,GROCERY_SHOPPER_CONSENT),null);
 for(const s of [null,GROCERY_SHOPPER_LEGACY_CONSENT,'declined:'+GROCERY_SHOPPER_LEGACY_CONSENT,'bad'])assert.equal(verifiedScanSharing(CURRENT_PHOTO_NOTICE,s),null);
 assert.deepEqual(verifiedScanSharing(CURRENT_PHOTO_NOTICE,GROCERY_SHOPPER_CONSENT),{parallelContextConsentVersion:GROCERY_PARALLEL_CONSENT,shareHealth:true});
 assert.deepEqual(verifiedScanSharing(CURRENT_PHOTO_NOTICE,'declined:'+GROCERY_SHOPPER_CONSENT),{parallelContextConsentVersion:GROCERY_PARALLEL_CONSENT,shareHealth:false});
});
