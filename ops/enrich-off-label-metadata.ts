import {projectRoot} from '../apps/service/src/projectPaths.ts';
import {writeFileSync} from 'node:fs';
import {PublicDatabase} from '../apps/service/src/publicDatabase.ts';
import {loadOffConfig,fetchOffFood} from '../apps/service/src/offProvider.ts';
const root=projectRoot,db=new PublicDatabase(root+'/.tools/catalog/public.sqlite'),config=loadOffConfig(root+'/.tools/off/config.json');
if(!config||config.staging)throw Error('Production OFF configuration required');
const foods=db.exportFoods().filter(f=>f.provider==='off'&&!f.reportedLabel&&(!process.argv.includes('--missing-nutrients')||!f.additionalNutrients)).sort((a,b)=>Number(!b.additionalNutrients)-Number(!a.additionalNutrients)||Number(b.comparisonGroup==='breakfast-cereal')-Number(a.comparisonGroup==='breakfast-cereal')||a.id.localeCompare(b.id)).slice(0,24);
const report={attempted:0,updated:0,notQualified:0,failed:false};
try{
 for(const old of foods){
  while(!db.reserveOffRequest())await new Promise(r=>setTimeout(r,5200));
  report.attempted++;
  try{const food=await fetchOffFood(old.barcode!,config);if(food){db.importFoods([food]);report.updated++;}else report.notQualified++;}
  catch{db.coolOffRequests();report.failed=true;break;}
  console.log(JSON.stringify(report));await new Promise(r=>setTimeout(r,5200));
 }
}finally{db.close();writeFileSync(root+'/artifacts/remote/label-enrichment/off-metadata'+(process.argv.includes('--missing-nutrients')?'-remaining':'')+'.json',JSON.stringify(report,null,2));}
