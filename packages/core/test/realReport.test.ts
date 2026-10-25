import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LocalSession, ReportCoordinator } from '../src/session.ts';
import { newSnapshot, parseSnapshot, recoverSnapshot, demoPanel, type BetaSnapshot, type PanelRecord } from '../src/beta.ts';
import { RealReportCoordinator } from '../src/realReport.ts';
import { REAL_REPORT_CONSENT_VERSION, type LipidEvidence } from '../src/realReportEvidence.ts';
import { registerPanelImport } from '../src/reportImports.ts';
import { correctPanel, selectCurrentPanel, panelConflictCandidates, resolvePanelConflict } from '../src/reports.ts';
const now = '2026-10-14T12:00:00.000Z';
const fingerprint = 'sha256:' + 'a'.repeat(64);
const evidence: LipidEvidence = { schemaVersion: 1, testDate: '2026-09-20', measurements: [{ analyte: 'ldl', rawValue: '128', unit: 'mg/dL', comparator: '=', sourcePage: 1 }], issues: [] };
const consent = { version: REAL_REPORT_CONSENT_VERSION, acceptedAt: now };
async function setup(withConsent = true) {
 let disk: BetaSnapshot = { ...newSnapshot(), ...(withConsent ? { betaConsent: consent } : {}) };
 let fail: (next: BetaSnapshot) => boolean = () => false;
 const session = new LocalSession({ read: async () => disk, write: async next => { if (fail(next)) throw Error('Storage full'); disk = structuredClone(next); }, clear: async () => {} });
 await session.initialize(); return { session, disk: () => disk, fail: (condition: typeof fail) => { fail = condition; } };
}
const realId = '00000000-0000-4000-8000-000000000001';
const secondId = '00000000-0000-4000-8000-000000000002';
const realPanel = (id = realId): PanelRecord => ({ id, kind: 'report', testDate: evidence.testDate!, importedAt: now, confirmed: true, fingerprint, synthetic: false, status: 'ready', analysis: null, measurements: evidence.measurements });
const doneJournal = () => ({ fingerprint, createdAt: now, updatedAt: now, status: 'completed' as const, evidence, result: evidence });
test('consent and durable dispatch intent are required before a provider call, with no fingerprint in evidence', async () => {
 const env = await setup(false); let calls = 0;
 const worker = new RealReportCoordinator(env.session, async input => { calls++; assert.equal(env.disk().reportImports?.[0].status, 'in-flight'); assert.equal('fingerprint' in input, false); assert.deepEqual(input, evidence); return input; });
 assert.equal(await worker.run(fingerprint, evidence), 'consent-required'); assert.equal(calls, 0);
 await env.session.commit(data => ({ ...data, betaConsent: consent }));
 assert.equal(await worker.run(fingerprint, evidence), 'saved'); assert.equal(calls, 1); assert.equal(worker.lookup(fingerprint)?.status, 'completed');
 assert.deepEqual(worker.result(fingerprint), evidence);
 assert.equal(await worker.run(fingerprint), 'reused'); assert.equal(calls, 1);
});
test('failed intent storage prevents any provider dispatch', async () => {
 const env = await setup(); let calls = 0; env.fail(next => next.reportImports?.some(entry => entry.status === 'in-flight') ?? false);
 const worker = new RealReportCoordinator(env.session, async input => { calls++; return input; });
 assert.equal(await worker.run(fingerprint, evidence), 'storage-failed'); assert.equal(calls, 0); assert.equal(worker.lookup(fingerprint), undefined);
});
test('valid response save failure retries local storage without a second provider call', async () => {
 const env = await setup(); let calls = 0; env.fail(next => next.reportImports?.some(entry => entry.status === 'completed') ?? false);
 const worker = new RealReportCoordinator(env.session, async input => { calls++; return input; });
 assert.equal(await worker.run(fingerprint, evidence), 'save-pending'); assert.equal(worker.hasPending(fingerprint), true); assert.equal(worker.result(fingerprint), null);
 env.fail(() => false); assert.equal(await worker.run(fingerprint), 'saved'); assert.equal(calls, 1); assert.equal(worker.hasPending(fingerprint), false);
});
test('invalid provider output is not completed and retries require explicit user action', async () => {
 const env = await setup(); let calls = 0;
 const worker = new RealReportCoordinator(env.session, async input => { calls++; return calls === 1 ? { ...input, name: 'Injected identifier' } : input; });
 assert.equal(await worker.run(fingerprint, evidence), 'failed'); assert.equal(worker.result(fingerprint), null);
 assert.equal(await worker.run(fingerprint), 'retry-required'); assert.equal(calls, 1);
 assert.equal(await worker.run(fingerprint, undefined, { explicitRetry: true }), 'saved'); assert.equal(calls, 2);
});
test('timeout/cancellation is outcome-unknown, not success, and does not automatically dispatch again', async () => {
 const env = await setup(); let calls = 0;
 const worker = new RealReportCoordinator(env.session, async () => { calls++; return new Promise(() => {}); }, { timeoutMs: 5 });
 assert.equal(await worker.run(fingerprint, evidence), 'outcome-unknown'); assert.equal(await worker.run(fingerprint), 'retry-required'); assert.equal(calls, 1);
 const another = 'sha256:' + 'b'.repeat(64), cancellation = new RealReportCoordinator(env.session, async () => new Promise(() => {}));
 const running = cancellation.run(another, evidence); await new Promise(resolve => setImmediate(resolve)); cancellation.cancel(another);
 assert.equal(await running, 'outcome-unknown');
});
test('only one active dispatch is admitted, and reset discards late responses', async () => {
 const env = await setup(); let resolve!: (value: unknown) => void; let calls = 0;
 const worker = new RealReportCoordinator(env.session, async () => { calls++; return new Promise(done => { resolve = done; }); });
 const running = worker.run(fingerprint, evidence); await new Promise(done => setImmediate(done));
 assert.equal(await worker.run(fingerprint, evidence), 'busy'); assert.equal(await worker.run('sha256:' + 'b'.repeat(64), evidence), 'busy');
 await env.session.replace(newSnapshot()); resolve(evidence);
 assert.equal(await running, 'discarded'); assert.equal(env.session.snapshot.reportImports, undefined); assert.equal(calls, 1);
});
test('old archives remain valid and interrupted extraction intents recover without automatic retries', () => {
 const legacy = newSnapshot(); assert.deepEqual(parseSnapshot(JSON.parse(JSON.stringify(legacy))), legacy);
 const saved = { ...legacy, betaConsent: consent, reportImports: [{ ...doneJournal(), status: 'in-flight' as const, result: null }] };
 assert.equal(recoverSnapshot(saved).reportImports?.[0].status, 'outcome-unknown');
 assert.throws(() => parseSnapshot({ ...saved, reportImports: [doneJournal(), doneJournal()] }));
});
test('confirmed real reports require completed source evidence and cannot retain freeform analysis or identifiers', () => {
 const panel = realPanel(), snapshot = { ...newSnapshot(), reportImports: [doneJournal()] };
 assert.throws(() => registerPanelImport(newSnapshot(), panel), /source-linked/);
 const result = registerPanelImport(snapshot, panel); assert.equal(result.snapshot.panels[0].synthetic, false);
 assert.equal(registerPanelImport(result.snapshot, { ...panel, id: secondId }).reused, true);
 for (const patch of [{ analysis: 'Patient Example' }, { name: 'Example' }, { id: '123-45-6789' }, { measurements: [{ ...evidence.measurements[0], printedRange: 'Example Street' }] }]) assert.throws(() => parseSnapshot({ ...snapshot, panels: [{ ...panel, ...patch }] }));
 assert.throws(() => registerPanelImport(snapshot, { ...panel, testDate: '2999-01-01' }), /future/);
 const corrected = registerPanelImport(snapshot, { ...panel, measurements: [{ ...evidence.measurements[0], sourcePage: 2 }, { analyte: 'hdl', rawValue: '50', unit: 'mg/dL', comparator: '=', sourcePage: 3 }] });
 assert.equal(corrected.snapshot.panels[0].measurements.length, 2);
 assert.deepEqual(corrected.snapshot.reportImports, snapshot.reportImports, 'confirmation edits never rewrite original extracted evidence');
 for (const sourcePage of [0, 11]) assert.throws(() => registerPanelImport(snapshot, { ...panel, measurements: [{ ...evidence.measurements[0], sourcePage }] }));
});
test('real reports supersede sample dates and resolve only real same-date conflicts', () => {
 const sample = { ...demoPanel('sample', now), confirmed: true, testDate: '2026-10-01' };
 const first = realPanel(), second = { ...realPanel(secondId), fingerprint: 'sha256:' + 'b'.repeat(64) };
 assert.equal(selectCurrentPanel([sample, first]).panel?.id, first.id);
 const snapshot = { ...newSnapshot(), panels: [sample, first, second] };
 const conflict = selectCurrentPanel(snapshot.panels); assert.deepEqual(conflict.unresolved.sort(), [realId, secondId]);
 const chosen = resolvePanelConflict(snapshot, secondId, panelConflictCandidates(snapshot.panels)); assert.equal(selectCurrentPanel(chosen.panels, chosen.panelChoice).panel?.id, secondId);
});
test('source-linked real corrections remain local and legacy sample analyzer refuses real panels', async () => {
 const env = await setup(); await env.session.commit(data => ({ ...data, panels: [realPanel()], reportImports: [doneJournal()] }));
 let calls = 0; const sampleAnalyzer = new ReportCoordinator(env.session, async () => { calls++; return 'Not for real reports'; });
 assert.equal(await sampleAnalyzer.run(realId), 'real-report-local-only'); assert.equal(calls, 0);
 const current = env.session.snapshot.panels[0];
 assert.equal(await env.session.commit(data => correctPanel(data, current, { testDate: current.testDate, measurements: [...current.measurements.map(item => ({ ...item, rawValue: '125', sourcePage: 2 })), { analyte: 'hdl', rawValue: '50', unit: 'mg/dL', comparator: '=', sourcePage: 3 }] }, now)), true);
 const corrected = env.session.snapshot.panels[0]; assert.equal(corrected.analysis, null); assert.equal(corrected.status, 'ready'); assert.equal(corrected.revision, 2);
 assert.deepEqual(env.session.snapshot.reportImports, [doneJournal()]);
 assert.equal(corrected.measurements.length, 2); assert.equal(corrected.measurements[0].sourcePage, 2);
 const worker = new RealReportCoordinator(env.session, async input => { calls++; return input; });
 assert.equal(await worker.run(fingerprint), 'reused'); assert.equal(calls, 0);
});

