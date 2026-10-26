import {fetch as streamingFetch} from 'expo/fetch';
import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState,StyleSheet,View,Linking} from 'react-native';
import {useFocusEffect,useLocalSearchParams} from 'expo-router';
import {ShelfBenchmarkView,getShelfBenchmarkAvailabilityAsync,type ShelfBenchmarkAvailability} from '../../modules/shelf-benchmark';
import {ShelfNineSession} from '../../../../packages/core/src/shelfNineSession';
import {SHELF_NINE_CAPACITY} from '../../../../packages/core/src/shelfNine';
import {reviewShelfNine} from '../../../../packages/core/src/shelfNineClient';
import {groceryContext} from '../../../../packages/core/src/groceryContext';
import {useAppState,recordId} from '../state/AppState';
import {useShoppingStore} from '../state/StoreContext';
import {AiProductCard} from './AiProductCard';
import {SearchAttribution} from './SearchAttribution';
import {Back,Body,Button,Card,Heading,Page,Status,Title} from './components';
import {colors} from './theme';
export default function ShelfNineScreen(){
 const {auto}=useLocalSearchParams<{auto?:string}>(),health=useAppState(),shopping=useShoppingStore();
 const session=useRef<ShelfNineSession|null>(null),alive=useRef(false),autoStarted=useRef(false);
 const [snapshot,setSnapshot]=useState<Pick<ShelfNineSession,'id'|'phase'|'products'|'processed'|'unresolved'|'queued'|'error'|'duplicateCount'|'alternatives'|'batchResults'>|null>(null),[availability,setAvailability]=useState<ShelfBenchmarkAvailability|null>(null);
 const [shareHealth,setShareHealth]=useState<boolean|null>(null),[focused,setFocused]=useState(false),[camera,setCamera]=useState(false),[finish,setFinish]=useState(false),[ack,setAck]=useState('');
 const [pending,setPending]=useState(0),[total,setTotal]=useState(0),[blocked,setBlocked]=useState(false),[message,setMessage]=useState(''),[limit,setLimit]=useState(10);
 const update=useCallback(()=>{const current=session.current;if(alive.current)setSnapshot(current?{id:current.id,phase:current.phase,products:current.products,processed:current.processed,unresolved:current.unresolved,queued:current.queued,error:current.error,duplicateCount:current.duplicateCount,alternatives:current.alternatives,batchResults:[...current.batchResults]}:null);},[]);
 const cancel=useCallback(()=>{session.current?.cancel();setCamera(false);setFinish(false);},[]);
 useFocusEffect(useCallback(()=>{
  alive.current=true;setFocused(true);
  void getShelfBenchmarkAvailabilityAsync('shelfset').then(value=>{if(alive.current)setAvailability(value);}).catch(()=>{if(alive.current)setMessage('Could not load the shelf camera. Reopen this screen.');});
  return()=>{alive.current=false;session.current?.cancel();setFocused(false);setCamera(false);};
 },[]));
 useEffect(()=>{const sub=AppState.addEventListener('change',state=>{if(state==='background'){cancel();setMessage('Scanning stopped in the background. Start again when ready.');}});return()=>sub.remove();},[cancel]);
 const start=useCallback(()=>{
  if(shareHealth===null||!availability?.available)return;
  cancel();setMessage('');setPending(0);setTotal(0);setBlocked(false);setLimit(10);setAck('');setFinish(false);
  const context=groceryContext(health.profile,shopping.selected,{profile:health.profile,panels:health.panels,panelChoice:health.panelChoice,shareHealth,origin:shopping.originFix});
  session.current=new ShelfNineSession(recordId(),context,shareHealth,(input,signal,progress)=>reviewShelfNine(input,signal,streamingFetch as typeof fetch,progress),update,batch=>{if(alive.current)setAck(batch);});
  setCamera(true);update();
 },[shareHealth,availability?.available,cancel,health.profile,health.panels,health.panelChoice,shopping.selected,shopping.originFix,update]);
 useEffect(()=>{if(auto==='1'&&focused&&shareHealth!==null&&availability?.available&&!autoStarted.current){autoStarted.current=true;start();}},[auto,focused,shareHealth,availability?.available,start]);
 const run=snapshot,products=run?.products??[],finished=run?.phase==='complete';
 const restricted=health.profile.restrictions.length>0||health.profile.conditions.some(c=>['celiac','ckd','sibo'].includes(c))||health.profile.pregnancy!=='not-pregnant';
 return <Page><Back/><Title eyebrow="SHELF CAMERA">Find your better choice.</Title>
 <Body>Move slowly across the shelf, keeping whole packages in view. Products are checked in groups of 9. Results appear while you scan. Tap Finish even with fewer products.</Body>
 {shareHealth===null&&<Card><Heading>Shelf scan preferences</Heading>
 <Body>Numbered package crops go through our server to Google Gemini and OpenAI at the same time, with Gemini leading. Web search helps find nutrition and store information. Your selected store or nearby town is included; exact GPS and your name are not sent to either model.</Body>
 <Body>You can also share your saved age, gender, health concerns, preferences, pregnancy context, height/weight and confirmed lipid results for general nutrition guidance. This does not enable personalized medical recommendations. Private health details are excluded from search queries.</Body>
 <Body muted>Our app and server do not save shelf images or your submitted profile. Results are temporary. Google and OpenAI may retain requests under their API policies.</Body>
 <Button label="Use my health details" onPress={()=>setShareHealth(true)}/><Button secondary label="Continue without health details" onPress={()=>setShareHealth(false)}/></Card>}
 {shareHealth!==null&&!camera&&(!run||run.phase==='cancelled')&&<Button icon="camera" label="Start shelf scan" disabled={!availability?.available} onPress={start}/>}
 {availability&&!availability.available&&<Status>Live shelf capture requires a supported physical iPhone with the complete app build.</Status>}
 {camera&&focused&&run&&<View style={styles.preview}><ShelfBenchmarkView mode="grid" modelId="shelfset" gridCapacity={SHELF_NINE_CAPACITY} active runId={run.id} durationSeconds={30} finishRequested={finish} acknowledgedBatchId={ack} style={StyleSheet.absoluteFill}
 onGrid={({nativeEvent:grid})=>{if(alive.current&&session.current?.id===grid.runId)try{session.current.accept(grid);}catch{setMessage('A camera batch could not be read. Start a new scan.');}}}
 onGridStatus={({nativeEvent:e})=>{if(e.runId===session.current?.id){setPending(e.pending);setTotal(e.total);setBlocked(e.blocked);}}}
 onScanState={({nativeEvent:e})=>{if(e.runId!==session.current?.id||e.state==='running')return;setCamera(false);if(e.reason==='stopped')session.current?.finish();else{session.current?.cancel();setMessage('Camera interrupted. Start again when ready.');}update();}}
 onError={({nativeEvent:e})=>{setMessage(e.message);cancel();}}/></View>}
 {camera&&<Button label={finish?'Finishing capture...':'Finish scan'} disabled={finish} onPress={()=>setFinish(true)}/>}
 {run&&run.phase!=='cancelled'&&<Card><Heading>{finished?'Shelf results':run.phase==='finishing'?'Finishing your shelf review':'Scanning your shelf'}</Heading>
 <Body>{total} packages captured · {run.processed} checked · {products.length} distinct products</Body>
 <Body muted>{run.duplicateCount} duplicate appearances combined</Body>
 {!finished&&<Body muted>{pending} waiting for the next grid · {run.queued} batches processing or queued</Body>}
 {blocked&&camera&&<Status>Pause panning while processing catches up.</Status>}
 {run.unresolved>0&&<Body muted>{run.unresolved} packages could not be fully checked. Try a closer view.</Body>}
 {!!run.error&&<Status>{run.error}</Status>}{!finished&&<Button secondary label="Cancel scan" onPress={cancel}/>}</Card>}
 {!!message&&<Status>{message}</Status>}
 {!!products.length&&<><Heading>{finished?'Products on this shelf':'Products checked so far'}</Heading>
 <Body muted>Healthy choices appear first, followed by neutral and not healthy choices. Nutrition checks still apply.</Body>
 {restricted&&<Status>Your dietary or care-plan requirements need more evidence. Food facts are shown without a suitability rating.</Status>}
 {products.slice(0,limit).map(row=><AiProductCard key={row.batchId+':'+row.cellNumbers.join('-')} food={row.food} photo={row.photo} benefits={row.reasons} restricted={restricted} reviewPending={!row.complete}>
 <Body muted>{row.packageIds.length>1?row.packageIds.length+' appearances combined':'One distinct product'}</Body>
 {row.sourceUrls.map(url=><Button key={url} secondary label="Nutrition source" onPress={()=>void Linking.openURL(url).catch(()=>setMessage('Could not open the source.'))}/>)}
 </AiProductCard>)}
 {products.length>limit&&<Button secondary label="Show more products" onPress={()=>setLimit(n=>n+10)}/>}</>}
 {!restricted&&!!run?.alternatives.length&&<><Heading>Healthier alternatives</Heading><Body muted>Suggested outside the scanned products. Store listings do not confirm current stock.</Body>
 {run.alternatives.map((row,i)=><AiProductCard key={i} food={row.food} benefits={row.reasons}>
 {row.storeName&&<Body>{row.storeName}{row.aisle?' · '+row.aisle:''}</Body>}
 {row.retailerUrl&&<Button secondary label="View retailer" onPress={()=>void Linking.openURL(row.retailerUrl!).catch(()=>setMessage('Could not open the retailer.'))}/>}
 </AiProductCard>)}</>}
 {run?.batchResults.map(batch=><SearchAttribution key={batch.batchId} html={batch.searchSuggestionsHtml}/>)}
 {finished&&<Button icon="camera" label="Scan another shelf" onPress={start}/>}
 <Body muted>Package outlines mean detection, not a health rating. Check the label for exact nutrients and dietary requirements.</Body>
 </Page>;
}
const styles=StyleSheet.create({preview:{height:360,borderRadius:22,overflow:'hidden',backgroundColor:colors.greenDeep}});
