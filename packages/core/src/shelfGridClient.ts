import {betaCatalogUrl} from './catalogClient.ts';
import {readStreamLines} from './streamLines.ts';
import {shelfGridRequestSchema,shelfGridResultSchema,assertShelfAssociation,type ShelfGridRequest,type ShelfGridResult} from './shelfGrid.ts';
export async function reviewShelfGrid(input:ShelfGridRequest,parent:AbortSignal,fetcher:typeof fetch=fetch,onProgress?:(r:ShelfGridResult)=>void){
 const request=shelfGridRequestSchema.parse(input);if(parent.aborted)throw Error('Scan cancelled.');
 const controller=new AbortController(),abort=()=>controller.abort();parent.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,210000);
 try{
  const response=await fetcher(betaCatalogUrl+'/v1/shelf/grids',{method:'POST',redirect:'error',signal:controller.signal,headers:{'Content-Type':'application/json','Accept':'application/x-ndjson'},body:JSON.stringify(request)});
  if(!response.ok){void response.body?.cancel().catch(()=>{});throw Error(response.status===429?'Scans are busy. Finish this scan and try again shortly.':'The shelf review could not complete. Try a smaller shelf section.');}
  let result:ShelfGridResult|undefined,events=0;
  if(!response.body)throw Error('The shelf response was interrupted.');
  await readStreamLines(response.body,controller.signal,line=>{
   if(!line.trim())return;if(parent.aborted||controller.signal.aborted)throw Error('Scan cancelled.');
   if(++events>60)throw Error('Too many shelf events.');const e=JSON.parse(line);
   if(e.type==='keepalive')return;if(e.type==='error')throw Error('The shelf review could not finish. Try a smaller section.');
   if(result||!['progress','result'].includes(e.type))throw Error('Invalid shelf response.');
   const parsed=shelfGridResultSchema.parse(e.result);assertShelfAssociation(request,parsed);
   if(e.type==='result')result=parsed;else onProgress?.(parsed);
  },1500000);
  if(!result||parent.aborted||controller.signal.aborted)throw Error('The shelf review was interrupted.');
  return result;
 }finally{clearTimeout(timer);parent.removeEventListener('abort',abort);request.imageBase64='';}
}
