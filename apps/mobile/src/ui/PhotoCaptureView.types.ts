import type {NativeSyntheticEvent,ViewProps} from 'react-native';
export type PhotoCaptureProps=ViewProps&{
 active:boolean;captureId:number;imageForAI?:boolean;timingEnabled?:boolean;
 onStatus:(event:NativeSyntheticEvent<{state:'permission'|'denied'|'ready'|'reading'|'error';message:string;captureId?:number}>)=>void;
 onPhoto:(event:NativeSyntheticEvent<{captureId:number;preparationMs?:number;timings?:{captureMs?:number;preparationMs?:number;ocrMs?:number;barcodeJpegMs?:number};page?:unknown;imageBase64?:string;barcodes?:{value:string;format:string}[]}>)=>void;
};
