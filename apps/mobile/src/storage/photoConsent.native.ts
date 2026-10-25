import {GROCERY_SHOPPER_CONSENT} from '../../../../packages/core/src/groceryShopper';
import * as SecureStore from 'expo-secure-store';
import {CURRENT_PHOTO_NOTICE,verifiedScanSharing} from '../../../../packages/core/src/scanSharing';
const PRODUCT_PHOTO_CONSENT=CURRENT_PHOTO_NOTICE;
const name='grocery-product-photo-consent';
const options={keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,keychainService:'grocery-photo-consent'};
export const readPhotoConsent=async()=>await SecureStore.getItemAsync(name,options)===PRODUCT_PHOTO_CONSENT;
export const savePhotoConsent=()=>SecureStore.setItemAsync(name,PRODUCT_PHOTO_CONSENT,options);
export const clearPhotoConsent=async()=>{await SecureStore.deleteItemAsync(name,options);await SecureStore.deleteItemAsync('grocery-shopper-sharing',options);await SecureStore.deleteItemAsync('grocery-shelf-grid-consent',options);};

const shopperName='grocery-shopper-sharing';
export const readShopperConsent=async():Promise<boolean|null>=>{const value=await SecureStore.getItemAsync(shopperName,options);return value===GROCERY_SHOPPER_CONSENT?true:value==='declined:'+GROCERY_SHOPPER_CONSENT?false:null;};
export const saveShopperConsent=(enabled:boolean)=>SecureStore.setItemAsync(shopperName,(enabled?'':'declined:')+GROCERY_SHOPPER_CONSENT,options);

export async function readScanSharingConsent(){
 const [photoChoice,shopperChoice]=await Promise.all([SecureStore.getItemAsync(name,options),SecureStore.getItemAsync(shopperName,options)]);
 return verifiedScanSharing(photoChoice,shopperChoice);
}
