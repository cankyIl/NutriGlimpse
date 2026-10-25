import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { encryptArchive, decryptArchive, newSnapshot, parseSnapshot, recoverSnapshot, demoReceipt, demoPanel, receiptCoverage } from '../src/index.ts';

test('archive authenticates round trip, wrong password and tampering', async () => {
  const original = newSnapshot();
  original.receipts.push(demoReceipt('receipt1', original.profile, '2026-10-05T12:00:00Z'));
  const password = 'beta-test-passphrase';
  const encoded = await encryptArchive(original, password, randomBytes);
  assert.equal(encoded.includes('MAPLE ALMD'), false);
  assert.deepEqual(await decryptArchive(encoded, password), original);
  await assert.rejects(decryptArchive(encoded, 'wrong-passphrase'));
  const tampered = JSON.parse(encoded);
  tampered.ciphertext = (tampered.ciphertext[0] === '0' ? '1' : '0') + tampered.ciphertext.slice(1);
  await assert.rejects(decryptArchive(JSON.stringify(tampered), password));
  const nonce = JSON.parse(encoded); nonce.nonce = '00'.repeat(12);
  await assert.rejects(decryptArchive(JSON.stringify(nonce), password));
  assert.notEqual(encoded, await encryptArchive(original, password, randomBytes));
});

test('archive rejects untrusted cost, unsupported fields and weak passphrases', async () => {
  await assert.rejects(encryptArchive(newSnapshot(), 'short', randomBytes));
  await assert.rejects(decryptArchive(JSON.stringify({ kdf: 'scrypt-N1073741824' }), 'anything'));
  assert.throws(() => parseSnapshot({ ...newSnapshot(), photos: ['private'] }));
  assert.throws(() => parseSnapshot({ ...newSnapshot(), version: 99 }));
});

test('saved-state validation rejects duplicate IDs and incomplete success', () => {
  const data = newSnapshot();
  data.panels.push(demoPanel('same', '2026-10-05T12:00:00Z'), demoPanel('same', '2026-10-05T12:00:00Z'));
  assert.throws(() => parseSnapshot(data));
  data.panels = [{ ...data.panels[0], status: 'completed' }];
  assert.throws(() => parseSnapshot(data));
});

test('restart preserves success and pending results, marks interrupted dispatch uncertain', () => {
  const data = newSnapshot(); const panel = demoPanel('interrupted', '2026-10-05T12:00:00Z');
  data.panels = [{ ...panel, status: 'in-flight' }, { ...panel, id: 'pending', status: 'save-pending', analysis: 'Retain this result' }, { ...panel, id: 'done', status: 'completed', confirmed: true, analysis: 'Saved result' }];
  const restored = recoverSnapshot(data);
  assert.equal(restored.panels[0].status, 'outcome-unknown');
  assert.equal(restored.panels[1].analysis, 'Retain this result');
  assert.equal(restored.panels[2].status, 'completed');
  assert.equal(data.panels[0].status, 'in-flight');
});

test('receipt coverage excludes returns and non-food and retains ambiguous purchases', () => {
  const data = newSnapshot(); const receipt = demoReceipt('receipt', data.profile, '2026-10-05T12:00:00Z');
  assert.deepEqual(receiptCoverage(receipt.lines), { food: 2, matched: 2, unresolved: 1, excluded: 2 });
  receipt.lines[2] = { ...receipt.lines[2], kind: 'food' };
  assert.deepEqual(receiptCoverage(receipt.lines), { food: 3, matched: 2, unresolved: 1, excluded: 2 });
});
