import { test } from 'node:test';
import assert from 'node:assert/strict';
import { correctPanel, demoPanel, newSnapshot, parseSnapshot, LocalSession, ReportCoordinator } from '../src/index.ts';
const now='2026-10-06T15:00:00Z';
const panel={...demoPanel('p',now),confirmed:true,status:'completed' as const,analysis:'Saved original result'};
const values={testDate:panel.testDate,measurements:panel.measurements.map(m=>m.analyte==='ldl'?{...m,rawValue:'125'}:m)};
function snapshot(){return {...newSnapshot(),panels:[structuredClone(panel)]};}
test('correction retains source identity, increments revision and invalidates only the old analysis',()=>{
 const input=snapshot();const corrected=correctPanel(input,panel,values,now).panels[0];
 assert.equal(corrected.revision,2);assert.equal(corrected.fingerprint,panel.fingerprint);
 assert.equal(corrected.importedAt,panel.importedAt);assert.equal(corrected.correctedAt,now);
 assert.equal(corrected.analysis,null);assert.equal(corrected.status,'ready');
 assert.equal(input.panels[0].analysis,'Saved original result');
 assert.equal(correctPanel({...input,panels:[corrected]},corrected,{...values,testDate:'2026-09-21'},now).panels[0].revision,3);
});
test('unchanged correction preserves completed result and does not manufacture a revision',()=>{
 const input=snapshot();assert.equal(correctPanel(input,panel,panel,now),input);
});
test('stale or missing source, invalid date and unsupported units cannot overwrite saved data',()=>{
 assert.throws(()=>correctPanel({...snapshot(),panels:[]},panel,values,now));
 assert.throws(()=>correctPanel({...snapshot(),panels:[{...panel,analysis:'Changed'}]},panel,values,now));
 for(const testDate of [null,'2026-02-30','09/20/2026','']) assert.throws(()=>correctPanel(snapshot(),panel,{...values,testDate},now));
 assert.throws(()=>correctPanel(snapshot(),panel,{...values,measurements:[{...values.measurements[0],unit:'nmol/L'}]},now));
});
test('existing archives without revision metadata remain valid and corrected metadata round trips',()=>{
 assert.equal(parseSnapshot(snapshot()).panels[0].revision,undefined);
 const revised=correctPanel(snapshot(),panel,values,now);
 assert.deepEqual(parseSnapshot(JSON.parse(JSON.stringify(revised))),revised);
});
test('failed correction write preserves previous result and allows an explicit retry',async()=>{
 let disk=snapshot();let fail=false;
 const session=new LocalSession({read:async()=>disk,write:async next=>{if(fail)throw Error('Full');disk=structuredClone(next) as typeof disk;},clear:async()=>{}});
 await session.initialize();fail=true;
 assert.equal(await session.commit(s=>correctPanel(s,panel,values,now)),false);
 assert.equal(session.snapshot.panels[0].analysis,panel.analysis);
 fail=false;assert.equal(await session.commit(s=>correctPanel(s,panel,values,now)),true);
 assert.equal(session.snapshot.panels[0].revision,2);
});
test('a late response to an earlier revision is discarded, and corrected values require explicit processing',async()=>{
 let disk={...snapshot(),panels:[{...panel,status:'ready' as const,analysis:null}]};
 const session=new LocalSession({read:async()=>disk,write:async next=>{disk=structuredClone(next) as typeof disk;},clear:async()=>{}});
 await session.initialize();let resolve!:(v:string)=>void;let calls=0;
 const runner=new ReportCoordinator(session,async()=>{calls++;return calls===1?new Promise<string>(r=>{resolve=r;}):'Corrected result';});
 const task=runner.run('p');await new Promise(r=>setImmediate(r));
 const active=session.snapshot.panels[0];
 assert.equal(await session.commit(s=>correctPanel(s,active,values,now)),true);
 assert.equal(calls,1);resolve('Stale result');assert.equal(await task,'discarded');
 assert.equal(session.snapshot.panels[0].analysis,null);
 assert.equal(await runner.run('p'),'saved');assert.equal(calls,2);
 assert.equal(await runner.run('p'),'reused');assert.equal(calls,2);
});
test('two concurrent corrections cannot silently overwrite each other',async()=>{
 let disk=snapshot();const session=new LocalSession({read:async()=>disk,write:async next=>{disk=structuredClone(next) as typeof disk;},clear:async()=>{}});
 await session.initialize();
 const result=await Promise.all([session.commit(s=>correctPanel(s,panel,values,now)),session.commit(s=>correctPanel(s,panel,{...values,testDate:'2026-09-21'},now))]);
 assert.deepEqual(result,[true,false]);assert.equal(session.snapshot.panels[0].testDate,panel.testDate);
});
