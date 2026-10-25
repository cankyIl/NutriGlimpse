import { useState, useCallback, useRef } from 'react';
import { AppState, Linking, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { normalizeBarcode, normalizeScannedBarcode, CameraSession } from '@grocery/core';
import { Body, Button, Card, Heading, Chip, s } from './components';
export function BarcodeInput({onLookup}: {onLookup?: (code:string)=>void}) {
  const session = useRef(new CameraSession()).current;
  const [pending, setPending] = useState(false);
  const [cameraTicket, setCameraTicket] = useState(0);
  const [upce, setUpce] = useState(false);
  const [permission, request] = useCameraPermissions();
  const [active, setActive] = useState(false); const [code, setCode] = useState(''); const [message, setMessage] = useState('');
  const stop = useCallback(() => { session.stop(); setActive(false); setPending(false); }, [session]);
  useFocusEffect(useCallback(() => {
    session.setFocused(true); session.setForeground(AppState.currentState === 'active');
    const listener = AppState.addEventListener('change', state => {
      session.setForeground(state === 'active');
      if (state !== 'active') stop();
    });
    return () => { session.setFocused(false); stop(); listener.remove(); };
  }, [session, stop]));
  function check(value: string, symbology?: string) {
    stop();
    const normalized = symbology ? normalizeScannedBarcode(value, symbology) : normalizeBarcode(value, upce ? 'upc_e' : 'gtin');
    setCode(normalized ?? value.slice(0, 14));
    if (normalized) setUpce(false);
    setMessage(normalized ? 'Barcode validated and normalized. Tap Look up this barcode to check our limited food catalog. Samples below are separate fixtures.' : 'Barcode could not be verified. Include every digit and check the selected format, or scan again.');
  }
  async function start() {
    if (!session.canRequest) return;
    setPending(true);
    const result = await session.open(async () => (permission?.granted ? permission : await request()).granted);
    if (result === 'stale' || result === 'busy') return;
    setPending(false);
    if (result === 'opened') { setCameraTicket(session.ticket); setMessage(''); setActive(true); }
    else setMessage(result === 'denied' ? 'Camera access was declined. Enter the barcode or choose a sample.' : 'Camera is unavailable. Enter the barcode instead.');
  }
  return <Card><Heading>Scan a barcode</Heading><Body muted>The camera reads barcode digits on your phone. No photo is saved or uploaded.</Body>{active && <CameraView key={cameraTicket} style={{ height: 230, borderRadius: 16 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['ean8','ean13','upc_a','upc_e'] }} onBarcodeScanned={result => { if (session.consume(cameraTicket)) check(result.data, result.type); }} onMountError={() => { if (!session.consume(cameraTicket)) return; stop(); setMessage('Camera could not start. Try entering the digits.'); }} />}
    <Button label={pending ? 'Cancel camera request' : active ? 'Stop camera' : 'Open barcode camera'} onPress={() => active || pending ? stop() : void start()} />{permission && !permission.granted && !permission.canAskAgain && <Button secondary label="Open phone settings" onPress={() => void Linking.openSettings()} />}
    <Chip label="Manual entry is UPC-E (8 digits)" selected={upce} onPress={() => { setUpce(!upce); setMessage(''); }} /><Body muted>For manual UPC-E, include the small first and last digits. Otherwise 8 digits are treated as EAN-8.</Body><TextInput accessibilityLabel="Product barcode" value={code} onChangeText={value => { setCode(value); setMessage(''); }} keyboardType="number-pad" maxLength={14} style={s.body} /><Button secondary label="Check barcode" onPress={() => check(code)} />{!!message && <Body>{message}</Body>}
  {onLookup&&<Button secondary label="Look up this barcode" disabled={!normalizeBarcode(code,upce?'upc_e':'gtin')} onPress={()=>{const normalized=normalizeBarcode(code,upce?'upc_e':'gtin');if(normalized)onLookup(normalized);}}/>}<Body muted>Lookup sends only these barcode digits to our catalog when you tap. A match must still be checked against the package.</Body></Card>;
}

