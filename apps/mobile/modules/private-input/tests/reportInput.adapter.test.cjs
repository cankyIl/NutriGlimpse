const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.resolve(__dirname, '../../../src/storage/reportInput.native.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
function setup(overrides = {}) {
  const calls = [];
  let stateListener;
  const picked = { canceled: false, assets: [{ uri: 'file:///app/cache/DocumentPicker/11111111-1111-1111-1111-111111111111.pdf', mimeType: 'application/pdf', size: 50 }] };
  const pages = [{ page: 1, width: 100, height: 100, lines: [{ id: 'p1-l0', text: 'LDL 128 mg/dL', x: 0, y: 0, width: 90, height: 20, confidence: 1 }] }];
  const native = {
    createSessionAsync: async () => { calls.push('create'); return 'session'; },
    beginSourcePickerAsync: async id => { calls.push('journal:' + id); },
    stageSourceAsync: async (id, uri, mime) => { calls.push('stage:' + id); return { sourceHandle: 'opaque-handle', fingerprint: 'sha256:' + 'a'.repeat(64), pageCount: 1 }; },
    inspectStagedSourceAsync: async () => { calls.push('ocr'); return pages; },
    cancelSession: id => { calls.push('cancel:' + id); },
    disposeSessionAsync: async id => { calls.push('dispose:' + id); return true; },
    ...overrides.native,
  };
  const documentPicker = { getDocumentAsync: async options => { calls.push('picker'); assert.equal(options.copyToCacheDirectory, true); return picked; }, ...overrides.documentPicker };
  const imagePicker = { requestCameraPermissionsAsync: async () => ({ granted: true }), launchCameraAsync: async () => picked, ...overrides.imagePicker };
  const exports = {};
  const appState = { currentState: 'active', addEventListener: (_name, callback) => { stateListener = callback; return { remove: () => { stateListener = undefined; } }; } };
  const modules = {
    'expo-document-picker': documentPicker, 'expo-image-picker': imagePicker,
    'react-native': { AppState: appState },
    '../../modules/private-input': { __esModule: true, default: native },
    '../../../../packages/core/src/inputPrivacy': { ocrPagesSchema: { parse: input => input } },
  };
  vm.runInNewContext(compiled, { exports, require: name => { if (!(name in modules)) throw Error('Unexpected import: ' + name); return modules[name]; }, AbortController, console: { log() { throw Error('No logging allowed'); } } });
  return { prepare: exports.prepareReportSource, native, calls, picked, pages, state: value => { appState.currentState = value; stateListener?.(value); } };
}

test('fingerprint is available before OCR; dedup disposal never reads source', async () => {
  const h = setup(), controller = new AbortController();
  const source = await h.prepare('document', controller.signal);
  assert.deepEqual(Array.from(Object.keys(source)).sort(), ['dispose','fingerprint','read']);
  assert.deepEqual(h.calls.slice(0,4), ['create','journal:session','picker','stage:session']);
  assert(!h.calls.includes('ocr'));
  await source.dispose();
  assert.equal(h.calls.filter(x => x === 'dispose:session').length, 1);
});
test('single read returns local OCR only after owned originals have been disposed', async () => {
  const h = setup(); const source = await h.prepare('document', new AbortController().signal);
  assert.equal(await source.read(), h.pages);
  assert(h.calls.indexOf('dispose:session') > h.calls.indexOf('ocr'));
  await assert.rejects(source.read(), /cancelled|already been read/);
  await source.dispose();
  assert.equal(h.calls.filter(x => x === 'ocr').length, 1);
});
test('abort during native session creation still disposes the eventual session', async () => {
  const pending = deferred(); const h = setup({ native: { createSessionAsync: () => pending.promise } });
  const controller = new AbortController();
  const result = h.prepare('document', controller.signal);
  controller.abort(); pending.resolve('late-session');
  await assert.rejects(result, /cancelled/);
  assert(h.calls.includes('dispose:late-session'));
  assert(!h.calls.includes('picker'));
});
test('abort while picker is open keeps journal until late picker result is cleaned', async () => {
  const pending = deferred(); const h = setup({ documentPicker: { getDocumentAsync: () => pending.promise } });
  const controller = new AbortController(); const result = h.prepare('document', controller.signal);
  await tick(); controller.abort(); await tick();
  assert(!h.calls.some(x => x.startsWith('dispose:')));
  pending.resolve(h.picked);
  await assert.rejects(result, /cancelled/);
  assert(h.calls.includes('dispose:session'));
  assert(!h.calls.includes('stage:session'));
});
test('system picker backgrounding is allowed; background after staging cleans source', async () => {
  const pending = deferred(); const h = setup({ documentPicker: { getDocumentAsync: () => pending.promise } });
  const result = h.prepare('document', new AbortController().signal);
  await tick(); h.state('background'); await tick();
  assert(!h.calls.some(x => x.startsWith('dispose:')));
  h.state('active'); pending.resolve(h.picked); const source = await result;
  h.state('background'); await tick();
  assert(h.calls.includes('dispose:session'));
  await assert.rejects(source.read(), /cancelled/);
});
test('abort during staging waits for native work before disposing and never issues a handle', async () => {
  const pending = deferred(); const h = setup({ native: { stageSourceAsync: () => pending.promise } });
  const controller = new AbortController(); const result = h.prepare('document', controller.signal);
  await tick(); controller.abort(); await tick();
  assert(!h.calls.some(x => x.startsWith('dispose:')));
  pending.resolve({ sourceHandle: 'opaque', fingerprint: 'sha256:' + 'b'.repeat(64), pageCount: 1 });
  await assert.rejects(result, /cancelled/);
  assert(h.calls.includes('dispose:session'));
});
test('oversize source and cancelled picker clean their pre-existing native journal', async () => {
  const h = setup(); h.picked.assets[0].size = 20 * 1024 * 1024 + 1;
  await assert.rejects(h.prepare('document', new AbortController().signal), /20 MiB/);
  assert(h.calls.includes('dispose:session')); assert(!h.calls.includes('stage:session'));
  const cancelled = setup({ documentPicker: { getDocumentAsync: async () => ({ canceled: true, assets: null }) } });
  assert.equal(await cancelled.prepare('document', new AbortController().signal), null);
  assert(cancelled.calls.includes('dispose:session'));
});
test('native error strings cannot expose source paths and OCR failure cleans source', async () => {
  const h = setup({ native: { inspectStagedSourceAsync: async () => { throw Error('file:///private/Patient-name.pdf'); } } });
  const source = await h.prepare('document', new AbortController().signal);
  await assert.rejects(source.read(), error => /could not be read clearly/.test(error.message) && !error.message.includes('Patient'));
  assert(h.calls.includes('dispose:session'));
});
test('failed cleanup prevents read results from escaping and remains retryable', async () => {
  let count = 0;
  const h = setup({ native: { disposeSessionAsync: async () => ++count > 1 } });
  const source = await h.prepare('document', new AbortController().signal);
  await assert.rejects(source.read(), /cleanup/);
  await source.dispose();
  assert.equal(count, 2);
});

test('picker returning while app remains backgrounded cleans without staging', async () => {
  const pending = deferred(); const h = setup({ documentPicker: { getDocumentAsync: () => pending.promise } });
  const result = h.prepare('document', new AbortController().signal);
  await tick(); h.state('background'); pending.resolve(h.picked);
  await assert.rejects(result, /cancelled/);
  assert(h.calls.includes('dispose:session'));
  assert(!h.calls.includes('stage:session'));
});
