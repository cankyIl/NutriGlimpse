import {useState} from 'react';
import {Linking,Text,TextInput,View} from 'react-native';
import {comparePublishedReference,guidanceLibrary,type PlanReference as Reference,type PublicFood} from '@grocery/core';
import {Body,Button,Card,Chip,Heading,Status,s} from './components';
const n=(value:number)=>Number(value.toFixed(1)).toString();
export function PlanReference({food,now}:{food:PublicFood;now:number}){
 const [expanded,setExpanded]=useState(false);
 const [choice,setChoice]=useState<'none'|'dash1500'|'dash2300'|'dga'>('none');
 const [energy,setEnergy]=useState(''),[message,setMessage]=useState('');
 const grams=food.servingGrams??100;
 const reference:Reference=choice==='dga'?{kind:'dga-saturated-fat',dailyEnergyKcal:/^\d{4}$/.test(energy)?Number(energy):NaN}:{kind:'dash-sodium',milligrams:choice==='dash1500'?1500:2300};
 const result=choice==='none'?null:comparePublishedReference(food,grams,reference,now);
 return <Card><Heading>Published references</Heading><Button secondary label={expanded?'Hide reference calculator':'Compare with DASH or federal guidance'} onPress={()=>setExpanded(!expanded)}/>{expanded&&<><Body>No target is selected automatically. These calculations do not say whether this product suits your condition or how much you should eat.</Body>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{([['none','Off'],['dash1500','DASH: 1,500 mg sodium/day'],['dash2300','DASH: 2,300 mg sodium/day'],['dga','Federal saturated-fat reference']] as const).map(([id,label])=><Chip key={id} label={label} selected={choice===id} onPress={()=>setChoice(id)}/>)}</View>
 {choice==='dga'&&<><Body>Reference energy (kcal/day). Enter a number to explore the published 10% energy ceiling; the app does not estimate your needs.</Body><TextInput accessibilityLabel="Reference daily energy, kilocalories" value={energy} onChangeText={setEnergy} maxLength={4} keyboardType="number-pad" style={s.body} placeholder="Enter reference energy"/></>}
 {result&&(result.available?<><Body>{n(result.amount)} {result.unit} in {n(grams)} g is {n(result.percentOfReference)}% of the selected daily reference ({n(result.referenceAmount)} {result.unit}).</Body><Text style={s.small}>{food.servingGrams?'Assumes 1× listed portion.':'Uses 100 g because portion weight is missing.'} This is one food, not your day’s intake or remaining allowance. A ceiling is not an intake goal.</Text></>:<Body muted>{result.reason}</Body>)}
 {choice!=='none'&&<Button secondary label="Open this guidance source" onPress={()=>void Linking.openURL(guidanceLibrary.sources.find(source=>source.id===(choice==='dga'?'dga':'dash'))!.url).catch(()=>setMessage('Could not open this source.'))}/>}
 {!!message&&<Status>{message}</Status>}</>}
 </Card>;
}
