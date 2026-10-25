import {preferenceText} from './preferenceText.ts';
import {bodyMeasurementsSchema,weightConsentSchema,withoutBodyMeasurements} from './weightContext.ts';
import {localFoodReviewSchema} from './localFoodInput.ts';
import { REAL_REPORT_CONSENT_VERSION, realReportImportSchema, realReportMeasurementSchema } from './realReportEvidence.ts';
import type {StoreDirectoryCache} from './storeDetection.ts';
import type {PublicFoodCache} from './catalogClient.ts';
import type { RuleTrustRepository } from './ruleStore.ts';
import { z } from 'zod';
import { conditions, healthFocuses, genders, hasValidHealthFocus, restrictions, type Profile } from './types.ts';
import { sampleProfile, getProduct } from './fixtures.ts';

const short = z.string().max(500);
const id = z.string().min(1).max(100);
const number = z.number().finite().nonnegative();
const condition = z.enum(Object.keys(conditions) as [keyof typeof conditions, ...(keyof typeof conditions)[]]);
const focus = z.enum(Object.keys(healthFocuses) as [keyof typeof healthFocuses, ...(keyof typeof healthFocuses)[]]);
const gender = z.enum(Object.keys(genders) as [keyof typeof genders, ...(keyof typeof genders)[]]);
const restriction = z.enum(Object.keys(restrictions) as [keyof typeof restrictions, ...(keyof typeof restrictions)[]]);
const compliance = z.enum(['verified', 'conflict', 'unverified']);
export const profileSchema = z.object({
  eatingPreferences: preferenceText.optional(), foodPreferences: preferenceText.optional(),
  bodyMeasurements: bodyMeasurementsSchema.optional(), weightContextConsent: weightConsentSchema.optional(),
  revision: z.number().int().positive(), age: z.number().int().min(21),
  gender: gender.optional(), pregnancy: z.enum(['pregnant', 'not-pregnant', 'unspecified']), primary: focus,
  conditions: z.array(condition).max(8), intent: z.enum(['prevention', 'management', 'both']),
  restrictions: z.array(restriction).max(6),
}).strict().refine(hasValidHealthFocus, 'Select a matching primary focus; No Concern requires no selected health conditions');
const productSchema = z.object({
  id, name: short, variant: short, category: short, form: z.enum(['packaged', 'fresh']), serving: short,
  servingGrams: number.positive().nullable(), ingredients: z.string().max(10000).nullable(),
  nutrients: z.object({ calories: number.nullable(), fiber: number.nullable(), saturatedFat: number.nullable(), sodium: number.nullable(), sugars: number.nullable() }).strict(),
  compliance: z.object({ vegetarian: compliance, eggFree: compliance, dairyFree: compliance, halal: compliance, kosher: compliance, glutenFree: compliance }).strict(),
  retailers: z.array(short).max(50), source: z.object({ id, title: short, version: short, synthetic: z.literal(true) }).strict(),
  illustration: z.enum(['oats', 'granola', 'apple']), fixtureRating: z.enum(['Good fit', 'Neutral', 'Limit', 'Poor fit']).nullable(),
}).strict();
const assessmentSchema = z.object({
  productId: id, label: z.enum(['Good fit', 'Neutral', 'Limit', 'Poor fit', 'Restriction conflict', 'Insufficient information']),
  reason: short, conflicts: z.array(restriction).max(6), unknown: z.array(restriction).max(6), missing: z.array(short).max(30),
  primary: focus, profileRevision: z.number().int().positive(), portion: number.positive(),
  ruleVersion: z.literal('synthetic-ui-1'), synthetic: z.literal(true), contextNotes: z.array(short).max(30),
}).strict();
export const receiptLineSchema = z.object({ id, text: short, kind: z.enum(['food', 'non-food', 'refund', 'discount', 'tax', 'unknown']), productId: id.nullable(), quantity: number.positive(), unit: z.enum(['item', 'lb', 'kg']) }).strict();
export const receiptSchema = z.object({ id, kind: z.literal('receipt'), createdAt: z.string().datetime(), receiptDate: z.string().nullable(), retailer: short, lines: z.array(receiptLineSchema).max(300), synthetic: z.literal(true), profile: profileSchema }).strict().refine(r => new Set(r.lines.map(l => l.id)).size === r.lines.length, 'Duplicate receipt line IDs');
export type ReceiptRecord = z.infer<typeof receiptSchema>;
export type ReceiptLine = z.infer<typeof receiptLineSchema>;
export const measurementSchema = z.object({
  analyte: z.enum(['total', 'ldl', 'hdl', 'triglycerides', 'apob', 'lpa']), rawValue: z.string().regex(/^\d+(\.\d+)?$/).max(20),
  unit: z.enum(['mg/dL', 'mmol/L', 'nmol/L', 'g/L']), comparator: z.enum(['<', '>', '=']),
  printedRange: short.nullable().optional(), printedFlag: short.nullable().optional(), sourcePage: z.number().int().min(1).max(10).optional(),
}).strict().refine(m => m.analyte === 'lpa' || m.unit !== 'nmol/L', 'nmol/L is supported only for Lp(a)')
  .refine(m => m.analyte === 'apob' ? ['mg/dL', 'g/L'].includes(m.unit) : m.unit !== 'g/L', 'Unsupported analyte units')
  .refine(m => m.analyte !== 'lpa' || m.unit !== 'mmol/L', 'Lp(a) requires mass or particle units');
