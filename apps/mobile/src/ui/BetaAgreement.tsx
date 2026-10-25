import { useRef, useState } from 'react';
import { Linking, Text } from 'react-native';
import { REAL_REPORT_CONSENT_VERSION } from '@grocery/core';
import { useAppState } from '../state/AppState';
import { Page, Back, Title, Body, Card, Heading, Chip, Button, Status, s } from './components';

export function BetaAgreement({ readOnly = false }: { readOnly?: boolean }) {
  const state = useAppState();
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  async function agree() {
    if (!accepted || lock.current) return;
    lock.current = true; setBusy(true);
    try { if (!await state.acceptBetaTerms()) setMessage('Your agreement could not be saved. Please retry.'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Page>{readOnly && <Back />}<Title eyebrow="BETA TERMS & PRIVACY">Before we begin.</Title>
    <Body>Please read this agreement before using the beta. Lipid reports are optional; you can use grocery features without adding one.</Body>
    <Card><Heading>What this beta can do</Heading><Body>This experimental app is for adults 21 or older. Product identification and nutrition comparisons can be incomplete or wrong. Check the package and confirm report values. Sample scans are labeled as samples. The app does not diagnose a condition, prescribe treatment or replace professional medical advice. Do not change medicines or a prescribed diet based on it.</Body></Card>
    <Card><Heading>Optional reports and OpenAI</Heading><Body>When you choose to analyze a report, the phone reads it and prepares only supported lipid measurements, units, comparison signs, page numbers and the printed test date. Names, SSNs, addresses, filenames, other report text and original image/PDF pixels are excluded from the request. If the app cannot prepare those limited fields, it stops.</Body>
      <Body>Those fields pass through our backend to OpenAI for processing. Our backend is designed not to save report content or results. OpenAI may retain submitted content under its API data policy, including abuse-monitoring retention for up to 30 days and applicable exceptions. Zero Data Retention is not promised. Removing your local report does not delete any copy retained by OpenAI.</Body>
      <Button secondary label="Read OpenAI's API data policy" onPress={() => { void Linking.openURL('https://developers.openai.com/api/docs/guides/your-data').catch(() => setMessage('The policy could not be opened. Check your connection and try again.')); }} />
    </Card>
    <Card><Heading>What stays on your device</Heading><Body>Your profile, food preferences, report-import record and compact confirmed results stay in app storage. The app removes its temporary report copies after processing or cancellation; your original file remains with you. Saved results are reused. A failed or interrupted analysis is retried only when you choose, and a retry can repeat processing if an earlier outcome was unknown.</Body><Body>Shelf images stay on the device. Shelf scan results last only while the app process is alive. You can delete saved app data in Privacy & storage. If you explicitly export an encrypted backup, its compact records leave the app in the file you choose to save or share.</Body></Card>
    <Card><Heading>Your choice</Heading><Body>By agreeing, you accept these beta limitations and the described processing when you choose the optional report-analysis feature. Only import your own report or one you are authorized to use. Declining keeps the beta closed; no report is sent by opening this agreement.</Body>
      <Text style={s.small}>Agreement version {REAL_REPORT_CONSENT_VERSION}</Text>
      {readOnly ? <Body muted>{state.betaConsent ? 'Accepted on ' + new Date(state.betaConsent.acceptedAt).toLocaleDateString() + '. You can stop using the beta at any time.' : 'Not accepted.'}</Body> : <>
        <Chip label="I am 21 or older and agree to these beta terms and data processing" selected={accepted} disabled={busy} onPress={() => setAccepted(!accepted)} />
        <Button label={busy ? 'Saving agreement…' : 'Agree and continue'} disabled={!accepted || busy} onPress={() => void agree()} />
        <Button secondary label="I do not agree" disabled={busy} onPress={() => { setAccepted(false); setMessage('The beta remains closed. You can close this app without sending a report.'); }} />
      </>}
    </Card>{!!message && <Status>{message}</Status>}
  </Page>;
}
