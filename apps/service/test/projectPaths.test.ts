import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {projectRoot} from '../src/projectPaths.ts';
test('project root follows the installed module, not cwd or a previous developer machine',()=>{
 const expected=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
 assert.equal(projectRoot,expected);
 const root=mkdtempSync(join(tmpdir(),'nutriglimpse-paths-'));
 try{
  const folder=join(root,'apps/service/src');mkdirSync(folder,{recursive:true});
  const target=join(folder,'projectPaths.mjs');copyFileSync(join(expected,'apps/service/src/projectPaths.ts'),target);
  const actual=execFileSync(process.execPath,['--input-type=module','-e',"import {projectRoot} from "+JSON.stringify(new URL('file://'+target).href)+";process.stdout.write(projectRoot)"],{cwd:tmpdir(),encoding:'utf8'});
  assert.equal(actual,root);
 }finally{rmSync(root,{recursive:true,force:true});}
});
