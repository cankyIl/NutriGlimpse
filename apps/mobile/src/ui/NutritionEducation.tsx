import {useState} from 'react';
import {Linking,Text,View} from 'react-native';
import {router} from 'expo-router';
import {nutritionSources,comparisonEducation,type EducationCard,type PublicFood,type ComparisonMetric} from '@grocery/core';
import {Body,Button,Card,Heading,Status,s} from './components';
export function EducationContent({card}:{card:EducationCard}){
 const [error,setError]=useState(false);
 return <View style={{gap:12}}><Heading>{card.title}</Heading><Body>{card.text}</Body>
 {card.sources.map(id=><Button key={id} secondary label={'Read '+nutritionSources[id].title} onPress={()=>{setError(false);void Linking.openURL(nutritionSources[id].url).catch(()=>setError(true));}}/>)}
 {error&&<Status>Could not open the source. Check your connection and try again.</Status>}
 </View>;
}
export function ComparisonEducation({food,metric}:{food:PublicFood;metric:ComparisonMetric}){
 return <Card><Text style={s.small}>GENERAL EDUCATION · NOT A PERSONAL RECOMMENDATION</Text>
 {comparisonEducation(food,metric).map(card=><EducationContent key={card.id} card={card}/>)}
 <Text style={s.small}>Food-group examples do not certify this product or override dietary restrictions. Check current packaging and all nutrient trade-offs.</Text>
 <Button secondary label="Explore food & nutrition guidance" onPress={()=>router.push('/nutrition-guidance')}/>
 </Card>;
}
