import test from 'node:test';
import assert from 'node:assert/strict';
import { searchBranches, confirmBranch } from '../src/branchSearch.ts';
const branch={id:'fixture-a',retailer:'Wegmans',name:'Fictional branch',address:'Fictional address',coordinates:{latitude:42,longitude:-73},sourceUrl:'https://example.com/fixture',verifiedAt:'2026-10-01T00:00:00Z'};
test('manual branch search remains bounded, explicit and source-backed',async()=>{
 await assert.rejects(searchBranches('Sample area',null,['Wegmans'],10,undefined,new AbortController().signal));
 const source=async()=>({origin:{latitude:42,longitude:-73},originLabel:'Fictional area',branches:[branch]});
 const result=await searchBranches('Sample area',null,['Wegmans'],10,source,new AbortController().signal);
 assert.equal(result.branches.length,1);assert.equal(confirmBranch(result,'fixture-a').id,'fixture-a');
 assert.throws(()=>confirmBranch(result,'missing'));
 const c=new AbortController();const late=async()=>{c.abort();return source();};
 await assert.rejects(searchBranches('Sample area',null,['Wegmans'],10,late,c.signal));
 const duplicate=async()=>({...await source(),branches:[branch,branch]});
 await assert.rejects(searchBranches('Sample area',null,['Wegmans'],10,duplicate,new AbortController().signal));
});
