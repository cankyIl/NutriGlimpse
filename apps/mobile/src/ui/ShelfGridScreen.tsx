import {fetch as streamingFetch} from 'expo/fetch';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AppState,Linking,StyleSheet,View} from 'react-native';
import {useFocusEffect,useLocalSearchParams} from 'expo-router';
import {ShelfBenchmarkView,getShelfBenchmarkAvailabilityAsync,type ShelfBenchmarkAvailability} from '../../modules/shelf-benchmark';
import {ShelfGridSession} from '../../../../packages/core/src/shelfGridSession';
import {reviewShelfGrid} from '../../../../packages/core/src/shelfGridClient';
import {SHELF_GRID_N,shelfLeadingProducts,shelfProductKey,type ShelfProduct} from '../../../../packages/core/src/shelfGrid';
import {reviewDualProductPhoto} from '../../../../packages/core/src/dualAiFoodClient';
import {estimatedBenefits} from '../../../../packages/core/src/aiFoodReview';
import {rankShelfFoods} from '../../../../packages/core/src/shelfRanking';
import {useAppState,recordId} from '../state/AppState';
import {savePhotoConsent} from '../storage/photoConsent';
import {readShelfConsent,saveShelfConsent} from '../storage/shelfGridConsent';
import {AiProductCard} from './AiProductCard';
import {Back,Body,Button,Card,Heading,Page,Status,Title} from './components';
import {colors} from './theme';
import type {DualFoodResult} from '../../../../packages/core/src/dualAiFoodReview';
export default function ShelfGridScreen(){
 const {auto}=useLocalSearchParams<{auto?:string}>();const autoStarted=useRef(false);
 const health=useAppState(),session=useRef<ShelfGridSession|null>(null),alive=useRef(false);
 const [snapshot,setSnapshot]=useState<Pick<ShelfGridSession,'id'|'phase'|'products'|'error'|'processed'|'unresolved'|'preview'|'queued'>|null>(null),[availability,setAvailability]=useState<ShelfBenchmarkAvailability|null>(null);
 const [consent,setConsent]=useState(false),[focused,setFocused]=useState(false),[camera,setCamera]=useState(false),[finish,setFinish]=useState(false),[ack,setAck]=useState('');
 const [pending,setPending]=useState(0),[total,setTotal]=useState(0),[blocked,setBlocked]=useState(false),[message,setMessage]=useState(''),[limit,setLimit]=useState(10);
 const [outside,setOutside]=useState<{product:ShelfProduct;result:DualFoodResult}[]>([]),[checkingOutside,setCheckingOutside]=useState(false);
 const outsideController=useRef<AbortController|null>(null),outsideFor=useRef('');
 const update=useCallback(()=>{const current=session.current;if(alive.current)setSnapshot(current?{id:current.id,phase:current.phase,products:current.products,error:current.error,processed:current.processed,unresolved:current.unresolved,preview:current.preview,queued:current.queued}:null);},[]);
 const cancel=useCallback(()=>{session.current?.cancel();outsideController.current?.abort();outsideController.current=null;setOutside([]);setCheckingOutside(false);setCamera(false);setFinish(false);},[]);
 useFocusEffect(useCallback(()=>{
  alive.current=true;setFocused(true);
  void Promise.all([readShelfConsent(),getShelfBenchmarkAvailabilityAsync('shelfset')]).then(([allowed,available])=>{if(alive.current){setConsent(allowed);setAvailability(available);}}).catch(()=>{if(alive.current)setMessage('Camera preferences could not be loaded. Reopen this screen.');});
  return()=>{alive.current=false;session.current?.cancel();outsideController.current?.abort();setFocused(false);setCamera(false);};
 },[]));
 useEffect(()=>{const sub=AppState.addEventListener('change',state=>{if(state==='background'){cancel();setMessage('Scanning stopped while the app was in the background. Start a new scan when ready.');}});return()=>sub.remove();},[cancel]);
 const run=snapshot,products=run?.products??[];
 const localPolicy=useMemo(()=>rankShelfFoods({foods:[],categoryId:'breakfast-cereal',profile:health.profile,panels:health.panels,panelChoice:health.panelChoice}),[health.profile,health.panels,health.panelChoice]);
 const restricted=health.profile.restrictions.length>0||health.profile.conditions.some(c=>['celiac','ckd','sibo'].includes(c))||health.profile.pregnancy!=='not-pregnant';
 const leaders=shelfLeadingProducts(products,restricted,localPolicy.priorities.map(p=>({key:p.metric,direction:p.direction})));
 const finished=run?.phase==='complete';
 const start=useCallback(()=>{
  if(!consent||!availability?.available)return;
  cancel();setMessage('');setPending(0);setTotal(0);setBlocked(false);setLimit(10);outsideFor.current='';
  const id=recordId();
  session.current=new ShelfGridSession(id,(input,signal,progress)=>reviewShelfGrid(input,signal,streamingFetch as typeof fetch,progress),update,batch=>{if(alive.current)setAck(batch);});
  setAck('');setFinish(false);setCamera(true);update();
 },[consent,availability?.available,cancel,update]);
 useEffect(()=>{if(auto==='1'&&focused&&consent&&availability?.available&&!autoStarted.current){autoStarted.current=true;start();}},[auto,focused,consent,availability?.available,start]);
 const leaderKey=finished&&run?run.id+':'+leaders.map(p=>p.packageId).join(','):'';
 useEffect(()=>{
  if(!finished||!run||outsideFor.current===leaderKey||!leaderKey)return;
  outsideFor.current=leaderKey;
  const chosen=leaders.filter(p=>p.needsAlternatives&&p.photo).slice(0,3);
  if(!chosen.length)return;
  const controller=new AbortController();outsideController.current=controller;
  queueMicrotask(()=>{if(!controller.signal.aborted&&alive.current)setCheckingOutside(true);});
  void (async()=>{
   for(const product of chosen){
    if(controller.signal.aborted)break;
    try{
     const result=await reviewDualProductPhoto(product.photo!,controller.signal,streamingFetch as typeof fetch);
     if(controller.signal.aborted||session.current?.id!==run.id)break;
     if(result.original&&shelfProductKey(result.original)===shelfProductKey(product.review.original!)){
      setOutside(items=>[...items,{product,result}]);
     }else setMessage('One product needs a closer view before alternatives can be matched reliably.');
    }catch{if(!controller.signal.aborted)setMessage('The shelf results are ready, but an outside-alternatives review could not finish.');}
   }
   if(!controller.signal.aborted&&alive.current)setCheckingOutside(false);
  })();
 },[leaderKey,finished,leaders,run]); // Snapshot after accepted batches finish; never re-query changing leaders.
 const leaderIds=new Set(leaders.map(p=>p.packageId));
 const sorted=[...products].sort((a,b)=>Number(leaderIds.has(b.packageId))-Number(leaderIds.has(a.packageId)));
 return <Page><Back/><Title eyebrow="SHELF CAMERA">Find your better choice.</Title>
 <Body>Move slowly across the shelf, keeping whole packages in view. Products are checked in groups of 16. Tap Finish whenever you are done, even with fewer products.</Body>
 {!consent&&<Card><Heading>Shelf photo privacy</Heading><Body>Package crops are arranged into a grid on your phone and sent through our server to OpenAI. Our app and server do not save these images. OpenAI may retain them under its API data policy. Keep people and personal documents out of view. Your health profile and laboratory results stay on your phone.</Body><Button label="Continue to shelf camera" onPress={()=>void savePhotoConsent().then(()=>saveShelfConsent()).then(()=>{if(alive.current)setConsent(true);}).catch(()=>setMessage('Could not save your preference.'))}/></Card>}
 {consent&&!camera&&(!run||run.phase==='cancelled')&&<Button icon="camera" label="Start shelf scan" disabled={!availability?.available} onPress={start}/>}
 {availability&&!availability.available&&<Status>Live shelf capture requires a supported physical iPhone with the complete app build.</Status>}
 {camera&&focused&&run&&<View style={styles.preview}><ShelfBenchmarkView mode="grid" modelId="shelfset" gridCapacity={SHELF_GRID_N} active runId={run.id} durationSeconds={30} finishRequested={finish} acknowledgedBatchId={ack} style={StyleSheet.absoluteFill}
  onGrid={({nativeEvent:grid})=>{if(alive.current&&session.current?.id===grid.runId)try{session.current.accept(grid);}catch{setMessage('A camera batch could not be read. Please start a new scan.');}}}
  onGridStatus={({nativeEvent:e})=>{if(e.runId===session.current?.id){setPending(e.pending);setTotal(e.total);setBlocked(e.blocked);}}}
  onScanState={({nativeEvent:e})=>{if(e.runId!==session.current?.id||e.state==='running')return;setCamera(false);if(e.reason==='stopped')session.current?.finish();else{session.current?.cancel();setMessage('Camera interrupted. Start again when ready.');}update();}}
  onError={({nativeEvent:e})=>{setMessage(e.message);cancel();}}
 /></View>}
 {camera&&<Button label={finish?'Finishing capture…':'Finish scan'} disabled={finish} onPress={()=>setFinish(true)}/>}
 {run&&run.phase!=='cancelled'&&<Card><Heading>{finished?'Shelf results':run.phase==='finishing'?'Finishing your shelf review':'Scanning your shelf'}</Heading><Body>{total} packages captured · {run.processed} checked · {products.length} distinct products</Body>
 {!finished&&<Body muted>{pending} waiting for the next grid · {run.queued} batches processing or queued</Body>}
 {blocked&&camera&&<Status>{total>=500?'This scan reached 500 packages. Finish, then start a new scan for the next section.':'Pause panning while processing catches up. Keep this section in view.'}</Status>}
 {!!run.preview.length&&<Body muted>Identified: {run.preview.slice(0,4).join(', ')}. Checking nutrition…</Body>}
 {run.unresolved>0&&<Body muted>{run.unresolved} packages could not be fully checked. Try a closer view of their brand and flavor.</Body>}
 {!!run.error&&<Status>{run.error}</Status>}
 {!finished&&<Button secondary label="Cancel scan" onPress={cancel}/>}
 </Card>}
 {!!message&&<Status>{message}</Status>}
 {message.toLowerCase().includes('settings')&&<Button secondary label="Open Settings" onPress={()=>void Linking.openSettings()}/>}
 {!!products.length&&<><Heading>{finished?'Products on this shelf':'Products checked so far'}</Heading><Body muted>Colored dots use the same general nutrition checks as a normal scan. Leading choices compare similar foods at equal weight; they are not personalized medical recommendations.</Body>
 {restricted&&<Status>Your dietary or care-plan requirements need more evidence. Food facts remain available; no suitable-choice ranking is assigned.</Status>}
 {sorted.slice(0,limit).map(row=><View key={row.packageId} style={styles.product}>
 {leaderIds.has(row.packageId)&&<Heading>{finished?'Leading choice in this category':'Leading choice so far'}</Heading>}
 <AiProductCard food={row.review.original!} photo={row.photo} restricted={restricted}/>
 {row.review.estimatesDiffer&&<Body muted>Nutrition estimates differ. Check this package before comparing it.</Body>}
 {row.review.reviewState==='partial'&&<Body muted>Some information could not be confirmed.</Body>}
 {row.review.reviewState==='identity-conflict'&&<Body muted>The product identity is uncertain. Try a closer view.</Body>}
 </View>)}
 {products.length>limit&&<Button secondary label="Show more products" onPress={()=>setLimit(n=>n+10)}/>}
 </>}
 {checkingOutside&&<Body>Checking outside alternatives for the leading choice…</Body>}
 {outside.map(({product,result})=><View key={product.packageId} style={styles.product}><Heading>Outside alternatives</Heading><Body muted>For {product.review.original?.identity.name}. These products were not identified on this shelf; store stock is unconfirmed.</Body>
 {result.alternatives.map(food=><AiProductCard key={shelfProductKey(food)} food={food} benefits={estimatedBenefits(result.original!,food)} restricted={restricted} nearby/>)}
 {!result.alternatives.length&&<Body muted>No suitable outside alternatives passed the checks.</Body>}
 </View>)}
 {finished&&<Button label="Scan another shelf" icon="camera" onPress={start}/>}
 <Body muted>Package boundaries do not indicate a health rating. Estimates may differ from the label. Images and results are temporary and cleared when you leave this screen.</Body>
 </Page>;
}
const styles=StyleSheet.create({preview:{height:360,borderRadius:22,overflow:'hidden',backgroundColor:colors.greenDeep},product:{gap:10}});
