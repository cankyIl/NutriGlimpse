import {useState} from 'react';
import {Image,Linking,ScrollView,Text,View} from 'react-native';
import {dietaryRatingAllowed,ratingPresentation,ratingReasons,benefitLabels,tradeoffLabels,labelRating,foodKey,verifiedAlternativeBenefits,type PhotoAssessmentResult,type FoodRating} from '../../../../packages/core/src/photoAssessment';
import type {PublicFood} from '../../../../packages/core/src/publicFood';
import {Body,Button,Card,Heading,Icon,s} from './components';
import {RetailerCheck} from './RetailerCheck';

export function RatingDot({rating}:{rating:FoodRating}){
 const presentation=ratingPresentation[rating];
 return <View accessible accessibilityLabel={'General nutrition rating: '+presentation.label} style={{flexDirection:'row',alignItems:'center',gap:10}}>
  <View style={{width:22,height:22,borderRadius:11,backgroundColor:presentation.color,borderWidth:1,borderColor:'#456045'}}/>
  <Heading>{presentation.label}</Heading>
 </View>;
}
function ProductThumbnail({food}:{food:PublicFood}){
 const [failed,setFailed]=useState(false);
 return food.image&&!failed?<View style={{gap:4}}>
  <Image source={{uri:food.image.url}} resizeMode="contain" accessibilityLabel={food.name+' package'} style={{width:64,height:80}} onError={()=>setFailed(true)}/>
  <Text accessibilityRole="link" style={s.small} onPress={()=>void Linking.openURL(food.image!.sourceUrl).catch(()=>{})}>Photo: Open Food Facts · CC BY-SA 3.0</Text>
 </View>:<Icon name="package" size={42}/>;
}
export function PhotoRating({result,restrictions,now}:{result:PhotoAssessmentResult;restrictions:readonly string[];now:number}){
 const [expanded,setExpanded]=useState<string|null>(null),food=result.foods[0];
 const fresh=!!food&&now-Date.parse(result.checkedAt)<=10*60*1000&&Date.parse(result.checkedAt)<=now+300000;
 const dietary=!!food&&dietaryRatingAllowed(food,restrictions,now);
 const rating=fresh&&dietary&&food&&labelRating(food,now).rating===result.assessment.rating?result.assessment.rating:null;
 const needed=rating==='neutral'||rating==='not_healthy';
 const alternatives=needed?result.alternatives.filter(a=>dietaryRatingAllowed(a.food,restrictions,now)&&labelRating(a.food,now).rating===a.assessment.rating&&verifiedAlternativeBenefits(food,a.food,now).length):[];
 const status=!dietary?'Your dietary requirements are not verified for this product.':!fresh?'Scan again to refresh this assessment.':
  result.assessment.status==='uncertain_product'?'Check the exact product before using its nutrition.':
  result.assessment.status==='disagreement'?'The AI assessment could not be verified. Food facts are below.':
  result.assessment.status==='ai_unavailable'?'The AI assessment is unavailable. Food facts are below.':'Some nutrition information is missing.';
 return <View style={{gap:16}}>
  <View style={{padding:16,borderRadius:18,backgroundColor:'#EFF8E9',gap:10}}>
   <Text style={s.small}>GENERAL NUTRITION RATING</Text>
   {rating?<RatingDot rating={rating}/>:<Heading>Not enough verified information</Heading>}
   {rating?result.assessment.reasons.map(code=><Body key={code}>• {ratingReasons[code]}</Body>):<Body>{status}</Body>}
   {!rating&&!!result.assessment.missing.length&&<Text style={s.small}>Needed: {result.assessment.missing.join(', ')}.</Text>}
   <Text style={s.small}>{food?.servingGrams?'Assumes 1× listed portion ('+Number(food.servingGrams.toFixed(1))+' g).':'Portion weight unavailable.'}</Text>
   {result.identity.size&&<Text style={s.small}>Package: {result.identity.size}</Text>}
   {rating&&(!needed)&&<Body>No switch suggested for this comparison.</Body>}
  </View>
  {needed&&<View style={{gap:12}}><Heading>Healthier alternatives</Heading>
   {!alternatives.length?<Body muted>No verified better alternative found. Try another product or check its nutrition label.</Body>:
    <><Text style={s.small}>Benefits compare the same {food.servingGrams} g weight. Store stock is unknown.</Text>
     <ScrollView horizontal showsHorizontalScrollIndicator accessibilityLabel="Verified healthier alternatives"><View style={{flexDirection:'row',gap:12}}>
      {alternatives.map(alt=><Card key={foodKey(alt.food)} style={{width:280}}>
       <ProductThumbnail food={alt.food}/><Heading>{alt.food.name}</Heading><Text style={s.small}>{alt.food.brand}</Text>
       <RatingDot rating={alt.assessment.rating!}/>
       {alt.benefits.map(b=><Body key={b}>• {benefitLabels[b]}.</Body>)}
       {!!alt.tradeoffs?.length&&<Text style={s.small}>Trade-off: {alt.tradeoffs.map(t=>tradeoffLabels[t].toLowerCase()).join('; ')}.</Text>}
       <Text style={s.small}>Rating per its listed portion ({alt.food.servingGrams} g).</Text>
       <Button secondary label={expanded===foodKey(alt.food)?'Hide food facts':'Food facts'} onPress={()=>setExpanded(expanded===foodKey(alt.food)?null:foodKey(alt.food))}/>
       {expanded===foodKey(alt.food)&&<><Text style={s.small}>Per 100 g: Sodium {alt.food.nutrients.sodiumMg} mg · Saturated fat {alt.food.nutrients.saturatedFatG} g · Total sugar {alt.food.nutrients.sugarsG} g · Added sugar {alt.food.nutritionExtras?.addedSugarsG} g · Fiber {alt.food.nutrients.fiberG} g · Protein {alt.food.nutritionExtras?.proteinG} g.</Text>
        <Text accessibilityRole="link" style={s.small} onPress={()=>void Linking.openURL(alt.food.sourceUrl).catch(()=>{})}>Source: {alt.food.provider==='usda'?'USDA FoodData Central':'Open Food Facts'} · {alt.food.sourceDate}</Text></>}
       <RetailerCheck food={alt.food}/>
      </Card>)}
     </View></ScrollView></>}
  </View>}
 </View>;
}
