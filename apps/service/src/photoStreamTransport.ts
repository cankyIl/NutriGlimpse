import type {ServerTimingStage} from './scanTiming.ts';
import {readStreamLines} from '../../../packages/core/src/streamLines.ts';
export class PhotoStreamFailure extends Error {readonly code:string;constructor(code:string){super(code);this.code=code;}}
/** One paid request. Only complete validated foods will leave the service. */
export function createPhotoStreamTransport(apiKey:string,fetcher:typeof fetch=fetch,timeoutMs=60000){
 if(!apiKey||apiKey.length>1000||/\s/.test(apiKey))throw Error('Server API key is required.');
 return async(request:Record<string,unknown>,parent:AbortSignal,onText?:(text:string)=>void,onTiming?:(stage:ServerTimingStage)=>void)=>{
  const timing=(stage:ServerTimingStage)=>{try{onTiming?.(stage);}catch{}};
  const signal=AbortSignal.any([parent,AbortSignal.timeout(timeoutMs)]);let text='',completed:string|undefined,failed=false,eventData:string[]=[];
  const web=Array.isArray(request.tools)&&request.tools.some(t=>t?.type==='web_search'),texts=new Map<number,string>();
  const body=JSON.stringify({...request,stream:true});timing('model_dispatch');
  const response=await fetcher('https://api.openai.com/v1/responses',{method:'POST',redirect:'error',signal,headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body});timing('model_headers');
  if(response.status!==200||response.redirected||!response.headers.get('content-type')?.startsWith('text/event-stream')||!response.body){void response.body?.cancel().catch(()=>{});throw new PhotoStreamFailure(response.status!==200?'provider_http_'+response.status:'provider_stream_unavailable');}
  const event=()=>{if(!eventData.length)return;const raw=eventData.join('\n');eventData=[];if(raw==='[DONE]')return;
   const e=JSON.parse(raw);if(completed)throw new PhotoStreamFailure('provider_unexpected_event');
   if(e.type==='response.output_text.delta'){
    if(failed||typeof e.delta!=='string'||e.content_index!==0)throw new PhotoStreamFailure('provider_invalid_text');
    if(!text&&e.delta.length)timing('model_first_text');
    if(web){if(!Number.isInteger(e.output_index)||e.output_index<0)throw new PhotoStreamFailure('provider_invalid_text');text=(texts.get(e.output_index)??'')+e.delta;texts.set(e.output_index,text);}
    else text+=e.delta;
    if(text.length>200000)throw new PhotoStreamFailure('provider_text_limit');
    if(!web||text.trimStart().startsWith('{'))onText?.(text);
   }else if(['error','response.failed','response.incomplete','response.refusal.delta','response.refusal.done'].includes(e.type)){failed=true;throw new PhotoStreamFailure('provider_incomplete_or_refused');}
   else if(e.type==='response.completed'){
    const messages=e.response?.output?.filter((x:{type:string})=>x.type==='message');
    if(web){
     const final=messages?.at(-1),part=final?.content?.find((x:{type:string})=>x.type==='output_text');
     const index=e.response?.output?.indexOf(final);
     if(failed||e.response?.status!=='completed'||final?.status!=='completed'||!part||part.text!==texts.get(index))throw new PhotoStreamFailure('provider_completion_mismatch');
    }else if(failed||e.response?.status!=='completed'||messages?.length!==1||messages[0].content?.length!==1||messages[0].content[0].type!=='output_text'||messages[0].content[0].text!==text)throw new PhotoStreamFailure('provider_completion_mismatch');
    completed=JSON.stringify(e.response);
   }
  };
  try{await readStreamLines(response.body,signal,line=>{if(line==='')event();else if(line.startsWith('data:'))eventData.push(line.slice(5).trimStart());},web?3000000:1048576);event();signal.throwIfAborted();if(!completed)throw new PhotoStreamFailure('provider_missing_completion');return completed;}
  finally{text='';eventData=[];texts.clear();}
 };
}
