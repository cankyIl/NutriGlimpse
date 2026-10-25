import { useState, useRef } from 'react';
import { Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { analyteNames, demoPanel, panelSchema, selectCurrentPanel, panelConflictCandidates, type PanelRecord, type RunResult } from '@grocery/core';
import { recordId, useAppState } from '../state/AppState';
import { Page, Back, Title, Body, Status, Card, Heading, Button, Chip, s } from '../ui/components';

type SamplePanel = Extract<PanelRecord, { synthetic: true }>;
const messages: Record<RunResult, string> = {
  'real-report-local-only': 'Confirmed real report values are already used locally. No sample processing is needed.',
  saved: 'Result saved. Reopening will reuse it.', reused: 'Reusing your saved result.', busy: 'This report is already processing.',
  'retry-required': 'The previous attempt has no saved result. Choose Retry to try again.', 'not-confirmed': 'Confirm the extracted values first.',
  'not-found': 'This report is no longer saved.', 'save-pending': 'The result is available in memory, but could not be saved. Retry saving; processing will not repeat.',
  'storage-failed': 'Storage is unavailable. No successful saved result is claimed. Retry when storage is available.',
  'outcome-unknown': 'The attempt was interrupted. No successful result was saved. A retry may repeat processing.',
  discarded: 'The report changed or was deleted while processing. The old response was discarded.',
};
export default function Report() {
  const state = useAppState();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = id ? state.panels.find((p): p is SamplePanel => p.synthetic && p.id === id) : state.panels.find((p): p is SamplePanel => p.synthetic && p.fingerprint === 'synthetic-report-september-2026-v1');
  const [draft, setDraft] = useState<SamplePanel>(() => existing ?? demoPanel(recordId(), new Date().toISOString()));
  const [correctionBase, setCorrectionBase] = useState<SamplePanel | null>(null);
  const savedPanel = state.panels.find((p): p is SamplePanel => p.synthetic && p.id === draft.id);
  const editing = correctionBase !== null;
  const panel = editing ? draft : savedPanel ?? draft;
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const current = selectCurrentPanel(state.panels, state.panelChoice);
  const pending = state.hasPendingReport(panel.id);
  async function confirm() {
    if (operation.current) return;
    const next: SamplePanel = { ...draft, confirmed: true, status: 'ready' };
    if (!selectCurrentPanel([next]).panel || !panelSchema.safeParse(next).success) { setMessage('Check the test date, numeric values and supported units before confirming. Leave missing measurements out.'); return; }
    operation.current = true; setBusy(true);
    try {
      const imported = correctionBase ? undefined : await state.savePanel(next);
      const ok = correctionBase ? await state.correctReport(correctionBase, { testDate: draft.testDate, measurements: draft.measurements }) : !!imported;
      if (ok) {
        setDraft({ ...next, id: imported?.id ?? next.id }); setCorrectionBase(null);
        setMessage(correctionBase ? 'Corrections saved. Changed values require a new explicit sample processing step; unchanged values keep their saved result.' : imported?.reused ? 'This source is already saved. Reusing its confirmed values and any saved result; no processing was started.' : 'Values confirmed. Ready for the sample workflow.');
      } else setMessage('Could not save, or the report changed while editing. Your draft is still here. Cancel corrections and reopen the saved report before trying again.');
    }
    finally { operation.current = false; setBusy(false); }
  }
  async function run(retry: boolean) {
    if (operation.current) return;
    operation.current = true; setBusy(true); setMessage('Processing sample data…');
    try { setMessage(messages[await state.runReport(panel.id, retry)]); }
    finally { operation.current = false; setBusy(false); }
  }
  if (id && !existing) return <Page><Back /><Title>Report unavailable</Title><Body>This report has been deleted.</Body></Page>;
  const retry = ['outcome-unknown', 'failed', 'in-flight'].includes(panel.status);
  return <Page><Back /><Title eyebrow="OPTIONAL · SAMPLE LIPID REPORT">A little more context.</Title><Button secondary label="Read a fictional report image" onPress={() => router.push({ pathname: '/intake', params: { kind: 'report' } })} /><Body muted>Shopping works without a report. These values come from an invented report fixture. Do not enter personal results. Use Add a lipid report for optional personal report import. This screen remains a fictional demonstration.</Body>
    {editing && <Card><Heading>Correct this sample report</Heading><Body>Your saved report stays unchanged until you confirm. Changed values clear its old workflow result. No processing starts automatically.</Body><Button secondary label="Cancel corrections" disabled={busy} onPress={() => { if (savedPanel) setDraft(savedPanel); setCorrectionBase(null); setMessage('Corrections cancelled. Saved report unchanged.'); }} /></Card>}
    <Card><Heading>{panel.confirmed ? 'Confirmed report values' : 'Review extracted values'}</Heading><Text style={s.small}>Test date · YYYY-MM-DD</Text><TextInput accessibilityLabel="Report test date" editable={!panel.confirmed && !busy} value={panel.testDate ?? ''} onChangeText={testDate => setDraft(p => ({ ...p, testDate }))} style={s.body} />
    {panel.measurements.map((m, i) => {
      const change = (patch: Partial<typeof m>) => setDraft(p => ({ ...p, measurements: p.measurements.map((v, j) => i === j ? { ...v, ...patch } : v) }));
      return <Card key={m.analyte}><Text style={s.body}>{analyteNames[m.analyte]} · {m.unit}</Text><TextInput accessibilityLabel={analyteNames[m.analyte]} editable={!panel.confirmed && !busy} keyboardType="decimal-pad" value={m.rawValue} onChangeText={rawValue => change({ rawValue })} style={s.body} />
        <Text style={s.small}>Printed lab range: {m.printedRange ?? "Not present in fixture"} · Printed flag: {m.printedFlag ?? "Not present in fixture"}. These are source details, not personal treatment targets.</Text>
        {panel.confirmed ? <Text style={s.small}>Reported comparison: {m.comparator}</Text> : <><Text style={s.small}>Comparison printed on the report</Text><View style={{ flexDirection: 'row', gap: 8 }}>{(['<', '=', '>'] as const).map(comparator => <Chip disabled={busy} key={comparator} label={comparator} accessibilityLabel={`${analyteNames[m.analyte]} ${comparator}`} selected={m.comparator === comparator} onPress={() => change({ comparator })} />)}</View><Text style={s.small}>Units printed on the report</Text>{(['mg/dL', 'mmol/L', 'nmol/L', 'g/L'] as const).filter(unit => m.analyte === 'lpa' ? ['mg/dL','nmol/L'].includes(unit) : m.analyte === 'apob' ? ['mg/dL','g/L'].includes(unit) : ['mg/dL','mmol/L'].includes(unit)).map(unit => <Chip disabled={busy} key={unit} label={unit} accessibilityLabel={`${analyteNames[m.analyte]} unit: ${unit}`} selected={m.unit === unit} onPress={() => change({ unit })} />)}<Button secondary disabled={busy} label={`Remove missing ${analyteNames[m.analyte]}`} onPress={() => setDraft(p => ({ ...p, measurements: p.measurements.filter((_, j) => i !== j) }))} /></>}
      </Card>;
    })}<Text style={s.small}>Units and comparison signs are preserved. No Lp(a) mass-to-particle conversion is performed.</Text>
    {!panel.confirmed && <Button label={editing ? "Confirm corrections" : "Confirm values and test date"} disabled={busy} onPress={() => void confirm()} />}</Card>
    {panel.confirmed && <Button secondary label="Correct sample report values" disabled={busy} onPress={() => { setCorrectionBase(panel); setDraft({ ...panel, confirmed: false }); setMessage(''); }} />}
    {panel.confirmed && panel.status !== 'completed' && <><Button label={busy ? 'Processing…' : pending ? 'Retry saving result' : retry ? 'Retry sample processing' : 'Complete sample workflow'} disabled={busy} onPress={() => void run(retry)} />{(busy || panel.status === 'in-flight') && <Button secondary label="Cancel processing" onPress={() => state.cancelReport(panel.id)} />}</>}
    {!editing && !!panel.analysis && <Card><Heading>Saved workflow result</Heading><Body>{panel.analysis}</Body><Text style={s.small}>Reopening reuses this saved result. Report revision {panel.revision ?? 1}.</Text></Card>}
    <Body muted>{current.panel ? `Current confirmed panel: ${current.panel.testDate}. Uses the latest printed test date and your saved choice for any tie. Clinical influence is not enabled until reviewed rules are available.` : 'No unambiguous confirmed panel selected.'}{current.unresolved.length > 0 ? ' Some report dates need resolution.' : ''}</Body>
    {current.unresolved.length > 0 && <Card><Heading>Review report dates</Heading><Body>A missing or invalid printed date needs confirmation. Reports tied for the latest test date cannot be selected automatically. Open the saved record from History to review its printed date; do not substitute the upload date.</Body>{current.unresolved.map(reportId => {
      const unresolved = state.panels.find(p => p.id === reportId);
      return <Card key={reportId}><Body>Test date: {unresolved?.testDate || 'Missing'} · Imported: {unresolved?.importedAt.slice(0, 10)}</Body>
        <Body>{unresolved?.measurements.map(m => analyteNames[m.analyte] + ': ' + m.comparator + m.rawValue + ' ' + m.unit).join(' · ')}</Body>
        <Button secondary disabled={busy} label="Review this report" onPress={() => router.push({ pathname: '/report', params: { id: reportId } })} />
        <Button disabled={busy} label="Use this report for the tied date" onPress={() => {
          if (operation.current) return;
          operation.current = true; setBusy(true);
          void state.choosePanel(reportId, panelConflictCandidates(state.panels)).then(ok => setMessage(ok ? 'Your choice was saved. Reports remain separate; no values were merged.' : 'The reports changed or this date is invalid. Review again.')).finally(() => { operation.current = false; setBusy(false); });
        }} />
      </Card>;
    })}</Card>}
    {!!message && <Status>{message}</Status>}<Button secondary label="History" onPress={() => router.push('/history')} />
  </Page>;
}



