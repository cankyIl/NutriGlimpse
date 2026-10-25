import {requirePersonalCapture} from '../../../../packages/core/src/captureGate';
import {prepareReportSource} from './reportInput.native';
/** Reuses the bounded native staging/cleanup journal. General media acceptance is a separate release gate. */
export async function prepareFoodSource(kind:'camera'|'document',signal:AbortSignal){
 requirePersonalCapture(); // Must execute before permissions, picker or native staging.
 return prepareReportSource(kind,signal);
}
