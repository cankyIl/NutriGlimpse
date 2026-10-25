import { useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { router } from 'expo-router';
import { assessSample, getProduct } from '@grocery/core';
import { prepareFreshReference } from '../../../../packages/core/src/freshFood';
import { useAppState } from '../state/AppState';
import { Page, Back, Title, Body, Card, Chip, Button, Status, s } from '../ui/components';
export default function FreshFood(){
 const state=useAppState();
 const [preparation,setPreparation]=useState<'raw'|'cooked'|'unknown'>('unknown');
 const [grams,setGrams]=useState('182');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const saving=useRef(false);
 async function save(){
  if(saving.current)return;
  if(!/^\d+(\.\d+)?$/.test(grams.trim())){setMessage('Enter a positive weight in grams. A photo cannot establish weight.');return;}
  saving.current=true;setBusy(true);
  try{
   const product=prepareFreshReference(getProduct('sample-apple')!,preparation,Number(grams));
   const id=await state.saveScan(product,assessSample(product,state.profile));
   if(!id)throw Error('Not saved');
   router.replace({pathname:'/result',params:{saved:id}});
  }catch{setMessage('Choose a weight above zero and no greater than 10000 g, then retry. If storage is unavailable, your choices remain here.');}
  finally{saving.current=false;setBusy(false);}
 }
 return <Page><Back/><Title eyebrow="GENERIC FOOD REFERENCE">Confirm the food and amount.</Title>
 <Body>This fictional example represents an apple, not an exact branded product. No Nutrition Facts photo is needed. Confirm the preparation and an explicit comparison weight.</Body>
 <Card>{(['raw','cooked','unknown'] as const).map(value=><Chip key={value} label={value==='raw'?'Raw apple, no added ingredients':value==='cooked'?'Cooked or added ingredients':'Preparation unknown'} selected={preparation===value} disabled={busy} onPress={()=>setPreparation(value)}/>)}
 <Body>Comparison weight in grams · 182 g is a sample starting amount, not a weight inferred from a photo or a recommended portion.</Body>
 <TextInput accessibilityLabel="Fresh food comparison grams" editable={!busy} style={s.body} keyboardType="decimal-pad" value={grams} onChangeText={setGrams}/>
 <Body>{preparation==='raw'?'Raw reference facts will be scaled to your stated weight and labelled as estimates.':'No matching preparation evidence is available. Nutrition will stay unknown; the raw-food estimate will not be substituted.'}</Body>
 <Body>Dietary certifications and health ratings are not established by this reference.</Body><Button label="Save this fictional comparison" disabled={busy} onPress={()=>void save()}/></Card>
 {!!message&&<Status>{message}</Status>}</Page>;
}
