import { test } from 'node:test';
import assert from 'node:assert/strict';
import { demoReceipt, newSnapshot, receiptSchema, receiptCoverage, parsePurchaseQuantity, summarizeReceipt, possibleDuplicateLineIds } from '../src/index.ts';
const fixture = () => demoReceipt('receipt', newSnapshot().profile, '2026-10-06T12:00:00Z');
test('partial receipt preserves matches, excludes refunds and never treats purchase weights as portions', () => {
  const receipt = fixture(); const summary = summarizeReceipt(receipt);
  assert.equal(summary.state, 'partial'); assert.equal(summary.matched, 2);
  assert.equal(summary.unresolved, 1); assert.equal(summary.refunds, 1); assert.equal(summary.weighted, 1);
  assert.equal(summary.labels.Limit, 1); assert.equal(summary.labels.Neutral, 1);
  assert.equal(Object.values(summary.labels).reduce((a, b) => a + b, 0), 2);
  receipt.lines[0].quantity = 999; receipt.lines[1].unit = 'kg';
  assert.deepEqual(summarizeReceipt(receipt).labels, summary.labels);
});
test('stale product references and unknown classifications never inflate matched coverage', () => {
  const receipt = fixture(); receipt.lines[0].productId = 'not-in-catalog'; receipt.lines[2].productId = 'sample-oats';
  assert.deepEqual(receiptCoverage(receipt.lines), { food: 2, matched: 1, unresolved: 2, excluded: 2 });
  assert.equal(summarizeReceipt(receipt).matched, 1);
});
test('no-food, empty and entirely unresolved receipts remain distinguishable', () => {
  const receipt = fixture(); receipt.lines = receipt.lines.filter(line => ['non-food', 'refund'].includes(line.kind));
  assert.equal(summarizeReceipt(receipt).state, 'no-food');
  receipt.lines = []; assert.equal(summarizeReceipt(receipt).state, 'no-food');
  receipt.lines = [{ ...fixture().lines[2], productId: 'sample-oats' }];
  assert.equal(summarizeReceipt(receipt).state, 'partial'); assert.equal(summarizeReceipt(receipt).matched, 0);
});
test('duplicate detection does not conflate refunds or unequal weights and duplicate IDs cannot save', () => {
  const receipt = fixture(); const original = receipt.lines[0];
  receipt.lines.push({ ...original, id: 'copy', text: '  maple  almd gran ' },
    { ...original, id: 'other-weight', quantity: 2 }, { ...original, id: 'return', kind: 'refund' });
  assert.deepEqual(possibleDuplicateLineIds(receipt.lines), [original.id, 'copy']);
  assert.equal(receipt.lines.length, 8); receipt.lines.push({ ...original });
  assert.equal(receiptSchema.safeParse(receipt).success, false);
});
test('quantity drafts accept decimal/comma inputs but reject zero, signs and exponent notation', () => {
  for (const [text, expected] of [['1.', 1], ['1.25', 1.25], ['0,45', .45], ['.5', .5], [' 2 ', 2]] as const)
    assert.equal(parsePurchaseQuantity(text), expected);
  for (const text of ['', '0', '-2', '1e3', 'Infinity', '1,2,3', 'abc']) assert.equal(parsePurchaseQuantity(text), null);
});
test('basket uses historical profile and preserves insufficient-information outcomes', () => {
  const receipt = fixture(); receipt.profile = { ...receipt.profile, pregnancy: 'pregnant' };
  assert.equal(summarizeReceipt(receipt).labels['Insufficient information'], 2);
});
