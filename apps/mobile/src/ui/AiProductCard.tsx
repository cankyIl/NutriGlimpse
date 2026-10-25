import {GROCERY_NUTRIENT_ORDER} from '../../../../packages/core/src/groceryNutrientPriority';
import type {ReactNode} from 'react';
import type {GroceryFood} from '../../../../packages/core/src/groceryReview';
import type {NutritionSource} from '../../../../packages/core/src/dualAiFoodReview';
import {useEffect,useRef,useState} from 'react';
import {NearbyAvailability} from './NearbyAvailability';
import {Image,Linking,Pressable,StyleSheet,Text,View} from 'react-native';
import {checkProductSources,findProductMedia} from '../../../../packages/core/src/aiFoodClient';
import {estimatedReasons,type EstimatedFood} from '../../../../packages/core/src/aiFoodReview';
import {ratingPresentation,productTitle} from '../../../../packages/core/src/photoAssessment';
import type {PublicFood} from '../../../../packages/core/src/publicFood';
import {Body,Card,Heading,Icon,Status,s} from './components';
import {colors as c} from './theme';
const labels:Record<keyof EstimatedFood['nutrition'],string>={caloriesKcal:'Calories',saturatedFatG:'Saturated fat',transFatG:'Trans fat',sugarsG:'Total sugar',addedSugarsG:'Added sugar',carbohydrateG:'Carbohydrate',sodiumMg:'Sodium',fiberG:'Fiber',proteinG:'Protein',potassiumMg:'Potassium',calciumMg:'Calcium',ironMg:'Iron',magnesiumMg:'Magnesium'};
function amount(key:string,value:number|null|undefined){return value===null||value===undefined?'Unknown':`${Math.round(value*10)/10}${key.endsWith('Kcal')?' kcal':key.endsWith('Mg')?' mg':key.endsWith('mcg')?' mcg':' g'}`;}
function SmallAction({label,icon,onPress,disabled=false,expanded}:{label:string;icon:'file-text'|'search';onPress:()=>void;disabled?:boolean;expanded?:boolean}){return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled,expanded}} disabled={disabled} onPress={onPress} style={[styles.action,disabled&&{opacity:0.55}]}><Icon name={icon} size={14} color={c.green}/><Text style={styles.actionText}>{label}</Text></Pressable>;}
export function AiProductCard({food,photo,benefits,restricted=false,delay=0,nearby=false,labelCheck=false,reviewPending=false,detail,referenceImage,children}:{food:EstimatedFood&{nutritionSource?:Omit<NutritionSource,'model'>|null};detail?:GroceryFood;referenceImage?:{url:string;sourceUrl:string;title:string};children?:ReactNode;photo?:string;benefits?:string[];restricted?:boolean;delay?:number;nearby?:boolean;labelCheck?:boolean;reviewPending?:boolean}){
 const [expanded,setExpanded]=useState(false),[checking,setChecking]=useState(false),[sourcesVisible,setSourcesVisible]=useState(false),[sources,setSources]=useState<PublicFood[]|null>(null),[error,setError]=useState(''),[image,setImage]=useState<PublicFood['image']>(),[imageFailed,setImageFailed]=useState(false),[loadingImage,setLoadingImage]=useState(!photo&&!referenceImage);
 const mediaIdentity=JSON.stringify({...food.identity,size:null,visibleText:[]});
 const request=useRef<AbortController|null>(null),alive=useRef(true);
 useEffect(()=>{alive.current=true;const controller=new AbortController();const timer=setTimeout(()=>{setImageFailed(false);setLoadingImage(!photo&&!referenceImage);if(!photo&&!referenceImage)void findProductMedia(JSON.parse(mediaIdentity),controller.signal).then(result=>{if(!controller.signal.aborted){setImage(result.image??undefined);setLoadingImage(false);}}).catch(()=>{if(!controller.signal.aborted)setLoadingImage(false);});},delay);return()=>{alive.current=false;clearTimeout(timer);controller.abort();request.current?.abort();};},[mediaIdentity,photo,delay,referenceImage?.url]);
 async function check(){if(checking)return;if(sources!==null){setSourcesVisible(v=>!v);return;}setSourcesVisible(true);request.current?.abort();const controller=new AbortController();request.current=controller;setChecking(true);setError('');
  try{const result=await checkProductSources(food.identity,controller.signal);if(!controller.signal.aborted&&alive.current)setSources(result.foods);}
  catch(e){if(!controller.signal.aborted&&alive.current)setError(e instanceof Error?e.message:'Source check unavailable.');}
  finally{if(!controller.signal.aborted&&alive.current)setChecking(false);}
 }
 const web='nutritionSource' in food,webSource=food.nutritionSource;
 const verdict=food.rating&&!restricted&&!labelCheck&&!reviewPending?ratingPresentation[food.rating]:null;
 const uri=photo?'data:image/jpeg;base64,'+photo:referenceImage?.url??image?.url;
 return <Card><View style={styles.top}>
  {uri&&!imageFailed?<Image source={{uri}} resizeMode="contain" style={styles.image} accessibilityLabel={photo?'Your product photo':productTitle(food.identity)+' reference package photo'} onError={()=>setImageFailed(true)}/>:<View style={[styles.image,styles.placeholder]}><Icon name="package" size={26}/><Text style={styles.tiny}>{loadingImage?'Loading…':'No photo'}</Text></View>}
  <View style={{flex:1,gap:5}}><Text style={styles.brand}>{food.identity.brand??'PRODUCT'}</Text><Heading>{[food.identity.name,food.identity.variant&&!food.identity.name?.toLowerCase().includes(food.identity.variant.toLowerCase())?food.identity.variant:null].filter(Boolean).join(' ')}</Heading>{food.identity.size&&<Text style={s.small}>{food.identity.size}</Text>}
   <View style={styles.rating}>{verdict&&<View style={[styles.dot,{backgroundColor:verdict.color}]}/>}<Text style={styles.verdict}>{restricted?'Dietary check needed':reviewPending?'Review in progress':labelCheck?'Label check needed':verdict?.label??(food.identity.status==='uncertain'?'Likely product':'Not enough information to rate')}</Text></View>
   <Text style={styles.estimate}>{web?(webSource?'Nutrition found by web search':'Nutrition not confirmed'):'AI estimate · general nutrition'}</Text>
  </View></View>
 {((labelCheck||reviewPending)?[]:benefits?.length?benefits:estimatedReasons(food)).slice(0,3).map(reason=><Text key={reason} style={styles.reason}>• {reason}</Text>)}
 {restricted&&<Text style={s.small}>Your dietary requirements have not been verified for this package. Check its label before choosing it.</Text>}
 {image&&!referenceImage&&!photo&&!imageFailed&&<Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(image.sourceUrl).catch(()=>setError('Could not open the photo source.'))}><Text style={styles.tiny}>Reference photo · Open Food Facts · CC BY-SA 3.0</Text></Pressable>}
 {referenceImage&&!photo&&!imageFailed&&<Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(referenceImage.sourceUrl).catch(()=>setError('Could not open the photo source.'))}><Text style={styles.tiny}>Reference photo · {referenceImage.title}</Text></Pressable>}
 {webSource&&<Pressable accessibilityRole="link" accessibilityLabel="Open nutrition source" onPress={()=>void Linking.openURL(webSource.url).catch(()=>setError('Could not open the nutrition source.'))}><Text style={styles.actionText}>Nutrition source: {new URL(webSource.url).hostname.replace(/^www\./,'')} ↗</Text></Pressable>}
 <View style={styles.actions}><SmallAction icon="file-text" label="Food Facts" expanded={expanded} onPress={()=>setExpanded(v=>!v)}/><SmallAction icon="search" label={checking?'Checking sources…':sourcesVisible&&sources!==null?'Hide USDA / OFF':'Check USDA / OFF'} expanded={sourcesVisible} disabled={checking} onPress={()=>void check()}/></View>
 {expanded&&<View style={styles.details}><Text style={styles.section}>{web?'FOOD FACTS FROM WEB SEARCH':'ESTIMATED FOOD FACTS'}</Text><Text style={s.small}>1× portion · {food.servingText??(food.servingGrams?food.servingGrams+' g':'serving size unknown')}</Text>
  <Text style={s.small}>{web?(webSource?'Read by the model from the linked source. Checked '+webSource.checkedAt.slice(0,10)+'.':'A matching nutrition source could not be confirmed.'):'Recalled or read from the photo; not a verified nutrition label.'}</Text>
  {Object.entries(detail?{...labels,totalFatG:'Total fat',phosphorusMg:'Phosphorus',vitaminDmcg:'Vitamin D'}:labels).sort(([a],[b])=>GROCERY_NUTRIENT_ORDER.indexOf(a as keyof GroceryFood['nutrition'])-GROCERY_NUTRIENT_ORDER.indexOf(b as keyof GroceryFood['nutrition'])).map(([key,label])=><View style={styles.row} key={key}><Text style={[styles.cell,detail?.assessment.highlightNutrients.includes(key as keyof GroceryFood['nutrition'])&&{fontWeight:'700'}]}>{label}</Text><Text style={styles.value}>{amount(key,detail?detail.nutrition[key as keyof GroceryFood['nutrition']]:food.nutrition[key as keyof EstimatedFood['nutrition']])}</Text></View>)}
  <Text style={styles.section}>INGREDIENTS</Text><Text style={s.small}>{food.ingredients??'Not available. Check the package.'}</Text><Text style={styles.tiny}>Estimated ingredients do not establish allergens or certifications.</Text>
 </View>}
 {sourcesVisible&&sources!==null&&<View style={styles.details}><Text style={styles.section}>USDA / OPEN FOOD FACTS CHECK</Text><Body muted>{sources.length?'Possible database matches. Confirm brand, flavor and size against your package. These records do not replace the food facts above.':'No matching source record was found. The food facts above are unchanged.'}</Body>
  {sources.map(source=><View key={source.provider+source.id} style={styles.source}><Text style={styles.sourceName}>{source.brand} · {source.name}</Text><Text style={styles.tiny}>{source.provider==='usda'?'USDA FoodData Central':'Open Food Facts'} · {source.sourceDate??'Source date unavailable'} · per 100 g</Text>
   {Object.entries({...source.nutrients,...source.nutritionExtras,...source.additionalNutrients}).filter(([key])=>key in labels).map(([key,value])=><View key={key} style={styles.row}><Text style={styles.cell}>{labels[key as keyof typeof labels]}</Text><Text style={styles.value}>{amount(key,value)}</Text></View>)}
   <Text style={styles.tiny}>Ingredients: {source.ingredients??'Not reported'}</Text><Text style={styles.tiny}>Allergens and dietary suitability require a package check.</Text>
   <Pressable accessibilityRole="link" onPress={()=>void Linking.openURL(source.sourceUrl).catch(()=>setError('Could not open the source.'))}><Text style={styles.actionText}>Open source record ↗</Text></Pressable>
  </View>)}
 </View>}
 {children}
 {nearby&&<NearbyAvailability identity={food.identity}/>}
 {!!error&&<Status>{error}</Status>}
 </Card>;
}
const styles=StyleSheet.create({top:{flexDirection:'row',gap:14,alignItems:'flex-start'},image:{width:64,height:86,borderRadius:10,backgroundColor:c.background},placeholder:{alignItems:'center',justifyContent:'center',gap:5},brand:{fontSize:11,fontWeight:'700',color:c.muted,letterSpacing:1},rating:{flexDirection:'row',alignItems:'center',gap:7,flexWrap:'wrap'},dot:{width:12,height:12,borderRadius:6},verdict:{color:c.ink,fontSize:16,fontWeight:'700',flexShrink:1},estimate:{color:c.muted,fontSize:12},reason:{color:c.ink,fontSize:15,lineHeight:21},actions:{flexDirection:'row',flexWrap:'wrap',gap:8},action:{borderWidth:1,borderColor:c.line,borderRadius:12,minHeight:44,paddingHorizontal:10,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:5},actionText:{color:c.green,fontWeight:'700',fontSize:12,flexShrink:1},details:{gap:10,borderTopWidth:1,borderColor:c.line,paddingTop:15},section:{fontSize:11,letterSpacing:1,color:c.green,fontWeight:'800'},row:{flexDirection:'row',justifyContent:'space-between',gap:12,borderBottomWidth:1,borderColor:c.line,paddingVertical:5},cell:{flex:1,color:c.ink,fontSize:14},value:{color:c.ink,fontSize:14,fontWeight:'600'},tiny:{fontSize:10,color:c.muted,lineHeight:15},source:{gap:8,paddingTop:10},sourceName:{fontWeight:'700',color:c.ink,fontSize:15}});
