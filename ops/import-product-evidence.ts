import {readFileSync,writeFileSync,renameSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parseEvidenceRegistry} from '../apps/service/src/sourceEvidence.ts';
process.umask(0o077);
const root='/path/to/NutriGlimpse',input=process.argv[2],apply=process.argv[3]==='--apply';
if(!input||process.argv.length>4||process.argv[3]&&!apply)throw Error('Usage: import-product-evidence.ts complete-reviewed-registry.json [--apply]');
const raw=readFileSync(input,'utf8');if(Buffer.byteLength(raw)>32_000_000)throw Error('Evidence registry too large');
const records=parseEvidenceRegistry(JSON.parse(raw)),serialized=JSON.stringify(records,null,2);
const sha256=createHash('sha256').update(serialized).digest('hex');
if(apply){
 const dir=root+'/.tools/section11';mkdirSync(dir+'/history',{recursive:true,mode:0o700});
 const current=dir+'/evidence.json';
 if(existsSync(current)){const old=readFileSync(current);writeFileSync(dir+'/history/'+createHash('sha256').update(old).digest('hex')+'.json',old,{mode:0o600});}
 const staged=dir+'/evidence-'+sha256+'.tmp';writeFileSync(staged,serialized,{mode:0o600});renameSync(staged,current);
}
console.log(JSON.stringify({applied:apply,records:records.length,sha256,scope:'Reviewed exact-label records may feed v2 gluten evidence only after independent label-trust policy checks. All other evidence kinds remain operator audit data.'}));
