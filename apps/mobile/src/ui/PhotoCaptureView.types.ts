import type {NativeSyntheticEvent,ViewProps} from 'react-native';
export type PhotoCaptureProps=ViewProps&{
 active:boolean;captureId:number;imageForAI?:boolean;
 onStatus:(event:NativeSyntheticEvent<{state:'permission'|'denied'|'ready'|'reading'|'error';message:string;captureId?:number}>)=>void;
 onPhoto:(event:NativeSyntheticEvent<{captureId:number;page?:unknown;imageBase64?:string;barcodes?:{value:string;format:string}[]}>)=>void;
};
