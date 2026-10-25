import {useEffect,useRef,useState} from 'react';
import {Text,TextInput,View} from 'react-native';
import {searchCatalog,type PublicFood} from '@grocery/core';
import {Body,Button,Card,Heading,Status,s} from './components';
export function CatalogMatch({onConfirm,disabled=false}:{onConfirm:(food:PublicFood)=>void;disabled?:boolean}){
 const [query,setQuery]=useState(''),[foods,setFoods]=useState<PublicFood[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const request=useRef<AbortController|null>(null);
 useEffect(()=>()=>request.current?.abort(),[]);
 function cancel(){request.current?.abort();request.current=null;setBusy(false);}
 async function find(){
  cancel();const controller=new AbortController();request.current=controller;setBusy(true);setFoods([]);
  try{
   const result=await searchCatalog(query,'name',controller.signal);
   if(request.current!==controller)return;
   setFoods(result.slice(0,5));setMessage(result.length?'Check the name, flavor, size, preparation and barcode before confirming.':'No matching catalog product. Keep this item unresolved or photograph its label.');
  }catch{if(request.current===controller)setMessage('Lookup unavailable. Check your connection, or keep the item unresolved.');}
  finally{if(request.current===controller){request.current=null;setBusy(false);}}
 }
 return <View style={{gap:10}}><TextInput accessibilityLabel="Product name to find an exact catalog match" value={query} onChangeText={value=>{cancel();setQuery(value);setFoods([]);}} maxLength={80} editable={!disabled} style={s.body} placeholder="Type the food name only"/>
 <Text style={s.small}>Only these search words go to the public-food backend when you tap Look up. No receipt, label photo or health profile is sent. Abbreviations and similar packaging do not establish a match.</Text>
 <Button secondary label={busy?'Looking up…':'Look up catalog matches'} disabled={disabled||busy||query.trim().length<2} onPress={()=>void find()}/>
 {busy&&<Button secondary label="Cancel lookup" onPress={cancel}/>}
 {foods.map(food=><Card key={food.provider+food.id}><Heading>{food.name}</Heading><Body>{food.brand??'Brand not reported'} · {food.barcode??'No barcode'} · {food.dataType}</Body><Button label="Confirm this exact product" disabled={disabled} onPress={()=>{cancel();setFoods([]);onConfirm(food);setMessage('Catalog match confirmed by you; check any package differences below.');}}/></Card>)}
 {!!message&&<Status>{message}</Status>}</View>;
}
