import type {IncomingMessage,ServerResponse} from 'node:http';
import {SHELF_GRID_MAX_BYTES} from '../../../packages/core/src/shelfGrid.ts';
import type {ShelfGridProvider} from './shelfGridProvider.ts';
export function shelfGridRoute(request:IncomingMessage,response:ServerResponse,provider:ShelfGridProvider|undefined){
 const fail=(status:number,code:string)=>{if(response.destroyed||response.writableEnded)return;if(response.headersSent){response.end(JSON.stringify({type:'error',code})+'\n');}else{response.writeHead(status);response.end(JSON.stringify({code}));}};
 if(request.method!=='POST'){fail(405,'METHOD_NOT_ALLOWED');return;}
 if(!provider){fail(503,'SHELF_UNAVAILABLE');return;}
 if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(String(request.headers['content-type']??''))||request.headers['content-encoding']){fail(415,'INVALID_CONTENT_TYPE');return;}
 const limit=Math.ceil(SHELF_GRID_MAX_BYTES/3)*4+20000,length=request.headers['content-length'];
 if(length&&(!/^\d+$/.test(length)||Number(length)>limit)){fail(413,'SHELF_TOO_LARGE');return;}
 const controller=new AbortController();let bytes=0,chunks:Buffer[]=[],done=false,heartbeat:ReturnType<typeof setInterval>|undefined;
 const clean=()=>{clearTimeout(timer);if(heartbeat)clearInterval(heartbeat);chunks=[];};
 const timer=setTimeout(()=>{controller.abort();done=true;clean();fail(408,'SHELF_TIMED_OUT');},195000);
 const send=(type:string,result?:unknown)=>{
  if(done||response.destroyed||response.writableEnded)return;
  if(!response.headersSent){response.setHeader('Content-Type','application/x-ndjson; charset=utf-8');response.setHeader('Cache-Control','no-store, no-transform');response.setHeader('X-Accel-Buffering','no');response.writeHead(200);response.flushHeaders();}
  response.write(JSON.stringify({type,...(result?{result}:{})})+'\n');
 };
 response.once('close',()=>{controller.abort();done=true;clean();});
 request.once('error',()=>{controller.abort();done=true;clean();fail(400,'INVALID_REQUEST');});
 request.on('data',(chunk:Buffer)=>{if(done)return;bytes+=chunk.length;if(bytes>limit){controller.abort();done=true;clean();fail(413,'SHELF_TOO_LARGE');request.resume();return;}chunks.push(chunk);});
 request.once('end',()=>{
  if(done)return;let input:unknown;
  try{input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{done=true;clean();fail(400,'INVALID_GRID');return;}chunks=[];
  heartbeat=setInterval(()=>send('keepalive'),10000);
  void provider.recognize(input,controller.signal,r=>send('progress',r)).then(result=>{
   if(done)return;send('result',result);done=true;clean();response.end();
  },error=>{if(done)return;done=true;clean();const code=error instanceof Error?error.message:'SHELF_REVIEW_FAILED';fail(code==='SHELF_BUSY'?429:code==='SHELF_BATCH_CONFLICT'?409:code==='SHELF_REVIEW_FAILED'?503:400,'SHELF_REQUEST_FAILED');});
 });
}
