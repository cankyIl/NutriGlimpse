import {useState} from 'react';
import * as Linking from 'expo-linking';
import {Body,Button,Card,Heading} from './components';
export function CatalogCredits(){
 const [error,setError]=useState('');
 function open(url:string){setError('');void Linking.openURL(url).catch(()=>setError('Could not open the link. Try again when connected.'));}
 return <Card><Heading>Sources and reuse</Heading><Body muted>Contains information from Open Food Facts, available under the Open Database License (ODbL), and USDA FoodData Central (CC0). Community data may be incomplete; check the package.</Body>
 <Button secondary label="Open Food Facts" onPress={()=>open('https://world.openfoodfacts.org')}/>
 <Button secondary label="Read the Open Database License" onPress={()=>open('https://opendatacommons.org/licenses/odbl/1-0/')}/>
 <Button secondary label="Sources and free catalog download" onPress={()=>open('https://grocery.serveforwad.com/data-sources')}/>
 {!!error&&<Body>{error}</Body>}</Card>;
}
