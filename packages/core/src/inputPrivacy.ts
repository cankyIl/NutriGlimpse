import { z } from 'zod';

const lineSchema = z.object({
  id: z.string().min(1).max(80), text: z.string().max(2000),
  x: z.number().finite().nonnegative(), y: z.number().finite().nonnegative(),
  width: z.number().finite().positive(), height: z.number().finite().positive(),
  confidence: z.number().min(0).max(1).optional(),
}).strict();
export const ocrPagesSchema = z.array(z.object({
  page: z.number().int().min(1).max(10),
  width: z.number().int().min(1).max(4096), height: z.number().int().min(1).max(4096),
  lines: z.array(lineSchema).max(2000),
}).strict()).min(1).max(10).superRefine((pages, context) => {
  if (new Set(pages.map(p => p.page)).size !== pages.length) context.addIssue({ code: 'custom', message: 'Duplicate page' });
  if (pages.flatMap(p => p.lines).reduce((n, l) => n + l.text.length, 0) > 100000) context.addIssue({ code: 'custom', message: 'Text limit' });
  for (const page of pages) {
    if (new Set(page.lines.map(l => l.id)).size !== page.lines.length) context.addIssue({ code: 'custom', message: 'Duplicate line' });
    if (page.lines.some(l => l.x + l.width > page.width + 1 || l.y + l.height > page.height + 1))
      context.addIssue({ code: 'custom', message: 'Invalid text geometry' });
  }
});
export type OcrPage = z.infer<typeof ocrPagesSchema>[number];

// Privacy lexical filter, not a clinical parser. Unknown text is omitted, never forwarded.
// Reconstruct on a fresh canvas, rather than retaining any original image pixels.
// This experimental policy MUST NOT authorize outbound transmission.
const measurement = /^(?:total cholesterol|cholesterol(?:,? total)?|ldl(?:-c| cholesterol)?|hdl(?:-c| cholesterol)?|triglycerides|apob|apolipoprotein b|lp\(a\)|lipoprotein\(a\))\s*[:=]?\s*[<>]?\s*\d{1,4}(?:\.\d{1,4})?\s*(?:mg\/dL|mmol\/L|nmol\/L|g\/L)(?:\s+(?:[<>]?\d{1,4}(?:\.\d{1,4})?(?:-\d{1,4}(?:\.\d{1,4})?)?))?(?:\s+[HL])?$/i;
const dateLine = /^(?:test date|collection date|collected)\s*:\s*(\d{4}-\d{2}-\d{2})$/i;
function permittedReportLine(text: string): boolean {
  if (text.length > 100 || /[^\x20-\x7E]/.test(text)) return false;
  if (measurement.test(text)) return true;
  const match = dateLine.exec(text);
  if (!match) return false;
  const date = new Date(match[1] + 'T00:00:00Z');
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === match[1];
}
export function planReportReconstruction(input: unknown) {
  const pages = ocrPagesSchema.parse(input);
  const retained = pages.map(page => ({
    page: page.page,
    lines: page.lines.map(l => l.text.trim()).filter(permittedReportLine),
  })).filter(page => page.lines.length > 0);
  const kept = retained.reduce((n, p) => n + p.lines.length, 0);
  const total = pages.reduce((n, p) => n + p.lines.length, 0);
  const lowConfidence = pages.some(p => p.lines.some(l => l.confidence !== undefined && l.confidence < 0.8));
  const tooManyLines = retained.some(p => p.lines.length > 80);
  const hasMeasurement = retained.some(p => p.lines.some(l => measurement.test(l)));
  const blocked = lowConfidence || tooManyLines || !hasMeasurement;
  return {
    status: blocked ? 'blocked' as const : 'prepared-for-validation' as const,
    pages: blocked ? [] : retained,
    removedLines: total - kept,
    reason: lowConfidence ? 'OCR confidence is insufficient.' : tooManyLines ? 'Too many retained lines.' : !hasMeasurement ? 'No supported report rows found.' : null,
    policyVersion: 'experimental-report-transcript-1' as const,
    privacyVerified: false as const,
    outboundAllowed: false as const,
  };
}

