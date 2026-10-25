import * as SecureStore from 'expo-secure-store';
import {SHELF_GRID_CONSENT} from '../../../../packages/core/src/shelfGrid';
import {readPhotoConsent} from './photoConsent';
const name='grocery-shelf-grid-consent';
const options={keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,keychainService:'grocery-photo-consent'};
export const readShelfConsent=async()=>await readPhotoConsent()&&await SecureStore.getItemAsync(name,options)===SHELF_GRID_CONSENT;
export const saveShelfConsent=()=>SecureStore.setItemAsync(name,SHELF_GRID_CONSENT,options);
export const clearShelfConsent=()=>SecureStore.deleteItemAsync(name,options);
