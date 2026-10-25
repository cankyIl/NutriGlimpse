import { test } from 'node:test';
import assert from 'node:assert/strict';
import { straightLineMiles, nearbyBranches, directionsUrl } from '../src/index.ts';
test('branch distance ordering filters outside radius and keeps only evidenced relevant retailers', () => {
  const origin = { latitude: 0, longitude: 0 };
  assert.equal(straightLineMiles(origin, origin), 0);
  const branch = { id: 'b', retailer: 'Test retailer', name: 'Synthetic branch', address: 'Synthetic address', sourceUrl: 'https://example.com/fixture', verifiedAt: '2026-10-05T00:00:00Z', coordinates: { latitude: 0, longitude: 0.1 } };
  const result = nearbyBranches(origin, [branch, { ...branch, id: 'a', coordinates: origin }, { ...branch, id: 'far', coordinates: { latitude: 5, longitude: 0 } }, { ...branch, id: 'no-evidence', sourceUrl: '' }], ['Test retailer'], 10);
  assert.deepEqual(result.map(b => b.id), ['a','b']);
  assert.throws(() => straightLineMiles(origin, { latitude: 91, longitude: 0 }));
  assert.match(directionsUrl(origin), /destination=0,0$/);
});
