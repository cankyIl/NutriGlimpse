// Legacy cleanup only. Key-free builds never read, save or send tester credentials.
import * as SecureStore from 'expo-secure-store';
const name='grocery-beta-tester-access-v1';
const options={keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,keychainService:'grocery-beta-access'};
export const clearTesterKey=()=>SecureStore.deleteItemAsync(name,options);
