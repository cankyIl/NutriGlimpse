import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessSample, sampleAlternatives, sampleProfile, products, selectCurrentPanel, nextReportAction, requirePersonalProcessing, validateProfile } from '../src/index.ts';
import type { ConfirmedPanel, Profile } from '../src/index.ts';

const profile: Profile = { ...sampleProfile, pregnancy: 'not-pregnant' };
test('REQ-ASSESS-01/06: missing facts never become Neutral', () => {
  assert.equal(assessSample(products[3], profile).label, 'Insufficient information');
});
test('REQ-PROFILE-05: unverified is not a proven conflict and excludes alternatives', () => {
  const constrained = { ...profile, restrictions: ['halal' as const] };
  assert.equal(assessSample(products[0], constrained).label, 'Insufficient information');
  assert.deepEqual(sampleAlternatives(products[0], products, constrained, 'Wegmans'), []);
});
test('REQ-PROFILE-04: conflicts survive primary-concern and missing-data precedence', () => {
  const product = { ...products[3], compliance: { ...products[3].compliance, dairyFree: 'conflict' as const } };
  const result = assessSample(product, { ...profile, restrictions: ['dairyFree'] });
  assert.equal(result.label, 'Restriction conflict');
  assert.ok(result.missing.includes('Ingredients'));
});
test('REQ-ASSESS-04: no unsupported pregnancy or CKD rating', () => {
  assert.equal(assessSample(products[1], { ...sampleProfile, pregnancy: 'unspecified' }).label, 'Insufficient information');
  assert.equal(assessSample(products[1], { ...profile, conditions: ['cardiovascular', 'ckd'] }).label, 'Insufficient information');
});
test('REQ-SCOPE-03: 21 boundary and no upper cutoff', () => {
  assert.ok(validateProfile({ ...profile, age: 20 }));
  assert.equal(validateProfile({ ...profile, age: 21 }), null);
  assert.equal(validateProfile({ ...profile, age: 103 }), null);
});
test('REQ-ALT-01/02: same-purpose alternative, never unrelated produce', () => {
  assert.deepEqual(sampleAlternatives(products[0], products, profile, 'Wegmans').map(p => p.id), ['sample-oats']);
});
test('REQ-ASSESS-03: portion changes do not reuse unsupported categories', () => {
  assert.equal(assessSample(products[1], profile, 2).label, 'Insufficient information');
  assert.throws(() => assessSample(products[1], profile, -1));
});
const panel = (id: string, testDate: string | null, confirmed = true): ConfirmedPanel => ({ id, testDate, confirmed, importedAt: '2026-10-05', measurements: [] });
test('REQ-LAB-06: test date wins over import order; unconfirmed is excluded', () => {
  assert.equal(selectCurrentPanel([panel('new', '2026-09-01'), panel('old', '2025-01-01'), panel('draft', '2026-10-01', false)]).panel?.id, 'new');
});
test('REQ-LAB-06: same-date ambiguity and invalid dates stay explicit', () => {
  assert.equal(selectCurrentPanel([panel('a', '2026-09-01'), panel('b', '2026-09-01')]).panel, null);
  assert.deepEqual(selectCurrentPanel([panel('a', '2026-02-30')]).unresolved, ['a']);
});
test('REQ-LAB-08: completed reuse, save-first recovery, and user-controlled retries', () => {
  assert.equal(nextReportAction({ status: 'completed', result: 'saved' }, true), 'reuse');
  assert.equal(nextReportAction({ status: 'save-pending', result: 'received' }, true), 'save-locally');
  assert.equal(nextReportAction({ status: 'in-flight' }, true), 'wait');
  assert.equal(nextReportAction({ status: 'outcome-unknown' }, false), 'ask-to-retry');
  assert.equal(nextReportAction({ status: 'outcome-unknown' }, true), 'dispatch');
});
test('REQ-PRIVACY-08: personal processing stays closed', () => assert.throws(requirePersonalProcessing));
