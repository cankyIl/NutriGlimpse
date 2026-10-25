import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeBarcode, normalizeScannedBarcode } from '../src/index.ts';
test('UPC-E expansion covers every compression branch and both number systems',()=>{
 const cases=[['01234505','012000003455'],['01234514','012100003454'],['01234523','012200003453'],
 ['01234531','012300000451'],['01234543','012340000053'],['01234558','012345000058'],
 ['05096893','050968000093'],['12345670','123456000070']];
 for(const [compressed,expanded] of cases){
  assert.equal(normalizeScannedBarcode(compressed,'upc_e'),expanded.padStart(14,'0'));
  assert.equal(normalizeBarcode(compressed,'upc_e'),normalizeBarcode(expanded));
 }
});
test('UPC-E check digits are validated after expansion, never as EAN-8',()=>{
 assert.equal(normalizeBarcode('05096893'),'00000005096893');
 assert.equal(normalizeScannedBarcode('05096893','upc_e'),'00050968000093');
 assert.equal(normalizeScannedBarcode('05096893','ean8'),'00000005096893');
 assert.equal(normalizeScannedBarcode('05096894','upc_e'),null);
});
test('partial UPC-E, unsupported number systems and unrecognized scanner formats fail closed',()=>{
 for(const code of ['050968','0509689','25096893','05096abc','050968930','https://example.com'])
  assert.equal(normalizeScannedBarcode(code,'upc_e'),null);
 assert.equal(normalizeScannedBarcode('036000291452','qr'),null);
 assert.equal(normalizeScannedBarcode('036000291452','ean13'),null);
});
test('UPC-A and leading-zero EAN-13 scanner representations share the same GTIN',()=>{
 assert.equal(normalizeScannedBarcode('036000291452','upc_a'),'00036000291452');
 assert.equal(normalizeScannedBarcode('0036000291452','ean13'),'00036000291452');
 assert.equal(normalizeScannedBarcode('96385074','ean8'),'00000096385074');
});
