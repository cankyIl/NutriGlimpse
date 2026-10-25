// TEMPORARY BETA-0 INSTRUMENTATION. No credentials, images or product data.
import type {IncomingMessage,ServerResponse} from 'node:http';
import {scanClientTimingSchema} from '../../../packages/core/src/scanTiming.ts';
import {recordDiagnostic,type BetaDiagnostics} from './betaDiagnostics.ts';
export type ServerTimingStage='body_received'|'provider_start'|'model_dispatch'|'model_headers'|'model_first_text'|'first_result'|'model_complete'|'response_sent';
export function createServerScanTimer(enabled:boolean,audit:BetaDiagnostics|undefined,trace:string,clock:'request'|'provider',now=()=>performance.now()){
 const started=enabled?now():0,seen=new Set<ServerTimingStage>();
 return(stage:ServerTimingStage)=>{if(!enabled||seen.has(stage))return;seen.add(stage);const elapsedMs=Math.round(now()-started);
  if(elapsedMs>=0&&elapsedMs<=180000)recordDiagnostic(audit,trace,{kind:'scan_server_timing',clock,stage,elapsedMs});
 };
}
export function createScanTimingInbox(audit:BetaDiagnostics|undefined,enabled:boolean,now=()=>performance.now()){
 const pending=new Map<string,number>();let active=0;
 const prune=()=>{for(const [trace,at] of pending)if(now()-at>180000)pending.delete(trace);};
 return {
  register(trace:string){if(!enabled||!audit)return;prune();if(pending.size>=64)pending.delete(pending.keys().next().value!);pending.set(trace,now());},
  handle(request:IncomingMessage,response:ServerResponse){
   if(request.url!=='/v3/photos/timing')return false;
   const reply=(status:number)=>{if(response.writableEnded||response.destroyed)return;response.writeHead(status);response.end();};
   if(!enabled||!audit){reply(404);request.resume();return true;}
   if(request.method!=='POST'){reply(405);request.resume();return true;}
   if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(String(request.headers['content-type']??''))||request.headers['content-encoding']){reply(415);request.resume();return true;}
   if(active>=2){reply(429);request.resume();return true;}
   let text='',bytes=0,finished=false;active++;
   const finish=(status:number)=>{if(finished)return;finished=true;text='';active--;clearTimeout(timer);reply(status);};
   const timer=setTimeout(()=>{finish(408);request.resume();},4000);
   response.once('close',()=>finish(499));request.once('error',()=>finish(400));request.once('aborted',()=>finish(400));
   request.on('data',(data:Buffer)=>{if(finished)return;bytes+=data.length;if(bytes>2048){finish(413);request.resume();return;}text+=data.toString('utf8');});
   request.once('end',()=>{if(finished)return;let value;try{value=scanClientTimingSchema.safeParse(JSON.parse(text));}catch{finish(400);return;}text='';
    if(!value.success){finish(400);return;}prune();
    if(!pending.delete(value.data.traceId)){finish(404);return;}
    const {traceId,...report}=value.data;recordDiagnostic(audit,traceId,{kind:'scan_client_timing',...report});finish(204);
   });return true;
  },
 };
}
