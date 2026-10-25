import {buildAiReviewRequest} from './aiFoodReviewProvider.ts';
import {CLAUDE_PHOTO_MODEL} from '../../../packages/core/src/dualAiFoodReview.ts';
import {readStreamLines} from '../../../packages/core/src/streamLines.ts';
import {PhotoStreamFailure} from './photoStreamTransport.ts';
import type {ServerTimingStage} from './scanTiming.ts';

// Anthropic does not accept OpenAI's length/item constraints and caps nullable
// grammar parameters. Reuse identical definitions; the common Zod validator still
// enforces every original field, range and count after decoding.
export function claudeReviewSchema(schema:Record<string,unknown>){
 const defs:Record<string,unknown>={},seen=new Map<string,string>();
 const adapt=(value:unknown,root=false):unknown=>{
  if(Array.isArray(value))return value.map(item=>adapt(item));
  if(!value||typeof value!=='object')return value;
  const row=value as Record<string,unknown>,out:Record<string,unknown>={};
  for(const [key,child] of Object.entries(row)){
   if(['minLength','maxLength','maxItems','minimum','maximum','multipleOf'].includes(key))continue;
   // "properties" is a field map, not a schema node.
   out[key]=key==='properties'?Object.fromEntries(Object.entries(child as Record<string,unknown>).map(([k,v])=>[k,adapt(v)])):adapt(child);
  }
  if(!root&&(out.type==='object'||Array.isArray(out.anyOf))){
   const signature=JSON.stringify(out);let name=seen.get(signature);
   if(!name){name='shape'+seen.size;seen.set(signature,name);defs[name]=out;}
   return {$ref:'#/$defs/'+name};
  }
  return out;
 };
 const root=adapt(schema,true) as Record<string,unknown>;
 return {...root,$defs:defs};
}

export function buildClaudeReviewRequest(image:string){
 const same=buildAiReviewRequest(image);
 return {model:CLAUDE_PHOTO_MODEL,max_tokens:same.max_output_tokens,
  system:same.instructions,thinking:{type:'disabled'},service_tier:'standard_only',
  messages:[{role:'user',content:[{type:'text',text:same.input[0].content[0].text},
   {type:'image',source:{type:'base64',media_type:'image/jpeg',data:image}}]}],
  output_config:{format:{type:'json_schema',schema:claudeReviewSchema(same.text.format.schema)}},
 };
}
/** One image request, no tools/retries; adapt only completed text to the common parser envelope. */
export function createClaudePhotoTransport(key:string,fetcher:typeof fetch=fetch,timeoutMs=60000){
 if(!key.startsWith('sk-ant-')||key.length>1000||/\s/.test(key))throw Error('Claude server key required.');
 return async(request:Record<string,unknown>,parent:AbortSignal,onText?:(text:string)=>void,onTiming?:(stage:ServerTimingStage)=>void)=>{
  const timing=(stage:ServerTimingStage)=>{try{onTiming?.(stage);}catch{}};
  const signal=AbortSignal.any([parent,AbortSignal.timeout(timeoutMs)]);
  let usage:Record<string,unknown>={};
  let text='',data:string[]=[],started=false,block=false,blockEnded=false,finished=false,stop=false;
  const body=JSON.stringify({...request,stream:true});timing('model_dispatch');
  const response=await fetcher('https://api.anthropic.com/v1/messages',{method:'POST',signal,redirect:'error',
   headers:{'x-api-key':key,'anthropic-version':'2023-06-01','Content-Type':'application/json'},body});
  timing('model_headers');
  if(response.status!==200||response.redirected||!response.headers.get('content-type')?.startsWith('text/event-stream')||!response.body){
   void response.body?.cancel().catch(()=>{});throw new PhotoStreamFailure('claude_http_'+response.status);
  }
  const event=()=>{
   if(!data.length)return;const e=JSON.parse(data.join('\n'));data=[];
   if(finished)throw new PhotoStreamFailure('claude_after_completion');
   if(e.type==='ping')return;
   if(e.type==='message_start'){
    if(started||e.message?.role!=='assistant'||e.message?.model!==CLAUDE_PHOTO_MODEL)throw new PhotoStreamFailure('claude_invalid_start');
    started=true;usage={...(e.message?.usage??{})};
   }else if(e.type==='content_block_start'){
    if(!started||block||blockEnded||e.index!==0||e.content_block?.type!=='text'||e.content_block?.text!=='')throw new PhotoStreamFailure('claude_invalid_block');
    block=true;
   }else if(e.type==='content_block_delta'){
    if(!block||blockEnded||e.index!==0||e.delta?.type!=='text_delta'||typeof e.delta.text!=='string')throw new PhotoStreamFailure('claude_invalid_delta');
    if(!text&&e.delta.text)timing('model_first_text');text+=e.delta.text;
    if(text.length>200000)throw new PhotoStreamFailure('claude_text_limit');onText?.(text);
   }else if(e.type==='content_block_stop'){
    if(!block||blockEnded||e.index!==0)throw new PhotoStreamFailure('claude_invalid_stop');blockEnded=true;
   }else if(e.type==='message_delta'){
    if(!blockEnded||stop||e.delta?.stop_reason!=='end_turn')throw new PhotoStreamFailure('claude_incomplete_or_refused');stop=true;usage={...usage,...(e.usage??{})};
   }else if(e.type==='message_stop'){
    if(!started||!blockEnded||!stop||!text)throw new PhotoStreamFailure('claude_missing_completion');finished=true;
   }else throw new PhotoStreamFailure('claude_stream_failed');
  };
  try{
   await readStreamLines(response.body,signal,line=>{if(!line)event();else if(line.startsWith('data:'))data.push(line.slice(5).trimStart());},1048576);
   event();signal.throwIfAborted();if(!finished)throw new PhotoStreamFailure('claude_missing_completion');
   return JSON.stringify({status:'completed',usage,output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text}]}]});
  }finally{text='';data=[];}
 };
}