export interface LocalInputAdapter {
  fingerprintSourceAsync?(uri: string): Promise<string>;
  createSessionAsync(): Promise<string>;
  cancelSession(id: string): void;
  disposeSessionAsync(id: string): Promise<boolean>;
  createSyntheticPdfAsync?(id: string): Promise<string>;
  createInvalidFixtureAsync?(id: string, kind: 'empty' | 'corrupt' | 'oversized'): Promise<string>;
  createSyntheticImageAsync(id: string): Promise<string>;
  inspectAsync(id: string, uri: string, mime: string): Promise<OcrPage[]>;
  renderTextAsync(id: string, page: number, lines: string[]): Promise<string>;
}
// Diagnostics exercise native processing with generated fictional data only.
// No originals, OCR text, image URIs or identifiers are returned to the app UI/history.
export async function runSyntheticInputDiagnostic(adapter: LocalInputAdapter, signal: AbortSignal, format: 'image' | 'pdf' = 'image') {
  if (signal.aborted) throw new Error('Input diagnostic cancelled.');
  const id = await adapter.createSessionAsync();
  const abort = () => adapter.cancelSession(id);
  signal.addEventListener('abort', abort, { once: true });
  const check = () => { if (signal.aborted) { abort(); throw new Error('Input diagnostic cancelled.'); } };
  try {
    check();
    if (format === 'pdf' && !adapter.createSyntheticPdfAsync) throw new Error('PDF diagnostic requires an updated native build.');
    const uri = format === 'pdf' ? await adapter.createSyntheticPdfAsync!(id) : await adapter.createSyntheticImageAsync(id); check();
    const pages = await adapter.inspectAsync(id, uri, format === 'pdf' ? 'application/pdf' : 'image/png'); check();
    if (format === 'pdf' && pages.length !== 2) throw new Error('Synthetic PDF page coverage is incomplete.');
    const plan = planReportReconstruction(pages);
    if (format === 'pdf' && plan.pages.length !== 2) throw new Error('Synthetic PDF reconstruction coverage is incomplete.');
    if (plan.status === 'blocked') throw new Error('Synthetic input needs clearer supported text.');
    for (const page of plan.pages) { await adapter.renderTextAsync(id, page.page, page.lines); check(); }
    return { pages: pages.length, recognizedLines: pages.reduce((n, p) => n + p.lines.length, 0),
      retainedLines: plan.pages.reduce((n, p) => n + p.lines.length, 0), removedLines: plan.removedLines,
      privacyVerified: false as const, outboundAllowed: false as const };
  } finally {
    signal.removeEventListener('abort', abort);
    const cleaned = await adapter.disposeSessionAsync(id);
    if (!cleaned) throw new Error('Cleanup is pending; native processing must finish before another test.');
  }
}

/** A rejected read is a pass only for the native input-validation error, never an arbitrary failure. */
export async function runSyntheticRejectionDiagnostic(adapter: LocalInputAdapter, signal: AbortSignal) {
 if (!adapter.createInvalidFixtureAsync) throw new Error('Rejection diagnostic requires an updated native build.');
 let rejected = 0;
 for (const kind of ['empty', 'corrupt', 'oversized'] as const) {
  if (signal.aborted) throw new Error('Input diagnostic cancelled.');
  const id = await adapter.createSessionAsync();
  const abort = () => adapter.cancelSession(id);
  const check = () => { if (signal.aborted) { abort(); throw new Error('Input diagnostic cancelled.'); } };
  signal.addEventListener('abort', abort, { once: true });
  try {
   check();
   const uri = await adapter.createInvalidFixtureAsync(id, kind);
   check();
   let expectedRejection = false;
   try { await adapter.inspectAsync(id, uri, 'application/pdf'); }
   catch (error) {
    check();
    expectedRejection = error instanceof Error && error.message.includes('INPUT_UNREADABLE_OR_LIMIT_EXCEEDED');
    if (!expectedRejection) throw new Error('Native validation was not reached.');
   }
   check();
   if (!expectedRejection) throw new Error('Invalid input was unexpectedly accepted.');
   rejected++;
  } finally {
   signal.removeEventListener('abort', abort);
   if (!await adapter.disposeSessionAsync(id)) throw new Error('Cleanup is pending; native processing must finish before another test.');
  }
 }
 return { rejected, cleanedSessions: rejected, privacyVerified: false as const, outboundAllowed: false as const };
}
