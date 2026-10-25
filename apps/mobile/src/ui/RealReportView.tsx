import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { panelSchema, panelConflictCandidates, selectCurrentPanel, type PanelRecord } from '@grocery/core';
import { useAppState } from '../state/AppState';
import { ReportValuesEditor, type ReportValues } from './ReportValuesEditor';
import { Page, Back, Title, Body, Button, Card, Heading, Status } from './components';

export function RealReportView({ panel }: { panel: Extract<PanelRecord, { synthetic: false }> }) {
  const state = useAppState();
  const [editing, setEditing] = useState(false);
  const [base, setBase] = useState(panel);
  const [values, setValues] = useState<ReportValues>({ testDate: panel.testDate, measurements: panel.measurements });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const current = selectCurrentPanel(state.panels, state.panelChoice);
  async function save() {
    if (lock.current) return;
    const candidate = { ...base, ...values };
    const parsed = panelSchema.safeParse(candidate);
    if (!parsed.success || !values.testDate || values.testDate > new Date().toISOString().slice(0, 10) || !selectCurrentPanel([parsed.data]).panel) {
      setMessage('Check the printed test date, values and units. A future date cannot be confirmed.'); return;
    }
    lock.current = true; setBusy(true);
    try { if (await state.correctReport(base, values)) { setEditing(false); setMessage('Corrections saved. Shelf comparisons update locally without another AI analysis.'); } else setMessage('The report changed or could not be saved. Reopen it before retrying.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Page><Back /><Title eyebrow="LIPID REPORT · ON THIS DEVICE">Your confirmed results.</Title>
    <Body>The compact extracted results are saved on your phone. Reopening this report does not send another request to OpenAI.</Body>
    <ReportValuesEditor value={editing ? values : panel} onChange={editing ? setValues : undefined} disabled={busy} />
    {editing ? <><Button label="Confirm corrections" disabled={busy} onPress={() => void save()} /><Button secondary label="Cancel corrections" disabled={busy} onPress={() => setEditing(false)} /></> : <Button secondary label="Correct values from the original report" onPress={() => { setBase(panel); setValues({ testDate: panel.testDate, measurements: panel.measurements }); setEditing(true); setMessage(''); }} />}
    <Card><Heading>How this affects your shelf</Heading><Body>{current.panel?.id === panel.id ? 'This is your current confirmed report by printed test date. Its available lipid context is included in supported shelf nutrient comparisons.' : 'This report is saved. A newer report or an unresolved date tie may determine which results are used.'}</Body><Body muted>Lipid values do not make a product automatically suitable. Missing nutrients, other conditions and dietary restrictions can still prevent a ranking.</Body></Card>
    {current.unresolved.includes(panel.id) && <Card><Heading>Reports share a test date</Heading><Body>Choose the report you want to use for this date. Values from separate reports are never merged.</Body><Button label="Use this report for the tied date" disabled={busy} onPress={() => { if (lock.current) return; lock.current = true; setBusy(true); void state.choosePanel(panel.id, panelConflictCandidates(state.panels)).then(ok => setMessage(ok ? 'Selection saved. Shelf comparisons update locally.' : 'The reports changed. Review the current dates again.')).finally(() => { lock.current = false; setBusy(false); }); }} /></Card>}
    {!!message && <Status>{message}</Status>}
    <Button label="Compare products on a shelf" onPress={() => router.push('/shelf')} />
    <Button secondary label="Add another report" onPress={() => router.push('/report-import')} />
    <Button secondary label="Saved reports" onPress={() => router.push('/history')} />
  </Page>;
}
