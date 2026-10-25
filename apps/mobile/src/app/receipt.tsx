import { useState, useRef } from 'react';
import { Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { demoReceipt, summarizeReceipt, parsePurchaseQuantity, receiptSchema, products, getProduct, assessSample, type ReceiptLine, type ReceiptRecord } from '@grocery/core';
import { recordId, useAppState } from '../state/AppState';
import { Page, Back, Title, Body, Status, Card, Heading, Button, Chip, Badge, s } from '../ui/components';
import { AlternativeResults } from '../ui/AlternativeResults';

export default function Receipt() {
  const state = useAppState();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = state.receipts.find(r => r.id === id);
  const [receipt, setReceipt] = useState(() => existing ?? demoReceipt(recordId(), state.profile, new Date().toISOString()));
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [removed, setRemoved] = useState<{ line: ReceiptLine; index: number; draft?: string } | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const savedBase = useRef<ReceiptRecord | null>(existing ?? null);
  const [useCurrentStore, setUseCurrentStore] = useState(false);
  const swapStore = useCurrentStore ? state.store : receipt.retailer;
  const summary = summarizeReceipt(receipt);
  const invalidQuantity = receipt.lines.some(line => parsePurchaseQuantity(quantities[line.id] ?? String(line.quantity)) === null);
  function change(lineId: string, patch: Partial<ReceiptLine>) {
    setMessage(''); setReceipt(r => ({ ...r, lines: r.lines.map(l => l.id === lineId ? { ...l, ...patch } : l) }));
  }
  function remove(line: ReceiptLine, index: number) {
    setRemoved({ line, index, draft: quantities[line.id] });
    setReceipt(r => ({ ...r, lines: r.lines.filter(l => l.id !== line.id) }));
    setMessage('Line removed from this review. Save to update history, or undo below.');
  }
  function undo() {
    if (!removed) return;
    setReceipt(r => ({ ...r, lines: [...r.lines.slice(0, removed.index), removed.line, ...r.lines.slice(removed.index)] }));
    if (removed.draft !== undefined) setQuantities(q => ({ ...q, [removed.line.id]: removed.draft! }));
    setRemoved(null); setMessage('Line restored. Save to update history.');
  }
  async function save() {
    if (saving.current) return;
    if (invalidQuantity) { setMessage('Enter a positive purchase quantity for every line.'); return; }
    const candidate = { ...receipt, lines: receipt.lines.map(line => ({
      ...line, quantity: parsePurchaseQuantity(quantities[line.id] ?? String(line.quantity))!,
    })) };
    const date = candidate.receiptDate ? new Date(candidate.receiptDate + 'T00:00:00Z') : null;
    if (date && (Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== candidate.receiptDate)) { setMessage('Use the printed purchase date as YYYY-MM-DD, or leave it blank.'); return; }
    if (!receiptSchema.safeParse(candidate).success) { setMessage('Check the receipt fields before saving.'); return; }
    saving.current = true; setBusy(true);
    try {
      const ok = await state.saveReceipt(candidate, savedBase.current);
      if (ok) { savedBase.current = candidate; setReceipt(candidate); setQuantities({}); }
      setMessage(ok ? 'Receipt saved. Unresolved items remain visible.' : 'Receipt was not saved. Your edits are still here. If it changed or was deleted elsewhere, reopen it from History; otherwise retry when storage is available.');
    } catch { setMessage('Receipt was not saved. Your edits are still here; please retry.'); }
    finally { saving.current = false; setBusy(false); }
  }
  if (id && !existing) return <Page><Back /><Title>Receipt unavailable</Title><Body>This receipt has been deleted.</Body></Page>;
  return <Page><Back /><Title eyebrow="SAMPLE RECEIPT REVIEW">See your basket clearly.</Title>
    <Button label="Read and match receipt items" onPress={()=>router.push({pathname:'/food-review',params:{kind:'receipt'}})}/><Button secondary label="Read a fictional receipt image" onPress={() => router.push({ pathname: '/intake', params: { kind: 'receipt' } })} /><Body muted>This invented receipt lets you try matching and review. The fictional input reader can generate a receipt image; personal photos remain disabled.</Body>
    <Card><Heading>Purchase context</Heading>
      <TextInput accessibilityLabel="Receipt retailer" editable={!busy} value={receipt.retailer} onChangeText={retailer => setReceipt(r => ({ ...r, retailer }))} style={s.body} />
      <TextInput accessibilityLabel="Receipt date" placeholder="YYYY-MM-DD or leave blank" editable={!busy} value={receipt.receiptDate??''} onChangeText={receiptDate=>setReceipt(r=>({...r,receiptDate:receiptDate||null}))} style={s.body}/><Body>Purchase amounts are not portions eaten.</Body>
    </Card>
    <Card><Heading>Basket overview</Heading>
      <Body>{summary.state === 'no-food' ? 'No food purchases found. Non-food and refund lines remain in the review.'
        : summary.state === 'partial' ? 'Partially matched basket. Unresolved lines are excluded from food assessments.'
        : 'All food lines have sample matches. Matching does not establish complete nutrition evidence.'}</Body>
      <Body>{summary.matched} of {summary.food} food lines matched · {summary.unresolved} unresolved · {summary.excluded} excluded</Body>
      {summary.matched > 0 && <Body>{Object.entries(summary.labels).filter(([, count]) => count > 0).map(([label, count]) => `${count} ${label.toLowerCase()}`).join(' · ')}</Body>}
      <Text style={s.small}>Illustrative results for matched lines at 1× label portion, using the profile saved with this receipt. This is not an overall basket health score.</Text>
      {summary.refunds > 0 && <Body>{summary.refunds} refund line(s) excluded. Returns are not subtracted from other purchases because the original transaction is unconfirmed.</Body>}
      {summary.weighted > 0 && <Body>{summary.weighted} food line(s) sold by weight. Weights are preserved as purchase amounts, never treated as portions eaten.</Body>}
      {summary.duplicateLineIds.length > 0 && <Body>{summary.duplicateLineIds.length} potentially repeated lines need review. Both remain counted until you remove an incorrect duplicate.</Body>}
      <View pointerEvents={busy ? 'none' : 'auto'} style={{ gap: 8 }}>
        <Chip disabled={busy} label={`Use receipt retailer: ${receipt.retailer}`} selected={!useCurrentStore} onPress={() => setUseCurrentStore(false)} />
        <Chip disabled={busy} label={`Use current shopping retailer: ${state.store}`} selected={useCurrentStore} onPress={() => setUseCurrentStore(true)} />
      </View>
      <Body muted>Nearby branch origin is not configured. These are sample retailer listings.</Body>
    </Card>
    {removed && <Card><Body>Removed: {removed.line.text}</Body><Button secondary disabled={busy} label="Undo last line removal" onPress={undo} /></Card>}
    {receipt.lines.map((line, index) => {
      const product = line.kind === 'food' && line.productId ? getProduct(line.productId) : undefined;
      const assessment = product ? assessSample(product, receipt.profile, 1) : null;
      const quantity = quantities[line.id] ?? String(line.quantity);
      return <View key={line.id} pointerEvents={busy ? 'none' : 'auto'}><Card>
        {summary.duplicateLineIds.includes(line.id) && <Body>Possible duplicate: verify whether this is another purchase or an extraction duplicate.</Body>}
        <Heading>{line.text}</Heading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['food', 'non-food', 'refund', 'discount', 'tax', 'unknown'] as const).map(kind => <Chip disabled={busy} key={kind} label={kind} accessibilityLabel={`${line.text}: ${kind}`} selected={line.kind === kind} onPress={() => change(line.id, { kind })} />)}
        </View>
        {['food', 'unknown'].includes(line.kind) && <><Text style={s.small}>Confirm the product match</Text>
          {products.map(p => <Chip disabled={busy} key={p.id} label={p.name} selected={line.productId === p.id} onPress={() => change(line.id, { productId: p.id, kind: 'food' })} />)}
          <Chip disabled={busy} label="Unresolved product" selected={!line.productId || !getProduct(line.productId)} onPress={() => change(line.id, { productId: null })} />
        </>}
        <Text style={s.small}>Purchase quantity ({line.unit})</Text>
        <TextInput accessibilityLabel={`Quantity for ${line.text}`} editable={!busy} keyboardType="decimal-pad" value={quantity} onChangeText={value => { setQuantities(q => ({ ...q, [line.id]: value })); setMessage(''); }} style={s.body} />
        {parsePurchaseQuantity(quantity) === null && <Text accessibilityRole="alert" style={s.small}>Enter a number greater than zero, such as 1 or 0.5.</Text>}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['item', 'lb', 'kg'] as const).map(unit => <Chip disabled={busy} key={unit} label={unit} accessibilityLabel={`${line.text}: ${unit}`} selected={line.unit === unit} onPress={() => change(line.id, { unit })} />)}
        </View>
        <Button secondary disabled={busy} label={`Remove line: ${line.text}`} onPress={() => remove(line, index)} />
        {product && assessment && <><Badge label={assessment.label} /><Body>{assessment.reason}</Body>
          <Text style={s.small}>Sample assessment assumes 1× label portion. Receipt weight does not establish consumption.</Text>
          <AlternativeResults original={product} profile={receipt.profile} store={swapStore} />
        </>}
      </Card></View>;
    })}
    {!!message && <Status>{message}</Status>}
    <Button label={busy ? 'Saving…' : 'Save reviewed receipt'} disabled={busy || invalidQuantity} onPress={() => void save()} />
    <Button secondary label="History" onPress={() => router.push('/history')} />
  </Page>;
}
