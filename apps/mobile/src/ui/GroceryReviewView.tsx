import {Linking,Pressable,Text,View} from 'react-native';
import {type GroceryResult,type GroceryFood,estimatedGroceryFood,groceryAisleLabel} from '../../../../packages/core/src/groceryReview';
import {AiProductCard} from './AiProductCard';
import {isProductSpecificNotice} from './scanNotices';
import {SearchAttribution} from './SearchAttribution';
import {Body,Heading,s} from './components';
export function GroceryReviewView({result,photo,pending=false}:{result:GroceryResult;photo?:string;pending?:boolean}){
 const review=result.review;
 const render=(food:GroceryFood,benefits:string[],original=false,tradeoffs:string[]=[])=>{
  const source=review.sources.find(s=>s.id===food.nutrientEvidence[0]?.sourceId&&s.url);
  const imageSource=review.sources.find(s=>s.id===food.image.sourceId&&s.url);
  const storeSource=review.sources.find(s=>s.id===(food.availability.aisleSourceId??food.availability.sourceId)&&s.url);
  const aisle=groceryAisleLabel(food);
  const availability=food.availability;
  const facts={...estimatedGroceryFood(food),nutritionSource:source?.url?{url:source.url,title:source.title,checkedAt:result.checkedAt,confirmation:'model-web-search' as const}:null};
  return <AiProductCard key={food.id} food={facts} detail={food} showGeneralNotices={false} photo={original?photo:undefined} benefits={benefits}
   referenceImage={food.image.kind==='reference'&&food.image.url&&imageSource?.url?{url:food.image.url,sourceUrl:imageSource.url,title:imageSource.title}:undefined}>
   {tradeoffs.filter(isProductSpecificNotice).map(t=><Text key={t} style={s.small}>Trade-off: {t}</Text>)}
   {food.assessment.limitations.filter(isProductSpecificNotice).map(t=><Text key={t} style={s.small}>{t}</Text>)}
   {<View style={{gap:5}}>
    <Heading>Store: {availability.storeName??(pending?'Checking…':'Not identified')}</Heading>
    {!!aisle&&<Body>{aisle}</Body>}
    {storeSource?.url&&<Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(storeSource.url!).catch(()=>{})}><Text style={s.small}>Open store source ↗</Text></Pressable>}
   </View>}
  </AiProductCard>;
 };
 return <View style={{gap:16}}>
  {review.original&&render(review.original,review.original.assessment.reasons.map(r=>r.text),true)}
  {!!review.recommendations.length&&<Heading>{review.recommendationMode==='complements'?'Pairs well with':'Alternatives'}</Heading>}
  {review.recommendations.map(row=>render(row.food,row.benefits.map(b=>b.text),false,row.tradeoffs))}
  {!pending&&!!review.recommendationShortfall&&<Body muted>{review.recommendationShortfall}</Body>}
  {pending&&<Body>Checking nutrition sources and remaining alternatives…</Body>}
  <SearchAttribution html={result.grounding.searchSuggestionsHtml}/>
 </View>;
}
