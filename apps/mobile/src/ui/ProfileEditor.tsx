import { useState, useRef } from 'react';
import { Text, TextInput, View } from 'react-native';
import { measurementDraft, parseMeasurementDraft, changeMeasurementUnit, WEIGHT_CONTEXT_CONSENT, readiness, conditions, healthFocuses, genders, isCondition, restrictions, profileSchema, type Profile, type Condition, type HealthFocus, type Gender, type Restriction } from '@grocery/core';
import { Body, Status, Button, Card, Chip, Heading, s } from './components';
import { colors } from './theme';

export function ProfileEditor({ initial, onSave, onboarding = false }: { initial: Profile; onSave: (profile: Profile) => Promise<boolean>; onboarding?: boolean }) {
  const [draft, setDraft] = useState(initial);
  const [age, setAge] = useState(onboarding ? '' : String(initial.age));
  const [message, setMessage] = useState('');
  const [measurements, setMeasurements] = useState(() => measurementDraft(initial.bodyMeasurements));
  const [measurementsCurrent, setMeasurementsCurrent] = useState(false);
  const weightAIAvailable = readiness.personalUploads && readiness.clinicalRulesReviewed;
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const update = (patch: Partial<Profile>) => { setMessage(''); setDraft(p => ({ ...p, ...patch })); };
  function toggleCondition(key: Condition) {
    const selected = draft.conditions.includes(key) ? draft.conditions.filter(c => c !== key) : [...draft.conditions, key];
    update({ conditions: selected, primary: draft.primary === key ? selected[0] ?? 'noConcern' : draft.primary === 'noConcern' ? key : draft.primary });
  }
  function chooseFocus(primary: HealthFocus) {
    if (primary === 'noConcern' && draft.conditions.length) { setMessage('Deselect your health concerns above before choosing No Concern. Dietary preferences will stay selected.'); return; }
    update({ primary, conditions: isCondition(primary) && !draft.conditions.includes(primary) ? [...draft.conditions, primary] : draft.conditions });
  }
  async function save() {
    if (saving.current) return;
    let bodyMeasurements;
    try { bodyMeasurements = parseMeasurementDraft(measurements, measurementsCurrent ? undefined : initial.bodyMeasurements); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Check your height and weight.'); return; }
    const parsed = profileSchema.safeParse({ ...draft, age: Number(age), bodyMeasurements, weightContextConsent: bodyMeasurements ? draft.weightContextConsent : undefined });
    if (!parsed.success) { setMessage('Enter an age of 21 or older and choose a primary health focus. No Concern requires no selected health conditions.'); return; }
    saving.current = true; setBusy(true);
    try { setMessage(await onSave(parsed.data) ? 'Your needs are saved.' : 'Could not save. Your changes are still here; please retry.'); }
    catch { setMessage('Could not save. Your changes are still here; please retry.'); }
    finally { saving.current = false; setBusy(false); }
  }
  return <><Card><Heading>Age & context</Heading><Body muted>Your profile is saved on this device. You can choose to share it for product-photo guidance. This beta is for adults aged 21 or older.</Body><TextInput editable={!busy} accessibilityLabel="Age in years" placeholder="Age in years" value={age} onChangeText={setAge} keyboardType="number-pad" style={{ ...s.body, backgroundColor: colors.background, padding: 14, borderRadius: 12 }} /><Text style={s.body}>Gender (optional)</Text>{(Object.entries(genders) as [Gender, string][]).map(([key, label]) => <Chip disabled={busy} key={key} label={label} selected={(draft.gender ?? 'unspecified') === key} onPress={() => update({ gender: key })} />)}<Text style={s.body}>Pregnancy context</Text>{(['not-pregnant', 'pregnant', 'unspecified'] as const).map(value => <Chip disabled={busy} key={value} label={value === 'not-pregnant' ? 'Not pregnant' : value === 'pregnant' ? 'Pregnant' : 'Not specified'} selected={draft.pregnancy === value} onPress={() => update({ pregnancy: value })} />)}</Card>
    <Card><Heading>Height & weight</Heading><Body muted>Optional. Saved privately on this phone; you can change or remove them anytime.</Body>
      <Text style={s.body}>Height</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['in', 'cm'] as const).map(unit => <Chip key={unit} label={unit === 'in' ? 'Feet & inches' : 'Centimeters'} selected={measurements.heightUnit === unit} disabled={busy} onPress={() => { try { setMeasurements(changeMeasurementUnit(measurements, 'height', unit)); setMessage(''); } catch (error) { setMessage((error as Error).message); } }} />)}
      </View><View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput editable={!busy} accessibilityLabel={measurements.heightUnit === 'cm' ? 'Height in centimeters' : 'Height in feet'} placeholder={measurements.heightUnit === 'cm' ? 'Centimeters' : 'Feet'} value={measurements.height} maxLength={16} keyboardType={measurements.heightUnit === 'cm' ? 'decimal-pad' : 'number-pad'} onChangeText={height => { setMeasurements(p => ({ ...p, height })); setMessage(''); }} style={{ ...s.body, flex: 1, backgroundColor: colors.background, padding: 14, borderRadius: 12 }} />
        {measurements.heightUnit === 'in' && <TextInput editable={!busy} accessibilityLabel="Height in inches" placeholder="Inches" value={measurements.inches} maxLength={16} keyboardType="decimal-pad" onChangeText={inches => { setMeasurements(p => ({ ...p, inches })); setMessage(''); }} style={{ ...s.body, flex: 1, backgroundColor: colors.background, padding: 14, borderRadius: 12 }} />}
      </View><Text style={s.body}>Weight</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {(['lb', 'kg'] as const).map(unit => <Chip key={unit} label={unit === 'lb' ? 'Pounds' : 'Kilograms'} selected={measurements.weightUnit === unit} disabled={busy} onPress={() => { try { setMeasurements(changeMeasurementUnit(measurements, 'weight', unit)); setMessage(''); } catch (error) { setMessage((error as Error).message); } }} />)}
      </View><TextInput editable={!busy} accessibilityLabel={measurements.weightUnit === 'kg' ? 'Weight in kilograms' : 'Weight in pounds'} placeholder={measurements.weightUnit === 'kg' ? 'Kilograms' : 'Pounds'} value={measurements.weight} maxLength={16} keyboardType="decimal-pad" onChangeText={weight => { setMeasurements(p => ({ ...p, weight })); setMessage(''); }} style={{ ...s.body, backgroundColor: colors.background, padding: 14, borderRadius: 12 }} />
      {!!initial.bodyMeasurements && <><Body muted>Last checked: {new Date(initial.bodyMeasurements.recordedAt).toLocaleDateString()}</Body><Chip label="These measurements are current" disabled={busy} selected={measurementsCurrent} onPress={() => setMeasurementsCurrent(p => !p)} /></>}
      <Button secondary label="Clear height and weight" disabled={busy} onPress={() => { setMeasurements(p => ({ ...p, height: '', inches: '', weight: '' })); update({ bodyMeasurements: undefined, weightContextConsent: undefined }); }} />
      {weightAIAvailable && <><Body>Optional AI use sends a short weight summary through our server to OpenAI for food comparisons. Exact measurements, your name and location are excluded. OpenAI may retain the summary under its API data policy. This does not enable medical recommendations.</Body><Chip disabled={busy} selected={!!draft.weightContextConsent} label="Use weight context in AI comparisons" onPress={() => update({ weightContextConsent: draft.weightContextConsent ? undefined : { version: WEIGHT_CONTEXT_CONSENT, acceptedAt: new Date().toISOString() } })} /></>}
    </Card>
    <Card><Heading>Health concerns</Heading><Body muted>Select all that apply. You can choose more than one, such as hypertension, diabetes and high cholesterol.</Body>{(Object.entries(conditions) as [Condition, string][]).map(([key, label]) => <Chip disabled={busy} key={key} label={label} selected={draft.conditions.includes(key)} onPress={() => toggleCondition(key)} />)}<Text style={s.eyebrow}>MAIN FOCUS</Text><Body muted>Your main focus helps prioritize explanations. All selected concerns are saved.</Body>{(['generalFitness', 'noConcern', ...draft.conditions] as HealthFocus[]).map(key => [key, healthFocuses[key]] as [HealthFocus, string]).map(([key, label]) => <Chip disabled={busy} key={key} label={'Main focus: '+label} selected={draft.primary === key} onPress={() => chooseFocus(key)} />)}</Card>
    <Card><Heading>Your approach</Heading>{(['prevention', 'management', 'both'] as const).map(value => <Chip disabled={busy} key={value} label={value === 'both' ? 'Prevention and diagnosed conditions' : value === 'prevention' ? 'Prevention goals' : 'Managing diagnosed conditions'} selected={draft.intent === value} onPress={() => update({ intent: value })} />)}</Card>
    <Card><Heading>Dietary preferences</Heading><Body muted>Egg and dairy exclusions are independent. Unverified required certification excludes an alternative.</Body><View style={{ gap: 8 }}>{(Object.entries(restrictions) as [Restriction, string][]).map(([key, label]) => <Chip disabled={busy} key={key} label={label} selected={draft.restrictions.includes(key)} onPress={() => update({ restrictions: draft.restrictions.includes(key) ? draft.restrictions.filter(r => r !== key) : [...draft.restrictions, key] })} />)}</View></Card>
    <Card><Heading>Eating & food preferences</Heading><Body muted>Optional. Describe eating patterns, foods you enjoy or foods you prefer to avoid. Do not include identifying details.</Body><TextInput accessibilityLabel="Eating preferences" placeholder="For example, mostly plant-based" value={draft.eatingPreferences??''} maxLength={300} editable={!busy} onChangeText={eatingPreferences=>update({eatingPreferences})} style={s.body}/><TextInput accessibilityLabel="Food preferences" placeholder="For example, unsweetened cereal" value={draft.foodPreferences??''} maxLength={300} editable={!busy} onChangeText={foodPreferences=>update({foodPreferences})} style={s.body}/></Card>
    {!!message && <Status>{message}</Status>}<Button label={busy ? 'Saving…' : onboarding ? 'Save and start exploring' : 'Save my needs'} disabled={busy} onPress={() => void save()} /></>;
}
