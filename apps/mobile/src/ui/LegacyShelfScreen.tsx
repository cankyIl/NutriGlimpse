import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { comparisonGroups, normalizeBarcode, rankShelfFoods, type ComparisonGroup, type PublicFood, type ShelfCandidate } from '@grocery/core';
import { getShelfBenchmarkAvailabilityAsync, ShelfBenchmarkView, type ShelfBenchmarkAvailability, type ShelfBenchmarkModelId } from '../../modules/shelf-benchmark';
import { bindShelfCapture, clearShelfCapture, shelfSession, useShelfSession } from '../state/ShelfScanState';
import { loadShelfCatalog } from '../state/shelfCatalog';
import { recordId, useAppState } from '../state/AppState';
import { useShoppingStore } from '../state/StoreContext';
import { ShelfRankings } from '../ui/ShelfRankings';
import { CatalogCredits } from '../ui/CatalogCredits';
import { Back, Body, Button, Card, Chip, Heading, Icon, Page, Status, Title, s } from '../ui/components';
import { colors } from '../ui/theme';

const commonCategories: ComparisonGroup[] = ['breakfast-cereal', 'cookies', 'cheddar-cheese', 'cottage-cheese', 'potato-chips', 'granola'];
const categoryLabel = (value: string) => value.split('-').map(part => part[0].toUpperCase() + part.slice(1)).join(' ');
const modelFor = (category: ComparisonGroup): ShelfBenchmarkModelId => /cheese|mozzarella|parmesan/.test(category) ? 'sku110k' : 'shelfset';
const cameraMessage: Record<ShelfBenchmarkAvailability['reason'], string> = {
  native_device_required: 'Install the native phone build to use the shelf camera. Browser camera speed cannot verify phone performance.',
  ready: 'The shelf camera is available. Move slowly and pause to review possible matches.',
  model_missing: 'Install the complete native phone build to use the shelf camera.',
  invalid_model: 'The camera model could not be verified. Install the complete native build.',
  native_module_missing: 'The shelf camera needs the prepared native phone build. Expo Go cannot run it.',
  ios_only: 'Live shelf capture is being tested on iPhone. You can review package text on this device.',
  simulator_unsupported: 'Use a physical iPhone for shelf capture. Package text review works here.',
};
function ReviewCandidate({ candidate, runId }: { candidate: ShelfCandidate; runId: string }) {
  const [error, setError] = useState('');
  return <Card><Text style={styles.kicker}>{candidate.status === 'unmatched' ? 'NOT IDENTIFIED' : 'CHECK THE EXACT VARIANT'}</Text>
    <Heading>{candidate.displayName}</Heading><Body muted>{candidate.reason}</Body>
    {candidate.options.map(option => <View key={option.key} style={styles.option}>
      <Body>{option.food.name}</Body><Text style={s.small}>{option.food.brand || 'Brand not reported'} · Barcode {option.food.barcode || 'not reported'}</Text>
      <Text style={s.small}>Check the flavor, original/reduced-sugar version and package. Nutrition values may differ.</Text>
      <Button secondary label={'Confirm ' + option.food.name} onPress={() => { if (!shelfSession.confirm(runId, candidate.id, option.key)) setError('This match changed or conflicts with a product already in the scan. Check confirmed products below, remove the incorrect entry, then scan this package again.'); }} />
    </View>)}
    {!candidate.options.length && <Body muted>Try a closer view of the brand and product name, or transcribe the label below. Catalog coverage may be incomplete.</Body>}
    {!!error && <Status>{error}</Status>}
    <Button secondary label="Dismiss this observation" onPress={() => shelfSession.dismissCandidate(runId, candidate.id)} />
  </Card>;
}
export default function ShelfScreen() {
  const {auto}=useLocalSearchParams<{auto?:string}>();
  const autoStarted=useRef(false),autoLoaded=useRef(false);
  const autoActions=useRef({load:()=>{},start:()=>{}});
  const health = useAppState();
  const store = useShoppingStore();
  const archive = useShelfSession();
  const run = archive.runs.find(item => item.id === archive.activeRunId);
  const [category, setCategory] = useState<ComparisonGroup>(run?.categoryId ?? 'breakfast-cereal');
  const [categoryQuery, setCategoryQuery] = useState('');
  const [moreCategories, setMoreCategories] = useState(false);
  const [pool, setPool] = useState<{ category: ComparisonGroup; foods: PublicFood[] } | null>(null);
  const poolRef = useRef(pool);
  const [loading, setLoading] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [message, setMessage] = useState('');
  const [availability, setAvailability] = useState<ShelfBenchmarkAvailability | null>(null);
  const [focused, setFocused] = useState(false);
  const focusedRef = useRef(false);
  const request = useRef<AbortController | null>(null);
  const [cameraId, setCameraId] = useState('');
  const cameraIdRef = useRef('');
  const [settingsNeeded, setSettingsNeeded] = useState(false);
  const [observedText, setObservedText] = useState('');
  const [manualMode, setManualMode] = useState<'text' | 'barcode'>('text');
  const [reviewLimit, setReviewLimit] = useState(5);
  const [showConfirmed, setShowConfirmed] = useState(false);
  const [confirmedLimit, setConfirmedLimit] = useState(5);
  const [clock, setClock] = useState(Date.now);
  const modelId = modelFor(category);
  const scanning = run?.state === 'scanning';
  const poolReady = pool?.category === category && pool.foods.length > 0;
  const cameraReady = availability?.available && availability.modelId === modelId;
  const confirmed = useMemo(() => run?.candidates.flatMap(candidate => candidate.status === 'confirmed' && candidate.food ? [candidate.food] : []) ?? [], [run]);
  const pending = run?.candidates.filter(candidate => candidate.status !== 'confirmed') ?? [];
  const ranking = useMemo(() => rankShelfFoods({ foods: confirmed, categoryId: category, profile: health.profile,
    panels: health.panels, panelChoice: health.panelChoice, now: clock }), [confirmed, category, health.profile, health.panels, health.panelChoice, clock]);

  const cancelCatalog = useCallback(() => { request.current?.abort(); request.current = null; setLoading(false); }, []);
  useFocusEffect(useCallback(() => {
    focusedRef.current = true; setFocused(true); setClock(Date.now());
    return () => { focusedRef.current = false; setFocused(false); cameraIdRef.current = ''; setCameraId(''); clearShelfCapture(); shelfSession.pauseAll(); cancelCatalog(); };
  }, [cancelCatalog]));
  useEffect(() => {
    if (!focused) return;
    let current = true;
    void getShelfBenchmarkAvailabilityAsync(modelId).then(value => {
      if (focusedRef.current && current && value.modelId === modelId) setAvailability(value);
    }).catch(() => { if (focusedRef.current && current) setMessage('The camera could not be checked. Reopen Shelf Scan to retry.'); });
    return () => { current = false; };
  }, [focused, modelId]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'background') { cameraIdRef.current = ''; setCameraId(''); clearShelfCapture(); shelfSession.pauseAll(); cancelCatalog(); setObservedText(''); }
      if (state === 'active') setClock(Date.now());
    });
    return () => subscription.remove();
  }, [cancelCatalog]);
  useEffect(() => {
    if (!focused) return;
    const timer = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, [focused]);

  async function loadCatalog(refresh = false) {
    cancelCatalog(); const controller = new AbortController(); request.current = controller;
    setLoading(true); setCatalogError('');
    try {
      const foods = await loadShelfCatalog(category, controller.signal, refresh);
      if (request.current !== controller || !focusedRef.current) return;
      poolRef.current = { category, foods }; setPool(poolRef.current); setMessage(foods.length ? 'Category facts loaded. Camera matching stays on this device.' : 'This category has no catalog entries yet. Choose another category or try again later.');
    } catch (error) { if (request.current === controller && focusedRef.current) setCatalogError(error instanceof Error ? error.message : 'Category facts are unavailable.'); }
    finally { if (request.current === controller) { request.current = null; setLoading(false); } }
  }
  useEffect(()=>{autoActions.current={load:()=>void loadCatalog(),start:()=>startNew(true)};});
  useEffect(()=>{
    if(auto!=='1'||!focused||autoStarted.current)return;
    if(!autoLoaded.current){autoLoaded.current=true;autoActions.current.load();return;}
    if(poolReady&&cameraReady&&!loading){autoStarted.current=true;autoActions.current.start();}
  },[auto,focused,poolReady,cameraReady,loading]);
  function chooseCategory(next: ComparisonGroup) {
    if (scanning) return;
    cancelCatalog(); setCategory(next); setCatalogError(''); setMessage(''); setReviewLimit(5);
    if (run) shelfSession.updateCategory(run.id, next);
  }
  function startNew(camera: boolean) {
    if (!poolReady || loading || (camera && (!cameraReady || AppState.currentState !== 'active'))) return;
    const id = shelfSession.start(category);
    if (!id) { setMessage('This app session is full. Earlier scans have been preserved.'); return; }
    setReviewLimit(5); setObservedText(''); setSettingsNeeded(false);
    if (camera) { const capture = recordId(); bindShelfCapture(id, capture); cameraIdRef.current = capture; setCameraId(capture); setMessage('Preparing the shelf camera…'); }
    else { shelfSession.pause(id); setMessage('Label-check session started. Enter only text or a barcode from a package you are looking at.'); }
  }
  function pause() { clearShelfCapture(); cameraIdRef.current = ''; setCameraId(''); if (run) shelfSession.pause(run.id); setMessage('Paused. Review possible matches or resume scanning.'); }
  function resume() {
    if (!run || !poolReady || !cameraReady || AppState.currentState !== 'active') return;
    if (shelfSession.resume(run.id)) { const capture = recordId(); bindShelfCapture(run.id, capture); cameraIdRef.current = capture; setCameraId(capture); setMessage('Resuming the shelf camera…'); }
    else setMessage('This scan cannot resume. Check the collection limit or start a new scan when capacity allows.');
  }
  function finish() { clearShelfCapture(); cameraIdRef.current = ''; setCameraId(''); if (run) shelfSession.finish(run.id); setMessage('Scan finished. These results remain available during this app session.'); }
  function openPrevious(id: string) {
    clearShelfCapture(); cameraIdRef.current = ''; setCameraId(''); cancelCatalog(); shelfSession.openRun(id);
    const previous = shelfSession.getSnapshot().runs.find(item => item.id === id);
    if (previous) setCategory(previous.categoryId);
    setReviewLimit(5); setObservedText(''); setMessage('Earlier scan opened. Capture stays paused until you resume.');
  }
  function addLabel() {
    if (!run || !poolReady || scanning || !observedText.trim()) return;
    const digits = observedText.trim();
    if (manualMode === 'barcode' && (![12, 13, 14].includes(digits.length) || !normalizeBarcode(digits))) {
      setMessage('Enter a valid 12-, 13- or 14-digit package barcode. For an 8-digit code, use the camera so its barcode format can be checked.'); return;
    }
    const symbology = digits.length === 12 ? 'upc_a' : digits.length === 13 ? 'ean13' : 'itf14';
    const observation = { observationId: recordId(), text: manualMode === 'text' ? [{ value: observedText.trim(), confidence: 1 }] : [],
      barcodes: manualMode === 'barcode' ? [{ value: digits, symbology }] : [] };
    const accepted = shelfSession.reviewObservation(run.id, observation, pool!.foods);
    setObservedText(''); setMessage(accepted ? 'Package observation added. Confirm any suggested product before it joins the comparison.' : 'That observation could not be added. Check the text/barcode and available session space.');
  }
  return <Page><Back /><Title eyebrow="SHELF SCAN">{scanning ? 'Scanning your shelf' : 'Find your better fit.'}</Title>
    {!scanning && <Body>Collect products as you scan, confirm uncertain matches, and compare the foods you actually found.</Body>}
    {!scanning && <View style={styles.mode}><Chip label="Single product" selected={false} onPress={() => { pause(); router.replace('/capture'); }} /><Chip label="Shelf Scan" selected onPress={() => {}} /></View>}
    <Text style={s.small}>{store.selected ? 'Shopping at ' + store.selected.name : 'Store not selected'} · Your profile stays on your device.</Text>
    {scanning ? <Body muted>{categoryLabel(category)} · Move slowly. Pause to check matches.</Body> : <Card><Heading>Compare within one category</Heading><View style={styles.choices}>
      {(moreCategories ? comparisonGroups.filter(group => categoryLabel(group).toLowerCase().includes(categoryQuery.toLowerCase())).slice(0, 16) : [...new Set([category, ...commonCategories])]).map(group =>
        <Chip key={group} label={categoryLabel(group)} selected={category === group} disabled={!!scanning} onPress={() => chooseCategory(group)} />)}
    </View>{moreCategories && <TextInput accessibilityLabel="Find a category" placeholder="Find a category" value={categoryQuery} onChangeText={setCategoryQuery} maxLength={40} style={styles.input} />}
      <Button secondary label={moreCategories ? 'Show common categories' : 'More categories'} disabled={!!scanning} onPress={() => setMoreCategories(!moreCategories)} />
      <Body muted>Original and reduced-sugar versions stay separate within the same category. Cheese types are compared separately.</Body>
      <Button secondary label={loading ? 'Loading category facts…' : poolReady ? 'Refresh category facts' : 'Load category facts'} disabled={loading || !!scanning} onPress={() => void loadCatalog(!!poolReady)} />
      {poolReady && <Text style={s.small}>{pool!.foods.length} catalog records available for matching. This is not store inventory.</Text>}
      {!!catalogError && <Status>{catalogError}</Status>}
      {!poolReady && <Button secondary label="Open Food catalog" onPress={() => router.push('/catalog')} />}
    </Card>}
    {availability && !cameraReady && <Body muted>{cameraMessage[availability.reason]}</Body>}
    {focused && scanning && cameraId && cameraReady && <View style={styles.preview}>
      <ShelfBenchmarkView style={StyleSheet.absoluteFill} mode="scan" modelId={modelId} active durationSeconds={300} runId={cameraId}
        onStatus={({ nativeEvent: event }) => { if (event.runId === cameraIdRef.current && focusedRef.current) setMessage(event.message); }}
        onObservations={({ nativeEvent: event }) => {
          if (event.runId !== cameraIdRef.current || !focusedRef.current) return;
          const current = shelfSession.getSnapshot(); const selected = current.runs.find(item => item.id === current.activeRunId);
          if (!selected || selected.state !== 'scanning' || poolRef.current?.category !== selected.categoryId) return;
          const token = shelfSession.beginWork(selected.id);
          if (token) shelfSession.completeWork(token, event.observations, poolRef.current.foods);
        }}
        onScanState={({ nativeEvent: event }) => {
          if (event.runId !== cameraIdRef.current || event.state === 'running') return;
          cameraIdRef.current = ''; setCameraId(''); clearShelfCapture(); shelfSession.pauseAll();
          setMessage(event.reason === 'memory_pressure' ? 'Scanning paused to protect phone memory. Earlier products were preserved.' : 'Scanning paused. Your products are kept; resume when ready.');
        }}
        onError={({ nativeEvent: event }) => {
          if (event.runId !== cameraIdRef.current) return;
          cameraIdRef.current = ''; setCameraId(''); clearShelfCapture(); shelfSession.pauseAll(); setMessage(event.message);
          setSettingsNeeded(event.code === 'CAMERA_PERMISSION_DENIED' && !event.canAskAgain);
        }} />
    </View>}
    {scanning ? <><Button label="Pause & review" icon="pause" onPress={pause} /><Button secondary label="Finish scan" icon="check" onPress={finish} /></> : <View style={styles.stack}>
      {run?.state === 'paused' && <Button label="Resume scanning" icon="camera" disabled={!poolReady || !cameraReady || run.capacityReached || archive.capacityReached} onPress={resume} />}
      <Button label={archive.runs.length ? 'Start a new scan' : 'Start scanning'} icon="camera" disabled={!poolReady || !cameraReady || loading || archive.capacityReached} onPress={() => startNew(true)} />
      {!cameraReady && <Button secondary label="Start a label-check session" disabled={!poolReady || loading || archive.capacityReached} onPress={() => startNew(false)} />}
      {run?.state === 'paused' && <Button secondary label="Finish this scan" onPress={finish} />}
    </View>}
    {!!message && <Status>{message}</Status>}
    {settingsNeeded && <Button secondary label="Open camera settings" onPress={() => void Linking.openSettings()} />}
    {run && <>
      <View style={styles.counts}><View><Text style={styles.count}>{confirmed.length}</Text><Text style={s.small}>Confirmed</Text></View><View><Text style={styles.count}>{pending.length}</Text><Text style={s.small}>To review</Text></View><View><Text style={styles.count}>{ranking.ranked.length}</Text><Text style={s.small}>Compared</Text></View></View>
      <Text style={s.small}>{categoryLabel(run.categoryId)} · {run.state === 'scanning' ? 'Collecting products' : run.state === 'finished' ? 'Finished' : 'Paused'} · Started {new Date(run.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
      {(run.capacityReached || archive.capacityReached) && <Status>Collection has reached this session’s collection limit. Earlier scans have been preserved.</Status>}
      {scanning && pending.length > 0 && <Body muted>Possible matches are collecting below. Pause when you are ready to check them.</Body>}
      {!scanning && <>
        <Heading>Needs confirmation · {pending.length}</Heading>
        {pending.slice(0, reviewLimit).map(candidate => <ReviewCandidate key={candidate.id} candidate={candidate} runId={run.id} />)}
        {pending.length > reviewLimit && <Button secondary label="Show more observations" onPress={() => setReviewLimit(limit => limit + 5)} />}
        {confirmed.length > 0 && <Button secondary label={(showConfirmed ? 'Hide' : 'Check') + ' confirmed products (' + confirmed.length + ')'} onPress={() => setShowConfirmed(!showConfirmed)} />}
        {showConfirmed && run.candidates.filter(candidate => candidate.status === 'confirmed').slice(0, confirmedLimit).map(candidate => <Card key={candidate.id}>
          <Heading>{candidate.displayName}</Heading><Body muted>{candidate.food?.brand || 'Brand not reported'} · Barcode {candidate.food?.barcode || 'not reported'}</Body>
          <Body muted>{candidate.identityMethod === 'barcode' ? 'Matched by a unique catalog barcode.' : 'You confirmed this match.'} Check that the name and variant agree with your package.</Body>
          <Button secondary label="Remove this product from the scan" onPress={() => shelfSession.dismissCandidate(run.id, candidate.id)} />
        </Card>)}
        {showConfirmed && confirmed.length > confirmedLimit && <Button secondary label="Show more confirmed products" onPress={() => setConfirmedLimit(limit => limit + 5)} />}
        <Card><Heading>Read a label the camera missed</Heading><Body muted>Enter the brand, exact name and variant from a package in front of you. This stays on the device and searches only the loaded category.</Body>
          <View style={styles.choices}><Chip label="Package text" selected={manualMode === 'text'} onPress={() => { setManualMode('text'); setObservedText(''); }} /><Chip label="Barcode digits" selected={manualMode === 'barcode'} onPress={() => { setManualMode('barcode'); setObservedText(''); }} /></View>
          <TextInput accessibilityLabel={manualMode === 'text' ? 'Observed package text' : 'Observed package barcode'} value={observedText} onChangeText={setObservedText} maxLength={manualMode === 'text' ? 240 : 14} autoCorrect={false} keyboardType={manualMode === 'barcode' ? 'number-pad' : 'default'} multiline={manualMode === 'text'} placeholder={manualMode === 'text' ? 'Brand, product, flavor or version' : 'Barcode digits from this package'} style={styles.input} />
          <Button secondary label="Add package for review" disabled={!poolReady || !observedText.trim()} onPress={addLabel} />
        </Card>
      </>}
      <ShelfRankings ranking={ranking} confirmedCount={confirmed.length} />
      <Button secondary label="Review your health needs" onPress={() => { pause(); router.push('/(tabs)/needs'); }} />
    </>}
    {archive.runs.length > 0 && <Card><Heading>Scans this app session</Heading><Body muted>Starting another scan keeps these results. Closing or terminating the app clears them.</Body>
      {archive.runs.map((previous, index) => <Button key={previous.id} secondary label={(previous.id === run?.id ? 'Viewing · ' : '') + 'Scan ' + (index + 1) + ' · ' + categoryLabel(previous.categoryId) + ' · ' + previous.candidates.filter(candidate => candidate.status === 'confirmed').length + ' confirmed'} onPress={() => openPrevious(previous.id)} />)}
    </Card>}
    <View style={styles.privacy}><Icon name="shield" /><Body muted>Camera images and package text stay on this device. Shelf results are temporary and excluded from saved History and backups.</Body></View>
    <Body muted>{Platform.OS === 'ios' ? 'Camera detection targets two frames each second. Reading and matching package labels run separately and may take longer.' : 'Live camera recognition still requires the native iPhone test build.'} Clinical ratings and full dietary compatibility require more evidence than this nutrient comparison.</Body>
    <CatalogCredits />
  </Page>;
}
const styles = StyleSheet.create({
  stack: { gap: 12 }, mode: { flexDirection: 'row', gap: 10 }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { ...s.body, backgroundColor: colors.background, borderColor: colors.line, borderWidth: 1, borderRadius: 12, padding: 14, minHeight: 52 },
  preview: { height: 340, backgroundColor: colors.greenDeep, borderRadius: 22, overflow: 'hidden' },
  counts: { flexDirection: 'row', justifyContent: 'space-around', padding: 18, backgroundColor: colors.sage, borderRadius: 20 },
  count: { fontSize: 32, fontWeight: '700', color: colors.green, textAlign: 'center' },
  option: { gap: 10, borderTopWidth: 1, borderColor: colors.line, paddingTop: 14 },
  kicker: { color: colors.amber, fontSize: 11, fontWeight: '700', letterSpacing: 1.1 },
  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingRight: 24 },
});
