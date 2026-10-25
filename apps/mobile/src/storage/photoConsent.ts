import {CURRENT_PHOTO_NOTICE,verifiedScanSharing} from '../../../../packages/core/src/scanSharing';
import {GROCERY_SHOPPER_CONSENT} from '../../../../packages/core/src/groceryShopper';
let accepted=false;let shopper:boolean|null=null;
export const readPhotoConsent=async()=>accepted;
export const savePhotoConsent=async()=>{accepted=true;};
export const clearPhotoConsent=async()=>{accepted=false;shopper=null;};

export const readShopperConsent=async()=>shopper;
export const saveShopperConsent=async(enabled:boolean)=>{shopper=enabled;};

export const readScanSharingConsent=async()=>verifiedScanSharing(accepted?CURRENT_PHOTO_NOTICE:null,shopper===null?null:(shopper?'':'declined:')+GROCERY_SHOPPER_CONSENT);
