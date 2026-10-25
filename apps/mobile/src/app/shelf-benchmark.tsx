import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Linking, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  getShelfBenchmarkAvailabilityAsync, ShelfBenchmarkView,
  type ShelfBenchmarkAvailability, type ShelfBenchmarkMetrics, type ShelfBenchmarkModelId, type ShelfBenchmarkSummary,
} from '../../modules/shelf-benchmark';
import { getShelfBenchmarkSummaries, recordShelfBenchmark, subscribeShelfBenchmarks } from '../state/shelfBenchmarkSession';
import { Back, Body, Button, Card, Chip, Heading, Page, Status, Title, s } from '../ui/components';
import { colors } from '../ui/theme';

const unavailable: Record<ShelfBenchmarkAvailability['reason'], string> = {
  native_device_required: 'Install the native phone build to use the shelf camera. Browser camera speed cannot verify phone performance.',
  ready: 'The detector is included. Start a test to measure this phone.',
  invalid_model: 'This build has an invalid detector configuration. Install the complete comparison build.',
  model_missing: 'This build does not include the shelf model. Install the prepared native benchmark build.',
  native_module_missing: 'Install the native benchmark build. Expo Go cannot run this test.',
  ios_only: 'This test runs on a physical iPhone. Browser and Android results cannot verify iPhone speed.',
  simulator_unsupported: 'Use a physical iPhone for camera speed and thermal measurements.',
};
const ms = (value: number) => `${Number.isFinite(value) ? value.toFixed(0) : '—'} ms`;
const fps = (value: number) => Number.isFinite(value) ? value.toFixed(2) : '—';
function Measurements({ value }: { value: ShelfBenchmarkMetrics }) {
  return <View style={styles.metrics}>
    <View style={styles.metric}><Text style={s.small}>Completed per second</Text><Text style={styles.number}>{fps(value.completedFramesPerSecond)}</Text></View>
    <View style={styles.metric}><Text style={s.small}>Completed frames</Text><Text style={styles.number}>{value.completedFrames}</Text></View>
    <View style={styles.metric}><Text style={s.small}>Typical / slowest 5%</Text><Text style={styles.value}>{ms(value.latencyP50Ms)} / {ms(value.latencyP95Ms)}</Text></View>
    <View style={styles.metric}><Text style={s.small}>Elapsed / planned</Text><Text style={styles.value}>{Math.floor(value.elapsedSeconds)} / {value.requestedDurationSeconds} sec</Text></View>
    <View style={styles.metric}><Text style={s.small}>Missed test slots</Text><Text style={styles.value}>{value.busyDroppedSlots + value.missedCaptureSlots}</Text></View>
    <View style={styles.metric}><Text style={s.small}>Phone temperature state</Text><Text style={styles.value}>{value.thermalState}</Text></View>
  </View>;
}
function Result({ result }: { result: ShelfBenchmarkSummary }) {
  return <Card><Text style={s.small}>{result.modelId === 'shelfset' ? 'ShelfSet' : 'SKU-110K'}</Text><Heading>{result.requestedDurationSeconds === 300 ? 'Five-minute test' : '30-second check'}</Heading>
    <Text style={[s.body, { color: result.timingGatePassed ? colors.green : colors.amber, fontWeight: '700' }]}>
      {result.timingGatePassed ? 'Timing target met' : result.durationComplete ? 'Timing target not met' : 'Incomplete — no pass recorded'}
    </Text>
    <Measurements value={result} />
    <Body muted>{result.deviceModel} · iOS {result.operatingSystemVersion} · {result.termination}</Body>
    <Body muted>App {result.appVersion} ({result.appBuildNumber}) · {result.buildConfiguration} build · single-frame detection</Body>
    <Body muted>Failed frames: {result.failedFrames} · Temperature states: {result.thermalStatesObserved.join(", ")}</Body>
    <Body muted>Package accuracy has not been validated by this speed test. Boxes can still be missed, combined, or misplaced.</Body>
    <Text selectable style={s.small}>Model: {result.modelName}{'\n'}Fingerprint: {result.modelFingerprint}{'\n'}Completed: {result.completedAt}{'\n'}Low Power Mode: {result.lowPowerMode ? 'on' : 'off'}</Text>
  </Card>;
}
export default function ShelfBenchmarkScreen() {
  const [modelId, setModelId] = useState<ShelfBenchmarkModelId>('shelfset');
  const availabilityRequest = useRef(0);
  const [availability, setAvailability] = useState<ShelfBenchmarkAvailability | null>(null);
  const [duration, setDuration] = useState<30 | 300>(30);
  const [active, setActive] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [runId, setRunId] = useState('');
  const [message, setMessage] = useState('Checking this build…');
  const [metrics, setMetrics] = useState<ShelfBenchmarkMetrics | null>(null);
  const [settingsNeeded, setSettingsNeeded] = useState(false);
  const currentRun = useRef('');
  const lastError = useRef<{ runId: string; message: string } | null>(null);
  const focused = useRef(false);
  const summaries = useSyncExternalStore(subscribeShelfBenchmarks, getShelfBenchmarkSummaries, getShelfBenchmarkSummaries);
  const ready = availability?.available === true && availability.modelId === modelId;
  const checkBuild = useCallback(async () => {
    const request = ++availabilityRequest.current;
    setAvailability(null); setMessage('Checking the selected detector…');
    try {
      const result = await getShelfBenchmarkAvailabilityAsync(modelId);
      if (focused.current && request === availabilityRequest.current && result.modelId === modelId) {
        setAvailability(result); setMessage(unavailable[result.reason]);
      }
    } catch {
      if (focused.current && request === availabilityRequest.current) setMessage('The detector could not be checked. Try again.');
    }
  }, [modelId]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    void checkBuild();
    return () => { focused.current = false; availabilityRequest.current++; setActive(false); setStopping(false); };
  }, [checkBuild]));
  function chooseModel(next: ShelfBenchmarkModelId) {
    if (active || stopping || next === modelId) return;
    availabilityRequest.current++;
    currentRun.current = ''; lastError.current = null;
    setAvailability(null); setMetrics(null); setRunId(''); setSettingsNeeded(false); setModelId(next);
  }
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background') { setActive(false); setMessage('Test stopped when the app left the foreground. Start a new test when ready.'); }
    });
    return () => subscription.remove();
  }, []);
  function start() {
    if (!ready || active || stopping || !focused.current || AppState.currentState !== 'active') return;
    const id = `shelf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    currentRun.current = id; lastError.current = null; setRunId(id); setMetrics(null); setSettingsNeeded(false);
    setMessage('Preparing the camera and detector…'); setStopping(false); setActive(true);
  }
  return <Page><Back /><Title eyebrow="IPHONE · SHELF TEST">Let’s measure your scanner.</Title>
    <Body>Point at a grocery shelf. This test finds package outlines and measures two detection attempts per second. Product names and health rankings come later.</Body>
    <Card><Heading>Compare detectors</Heading><View style={styles.choices}>
      <Chip label="ShelfSet" selected={modelId === 'shelfset'} disabled={active || stopping} onPress={() => chooseModel('shelfset')} />
      <Chip label="SKU-110K" selected={modelId === 'sku110k'} disabled={active || stopping} onPress={() => chooseModel('sku110k')} />
    </View><Body muted>Run both on the same shelf. ShelfSet did better on our crowded cereal sample; SKU-110K did better on the cheese sample. These are experimental detectors. Neither identifies the exact product.</Body></Card>
    <Card><Heading>Choose a test</Heading><View style={styles.choices}>
      <Chip label="30-second check" selected={duration === 30} disabled={active || stopping} onPress={() => setDuration(30)} />
      <Chip label="Five-minute test" selected={duration === 300} disabled={active || stopping} onPress={() => setDuration(300)} />
    </View><Body muted>Start with the short check. For the longer test, move slowly along the shelf, stop, and reverse direction. Check whether outlines follow individual packages.</Body></Card>
    <Status>{message}</Status>
    {active ? <Button label="Stop test" icon="square" onPress={() => { setStopping(true); setActive(false); setMessage('Stopping the test…'); }} /> : <Button label={stopping ? 'Stopping test…' : 'Start shelf test'} icon="camera" disabled={!ready || stopping} onPress={start} />}
    {!ready && <Button secondary label="Check this build again" onPress={() => void checkBuild()} />}
    {settingsNeeded && <Button secondary label="Open camera settings" onPress={() => void Linking.openSettings()} />}
    {ready && <View style={styles.preview}>
      <ShelfBenchmarkView style={StyleSheet.absoluteFill} modelId={modelId} active={active} durationSeconds={duration} runId={runId}
        onStatus={({ nativeEvent: event }) => { if (event.runId === currentRun.current && focused.current && lastError.current?.runId !== event.runId) setMessage(event.message); }}
        onMetrics={({ nativeEvent: event }) => { if (event.runId === currentRun.current && focused.current) setMetrics(event); }}
        onComplete={({ nativeEvent: event }) => {
          recordShelfBenchmark(event);
          if (event.runId === currentRun.current && focused.current) {
            setMetrics(event); setActive(false); setStopping(false);
            setMessage(event.termination === 'error' ? lastError.current?.message ?? 'The test failed. See the partial results below.' : event.durationComplete ? 'Test complete. Your measured results are below.' : 'Test stopped. This partial run does not establish sustained speed.');
          }
        }}
        onError={({ nativeEvent: event }) => {
          if (event.runId === currentRun.current && focused.current) { lastError.current = { runId: event.runId, message: event.message }; setActive(false); setStopping(false); setMessage(event.message); setSettingsNeeded(event.code === 'CAMERA_PERMISSION_DENIED' && !event.canAskAgain); }
        }} />
      {!active && <View pointerEvents="none" style={styles.previewHint}><Text style={styles.previewText}>Camera starts with your test</Text></View>}
    </View>}
    {active && metrics && <Card><Heading>Live measurements</Heading><Measurements value={metrics} /><Body muted>Timing alone does not verify package accuracy.</Body></Card>}
    <Body muted>Frames stay in camera memory. This test saves no photos and makes no network requests. Results below last only while the app is open.</Body>
    <Card><Heading>What counts as a pass?</Heading><Body muted>A completed Release-build run with at least 1.90 completed frames/sec (5% tolerance around the 2 Hz target), 95% of detections under 500 ms, no failed frames, and no serious or critical temperature warning. A 30-second pass is only a quick check; use the five-minute test for sustained timing.</Body></Card>
    {summaries.length > 0 && <Heading>Tests from this app session</Heading>}
    {summaries.map(result => <Result key={result.runId} result={result} />)}
  </Page>;
}
const styles = StyleSheet.create({
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  preview: { height: 390, borderRadius: 22, overflow: 'hidden', backgroundColor: colors.greenDeep },
  previewHint: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenDeep },
  previewText: { color: '#FFFFFF', fontSize: 16 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  metric: { minWidth: 150, flexGrow: 1, gap: 5 },
  number: { color: colors.ink, fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] },
  value: { color: colors.ink, fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
