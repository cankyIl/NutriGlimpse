import {readFileSync,writeFileSync} from 'node:fs';
import {PublicDatabase} from '../apps/service/src/publicDatabase.ts';
import {comparisonReady} from '../packages/core/src/catalogAlternatives.ts';
const root='/path/to/NutriGlimpse';
const db=new PublicDatabase(root+'/.tools/catalog/public.sqlite');
const raw=new Map(readFileSync(root+'/.tools/off/bulk/candidates.jsonl','utf8').trim().split('\n').map(line=>{const p=JSON.parse(line);return [String(p.code).padStart(14,'0'),p] as const;}));
const counts:Record<string,number>={},products=[];
for(const f of db.exportFoods().filter(f=>f.provider==='off')){
 const p=raw.get(f.barcode!);
 let reason:string;
 if(comparisonReady(f))reason='eligible';
 else if(Object.values(f.nutrients).some(v=>v===null))reason='incomplete-nutrients';
 else if(!comparisonReady({...f,comparisonGroup:'plain-oats',categoryEvidence:'category-rules-v4'}))reason='other-data-or-freshness-gate';
 else if(!(p?.categories_tags??[]).some((t:string)=>t.toLowerCase()!=='en:undefined'))reason='missing-category-evidence';
 else reason='unsupported-or-ambiguous-food-form';
 counts[reason]=(counts[reason]??0)+1;
 products.push({id:f.id,name:f.name,reason,countries:p?.countries_tags??null,tags:p?.categories_tags??null});
}
const report={checkedAt:new Date().toISOString(),counts,products};
writeFileSync(root+'/artifacts/remote/us-shelf-expansion/eligibility-reasons.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(counts,null,2));db.close();
