import {readFileSync,statSync} from 'node:fs';
import {resolve} from 'node:path';
import {PublicDatabase} from '../apps/service/src/publicDatabase.ts';
import {fetchUsda} from '../apps/service/src/usda.ts';
process.umask(0o077);
const root=resolve(import.meta.dirname,'..');
const apply=process.argv.slice(2).join(' ')==='--apply';
if(process.argv.length>2&&!apply)throw new Error('Usage: refresh-catalog.ts [--apply]');
const db=new PublicDatabase(root+'/.tools/catalog/public.sqlite');
try{
 const ids=db.staleUsdaIds(new Date(Date.now()-7*86400000).toISOString());
 if(!apply){console.log(JSON.stringify({mode:'dry-run',ids,maximumRequests:ids.length}));}
 else if(!ids.length){console.log(JSON.stringify({mode:'apply',refreshed:0,requests:0}));}
 else{
  const keyPath=root+'/.tools/usda/api-key';if((statSync(keyPath).mode&0o077)!==0)throw new Error('Key must be private');
  const key=readFileSync(keyPath,'utf8').trim();let count=0;
  for(const id of ids){const food=await fetchUsda(id,key);db.importFoods([food]);count++;await new Promise(r=>setTimeout(r,1000));}
  console.log(JSON.stringify({mode:'apply',refreshed:count}));
 }
}catch{console.error('Refresh stopped. Previously stored records retained; no automatic retry.');process.exitCode=1;}finally{db.close();}
