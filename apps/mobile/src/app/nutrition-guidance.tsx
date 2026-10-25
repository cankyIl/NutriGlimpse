import {router} from 'expo-router';
import {Text} from 'react-native';
import {nutritionEducationCards,nutritionEducationPolicy} from '@grocery/core';
import {Back,Body,Button,Card,Page,Title,s} from '../ui/components';
import {EducationContent} from '../ui/NutritionEducation';
export default function NutritionGuidance(){
 return <Page><Back/><Title eyebrow="LEARN ABOUT FOOD">Food & nutrition guidance</Title>
 <Body>Practical education from ADA, CDC, MedlinePlus, Mayo Clinic, AHA, NHLBI, FDA and the Academy of Nutrition and Dietetics. These examples are not a treatment plan or a claim that a food is safe for your health needs.</Body>
 <Text style={s.small}>Source-checked {nutritionEducationPolicy.sourceCheckedOn} · Clinical applicability review pending. Personalized medical recommendations are disabled. Reading this page does not change your preferences or comparisons.</Text>
 <Button label="Explore DASH, kidney health & federal guidance" onPress={()=>router.push('/guidance-library')}/>
 {nutritionEducationCards.map(card=><Card key={card.id}><EducationContent card={card}/></Card>)}
 <Body muted>Nutrition comparisons currently show energy, total sugars, total fiber, saturated fat and sodium. Total carbohydrates, added sugars, soluble fiber, omega-3 content and glycemic index are not verified in this comparison catalog. The articles may change; source links open in your browser and need internet access. Educational text is available offline.</Body>
 </Page>;
}
