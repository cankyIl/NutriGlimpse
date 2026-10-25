import {requireNativeView} from 'expo';
import type {PhotoCaptureProps} from './PhotoCaptureView.types';
export const PhotoCaptureView=requireNativeView<PhotoCaptureProps>('PrivateInput');
export const photoCameraAvailable=true;
