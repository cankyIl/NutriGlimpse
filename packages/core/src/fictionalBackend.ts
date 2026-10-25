import { fictionalOcrPages, sanitizeIntake, type IntakeKind } from './intake.ts';
import { parseProductExtraction, parseReceiptExtraction } from './foodExtraction.ts';
import { parseExtraction } from './evidence.ts';
import { fingerprintReportSource } from './reportImports.ts';
export function parseFictionalBackend(kind:IntakeKind, value:unknown){
 if(!value||typeof value!=='object')throw Error('Invalid server result');
 const envelope=value as Record<string,unknown>;
 if(envelope.schemaVersion!==1||envelope.synthetic!==true||envelope.model!=='gpt-6-luna'||envelope.kind!==kind)throw Error('Unexpected server result');
 const sanitized=sanitizeIntake(kind,fictionalOcrPages(kind));
 const refs=sanitized.pages.map(p=>({page:p.page,lineIds:p.lines.map(l=>l.id)}));
 const json=JSON.stringify(envelope.data);
 const common={sanitized,mode:'server' as const,fingerprint:fingerprintReportSource(new TextEncoder().encode('fictional-server-v1:'+kind))};
 if(kind==='product')return {...common,kind,data:parseProductExtraction(json,refs).data};
 if(kind==='receipt')return {...common,kind,data:parseReceiptExtraction(json,refs).data};
 return {...common,kind,data:parseExtraction(json,sanitized.pages.map(p=>p.page))};
}
export async function requestFictionalBackend(kind:IntakeKind,base:string,signal:AbortSignal,fetcher:typeof fetch=fetch){
 const url=new URL(base);
 if((url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname)))||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('Backend address requires HTTPS or a local tunnel');
 if(!['product','receipt','report'].includes(kind))throw Error('Invalid example');
 const timeout=new AbortController();
 const cancel=()=>timeout.abort();
 if(signal.aborted)throw Error('Cancelled');
 signal.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(cancel,45000);
 try{
  const response=await fetcher(base.replace(/\/$/,'')+'/v1/fictional/extract/'+kind,{method:'POST',signal:timeout.signal,redirect:'error'});
  if(!response.ok||response.redirected)throw Error('Backend unavailable; retry only when requested');
  const text=await response.text();
  if(text.length>180000)throw Error('Server result too large');
  if(signal.aborted||timeout.signal.aborted)throw Error('Cancelled');
  return parseFictionalBackend(kind,JSON.parse(text));
 }finally{clearTimeout(timer);signal.removeEventListener('abort',cancel);}
}
