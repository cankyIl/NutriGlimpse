import type {PreparedReportSource} from './reportInput';
export async function prepareFoodSource(_kind:'camera'|'document',_signal:AbortSignal):Promise<PreparedReportSource|null>{
 throw Error('Local label and receipt input requires an installed phone build and device privacy acceptance.');
}
