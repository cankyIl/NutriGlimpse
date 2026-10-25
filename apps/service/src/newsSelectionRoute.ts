import type {IncomingMessage,ServerResponse} from 'node:http';
import {newsRequestSchema,buildNewsSelection} from '../../../packages/core/src/newsSelection.ts';
import type {NewsPool} from '../../../packages/core/src/newsPersonalization.ts';
/** Transient bounded news-interest request. No health/profile logging, disk writes, upstream calls or shared personalized cache. */
export function createNewsSelectionRoute(read:()=>NewsPool|undefined,take:()=>boolean){
 let active=0;
 return(request:IncomingMessage,response:ServerResponse)=>{
  if(request.url!=='/v2/news/selection')return false;
  response.setHeader('Cache-Control','private, no-store');
  const send=(status:number,value:unknown,close=false)=>{if(response.destroyed||response.writableEnded)return;if(close)response.setHeader('Connection','close');response.writeHead(status);response.end(JSON.stringify(value));};
  if(request.method!=='POST'){send(405,{code:'METHOD_NOT_ALLOWED'},true);return true;}
  if(request.headers['content-type']?.split(';')[0].trim().toLowerCase()!=='application/json'||request.headers['content-encoding']){
   send(415,{code:'INVALID_NEWS_CONTENT_TYPE'},true);return true;
  }
  const length=request.headers['content-length'];
  if(length&&(!/^\d+$/.test(length)||Number(length)>2048)){send(413,{code:'REQUEST_TOO_LARGE'},true);return true;}
  if(!take()){send(429,{code:'RATE_LIMITED'},true);return true;}
  if(active>=8){send(503,{code:'NEWS_BUSY'},true);return true;}
  active++;let done=false,size=0,chunks:Buffer[]=[];
  const finish=(status:number,value:unknown,close=false)=>{if(done)return;done=true;active--;chunks=[];clearTimeout(timer);send(status,value,close);};
  const timer=setTimeout(()=>finish(408,{code:'REQUEST_TIMEOUT'},true),4000);
  request.once('aborted',()=>finish(400,{code:'REQUEST_ABORTED'},true));
  request.once('error',()=>finish(400,{code:'INVALID_NEWS_REQUEST'},true));
  response.once('close',()=>{if(!done){done=true;active--;chunks=[];clearTimeout(timer);}});
  request.on('data',(chunk:Buffer)=>{
   if(done)return;size+=chunk.length;if(size>2048){finish(413,{code:'REQUEST_TOO_LARGE'},true);request.resume();return;}chunks.push(chunk);
  });
  request.once('end',()=>{
   if(done)return;
   let input;
   try{input=newsRequestSchema.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks))));}
   catch{finish(400,{code:'INVALID_NEWS_REQUEST'},true);return;}
   chunks=[];
   try{const pool=read();if(!pool){finish(503,{code:'NEWS_UNAVAILABLE'});return;}
    finish(200,buildNewsSelection(pool,input));
   }catch{finish(503,{code:'NEWS_UNAVAILABLE'});}
  });
  return true;
 };
}
