import {createReadStream,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createInterface} from 'node:readline';
import {createHash} from 'node:crypto';
import {normalizeOffBulk,retailerBrandHints} from '../apps/service/src/offBulk.ts';
import {comparisonReady} from '../packages/core/src/catalogAlternatives.ts';
import {PublicDatabase,type PublicFood} from '../apps/service/src/publicDatabase.ts';
import {loadOffConfig} from '../apps/service/src/offProvider.ts';
const root='/path/to/NutriGlimpse',apply=process.argv.includes('--apply');
const resumable=process.argv.includes('--resumable');
if(process.argv.slice(2).some(x=>!['--apply','--resumable'].includes(x)))throw Error('Use --apply and/or --resumable; default dry run');
if(!loadOffConfig(root+'/.tools/off/config.json')?.enabled)throw Error('OFF adoption required');
const source=JSON.parse(readFileSync(root+'/.tools/off/bulk-source.json','utf8'));
if(!/^[0-9a-f]{40}$/.test(source.revision))throw Error('Pinned revision required');
const resumeDir=root+'/.tools/off/resumable/'+source.revision;
const checkpoint=resumable?JSON.parse(readFileSync(resumeDir+'/manifest.json','utf8')):null;
if(checkpoint&&(checkpoint.revision!==source.revision||checkpoint.url!==source.url||checkpoint.schemaVersion!==1))throw Error('Snapshot mismatch');
const meta=resumable?{...checkpoint,extractedAt:checkpoint.completed[0]?.extractedAt}:JSON.parse(readFileSync(root+'/.tools/off/bulk/extract-report.json','utf8'));
const inputs:{path:string;at:string;sha256?:string}[]=resumable?checkpoint.completed.map((entry:{group:number;file:string;extractedAt:string;sha256:string})=>{
 if(!Number.isSafeInteger(entry.group)||entry.group<0||entry.file!=='group-'+String(entry.group).padStart(5,'0')+'.jsonl'||!/^[0-9a-f]{64}$/.test(entry.sha256)||!Number.isFinite(Date.parse(entry.extractedAt)))throw Error('Invalid completed shard');
 return {path:resumeDir+'/'+entry.file,at:entry.extractedAt,sha256:entry.sha256};
}):[{path:root+'/.tools/off/bulk/candidates.jsonl',at:meta.extractedAt}];
if(new Set(inputs.map(x=>x.path)).size!==inputs.length)throw Error('Duplicate shard');
// Validate every completed shard before any database mutation.
for(const input of inputs)if(input.sha256&&createHash('sha256').update(readFileSync(input.path)).digest('hex')!==input.sha256)throw Error('Shard integrity failed');
if(!/^[0-9a-f]{40}$/.test(meta.revision))throw Error('Pinned source revision required');
if(typeof meta.extractedAt!=='string'||!Number.isFinite(Date.parse(meta.extractedAt)))throw Error('Snapshot retrieval date required');
const when=new Date(meta.extractedAt).toISOString();
const report={applied:apply,completeScan:meta.completeScan,stopReason:meta.stopReason,revision:meta.revision,sourceUrl:meta.url,downloadedAt:when,rows:0,rejected:{} as Record<string,number>,eligible:0,selected:0,inserted:0,retainedNewerExisting:0,comparisonReady:0,groups:{} as Record<string,number>,retailerBrandHints:{} as Record<string,number>,sha256:''};
const candidates=new Map<string,PublicFood>(),hash=createHash('sha256');
for(const shard of inputs){
const input=createReadStream(shard.path);input.on('data',chunk=>hash.update(chunk));
for await(const line of createInterface({input,crlfDelay:Infinity})){
 report.rows++;if(line.length>1000000)throw Error('Oversized export row');
 const result=normalizeOffBulk(JSON.parse(line),new Date(shard.at).toISOString());
 if(!result.food){report.rejected[result.reason]=(report.rejected[result.reason]??0)+1;continue;}
 const prev=candidates.get(result.food.id);if(!prev||result.food.sourceDate!>prev.sourceDate!)candidates.set(result.food.id,result.food);
}
}
report.sha256=hash.digest('hex');report.eligible=candidates.size;
// Prioritize four store brands, then comparable foods, then recency; bound the public service's catalog size.
const foods=[...candidates.values()].sort((a,b)=>Number(retailerBrandHints(b.brand).length>0)-Number(retailerBrandHints(a.brand).length>0)||Number(comparisonReady(b))-Number(comparisonReady(a))||b.sourceDate!.localeCompare(a.sourceDate!)||a.id.localeCompare(b.id)).slice(0,12000);
const db=new PublicDatabase(root+'/.tools/catalog/public.sqlite');
try{
 const batch:PublicFood[]=[];
 for(const food of foods){
  report.selected++;if(comparisonReady(food)){report.comparisonReady++;report.groups[food.comparisonGroup!]=(report.groups[food.comparisonGroup!]??0)+1;}
  for(const chain of retailerBrandHints(food.brand))report.retailerBrandHints[chain]=(report.retailerBrandHints[chain]??0)+1;
  const existing=db.byId('off',food.id);
  if(existing?.sourceDate&&existing.sourceDate>=food.sourceDate!){report.retainedNewerExisting++;continue;}
  if(apply){batch.push(food);if(batch.length===100){db.importFoods(batch);report.inserted+=batch.length;batch.length=0;}}
 }
 if(batch.length){db.importFoods(batch);report.inserted+=batch.length;}
}finally{db.close();}
mkdirSync(root+'/artifacts/remote/off-bulk',{recursive:true});
writeFileSync(root+'/artifacts/remote/off-bulk/'+(resumable?'resumable-':'')+(apply?'import':'dry-run')+'.json',JSON.stringify(report,null,2));
writeFileSync(root+'/.tools/off/bulk/'+(resumable?'resumable-selected':'selected')+'.json',JSON.stringify(foods));
console.log(JSON.stringify(report,null,2));
