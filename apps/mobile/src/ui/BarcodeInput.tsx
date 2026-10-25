import { useState } from 'react';
import { TextInput } from 'react-native';
import { normalizeBarcode } from '@grocery/core';
import { Body, Button, Card, Heading, Chip, s } from './components';
export function BarcodeInput({onLookup}: {onLookup?: (code:string)=>void}) {
  const [upce, setUpce] = useState(false);
  const [code, setCode] = useState(''); const [message, setMessage] = useState('');
  return <Card><Heading>Check a barcode</Heading><Chip label="Manual entry is UPC-E (8 digits)" selected={upce} onPress={() => { setUpce(!upce); setMessage(''); }} /><Body muted>Include every printed digit. Eight digits are EAN-8 unless UPC-E is selected.</Body><TextInput accessibilityLabel="Product barcode" value={code} onChangeText={value => { setCode(value); setMessage(''); }} keyboardType="number-pad" maxLength={14} style={s.body} /><Button secondary label="Check barcode" onPress={() => setMessage(normalizeBarcode(code, upce ? 'upc_e' : 'gtin') ? 'Barcode is valid. Tap Look up this barcode to check our limited food catalog.' : 'Check the selected format and include all digits, including the check digit.')} />{!!message && <Body>{message}</Body>}<Body muted>Camera barcode scanning is available in the native build.</Body>{onLookup&&<Button secondary label="Look up this barcode" disabled={!normalizeBarcode(code,upce?'upc_e':'gtin')} onPress={()=>{const normalized=normalizeBarcode(code,upce?'upc_e':'gtin');if(normalized)onLookup(normalized);}}/>}<Body muted>Lookup sends only these barcode digits to our catalog when you tap. A match must still be checked against the package.</Body></Card>;
}
