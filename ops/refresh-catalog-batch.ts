import {DatabaseSync} from 'node:sqlite';
import {readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {PublicDatabase} from '../apps/service/src/publicDatabase.ts';
import {fetchUsdaBatch} from '../apps/service/src/catalogRefresh.ts';
process.umask(0o077);
const root='/path/to/NutriGlimpse',args=process.argv.slice(2);
const limit=Number(args.find(a=>a.startsWith('--limit='))?.slice(8)??200),apply=args.includes('--apply');
if(!Number.isInteger(limit)||limit<1||limit>500||args.some(a=>a!=='--apply'&&!/^--limit=\d+$/.test(a)))throw Error('Usage: refresh-catalog-batch.ts [--limit=1..500] [--apply]');
const sql=new DatabaseSync(root+'/.tools/catalog/public.sqlite',{readOnly:true});
const ids=sql.prepare("SELECT id FROM foods WHERE provider='usda' AND retrieved_at<? ORDER BY retrieved_at,id LIMIT ?").all(new Date(Date.now()-7*86400000).toISOString(),limit).map(row=>String(row.id));sql.close();
const report={applied:apply,selected:ids.length,maximumRequests:Math.ceil(ids.length/20),refreshed:0,missing:[] as string[],failed:false};
if(apply&&ids.length){
 const path=root+'/.tools/usda/api-key';if(statSync(path).mode&0o077)throw Error('Key must be private');
 const db=new PublicDatabase(root+'/.tools/catalog/public.sqlite');
 try{const key=readFileSync(path,'utf8').trim();for(let i=0;i<ids.length;i+=20){const batch=await fetchUsdaBatch(ids.slice(i,i+20),key);if(batch.foods.length)db.importFoods(batch.foods);report.refreshed+=batch.foods.length;report.missing.push(...batch.missing);}}
 catch{report.failed=true;process.exitCode=1;}finally{db.close();}
}
mkdirSync(root+'/artifacts/remote/section11',{recursive:true});
writeFileSync(root+'/artifacts/remote/section11/refresh-'+Date.now()+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
