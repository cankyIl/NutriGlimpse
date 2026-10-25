const test = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const fromRouter = createRequire(require.resolve('expo-router'));
const queryPath = fromRouter.resolve('query-string');
const fromQuery = createRequire(queryPath);
const decode = fromQuery('decode-uri-component');
const query = fromRouter('query-string');
test('actual router query-string consumer receives a callable decoder with legacy plus semantics', () => {
 assert.equal(typeof decode, 'function');
 for (const [input, expected] of [['a+b','a b'],['%2B+','+ '],['st%C3%A5le%','ståle%'],['%F0%9F%98%80','😀'],['%C3%5A%A5','%C3Z%A5'],['%25C2%25','%C2%']]) assert.equal(decode(input), expected);
 assert.throws(() => decode(null), TypeError);
 assert.deepEqual({...query.parse('name=Oat+milk&unit=%C2%B5g&item=a&item=b&bad=%C3%5A%A5')},
 {name:'Oat milk',unit:'µg',item:['a','b'],bad:'%C3Z%A5'});
 assert.equal(query.parse(query.stringify({term:'a+b å'})).term,'a+b å');
});
test('CommonJS compatibility output matches pinned upstream on mixed valid and malformed encodings', async () => {
 const source=fs.readFileSync(path.join(__dirname,'../vendor/decode-uri-component/upstream-0.5.0.js'),'utf8');
 const upstream=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
 const tokens=['%ab','%C3%A5','%','%25','%C2','%FE%FF','%80','%ED%A0%80','%F4%90%80%80','%20','+','é','%G0'];
 for(let i=0;i<tokens.length;i++)for(let j=0;j<tokens.length;j++) {
  const input=tokens[i]+'x'+tokens[j];
  assert.equal(decode(input),upstream(input.replace(/\+/g,' ')));
 }
});
test('large malformed URI finishes in an isolated bounded process through the real query consumer', () => {
 const child = spawnSync(process.execPath,['-e',`
  const query=require(${JSON.stringify(queryPath)});
  const bounded='%ff'.repeat(2000)+'%41';
  if(query.parse('payload='+bounded).payload!=='%ff'.repeat(2000)+'A')process.exit(5);
  const input='%ff'.repeat(30000)+'%41';
  let result; try { result=query.parse('payload='+input); } catch(error) { console.error(error.name, error.message.slice(0, 160)); process.exit(3); }
  if(result.payload!==input)process.exit(2);
  if(query.parse('payload='+'%41'.repeat(30000)).payload!=='A'.repeat(30000))process.exit(4);
 `],{timeout:3000,encoding:'utf8',maxBuffer:8192});
 assert.equal(child.error,undefined,child.error?.message);
 assert.equal(child.status,0,child.stderr);
});
