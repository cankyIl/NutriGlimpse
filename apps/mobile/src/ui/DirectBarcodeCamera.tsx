import {BarcodeInput} from './BarcodeInput';
export function DirectBarcodeCamera({onLookup}:{onLookup:(barcode:string)=>void}){return <BarcodeInput onLookup={onLookup}/>;}
