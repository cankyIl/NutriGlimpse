import {router} from 'expo-router';
import {DirectBarcodeCamera} from '../ui/DirectBarcodeCamera';
import {Back,Page,Title} from '../ui/components';
export default function BarcodeCamera(){return <Page><Back/><Title>Barcode Camera</Title><DirectBarcodeCamera onLookup={barcode=>router.replace({pathname:'/catalog',params:{barcode,scan:'1'}})}/></Page>;}
