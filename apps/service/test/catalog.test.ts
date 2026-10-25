import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mapPublicProduct, lookupPublicProduct } from '../src/catalog.ts';
const fixture = { product: { code: '036000291452', product_name: 'Invented public-source test product', nutriments: { sodium_100g: 0.1, fiber_100g: 0 } } };
test('catalog adapter preserves unknowns, converts documented sodium g basis, never certifies or infers retailer', () => {
  const fact = mapPublicProduct(fixture, fixture.product.code, '2026-10-05T00:00:00Z')!;
  assert.equal(fact.sodiumMg, 100); assert.equal(fact.fiberG, 0); assert.equal(fact.saturatedFatG, null); assert.equal(fact.ingredients, null);
  assert.equal(fact.certifications, 'unverified'); assert.equal(fact.retailerMembership, 'unverified');
  assert.throws(() => mapPublicProduct(fixture, '4006381333931', '2026-10-05T00:00:00Z'));
});
test('catalog adapter is bounded and does not retry provider failures', async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; return new Response(JSON.stringify(fixture)); };
  assert.equal((await lookupPublicProduct(fixture.product.code, { userAgent: 'Fixture/1 (test@example.com)', staging: true, fetcher }))?.name, fixture.product.product_name);
  await assert.rejects(lookupPublicProduct(fixture.product.code, { userAgent: 'unset', staging: true, fetcher })); assert.equal(calls, 1);
  await assert.rejects(lookupPublicProduct(fixture.product.code, { userAgent: 'Fixture/1 (test@example.com)', staging: true, fetcher: async () => new Response('x'.repeat(256001)) }));
});
