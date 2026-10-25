import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState,Linking,TextInput,View} from 'react-native';
import {useFocusEffect} from 'expo-router';
import {CameraView,useCameraPermissions} from 'expo-camera';
import {CameraSession,normalizeScannedBarcode,normalizeBarcode} from '@grocery/core';
import {Body,Button,Chip,Status,s} from './components';
export function DirectBarcodeCamera({onLookup}:{onLookup:(barcode:string)=>void}){
 const [session]=useState(()=>new CameraSession());
 const [permission,requestPermission,getPermission]=useCameraPermissions();
 const [focused,setFocused]=useState(false),[foreground,setForeground]=useState(AppState.currentState==='active');
 const [manual,setManual]=useState(false),[ticket,setTicket]=useState<number|null>(null),[failed,setFailed]=useState(false);
 const [code,setCode]=useState(''),[upce,setUpce]=useState(false),[message,setMessage]=useState('');
 const requested=useRef(false),dispatched=useRef(false),permissionPending=useRef(false);
 const refresh=useRef(getPermission);useEffect(()=>{refresh.current=getPermission;},[getPermission]);
 useFocusEffect(useCallback(()=>{
  setFocused(true);session.setFocused(true);session.setForeground(AppState.currentState==='active');
  const listener=AppState.addEventListener('change',value=>{
   setForeground(value==='active');session.setForeground(value==='active');
   if(value!=='active')setTicket(null);else void refresh.current().catch(()=>{});
  });
  return()=>{session.setFocused(false);setFocused(false);setTicket(null);listener.remove();};
 },[session]));
 useEffect(()=>{
  if(!focused||!foreground||manual||!permission||requested.current||permission.status!=='undetermined')return;
  requested.current=true;permissionPending.current=true;
  void requestPermission().catch(()=>{setFailed(true);setMessage('Could not request camera access. You can enter the barcode.');}).finally(()=>{permissionPending.current=false;});
 },[focused,foreground,manual,permission,requestPermission]);
 useEffect(()=>{
  if(!focused||!foreground||manual||!permission?.granted||failed||dispatched.current)return;
  let current=true;
  void session.open(async()=>true).then(result=>{if(current&&result==='opened')setTicket(session.ticket);});
  return()=>{current=false;session.stop();setTicket(null);};
 },[session,focused,foreground,manual,permission?.granted,failed]);
 function submit(value:string){if(dispatched.current)return;dispatched.current=true;session.stop();setTicket(null);onLookup(value);}
 return <>
 {!manual&&ticket!==null&&<CameraView key={ticket} style={{height:360,borderRadius:20}} facing="back" autofocus="on" barcodeScannerSettings={{barcodeTypes:['ean8','ean13','upc_a','upc_e']}}
 onBarcodeScanned={result=>{const normalized=normalizeScannedBarcode(result.data,result.type);if(normalized&&session.consume(ticket))submit(normalized);}}
 onMountError={()=>{if(session.consume(ticket)){setTicket(null);setFailed(true);setMessage('Could not start the camera. Retry or enter the barcode.');}}}/>}
 {!manual&&!permission&&<Body>Opening camera…</Body>}
 {!manual&&permission&&!permission.granted&&<><Body>Camera access is needed to read the barcode.</Body><Button label={permission.canAskAgain?'Allow camera access':'Open phone settings'} onPress={()=>{if(permission.canAskAgain&&!permissionPending.current){permissionPending.current=true;void requestPermission().catch(()=>setMessage('Could not request camera access. Use phone settings or enter the barcode.')).finally(()=>{permissionPending.current=false;});}else if(!permission.canAskAgain)void Linking.openSettings().catch(()=>setMessage('Open Camera permissions in your phone settings.'));}}/></>}
 {failed&&!manual&&<Button label="Retry camera" onPress={()=>{setMessage('');setFailed(false);}}/>}
 <Button secondary label={manual?'Use barcode camera':'Enter barcode instead'} onPress={()=>{session.stop();setTicket(null);setMessage('');setManual(!manual);}}/>
 {manual&&<View style={{gap:12}}><TextInput accessibilityLabel="Product barcode" placeholder="All printed barcode digits" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={14} style={s.body}/><Chip label="This is an 8-digit UPC-E barcode" selected={upce} onPress={()=>setUpce(!upce)}/><Button label="Find product" onPress={()=>{const normalized=normalizeBarcode(code,upce?'upc_e':'gtin');if(normalized)submit(normalized);else setMessage('Check every printed digit, including the small first and last digits.');}}/></View>}
 {!!message&&<Status>{message}</Status>}
 <Body muted>Point at the package barcode. A valid barcode opens its available food facts automatically.</Body>
 </>;
}
