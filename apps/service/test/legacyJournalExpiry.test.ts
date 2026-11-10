import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readdirSync,rmSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {pruneLegacyJournals,startLegacyJournalExpiry} from '../src/legacyJournalExpiry.ts';
test('production expiry creates no stores or keys in a fresh installation',()=>{
 const root=mkdtempSync(join(tmpdir(),'journal-expiry-'));
 try{assert.equal(pruneLegacyJournals(root),0);const stop=startLegacyJournalExpiry(root);stop();assert.deepEqual(readdirSync(root),[]);}finally{rmSync(root,{recursive:true,force:true});}
});
test('existing beta records expire after transition without opening a response encryption key',()=>{
 const root=mkdtempSync(join(tmpdir(),'journal-expiry-'));const now=2000000000000;
 try{
  for(const [dir,file,table] of [['beta-diagnostics','events.sqlite','events'],['beta-response-journal','responses.sqlite','responses']]){
   const folder=join(root,'.tools',dir);mkdirSync(folder,{recursive:true});const db=new DatabaseSync(join(folder,file));
   db.exec('CREATE TABLE '+table+'(trace TEXT, at INTEGER, payload BLOB)');const add=db.prepare('INSERT INTO '+table+' VALUES(?,?,?)');
   add.run('expired',now-8*86400000,'opaque');add.run('recent',now-86400000,'opaque');db.close();
  }
  assert.equal(pruneLegacyJournals(root,now),2);assert.equal(pruneLegacyJournals(root,now),0);
  assert.equal(pruneLegacyJournals(root,now+8*86400000),2);assert.equal(pruneLegacyJournals(root,now+8*86400000),0);
  assert.deepEqual(readdirSync(join(root,'.tools','beta-response-journal')),['responses.sqlite']);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('expiry refuses a symlink before accessing a journal outside the project',()=>{
 const root=mkdtempSync(join(tmpdir(),'journal-expiry-'));const outside=mkdtempSync(join(tmpdir(),'journal-outside-'));
 try{symlinkSync(outside,join(root,'.tools'),'dir');assert.throws(()=>pruneLegacyJournals(root),/Unsafe/);assert.deepEqual(readdirSync(outside),[]);}
 finally{rmSync(root,{recursive:true,force:true});rmSync(outside,{recursive:true,force:true});}
});
