import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { PublicDatabase } from '../apps/service/src/publicDatabase.ts';
import { fetchUsda } from '../apps/service/src/usda.ts';
process.umask(0o077);
const root=resolve(import.meta.dirname,'..');
const args=process.argv.slice(2);
const demo=args[0]==='--demo';if(demo)args.shift();
if(args.length<1||args.length>10||args.some(id=>!(/^[1-9]\d{0,9}$/).test(id)))throw new Error('Usage: import-usda.ts [--demo] FDC_ID [up to ten IDs]');
let key='DEMO_KEY';
if(!demo){const path=root+'/.tools/usda/api-key';if((statSync(path).mode&0o077)!==0)throw new Error('USDA key must be private (0600)');key=readFileSync(path,'utf8').trim();}
mkdirSync(root+'/.tools/catalog',{recursive:true,mode:0o700});
const db=new PublicDatabase(root+'/.tools/catalog/public.sqlite');
try{
 const foods=[];
 for(const id of args){foods.push(await fetchUsda(id,key));}
 db.importFoods(foods);
 console.log(JSON.stringify({imported:foods.map(f=>({id:f.id,name:f.name})),demoKey:demo}));
}catch{console.error('Import failed; existing catalog preserved. Check source access and record IDs.');process.exitCode=1;}finally{db.close();}
