// TEMPORARY BETA-0 INSTRUMENTATION. Remove this module and its hooks before Beta 1.
import config from '../../app.json';
import {betaCatalogUrl} from '../../../../packages/core/src/catalogClient';
import {beta0TimingEnabled,createScanTimingRecorder,type ScanClientTiming} from '../../../../packages/core/src/scanTiming';
export const scanTimingEnabled=beta0TimingEnabled(process.env.EXPO_PUBLIC_BUILD_STAGE,config.expo.version,process.env.EXPO_PUBLIC_BETA_SCAN_TIMING==='false');
async function send(value:ScanClientTiming){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4000);
 try{const response=await fetch(betaCatalogUrl+'/v3/photos/timing',{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify(value),signal:controller.signal});await response.body?.cancel();}
 catch{/* No retry, disk storage, background queue or user-visible failure. */}finally{clearTimeout(timer);}
}
type Recorder=ReturnType<typeof createScanTimingRecorder>;
const scans=new Map<string,Recorder>();
export function beginScanTiming(token:string){
 if(!scanTimingEnabled)return;
 // Only the active scan is needed; the recorder retains numbers, never a photo/result.
 for(const entry of scans.values())entry.discard();scans.clear();
 const recorder=createScanTimingRecorder({enabled:true,build:config.expo.ios.buildNumber,send});scans.set(token,recorder);
 return recorder;
}
export function markScanLayout(token:string){scans.get(token)?.mark('firstCardLayoutMs');}
export function endScanTiming(token:string,outcome:ScanClientTiming['outcome']){scans.get(token)?.finish(outcome);}
export function discardScanTiming(token:string){scans.get(token)?.discard();scans.delete(token);}

export function markScanPreview(token:string,identity:boolean){scans.get(token)?.mark(identity?'identityPreviewLayoutMs':'photoPreviewLayoutMs');}
