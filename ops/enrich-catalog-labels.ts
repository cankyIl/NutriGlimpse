import {projectRoot} from '../apps/service/src/projectPaths.ts';
import {readFileSync,writeFileSync,mkdirSync,statSync} from 'node:fs';
import {PublicDatabase} from '../apps/service/src/publicDatabase.ts';
import {normalizeOffBulk} from '../apps/service/src/offBulk.ts';
import {fetchUsdaBatch} from '../apps/service/src/catalogRefresh.ts';
const root=projectRoot,apply=process.argv.includes('--apply');
if(process.argv.slice(2).some(x=>x!=='--apply'))throw Error('Use --apply to backfill validated source facts');
process.umask(0o077);
const db=new PublicDatabase(root+'/.tools/catalog/public.sqlite');
const report={apply,offUpdated:0,offUnmatched:0,usdaUpdated:0,usdaMissing:[] as string[],usdaRequests:0,failed:false};
try{
 const foods=db.exportFoods(),off=new Map(foods.filter(f=>f.provider==='off').map(f=>[f.id,f]));
 const matched=new Set<string>();
 for(const line of readFileSync(root+'/.tools/off/bulk/candidates.jsonl','utf8').split('\n').filter(Boolean)){
  const raw=JSON.parse(line);
  // Find original record first, preserving its retrieval time. Reprocessing is not a refresh.
  const code=String(raw.code).padStart(14,'0'),old=off.get(code);if(!old||old.additionalNutrients)continue;
  const result=normalizeOffBulk(raw,old.retrievedAt);
  if(!result.food||result.food.id!==old.id||result.food.sourceDate!==old.sourceDate||result.food.ingredients!==old.ingredients||JSON.stringify(result.food.nutrients)!==JSON.stringify(old.nutrients))continue;
  if(apply)db.importFoods([{...old,additionalNutrients:result.food.additionalNutrients}]);
  matched.add(old.id);report.offUpdated++;
 }
 report.offUnmatched=[...off.values()].filter(f=>!f.additionalNutrients&&!matched.has(f.id)).length;
 const ids=foods.filter(f=>f.provider==='usda'&&!f.additionalNutrients).map(f=>f.id);
 if(apply&&ids.length){
  const path=root+'/.tools/usda/api-key';if(statSync(path).mode&0o077)throw Error('Key must be private');
  const key=readFileSync(path,'utf8').trim();
  for(let i=0;i<ids.length;i+=20){
   report.usdaRequests++;
   const batch=await fetchUsdaBatch(ids.slice(i,i+20),key);
   if(batch.foods.length)db.importFoods(batch.foods);
   report.usdaUpdated+=batch.foods.length;report.usdaMissing.push(...batch.missing);
   if(i%200===0)console.log(JSON.stringify({usdaUpdated:report.usdaUpdated,offUpdated:report.offUpdated}));
   await new Promise(resolve=>setTimeout(resolve,1100));
  }
 }
}catch{report.failed=true;process.exitCode=1;}
finally{
 db.close();mkdirSync(root+'/artifacts/remote/label-enrichment',{recursive:true});
 writeFileSync(root+'/artifacts/remote/label-enrichment/backfill.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