test('consent revoked before queued dispatch prevents the provider call', async () => {
 const env = await setup(); let calls = 0;
 const removing = env.session.commit(({ betaConsent: _removed, ...data }) => data);
 const worker = new RealReportCoordinator(env.session, async input => { calls++; return input; });
 const work = worker.run(fingerprint, evidence); await removing;
 assert.equal(await work, 'discarded'); assert.equal(calls, 0);
});
test('deleting an import during a provider call prevents a late result from resurrecting it', async () => {
 const env = await setup(); let resolve!: (value: unknown) => void;
 const worker = new RealReportCoordinator(env.session, async () => new Promise(done => { resolve = done; }));
 const work = worker.run(fingerprint, evidence); await new Promise(done => setImmediate(done));
 await env.session.commit(data => ({ ...data, reportImports: [] })); resolve(evidence);
 assert.equal(await work, 'discarded'); assert.deepEqual(env.session.snapshot.reportImports, []);
});
test('completed results reuse locally even after consent is removed; no extraction repeats', async () => {
 const env = await setup(); let calls = 0;
 const worker = new RealReportCoordinator(env.session, async input => { calls++; return input; });
 assert.equal(await worker.run(fingerprint, evidence), 'saved');
 await env.session.commit(({ betaConsent: _removed, ...data }) => data);
 assert.equal(await worker.run(fingerprint), 'reused'); assert.equal(calls, 1);
});
test('a restored/imported real report must keep typed fields and remains compact without any source media', () => {
 const six: LipidEvidence = { ...evidence, measurements: ['total', 'ldl', 'hdl', 'triglycerides', 'apob', 'lpa'].map(analyte => ({ analyte: analyte as LipidEvidence['measurements'][number]['analyte'], rawValue: '123.4567', unit: 'mg/dL', comparator: '=', sourcePage: 10 })) };
 const panel = { ...realPanel(), measurements: six.measurements };
 const snapshot = parseSnapshot({ ...newSnapshot(), betaConsent: consent, panels: [panel], reportImports: [{ ...doneJournal(), evidence: six, result: six }] });
 assert.deepEqual(parseSnapshot(JSON.parse(JSON.stringify(snapshot))), snapshot);
 assert.ok(new TextEncoder().encode(JSON.stringify({ panels: snapshot.panels, reportImports: snapshot.reportImports })).byteLength < 4096);
 for (const extra of [{ sourceUri: 'file:///private-report.pdf' }, { ocrText: 'Patient Example' }, { image: 'base64' }]) assert.throws(() => parseSnapshot({ ...snapshot, reportImports: [{ ...doneJournal(), ...extra }] }));
});


