const test=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),{pathToFileURL}=require('node:url'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
test('all installed dependency entry points contain the reviewed patch',()=>{
 const p=spawnSync(process.execPath,['ops/apply-security-patches.cjs','--check'],{cwd:root,encoding:'utf8'});
 assert.equal(p.status,0,p.stdout+p.stderr);
});
for(const entry of ['deepmerge','deepmerge/dist/umd.js'])test(entry+' rejects prototype keys from source and target, including nested merges',()=>{
 const merge=require(entry),poison=JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},"prototype":{"polluted":true},"nested":{"__proto__":{"polluted":true}},"ok":7}');
 for(const value of [merge(poison,{}),merge({},poison),merge(Object.create(null),poison),merge({rows:[poison]},{}),merge.all([poison,{ok:8}])]){
  assert.equal(Object.getPrototypeOf(value),Object.prototype);assert.equal(value.polluted,undefined);assert.equal(Object.prototype.polluted,undefined);
  assert.equal(Object.hasOwn(value,'__proto__'),false);assert.equal(Object.hasOwn(value,'constructor'),false);
  assert.equal(value.nested?.polluted,undefined);assert.equal(value.rows?.[0].polluted,undefined);
 }
 const symbol=Symbol('preserved'),merged=merge({a:{b:1},list:[1],[symbol]:2},{a:{c:2},list:[2]});
 assert.deepEqual(merged.a,{b:1,c:2});assert.deepEqual(merged.list,[1,2]);assert.equal(merged[symbol],2);
 assert.deepEqual(merge({list:[1]},{list:[2]},{arrayMerge:(_a,b)=>b}).list,[2]);
});
for(const entry of ['node_modules/zod/index.cjs','node_modules/zod/v3/index.cjs','node_modules/zod/v3/index.js','node_modules/expo/node_modules/zod/v3/index.cjs','node_modules/expo/node_modules/zod/v3/index.js'])test(entry+' rejects oversized constrained collections without parsing elements',async()=>{
 const {z}=await import(pathToFileURL(path.join(root,entry)).href);let visited=0;
 const item=z.string().refine(()=>{visited++;return true;});
 const values=Array(100000).fill('x');
 for(const schema of [z.array(item).max(9),z.array(item).length(9)]){
  assert.equal(schema.safeParse(values).success,false);assert.equal((await schema.safeParseAsync(values)).success,false);assert.equal(visited,0);
 }
 const set=z.set(z.number().refine(()=>{visited++;return true;})).max(9);
 const big=new Set(Array.from({length:100000},(_,i)=>i));assert.equal(set.safeParse(big).success,false);assert.equal(visited,0);
 assert.deepEqual(z.array(item).max(9).parse(['ok']),['ok']);assert.equal(visited,1);
 if(entry==='node_modules/zod/index.cjs'){
  const map=z.map(z.number(),z.number().refine(()=>{visited++;return true;})).max(9);visited=0;
  assert.equal(map.safeParse(new Map(Array.from({length:100000},(_,i)=>[i,i]))).success,false);assert.equal(visited,0);
 }
});
test('actual shelf request rejects oversized manifest under a small heap before expensive element checks',()=>{
 const code=`import {shelfNineRequestSchema} from './packages/core/src/shelfNine.ts';
 const cells=Array(250000).fill({cell:0,packageId:'',revision:0});
 const result=shelfNineRequestSchema.shape.cells.safeParse(cells);
 if(result.success||result.error.issues.length>2)process.exit(1);`;
 const p=spawnSync(process.execPath,['--max-old-space-size=96','--experimental-strip-types','--input-type=module','-e',code],{cwd:root,timeout:5000,encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);
});

require('./production-launcher.test.cjs');

require('./ios-permissions.test.cjs');
