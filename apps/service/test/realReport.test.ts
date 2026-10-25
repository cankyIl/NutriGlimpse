import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {request} from 'node:http';
import type {AddressInfo} from 'node:net';
import {buildRealReportRequest, createRealReportProvider, createSharedReportBudget, disabledReportCapabilities, loadRealReportProvider, parseRealReportResponse, RealReportError, type RealReportProvider} from '../src/realReportProvider.ts';
import {createAppServer} from '../src/server.ts';
import {REAL_REPORT_CONSENT_VERSION, type LipidEvidence} from '../../../packages/core/src/realReportEvidence.ts';
const evidence: LipidEvidence = {schemaVersion: 1, testDate: '2026-10-01', measurements: [
 {analyte: 'ldl', rawValue: '128', unit: 'mg/dL', comparator: '=', sourcePage: 1},
 {analyte: 'triglycerides', rawValue: '140', unit: 'mg/dL', comparator: '=', sourcePage: 2},
], issues: []};
const wire = (value: unknown) => JSON.stringify({status: 'completed', output: [{type: 'message', role: 'assistant', status: 'completed', content: [{type: 'output_text', text: JSON.stringify(value)}]}]});
const payload = (value: unknown = evidence) => JSON.stringify({consentVersion: REAL_REPORT_CONSENT_VERSION, evidence: value});
const auth = {Authorization: 'Bearer fake-service-test-access', 'Content-Type': 'application/json'};
function budgetFixtureRoot() {
 const parent = join(process.cwd(), 'artifacts'); mkdirSync(parent, {recursive: true});
 return mkdtempSync(join(parent, 'real-report-budget-test-'));
}
const provider = (transport: Parameters<typeof createRealReportProvider>[0]['transport'] = async () => wire(evidence)) => createRealReportProvider({transport, reserveBudget: async () => {}});
async function withServer(realReports: RealReportProvider | undefined, action: (url: string) => Promise<void>, authorized = true) {
 const server = createAppServer({realReports, authorize: authorized ? header => header === auth.Authorization : undefined});
 await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
 try {await action(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);}
 finally {server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve()));}
}

test('real report request is fixed, canonical, stateless and has no tool/file or personal identifiers', () => {
 const result = buildRealReportRequest(evidence);
 assert.equal(result.model, 'gpt-6-luna'); assert.equal(result.store, false); assert.equal(result.background, false);
 assert.equal(result.stream, false); assert.deepEqual(result.tools, []); assert.equal(result.tool_choice, 'none');
 assert.deepEqual(result.reasoning, {effort: 'none'}); assert.equal(result.service_tier, 'default'); assert.equal(result.max_output_tokens, 4096);
 assert.equal(result.text.format.strict, true);
 assert.deepEqual(JSON.parse(result.input[0].content[0].text), evidence);
 assert.ok(!('metadata' in result)); assert.ok(!('previous_response_id' in result)); assert.ok(!('conversation' in result));
 for (const extra of [{name: 'PRIVATE'}, {image: 'data:private'}, {profile: {}}, {fingerprint: 'private'}]) assert.throws(() => buildRealReportRequest({...evidence, ...extra}));
});

test('provider output must preserve every value, unit, comparison, date, source page and issue', () => {
 assert.deepEqual(parseRealReportResponse(wire(evidence), evidence), evidence);
 for (const changed of [
  {...evidence, testDate: '2026-09-01'}, {...evidence, measurements: evidence.measurements.slice(0, 1)},
  {...evidence, measurements: evidence.measurements.map((row, i) => i ? row : {...row, rawValue: '129'})},
  {...evidence, measurements: evidence.measurements.map((row, i) => i ? row : {...row, unit: 'mmol/L'})},
  {...evidence, measurements: evidence.measurements.map((row, i) => i ? row : {...row, comparator: '<'})},
  {...evidence, measurements: evidence.measurements.map((row, i) => i ? row : {...row, sourcePage: 2})},
  {...evidence, issues: ['partial-source']}, {...evidence, diagnosis: 'Invented'},
 ]) assert.throws(() => parseRealReportResponse(wire(changed), evidence));
 for (const raw of [JSON.stringify({status: 'incomplete', output: []}), JSON.stringify({status: 'completed', output: [{type: 'function_call'}]}), wire({}), 'x'.repeat(524289)]) assert.throws(() => parseRealReportResponse(raw, evidence));
});

