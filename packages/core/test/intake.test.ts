import test from 'node:test';
import assert from 'node:assert/strict';
import { extractLocalIntake, fictionalOcrPages, runFictionalIntake, sanitizeIntake } from '../src/intake.ts';
import { requirePersonalCapture } from '../src/captureGate.ts';
import type { LocalInputAdapter } from '../src/inputPrivacy.ts';
test('all fictional intake kinds produce source-bound review data, never clinical ratings',()=>{
 for(const kind of ['product','receipt','report'] as const){
  const result=extractLocalIntake(kind,fictionalOcrPages(kind));
  assert.equal(result.kind,kind);assert.equal(result.sanitized.removedLines,3);
  assert.equal(result.sanitized.outboundAllowed,false);
  assert.ok(!JSON.stringify(result).includes('123456789'));
 }
 const report=extractLocalIntake('report',fictionalOcrPages('report'));
 if(report.kind==='report')assert.equal(report.data.measurements.length,6);
 const product=extractLocalIntake('product',fictionalOcrPages('product'));
 if(product.kind==='product')assert.equal(product.data.nutrients.saturatedFat?.value.amount,.5);
});
test('food sanitization drops free text, altered fixture text and injection; uncertain OCR blocks',()=>{
 const pages=fictionalOcrPages('receipt');
 pages[0].lines[0].text='Retailer: Alice 555-1234';
 const result=sanitizeIntake('receipt',pages);
 assert.ok(!JSON.stringify(result).includes('Alice'));
 pages[0].lines[1].confidence=.2;
 assert.throws(()=>sanitizeIntake('receipt',pages));
 assert.throws(()=>requirePersonalCapture());
});
test('ambiguous report dates stay unknown; duplicate measurements are rejected',()=>{
 const pages=fictionalOcrPages('report');
 pages[0].lines.push({...pages[0].lines[0],id:'second-date',text:'Test date: 2026-09-21'});
 const result=extractLocalIntake('report',pages);
 if(result.kind==='report'){assert.equal(result.data.testDate,null);assert.ok(result.data.issues.includes('date-ambiguous'));}
 pages[0].lines.push({...pages[0].lines[2],id:'duplicate'});
 assert.throws(()=>extractLocalIntake('report',pages));
});
function adapter(overrides:Partial<LocalInputAdapter>={}){
 let disposed=0;
 const api:LocalInputAdapter={createSessionAsync:async()=>'session',cancelSession:()=>{},disposeSessionAsync:async()=>{disposed++;return true;},createSyntheticImageAsync:async()=>'file:fixture',renderTextAsync:async()=>'file:fixture',inspectAsync:async()=>fictionalOcrPages('report'),fingerprintSourceAsync:async()=>'sha256:source',...overrides};
 return {api,count:()=>disposed};
}
test('native intake fingerprints before inspection, cleans before returning review; no fallback on failure',async()=>{
 const a=adapter();
 const result=await runFictionalIntake('report',a.api,new AbortController().signal);
 assert.equal(result.mode,'native');assert.equal(result.fingerprint,'sha256:source');assert.equal(a.count(),1);
 const b=adapter({inspectAsync:async()=>{throw Error('OCR failed');}});
 await assert.rejects(runFictionalIntake('report',b.api,new AbortController().signal));assert.equal(b.count(),1);
 const c=adapter({disposeSessionAsync:async()=>false});
 await assert.rejects(runFictionalIntake('report',c.api,new AbortController().signal));
});
test('cancelled reading discards late native results and cleans the session',async()=>{
 const controller=new AbortController();
 const a=adapter({inspectAsync:async()=>{controller.abort();return fictionalOcrPages('report');}});
 await assert.rejects(runFictionalIntake('report',a.api,controller.signal));assert.equal(a.count(),1);
});

test('report extraction preserves printed comparisons, ranges, flags and page provenance',()=>{
 const pages=fictionalOcrPages('report');
 pages[0].lines[2].text='LDL Cholesterol <128 mg/dL 0-100 H';
 const result=extractLocalIntake('report',pages);
 if(result.kind!=='report')throw Error('Wrong kind');
 const row=result.data.measurements.find(v=>v.measurement.analyte==='ldl')!;
 assert.equal(row.measurement.comparator,'<');assert.equal(row.printedRange,'0-100');
 assert.equal(row.printedFlag,'H');assert.equal(row.sourcePage,1);
});

test('fixture-only food reading tolerates OCR spacing without inventing or changing values',()=>{
 const product=fictionalOcrPages('product');
 product[0].lines.find(l=>l.text.startsWith('Sugars:'))!.text='Sugars:1g';
 const result=extractLocalIntake('product',product);
 if(result.kind==='product')assert.equal(result.data.nutrients.sugars?.value.amount,1);
 const receipt=fictionalOcrPages('receipt');
 receipt[0].lines.find(l=>l.text.startsWith('FOOD | APPLES'))!.text='FOOD|APPLES|1.2 lb';
 const basket=extractLocalIntake('receipt',receipt);
 if(basket.kind==='receipt'){assert.equal(basket.data.lines.length,4);assert.equal(basket.data.lines[1].quantity?.value.amount,1.2);}
 product[0].lines.find(l=>l.text.startsWith('Sugars:'))!.text='Sugars:7g';
 const changed=extractLocalIntake('product',product);
 if(changed.kind==='product')assert.equal(changed.data.nutrients.sugars,null);
});

test('observed native NON-FO0D tag is corrected only in the fictional classifier, not amounts',()=>{
 const pages=fictionalOcrPages('receipt');
 pages[0].lines[4].text='NON-FO0D | PAPER TOWELS | 1 item';
 const result=extractLocalIntake('receipt',pages);
 if(result.kind==='receipt'){assert.equal(result.data.lines.length,4);assert.equal(result.data.lines[2].kind,'non-food');assert.ok(!result.data.issues.includes('partial-source'));}
 pages[0].lines[4].text='NON-FO0D | PAPER TOWELS | 9 item';
 const changed=extractLocalIntake('receipt',pages);
 if(changed.kind==='receipt'){assert.equal(changed.data.lines.length,3);assert.ok(changed.data.issues.includes('partial-source'));}
});
