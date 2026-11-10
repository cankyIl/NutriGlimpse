import {lstatSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
const retentionMs=7*86400000;
const stores=[['beta-diagnostics','events.sqlite','events'],['beta-response-journal','responses.sqlite','responses']] as const;
/** Retire old beta records on schedule without creating a journal or loading its key. */
export function pruneLegacyJournals(root:string,now=Date.now()){
 const base=resolve(root);let removed=0;
 for(const [directory,filename,table] of stores){
  let current=base,missing=false;
  for(const part of ['.tools',directory,filename]){
   current=join(current,part);
   let info;try{info=lstatSync(current);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT'){missing=true;break;}throw error;}
   if(info.isSymbolicLink()||(process.getuid&&info.uid!==process.getuid())||(part===filename?!info.isFile():!info.isDirectory()))throw new Error('Unsafe legacy journal path');
  }
  if(missing)continue;
  const db=new DatabaseSync(current);
  try{db.exec('PRAGMA busy_timeout=100; PRAGMA secure_delete=ON');removed+=Number(db.prepare('DELETE FROM '+table+' WHERE at < ?').run(now-retentionMs).changes);}
  finally{db.close();}
 }
 return removed;
}
export function startLegacyJournalExpiry(root:string){
 let warned=false;
 const prune=()=>{try{pruneLegacyJournals(root);}catch{if(!warned){console.warn('Legacy journal expiry needs operator attention');warned=true;}}};
 prune();const timer=setInterval(prune,60000);timer.unref();return ()=>clearInterval(timer);
}
