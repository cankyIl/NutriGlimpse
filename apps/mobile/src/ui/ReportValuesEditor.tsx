import { Text, TextInput, View } from 'react-native';
import { analyteNames, type LipidEvidence } from '@grocery/core';
import { Card, Heading, Body, Chip, Button, s } from './components';
import { colors } from './theme';
export type ReportValues = Pick<LipidEvidence, 'testDate' | 'measurements'>;
export function ReportValuesEditor({ value, onChange, disabled = false }: { value: ReportValues; onChange?: (next: ReportValues) => void; disabled?: boolean }) {
  const editable = !!onChange && !disabled;
  return <Card><Heading>{onChange ? 'Check against your original report' : 'Confirmed report values'}</Heading>
    <Body muted>Use the printed test or collection date. Leave missing tests out. Check every number, unit and comparison sign before confirming.</Body>
    <Text style={s.small}>Test date · YYYY-MM-DD</Text><TextInput accessibilityLabel="Report test date" value={value.testDate ?? ''} editable={editable} maxLength={10} placeholder="YYYY-MM-DD" autoCorrect={false} onChangeText={testDate => onChange?.({ ...value, testDate })} style={{ ...s.body, backgroundColor: colors.background, borderRadius: 10, padding: 12 }} />
    {value.measurements.map((m, i) => {
      const change = (patch: Partial<typeof m>) => onChange?.({ ...value, measurements: value.measurements.map((v, j) => i === j ? { ...v, ...patch } : v) });
      return <Card key={m.analyte}><Heading>{analyteNames[m.analyte]}</Heading>
        <TextInput accessibilityLabel={analyteNames[m.analyte] + ' value'} value={m.rawValue} editable={editable} maxLength={12} keyboardType="decimal-pad" onChangeText={rawValue => change({ rawValue })} style={{ ...s.body, backgroundColor: colors.background, borderRadius: 10, padding: 12 }} />
        {onChange ? <><Text style={s.small}>Comparison printed on the report</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(['<', '=', '>'] as const).map(comparator => <Chip key={comparator} label={comparator} accessibilityLabel={analyteNames[m.analyte] + ' comparison ' + comparator} disabled={!editable} selected={m.comparator === comparator} onPress={() => change({ comparator })} />)}</View>
          <Text style={s.small}>Printed unit</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{(['mg/dL', 'mmol/L', 'nmol/L', 'g/L'] as const).filter(unit => m.analyte === 'lpa' ? ['mg/dL', 'nmol/L'].includes(unit) : m.analyte === 'apob' ? ['mg/dL', 'g/L'].includes(unit) : ['mg/dL', 'mmol/L'].includes(unit)).map(unit => <Chip key={unit} label={unit} accessibilityLabel={analyteNames[m.analyte] + ' unit ' + unit} selected={m.unit === unit} disabled={!editable} onPress={() => change({ unit })} />)}</View>
          <Button secondary label={'Remove ' + analyteNames[m.analyte]} disabled={!editable} onPress={() => onChange?.({ ...value, measurements: value.measurements.filter((_, j) => i !== j) })} />
        </> : <Body>{m.comparator} {m.rawValue} {m.unit}</Body>}
        {onChange ? <><Text style={s.small}>Page number in your original report</Text><TextInput accessibilityLabel={analyteNames[m.analyte] + ' source page'} value={m.sourcePage ? String(m.sourcePage) : ''} editable={editable} maxLength={2} keyboardType="number-pad" placeholder="1–10" onChangeText={text => change({ sourcePage: /^\d{1,2}$/.test(text) ? Number(text) : 0 })} style={{ ...s.body, backgroundColor: colors.background, borderRadius: 10, padding: 12 }} /></> : <Text style={s.small}>Source page {m.sourcePage}</Text>}
      </Card>;
    })}
    {onChange && <><Body muted>If a test appears in your source but was missed, add it here and enter its printed value. Do not enter a name or other identifying information.</Body>
      <View style={{ gap: 8 }}>{(Object.keys(analyteNames) as (keyof typeof analyteNames)[]).filter(analyte => !value.measurements.some(m => m.analyte === analyte)).map(analyte => <Button key={analyte} secondary disabled={!editable} label={'Add missing ' + analyteNames[analyte]} onPress={() => onChange?.({ ...value, measurements: [...value.measurements, { analyte, rawValue: '', comparator: '=', unit: 'mg/dL', sourcePage: 0 }] })} />)}</View>
    </>}
    <Text style={s.small}>No unit conversion or diagnosis is performed. Report values influence only comparisons supported by the available food facts.</Text>
  </Card>;
}
