import {scanClientTimingSchema} from '../../../packages/core/src/scanTiming.ts';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {estimatedNutrientsSchema,type EstimatedFood} from '../../../packages/core/src/aiFoodReview.ts';
import type {PhotoIdentity} from '../../../packages/core/src/productPhoto.ts';
const text=z.string().max(160);
const code=z.string().regex(/^[a-zA-Z0-9_.:-]{1,90}$/);
const rating=z.enum(['healthy','very_healthy','neutral','not_healthy']).nullable();
const identity=z.object({key:z.string().regex(/^[a-f0-9]{64}$/),brand:text.nullable(),name:text.nullable(),variant:text.nullable(),size:text.nullable(),status:code}).strict();
const food=z.object({identity,category:text,servingGrams:z.number().nullable(),nutrition:estimatedNutrientsSchema,rating}).strict();
const count=z.number().int().min(0).max(10000000);
const candidate=z.object({index:count,food:food.nullable(),computedRating:rating,disposition:z.enum(['accepted','rejected','unused']),displayedRating:rating.optional(),reasons:z.array(code).max(20)}).strict();
export const betaEventSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('alternative_supplement'),model:z.literal('gpt-6-luna'),status:code,disposition:code,elapsedMs:count,waitMs:count,added:count}).strict(),
 z.object({kind:z.literal('retailer_usage'),searches:count,elapsedMs:count,inputTokens:count.nullable(),outputTokens:count.nullable()}).strict(),
 z.object({kind:z.literal('retailer_resolution'),outcomes:z.array(z.object({index:count,status:z.enum(['branch_stock_reported','branch_listed','chain_listed','not_found','unknown']),aisle:z.boolean(),codes:z.array(code).max(12)}).strict()).max(3)}).strict(),
 z.object({kind:z.literal('grocery_usage'),model:code,promptHash:z.string().regex(/^[a-f0-9]{64}$/),inputTokens:count.nullable(),outputTokens:count.nullable(),cachedTokens:count.nullable(),thinkingTokens:count.nullable(),searches:count,elapsedMs:count,validationMs:count,accepted:count,issues:z.array(code).max(40)}).strict(),
 z.object({kind:z.literal('web_usage'),model:code,inputTokens:count.nullable(),outputTokens:count.nullable(),cachedTokens:count.nullable(),searches:count,sourcedFoods:count,elapsedMs:count}).strict(),
 z.object({kind:z.literal('shelf_usage'),model:code,inputTokens:count.nullable(),outputTokens:count.nullable(),cachedTokens:count.nullable(),elapsedMs:count,cells:count}).strict(),
 z.object({kind:z.literal('shelf_cell'),cell:count,models:z.array(code).max(2),issue:code,food:food.nullable(),needsAlternatives:z.boolean()}).strict(),
 z.object({kind:z.literal('dual_decision'),models:z.array(code).min(1).max(2),reviewState:code,original:food.nullable(),originals:z.array(z.object({model:code,food:food.nullable()}).strict()).min(1).max(2),candidates:z.array(candidate).max(10),accepted:count,reason:code}).strict(),
 scanClientTimingSchema.omit({traceId:true}).extend({kind:z.literal('scan_client_timing')}),
 z.object({kind:z.literal('scan_server_timing'),clock:z.enum(['request','provider']),stage:z.enum(['body_received','provider_start','model_dispatch','model_headers','model_first_text','first_result','model_complete','response_sent']),elapsedMs:z.number().int().min(0).max(180000)}).strict(),
 z.object({kind:z.literal('request'),operation:z.enum(['recognize','media','sources']),phase:z.enum(['started','finished']),status:count.optional(),code:code.optional(),elapsedMs:count.optional()}).strict(),
 z.object({kind:z.literal('model_query'),model:code,promptHash:z.string().regex(/^[a-f0-9]{64}$/),rulesHash:z.string().regex(/^[a-f0-9]{64}$/),maxOutputTokens:count,imageDetail:z.enum(['high','original']),personalContext:z.literal(false)}).strict(),
 z.object({kind:z.literal('decision'),status:code,original:food.nullable(),originalModelRating:rating,originalComputedRating:rating,originalReasons:z.array(code).max(20),alternatives:z.array(candidate).max(5),proposed:count,accepted:count,reason:code}).strict(),
 z.object({kind:z.literal('failure'),stage:code,code,elapsedMs:count}).strict(),
 z.object({kind:z.literal('lookup'),operation:z.enum(['media','sources']),product:identity,outcome:code,query:text.optional(),upstreamStatus:count.optional(),count:count.optional(),rejected:z.record(code,count).optional(),sourceIds:z.array(z.string().regex(/^(usda|off):[a-zA-Z0-9-]{1,40}$/)).max(5).optional(),elapsedMs:count.optional()}).strict()
]);
export type BetaEvent=z.infer<typeof betaEventSchema>;
export interface BetaDiagnostics{record(trace:string,event:BetaEvent):void}
export const newTrace=()=>randomUUID();
export const diagnosticHash=(s:string)=>createHash('sha256').update(s).digest('hex');
// Product fields only. Never pass bodies, OCR, ingredients, profiles, headers or errors here.
export function diagnosticText(s:string|null){return s===null?null:s.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email removed]').replace(/https?:\/\/\S+/gi,'[url removed]').replace(/\b(?:sk-|Bearer\s+)[A-Za-z0-9_-]+/gi,'[credential removed]').slice(0,160);}
export function diagnosticIdentity(i:PhotoIdentity){
 const fields={brand:diagnosticText(i.brand),name:diagnosticText(i.name),variant:diagnosticText(i.variant),size:diagnosticText(i.size),status:i.status};
 return {key:diagnosticHash(JSON.stringify([fields.brand?.toLowerCase(),fields.name?.toLowerCase(),fields.variant?.toLowerCase()])),...fields};
}
export function diagnosticFood(f:EstimatedFood){return {identity:diagnosticIdentity(f.identity),category:diagnosticText(f.category)!,servingGrams:f.servingGrams,nutrition:f.nutrition,rating:f.rating};}
// Diagnostics are deliberately best-effort and may never change a scan's result.
export function recordDiagnostic(log:BetaDiagnostics|undefined,trace:string,event:BetaEvent){try{log?.record(trace,event);}catch{console.warn('beta-diagnostics unavailable');}}
export class BetaDiagnosticStore implements BetaDiagnostics{
 private db:DatabaseSync;private timer:ReturnType<typeof setInterval>;private warned=false;
 readonly retentionMs=7*24*60*60*1000;
 readonly path:string;private now:()=>number;readonly maxRows:number;
 constructor(path:string,now:()=>number=Date.now,maxRows=2000){
  this.path=path;this.now=now;this.maxRows=maxRows;
  mkdirSync(dirname(path),{recursive:true,mode:0o700});chmodSync(dirname(path),0o700);
  this.db=new DatabaseSync(path);chmodSync(path,0o600);
  this.db.exec('PRAGMA journal_mode=DELETE; PRAGMA secure_delete=ON; PRAGMA busy_timeout=100; PRAGMA max_page_count=8192; CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, at INTEGER NOT NULL, trace TEXT NOT NULL, payload TEXT NOT NULL); CREATE INDEX IF NOT EXISTS events_time ON events(at);');
  this.prune();this.timer=setInterval(()=>{try{this.prune();}catch{this.warning();}},60000);this.timer.unref();
 }
 private warning(){if(!this.warned){this.warned=true;console.warn('beta-diagnostics unavailable');}}
 prune(){this.db.prepare('DELETE FROM events WHERE at < ?').run(this.now()-this.retentionMs);this.db.prepare('DELETE FROM events WHERE id NOT IN (SELECT id FROM events ORDER BY id DESC LIMIT ?)').run(this.maxRows);}
 record(trace:string,event:BetaEvent){try{
  if(!/^[a-f0-9-]{36}$/.test(trace))throw Error('Invalid trace');
  const payload=JSON.stringify(betaEventSchema.parse(event));if(Buffer.byteLength(payload)>16000)throw Error('Diagnostic too large');
  this.prune();this.db.prepare('INSERT INTO events(at,trace,payload) VALUES(?,?,?)').run(this.now(),trace,payload);this.prune();
 }catch{this.warning();}}
 read(limit=100){this.prune();return this.db.prepare('SELECT at,trace,payload FROM events ORDER BY id DESC LIMIT ?').all(Math.max(1,Math.min(limit,this.maxRows))).map(r=>({at:new Date(Number(r.at)).toISOString(),trace:String(r.trace),event:JSON.parse(String(r.payload)) as BetaEvent}));}
 close(){clearInterval(this.timer);this.db.close();}
}
// Archive only static code/prompt metadata so a later rule change remains auditable.
export function archiveDiagnosticRules(root:string,prompt:string,additionalRules=''){
 const directory=join(root,'.tools/beta-diagnostics/rules');mkdirSync(directory,{recursive:true,mode:0o700});chmodSync(directory,0o700);
 const rules=readFileSync(join(root,'packages/core/src/aiFoodReview.ts'),'utf8')+additionalRules;
 const hashes={promptHash:diagnosticHash(prompt),rulesHash:diagnosticHash(rules)};
 for(const [name,value] of [[hashes.promptHash+'.prompt.txt',prompt],[hashes.rulesHash+'.rules.ts',rules]]){const path=join(directory,name);if(!existsSync(path))writeFileSync(path,value,{mode:0o600,flag:'wx'});}
 return hashes;
}
