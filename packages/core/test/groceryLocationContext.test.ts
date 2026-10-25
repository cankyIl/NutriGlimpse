import test from 'node:test';
import assert from 'node:assert/strict';
import {groceryContext} from '../src/groceryContext.ts';
import {CURRENT_PHOTO_NOTICE,verifiedScanSharing} from '../src/scanSharing.ts';
import {GROCERY_CONSENT,GROCERY_RESPONSE_CONSENT,GROCERY_PARALLEL_CONSENT} from '../src/groceryReview.ts';
import {GROCERY_SHOPPER_CONSENT} from '../src/groceryShopper.ts';
import type {Profile} from '../src/types.ts';
const profile={primary:'noConcern',conditions:[],restrictions:[]} as unknown as Profile;
test('fresh location is rounded before leaving phone, while stale, missing and invalid fixes are omitted',()=>{
 const options={profile,shareHealth:false,origin:{latitude:42.301234,longitude:-71.712345,timestamp:Date.now()}};
 const c=groceryContext(profile,null,options);assert.equal(c.location?.latitude,42.3);assert.equal(c.location?.longitude,-71.71);assert.equal(c.shopper,undefined);
 for(const origin of [null,{...options.origin,timestamp:Date.now()-70000},{...options.origin,timestamp:Date.now()+20000},{...options.origin,latitude:NaN},{...options.origin,latitude:91},{...options.origin,longitude:181},{...options.origin,timestamp:NaN}])assert.equal(groceryContext(profile,null,{...options,origin}).location,undefined);
});
test('older photo notice cannot silently enable current-location sharing',()=>{
 assert.equal(verifiedScanSharing(GROCERY_CONSENT+':'+GROCERY_RESPONSE_CONSENT+':'+GROCERY_PARALLEL_CONSENT,GROCERY_SHOPPER_CONSENT),null);
 assert.ok(verifiedScanSharing(CURRENT_PHOTO_NOTICE,GROCERY_SHOPPER_CONSENT));
});
