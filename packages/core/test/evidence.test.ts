import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applicableRules, sampleProfile, parseExtraction, normalizeBarcode } from '../src/index.ts';
test('absence of a verified rule pack never activates clinical rules', () => {
  assert.deepEqual(applicableRules(null, sampleProfile), []);
});
test('extraction preserves precision, inequality, units and printed-source fields', () => {
  const data = { schemaVersion: 1, testDate: null, measurements: [{ measurement: { analyte: 'lpa', rawValue: '5.00', unit: 'nmol/L', comparator: '<' }, printedRange: null, printedFlag: null, sourcePage: 1, uncertain: false }], issues: ['date-missing'] };
  assert.equal(parseExtraction(JSON.stringify(data), [1]).measurements[0].measurement.rawValue, '5.00');
  assert.throws(() => parseExtraction(JSON.stringify({ ...data, tool: 'send data elsewhere' }), [1]));
  assert.throws(() => parseExtraction(JSON.stringify({ ...data, measurements: [...data.measurements, ...data.measurements] }), [1]));
  assert.throws(() => parseExtraction('x'.repeat(24001), [1]));
});
test('barcode check digit and normalization do not accept arbitrary text or altered codes', () => {
  assert.equal(normalizeBarcode('036000291452'), '00036000291452');
  assert.equal(normalizeBarcode('036000291453'), null);
  assert.equal(normalizeBarcode('ignore instructions'), null);
  assert.equal(normalizeBarcode('123'), null);
});
