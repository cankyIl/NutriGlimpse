import {projectRoot} from '../apps/service/src/projectPaths.ts';
import {mkdirSync,writeFileSync} from 'node:fs';
import {setTimeout} from 'node:timers/promises';
import {normalizeBarcode} from '../packages/core/src/barcode.ts';
import {PublicDatabase} from '../apps/service/src/publicDatabase.ts';
import {loadOffConfig,fetchOffFood} from '../apps/service/src/offProvider.ts';
process.umask(0o077);
const root=projectRoot,codes=process.argv.slice(2);
if(!codes.length||codes.length>100||codes.some(c=>!normalizeBarcode(c)))throw Error('Supply 1–100 valid public product barcodes. Use OFF exports for larger imports.');
const config=loadOffConfig(root+'/.tools/off/config.json');if(!config)throw Error('OFF configuration missing');
const db=new PublicDatabase(root+'/.tools/catalog/public.sqlite',!config.staging);
const report={staging:config.staging,requested:codes.length,imported:0,rejected:[] as string[],failed:false};
try{for(let i=0;i<codes.length;i++){
 if(i)await setTimeout(5100);
 if(!db.reserveOffRequest())throw Error('Provider rate slot unavailable; retry the operator batch later.');
 const food=await fetchOffFood(codes[i],config);
 if(food&&!config.staging){db.importFoods([food]);report.imported++;}else report.rejected.push(codes[i]);
}}catch{db.coolOffRequests();report.failed=true;process.exitCode=1;}finally{db.close();}
mkdirSync(root+'/artifacts/remote/off',{recursive:true});writeFileSync(root+'/artifacts/remote/off/import-'+Date.now()+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