test('ordinary cancellation retains a valid save-pending result, while explicit privacy discard clears it', async () => {
 const env = await setup(); let calls = 0;
 env.fail(next => next.reportImports?.some(entry => entry.status === 'completed') ?? false);
 const worker = new RealReportCoordinator(env.session, async input => { calls++; return input; });
 assert.equal(await worker.run(fingerprint, evidence), 'save-pending');
 worker.cancel(fingerprint); worker.cancelAll(); assert.equal(worker.hasPending(fingerprint), true);
 worker.discard(fingerprint); assert.equal(worker.hasPending(fingerprint), false);
 env.fail(() => false); assert.equal(await worker.run(fingerprint), 'retry-required'); assert.equal(calls, 1);
 assert.equal(await worker.run(fingerprint, undefined, { explicitRetry: true }), 'saved'); assert.equal(calls, 2);
 const other = 'sha256:' + 'b'.repeat(64);
 env.fail(next => next.reportImports?.some(entry => entry.fingerprint === other && entry.status === 'completed') ?? false);
 assert.equal(await worker.run(other, evidence), 'save-pending'); assert.equal(worker.hasPending(other), true);
 worker.discardAll(); assert.equal(worker.hasPending(other), false);
 env.fail(() => false); assert.equal(await worker.run(other), 'retry-required'); assert.equal(calls, 3);
});
