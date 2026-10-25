import { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import PrivateInput from '../../modules/private-input';
import { runSyntheticInputDiagnostic, runSyntheticRejectionDiagnostic } from '../../../../packages/core/src/inputPrivacy';
import { Body, Status, Button, Card, Heading } from './components';

export function InputDiagnostic() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') controller.current?.abort(); });
    return () => { mounted.current = false; controller.current?.abort(); subscription.remove(); };
  }, []);
  async function run(format: 'image' | 'pdf' | 'invalid') {
    if (controller.current) return;
    const operation = new AbortController(); controller.current = operation;
    setBusy(true); setMessage('Reading a generated fictional report on this device…');
    try {
      if (format === 'invalid') {
        const result = await runSyntheticRejectionDiagnostic(PrivateInput, operation.signal);
        if (mounted.current) setMessage(`Rejected ${result.rejected} generated empty, corrupt and oversized files. Temporary sessions cleaned. Nothing uploaded. This does not approve real-data privacy.`);
        return;
      }
      const result = await runSyntheticInputDiagnostic(PrivateInput, operation.signal, format);
      if (mounted.current) setMessage(`Local test completed: ${result.pages} pages; ${result.recognizedLines} lines read; ${result.removedLines} excluded; ${result.retainedLines} retained on a fresh image. Temporary files removed. Nothing uploaded. Real-data privacy approval is still pending.`);
    } catch {
      if (mounted.current) setMessage(operation.signal.aborted ? 'Test cancelled. Temporary input cleanup requested.' : 'The local input test could not complete. A current native build and device verification are required.');
    } finally {
      controller.current = null;
      if (mounted.current) setBusy(false);
    }
  }
  return <Card><Heading>Local input test</Heading>
    <Body>This engineering check creates a fictional image or two-page PDF and exercises on-device reading, reconstruction and cleanup. It does not open your photos or reports.</Body>
    {Platform.OS === 'web' ? <Body>Available in the updated phone build.</Body> : <>
      <Button label="Run fictional image test" disabled={busy} onPress={() => void run('image')} />
      <Button secondary label="Run fictional PDF test" disabled={busy} onPress={() => void run('pdf')} />
      <Button secondary label="Test invalid file rejection" disabled={busy} onPress={() => void run('invalid')} />
      {busy && <Button secondary label="Cancel input test" onPress={() => controller.current?.abort()} />}
    </>}
    {!!message && <Status>{message}</Status>}
  </Card>;
}
