import {projectRoot} from '../apps/service/src/projectPaths.ts';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {PublicDatabase} from '../apps/service/src/publicDatabase.ts';
import {classifyOffGrocery} from '../apps/service/src/catalogCuration.ts';
import {comparisonReady,comparableAlternatives,comparisonMetrics} from '../packages/core/src/catalogAlternatives.ts';
const root=projectRoot,apply=process.argv.includes('--apply');
if(process.argv.slice(2).some(x=>x!=='--apply'))throw Error('Only --apply supported');
const raw=new Map(readFileSync(root+'/.tools/off/bulk/candidates.jsonl','utf8').trim().split('\n').map(line=>{const p=JSON.parse(line);return [String(p.code).padStart(14,'0'),p] as const;}));
const db=new PublicDatabase(root+'/.tools/catalog/public.sqlite');
const before=db.exportFoods().filter(f=>f.provider==='off'),rows=[];
let matched=0;
for(const food of before){
 const p=raw.get(food.barcode!);
 // Only re-use evidence from the identical source version; never refresh timestamps.
 if(!p||new Date(p.last_modified_t*1000).toISOString().slice(0,10)!==food.sourceDate){rows.push(food);continue;}
 matched++;
 const group=classifyOffGrocery(food.name,p.categories_tags??[]);
 const {comparisonGroup:_g,categoryEvidence:_e,...rest}=food;
 rows.push({...rest,...(group?{comparisonGroup:group,categoryEvidence:'category-rules-v4' as const}:{})});
}
const changed=rows.filter((f,i)=>f.comparisonGroup!==before[i].comparisonGroup||f.categoryEvidence!==before[i].categoryEvidence);
const groups:Record<string,number>={};
const ready=rows.filter(f=>comparisonReady(f));
for(const food of ready)groups[food.comparisonGroup!]=(groups[food.comparisonGroup!]??0)+1;
let pairs=0,withAlternatives=0;
for(const food of rows){
 const prior=before.find(f=>f.id===food.id)!;
 for(const key of ['nutrients','ingredients','sourceDate','retrievedAt','certifications','availability'] as const)assert.deepEqual(food[key],prior[key]);
 const pool=rows.filter(candidate=>candidate.comparisonGroup===food.comparisonGroup);
 let any=false;
 for(const metric of Object.keys(comparisonMetrics) as (keyof typeof comparisonMetrics)[]){
  const options=comparableAlternatives(food,pool,metric);
  assert.ok(options.length<=3);
  for(const option of options){assert.equal(option.food.comparisonGroup,food.comparisonGroup);assert.ok(option.improvement>0);pairs++;}
  if(options.length)any=true;
  for(const restriction of ['glutenFree','peanutAllergy','vegan'])assert.equal(comparableAlternatives(food,pool,metric,[restriction]).length,0);
 }
 if(any)withAlternatives++;
}
if(apply)for(let i=0;i<changed.length;i+=100)db.importFoods(changed.slice(i,i+100));
const report={applied:apply,checkedAt:new Date().toISOString(),total:rows.length,matchedSourceVersions:matched,changed:changed.length,beforeReady:before.filter(f=>comparisonReady(f)).length,afterReady:ready.length,withAlternatives,pairsValidated:pairs,groups,products:ready.map(f=>({id:f.id,name:f.name,group:f.comparisonGroup,tags:raw.get(f.barcode!)?.categories_tags}))};
mkdirSync(root+'/artifacts/remote/us-shelf-expansion',{recursive:true});
writeFileSync(root+'/artifacts/remote/us-shelf-expansion/'+(apply?'applied':'dry-run')+'.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,products:undefined},null,2));db.close();
