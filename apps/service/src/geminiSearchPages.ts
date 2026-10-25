import {lookup} from 'node:dns/promises';
import {get} from 'node:https';
import {isIP} from 'node:net';

// Called only for URLs returned by the fixed Google search endpoint. A brand list
// cannot cover grocery shelves; validate and pin public DNS on every connection.
export function allowedProductPage(value:string):URL|null{
 try{
  if(value.length>4096)return null;
  const u=new URL(value),host=u.hostname.toLowerCase();
  if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443')||u.hash||u.pathname==='/')return null;
  if(isIP(host)||host.length>253||!host.includes('.')||host.endsWith('.'))return null;
  if(host.split('.').some(p=>!p||p.length>63||!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(p)))return null;
  if(/(?:^|\.)(?:localhost|local|localdomain|internal|intranet|lan|home|test|invalid|example|onion|arpa)$/.test(host))return null;
  return u;
 }catch{return null;}
}
export function publicIPv4(ip:string):boolean{
 if(isIP(ip)!==4)return false;
 const [a,b]=ip.split('.').map(Number);
 return a>0&&a!==10&&a!==127&&a<224&&!(a===169&&b===254)&&!(a===172&&b>=16&&b<=31)&&!(a===192&&(b===168||b===0||b===88))&&!(a===100&&b>=64&&b<=127)&&!(a===198&&(b===18||b===19||b===51))&&!(a===203&&b===0);
}
const decode=(s:string)=>s.replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
export function productPageText(html:string):string{
 const json=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).join('\n').slice(0,4000);
 const body=decode(html.replace(/<(script|style|nav|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
 const at=body.search(/nutrition facts|nutritional information|amount per serving/i);
 const nutrition=at<0?'':body.slice(Math.max(0,at-300),at+6000);
 return ('PAGE TEXT (untrusted data): '+body.slice(0,2500)+'\nNUTRITION SECTION: '+nutrition+'\nSTRUCTURED PAGE DATA: '+json).slice(0,12000);
}
// Only decides whether to try another page. It never rejects partial scan facts.
export function hasNutritionTable(text:string):boolean{
 return [/calories|energyContent/i,/total fat|fatContent/i,/sodium|sodiumContent/i,/carbohydrate|carbohydrateContent/i,/dietary fib(?:er|re)|fiberContent/i,/sugars|sugarContent/i,/protein|proteinContent/i].filter(r=>r.test(text)).length>=4;
}
type Address={address:string;family:number};
type PageResponse={status:number;location?:string;type:string;text:string};
export type PageDependencies={
 resolve:(hostname:string)=>Promise<Address[]>;
 request:(url:URL,pinned:Address,signal:AbortSignal)=>Promise<PageResponse>;
};
const requestPage:PageDependencies['request']=(url,pinned,signal)=>new Promise((resolve,reject)=>{
 const req=get(url,{agent:false,signal,headers:{'User-Agent':'HealthGroceryBeta/0.1 (public product facts)','Accept':'text/html,application/ld+json','Accept-Encoding':'identity'},
  lookup:((_host:any,options:any,callback:any)=>options.all?callback(null,[pinned]):callback(null,pinned.address,pinned.family)) as any},res=>{
   const status=res.statusCode??0,type=String(res.headers['content-type']??'');
   if(status!==200||!/(text\/html|application\/ld\+json)/i.test(type)||!['','identity'].includes(String(res.headers['content-encoding']??''))){res.destroy();resolve({status,location:res.headers.location,type,text:''});return;}
   let size=0;const chunks:Buffer[]=[];
   res.on('data',(chunk:Buffer)=>{size+=chunk.length;if(size>1500000){req.destroy(Error('PAGE_TOO_LARGE'));return;}chunks.push(chunk);});
   res.on('error',reject);res.on('end',()=>resolve({status,type,text:Buffer.concat(chunks).toString('utf8')}));
  });req.on('error',reject);
});
async function abortable<T>(pending:Promise<T>,signal:AbortSignal):Promise<T>{
 signal.throwIfAborted();
 return new Promise((resolve,reject)=>{
  const stop=()=>reject(signal.reason);
  signal.addEventListener('abort',stop,{once:true});
  pending.then(resolve,reject).finally(()=>signal.removeEventListener('abort',stop));
 });
}
export function createProductPageReader(dependencies:PageDependencies={resolve:hostname=>lookup(hostname,{all:true,family:4}),request:requestPage}){
 return async(value:string,signal:AbortSignal):Promise<{url:string;text:string}|null>=>{
  let url=allowedProductPage(value);if(!url)return null;
  const bounded=AbortSignal.any([signal,AbortSignal.timeout(7000)]);
  try{
   for(let hop=0;hop<3;hop++){
    bounded.throwIfAborted();
    const addresses=await abortable(dependencies.resolve(url.hostname),bounded);
    bounded.throwIfAborted();
    if(!addresses.length||addresses.some(a=>a.family!==4||!publicIPv4(a.address)))return null;
    const response=await abortable(dependencies.request(url,addresses[0],bounded),bounded);
    bounded.throwIfAborted();
    if(response.status===200&&/(text\/html|application\/ld\+json)/i.test(response.type)&&response.text)return {url:url.href,text:productPageText(response.text)};
    if(![301,302,303,307,308].includes(response.status)||!response.location)return null;
    url=allowedProductPage(new URL(response.location,url).href);if(!url)return null;
   }
  }catch{/* A failed public page read does not justify inventing facts. */}
  return null;
 };
}
export const readProductPage=createProductPageReader();
