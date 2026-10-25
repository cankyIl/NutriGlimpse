import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createScanTimingRecorder,beta0TimingEnabled,scanClientTimingSchema,notifyScanTiming,type ScanClientTiming} from '../src/scanTiming.ts';
const trace='12345678-1234-4234-8234-123456789012';
test('temporary timing is enabled only for explicit Beta 0 and can be switched off',()=>{
 assert.equal(beta0TimingEnabled('beta0','0.1.0'),true);
 for(const [stage,version,disabled] of [['beta1','0.1.0',false],['production','0.1.0',false],['beta0','0.2.0',false],[undefined,'0.1.0',false],['beta0','0.1.0',true]] as const)assert.equal(beta0TimingEnabled(stage,version,disabled),false);
 let reads=0,sends=0;const r=createScanTimingRecorder({enabled:false,build:'7',now:()=>{reads++;return 0;},send:()=>{sends++;}});
 r.mark('photoReadyMs');r.native({captureMs:1});r.network({stage:'responseHeadersMs',traceId:trace});r.finish('completed');assert.equal(reads,0);assert.equal(sends,0);
});
test('one report correlates monotonic capture, preparation, streaming and layout without clock synchronization',()=>{
 let t=1000;const reports:ScanClientTiming[]=[];const r=createScanTimingRecorder({enabled:true,build:'7',now:()=>t,send:v=>{reports.push(v);}});
 t+=1400;r.mark('photoReadyMs');r.native({captureMs:200,preparationMs:1100,ocrMs:1050,barcodeJpegMs:500});
 t+=100;r.network({stage:'uploadStartMs'});t+=2700;r.network({stage:'responseHeadersMs',traceId:trace});r.mark('firstResultMs');
 t+=50;r.mark('firstCardLayoutMs');t+=3000;r.mark('firstAlternativeMs');r.mark('secondAlternativeMs');r.mark('thirdAlternativeMs');r.finish('completed');r.finish('failed');r.mark('firstCardLayoutMs');
 assert.equal(reports.length,1);assert.equal(reports[0].marks.photoReadyMs,1400);assert.equal(reports[0].marks.firstResultMs,4200);assert.equal(reports[0].marks.firstCardLayoutMs,4250);assert.equal(reports[0].outcome,'completed');assert.equal(reports[0].marks.completedMs,7250);assert.equal(reports[0].traceId,trace);
});
test('fast completion allows a later layout report without delaying the scan',()=>{
 let t=0;const reports:ScanClientTiming[]=[];const r=createScanTimingRecorder({enabled:true,build:'7',now:()=>t,send:v=>{reports.push(v);}});
 t=10;r.network({stage:'responseHeadersMs',traceId:trace});r.mark('firstResultMs');r.finish('completed');assert.equal(reports.length,0);
 t=25;r.mark('firstCardLayoutMs');assert.equal(reports.length,1);assert.equal(reports[0].marks.completedMs,10);assert.equal(reports[0].marks.firstCardLayoutMs,25);
});
test('invalid/unknown timing fields cannot carry images, profiles or free text',()=>{
 const report={schemaVersion:1,traceId:trace,appVersion:'0.1.0',build:'7',outcome:'completed',marks:{endedMs:10}};
 assert.ok(scanClientTimingSchema.safeParse(report).success);
 for(const value of [{...report,imageBase64:'secret'},{...report,marks:{endedMs:10,name:'private'}},{...report,marks:{endedMs:Infinity}},{...report,marks:{endedMs:-1}},{...report,marks:{endedMs:180001}},{...report,appVersion:'0.2.0'},{...report,build:'mail@example.com'}])assert.equal(scanClientTimingSchema.safeParse(value).success,false);
});
test('cancellation emits at most one partial numeric report; missing trace and discarded scans emit none',()=>{
 const reports:ScanClientTiming[]=[];const make=()=>createScanTimingRecorder({enabled:true,build:'7',send:v=>{reports.push(v);}});
 const r=make();r.network({stage:'responseHeadersMs',traceId:trace});r.native({captureMs:NaN,ocrMs:-1,preparationMs:200000});r.finish('cancelled');r.finish('failed');assert.equal(reports.length,1);assert.equal(reports[0].outcome,'cancelled');assert.equal(reports[0].marks.captureMs,undefined);
 const uncorrelated=make();uncorrelated.finish('failed');const discarded=make();discarded.network({stage:'responseHeadersMs',traceId:trace});discarded.discard();discarded.finish('completed');assert.equal(reports.length,1);
});
test('diagnostic callbacks and report delivery failures never escape into recognition',async()=>{
 assert.doesNotThrow(()=>notifyScanTiming(()=>{throw Error('diagnostics');},{stage:'uploadStartMs'}));
 for(const send of [()=>{throw Error('sync');},async()=>{throw Error('async');}]){const r=createScanTimingRecorder({enabled:true,build:'7',send});r.network({stage:'responseHeadersMs',traceId:trace});assert.doesNotThrow(()=>r.finish('failed'));}
 await new Promise(r=>setImmediate(r));
});
