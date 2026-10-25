import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {AppState} from 'react-native';
import {detectStore,fetchStoreDirectory,type Detection,type MappedStore,type StoreDirectory,type Coordinates} from '@grocery/core';
import {useAppState} from './AppState';
import {openRepository} from '../storage/repository';
import {watchStoreLocation} from '../storage/locationSource';
function useStoreDetection(){
 const state=useAppState();const enabled=state.autoStoreDetection!==false;
 const [directory,setDirectory]=useState<StoreDirectory|null>(null),[error,setError]=useState('');
 const [detection,setDetection]=useState<Detection|null>(null),[manual,setManual]=useState<MappedStore|null>(null);
 const [origin,setOrigin]=useState<(Coordinates&{timestamp:number})|null>(null);
 const [status,setStatus]=useState('Loading the Massachusetts store directory…');
 const [foreground,setForeground]=useState(AppState.currentState==='active'),[attempt,setAttempt]=useState(0);
 const lastUpdate=useRef(0);
 useEffect(()=>{const listener=AppState.addEventListener('change',value=>{setDetection(null);setOrigin(null);setForeground(value==='active');});return()=>listener.remove();},[]);
 useEffect(()=>{
  if(!state.onboardingComplete)return;
  const controller=new AbortController();let cached:StoreDirectory|null=null;
  void(async()=>{
   try{
    const repo=await openRepository();cached=await repo.storeDirectory?.read()??null;
    if(controller.signal.aborted)return;
    if(cached)setDirectory(cached);
    if(cached&&Date.now()-Date.parse(cached.retrievedAt)<86400000&&attempt===0)return;
    const fresh=await fetchStoreDirectory(controller.signal);
    if(controller.signal.aborted)return;
    await repo.storeDirectory?.write(fresh);
    if(!controller.signal.aborted){setDirectory(fresh);setError('');}
   }catch{if(!controller.signal.aborted)setError(cached?'Using the saved store directory. Updates are unavailable.':'Store directory unavailable. Check your connection and retry.');}
  })();
  return()=>controller.abort();
 },[state.onboardingComplete,attempt]);
 useEffect(()=>{
  if(!state.onboardingComplete||!foreground||!enabled||manual)return;
  const controller=new AbortController();let expiry:ReturnType<typeof setTimeout>|undefined;
  lastUpdate.current=0;
  void watchStoreLocation(fix=>{
   if(controller.signal.aborted)return;
   if(Date.now()-lastUpdate.current<5000)return;lastUpdate.current=Date.now();
   if(expiry)clearTimeout(expiry);
   if(!directory){setStatus('Location is ready; waiting for the store directory.');return;}
   try{
    const result=detectStore(fix,directory);setDetection(result);
    setOrigin(fix.accuracy!==null&&fix.accuracy<=1000&&Date.now()-fix.timestamp<=60000&&fix.timestamp<=Date.now()+10000?{latitude:fix.latitude,longitude:fix.longitude,timestamp:fix.timestamp}:null);
    setStatus(result.state==='detected'?'Store selected automatically. Check the name; location can be imperfect.':result.state==='ambiguous'?'More than one store is close. Choose the correct branch.':result.state==='inaccurate'?'Location is not precise enough to select a store. Choose a nearby branch.':result.state==='stale-directory'?'The saved directory is over 30 days old. Refresh it or choose a store manually.':'No clear in-store match. Choose a nearby store or search by name.');
    expiry=setTimeout(()=>{setDetection(null);setOrigin(null);setStatus('Waiting for a fresh location.');},65000);
   }catch{setDetection(null);setOrigin(null);setStatus('Location could not be verified. Choose a store manually.');}
  },message=>{if(!controller.signal.aborted){setDetection(null);setOrigin(null);setStatus(message);}},controller.signal);
  return()=>{controller.abort();if(expiry)clearTimeout(expiry);};
 },[state.onboardingComplete,foreground,enabled,manual,directory,attempt]);
 return {directory,error,origin:foreground&&enabled&&origin?{latitude:origin.latitude,longitude:origin.longitude}:null,originFix:foreground&&enabled?origin:null,status:manual?'Store selected manually.':!enabled?'Automatic location is off.':status,detection,selected:foreground&&state.onboardingComplete?(manual??(enabled?detection?.selected:null)??null):null,method:manual?'manual':'automatic',enabled,
  choose:(store:MappedStore)=>{setManual(store);setDetection(null);setOrigin(null);},
  retry:()=>{setManual(null);setOrigin(null);setAttempt(n=>n+1);},
  setEnabled:async(value:boolean)=>{const saved=await state.setAutoStoreDetection(value);if(saved){setManual(null);setDetection(null);setOrigin(null);}return saved;},
 };
}
type Value=ReturnType<typeof useStoreDetection>;
const Context=createContext<Value|null>(null);
export function StoreProvider({children}:{children:ReactNode}){const value=useStoreDetection();return <Context.Provider value={value}>{children}</Context.Provider>;}
export function useShoppingStore(){const value=useContext(Context);if(!value)throw Error('Store provider missing');return value;}
