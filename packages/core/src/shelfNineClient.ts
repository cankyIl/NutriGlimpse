import {betaCatalogUrl} from './catalogClient.ts';
import {readStreamLines} from './streamLines.ts';
import {shelfNineRequestSchema,shelfNineResultSchema,assertNineAssociation,type ShelfNineRequest,type ShelfNineResult} from './shelfNine.ts';
export async function reviewShelfNine(input:ShelfNineRequest,parent:AbortSignal,fetcher:typeof fetch=fetch,onProgress?:(r:ShelfNineResult)=>void){
 // React Native uses abort-controller: check aborted rather than the newer throwIfAborted API.
 const request=shelfNineRequestSchema.parse(input),controller=new AbortController();
 if(parent.aborted)throw Error('Shelf scan cancelled.');const abort=()=>controller.abort();parent.addEventListener('abort',abort,{once:true});const timer=setTimeout(abort,210000);
 try{
  const response=await fetcher(betaCatalogUrl+'/v2/shelf/grids',{method:'POST',redirect:'error',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(request)});
  if(!response.ok){void response.body?.cancel().catch(()=>{});throw Error(response.status===429?'Shelf reviews are busy. Try again shortly.':'This shelf batch could not be checked.');}
  if(!response.body)throw Error('Shelf response interrupted.');
  let result:ShelfNineResult|undefined,events=0;
  await readStreamLines(response.body,controller.signal,line=>{
   if(!line.trim())return;if(++events>100)throw Error('Too many shelf events.');
   const e=JSON.parse(line);if(e.type==='keepalive')return;
   if(e.type==='error')throw Error('This shelf batch could not finish.');
   if(result||!['progress','result'].includes(e.type))throw Error('Invalid shelf response.');
   const value=shelfNineResultSchema.parse(e.result);assertNineAssociation(request,value);
   if(e.type==='result'){if(!value.complete)throw Error('Incomplete shelf result.');result=value;}else onProgress?.(value);
  },1500000);
  if(parent.aborted)throw Error('Shelf scan cancelled.');if(!result)throw Error('Shelf response interrupted.');return result;
 }finally{clearTimeout(timer);parent.removeEventListener('abort',abort);request.imageBase64='';}
}
