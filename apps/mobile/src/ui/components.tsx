import React, { type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle, type ColorValue } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { colors as c } from './theme';
import type { AssessmentLabel, Product } from '@grocery/core';

export type IconName = React.ComponentProps<typeof Feather>['name'];
export function Icon({ name, size = 20, color = c.ink }: { name: IconName; size?: number; color?: ColorValue }) {
  return <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Feather name={name} size={size} color={color} accessible={false} /></View>;
}
export function Page({ children }: { children: ReactNode }) {
  return <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled"><View style={s.content}>{children}</View></ScrollView>;
}
export function Title({ children, eyebrow }: { children: ReactNode; eyebrow?: string }) {
  return <View style={{ gap: 8 }}>{eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}<Text accessibilityRole="header" style={s.title}>{children}</Text></View>;
}
export function Body({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return <Text style={[s.body, muted && { color: c.muted }]}>{children}</Text>;
}
export function Status({ children }: { children: ReactNode }) {
  return <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={s.body}>{children}</Text>;
}
export function Heading({ children }: { children: ReactNode }) { return <Text accessibilityRole="header" style={s.heading}>{children}</Text>; }
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) { return <View style={[s.card, style]}>{children}</View>; }
export function Button({ label, onPress, icon, secondary = false, disabled = false }: { label: string; onPress: () => void; icon?: IconName; secondary?: boolean; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, pressed && { opacity: 0.8 }, disabled && { opacity: 0.5 }]}>
    {icon && <Icon name={icon} color={secondary ? c.green : '#FFFFFF'} />}<Text style={[s.buttonText, secondary && { color: c.green }]}>{label}</Text>
  </Pressable>;
}
export function Row({ title, detail, icon, onPress }: { title: string; detail?: string; icon: IconName; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.row, pressed && { backgroundColor: c.sage }]}>
    <View style={s.iconBox}><Icon name={icon} /></View><View style={{ flex: 1, gap: 5 }}><Text style={s.rowTitle}>{title}</Text>{detail && <Text style={s.small}>{detail}</Text>}</View><Icon name="chevron-right" size={18} />
  </Pressable>;
}
export function Chip({ label, selected, onPress, accessibilityLabel, disabled = false }: { label: string; selected: boolean; onPress: () => void; accessibilityLabel?: string; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} accessibilityRole="checkbox" accessibilityLabel={accessibilityLabel ?? label} aria-checked={selected} accessibilityState={{ checked: selected, disabled }} style={[s.chip, selected && { backgroundColor: c.green, borderColor: c.green }, disabled && { opacity: 0.5 }]}><Text style={[s.chipText, selected && { color: '#FFFFFF' }]}>{selected ? '✓  ' : ''}{label}</Text></Pressable>;
}
export function Badge({ label }: { label: AssessmentLabel }) {
  const good = label === 'Good fit'; const bad = label === 'Restriction conflict' || label === 'Poor fit';
  const color = good ? c.green : bad ? c.red : c.amber;
  return <View style={[s.badge, { backgroundColor: good ? c.sage : bad ? c.redBg : c.amberBg }]}><Icon name={good ? 'check-circle' : bad ? 'x-circle' : 'info'} size={16} color={color} /><Text style={{ color, fontSize: 14, fontWeight: '700' }}>{label}</Text></View>;
}
export function Back({ label = 'Back' }: { label?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} style={s.back} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}><Icon name="arrow-left" /><Text style={{ color: c.ink, fontWeight: '600' }}>{label}</Text></Pressable>;
}
export function SampleNotice() { return <View style={s.notice}><Icon name="info" size={14} color={c.muted} /><Text style={s.noticeText}>Beta preview</Text></View>; }

