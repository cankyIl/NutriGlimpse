import {DatabaseSync,backup} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
process.umask(0o077);
const root=resolve(import.meta.dirname,'..');
mkdirSync(root+'/.tools/catalog/backups',{recursive:true,mode:0o700});
const source=new DatabaseSync(root+'/.tools/catalog/public.sqlite',{readOnly:true});
const target=root+'/.tools/catalog/backups/public-'+new Date().toISOString().replaceAll(':','-')+'.sqlite';
try{
 await backup(source,target);
 const copy=new DatabaseSync(target,{readOnly:true});
 try{if(copy.prepare('PRAGMA integrity_check').get()?.integrity_check!=='ok')throw new Error('Backup integrity failure');
 console.log(JSON.stringify({backup:target,integrity:'ok',foods:copy.prepare('SELECT count(*) AS count FROM foods').get()?.count}));}finally{copy.close();}
}finally{source.close();}
