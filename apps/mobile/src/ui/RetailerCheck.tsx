import {useState} from 'react';
import {Linking,Text,View} from 'react-native';
import {retailerSites,retailerFromName,retailerProductLink,type PublicFood,type RetailerSiteId} from '@grocery/core';
import {useShoppingStore} from '../state/StoreContext';
import {Body,Button,Chip,Status,s} from './components';
export function RetailerCheck({food,retailerName}:{food:PublicFood;retailerName?:string}){
 const shopping=useShoppingStore(),[expanded,setExpanded]=useState(false),[chosen,setChosen]=useState<RetailerSiteId|null>(null),[message,setMessage]=useState('');
 const retailer=chosen??retailerFromName(retailerName??shopping.selected?.name);
 const link=retailer?retailerProductLink(retailer,food):null;
 return <View style={{gap:8}}><Button secondary label={expanded?'Hide store checking':'Check with a retailer'} onPress={()=>setExpanded(value=>!value)}/>
 {expanded&&<><Body>Availability is unverified. Choose the exact branch on the retailer’s website, then check the product, size and current label. A search result is not confirmation of stock.</Body>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{retailerSites.map(site=><Chip key={site.id} label={site.name} selected={retailer===site.id} onPress={()=>setChosen(site.id)}/>)}</View>
 {link&&<><Text style={s.small}>Look for: {link.searchTerm}{'\n'}{link.directSearch?'Opening this link sends only the product search words to the retailer.':'Open the retailer’s website and search for the product there.'} Your health profile and location are not included.</Text><Button label={'Open '+link.name} onPress={()=>void Linking.openURL(link.url).catch(()=>setMessage('Could not open the retailer. Try its app or ask a store employee.'))}/></>}
 <Text style={s.small}>You can also show the product name and barcode to a store employee. These links are not retailer partnerships or stock feeds.</Text>
 </>}
 {!!message&&<Status>{message}</Status>}</View>;
}
