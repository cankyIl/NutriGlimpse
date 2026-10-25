import {useCallback,useEffect,useState} from 'react';
import {AppState,Linking,Pressable,StyleSheet,Text,View} from 'react-native';
import {router,useFocusEffect} from 'expo-router';
import {availabilityLocation,availabilityProduct,sameRetailer,findNearbyAvailability,type AvailabilityResult} from '../../../../packages/core/src/nearbyAvailability';
import type {PhotoIdentity} from '../../../../packages/core/src/productPhoto';
import {useShoppingStore} from '../state/StoreContext';
import {colors} from './theme';
import {Icon,s} from './components';

export function NearbyAvailability({identity}:{identity:PhotoIdentity}){
 const shopping=useShoppingStore(),product=availabilityProduct(identity),location=availabilityLocation(shopping.selected,shopping.origin);
 const [foreground,setForeground]=useState(AppState.currentState==='active'),[attempt,setAttempt]=useState(0);
 const [state,setState]=useState<{key:string;result?:AvailabilityResult;error?:string}>({key:''});
 const requestKey=product&&location&&foreground?JSON.stringify({product,location}):'';
 const requestVersion=requestKey+'|'+attempt;
 useEffect(()=>{const subscription=AppState.addEventListener('change',value=>setForeground(value==='active'));return()=>subscription.remove();},[]);
 useFocusEffect(useCallback(()=>{
  if(!requestKey)return;
  const controller=new AbortController();
  setState({key:requestVersion});
  // One independent request per visible alternative. No image/source/other-card wait.
  void findNearbyAvailability(JSON.parse(requestKey),controller.signal).then(result=>{
   if(!controller.signal.aborted)setState({key:requestVersion,result});
  }).catch(()=>{if(!controller.signal.aborted)setState({key:requestVersion,error:'Store lookup unavailable.'});});
  return()=>controller.abort();
 },[requestKey,requestVersion,setState]));
 const current=state.key===requestVersion?state:undefined,result=current?.result;
 const message=!product?'A clearer product name is needed to find stores.':!foreground?'':!location?'Choose a store to find this nearby.':
  current?.error??(!result?'Finding store listings…':result.status==='no-matches'?'No matching store listing found.':result.status==='limit-reached'?'Store searches are temporarily at their beta limit.':result.status==='unsupported-area'?'Store search is unavailable for this area.':result.status==='unavailable'?'Store lookup unavailable.':'');
 const retry=!!location&&(!!current?.error||result?.status==='unavailable');
 return <View style={styles.box}>
  <View style={styles.heading}><Icon name="map-pin" size={15}/><Text style={styles.title}>Where to find it</Text></View>
  {shopping.selected&&<Text style={s.small}>Shopping at {shopping.selected.name}</Text>}
  {shopping.selected&&result&&result.status==='ok'&&!result.listings.some(row=>sameRetailer(shopping.selected?.name,row.retailer))&&<Text style={s.small}>No matching listing was found for {shopping.selected.name}. Availability there is unconfirmed.</Text>}
  {!!message&&<Text accessibilityLiveRegion="polite" style={s.small}>{message}</Text>}
  {result?.listings.map((listing,index)=><Pressable key={listing.url+index} accessibilityRole="link" accessibilityLabel={'View '+listing.retailer+' listing'} onPress={()=>void Linking.openURL(listing.url).catch(()=>setState({key:requestVersion,error:'Could not open the store link.',result}))} style={styles.listing}>
   {shopping.selected&&<Text style={styles.note}>{sameRetailer(shopping.selected.name,listing.retailer)?'Your selected retailer · confirm the branch':'Other retailer'}</Text>}
   <Text style={styles.store}>{listing.retailer}{listing.price?' · '+listing.price:''} ↗</Text>
   {!!listing.address&&<Text style={s.small}>{listing.address}</Text>}
   {!!listing.locationLabel&&<Text style={s.small}>{listing.locationLabel}</Text>}
   <Text style={s.small}>{listing.status==='pickup-today'?'Pickup today · reported by Google':listing.status==='in-stock'?'In stock · reported by Google':listing.status==='nearby-listing'?'Nearby listing · stock unconfirmed':'Check location & stock'}{listing.packNote?' · '+listing.packNote:''}</Text>
   {listing.sponsored&&<Text style={styles.note}>Sponsored listing</Text>}
  </Pressable>)}
  {!!result?.listings.length&&<Text style={styles.note}>{result.source} · checked {new Date(result.checkedAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}. Confirm current price and stock with the store.</Text>}
  {!location&&foreground&&<Pressable accessibilityRole="button" accessibilityLabel="Choose store for availability" onPress={()=>router.push('/stores')} style={styles.action}><Text style={styles.store}>Choose store</Text></Pressable>}
  {retry&&<Pressable accessibilityRole="button" accessibilityLabel="Retry store lookup" onPress={()=>setAttempt(n=>n+1)} style={styles.action}><Text style={styles.store}>Try again</Text></Pressable>}
 </View>;
}
const styles=StyleSheet.create({box:{gap:7,borderTopWidth:1,borderColor:colors.line,paddingTop:12},heading:{flexDirection:'row',gap:6,alignItems:'center'},title:{color:colors.ink,fontWeight:'700',fontSize:13},listing:{gap:3,paddingVertical:7,minHeight:44},store:{fontSize:13,fontWeight:'600',color:colors.green},note:{fontSize:10,lineHeight:15,color:colors.muted},action:{minHeight:44,justifyContent:'center'}});
