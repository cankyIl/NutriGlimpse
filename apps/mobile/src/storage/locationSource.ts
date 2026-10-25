import type {LocationFix} from '@grocery/core';
export async function watchStoreLocation(_onFix:(fix:LocationFix)=>void,onStatus:(message:string)=>void,signal:AbortSignal){
 if(!signal.aborted)onStatus('Automatic location is available in the phone app. Choose a store from the directory here.');
}
