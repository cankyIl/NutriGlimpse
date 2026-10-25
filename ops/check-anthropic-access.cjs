#!/usr/bin/env node
'use strict';
const {openSync,closeSync,fstatSync,readFileSync,constants}=require('node:fs');
const {resolve,join}=require('node:path');
async function main(){
 const root=resolve(__dirname,'..');
 if(!require('node:fs').existsSync(join(root,'package.json')))throw Error('project_root_required');
 const path=join(root,'.tools/anthropic/api-key');
 const descriptor=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);
 let key;
 try{
  const info=fstatSync(descriptor);
  if(!info.isFile()||info.uid!==process.getuid()||(info.mode&0o777)!==0o600||info.size<1||info.size>1000)throw Error('private_key_required');
  key=readFileSync(descriptor,'utf8').trim();
  if(!/^sk-ant-[A-Za-z0-9_-]{20,500}$/.test(key))throw Error('key_format');
 }finally{closeSync(descriptor);}
 const response=await fetch('https://api.anthropic.com/v1/models/claude-haiku-5-5',{
  headers:{'x-api-key':key,'anthropic-version':'2023-06-01',Accept:'application/json'},
  signal:AbortSignal.timeout(15000),redirect:'error'
 });
 key='';
 if(response.status!==200||response.redirected){
  void response.body?.cancel().catch(()=>{});
  console.log(JSON.stringify({available:false,httpStatus:response.status,model:'claude-haiku-5-5',modelRequestsMade:0}));
  process.exitCode=1;return;
 }
 const reader=response.body.getReader(),decoder=new TextDecoder();let text='',bytes=0;
 try{for(;;){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>65536)throw Error('response_limit');text+=decoder.decode(chunk.value,{stream:true});}}
 finally{await reader.cancel().catch(()=>{});}
 const result=JSON.parse(text+decoder.decode());
 const available=result.id==='claude-haiku-5-5'&&result.type==='model';
 console.log(JSON.stringify({available,model:'claude-haiku-5-5',modelRequestsMade:0}));
 if(!available)process.exitCode=1;
}
main().catch(()=>{
 console.error('Claude access could not be verified. Check the saved key, file permissions and network connection. No key contents were printed.');
 process.exitCode=1;
});
