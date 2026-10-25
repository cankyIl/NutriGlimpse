import {useState} from 'react';
import {Text} from 'react-native';
import {router} from 'expo-router';
import {bloodPressureLabelFacts,inspectGlutenLabel,currentLabelSource,verifiedGlutenEvidence,type PublicFood,type LabelReviewMode} from '@grocery/core';
import {Body,Button,Card,Heading,s} from './components';
const num=(n:number)=>Number(n.toFixed(2)).toString();
const bandText={low:'Low by the general %DV guide',between:'Between the low and high %DV cutoffs',high:'High by the general %DV guide'};
export function LabelChecks({food,mode,now: suppliedNow}:{food:PublicFood;mode:LabelReviewMode;now:number}){
 const [initialNow]=useState(Date.now);
 const now=suppliedNow??initialNow;
 if(mode==='standard')return food.additionalNutrients?<Text style={s.small}>Additional source facts per 100 g: trans fat {food.additionalNutrients.transFatG===null?'not reported':num(food.additionalNutrients.transFatG)+' g'} · potassium {food.additionalNutrients.potassiumMg===null?'not reported':num(food.additionalNutrients.potassiumMg)+' mg'} · magnesium {food.additionalNutrients.magnesiumMg===null?'not reported':num(food.additionalNutrients.magnesiumMg)+' mg'} · calcium {food.additionalNutrients.calciumMg===null?'not reported':num(food.additionalNutrients.calciumMg)+' mg'}. Check current packaging.</Text>:null;
 if(mode==='blood-pressure'){
  const facts=bloodPressureLabelFacts(food,now);
  return <Card><Heading>Blood pressure / DASH label check</Heading>
   {!facts.fresh?<Body>Refresh this product before interpreting its label: source dates are missing or outside our freshness limits.</Body>:!facts.servingGrams?<Body>Serving weight is missing. We can compare per 100 g, but cannot classify an assumed serving.</Body>:<>
    <Text style={s.small}>Assumes 1x listed portion ({num(facts.servingGrams)} g). Percentages use FDA Daily Values for adults and children age 4+, not your personal daily allowance.</Text>
    {([{key:'sodium',label:'Sodium',unit:'mg'},{key:'saturatedFat',label:'Saturated fat',unit:'g'},{key:'potassium',label:'Potassium',unit:'mg'},{key:'magnesium',label:'Magnesium',unit:'mg'},{key:'calcium',label:'Calcium',unit:'mg'}] as const).map(({key,label,unit})=>{
     const item=facts[key];return <Body key={key}>{label}: {item?num(item.amount)+' '+unit+' · approximately '+num(item.percent)+'% DV · '+bandText[item.band]:'Not reported or insufficient source data'}</Body>;
    })}
    <Body>Trans fat: {facts.transFat===null?'Not reported':num(facts.transFat)+' g per listed portion'}. No Daily Value is established.</Body>
    {facts.transFat===0&&<Text style={s.small}>A reported 0 g can reflect label rounding; it does not prove complete absence of trans fat.</Text>}
   </>}
   <Body muted>Amounts come from {food.provider==='off'?'Open Food Facts community records':'USDA FoodData Central'}; check the package. No medical-benefit or certification badge is assigned. Kidney disease and some medicines can change potassium advice.</Body>
   <Button secondary label="Read DASH and label guidance" onPress={()=>router.push('/nutrition-guidance')}/>
  </Card>;
 }
 const verified=verifiedGlutenEvidence(food,now),reported=food.reportedLabel,evidence=food.glutenEvidence;
 const front=verified?.frontLabelText??reported?.frontLabelText??null;
 const allergen=verified?.allergenStatement??[reported?.allergenStatement,reported?.advisoryStatement].filter(Boolean).join('. ');
 const facts=inspectGlutenLabel({ingredients:food.ingredients,frontLabelText:front,allergenStatement:allergen});
 return <Card><Heading>Strict gluten-free evidence check</Heading>
  <Body>{verified?'Reviewed '+(verified.basis==='certification'?'independent certification':'manufacturer gluten-free claim')+' matches this exact product label.':evidence?.status==='verified'?'The saved review has expired or could not be verified. Refresh this product.':evidence?.reason??'No reviewed gluten-free claim matches this product yet.'}</Body>
  <Body>{facts.ingredientTerms.length?'Ingredient terms to check: '+facts.ingredientTerms.join(', ')+'.':'No listed review terms detected. This alone does not establish that the food is gluten-free.'}</Body>
  {!currentLabelSource(food,now)&&<Body>Source dates need refreshing before relying on this ingredient list.</Body>}
  {reported&&<>
   <Text style={s.small}>Community-reported label claims (unverified): {reported.frontLabelText||reported.labels.join(', ')||'Not provided'}</Text>
   <Text style={s.small}>Reported allergens: {reported.allergenStatement||reported.allergens.join(', ')||'Not provided; absence is not confirmed'}</Text>
   <Text style={s.small}>Reported cross-contact advisory: {reported.advisoryStatement||reported.traces.join(', ')||'Not provided; absence is not confirmed'}</Text>
  </>}
  {verified&&<><Text style={s.small}>Reviewed front label: {verified.frontLabelText}</Text><Text style={s.small}>Reviewed allergen/advisory panel: {verified.allergenStatement||'Reviewer recorded no declaration or advisory on the matched panel.'}</Text><Text style={s.small}>Verification expires {new Date(verified.expiresAt).toLocaleString()}; refresh to recheck withdrawals.</Text></>}
  {evidence?.sources.map(source=><Text selectable key={source.kind+source.url} style={s.small}>{source.kind==='certification'?'Certification source':'Manufacturer source'}: {source.url} · checked {source.observedAt.slice(0,10)}</Text>)}
  <Text style={s.small}>This checks documented claims; it cannot measure gluten or guarantee suitability for celiac disease. Check the exact package and your clinician’s advice.</Text>
  {!verified&&<Body muted>This product cannot pass the strict gluten-free filter. Reported tags, missing warnings and expired reviews do not qualify.</Body>}
  <Button secondary label="Read gluten-free label guidance" onPress={()=>router.push('/nutrition-guidance')}/>
 </Card>;
}
