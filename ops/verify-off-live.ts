import {loadOffConfig,fetchOffFood} from '../apps/service/src/offProvider.ts';
import {writeFileSync} from 'node:fs';
const root='/path/to/NutriGlimpse';const config=loadOffConfig(root+'/.tools/off/config.json')!;
const report:{staging:boolean;requestCompleted:boolean;accepted:boolean;error:boolean}={staging:true,requestCompleted:false,accepted:false,error:false};
try{const food=await fetchOffFood('00016000121836',{...config,staging:true});report.requestCompleted=true;report.accepted=!!food;}catch{report.error=true;}
writeFileSync(root+'/artifacts/remote/off/staging-check.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
