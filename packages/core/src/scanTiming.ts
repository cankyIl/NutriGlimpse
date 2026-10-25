// TEMPORARY BETA-0 INSTRUMENTATION. Remove before Beta 1 (docs/53-beta0-scan-timing.md).
import {z} from 'zod';
const ms=z.number().int().min(0).max(180000);
export const scanTimingMarksSchema=z.object({
 photoReadyMs:ms.optional(),captureMs:ms.optional(),preparationMs:ms.optional(),ocrMs:ms.optional(),barcodeJpegMs:ms.optional(),
 photoPreviewLayoutMs:ms.optional(),identityPreviewMs:ms.optional(),identityPreviewLayoutMs:ms.optional(),
 uploadStartMs:ms.optional(),responseHeadersMs:ms.optional(),firstResultMs:ms.optional(),firstCardLayoutMs:ms.optional(),
 firstAlternativeMs:ms.optional(),secondAlternativeMs:ms.optional(),thirdAlternativeMs:ms.optional(),completedMs:ms.optional(),endedMs:ms,
}).strict();
export const scanClientTimingSchema=z.object({
 schemaVersion:z.literal(1),traceId:z.string().uuid(),appVersion:z.literal('0.1.0'),build:z.string().regex(/^\d{1,8}$/),
 outcome:z.enum(['completed','failed','cancelled']),marks:scanTimingMarksSchema,
}).strict();
export type ScanClientTiming=z.infer<typeof scanClientTimingSchema>;
export type ScanTimingMark=Exclude<keyof ScanClientTiming['marks'],'endedMs'>;
export type ScanTimingHook=(event:{stage:'uploadStartMs'|'responseHeadersMs';traceId?:string})=>void;
export function notifyScanTiming(hook:ScanTimingHook|undefined,event:Parameters<ScanTimingHook>[0]){try{hook?.(event);}catch{/* Optional diagnostics must never affect recognition. */}}
export function beta0TimingEnabled(stage:string|undefined,version:string|undefined,disabled=false){return !disabled&&stage==='beta0'&&version==='0.1.0';}
export function createScanTimingRecorder(options:{enabled:boolean;build:string;send:(value:ScanClientTiming)=>Promise<unknown>|void;now?:()=>number}){
 const clock=options.now??(()=>performance.now());const started=options.enabled?clock():0;
 const marks:Partial<ScanClientTiming['marks']>={};let traceId:string|undefined,outcome:ScanClientTiming['outcome']|undefined,done=false;
 let timer:ReturnType<typeof setTimeout>|undefined;
 const elapsed=()=>Math.round(clock()-started);
 const set=(name:ScanTimingMark,value:number)=>{if(!options.enabled||done||marks[name]!==undefined)return;if(Number.isFinite(value)&&value>=0&&value<=180000)marks[name]=Math.round(value);};
 const flush=()=>{
  if(done)return;done=true;if(timer)clearTimeout(timer);
  if(!options.enabled||!traceId||!outcome)return;
  const result=scanClientTimingSchema.safeParse({schemaVersion:1,traceId,appVersion:'0.1.0',build:options.build,outcome,marks});
  if(result.success){try{void Promise.resolve(options.send(result.data)).catch(()=>{});}catch{/* Best effort; no retry. */}}
 };
 return {
  mark(name:ScanTimingMark){if(!options.enabled||done)return;set(name,elapsed());if(name==='firstCardLayoutMs'&&outcome)flush();},
  native(values:{captureMs?:number;preparationMs?:number;ocrMs?:number;barcodeJpegMs?:number}){for(const name of ['captureMs','preparationMs','ocrMs','barcodeJpegMs'] as const){const value=values[name];if(value!==undefined)set(name,value);}},
  network(event:Parameters<ScanTimingHook>[0]){if(!options.enabled||done)return;set(event.stage,elapsed());if(event.traceId&&z.string().uuid().safeParse(event.traceId).success)traceId=event.traceId;},
  finish(value:ScanClientTiming['outcome']){if(!options.enabled||done||outcome)return;outcome=value;marks.endedMs=elapsed();if(value==='completed')set('completedMs',marks.endedMs);
   if(value!=='completed'||marks.firstResultMs===undefined||marks.firstCardLayoutMs!==undefined)flush();
   else timer=setTimeout(flush,2000); // Rendering must never wait for diagnostics.
  },
  discard(){done=true;if(timer)clearTimeout(timer);},
 };
}
