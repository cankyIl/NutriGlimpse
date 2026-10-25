import {RetailerCheck} from './RetailerCheck';
import {PlanReference} from './PlanReference';
import {useState} from 'react';
import {ComparisonEducation} from './NutritionEducation';
import {ScrollView,Text,View} from 'react-native';
import {comparableAlternatives,verifiedGlutenEvidence,comparisonMetrics,nutrientUnits,comparisonReady,type ComparisonMetric,type PublicFood} from '@grocery/core';
import {useAppState} from '../state/AppState';
import {useShoppingStore} from '../state/StoreContext';
import {Body,Button,Card,Heading,Icon,s} from './components';
const labels={...comparisonMetrics,caloriesKcal:'Energy'};
const num=(n:number)=>Number(n.toFixed(2)).toString();
export function CatalogAlternatives({food,pool,metric,offline,onSave,requireGlutenEvidence=false,retailerName,now: suppliedNow,compact=false}:{compact?:boolean;retailerName?:string;now:number;requireGlutenEvidence?:boolean;food:PublicFood;pool:PublicFood[];metric:ComparisonMetric;offline:boolean;onSave:(food:PublicFood)=>void}){
 const [initialNow]=useState(Date.now);
 const now=suppliedNow??initialNow;
 const {profile}=useAppState();const shopping=useShoppingStore();
 const restrictions=[...profile.restrictions,...(profile.conditions.includes('celiac')||requireGlutenEvidence?['glutenFree']:[])];
 const alternatives=comparableAlternatives(food,pool,metric,restrictions,now);
 const grams=food.servingGrams??100,scale=grams/100;
 return <View style={{gap:12}}><Heading>{compact?'Alternatives to consider':'Comparable alternatives'}</Heading>
 <Text style={s.small}>{food.servingGrams?'Comparison assumes 1x listed portion ('+num(grams)+' g) of your original food; alternatives use the same weight.':'Compared per 100 g because the original portion weight is not reported.'}</Text>
 {restrictions.some(r=>r!=='glutenFree')?<Body muted>No compatible suggestions: this catalog does not verify all your required dietary restrictions.</Body>:!comparisonReady(food,now)?<Body muted>Not enough current, comparable label data for alternatives yet.</Body>:alternatives.length===0?<Body muted>No qualifying {metric==='fiberG'?'higher':'lower'} {comparisonMetrics[metric].toLowerCase()} options in {offline?'your saved foods':'this catalog'}. {restrictions.includes('glutenFree')?' A current reviewed certification or manufacturer gluten-free claim is required.':''} Other products may exist.</Body>:<ScrollView horizontal showsHorizontalScrollIndicator accessibilityLabel="Comparable product alternatives"><View style={{flexDirection:'row',gap:12}}>{alternatives.map(({food:candidate,tradeoffs})=><Card key={candidate.provider+candidate.id} style={{width:280}}>
 <Icon name="package" size={28}/><Heading>{candidate.name}</Heading><Text style={s.small}>{candidate.brand||'Brand not reported'}</Text>
 {restrictions.includes('glutenFree')&&<Text style={s.small}>Gluten-free evidence: reviewed {verifiedGlutenEvidence(candidate,now)?.basis==='certification'?'independent certification':'manufacturer claim'}. Match the current package.</Text>}
 <Body>{comparisonMetrics[metric]}: {num(food.nutrients[metric]!*scale)} → {num(candidate.nutrients[metric]!*scale)} {nutrientUnits[metric]}</Body>
 {tradeoffs.length>0?<Text style={s.small}>Trade-offs: {tradeoffs.map(k=>labels[k]+': '+num(food.nutrients[k]!*scale)+' → '+num(candidate.nutrients[k]!*scale)+' '+nutrientUnits[k]).join('; ')}.</Text>:<Text style={s.small}>No worse on the other four recorded nutrition measures at this weight.</Text>}
 <Text style={s.small}>{(retailerName||shopping.selected)?'Availability at '+(retailerName??shopping.selected?.name)+': unknown.':'Store availability unknown.'} Check the exact product and label.</Text>
 {!compact&&<Text style={s.small}>{candidate.provider==='usda'?'USDA':'Open Food Facts'} {candidate.id} · Barcode {candidate.barcode}{'\n'}Source date: {candidate.sourceDate??'Not reported'}{'\n'}{candidate.sourceUrl}</Text>}
 <RetailerCheck food={candidate} retailerName={retailerName}/>
 {!compact&&<Button secondary label="Save this alternative offline" onPress={()=>onSave(candidate)}/>}
 </Card>)}</View></ScrollView>}
 {!compact&&<><ComparisonEducation food={food} metric={metric}/><PlanReference key={food.provider+food.id} food={food} now={now}/></>}
 </View>;
}
