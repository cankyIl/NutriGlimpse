import {productCatalog,identifiedFood} from '../state/productCatalog';
import {normalizeBarcode} from '@grocery/core';
import {ProductFacts} from '../ui/ProductFacts';
import {confirmedPhotoFood} from '../state/ConfirmedPhotoFood';
import {CatalogCredits} from '../ui/CatalogCredits';
import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState,TextInput} from 'react-native';
import {router,useFocusEffect,useLocalSearchParams} from 'expo-router';
import {verifiedGlutenEvidence,searchCatalog,fetchComparableFoods,comparisonMetrics,type ComparisonMetric,type PublicFood,type LabelReviewMode} from '@grocery/core';
import {openRepository} from '../storage/repository';
import {Back,Body,Button,Card,Chip,Heading,Page,Status,Title,s} from '../ui/components';
type CatalogParams={barcode?:string;identified?:string;photo?:string;match?:string;scan?:string};
export default function Catalog(){
 const params=useLocalSearchParams<CatalogParams>();
 return <CatalogContent key={[params.photo,params.identified,params.barcode,params.scan].join(':')} params={params}/>;
}
function CatalogContent({params}:{params:CatalogParams}){
 const direct=!!params.photo||!!params.identified||params.scan==='1';
 const [initial]=useState(()=>{
  if(!direct)return {foods:[] as PublicFood[],pool:[] as PublicFood[],message:''};
  try{
   const foods=params.photo?[confirmedPhotoFood.get(params.photo)].filter((food):food is PublicFood=>!!food):params.identified?[identifiedFood(params.identified)].filter((food):food is PublicFood=>!!food):productCatalog().filter(food=>food.barcode===normalizeBarcode(params.barcode??''));
   const groups=new Set(foods.flatMap(food=>food.comparisonGroup?[food.comparisonGroup]:[]));
   return {foods,pool:productCatalog().filter(food=>food.comparisonGroup&&groups.has(food.comparisonGroup)).slice(0,500),message:foods.length?'':'This product is not in the included catalog. Try a photo of the package or search by name.'};
  }catch{return {foods:[] as PublicFood[],pool:[] as PublicFood[],message:'Included food facts could not be opened. Try searching by name.'};}
 });
 const [reviewMode,setReviewMode]=useState<LabelReviewMode>('standard');
 const [reviewClock,setReviewClock]=useState(Date.now);
 const [pool,setPool]=useState<PublicFood[]>(initial.pool),[metric,setMetric]=useState<ComparisonMetric>('saturatedFatG');
 const [query,setQuery]=useState(params.barcode??'');
 const [mode,setMode]=useState<'name'|'barcode'>(params.barcode?'barcode':'name');
 const [foods,setFoods]=useState<PublicFood[]>(initial.foods);
 const [message,setMessage]=useState(initial.message),[busy,setBusy]=useState(false),[offline,setOffline]=useState(direct);
 useEffect(()=>{
  const expiries=[...foods,...pool].flatMap(food=>{const proof=verifiedGlutenEvidence(food,reviewClock);return proof?[Date.parse(proof.expiresAt)]:[];});
  if(!expiries.length)return;
  const timer=setTimeout(()=>setReviewClock(Date.now()),Math.max(1,Math.min(...expiries)-Date.now()+1));
  return()=>clearTimeout(timer);
 },[foods,pool,reviewClock]);
 const request=useRef<AbortController|null>(null);
 const cancel=useCallback(()=>{request.current?.abort();request.current=null;setBusy(false);},[]);
 useFocusEffect(useCallback(()=>{
  setReviewClock(Date.now());
  const sub=AppState.addEventListener('change',state=>{if(state!=='active')cancel();else setReviewClock(Date.now());});
  return()=>{cancel();sub.remove();};
 },[cancel]));
 async function search(){
  cancel();const controller=new AbortController();request.current=controller;setBusy(true);setMessage('');setFoods([]);setPool([]);
  try{
   const result=await searchCatalog(query,mode,controller.signal);
   if(request.current!==controller)return;
   setFoods(result);setReviewClock(Date.now());setOffline(false);setMessage(result.length?'Choose the exact food and preparation. Loading comparable alternatives…':'No matching food is in our catalog yet. This does not mean the product is unavailable in stores.');
   const groups=[...new Set(result.flatMap(f=>f.comparisonGroup?[f.comparisonGroup]:[]))];
   const batches=await Promise.allSettled(groups.map(g=>fetchComparableFoods(g,controller.signal)));
   if(request.current!==controller)return;
   setPool(batches.flatMap(b=>b.status==='fulfilled'?b.value:[]));setReviewClock(Date.now());
   if(result.length)setMessage(batches.some(b=>b.status==='rejected')?'Some alternatives could not be loaded. Food facts are still shown; retry when connected.':'Choose the exact food and preparation. Alternatives compare label facts only.');
  }catch{
   if(request.current!==controller||controller.signal.aborted)return;
   const words=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
   const result=productCatalog().filter(food=>mode==='barcode'?food.barcode===normalizeBarcode(query):words.every(word=>(food.name+' '+(food.brand??'')).toLowerCase().includes(word))).slice(0,20);
   const groups=new Set(result.flatMap(food=>food.comparisonGroup?[food.comparisonGroup]:[]));
   setFoods(result);setPool(productCatalog().filter(food=>food.comparisonGroup&&groups.has(food.comparisonGroup)).slice(0,500));setOffline(true);setReviewClock(Date.now());
   setMessage(result.length?'Showing included food facts while the connection is unavailable. Check the exact package and version.':'Could not look up this food. Check your connection or open saved foods.');
  }
  finally{if(request.current===controller){request.current=null;setBusy(false);}}
 }
 async function saved(){cancel();try{const repo=await openRepository();const stored=await repo.publicFoods!.read();setFoods(stored);setPool(stored);setReviewClock(Date.now());setOffline(true);setMessage('Saved on this device. Source dates still apply.');}catch{setMessage('Saved foods could not be read. Existing data was preserved.');}}
 async function save(food:PublicFood){try{await(await openRepository()).publicFoods!.save(food);setMessage('Saved for offline use. Up to 100 foods are kept; older saves are replaced when full.');}catch{setMessage('Could not save this food.');}}
 return <Page><Back/><Title eyebrow="PUBLIC FOOD FACTS">{direct?'Your product.':'Know your food.'}</Title>

 {!direct&&<>
 <Body>Search our growing USDA and Open Food Facts catalog. These are food facts; alternatives compare label nutrients. Personalized health ratings and store availability are not included.</Body>
 <Button secondary label="Food & nutrition guidance" onPress={()=>router.push('/nutrition-guidance')}/>
 <Card><Heading>{mode==='name'?'Search by food name':'Find a packaged product'}</Heading><TextInput accessibilityLabel={mode==='name'?'Food name':'Food barcode'} value={query} onChangeText={setQuery} maxLength={mode==='name'?80:14} autoCorrect={false} style={s.body}/><Button label={busy?'Looking up food…':'Look up food'} disabled={busy||!query.trim()} onPress={()=>void search()}/><Button secondary label={mode==='name'?'Use a barcode instead':'Search by name instead'} onPress={()=>{cancel();setMode(mode==='name'?'barcode':'name');setQuery('');setFoods([]);}}/>{busy&&<Button secondary label="Cancel lookup" onPress={cancel}/>}<Body muted>Only the name or barcode you submit goes to our backend. A barcode lookup may also go to Open Food Facts to fill missing label evidence. Coverage is limited; compare branded matches with the package.</Body></Card>
 <Card><Heading>Label review</Heading>
 <Chip label="Standard comparison" selected={reviewMode==='standard'} onPress={()=>setReviewMode('standard')}/>
 <Chip label="Blood pressure / DASH" selected={reviewMode==='blood-pressure'} onPress={()=>{setReviewMode('blood-pressure');setMetric('sodiumMg');}}/>
 <Chip label="Strict gluten-free evidence" selected={reviewMode==='gluten'} onPress={()=>setReviewMode('gluten')}/>
 <Body muted>These views explain label evidence. They do not approve foods medically. Strict gluten-free mode excludes alternatives without verified dietary evidence.</Body></Card>
 <Card><Heading>Compare alternatives by</Heading>{(Object.keys(comparisonMetrics) as ComparisonMetric[]).map(k=><Chip key={k} label={(k==='fiberG'?'More ':'Less ')+comparisonMetrics[k].toLowerCase()} selected={metric===k} onPress={()=>setMetric(k)}/>)}<Body muted>Preferences are checked on your phone. No health profile is sent to the catalog server.</Body></Card>
 <Button secondary label="Open saved foods" onPress={()=>void saved()}/>
 <Button secondary label="Delete all saved food facts" onPress={()=>{cancel();void openRepository().then(repo=>repo.publicFoods!.clear()).then(()=>{setFoods([]);setPool([]);setMessage('Saved food facts deleted.');}).catch(()=>setMessage('Could not delete saved foods.'));}}/>
 </>}
 {params.photo&&params.match==='likely'&&<Body muted>Likely match · check the name and flavor below.</Body>}
 {!!message&&<Status>{message}</Status>}
 {foods.map(food=><ProductFacts key={food.provider+':'+food.id} food={food} pool={pool} metric={metric} photoResult={params.photo?confirmedPhotoFood.assessment(params.photo):undefined} automaticMetric={direct} offline={params.photo?false:offline} reviewMode={reviewMode} now={reviewClock} onSave={candidate=>void save(candidate)}/>)}
 {direct&&<><Button secondary label={params.photo?'Wrong product? Scan again':'Scan another product'} icon="camera" onPress={()=>router.replace('/capture')}/><Button secondary label="Search by name or change comparison options" onPress={()=>router.replace('/catalog')}/></>}
 <CatalogCredits/>
 </Page>;
}
