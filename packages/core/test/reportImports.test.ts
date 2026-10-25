import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fingerprintReportSource, registerPanelImport, demoPanel, newSnapshot, LocalSession, ReportCoordinator, selectCurrentPanel, type BetaSnapshot } from '../src/index.ts';
const now='2026-10-06T20:00:00Z';
const fresh=(id='first',fingerprint='fixture-source')=>({...demoPanel(id,now),fingerprint,confirmed:true,status:'ready' as const});
test('source fingerprint uses exact bounded bytes and matches independent SHA-256 implementation',()=>{
 const bytes=new TextEncoder().encode('fictional report bytes');
 const expected='sha256:'+createHash('sha256').update('health-grocery-report-source-v1\0').update(bytes).digest('hex');
 assert.equal(fingerprintReportSource(bytes),expected);
 assert.equal(fingerprintReportSource(bytes.slice()),expected);
 assert.notEqual(fingerprintReportSource(new TextEncoder().encode('fictional report bytes ')),expected);
 assert.throws(()=>fingerprintReportSource(new Uint8Array()));
 assert.throws(()=>fingerprintReportSource(new Uint8Array(20*1024*1024+1)));
});
test('duplicate source preserves corrected completed result and original record identity',()=>{
 const saved={...fresh(),status:'completed' as const,analysis:'Already saved',revision:3,testDate:'2026-09-18'};
 const snapshot={...newSnapshot(),panels:[saved]};
 const duplicate=registerPanelImport(snapshot,fresh('second'));
 assert.equal(duplicate.snapshot,snapshot);assert.equal(duplicate.id,'first');assert.equal(duplicate.reused,true);
 assert.equal(duplicate.snapshot.panels[0].revision,3);assert.equal(duplicate.snapshot.panels[0].analysis,'Already saved');
});
test('different files with the same test date stay separate and cannot silently become the current panel',()=>{
 const a=registerPanelImport(newSnapshot(),fresh()).snapshot;
 const b=registerPanelImport(a,fresh('second','other-source')).snapshot;
 assert.equal(b.panels.length,2);assert.equal(selectCurrentPanel(b.panels).panel,null);
 assert.deepEqual(new Set(selectCurrentPanel(b.panels).unresolved),new Set(['first','second']));
 const newer={...fresh('newest','third'),testDate:'2026-09-21'};
 assert.equal(selectCurrentPanel(registerPanelImport(b,newer).snapshot.panels).panel?.id,'newest');
});
test('ambiguous existing identities, reused IDs, unconfirmed values and invalid dates cannot overwrite history',()=>{
 const snapshot={...newSnapshot(),panels:[fresh()]};
 assert.throws(()=>registerPanelImport(snapshot,fresh('first','different')));
 assert.throws(()=>registerPanelImport({...snapshot,panels:[fresh(),fresh('duplicate')]},fresh('third')));
 for(const next of [{...fresh(),confirmed:false},{...fresh(),testDate:'2026-02-30'},{...fresh(),testDate:'09/20/2026'},{...fresh(),analysis:'Unsolicited'}])
  assert.throws(()=>registerPanelImport(newSnapshot(),next));
});
test('concurrent imports resolve against serialized state and reuse saved analysis without another dispatch',async()=>{
 let disk:BetaSnapshot=newSnapshot();
 const session=new LocalSession({read:async()=>disk,write:async next=>{disk=structuredClone(next);},clear:async()=>{}});
 await session.initialize();const ids:string[]=[];
 await Promise.all(['first','second'].map(id=>session.commit(s=>{const result=registerPanelImport(s,fresh(id));ids.push(result.id);return result.snapshot;})));
 assert.deepEqual(ids,['first','first']);assert.equal(disk.panels.length,1);
 let calls=0;const runner=new ReportCoordinator(session,async()=>{calls++;return 'Saved result';});
 assert.equal(await runner.run('first'),'saved');
 await session.commit(s=>registerPanelImport(s,fresh('third')).snapshot);
 assert.equal(await runner.run('first'),'reused');assert.equal(calls,1);
});
test('failed import write leaves prior history intact and explicit retry saves once',async()=>{
 let disk:BetaSnapshot=newSnapshot();let fail=false;
 const session=new LocalSession({read:async()=>disk,write:async next=>{if(fail)throw Error('Full');disk=structuredClone(next);},clear:async()=>{}});
 await session.initialize();fail=true;
 assert.equal(await session.commit(s=>registerPanelImport(s,fresh()).snapshot),false);assert.equal(disk.panels.length,0);
 fail=false;assert.equal(await session.commit(s=>registerPanelImport(s,fresh()).snapshot),true);assert.equal(disk.panels.length,1);
});