test('provider bounds concurrency and reserves before its one transport call; no result cache', async () => {
 let calls = 0, reservations = 0;
 let finish!: (value: string) => void;
 const service = createRealReportProvider({reserveBudget: async () => {reservations++;}, transport: async () => {calls++; return new Promise(resolve => {finish = resolve;});}});
 const first = service.extract(evidence, new AbortController().signal);
 await Promise.resolve(); await Promise.resolve();
 await assert.rejects(service.extract(evidence, new AbortController().signal), (error: unknown) => error instanceof RealReportError && error.code === 'REPORT_BUSY');
 assert.equal(calls, 1); assert.equal(reservations, 1);
 finish(wire(evidence)); await first;
 const second = service.extract(evidence, new AbortController().signal);
 await Promise.resolve(); await Promise.resolve(); finish(wire(evidence)); await second;
 assert.equal(calls, 2, 'explicit separate attempts are not a server result cache'); assert.equal(reservations, 2);
});

test('budget failure prevents any transport and reports availability without exposing provider data', async () => {
 let calls = 0;
 const service = createRealReportProvider({reserveBudget: async () => {throw Error('private ledger content');}, transport: async () => {calls++; return wire(evidence);}});
 await assert.rejects(service.extract(evidence, new AbortController().signal), (error: unknown) => error instanceof RealReportError && error.code === 'REPORT_BUDGET_UNAVAILABLE' && !error.message.includes('private'));
 assert.equal(calls, 0); assert.equal(service.capabilities().reason, 'budget-unavailable');
});

test('abort and provider errors never auto-retry or expose response bodies', async () => {
 let calls = 0, reservations = 0;
 const service = createRealReportProvider({reserveBudget: async () => {reservations++;}, transport: async () => {calls++; throw Error('PRIVATE-API-KEY-OR-REPORT');}});
 const aborted = new AbortController(); aborted.abort();
 await assert.rejects(service.extract(evidence, aborted.signal)); assert.equal(reservations, 0);
 await assert.rejects(service.extract(evidence, new AbortController().signal), (error: unknown) => error instanceof RealReportError && error.code === 'REPORT_OUTCOME_UNKNOWN' && !error.message.includes('PRIVATE'));
 assert.equal(calls, 1); assert.equal(reservations, 1);
});

test('capabilities require tester access and disabled configuration does not accept uploads', async () => {
 await withServer(undefined, async base => {
  assert.equal((await fetch(base + '/v1/reports/capabilities')).status, 401);
  const cap = await fetch(base + '/v1/reports/capabilities', {headers: auth});
  assert.deepEqual(await cap.json(), disabledReportCapabilities());
  assert.equal((await fetch(base + '/v1/reports/extract', {method: 'POST', headers: auth, body: payload()})).status, 503);
 });
 await withServer(provider(), async base => {
  assert.equal((await fetch(base + '/v1/reports/capabilities', {headers: auth})).status, 401);
  assert.equal((await fetch(base + '/v1/reports/extract', {method: 'POST', headers: auth, body: payload()})).status, 401);
 }, false);
});

test('report route returns only validated compact result and no-store headers; unrelated personal routes remain closed', async () => {
 await withServer(provider(), async base => {
  const cap = await fetch(base + '/v1/reports/capabilities', {headers: auth});
  assert.equal((await cap.json()).available, true);
  const result = await fetch(base + '/v1/reports/extract', {method: 'POST', headers: auth, body: payload()});
  assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await result.json(), {schemaVersion: 1, result: evidence});
  assert.equal((await fetch(base + '/v1/labs/analyze', {method: 'POST', headers: auth, body: 'PRIVATE'})).status, 503);
  assert.equal((await fetch(base + '/v1/uploads', {method: 'POST', headers: auth, body: 'PRIVATE'})).status, 503);
 });
});

test('route rejects unsupported fields, stale consent, units and oversized input before provider dispatch', async () => {
 let calls = 0;
 await withServer(provider(async () => {calls++; return wire(evidence);}), async base => {
  for (const body of [payload({...evidence, name: 'PRIVATE'}), JSON.stringify({consentVersion: 'old', evidence}), payload({...evidence, measurements: [{...evidence.measurements[0], unit: 'PRIVATE'}]}), JSON.stringify({consentVersion: REAL_REPORT_CONSENT_VERSION, evidence, image: 'PRIVATE'}), '{']) {
   const response = await fetch(base + '/v1/reports/extract', {method: 'POST', headers: auth, body});
   assert.equal(response.status, 400); assert.ok(!(await response.text()).includes('PRIVATE'));
  }
  assert.equal((await fetch(base + '/v1/reports/extract', {method: 'POST', headers: auth, body: 'x'.repeat(8193)})).status, 413);
  assert.equal((await fetch(base + '/v1/reports/extract', {method: 'POST', headers: {...auth, 'Content-Type': 'image/png'}, body: 'image'})).status, 415);
  assert.equal((await fetch(base + '/v1/reports/extract', {method: 'POST', headers: {...auth, 'Content-Encoding': 'gzip'}, body: 'encoded'})).status, 415);
 });
 assert.equal(calls, 0);
});

