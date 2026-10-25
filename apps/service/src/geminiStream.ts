import {readStreamLines} from '../../../packages/core/src/streamLines.ts';
/** Assemble only public answer/search steps; thought text/signatures never reach callers or logs. */
export async function readGeminiStream(body:ReadableStream<Uint8Array>,signal:AbortSignal,onText?:(text:string)=>void,onFirstText?:()=>void):Promise<Record<string,any>>{
 const steps=new Map<number,any>(),stopped=new Set<number>();let data:string[]=[],completed:any,created:any,first=false;
 const event=()=>{
  if(!data.length)return;const raw=data.join('\n');data=[];if(raw==='[DONE]')return;
  const e=JSON.parse(raw),type=e.event_type;
  if(completed)throw Error('gemini_event_after_completion');
  if(type==='error')throw Error('gemini_stream_error');
  if(type==='interaction.created'){created=e.interaction;return;}
  if(type==='interaction.completed'){
   if(e.interaction?.status!=='completed')throw Error('gemini_incomplete');
   completed=e.interaction;return;
  }
  if(type==='interaction.status_update'){
   if(['failed','cancelled','incomplete','requires_action'].includes(e.status))throw Error('gemini_incomplete');
   if(e.status==='completed')completed={...created,status:'completed',usage:e.usage};return;
  }
  if(!['step.start','step.delta','step.stop'].includes(type))return;
  if(!Number.isInteger(e.index)||e.index<0||e.index>127)throw Error('gemini_step_index');
  if(type==='step.start'){
   if(steps.has(e.index))throw Error('gemini_duplicate_step');
   const {signature:_signature,...step}=e.step??{};
   steps.set(e.index,step.type==='thought'?{type:'thought'}:step);return;
  }
  const step=steps.get(e.index);if(!step||stopped.has(e.index))throw Error('gemini_step_order');
  if(type==='step.stop'){stopped.add(e.index);return;}
  const d=e.delta;
  if(step.type==='thought')return;
  if(step.type==='model_output'&&d?.type==='text'){
   if(typeof d.text!=='string')throw Error('gemini_invalid_text');
   if(!first&&d.text.length){first=true;onFirstText?.();}
   step.content??=[{type:'text',text:'',annotations:[]}];step.content[0].text+=d.text;
   if(step.content[0].text.length>250000)throw Error('gemini_answer_limit');
   onText?.(step.content[0].text);return;
  }
  if(step.type==='model_output'&&d?.type==='url_citation'){
   step.content??=[{type:'text',text:'',annotations:[]}];step.content[0].annotations.push(d);return;
  }
  if(d?.type==='google_search_call'&&step.type===d.type){step.arguments=d.arguments;return;}
  if(d?.type==='google_search_result'&&step.type===d.type){step.result=d.result;step.is_error=d.is_error;return;}
 };
 await readStreamLines(body,signal,line=>{if(!line)event();else if(line.startsWith('data:'))data.push(line.slice(5).trimStart());},3000000);event();signal.throwIfAborted();
 if(!completed)throw Error('gemini_missing_completion');
 const assembled=[...steps.entries()].sort((a,b)=>a[0]-b[0]).map(([,s])=>s).filter(s=>s.type!=='thought');
 if([...steps.keys()].some(i=>!stopped.has(i)))throw Error('gemini_unclosed_step');
 // Some API versions include the full final answer. It must match the streamed public text.
 if(Array.isArray(completed.steps)){
  const text=(list:any[])=>list.filter(s=>s.type==='model_output').flatMap(s=>s.content??[]).filter(c=>c.type==='text').map(c=>c.text).join('');
  if(text(completed.steps)!==text(assembled))throw Error('gemini_completion_mismatch');
  return {...completed,steps:completed.steps.filter((s:any)=>s.type!=='thought')};
 }
 return {...created,...completed,steps:assembled};
}

const incomplete=Symbol('incomplete');
/** Read complete JSON values only. Never repair/truncate a number or guess missing closing braces. */
export function partialGroceryAnswer(text:string):{title?:string;product?:unknown;alternatives:unknown[]}{
 const result:{title?:string;product?:unknown;alternatives:unknown[]}={alternatives:[]};let i=0,count=0;
 const ws=()=>{while(/\s/.test(text[i]??'')&&i<text.length)i++;};
 const capture=(path:(string|number)[],value:unknown)=>{
  if(path.length===2&&path[0]==='product'&&path[1]==='title'&&typeof value==='string')result.title=value;
  if(path.length===1&&path[0]==='product')result.product=value;
  if(path.length===2&&path[0]==='alternatives'&&typeof path[1]==='number')result.alternatives.push(value);
 };
 const string=():string=>{const start=i++;let escaped=false;
  while(i<text.length){const c=text[i++];if(!escaped&&c==='"')return JSON.parse(text.slice(start,i));if(!escaped&&c==='\\')escaped=true;else escaped=false;}throw incomplete;
 };
 const value=(path:(string|number)[]):unknown=>{
  ws();if(i>=text.length)throw incomplete;if(path.length>16||++count>3000)throw Error('json_limit');
  const c=text[i];let out:unknown;
  if(c==='"')out=string();
  else if(c==='{'||c==='['){
   const array=c==='[',container:any=array?[]:Object.create(null),keys=new Set<string>();i++;ws();
   if(text[i]===(array?']':'}'))i++;
   else for(;;){
    ws();let key:string|number;
    if(array)key=container.length;else {if(i>=text.length)throw incomplete;if(text[i]!=='"')throw Error('json_key');key=string();if(keys.has(key))throw Error('json_duplicate_key');keys.add(key);ws();if(i>=text.length)throw incomplete;if(text[i++]!==':')throw Error('json_colon');}
    container[key]=value([...path,key]);ws();if(i>=text.length)throw incomplete;
    const delimiter=text[i++];if(delimiter===(array?']':'}'))break;if(delimiter!==',')throw Error('json_separator');
   }
   out=container;
  }else{
   const start=i;while(i<text.length&&!/[\s,\]}]/.test(text[i]))i++;
   if(i===text.length)throw incomplete;out=JSON.parse(text.slice(start,i));
  }
  capture(path,out);return out;
 };
 try{value([]);ws();if(i<text.length)throw Error('json_trailing');}catch(error){if(error!==incomplete)return {alternatives:[]};}
 return result;
}
