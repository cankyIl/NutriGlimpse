import {aiScanState} from './AiScanState';
import {useEffect} from 'react';
import {AppState} from 'react-native';
import {photoReviewTransfer} from './PhotoReviewState';
export function PhotoLifecycle(){useEffect(()=>{const listener=AppState.addEventListener('change',state=>{if(state==='background'){photoReviewTransfer.clear();aiScanState.clearPhoto();}});return()=>{listener.remove();photoReviewTransfer.clear();aiScanState.clear();};},[]);return null;}