test('chunked request bytes are bounded even without Content-Length', async () => {
 let calls = 0;
 await withServer(provider(async () => {calls++; return wire(evidence);}), async base => {
  const url = new URL('/v1/reports/extract', base);
  const status = await new Promise<number>((resolve, reject) => {
   const req = request(url, {method: 'POST', headers: {...auth, 'Transfer-Encoding': 'chunked'}}, res => {res.resume(); resolve(res.statusCode!);});
   req.on('error', reject); req.write('x'.repeat(5000)); req.end('y'.repeat(5000));
  });
  assert.equal(status, 413);
 });
 assert.equal(calls, 0);
});

test('configuration is opt-in; absent or stale consent configuration reads no key', () => {
 assert.equal(loadRealReportProvider('/does-not-exist', {}), undefined);
 assert.equal(loadRealReportProvider('/does-not-exist', {GROCERY_REAL_REPORTS_ENABLED: 'true', GROCERY_REAL_REPORTS_CONSENT_VERSION: 'old'}), undefined);
 assert.equal(loadRealReportProvider('/does-not-exist', {GROCERY_REAL_REPORTS_ENABLED: 'true', GROCERY_REAL_REPORTS_CONSENT_VERSION: REAL_REPORT_CONSENT_VERSION}), undefined);
});

test('dispatch accounting preserves legacy history and records attempts beyond the former dollar cutoff', async () => {
 const root = budgetFixtureRoot();
 try {
  const directory = join(root, '.tools/openai'); mkdirSync(directory, {recursive: true, mode: 0o700});
  const path = join(directory, 'testing-ledger.jsonl');
  const rows = Array.from({length: 450}, () => JSON.stringify({kind: 'product', reservedMicroUSD: 20000, at: '2026-10-01T00:00:00Z'})).join('\n') + '\n';
  writeFileSync(path, rows, {mode: 0o600});
  const record = createSharedReportBudget(root); await record(); await record();
  const text = readFileSync(path, 'utf8');
  assert.ok(text.startsWith(rows));
  const saved = text.trim().split('\n').map(row => JSON.parse(row));
  assert.equal(saved.length, 452);
  assert.deepEqual(Object.keys(saved.at(-1)!).sort(), ['at', 'attemptCount', 'kind']);
  assert.equal(saved.at(-1)!.kind, 'report');
  assert.equal(saved.at(-1)!.attemptCount, 1);
 } finally {rmSync(root, {recursive: true, force: true});}
});

test('dispatch accounting refuses malformed ledgers and symlinks without rewriting history', async () => {
 const root = budgetFixtureRoot();
 try {
  const directory = join(root, '.tools/openai'); mkdirSync(directory, {recursive: true, mode: 0o700});
  const path = join(directory, 'testing-ledger.jsonl');
  await assert.rejects(createSharedReportBudget(root)(), 'a missing ledger must not reset previous history');
  writeFileSync(path, '{malformed', {mode: 0o600});
  await assert.rejects(createSharedReportBudget(root)()); assert.equal(readFileSync(path, 'utf8'), '{malformed');
  rmSync(path); const target = join(root, 'other'); writeFileSync(target, '', {mode: 0o600}); symlinkSync(target, path);
  await assert.rejects(createSharedReportBudget(root)()); assert.equal(readFileSync(target, 'utf8'), '');
 } finally {rmSync(root, {recursive: true, force: true});}
});

test('concurrent dispatch accounting workers preserve every admitted attempt', async () => {
 const root = budgetFixtureRoot();
 try {
  const directory = join(root, '.tools/openai'); mkdirSync(directory, {recursive: true, mode: 0o700});
  const path = join(directory, 'testing-ledger.jsonl');
  writeFileSync(path, Array.from({length: 449}, () => JSON.stringify({kind: 'receipt', reservedMicroUSD: 20000})).join('\n') + '\n', {mode: 0o600});
  const results = await Promise.allSettled([createSharedReportBudget(root)(), createSharedReportBudget(root)()]);
  const admitted = results.filter(result => result.status === 'fulfilled').length;
  assert.ok(admitted >= 1 && admitted <= 2);
  const saved = readFileSync(path, 'utf8').trim().split('\n').map(row => JSON.parse(row));
  assert.equal(saved.length, 449 + admitted);
  assert.ok(saved.slice(449).every(row => row.attemptCount === 1 && !('reservedMicroUSD' in row)));
 } finally {rmSync(root, {recursive: true, force: true});}
});
