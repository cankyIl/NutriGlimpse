import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer } from '../src/server.ts';
import type { AddressInfo } from 'node:net';

test('REQ-PRIVACY-03/08: fixture service rejects personal processing and never echoes request bodies', async () => {
  const server = createAppServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const response = await fetch(`${base}/v1/labs/analyze`, { method: 'POST', body: 'SYNTHETIC-IDENTIFIER-DO-NOT-ECHO' });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.ok(!(await response.text()).includes('SYNTHETIC-IDENTIFIER-DO-NOT-ECHO'));
    const catalog = await fetch(`${base}/v1/catalog/samples`);
    const result = await catalog.json();
    assert.equal(result.synthetic, true);
    assert.equal(result.products.length, 4);
    assert.equal((await fetch(`${base}/v1/profile`)).status, 404);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
