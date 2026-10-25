import {z} from 'zod';
import {groceryWireSchema} from '../../../packages/core/src/groceryReview.ts';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,createCipheriv,createDecipheriv,createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,lstatSync,chmodSync} from 'node:fs';
import {join} from 'node:path';
export type PublicModelReturn={answerText:string;citations:string[];searchQueries:string[];usage:Record<string,number>;status:string};
export type JournalRecord={schemaVersion:1;model:string;promptHash:string;schemaHash:string;adapterHash:string;outcome:'received'|'completed'|'failed';errorCode?:string;primary:PublicModelReturn;retailerFollowup?:PublicModelReturn;supplement?:{model:string;status:string;disposition:string;elapsedMs:number;waitMs:number;added:number;promptHash:string;returned?:PublicModelReturn};displayedReview?:unknown;decisions?:unknown};
export interface ResponseJournal{record(trace:string,value:JournalRecord):void}
const cap=(v:unknown,n:number)=>typeof v==='string'?v.slice(0,n):'';
/** Extract public answers and source metadata only. Never serialize the input or opaque provider envelope. */
export function publicModelReturn(value:any,partial=''):PublicModelReturn{
 const texts:string[]=[],citations=new Set<string>(),queries=new Set<string>(),usage:Record<string,number>={};
 const add=(set:Set<string>,v:unknown)=>{if(typeof v==='string'&&v.length<=2000)set.add(v);};
 for(const step of Array.isArray(value?.steps)?value.steps:[]){
  if(step.type==='model_output')for(const c of step.content??[])if(c.type==='text'){
   texts.push(cap(c.text,250000));for(const a of c.annotations??[])if(a.type==='url_citation')add(citations,a.url??a.uri);
  }
  if(step.type==='google_search_call')for(const q of step.arguments?.queries??[])add(queries,q);
  if(step.type==='google_search_result'&&Array.isArray(step.result))for(const r of step.result)add(citations,r.url??r.uri);
 }
 for(const item of Array.isArray(value?.output)?value.output:[]){
  if(item.type==='message')for(const c of item.content??[])if(c.type==='output_text'){
   texts.push(cap(c.text,250000));for(const a of c.annotations??[])if(a.type==='url_citation')add(citations,a.url);
  }
  if(item.type==='web_search_call')for(const r of item.action?.sources??[])add(citations,r.url);
 }
 for(const c of value?.candidates??[]){
  for(const p of c.content?.parts??[])if(!p.thought&&typeof p.text==='string')texts.push(p.text);
  for(const q of c.groundingMetadata?.webSearchQueries??[])add(queries,q);
  for(const s of c.groundingMetadata?.groundingChunks??[])add(citations,s.web?.uri);
 }
 for(const [k,v] of Object.entries(value?.usage??value?.usageMetadata??{}))if(typeof v==='number'&&Number.isFinite(v)&&v>=0)usage[k]=v;
 return {answerText:(texts.join('\n')||partial).slice(0,250000),citations:[...citations].slice(0,48),searchQueries:[...queries].slice(0,20).map(q=>q.slice(0,300)),usage,status:cap(value?.status,40)||'incomplete'};
}
const publicReturnSchema=z.object({answerText:z.string().max(250000),citations:z.array(z.string().max(2000)).max(48),searchQueries:z.array(z.string().max(300)).max(20),usage:z.record(z.string().max(100),z.number().finite().nonnegative()),status:z.string().max(40)}).strict();
const hash=z.string().regex(/^[a-f0-9]{64}$/);
export const journalRecordSchema=z.object({schemaVersion:z.literal(1),model:z.string().max(80),promptHash:hash,schemaHash:hash,adapterHash:hash,outcome:z.enum(['received','completed','failed']),errorCode:z.string().regex(/^[A-Z0-9_]{1,100}$/).optional(),primary:publicReturnSchema,retailerFollowup:publicReturnSchema.optional(),supplement:z.object({model:z.literal('gpt-6-luna'),status:z.enum(['pending','completed','failed','timed_out','cancelled']),disposition:z.string().regex(/^[a-z0-9_]{1,60}$/),elapsedMs:z.number().int().nonnegative(),waitMs:z.number().int().nonnegative(),added:z.number().int().min(0).max(3),promptHash:hash,returned:publicReturnSchema.optional()}).strict().optional(),displayedReview:groceryWireSchema.optional(),decisions:z.array(z.object({foodId:z.string().max(40),code:z.string().regex(/^[a-z0-9_]{1,100}$/)}).strict()).max(500).optional()}).strict();
export class PrivateResponseJournal implements ResponseJournal{
 private db:DatabaseSync;private key:Buffer;private timer:ReturnType<typeof setInterval>;private warned=false;
 readonly folder:string;private now:()=>number;readonly maxRows:number;readonly maxBytes:number;
 constructor(folder:string,now:()=>number=Date.now,maxRows=200,maxBytes=40*1024*1024){
  this.folder=folder;this.now=now;this.maxRows=maxRows;this.maxBytes=maxBytes;
  mkdirSync(folder,{recursive:true,mode:0o700});if(lstatSync(folder).isSymbolicLink())throw Error('Unsafe journal directory');chmodSync(folder,0o700);
  const keyPath=join(folder,'encryption.key');
  try{writeFileSync(keyPath,randomBytes(32),{mode:0o600,flag:'wx'});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;}
  const info=lstatSync(keyPath);if(!info.isFile()||info.isSymbolicLink()||(info.mode&0o777)!==0o600||info.uid!==process.getuid?.()||info.size!==32)throw Error('Invalid journal key');
  this.key=readFileSync(keyPath);const path=join(folder,'responses.sqlite');
  try{if(lstatSync(path).isSymbolicLink())throw Error('Unsafe journal database');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  this.db=new DatabaseSync(path);chmodSync(path,0o600);
  this.db.exec('PRAGMA journal_mode=DELETE; PRAGMA secure_delete=ON; PRAGMA busy_timeout=100; PRAGMA max_page_count=16384; CREATE TABLE IF NOT EXISTS responses(trace TEXT PRIMARY KEY,at INTEGER NOT NULL,payload BLOB NOT NULL); CREATE INDEX IF NOT EXISTS responses_time ON responses(at);');
  this.prune();this.timer=setInterval(()=>{try{this.prune();}catch{this.warn();}},60000);this.timer.unref();
 }
 private warn(){if(!this.warned){this.warned=true;console.warn('response-journal unavailable');}}
 prune(){
  this.db.prepare('DELETE FROM responses WHERE at < ?').run(this.now()-7*86400000);
  this.db.prepare('DELETE FROM responses WHERE trace NOT IN (SELECT trace FROM responses ORDER BY at DESC LIMIT ?)').run(this.maxRows);
  while(Number(this.db.prepare('SELECT coalesce(sum(length(payload)),0) AS bytes FROM responses').get()!.bytes)>this.maxBytes)this.db.exec('DELETE FROM responses WHERE trace=(SELECT trace FROM responses ORDER BY at LIMIT 1)');
 }
 record(trace:string,value:JournalRecord){try{
  if(!/^[a-f0-9-]{36}$/.test(trace))throw Error('Invalid trace');
  const raw=Buffer.from(JSON.stringify(journalRecordSchema.parse(value)));if(raw.length>800000)throw Error('Response record too large');
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.key,iv);cipher.setAAD(Buffer.from(trace));
  const body=Buffer.concat([cipher.update(raw),cipher.final()]);const encrypted=Buffer.concat([iv,cipher.getAuthTag(),body]);
  this.db.prepare('INSERT INTO responses(trace,at,payload) VALUES(?,?,?) ON CONFLICT(trace) DO UPDATE SET at=excluded.at,payload=excluded.payload').run(trace,this.now(),encrypted);this.prune();
 }catch{this.warn();}}
 list(limit=20){this.prune();return this.db.prepare('SELECT trace,at,length(payload) AS bytes FROM responses ORDER BY at DESC LIMIT ?').all(Math.max(1,Math.min(limit,200)));}
 read(trace:string){this.prune();const row=this.db.prepare('SELECT payload FROM responses WHERE trace=?').get(trace);if(!row)return null;
  const data=Buffer.from(row.payload as Uint8Array),decipher=createDecipheriv('aes-256-gcm',this.key,data.subarray(0,12));decipher.setAAD(Buffer.from(trace));decipher.setAuthTag(data.subarray(12,28));
  return JSON.parse(Buffer.concat([decipher.update(data.subarray(28)),decipher.final()]).toString('utf8')) as JournalRecord;
 }
 close(){clearInterval(this.timer);this.db.close();this.key.fill(0);}
}
export function recordResponse(journal:ResponseJournal|undefined,trace:string,value:JournalRecord){try{journal?.record(trace,value);}catch{console.warn('response-journal unavailable');}}
export const responseCodeHash=(value:string)=>createHash('sha256').update(value).digest('hex');
