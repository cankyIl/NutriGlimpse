import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseExtraction } from '../src/index.ts';
const entry={measurement:{analyte:'ldl',rawValue:'128',unit:'mg/dL',comparator:'='},printedRange:null,printedFlag:null,sourcePage:1,uncertain:false};
const data={schemaVersion:1,testDate:'2026-09-20',measurements:[entry],issues:[]};
const parse=(patch:Record<string,unknown>={},pages:readonly number[]=[1])=>parseExtraction(JSON.stringify({...data,...patch}),pages);
test('lab extraction stays unconfirmed even when provider marks every field certain',()=>{
 const result=parse();assert.equal(result.status,'needs-review');assert.equal(result.confirmed,false);assert.equal(result.clinicalUseAllowed,false);
 for(const extra of [{confirmed:true},{clinicalUseAllowed:true},{status:'ready'}]) assert.throws(()=>parse(extra));
});
test('calendar dates reject impossible days and preserve valid leap days without interpreting ambiguous text',()=>{
 for(const testDate of ['2026-02-29','2026-04-31','2026-13-01','03/04/26','2026-1-1'])assert.throws(()=>parse({testDate}));
 assert.equal(parse({testDate:'2024-02-29'}).testDate,'2024-02-29');
});
test('measurement pages must exist in the actual supplied input',()=>{
 assert.throws(()=>parse({measurements:[{...entry,sourcePage:2}]}));
 assert.equal(parse({measurements:[{...entry,sourcePage:2}]},[2]).measurements[0].sourcePage,2);
 for(const pages of [[],[1,1],[0],[11],[1.5],[NaN]])assert.throws(()=>parse({},pages));
});
test('missing and ambiguous dates remain null and must be declared for review',()=>{
 assert.throws(()=>parse({testDate:null}));
 assert.throws(()=>parse({issues:['date-ambiguous']}));
 assert.throws(()=>parse({issues:['date-missing']}));
 for(const issue of ['date-missing','date-ambiguous'])assert.equal(parse({testDate:null,issues:[issue]}).testDate,null);
});
test('uncertainty and printed annotations survive without replacing units or comparison signs',()=>{
 const result=parse({measurements:[{...entry,measurement:{analyte:'lpa',rawValue:'10',unit:'nmol/L',comparator:'<'},uncertain:true,printedFlag:'H',printedRange:'0-75'}],issues:['unit-ambiguous','partial-source']});
 assert.equal(result.measurements[0].uncertain,true);assert.equal(result.measurements[0].measurement.comparator,'<');
 assert.equal(result.measurements[0].measurement.unit,'nmol/L');assert.equal(result.measurements[0].printedFlag,'H');
 assert.equal(result.confirmed,false);assert.equal(result.clinicalUseAllowed,false);
});