const syntheticPanelSchema = z.object({
  id, kind: z.literal('report'), testDate: z.string().nullable(), importedAt: z.string().datetime(), confirmed: z.boolean(),
  revision: z.number().int().positive().max(1000000).optional(), correctedAt: z.string().datetime().optional(),
  measurements: z.array(measurementSchema).min(1).max(6), fingerprint: id, synthetic: z.literal(true),
  status: z.enum(['needs-confirmation', 'ready', 'in-flight', 'outcome-unknown', 'save-pending', 'completed', 'failed']),
  analysis: z.string().max(5000).nullable(),
}).strict().refine(p => new Set(p.measurements.map(m => m.analyte)).size === p.measurements.length, 'Duplicate measurement')
  .refine(p => p.status !== 'completed' || (p.confirmed && p.analysis !== null && p.analysis.trim().length > 0), 'Incomplete successful result');
const realPanelSchema = z.object({
 id: z.string().uuid(), kind: z.literal('report'), testDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value + 'T00:00:00Z'); return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
 }), importedAt: z.string().datetime(), confirmed: z.literal(true),
 revision: z.number().int().positive().max(1000000).optional(), correctedAt: z.string().datetime().optional(),
 fingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/), synthetic: z.literal(false),
 status: z.literal('ready'), analysis: z.null(),
 measurements: z.array(realReportMeasurementSchema).min(1).max(6),
}).strict().refine(value => new Set(value.measurements.map(item => item.analyte)).size === value.measurements.length, 'Duplicate analyte');
export const panelSchema = z.union([syntheticPanelSchema, realPanelSchema]);
export type PanelRecord = z.infer<typeof panelSchema>;
export const snapshotSchema = z.object({
  version: z.literal(2), onboardingComplete: z.boolean(), profile: profileSchema,
  searchArea: z.string().max(200).optional(), autoStoreDetection:z.boolean().optional(),
  store: short, radius: z.number().min(1).max(100),
  scans: z.array(z.object({ id, kind: z.literal('product'), createdAt: z.string().datetime(), product: productSchema, assessment: assessmentSchema, profile: profileSchema }).strict()).max(5000),
  receipts: z.array(receiptSchema).max(1000), panels: z.array(panelSchema).max(1000),
  panelChoice: z.object({ selectedId: id, candidates: z.string().min(1).max(200000) }).strict().optional(),
  betaConsent: z.object({ version: z.literal(REAL_REPORT_CONSENT_VERSION), acceptedAt: z.string().datetime() }).strict().optional(),
  reportImports: z.array(realReportImportSchema).max(1000).optional(),
  foodReviews:z.array(localFoodReviewSchema).max(250).optional(),
  newsPersonalization:z.boolean().optional(),
}).strict();
export type BetaSnapshot = z.infer<typeof snapshotSchema>;
/** Remove current measurements and copies in saved in-app profiles; exported archives are separate. */
export function clearBodyMeasurements(snapshot:BetaSnapshot):BetaSnapshot{
 return {...snapshot,profile:{...withoutBodyMeasurements(snapshot.profile),revision:snapshot.profile.revision+1},
  scans:snapshot.scans.map(scan=>({...scan,profile:withoutBodyMeasurements(scan.profile)})),
  receipts:snapshot.receipts.map(receipt=>({...receipt,profile:withoutBodyMeasurements(receipt.profile)}))};
}
export function newSnapshot(): BetaSnapshot {
  return { version: 2, onboardingComplete: false, profile: JSON.parse(JSON.stringify(sampleProfile)) as Profile, store: 'Wegmans', radius: 10, scans: [], receipts: [], panels: [] };
}
export function parseSnapshot(value: unknown): BetaSnapshot {
  const result = snapshotSchema.parse(value);
  const ids = [...result.scans, ...result.receipts, ...result.panels,...(result.foodReviews??[])].map(r => r.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate saved record IDs.');
  const fingerprints = result.reportImports?.map(item => item.fingerprint) ?? [];
  if (new Set(fingerprints).size !== fingerprints.length) throw new Error('Duplicate report import fingerprints.');
  return result;
}
export function recoverSnapshot(value: unknown): BetaSnapshot {
  const result = parseSnapshot(value);
  return { ...result, panels: result.panels.map(p => p.synthetic && p.status === 'in-flight' ? { ...p, status: 'outcome-unknown' } : p),
    ...(result.reportImports ? { reportImports: result.reportImports.map(item => item.status === 'in-flight' ? { ...item, status: 'outcome-unknown' as const } : item) } : {}) };
}
export function receiptCoverage(lines: ReceiptLine[]) {
  const purchased = lines.filter(l => l.kind === 'food');
  return { food: purchased.length, matched: purchased.filter(l => l.productId !== null && getProduct(l.productId)).length,
    unresolved: lines.filter(l => l.kind === 'unknown' || (l.kind === 'food' && (l.productId === null || !getProduct(l.productId)))).length,
    excluded: lines.filter(l => !['food', 'unknown'].includes(l.kind)).length };
}
export function demoReceipt(idValue: string, profile: Profile, now: string): ReceiptRecord {
  return { id: idValue, kind: 'receipt', createdAt: now, receiptDate: '2026-09-28', retailer: 'Wegmans', synthetic: true, profile,
    lines: [
      { id: 'line-1', text: 'MAPLE ALMD GRAN', kind: 'food', productId: 'sample-granola', quantity: 1, unit: 'item' },
      { id: 'line-2', text: 'APPLES', kind: 'food', productId: 'sample-apple', quantity: 1.2, unit: 'lb' },
      { id: 'line-3', text: 'OAT BRKFST', kind: 'unknown', productId: null, quantity: 1, unit: 'item' },
      { id: 'line-4', text: 'PAPER TOWELS', kind: 'non-food', productId: null, quantity: 1, unit: 'item' },
      { id: 'line-5', text: 'RETURN GRANOLA', kind: 'refund', productId: 'sample-granola', quantity: 1, unit: 'item' },
    ] };
}
export function demoPanel(idValue: string, now: string): Extract<PanelRecord, { synthetic: true }> {
  return { id: idValue, kind: 'report', testDate: '2026-09-20', importedAt: now, confirmed: false,
    fingerprint: 'synthetic-report-september-2026-v1', synthetic: true, status: 'needs-confirmation', analysis: null,
    measurements: [
      { analyte: 'total', rawValue: '210', unit: 'mg/dL', comparator: '=' },
      { analyte: 'ldl', rawValue: '128', unit: 'mg/dL', comparator: '=' },
      { analyte: 'hdl', rawValue: '54', unit: 'mg/dL', comparator: '=' },
      { analyte: 'triglycerides', rawValue: '140', unit: 'mg/dL', comparator: '=' },
      { analyte: 'apob', rawValue: '98', unit: 'mg/dL', comparator: '=' },
      { analyte: 'lpa', rawValue: '32', unit: 'nmol/L', comparator: '=' },
    ] };
}
export const analyteNames = { total: 'Total cholesterol', ldl: 'LDL-C', hdl: 'HDL-C', triglycerides: 'Triglycerides', apob: 'ApoB', lpa: 'Lp(a)' };
export interface BetaRepository { storeDirectory?: StoreDirectoryCache; publicFoods?: PublicFoodCache; ruleTrust?: RuleTrustRepository; read(): Promise<BetaSnapshot | null>; write(snapshot: BetaSnapshot): Promise<void>; clear(): Promise<void> }


