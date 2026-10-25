import { z } from 'zod';
import { ocrPagesSchema, type OcrPage } from './inputPrivacy.ts';

export const REAL_REPORT_CONSENT_VERSION = 'beta-report-ai-2026-10-14.1' as const;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
 const date = new Date(value + 'T00:00:00Z');
 return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, 'Invalid printed test date');
export const realReportMeasurementSchema = z.object({
 analyte: z.enum(['total', 'ldl', 'hdl', 'triglycerides', 'apob', 'lpa']),
 rawValue: z.string().regex(/^\d{1,4}(?:\.\d{1,4})?$/),
 unit: z.enum(['mg/dL', 'mmol/L', 'nmol/L', 'g/L']),
 comparator: z.enum(['=', '<', '>']), sourcePage: z.number().int().min(1).max(10),
}).strict().refine(value => value.analyte === 'lpa' ? ['mg/dL', 'nmol/L'].includes(value.unit) :
 value.analyte === 'apob' ? ['mg/dL', 'g/L'].includes(value.unit) : ['mg/dL', 'mmol/L'].includes(value.unit), 'Unsupported analyte units');
export const realReportEvidenceSchema = z.object({
 schemaVersion: z.literal(1), testDate: isoDate.nullable(),
 measurements: z.array(realReportMeasurementSchema).min(1).max(6),
 issues: z.array(z.enum(['date-missing', 'date-ambiguous', 'value-illegible', 'unit-ambiguous', 'partial-source'])).max(5),
}).strict().superRefine((value, context) => {
 if (new Set(value.measurements.map(item => item.analyte)).size !== value.measurements.length) context.addIssue({ code: 'custom', message: 'Duplicate analyte' });
 if (new Set(value.issues).size !== value.issues.length) context.addIssue({ code: 'custom', message: 'Duplicate issue' });
 const missing = value.issues.includes('date-missing'), ambiguous = value.issues.includes('date-ambiguous');
 if (missing && ambiguous || (value.testDate === null ? !missing && !ambiguous : missing || ambiguous)) context.addIssue({ code: 'custom', message: 'Date evidence and issues disagree' });
});
export type LipidEvidence = z.infer<typeof realReportEvidenceSchema>;
export const realReportImportSchema = z.object({
 fingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/),
 status: z.enum(['in-flight', 'outcome-unknown', 'failed', 'completed']),
 createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
 evidence: realReportEvidenceSchema, result: realReportEvidenceSchema.nullable(),
}).strict().superRefine((value, context) => {
 if ((value.status === 'completed') !== (value.result !== null)) context.addIssue({ code: 'custom', message: 'Incomplete extraction journal result' });
 if (value.result && canonicalEvidence(value.evidence) !== canonicalEvidence(value.result)) context.addIssue({ code: 'custom', message: 'Extraction journal evidence changed' });
});
export type RealReportImport = z.infer<typeof realReportImportSchema>;

function canonicalEvidence(evidence: LipidEvidence): string {
 return JSON.stringify({ schemaVersion: evidence.schemaVersion, testDate: evidence.testDate,
  measurements: [...evidence.measurements].sort((a, b) => a.analyte.localeCompare(b.analyte)).map(item => [item.analyte, item.rawValue, item.unit, item.comparator, item.sourcePage]),
  issues: [...evidence.issues].sort() });
}
/** Provider output is untrusted: no changed values, inferred units, invented dates or extra fields. */
export function validateRealReportResult(output: unknown, evidence: LipidEvidence): LipidEvidence {
 const source = realReportEvidenceSchema.parse(evidence);
 if (typeof output === 'string') {
  if (output.length > 10000) throw Error('Report response exceeds the compact limit.');
  output = JSON.parse(output);
 }
 const result = realReportEvidenceSchema.parse(output);
 if (canonicalEvidence(result) !== canonicalEvidence(source)) throw Error('Report response changed or invented source evidence.');
 return result;
}

