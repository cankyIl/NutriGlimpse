import {GroceryReviewView} from '../ui/GroceryReviewView';
import {markScanLayout,markScanPreview} from '../state/ScanTiming';
import {AppState,Image,StyleSheet,View} from 'react-native';
import {useCallback,useEffect,useState} from 'react';
import {router,useFocusEffect,useLocalSearchParams} from 'expo-router';
import {aiScanState} from '../state/AiScanState';
import {useAppState} from '../state/AppState';
import {AiProductCard} from '../ui/AiProductCard';
import {Back,Body,Button,Card,Heading,Page,Title} from '../ui/components';
import {colors} from '../ui/theme';
import {estimatedBenefits} from '../../../../packages/core/src/aiFoodReview';
export default function PhotoResults(){
 const {scan}=useLocalSearchParams<{scan?:string}>(),{profile}=useAppState();
 const [selected,setSelected]=useState(()=>aiScanState.get(scan??''));
 useFocusEffect(useCallback(()=>{const refresh=()=>setSelected(aiScanState.get(scan??''));refresh();const unsubscribe=aiScanState.subscribe(refresh),timer=setInterval(refresh,30000);return()=>{unsubscribe();clearInterval(timer);aiScanState.cancel(scan??'');aiScanState.clearPhoto();};},[scan]));
 useEffect(()=>{const listener=AppState.addEventListener('change',state=>{if(state==='background'){aiScanState.cancel(scan??'');aiScanState.clearPhoto();setSelected(value=>value?{...value,photo:''}:null);}});return()=>listener.remove();},[scan]);
 const result=selected?.result,original=result?.original,restricted=profile.restrictions.length>0||profile.conditions.includes('celiac');
 const web=result?.schemaVersion===5;
 const labelCheck=!!((result?.schemaVersion===4||result?.schemaVersion===5)&&result.reviewState==='complete'&&result.estimatesDiffer&&original?.rating===null);
 return <Page><Back/><Title eyebrow="YOUR PRODUCT">A clearer picture.</Title>
 {result?.schemaVersion===6?<View onLayout={()=>markScanLayout(scan??'')}><GroceryReviewView result={result} photo={selected?.photo} pending={selected?.pending}/>{selected?.pending&&<Button secondary label="Cancel scan" onPress={()=>aiScanState.cancel(scan??'')}/>}</View>:selected?.pending&&!original?<View key={selected.identity?'identity-preview':'photo-preview'} onLayout={()=>markScanPreview(scan??'',!!selected.identity)}><Card>
  <View style={styles.top}>
   {!!selected.photo&&<Image source={{uri:'data:image/jpeg;base64,'+selected.photo}} style={styles.preview} resizeMode="contain" accessibilityLabel="Your product photo"/>}
   <View style={styles.identity}>
    {!!selected.identity?.brand&&<Body muted>{selected.identity.brand}</Body>}
    <Heading>{selected.identity?[selected.identity.name,selected.identity.variant].filter(Boolean).join(' '):'Your photo'}</Heading>
    {!!selected.identity?.size&&<Body muted>{selected.identity.size}</Body>}
   </View>
  </View>
  <Body>{selected.identity?.status==='uncertain'?'Possible match. Checking product details…':selected.identity?'Finding nutrition sources…':'Identifying your product…'}</Body>
  <Button secondary label="Cancel scan" onPress={()=>aiScanState.cancel(scan??'')}/>
 </Card></View>:original&&result?<><View onLayout={()=>markScanLayout(scan??'')}><AiProductCard food={original} photo={selected?.photo} restricted={restricted} labelCheck={labelCheck} reviewPending={web&&(selected?.pending||result.reviewState==='checking')}/></View>
 {result.alternatives.length>0&&<><Heading>{restricted?'Comparable options':'Healthier alternatives'}</Heading><Body muted>{web?'Compared at equal weight using the nutrition found by web search.':'Estimated improvements at equal weight.'} Nearby store listings load separately.</Body>{result.alternatives.map(food=><AiProductCard key={[food.identity.brand,food.identity.name,food.identity.variant].join('|')} food={food} benefits={estimatedBenefits(original,food)} restricted={restricted} nearby/>)}</>}
 {(result?.schemaVersion===4||result?.schemaVersion===5)&&result.reviewState==='identity-conflict'&&<Body muted>The product identity is uncertain. Check the name or take another photo.</Body>}
 {(result?.schemaVersion===4||result?.schemaVersion===5)&&result.estimatesDiffer&&result.reviewState!=='identity-conflict'&&<Body muted>{web?'The sources returned different nutrition values. Check the linked labels before choosing.':labelCheck?'The nutrition information needs a label check before assigning a rating.':'Nutrition estimates differ. Check the package for exact values.'}</Body>}
 {web&&original&&'nutritionSource' in original&&!original.nutritionSource&&<Body muted>The review could not confirm a matching nutrition source. You can scan the package label or search for the product.</Body>}
 {labelCheck&&<Button secondary label="Scan Nutrition Facts" icon="camera" onPress={()=>router.push({pathname:'/capture',params:{mode:'nutrition'}})}/>}
 {(result?.schemaVersion===4||result?.schemaVersion===5)&&result.reviewState==='partial'&&<Body muted>{web?'Some information could not be confirmed. Available facts come from the linked source.':'Some information could not be confirmed. Check the package label.'}</Body>}
 {selected?.pending&&<Body muted>Checking nutrition and alternatives…</Body>}
 {!selected?.pending&&!result.alternatives.length&&(['neutral','not_healthy'].includes(original.rating??'')||labelCheck)&&<Body muted>Could not confirm a better alternative from this review. Search for another product or check its nutrition label.</Body>}
 <Body muted>Check the package for exact nutrition, ingredients and dietary requirements. These are general comparisons, not personalized medical recommendations.</Body></>:<Body>{selected?.error||'This scan has expired. Take another photo to see fresh information.'}</Body>}
 <Button label="Scan another product" icon="camera" onPress={()=>router.replace('/capture')}/><Button secondary label="Search foods" icon="search" onPress={()=>router.push('/catalog')}/>
 </Page>;
}

const styles=StyleSheet.create({top:{flexDirection:'row',gap:14,alignItems:'flex-start'},identity:{flex:1,gap:4},preview:{width:64,height:86,borderRadius:10,backgroundColor:colors.background}});
