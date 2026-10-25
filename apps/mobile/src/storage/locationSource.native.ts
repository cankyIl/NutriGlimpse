import * as Location from 'expo-location';
import type {LocationFix} from '@grocery/core';
export async function watchStoreLocation(onFix:(fix:LocationFix)=>void,onStatus:(message:string)=>void,signal:AbortSignal){
 let subscription:Location.LocationSubscription|undefined;
 let timer:ReturnType<typeof setTimeout>|undefined;
 const stop=()=>{subscription?.remove();if(timer)clearTimeout(timer);};
 signal.addEventListener('abort',stop,{once:true});
 try{
  let permission=await Location.getForegroundPermissionsAsync();
  if(signal.aborted)return;
  if(permission.status==='undetermined')permission=await Location.requestForegroundPermissionsAsync();
  if(signal.aborted)return;
  if(!permission.granted){onStatus('Location permission is off. Choose a store manually, or enable location in phone settings.');return;}
  if(!await Location.hasServicesEnabledAsync()){if(!signal.aborted)onStatus('Phone location services are off. You can still choose a store manually.');return;}
  if(signal.aborted)return;
  onStatus('Finding your store…');
  timer=setTimeout(()=>{if(!signal.aborted)onStatus('Waiting for an accurate location. You can choose a store manually.');},15000);
  subscription=await Location.watchPositionAsync({accuracy:Location.Accuracy.High,distanceInterval:0,timeInterval:10000,mayShowUserSettingsDialog:false},value=>{
   if(signal.aborted)return;if(timer)clearTimeout(timer);
   onFix({latitude:value.coords.latitude,longitude:value.coords.longitude,accuracy:value.coords.accuracy,timestamp:value.timestamp});
  },()=>{if(!signal.aborted)onStatus('Location is unavailable. Choose a store manually.');});
  if(signal.aborted)subscription.remove();
 }catch{if(!signal.aborted)onStatus('Could not access phone location. Choose a store manually.');}
}