const labels: Record<string, LipidEvidence['measurements'][number]['analyte']> = {
 'cholesterol total serum': 'total', 'cholesterol total plasma': 'total', 'total cholesterol': 'total', cholesterol: 'total', 'cholesterol total': 'total',
 ldl: 'ldl', 'ldl c': 'ldl', 'ldl cholesterol': 'ldl', 'ldl cholesterol calc': 'ldl', 'ldl chol calc': 'ldl', 'ldl chol calc nih': 'ldl', 'ldl calculated': 'ldl', 'ldl cholesterol calculated': 'ldl', 'ldl c direct': 'ldl', 'ldl direct': 'ldl',
 hdl: 'hdl', 'hdl c': 'hdl', 'hdl cholesterol': 'hdl', 'triglycerides serum': 'triglycerides', triglycerides: 'triglycerides', triglyceride: 'triglycerides',
 apob: 'apob', 'apo b': 'apob', 'apolipoprotein b': 'apob', 'lp a': 'lpa', 'lipoprotein a': 'lpa',
};
const normalizeLabel = (value: string) => value.toLowerCase().replace(/[,:()\-]/g, ' ').replace(/\s+/g, ' ').trim();
const analyteFor = (value: string) => labels[normalizeLabel(value)] ?? null;
const units: Record<string, LipidEvidence['measurements'][number]['unit']> = { 'mg/dl': 'mg/dL', 'mmol/l': 'mmol/L', 'nmol/l': 'nmol/L', 'g/l': 'g/L' };
const row = /^(.+?)(?:\s*[:=]\s*|\s+)([<>]?)\s*(\d{1,4}(?:\.\d{1,4})?)\s*(?:H|L|HIGH|LOW)?\s*(mg\/dl|mmol\/l|nmol\/l|g\/l)(?:\s+(?:H|L|HIGH|LOW))?(?:\s+[<>]?\d{1,4}(?:\.\d{1,4})?(?:\s*-\s*\d{1,4}(?:\.\d{1,4})?)?)?(?:\s+(?:H|L|HIGH|LOW))?\s*$/i;
const dateLabel = /^(?:test date|collection date|date of collection|date collected|collected(?: on)?|specimen collection date)\s*:?\s*$/i;
const dated = /^(?:test date|collection date|date of collection|date collected|collected(?: on)?|specimen collection date)(?:\s*:\s*|\s+)(\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)?\s*$/i;
function dateValue(raw: string): string | null {
 if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return isoDate.safeParse(raw).success ? raw : null;
 const match = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(raw);
 if (!match) return null;
 const value = `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
 return isoDate.safeParse(value).success ? value : null;
}
function normalizedOcrText(text:string):string{
 // Typography only. Never repair digits, infer units or weaken comparison operators.
 return text.normalize('NFKC').replace(/[–—−]/g,'-').replace(/\b(mg|mmol|nmol|g)\s*\/\s*(dL|L)\b/gi,'$1/$2').replace(/\s+/g,' ').trim();
}
function measurement(text: string, page: number): LipidEvidence['measurements'][number] | null {
 if (text.length > 200 || /[^\x20-\x7E]/.test(text)) return null;
 const match = row.exec(text), analyte = match && analyteFor(match[1]);
 if (!match || !analyte) return null;
 const parsed = realReportMeasurementSchema.safeParse({ analyte, rawValue: match[3], comparator: match[2] || '=', unit: units[match[4].toLowerCase()], sourcePage: page });
 return parsed.success ? parsed.data : null;
}
function nearby(line: OcrPage['lines'][number], lines: OcrPage['lines']): OcrPage['lines'] {
 const center = line.y + line.height / 2;
 return lines.filter(other => other.id !== line.id && other.x >= line.x + line.width - 2 && Math.abs(other.y + other.height / 2 - center) <= Math.min(line.height, other.height) * 0.35).sort((a, b) => a.x - b.x);
}
/** Local allowlist reconstruction. No OCR transcript, name, address, SSN or image can enter the result. */
export function prepareRealReportEvidence(input: unknown): LipidEvidence {
 const pages = ocrPagesSchema.parse(input), measurements: LipidEvidence['measurements'] = [], dates: string[] = [];
 const issues = new Set<LipidEvidence['issues'][number]>();
 let invalidDate = false;
 for (const page of pages) for (const line of page.lines) {
  const text = normalizedOcrText(line.text);
  const isDateLabel = dateLabel.test(text), wholeDate = dated.exec(text);
  if (isDateLabel || wholeDate) {
   const others = isDateLabel ? nearby(line, page.lines) : [];
   const joined = wholeDate ? wholeDate : others.length === 1 ? dated.exec(text + ' ' + normalizedOcrText(others[0].text)) : null;
   if ((line.confidence ?? 0) < 0.8 || others.some(part => (part.confidence ?? 0) < 0.8) || !joined) { invalidDate = true; continue; }
   const value = dateValue(joined[1]); if (value) dates.push(value); else invalidDate = true;
   continue;
  }
  const inline = measurement(text, page.page), label = analyteFor(text);
  if (inline) {
   if ((line.confidence ?? 0) < 0.8) { issues.add('value-illegible'); issues.add('partial-source'); continue; }
   measurements.push(inline); continue;
  }
  if (label) {
   const others = nearby(line, page.lines);
   if (!others.length || others.length > 5 || (line.confidence ?? 0) < 0.8 || others.some(part => (part.confidence ?? 0) < 0.8)) { issues.add('value-illegible'); issues.add('partial-source'); continue; }
   const parsed = measurement(text + ' ' + others.map(part => normalizedOcrText(part.text)).join(' '), page.page);
   if (parsed) measurements.push(parsed); else { issues.add('unit-ambiguous'); issues.add('partial-source'); }
  } else if (/^(?:ldl|hdl|triglycerides|apob|apolipoprotein b|lipoprotein|lp\(a\)|total cholesterol|cholesterol)/i.test(text)) {
   issues.add('partial-source');
  }
 }
 if (!measurements.length) throw Error('No complete, legible lipid rows with printed units were found. Use a clearer report image or PDF.');
 if (new Set(measurements.map(item => item.analyte)).size !== measurements.length) throw Error('More than one result was found for the same test. Select a report showing one lipid panel.');
 const uniqueDates = [...new Set(dates)];
 const testDate = !invalidDate && uniqueDates.length === 1 ? uniqueDates[0] : null;
 if (!testDate) issues.add(invalidDate || uniqueDates.length > 1 ? 'date-ambiguous' : 'date-missing');
 return realReportEvidenceSchema.parse({ schemaVersion: 1, testDate, measurements, issues: [...issues] });
}
