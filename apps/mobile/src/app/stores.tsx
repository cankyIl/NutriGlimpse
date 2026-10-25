import {useState,useRef} from 'react';
import {router} from 'expo-router';
import {Linking,Text,TextInput,View} from 'react-native';
import {storeDisplayAddress,directionsUrl,searchStoreDirectory,nearbyMappedStores,type MappedStore} from '@grocery/core';
import {useAppState} from '../state/AppState';
import {useShoppingStore} from '../state/StoreContext';
import {Back,Body,Button,Card,Chip,Heading,Page,Title,Status,s} from '../ui/components';
export default function Stores(){
 const context=useShoppingStore();const state=useAppState();const [query,setQuery]=useState(''),[message,setMessage]=useState('');
 const leaving=useRef(false);
 function choose(store:MappedStore){
  if(leaving.current)return;
  leaving.current=true;context.choose(store);
  if(router.canGoBack())router.back();else router.replace('/');
 }
 const origin=context.selected?.coordinates??context.origin;
 const nearby=origin&&context.directory?nearbyMappedStores(context.directory,origin,state.radius,query):null;
 const matches=nearby?nearby.map(item=>({store:item.store,distanceMetres:item.distanceMiles*1609.344})):query.trim().length>=2&&context.directory?searchStoreDirectory(context.directory,query).map(store=>({store,distanceMetres:null})):context.detection?.matches??[];
 function open(url:string){void Linking.openURL(url).catch(()=>setMessage('Could not open this link.'));}
 function card(store:MappedStore,distance:number|null){return <Card key={store.id}><Heading>{store.name}</Heading><Body>{storeDisplayAddress(store)||'Street address not mapped'}</Body>{distance!==null&&<Body muted>{(distance/1609.344).toFixed(1)} miles · approximate straight-line distance</Body>}<Body muted>Availability unknown. No retailer inventory feed is connected.</Body><Button label={context.selected?.id===store.id?'Selected store':'Shop at this store'} secondary={context.selected?.id!==store.id} onPress={()=>choose(store)}/><Button secondary label="Open directions in Maps" onPress={()=>open(directionsUrl(store.coordinates))}/><Button secondary label="View store source" onPress={()=>open(store.sourceUrl)}/></Card>;}
 return <Page><Back/><Title eyebrow="YOUR SHOPPING CONTEXT">Your grocery store.</Title>
 <Body muted>Choose your grocery store. Current coverage: Massachusetts.</Body>
 {!context.selected&&<Status>{context.status}</Status>}{!!context.error&&<Status>{context.error}</Status>}
 {context.selected&&<Card><Heading>{context.method==='automatic'?'Likely store · automatically selected':'Selected store'}</Heading><Body>{context.selected.name}</Body><Body>{storeDisplayAddress(context.selected)||'Street address not mapped'}</Body><Button label="Shop at this store" onPress={()=>choose(context.selected!)}/><Body muted>Not the right store? Choose another below. Store identity does not confirm product stock.</Body><Button secondary label="Open directions in Maps" onPress={()=>open(directionsUrl(context.selected!.coordinates))}/></Card>}
 <Button secondary label={context.enabled?'Turn off automatic location':'Enable automatic location'} onPress={()=>void context.setEnabled(!context.enabled).then(ok=>{if(!ok)setMessage('Could not save your location preference. Please retry.');})}/>
 <Button secondary label="Refresh directory and detect again" onPress={context.retry}/>
 <Button secondary label="Open phone location settings" onPress={()=>void Linking.openSettings().catch(()=>setMessage('Open location permissions in your phone settings.'))}/>
 <Card><Heading>Choose a store manually</Heading><TextInput accessibilityLabel="Store name, city or ZIP code" placeholder="Store name, city or ZIP code" value={query} onChangeText={setQuery} maxLength={100} style={s.body}/><Body muted>Search uses the downloaded directory on this device. It also works if location permission is denied.</Body></Card>
 {origin&&<Card><Heading>Nearby stores</Heading><Body>Search from {context.selected?'the selected store':'your current approximate location'}. Select a radius; it never expands automatically.</Body><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{[5,10,25,50,100].map(radius=><Chip key={radius} label={radius+' miles'} selected={state.radius===radius} onPress={()=>void state.setRadius(radius)}/>)}</View><Text style={s.small}>Showing up to 20 of {matches.length} mapped matches in {state.radius} miles. Directions open an external maps service with the destination only.</Text></Card>}
 {matches.slice(0,20).map(m=>card(m.store,m.distanceMetres))}
 {query.trim().length>=2&&matches.length===0&&<Body>No matching store in this Massachusetts directory. Try the retailer name or another town, or expand the radius. Missing results do not mean no store exists.</Body>}
 <Text style={s.small}>© OpenStreetMap contributors · ODbL 1.0. Directory downloaded {context.directory?.retrievedAt.slice(0,10)??'not yet'}.</Text>
 <Button secondary label="OpenStreetMap attribution and license" onPress={()=>open('https://www.openstreetmap.org/copyright')}/>
 {!!message&&<Status>{message}</Status>}
 </Page>;
}
