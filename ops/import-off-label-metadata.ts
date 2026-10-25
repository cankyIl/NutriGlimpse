import {projectRoot} from '../apps/service/src/projectPaths.ts';
import {readFileSync,writeFileSync} from 'node:fs';
import {PublicDatabase} from '../apps/service/src/publicDatabase.ts';
import {normalizeOffBulk} from '../apps/service/src/offBulk.ts';
const root=projectRoot,db=new PublicDatabase(root+'/.tools/catalog/public.sqlite');
const report={imported:0,alreadyPresent:0,sourceMismatch:0,invalid:0};
const raw=new Map<string,Record<string,unknown>>();
for(const line of readFileSync(root+'/.tools/off/bulk/candidates.jsonl','utf8').split('\n').filter(Boolean)){const row=JSON.parse(line);raw.set(String(row.code).padStart(14,'0'),row);}
try{
 for(const line of readFileSync(root+'/artifacts/remote/label-enrichment/off-label-metadata.jsonl','utf8').split('\n').filter(Boolean)){
  const metadata=JSON.parse(line),id=String(metadata.code).padStart(14,'0'),old=db.byId('off',id),original=raw.get(id);
  if(old?.reportedLabel){report.alreadyPresent++;continue;}
  if(!old||!original||original.last_modified_t!==metadata.last_modified_t){report.sourceMismatch++;continue;}
  const result=normalizeOffBulk({...original,...metadata},old.retrievedAt);
  if(!result.food||result.food.sourceDate!==old.sourceDate||result.food.ingredients!==old.ingredients||JSON.stringify(result.food.nutrients)!==JSON.stringify(old.nutrients)){report.invalid++;continue;}
  const {stale,...facts}=old;
  db.importFoods([{...facts,reportedLabel:result.food.reportedLabel}]);report.imported++;
 }
}finally{db.close();writeFileSync(root+'/artifacts/remote/label-enrichment/off-label-import.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
