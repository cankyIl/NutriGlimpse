import {useState} from 'react';
import {Text,View} from 'react-native';
import {foodIsStale,type PublicFood,type ComparisonMetric,type LabelReviewMode} from '@grocery/core';
import {productTakeaway} from '../../../../packages/core/src/productTakeaway';
import {productTitle,type PhotoAssessmentResult} from '../../../../packages/core/src/photoAssessment';
import {PhotoRating} from './PhotoRating';
import {useAppState} from '../state/AppState';
import {Body,Button,Card,Heading,s} from './components';
import {LabelChecks} from './LabelChecks';
import {CatalogAlternatives} from './CatalogAlternatives';
import {RetailerCheck} from './RetailerCheck';
import {ComparisonEducation} from './NutritionEducation';
import {PlanReference} from './PlanReference';
export function ProductFacts({food,pool,metric,automaticMetric=false,photoResult,offline,reviewMode,now,onSave}:{food:PublicFood;pool:PublicFood[];metric:ComparisonMetric;automaticMetric?:boolean;photoResult?:PhotoAssessmentResult;offline:boolean;reviewMode:LabelReviewMode;now:number;onSave:(food:PublicFood)=>void}){
 const [details,setDetails]=useState(false);const {profile}=useAppState();
 const restrictions=[...profile.restrictions,...(profile.conditions.includes('celiac')||reviewMode==='gluten'?['glutenFree']:[])];
 const summary=productTakeaway(food,restrictions,now),selectedMetric=automaticMetric?summary.metric:metric;
 const tint=summary.tone==='positive'?'#E2F5E9':summary.tone==='caution'?'#FFF0DD':'#F1F4F2';
 return <Card><Heading>{photoResult?productTitle(photoResult.identity):food.name}</Heading><Body muted>{food.brand?.trim()||'Brand not reported'}</Body>
 <>{photoResult?<PhotoRating result={photoResult} restrictions={restrictions} now={now}/>:<><View style={{gap:10,padding:16,borderRadius:16,backgroundColor:tint}}><Text style={s.small}>IS THIS A GOOD CHOICE?</Text><Heading>{summary.title}</Heading>{summary.points.map(point=><Body key={point}>• {point}</Body>)}<Text style={s.small}>{summary.portion}</Text></View>
 <CatalogAlternatives compact now={now} requireGlutenEvidence={reviewMode==='gluten'} food={food} pool={pool} metric={selectedMetric} offline={offline} onSave={onSave}/></>}</>
 <Button secondary label={details?'Hide details':'Details · nutrition, ingredients & sources'} onPress={()=>setDetails(!details)}/>
 {details&&<>
 <Body muted>{offline?'Included or saved food record':'Server food record'}{foodIsStale(food)?' · Refresh before relying on current packaging.':''}</Body>
 <Text style={s.small}>These are general food comparisons, not personalized medical recommendations. Colored ratings use a versioned beta app rubric built from label facts; they are not FDA whole-food ratings. Missing nutrients remain unknown. Health conditions, age and laboratory results do not determine these colors. Source details and reported nutrient values are below.</Text>
 <Text style={s.small}>Amounts below are per 100 g.</Text>
 {([['caloriesKcal','Energy','kcal'],['saturatedFatG','Saturated fat','g'],['fiberG','Fiber','g'],['sodiumMg','Sodium','mg'],['sugarsG','Total sugars','g']] as const).map(([field,label,unit])=><Body key={field}>{label}: {food.nutrients[field]===null?'Not reported':food.nutrients[field]+' '+unit}</Body>)}
 <Text style={s.small}>Ingredients: {food.ingredients??'Not reported'}</Text>
 {food.nutritionExtras&&([['proteinG','Protein','g'],['carbohydrateG','Carbohydrates','g'],['addedSugarsG','Added sugars','g'],['ironMg','Iron','mg'],['vitaminDMcg','Vitamin D','mcg'],['vitaminCMg','Vitamin C','mg']] as const).map(([key,label,unit])=><Body key={key}>{label}: {food.nutritionExtras![key]===null?'Not reported':food.nutritionExtras![key]+' '+unit}</Body>)}
 <LabelChecks food={food} mode={reviewMode} now={now}/>
 <ComparisonEducation food={food} metric={selectedMetric}/><PlanReference key={food.provider+food.id} food={food} now={now}/>
 <Text selectable style={s.small}>Source: {food.provider==='usda'?'USDA FoodData Central':'Open Food Facts'} · ID {food.id} · {food.license}{'\n'}Barcode: {food.barcode??'Not reported'}{'\n'}Source date: {food.sourceDate??'Not reported'}{'\n'}Retrieved: {food.retrievedAt.slice(0,10)}{'\n'}{food.sourceUrl}{'\n'}Label guide: https://www.fda.gov/food/nutrition-facts-label/lows-and-highs-percent-daily-value-nutrition-facts-label</Text>
 <Body muted>Store stock is unverified.</Body><RetailerCheck food={food}/>
 <Button secondary label="Save this food offline" onPress={()=>onSave(food)}/>
 </>}
 </Card>;
}
