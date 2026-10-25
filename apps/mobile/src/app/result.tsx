import { useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Text, View } from 'react-native';
import { assessSample, healthFocuses, getProduct, type Product } from '@grocery/core';
import { useAppState } from '../state/AppState';
import { Back, Badge, Body, Button, Card, FoodArt, Heading, Page, Title, s } from '../ui/components';
import { colors as c } from '../ui/theme';
import { storageDescription } from '../storage/repository';
import { AlternativeResults } from '../ui/AlternativeResults';

const fields: { key: keyof Product['nutrients']; label: string; unit: string }[] = [
  { key: 'calories', label: 'Energy', unit: 'kcal' }, { key: 'saturatedFat', label: 'Saturated fat', unit: 'g' },
  { key: 'fiber', label: 'Fiber', unit: 'g' }, { key: 'sodium', label: 'Sodium', unit: 'mg' }, { key: 'sugars', label: 'Total sugars', unit: 'g' },
];
export default function Result() {
  const { id, saved } = useLocalSearchParams<{ id: string; saved?: string }>();
  const state = useAppState();
  const existing = saved ? state.scans.find(scan => scan.id === saved) : undefined;
  const product = existing?.product ?? getProduct(id);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | undefined>(saved);
  if (!product || (saved && !existing)) return <Page><Back /><Title>Result unavailable</Title><Body>This preview result is no longer in memory. Take a new product photo.</Body><Button label="Scan Your Product" onPress={() => router.replace('/capture')} /></Page>;
  const assessment = existing?.assessment ?? assessSample(product, state.profile, 1);
  const amount = assessment.portion;
  return <Page><Back /><Title eyebrow={existing ? 'SAVED SAMPLE RESULT' : 'PRODUCT · STEP 2 OF 2'}>{product.name}</Title><Body muted>{product.variant}</Body><FoodArt kind={product.illustration} />
    <Card><Badge label={assessment.label} /><Heading>{healthFocuses[assessment.primary]}</Heading><Body>{assessment.reason}</Body>{assessment.unknown.length > 0 && <Body>Required dietary evidence is missing.</Body>}{assessment.missing.map(item => <Text key={item} style={s.small}>• {item}</Text>)}<Text style={s.small}>Illustrative assessment · not a clinically reviewed rating</Text></Card>
    <Button secondary label="Food & nutrition guidance" onPress={()=>router.push('/nutrition-guidance')} />
    <AlternativeResults original={product} profile={state.profile} store={state.store} />
    {existing && <Text style={s.small}>Alternatives use your current sample needs; the saved assessment above keeps its original context.</Text>}
    <Card style={{ padding: 16, gap: 9 }}><Text accessibilityRole="header" style={s.rowTitle}>Nutrition at a glance</Text><Text style={[s.small, { fontSize: 12 }]}>{existing ? 'Saved basis:' : 'Assumes'} {amount}× portion · {product.serving}{product.form === 'fresh' ? ' · estimated' : ''}</Text>{fields.map(field => <View key={field.key} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingBottom: 6, borderBottomWidth: 1, borderColor: c.line }}><Text style={s.small}>{field.label}</Text><Text style={[s.small, { fontWeight: '700', color: c.ink }]}>{product.nutrients[field.key] === null ? 'Unknown' : `${Number((product.nutrients[field.key]! * amount).toFixed(2))} ${field.unit}`}</Text></View>)}<Text style={[s.small, { fontSize: 12 }]}>Synthetic label facts.</Text></Card>
    <Button secondary label={expanded ? 'Hide the details' : 'Why this result?'} icon={expanded ? 'minus' : 'plus'} onPress={() => setExpanded(!expanded)} />
    {expanded && <Card style={{ padding: 16, gap: 8 }}><Text accessibilityRole="header" style={s.rowTitle}>Ingredients & evidence</Text><Text style={s.small}>{product.ingredients ?? 'Ingredients are missing. The full workflow will request an ingredient-label photo.'}</Text><Text style={[s.small, { fontSize: 12 }]}>{product.source.title}. Version {product.source.version}.</Text><Text style={[s.small, { fontSize: 12 }]}>Rule pack: {assessment.ruleVersion}. Invented for interface testing; clinical sources and product evidence will accompany reviewed rules.</Text></Card>}
    {savedId ? <Button secondary label="View history" icon="clock" onPress={() => router.push('/history')} /> : <Button secondary label={saving ? "Saving…" : "Save result"} disabled={saving} icon="bookmark" onPress={async () => { setSaving(true); try { setSavedId(await state.saveScan(product, assessment)); } finally { setSaving(false); } }} />}
    <Body muted>{existing ? 'This snapshot preserves the sample needs and portion used when it was saved.' : storageDescription}</Body>
  </Page>;
}