export function FoodArt({ kind = 'oats', small = false }: { kind?: Product['illustration']; small?: boolean }) {
  if (kind === 'apple') return <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.art, small && s.artSmall]}><View style={s.leaf} /><View style={s.apple} /></View>;
  return <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.art, small && s.artSmall]}>
    <View style={[s.package, kind === 'granola' && { backgroundColor: '#FFC46F' }, small && { transform: [{ rotate: '-7deg' }, { scale: 0.63 }] }]}><View style={s.packageTop} /><Text style={s.packageKicker}>THE PANTRY</Text><Text style={s.packageTitle}>{kind === 'granola' ? 'maple\ncrunch' : 'whole\ngrain oats'}</Text><View style={s.grainLine}><View style={s.grain} /><View style={[s.grain, { transform: [{ rotate: '35deg' }] }]} /><View style={s.grain} /></View><Text style={s.packageBottom}>SAMPLE PACKAGE</Text></View>
  </View>;
}
export const s = StyleSheet.create({
  page: { flexGrow: 1, backgroundColor: c.background, padding: 24, paddingBottom: 36 },
  content: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: 24 },
  title: { fontSize: 34, lineHeight: 41, letterSpacing: -1.1, color: c.ink, fontWeight: '700' },
  eyebrow: { color: c.green, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  heading: { fontSize: 20, lineHeight: 27, color: c.ink, fontWeight: '700', letterSpacing: -0.4 },
  body: { fontSize: 15, lineHeight: 23, color: c.ink },
  small: { fontSize: 13, lineHeight: 20, color: c.muted },
  card: { backgroundColor: c.surface, borderRadius: 22, padding: 22, gap: 16, borderColor: c.line, borderWidth: 1 },
  button: { minHeight: 54, paddingHorizontal: 22, paddingVertical: 15, borderRadius: 16, backgroundColor: c.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  secondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.line },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15, flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, minHeight: 70 },
  rowTitle: { fontSize: 16, fontWeight: '600', color: c.ink },
  iconBox: { width: 44, height: 44, backgroundColor: c.sage, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  chip: { borderWidth: 1, borderColor: c.line, borderRadius: 14, minHeight: 46, paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center', backgroundColor: c.surface },
  chipText: { color: c.ink, fontSize: 14, fontWeight: '500' },
  badge: { flexDirection: 'row', gap: 7, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 10, alignSelf: 'flex-start', alignItems: 'center' },
  back: { minHeight: 44, flexDirection: 'row', gap: 10, alignItems: 'center', alignSelf: 'flex-start' },
  notice: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#ECEEE6', flexDirection: 'row', justifyContent: 'center', gap: 7, alignItems: 'center' },
  noticeText: { color: c.muted, fontSize: 11, lineHeight: 17, letterSpacing: 0.3 },
  art: { height: 210, alignItems: 'center', justifyContent: 'center', backgroundColor: c.sand, borderRadius: 20, overflow: 'hidden' },
  artSmall: { width: 90, height: 115 },
  package: { width: 105, height: 157, backgroundColor: '#88D8AE', borderRadius: 6, alignItems: 'center', transform: [{ rotate: '-7deg' }], borderWidth: 1, borderColor: c.green },
  packageTop: { width: '100%', height: 12, backgroundColor: c.green, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  packageKicker: { fontSize: 7, color: c.ink, letterSpacing: 1.2, marginTop: 13, fontWeight: '700' },
  packageTitle: { fontSize: 19, lineHeight: 20, fontWeight: '800', color: c.ink, textAlign: 'center', marginTop: 9 },
  packageBottom: { fontSize: 5, color: c.ink, letterSpacing: 1, marginTop: 8 },
  grainLine: { flexDirection: 'row', gap: 4, marginTop: 11 },
  grain: { width: 8, height: 15, borderRadius: 7, backgroundColor: '#F9F0D0', transform: [{ rotate: '-30deg' }] },
  apple: { width: 100, height: 92, borderRadius: 43, backgroundColor: '#B97458', transform: [{ rotate: '-8deg' }] },
  leaf: { width: 33, height: 16, borderRadius: 14, backgroundColor: '#52704A', transform: [{ rotate: '-30deg' }], marginLeft: 24 },
});

