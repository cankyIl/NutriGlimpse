import {beginScanTiming,scanTimingEnabled} from '../state/ScanTiming';
import {fetch as streamingFetch} from 'expo/fetch';
import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState,Linking,Pressable,StyleSheet,View,Text} from 'react-native';
import {router,useFocusEffect,useLocalSearchParams} from 'expo-router';

import {type PhotoIdentity} from '../../../../packages/core/src/productPhoto';
import {reviewGroceryPhoto} from '../../../../packages/core/src/groceryClient';
import {groceryContext} from '../../../../packages/core/src/groceryContext';
import {useShoppingStore} from '../state/StoreContext';
import {classifyPhoto} from '../../../../packages/core/src/photoRoute';
import {aiScanState} from '../state/AiScanState';

import {ocrPagesSchema} from '../../../../packages/core/src/inputPrivacy';
import {photoReviewTransfer} from '../state/PhotoReviewState';

import {readPhotoConsent,savePhotoConsent,readShopperConsent,saveShopperConsent,readScanSharingConsent} from '../storage/photoConsent';
import {recordId,useAppState} from '../state/AppState';
import {PhotoCaptureView,photoCameraAvailable} from '../ui/PhotoCaptureView';
import {Back,Body,Button,Card,Heading,Icon,Page,Status,Title,s} from '../ui/components';
import {colors} from '../ui/theme';
export default function Capture(){
 const {profile,panels,panelChoice}=useAppState(),shopping=useShoppingStore();
 const {mode}=useLocalSearchParams<{mode?:string}>();const nutrition=mode==='nutrition';
 const [focused,setFocused]=useState(false),[foreground,setForeground]=useState(AppState.currentState==='active');
 const [consent,setConsent]=useState<boolean|null>(null),[shareHealth,setShareHealth]=useState<boolean|null>(null),[consentBusy,setConsentBusy]=useState(false);
 const [state,setState]=useState<'opening'|'ready'|'reading'|'result'|'denied'|'error'>('opening');
 const [attempt,setAttempt]=useState(0),[captureId,setCaptureId]=useState(0),[message,setMessage]=useState('');
 const [identity,setIdentity]=useState<PhotoIdentity|null>(null);
 const alive=useRef(false),ticket=useRef(0),accepted=useRef(false),reading=useRef(false),request=useRef<AbortController|null>(null);
 const timing=useRef<ReturnType<typeof beginScanTiming>>(undefined),scanToken=useRef('');
 const ai=!nutrition&&consent===true&&shareHealth!==null;
 const reset=useCallback(()=>{timing.current?.finish('cancelled');timing.current=undefined;request.current?.abort();request.current=null;ticket.current++;accepted.current=false;reading.current=false;setIdentity(null);setMessage('');setState('opening');setCaptureId(0);setAttempt(n=>n+1);},[]);
 useFocusEffect(useCallback(()=>{
  alive.current=true;setFocused(true);
  let current=true;
  void Promise.all([readPhotoConsent(),readShopperConsent()]).then(([allowed,share])=>{if(current){setConsent(allowed);setShareHealth(share);}}).catch(()=>{if(current){setConsent(false);setMessage('Unlock your phone to load the photo preference.');}});
  return()=>{current=false;alive.current=false;timing.current?.finish('cancelled');timing.current=undefined;request.current?.abort();request.current=null;ticket.current++;reading.current=false;setFocused(false);setIdentity(null);};
 },[]));
 useEffect(()=>{const sub=AppState.addEventListener('change',value=>{
  setForeground(value==='active');
  if(value==='background'||(value!=='active'&&reading.current)){reset();photoReviewTransfer.clear();}
 });return()=>sub.remove();},[reset]);
 useEffect(()=>{
  if(state!=='reading')return;
  const expected=ticket.current;
  const timer=setTimeout(()=>{if(!alive.current||!reading.current||ticket.current!==expected)return;request.current?.abort();request.current=null;reading.current=false;ticket.current++;timing.current?.finish('failed');setState('error');setMessage('This scan took too long. Please try again.');},ai?100000:25000);
  return()=>clearTimeout(timer);
 },[state,ai]);
 async function upload(imageBase64:string,expected:number){
  const controller=new AbortController(),token=scanToken.current||recordId(),scanTiming=timing.current;
  if(ticket.current!==expected||!alive.current)return;
  // Transfer ownership before navigation. The photo stays only in transient memory.
  aiScanState.start(token,imageBase64,controller);
  request.current=null;timing.current=undefined;reading.current=false;setState('result');
  router.replace({pathname:'/photo-results',params:{scan:token}});
  const show=(outcome:Parameters<typeof aiScanState.update>[1],pending:boolean)=>{
   if(controller.signal.aborted)return;
   if(outcome.original)scanTiming?.mark('firstResultMs');
   if(outcome.alternatives.length>=1)scanTiming?.mark('firstAlternativeMs');
   if(outcome.alternatives.length>=2)scanTiming?.mark('secondAlternativeMs');
   if(outcome.alternatives.length>=3)scanTiming?.mark('thirdAlternativeMs');
   aiScanState.update(token,outcome,pending);
  };
  try{
   const sharing=await readScanSharingConsent();
   if(!sharing)throw Error('Please reopen the camera and review your updated scan sharing choice.');
   if(controller.signal.aborted)return;
   const outcome=await reviewGroceryPhoto(imageBase64,groceryContext(profile,shopping.selected,{profile,panels,panelChoice,shareHealth:sharing.shareHealth,origin:shopping.originFix}),controller.signal,streamingFetch as typeof fetch,result=>show(result,true),scanTiming?.network,identity=>{
    if(!controller.signal.aborted){scanTiming?.mark('identityPreviewMs');aiScanState.identify(token,identity);}
   },true,sharing.parallelContextConsentVersion);
   if(controller.signal.aborted)return;
   if(outcome.original){show(outcome,false);scanTiming?.finish('completed');return;}
   scanTiming?.finish('completed');
   aiScanState.fail(token,outcome.status==='multiple-products'?'Photograph one package at a time.':'No package could be identified. Try a closer photo showing the brand and flavor.');
  }catch(error){
   scanTiming?.finish(controller.signal.aborted?'cancelled':'failed');
   if(!controller.signal.aborted)aiScanState.fail(token,error instanceof Error?error.message:'This photo could not be recognized. Please try again.');
  }finally{imageBase64='';}
 }
 async function chooseSharing(enabled:boolean){
  if(consentBusy)return;setConsentBusy(true);
  try{await saveShopperConsent(enabled);await savePhotoConsent();if(alive.current){setConsent(true);setShareHealth(enabled);setMessage('');}}
  catch{if(alive.current)setMessage('Could not save your choice. Please try again.');}
  finally{if(alive.current)setConsentBusy(false);}
 }
 const allowed=nutrition||(consent===true&&shareHealth!==null);
 const camera=photoCameraAvailable&&focused&&foreground&&allowed&&state!=='result';
 return <Page><Back/><Title eyebrow={nutrition?'NUTRITION LABEL':'PRODUCT PHOTO'}>{nutrition?'Scan Nutrient Table':'Scan Your Product'}</Title>
 <Body>{nutrition?'Fill the frame with the Nutrition Facts table.':'Photograph a package front, barcode or Nutrition Facts table. We will open the right view.'}</Body>
 {!nutrition&&consent!==null&&(consent===false||shareHealth===null)&&<Card><Heading>Your scan preferences</Heading><Body>A resized product photo and your selected store name, town and state go through our server to Google Gemini and OpenAI in parallel. Gemini leads the review; OpenAI can fill missing alternatives. Web search helps find product nutrition and store information. When no store is selected and location is allowed, an approximate location goes to our server to find nearby stores. Only the nearby town and public store names go to the models; your exact coordinates and home street address are not sent to them.</Body><Body>Choose whether to also share with both providers your age, gender, reported health concerns, dietary and food preferences, pregnancy context, saved height/weight and latest confirmed lipid results with dates and units. These support general nutrition guidance, not diagnosis or treatment.</Body><Body muted>Your name, exact GPS, raw reports and report identifiers are excluded. Photos and the submitted profile are not saved by our server. During beta testing, returned answers, source links and processing decisions are encrypted on our server for up to seven days (at most 200 scans). Answers may repeat health details you share. Continuing enables this diagnostic capture. Google and OpenAI may retain submitted data under their API policies, and search providers may process generated search queries. Search instructions exclude your private details. The separate legacy fallback receives only the photo. You can change this choice in Privacy.</Body><Button label="Use my health details" disabled={consentBusy} onPress={()=>void chooseSharing(true)}/><Button secondary label="Continue without health details" disabled={consentBusy} onPress={()=>void chooseSharing(false)}/></Card>}
 {camera&&<View style={styles.preview}><PhotoCaptureView key={attempt} active captureId={captureId} imageForAI={ai} timingEnabled={ai&&scanTimingEnabled} style={StyleSheet.absoluteFill}
 onStatus={({nativeEvent:event})=>{if(!alive.current||accepted.current)return;if(event.state==='denied'){setState('denied');setMessage(event.message);}else if(event.state==='error'){timing.current?.finish('failed');reading.current=false;setState('error');setMessage(event.message);}else if(event.state==='ready'&&!reading.current)setState('ready');}}
 onPhoto={({nativeEvent:event})=>{
  if(!alive.current||!reading.current||event.captureId!==ticket.current||accepted.current)return;
  accepted.current=true;timing.current?.mark('photoReadyMs');timing.current?.native(event.timings??{});
  if(ai){
   const route=classifyPhoto(event.page,event.barcodes);
   if(route.kind==='barcode'){timing.current?.discard();timing.current=undefined;reading.current=false;setState('result');router.replace({pathname:'/catalog',params:{barcode:route.barcode,scan:'1'}});return;}
   if(route.kind==='nutrition'){timing.current?.discard();timing.current=undefined;reading.current=false;const token=recordId();photoReviewTransfer.put(token,route.pages);setState('result');router.replace({pathname:'/food-review',params:{kind:'product',cameraResult:token}});return;}
   if(route.kind==='ambiguous'){timing.current?.discard();timing.current=undefined;reading.current=false;setState('error');setMessage('Show one complete barcode, or turn the package to its front.');return;}
   if(!event.imageBase64){timing.current?.finish('failed');reading.current=false;setState('error');setMessage('The photo could not be prepared. Please retake it.');return;}void upload(event.imageBase64,ticket.current);return;}
  reading.current=false;
  if(nutrition){try{const pages=ocrPagesSchema.parse([event.page]);const token=recordId();photoReviewTransfer.put(token,pages);setState('result');router.replace({pathname:'/food-review',params:{kind:'product',cameraResult:token}});}catch{setState('error');setMessage('The nutrition photo could not be opened for review. Please retake it.');}return;}

 }}/>{state==='reading'&&<View style={styles.reading}><Text style={styles.readingText}>{ai?'Identifying and checking nutrition…':'Reading your photo…'}</Text></View>}</View>}
 {!photoCameraAvailable&&<Status>Photo recognition is available in the installed iPhone build. You can search by name on this device.</Status>}
 {camera&&state!=='denied'&&state!=='error'&&<Pressable accessibilityRole="button" accessibilityLabel="Take photo" accessibilityHint="Photograph the package in the camera frame" accessibilityState={{disabled:state!=='ready',busy:state==='reading'}} disabled={state!=='ready'} style={({pressed})=>[styles.shutter,state!=='ready'&&styles.shutterDisabled,pressed&&styles.shutterPressed]} onPress={()=>{if(state!=='ready'||reading.current)return;scanToken.current=recordId();timing.current=ai?beginScanTiming(scanToken.current):undefined;accepted.current=false;reading.current=true;ticket.current++;setState('reading');setCaptureId(ticket.current);}}><Icon name="camera" size={32} color={colors.surface}/></Pressable>}
 {state==='reading'&&<Button secondary label="Cancel scan" onPress={reset}/>}
 {!!message&&<Status>{message}</Status>}
 {identity?.name&&<Card><Heading>Photo identified</Heading><Body>{[identity.brand,identity.name,identity.variant,identity.size].filter(Boolean).join(' · ')}</Body>{<Button label="Scan its Nutrition Facts table" onPress={()=>router.replace({pathname:'/capture',params:{mode:'nutrition'}})}/>}</Card>}
 {photoCameraAvailable&&['result','error'].includes(state)&&<Button label="Take another photo" icon="camera" onPress={reset}/>}
 {state==='denied'&&<Button label="Open camera settings" onPress={()=>void Linking.openSettings().catch(()=>setMessage('Open Camera permissions in your phone settings.'))}/>}
 <Button secondary label="Search by product name" icon="search" onPress={()=>router.replace('/catalog')}/>
 {allowed&&<Text style={s.small}>{ai?'Estimated product information. Check the package for exact amounts and dietary requirements.':'Photos are read on this phone and are not saved or uploaded.'}</Text>}
 </Page>;
}
const styles=StyleSheet.create({shutter:{alignSelf:'center',width:76,height:76,borderRadius:38,backgroundColor:colors.green,alignItems:'center',justifyContent:'center',borderWidth:4,borderColor:colors.sage},shutterDisabled:{opacity:0.45},shutterPressed:{backgroundColor:colors.greenDeep,transform:[{scale:0.96}]},preview:{height:360,backgroundColor:'#152E29',borderRadius:20,overflow:'hidden'},reading:{position:'absolute',top:0,bottom:0,left:0,right:0,backgroundColor:'rgba(0,0,0,0.65)',alignItems:'center',justifyContent:'center'},readingText:{color:'#FFFFFF',fontSize:18,fontWeight:'700'}});
