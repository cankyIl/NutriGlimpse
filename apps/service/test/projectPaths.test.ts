import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,copyFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {projectRoot,resolveRuntimeRoot,servicePort} from '../src/projectPaths.ts';
test('project root follows the installed module, not cwd or a previous developer machine',()=>{
 const expected=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
 assert.equal(projectRoot,expected);
 const root=mkdtempSync(join(tmpdir(),'nutriglimpse-paths-'));
 try{
  const folder=join(root,'apps/service/src');mkdirSync(folder,{recursive:true});
  const target=join(folder,'projectPaths.mjs');copyFileSync(join(expected,'apps/service/src/projectPaths.ts'),target);
  const actual=execFileSync(process.execPath,['--input-type=module','-e',"import {projectRoot,resolveRuntimeRoot,servicePort} from "+JSON.stringify(new URL('file://'+target).href)+";process.stdout.write(projectRoot)"],{cwd:tmpdir(),encoding:'utf8'});
  assert.equal(actual,root);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('isolated source can use a real runtime without following symlinks',()=>{
 const base=mkdtempSync(join(tmpdir(),'grocery-runtime-'));const real=join(base,'real');mkdirSync(real);mkdirSync(join(real,'.tools'));
 try{
  assert.equal(resolveRuntimeRoot(real),real);assert.notEqual(real,projectRoot);
  assert.throws(()=>resolveRuntimeRoot('relative'));assert.throws(()=>resolveRuntimeRoot(''));assert.throws(()=>resolveRuntimeRoot(join(base,'missing')));
  const linked=join(base,'linked');symlinkSync(real,linked);assert.throws(()=>resolveRuntimeRoot(linked));
  const unsafe=join(base,'unsafe');mkdirSync(unsafe);symlinkSync(join(real,'.tools'),join(unsafe,'.tools'));assert.throws(()=>resolveRuntimeRoot(unsafe));
 }finally{rmSync(base,{recursive:true,force:true});}
});
test('service keeps its established default and validates staging ports',()=>{
 assert.equal(servicePort(undefined),3002);assert.equal(servicePort('3003'),3003);
 for(const value of ['','0','80','65536','3002x','-1','3.2',' 3003'])assert.throws(()=>servicePort(value));
});
