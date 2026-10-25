import {test} from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import type {AddressInfo} from 'node:net';
import {cleanProductJpeg} from '../src/photoImage.ts';
import {createProductPhotoProvider,buildProductPhotoRequest,parseProductPhotoResponse,ProductPhotoError,loadProductPhotoProvider,type ProductPhotoProvider} from '../src/productPhotoProvider.ts';
import {createAppServer} from '../src/server.ts';
import {PRODUCT_PHOTO_CONSENT,PHOTO_MAX_BODY} from '../../../packages/core/src/productPhoto.ts';
// Framing-only synthetic JPEG: provider transport is mocked; real decoder fixtures run on Mac.
const segment=(marker:number,body:Buffer)=>{const head=Buffer.alloc(4);head[0]=255;head[1]=marker;head.writeUInt16BE(body.length+2,2);return Buffer.concat([head,body]);};
const jpeg=(width=100)=>Buffer.concat([Buffer.from([255,216]),segment(0xe1,Buffer.from('Exif:PRIVATE GPS')),segment(0xfe,Buffer.from('PRIVATE COMMENT')),segment(0xc0,Buffer.from([8,0,100,width>>8,width&255,1,1,17,0])),segment(0xda,Buffer.from([1,1,0,0,63,0])),Buffer.from([0,255,0,2,255,217])]).toString('base64');
const identity={status:'identified',brand:'Test',name:'Oat Cereal',variant:null,size:null,visibleText:['Test']};
const wire=(value:unknown=identity)=>JSON.stringify({status:'completed',output:[{type:'message',role:'assistant',status:'completed',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
const input=()=>({consentVersion:PRODUCT_PHOTO_CONSENT,imageBase64:jpeg()});
const auth={Authorization:'Bearer test-photo-access','Content-Type':'application/json'};
const provider=()=>createProductPhotoProvider({transport:async()=>wire(),reserveBudget:async()=>{},catalog:()=>[]});
async function withServer(productPhotos:ProductPhotoProvider|undefined,action:(url:string)=>Promise<void>,authorized=true){
 const server=createAppServer({productPhotos,authorize:authorized?h=>h===auth.Authorization:undefined});await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{await action('http://127.0.0.1:'+(server.address() as AddressInfo).port);}finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
}
test('JPEG gate removes EXIF/GPS/comments and rejects large dimensions, corrupt framing and extra trailing data',()=>{
 const clean=Buffer.from(cleanProductJpeg(jpeg()),'base64');assert.ok(!clean.includes(Buffer.from('PRIVATE')));assert.equal(clean.readUInt16BE(0),0xffd8);
 for(const raw of [jpeg(1601),jpeg(15),Buffer.from('not a jpeg').toString('base64'),Buffer.concat([clean,Buffer.from('extra')]).toString('base64'),clean.subarray(0,-2).toString('base64'),'a'.repeat(1400004)])assert.throws(()=>cleanProductJpeg(raw));
 assert.equal(cleanProductJpeg(clean.toString('base64')),clean.toString('base64'));
});
test('one-image request is stateless, tool-free, bounded and identity-only; output cannot supply nutrition',()=>{
 const req=buildProductPhotoRequest(cleanProductJpeg(jpeg()));assert.equal(req.model,'gpt-6-luna');assert.equal(req.store,false);assert.equal(req.max_output_tokens,800);assert.deepEqual(req.tools,[]);assert.equal(req.input[0].content.filter(x=>x.type==='input_image').length,1);
 assert.deepEqual(parseProductPhotoResponse(wire()),identity);
 for(const raw of [wire({...identity,nutrients:{sodiumMg:0}}),wire({...identity,status:'identified',name:null}),JSON.stringify({status:'incomplete',output:[]}),JSON.stringify({status:'completed',output:[{type:'function_call'}]})])assert.throws(()=>parseProductPhotoResponse(raw));
});
test('provider reserves once, blocks parallel calls, cancels without delivering, and never retries',async()=>{
 let calls=0,reserved=0,finish!:(s:string)=>void;
 const p=createProductPhotoProvider({transport:async()=>{calls++;return new Promise(resolve=>finish=resolve);},reserveBudget:async()=>{reserved++;},catalog:()=>[]});
 const controller=new AbortController();const first=p.recognize(input(),controller.signal);await Promise.resolve();await Promise.resolve();
 await assert.rejects(p.recognize(input(),new AbortController().signal),(e:unknown)=>e instanceof ProductPhotoError&&e.code==='PHOTO_BUSY');
 controller.abort();finish(wire());await assert.rejects(first);assert.equal(calls,1);assert.equal(reserved,1);
 const fail=createProductPhotoProvider({transport:async()=>{calls++;throw Error('PRIVATE SECRET');},reserveBudget:async()=>{},catalog:()=>[]});await assert.rejects(fail.recognize(input(),new AbortController().signal),/PHOTO_OUTCOME_UNKNOWN/);assert.equal(calls,2);
 const exhausted=createProductPhotoProvider({transport:async()=>{calls++;return wire();},reserveBudget:async()=>{throw Error('PRIVATE');},catalog:()=>[]});await assert.rejects(exhausted.recognize(input(),new AbortController().signal),/PHOTO_BUDGET_UNAVAILABLE/);assert.equal(calls,2);assert.equal(exhausted.available(),false);
});
test('photo endpoints require authentication, enabled configuration and current explicit consent',async()=>{
 await withServer(undefined,async base=>{assert.equal((await fetch(base+'/v1/photos/capabilities')).status,401);assert.equal((await fetch(base+'/v1/photos/recognize',{method:'POST',headers:auth,body:JSON.stringify(input())})).status,503);});
 await withServer(provider(),async base=>assert.equal((await fetch(base+'/v1/photos/capabilities',{headers:auth})).status,401),false);
 await withServer(provider(),async base=>{
  const ok=await fetch(base+'/v1/photos/recognize',{method:'POST',headers:auth,body:JSON.stringify(input())});assert.equal(ok.status,200);assert.equal(ok.headers.get('cache-control'),'no-store');assert.deepEqual(await ok.json(),{schemaVersion:1,model:'gpt-6-luna',identity,foods:[]});
  for(const body of [{...input(),consentVersion:'old'},{...input(),profile:'PRIVATE'},{...input(),imageBase64:'not jpeg'},{}]){const res=await fetch(base+'/v1/photos/recognize',{method:'POST',headers:auth,body:JSON.stringify(body)});assert.equal(res.status,400);assert.ok(!(await res.text()).includes('PRIVATE'));}
  assert.equal((await fetch(base+'/v1/photos/recognize',{method:'POST',headers:{...auth,'Content-Type':'image/jpeg'},body:'x'})).status,415);
  assert.equal((await fetch(base+'/v1/uploads',{method:'POST',headers:auth,body:'PRIVATE'})).status,503);
 });
 assert.equal(loadProductPhotoProvider('/missing',()=>[],{}),undefined);
});
test('declared and chunked oversized uploads are rejected before paid dispatch',async()=>{
 let calls=0;const p=createProductPhotoProvider({transport:async()=>{calls++;return wire();},reserveBudget:async()=>{},catalog:()=>[]});
 await withServer(p,async base=>{
  assert.equal((await fetch(base+'/v1/photos/recognize',{method:'POST',headers:auth,body:'x'.repeat(PHOTO_MAX_BODY+1)})).status,413);
  const status=await new Promise<number>((resolve,reject)=>{const req=request(base+'/v1/photos/recognize',{method:'POST',headers:{...auth,'Transfer-Encoding':'chunked'}},res=>{res.resume();resolve(res.statusCode!);});req.on('error',reject);req.write('x'.repeat(800000));req.end('x'.repeat(800000));});assert.equal(status,413);
 });assert.equal(calls,0);
});
