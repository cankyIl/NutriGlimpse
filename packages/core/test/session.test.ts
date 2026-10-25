import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LocalSession, ReportCoordinator, newSnapshot, demoPanel, type BetaSnapshot, type AnalysisAdapter } from '../src/index.ts';
async function fixture(analyze: AnalysisAdapter) {
  let disk = newSnapshot(); let fail = false;
  disk.panels.push({ ...demoPanel('panel', '2026-10-05T00:00:00Z'), confirmed: true, status: 'ready' });
  const session = new LocalSession({ read: async () => disk, write: async value => { if (fail) throw new Error('Disk full'); disk = structuredClone(value); }, clear: async () => {} });
  await session.initialize();
  return { session, runner: new ReportCoordinator(session, analyze, 100), disk: () => disk, fail: (value: boolean) => { fail = value; } };
}
function deferred<T>() { let resolve!: (v: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
const tick = () => new Promise(resolve => setImmediate(resolve));
test('session serializes independent concurrent writes and preserves disk on failure', async () => {
  const f = await fixture(async () => 'result');
  await Promise.all([f.session.commit(s => ({ ...s, store: 'Target' })), f.session.commit(s => ({ ...s, radius: 20 }))]);
  assert.equal(f.disk().store, 'Target'); assert.equal(f.disk().radius, 20);
  f.fail(true); assert.equal(await f.session.commit(s => ({ ...s, radius: 30 })), false);
  assert.equal(f.session.snapshot.radius, 20);
  f.fail(false); assert.equal(await f.session.commit(s => ({ ...s, radius: 40 })), true);
});
test('double dispatch and reopen call adapter only once', async () => {
  const result = deferred<string>(); let calls = 0;
  const f = await fixture(async () => { calls++; return result.promise; });
  const first = f.runner.run('panel'); assert.equal(await f.runner.run('panel'), 'busy');
  await tick(); result.resolve('Valid synthetic result');
  assert.equal(await first, 'saved'); assert.equal(await f.runner.run('panel'), 'reused'); assert.equal(calls, 1);
});
test('local save retry does not repeat successful analysis', async () => {
  let calls = 0; const result = deferred<string>();
  const f = await fixture(async () => { calls++; return result.promise; });
  const task = f.runner.run('panel'); await tick(); f.fail(true); result.resolve('Retain me');
  assert.equal(await task, 'save-pending'); assert.equal(f.runner.hasPending('panel'), true);
  f.fail(false); assert.equal(await f.runner.run('panel'), 'saved'); assert.equal(calls, 1);
});
test('cancellation requires explicit retry and late result cannot overwrite it', async () => {
  const result = deferred<string>(); let calls = 0;
  const f = await fixture(async () => ++calls === 1 ? result.promise : 'Retry result');
  const task = f.runner.run('panel'); await tick(); f.runner.cancel('panel');
  assert.equal(await task, 'outcome-unknown'); assert.equal(await f.runner.run('panel'), 'retry-required');
  assert.equal(await f.runner.run('panel', true), 'saved'); result.resolve('Late old result'); await tick();
  assert.equal(f.disk().panels[0].analysis, 'Retry result');
});
test('deletion and restore prevent response resurrection', async () => {
  for (const action of ['delete', 'restore']) {
    const result = deferred<string>(); const f = await fixture(async () => result.promise);
    const task = f.runner.run('panel'); await tick();
    if (action === 'delete') await f.session.commit(s => ({ ...s, panels: [] }));
    else await f.session.replace(newSnapshot());
    result.resolve('Late result'); assert.equal(await task, 'discarded'); assert.deepEqual(f.disk().panels, []);
  }
});
test('dispatch is suppressed on preflight save failure and invalid output cannot complete', async () => {
  let calls = 0; const f = await fixture(async () => { calls++; return 'x'.repeat(5001); });
  f.fail(true); assert.equal(await f.runner.run('panel'), 'storage-failed'); assert.equal(calls, 0);
  f.fail(false); assert.equal(await f.runner.run('panel'), 'outcome-unknown'); assert.notEqual(f.disk().panels[0].status, 'completed');
});
test('timeout ends waiting even when adapter ignores cancellation', async () => {
  const f = await fixture(async () => new Promise<string>(() => {}));
  assert.equal(await f.runner.run('panel'), 'outcome-unknown');
});
test('failure to save interrupted state remains explicitly retryable in the same session', async () => {
  const result = deferred<string>(); const f = await fixture(async () => result.promise);
  const task = f.runner.run('panel'); await tick(); f.fail(true); f.runner.cancel('panel');
  assert.equal(await task, 'storage-failed'); f.fail(false);
  assert.equal(await f.runner.run('panel'), 'retry-required');
  const retry = f.runner.run('panel', true); await tick(); result.resolve('Retry result');
  assert.equal(await retry, 'saved');
});
