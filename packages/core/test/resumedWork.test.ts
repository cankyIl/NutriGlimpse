import test from 'node:test';
import assert from 'node:assert/strict';
import { newSnapshot, demoPanel } from '../src/beta.ts';
import { selectCurrentPanel, panelConflictCandidates, resolvePanelConflict, correctPanel } from '../src/reports.ts';
import { createRuleUpdateSource } from '../src/ruleTransport.ts';

test('date choice persists, never merges, and is invalidated by correction/new conflict', () => {
  const s = newSnapshot();
  s.panels = ['a', 'b'].map(id => ({ ...demoPanel(id, '2026-10-01T00:00:00Z'), confirmed: true, status: 'ready' }));
  const token = panelConflictCandidates(s.panels);
  const chosen = resolvePanelConflict(s, 'b', token);
  assert.equal(selectCurrentPanel(chosen.panels, chosen.panelChoice).panel?.id, 'b');
  assert.equal(chosen.panels, s.panels);
  const corrected = correctPanel(chosen, chosen.panels[0], { testDate: '2026-09-20', measurements: [{ analyte: 'ldl', rawValue: '120', unit: 'mg/dL', comparator: '=' }] }, '2026-10-02T00:00:00Z');
  assert.equal(selectCurrentPanel(corrected.panels, corrected.panelChoice).panel, null);
  assert.throws(() => resolvePanelConflict(corrected, 'b', token));
  chosen.panels = [...chosen.panels, { ...chosen.panels[0], id: 'c' }];
  assert.equal(selectCurrentPanel(chosen.panels, chosen.panelChoice).panel, null);
});
test('invalid dates cannot be selected; newer panel overrides old tie choice', () => {
 const s = newSnapshot();
 s.panels = ['a','b'].map(id => ({ ...demoPanel(id,'2026-10-01T00:00:00Z'), confirmed:true,status:'ready' }));
 s.panels.push({...s.panels[0],id:'invalid',testDate:null});
 assert.throws(() => resolvePanelConflict(s,'invalid',panelConflictCandidates(s.panels)));
 const chosen = resolvePanelConflict(s,'a',panelConflictCandidates(s.panels));
 chosen.panels.push({...s.panels[0],id:'new',testDate:'2026-09-21'});
 assert.equal(selectCurrentPanel(chosen.panels,chosen.panelChoice).panel?.id,'new');
});
const endpoint = 'https://rules.example.com/v1/rules';
const fake = (response: Response) => (async () => response) as typeof fetch;
test('rule transport requires trusted HTTPS configuration and bounded JSON UTF-8 stream', async () => {
 for (const url of ['http://rules.example.com', 'https://127.0.0.1/x', 'https://localhost/x','https://user:secret@rules.example.com/x','https://rules.example.com/x?q=a'])
  assert.throws(() => createRuleUpdateSource(url));
 const source = createRuleUpdateSource(endpoint, fake(new Response('{"ok":true}',{headers:{'content-type':'application/json'}})));
 assert.equal(await source(new AbortController().signal),'{"ok":true}');
 for (const response of [
  new Response('x',{status:302,headers:{'content-type':'application/json'}}),
  new Response('x',{headers:{'content-type':'text/html'}}),
  new Response('x',{headers:{'content-type':'application/json','content-length':'524289'}}),
  new Response('x'.repeat(524289),{headers:{'content-type':'application/json'}}),
  new Response(new Uint8Array([255]),{headers:{'content-type':'application/json'}}),
 ]) await assert.rejects(createRuleUpdateSource(endpoint,fake(response))(new AbortController().signal));
});
test('rule transport cancellation and timeout do not wait for an uncooperative fetch', async () => {
 const never = (() => new Promise(() => {})) as typeof fetch;
 await assert.rejects(createRuleUpdateSource(endpoint,never,10)(new AbortController().signal));
 const c = new AbortController(); c.abort();
 await assert.rejects(createRuleUpdateSource(endpoint,never)(c.signal));
 const d = new AbortController(); const work = createRuleUpdateSource(endpoint,never)(d.signal); d.abort();
 await assert.rejects(work);
});
