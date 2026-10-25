/** Bounded UTF-8 line reader for NDJSON/SSE, including native split-byte chunks. */
export async function readStreamLines(body:ReadableStream<Uint8Array>,signal:AbortSignal,onLine:(line:string)=>void,maxBytes=524288){
 const reader=body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let buffer='',bytes=0;
 const abort=()=>{void reader.cancel().catch(()=>{});};signal.addEventListener('abort',abort,{once:true});
 try{
  for(;;){
   if(signal.aborted)throw Error('Stream cancelled');const next=await reader.read();
   if(signal.aborted)throw Error('Stream cancelled');if(next.done)break;
   bytes+=next.value.byteLength;if(bytes>maxBytes)throw Error('Stream too large');
   buffer+=decoder.decode(next.value,{stream:true});let newline;
   while((newline=buffer.indexOf('\n'))>=0){onLine(buffer.slice(0,newline).replace(/\r$/,''));buffer=buffer.slice(newline+1);}
  }
  buffer+=decoder.decode();if(buffer)onLine(buffer.replace(/\r$/,''));
 }finally{signal.removeEventListener('abort',abort);await reader.cancel().catch(()=>{});reader.releaseLock();}
}
