import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { panelSchema, prepareRealReportEvidence, selectCurrentPanel, type LipidEvidence } from '@grocery/core';
import { recordId, useAppState } from '../state/AppState';
import { prepareReportSource } from '../storage/reportInput';
import { getReportCapabilities, type ReportCapabilities } from '../storage/realReportClient';
import { ReportValuesEditor, type ReportValues } from '../ui/ReportValuesEditor';
import { Page, Back, Title, Body, Card, Heading, Button, Status } from '../ui/components';

const resultMessages: Record<string, string> = {
  saved: 'Analysis saved on this device. Check the values against your original report.', reused: 'Reusing the saved analysis. No new AI request was sent.',
  busy: 'This report is already processing.', 'retry-required': 'An earlier attempt has no confirmed outcome. Retry only if you want to send it again.',
  'save-pending': 'The result is available in memory but could not be saved. Retry saving; AI processing will not repeat.',
  'storage-failed': 'Private storage could not be updated. No successful save is claimed.',
  'outcome-unknown': 'Processing was interrupted or no usable result arrived. A retry may repeat a request that already reached OpenAI.',
  'consent-required': 'Please accept the current beta agreement before report processing.', failed: 'This attempt failed before a usable result was saved. Choose an explicit retry if you want to try again.',
  discarded: 'This import changed or was removed. The old response was discarded.',
};
const issueText: Record<string, string> = { 'date-missing': 'The printed test date was not found. Enter it from your source.', 'date-ambiguous': 'More than one possible test date was found. Check the source.', 'value-illegible': 'Some values could not be read clearly.', 'unit-ambiguous': 'Some printed units could not be identified confidently.', 'partial-source': 'Only part of the report could be extracted. Check for omitted tests.' };
export default function ReportImport() {
  const state = useAppState();
  const { cancelAllReportImports } = state;
  const [capabilities, setCapabilities] = useState<ReportCapabilities | null>(null);
  const [capError, setCapError] = useState('');
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [draft, setDraft] = useState<ReportValues | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [deleteChoice, setDeleteChoice] = useState('');
  const operation = useRef(false);
  const focused = useRef(false);
  const focusEpoch = useRef(0);
  const inputAbort = useRef<AbortController | null>(null);
  const currentFingerprint = useRef('');
  const capRequest = useRef<AbortController | null>(null);
  const checkCapabilities = useCallback(() => {
    capRequest.current?.abort();
    const controller = new AbortController(); capRequest.current = controller;
    setChecking(true); setCapabilities(null); setCapError('');
    void getReportCapabilities(controller.signal).then(value => { if (!controller.signal.aborted) setCapabilities(value); }).catch(error => { if (!controller.signal.aborted) setCapError(error instanceof Error ? error.message : 'Report service unavailable.'); }).finally(() => { if (!controller.signal.aborted) setChecking(false); });
  }, []);
  useFocusEffect(useCallback(() => {
    focused.current = true; focusEpoch.current++;
    if (!operation.current) setBusy(false);
    checkCapabilities();
    return () => { focused.current = false; focusEpoch.current++; inputAbort.current?.abort(); capRequest.current?.abort(); cancelAllReportImports(); };
  }, [cancelAllReportImports, checkCapabilities]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', value => { if (value === 'background') cancelAllReportImports(); });
    return () => subscription.remove();
  }, [cancelAllReportImports]);
  function showResult(key: string) {
    currentFingerprint.current = key; setFingerprint(key); setDeleteChoice('');
    const result = state.importedReportResult(key);
    setDraft(result ? { testDate: result.testDate, measurements: result.measurements } : null);
    setIssues(result?.issues ?? []);
  }
  async function analyze(key: string, evidence: LipidEvidence, retry = false) {
    const epoch = focusEpoch.current;
    currentFingerprint.current = key; setFingerprint(key); setMessage('Analyzing the limited report fields with OpenAI…');
    const result = await state.runReportImport(key, evidence, retry);
    if (focused.current && focusEpoch.current === epoch) { showResult(key); setMessage(resultMessages[result] ?? 'The report could not be processed.'); }
  }
  async function choose(kind: 'camera' | 'document') {
    const epoch = focusEpoch.current;
    if (operation.current || Platform.OS === 'web' || !capabilities?.available) return;
    operation.current = true; setBusy(true); setDraft(null); setIssues([]); setFingerprint(''); currentFingerprint.current = ''; setMessage('Preparing the report on this device…');
    const controller = new AbortController(); inputAbort.current = controller;
    let source: Awaited<ReturnType<typeof prepareReportSource>> = null;
    try {
      source = await prepareReportSource(kind, controller.signal);
      if (!source || controller.signal.aborted) { if (focused.current && focusEpoch.current === epoch) setMessage('Import cancelled. No report was sent.'); return; }
      const key = source.fingerprint;
      const saved = state.findSavedReport(key);
      const previous = state.lookupReportImport(key);
      if (saved || previous) {
        await source.dispose(); source = null;
        if (controller.signal.aborted || !focused.current || focusEpoch.current !== epoch) return;
        if (saved) { router.push({ pathname: '/report', params: { id: saved.id } }); return; }
        showResult(key); setMessage(state.importedReportResult(key) ? 'This exact source has already been analyzed. Reusing its saved result.' : 'This source has an earlier attempt. Review its status below before choosing a retry.'); return;
      }
      const pages = await source.read();
      if (controller.signal.aborted) return;
      let evidence: LipidEvidence;
      try { evidence = prepareRealReportEvidence(pages); } finally { pages.length = 0; }
      await source.dispose(); source = null;
      if (controller.signal.aborted || !focused.current || focusEpoch.current !== epoch || AppState.currentState !== 'active') return;
      await analyze(key, evidence);
    } catch { if (focused.current && focusEpoch.current === epoch) setMessage(controller.signal.aborted ? 'Import cancelled. Your original file is unchanged.' : 'The report could not be read or safely prepared. Try a clear, straight photo or an unlocked PDF. Unsupported or ambiguous fields are not sent.'); }
    finally {
      try { await source?.dispose(); } catch { if (focused.current && focusEpoch.current === epoch) setMessage('Temporary-file cleanup has not finished. Close and reopen the app before trying another import.'); }
      inputAbort.current = null; operation.current = false; if (focused.current) setBusy(false);
    }
  }
  async function retry(key: string) {
    if (operation.current) return;
    const entry = state.lookupReportImport(key);
    if (!entry) return;
    operation.current = true; setBusy(true);
    try { await analyze(key, entry.evidence, true); }
    finally { operation.current = false; if (focused.current) setBusy(false); }
  }
  async function confirm() {
    const epoch = focusEpoch.current;
    if (!draft || !fingerprint || operation.current) return;
    const candidate = { id: recordId(), kind: 'report', synthetic: false, importedAt: new Date().toISOString(), fingerprint,
      confirmed: true, status: 'ready', analysis: null, ...draft };
    const parsed = panelSchema.safeParse(candidate);
    if (!parsed.success || !draft.testDate || draft.testDate > new Date().toISOString().slice(0, 10) || !selectCurrentPanel([parsed.data]).panel) {
      setMessage('Check the printed date and all values and units. Remove missing tests; a future date cannot be confirmed.'); return;
    }
    operation.current = true; setBusy(true);
    try {
      const saved = await state.savePanel(parsed.data);
      if (!focused.current || focusEpoch.current !== epoch) return;
      if (saved) { setMessage('Confirmed results saved. Shelf comparisons now use the latest eligible test date.'); router.replace({ pathname: '/report', params: { id: saved.id } }); }
      else setMessage('Results could not be saved. The extracted analysis is still available for review; no new AI request is needed.');
    } finally { operation.current = false; if (focused.current) setBusy(false); }
  }
  async function discardImport(key: string) {
    const epoch = focusEpoch.current;
    if (operation.current) return;
    operation.current = true; setBusy(true);
    try {
      const removed = await state.deleteReportImport(key);
      if (!focused.current || focusEpoch.current !== epoch) return;
      if (removed) { setDraft(null); setFingerprint(''); setIssues([]); setDeleteChoice(''); currentFingerprint.current = ''; }
      setMessage(removed ? 'This local import record was deleted. Importing the source again may send a new request. Provider retention is governed by the beta agreement.' : 'The local import could not be deleted. Please retry.');
    } finally { operation.current = false; if (focused.current) setBusy(false); }
  }
  const entry = fingerprint ? state.lookupReportImport(fingerprint) : undefined;
  const pending = fingerprint ? state.hasPendingReportImport(fingerprint) : false;
  return <Page><Back /><Title eyebrow="OPTIONAL · LIPID REPORT">Bring your results into the picture.</Title>
    <Body>Add a PDF or photo whenever you like. Confirmed results personalize supported shelf comparisons using the latest printed test date.</Body>
    <Card><Heading>A limited request, then a local result</Heading><Body>The phone removes identifying text by preparing only supported lipid values, units and the test date. Those fields go through our backend to OpenAI under the beta agreement. The original file is not uploaded or kept in app data. OpenAI may retain submitted fields under its data policy.</Body><Button secondary label="Review beta terms & privacy" onPress={() => router.push('/beta-terms')} /></Card>
    {Platform.OS === 'web' ? <Body muted>Real PDF/photo import is available in the native phone build. This browser preview does not accept personal files.</Body> : <>
      <Button label="Take a report photo" icon="camera" disabled={busy || !capabilities?.available} onPress={() => void choose('camera')} />
      <Button secondary label="Choose a PDF or image" icon="upload" disabled={busy || !capabilities?.available} onPress={() => void choose('document')} />
      <Body muted>PDF, JPEG or PNG · up to 20 MB and 10 pages. Keep the page straight, well lit and readable.</Body>
    </>}
    {!!capError && <Status>{capError}</Status>}
    {capabilities && !capabilities.available && <Status>{capabilities.reason === 'budget-unavailable' ? 'Beta report processing is paused because its shared test allowance is unavailable. Saved results still work.' : 'Report processing is not available on this backend yet. Saved results remain on your device.'}</Status>}
    {!capabilities?.available && <><Button secondary label={checking ? 'Checking…' : 'Check report connection'} disabled={busy || checking} onPress={checkCapabilities} /></>}
    {!!message && <Status>{message}</Status>}
    {busy && <Button secondary label="Cancel analysis" onPress={() => { inputAbort.current?.abort(); if (currentFingerprint.current) state.cancelReportImport(currentFingerprint.current); }} />}
    {draft && <>{issues.map(issue => <Body muted key={issue}>{issueText[issue]}</Body>)}<ReportValuesEditor value={draft} onChange={setDraft} disabled={busy} /><Button label="Confirm values for future food comparisons" disabled={busy} onPress={() => void confirm()} /></>}
    {entry && !draft && <Card><Heading>{pending ? 'Result waiting to be saved' : 'Earlier analysis attempt'}</Heading><Body>Reopening never automatically retries an interrupted request. A retry can repeat provider processing when the previous outcome is unknown.</Body><Button label={pending ? 'Retry saving result' : 'Retry analysis explicitly'} disabled={busy || (!pending && !capabilities?.available)} onPress={() => void retry(entry.fingerprint)} /></Card>}
    {entry && !state.findSavedReport(entry.fingerprint) && <Card><Heading>Delete this unfinished import</Heading><Body>Removes its saved fields and attempt record from this phone. It does not delete any content retained by OpenAI.</Body>{deleteChoice === entry.fingerprint ? <><Button label="Confirm deletion from this phone" disabled={busy} onPress={() => void discardImport(entry.fingerprint)} /><Button secondary label="Keep this import" disabled={busy} onPress={() => setDeleteChoice('')} /></> : <Button secondary label="Delete local import record" disabled={busy} onPress={() => setDeleteChoice(entry.fingerprint)} />}</Card>}
    {(state.reportImports ?? []).filter(item => !state.panels.some(panel => panel.fingerprint === item.fingerprint)).length > 0 && <Card><Heading>Imports to finish reviewing</Heading>{(state.reportImports ?? []).filter(item => !state.panels.some(panel => panel.fingerprint === item.fingerprint)).map((item, i) => <Button key={item.fingerprint} secondary disabled={busy} label={'Import ' + (i + 1) + ' · ' + item.status} onPress={() => { showResult(item.fingerprint); setMessage('Saved import opened. No AI request was started.'); }} />)}</Card>}
    <Button secondary label="View saved reports" onPress={() => router.push('/history')} />
    <Button secondary label="Try the fictional report demonstration" onPress={() => router.push({ pathname: '/report', params: { sample: '1' } })} />
  </Page>;
}
