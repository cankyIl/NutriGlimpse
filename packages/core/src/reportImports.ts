import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { panelSchema, type BetaSnapshot, type PanelRecord } from './beta.ts';
import { selectCurrentPanel } from './reports.ts';

/** Exact-byte identity only. Compute on device before discarding the input; never send this digest.
 * Rescanned/reencoded copies are not recognized. Filename, date and OCR values are not identity. */
export function fingerprintReportSource(bytes: Uint8Array): string {
 if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0 || bytes.byteLength > 20 * 1024 * 1024)
  throw Error('Report source must contain between 1 byte and 20 MiB.');
 return 'sha256:' + bytesToHex(sha256.create().update(new TextEncoder().encode('health-grocery-report-source-v1\0')).update(bytes).digest());
}
/** Invoke inside the local save transaction, never against a stale screen snapshot. */
export function registerPanelImport(snapshot: BetaSnapshot, input: PanelRecord): { snapshot: BetaSnapshot; id: string; reused: boolean } {
 const candidate = panelSchema.parse(input);
 const matches = snapshot.panels.filter(panel => panel.fingerprint === candidate.fingerprint && panel.synthetic === candidate.synthetic);
 if (matches.length > 1) throw Error('Multiple saved reports share this source. Review saved records first.');
 if (snapshot.panels.some(panel => panel.id === candidate.id && (panel.fingerprint !== candidate.fingerprint || panel.synthetic !== candidate.synthetic)))
  throw Error('Report identifier belongs to another source.');
 if (matches.length === 1) return { snapshot, id: matches[0].id, reused: true };
 if (!candidate.synthetic) {
  const journal = snapshot.reportImports?.find(item => item.fingerprint === candidate.fingerprint && item.status === 'completed');
  if (!journal?.result) throw Error('Complete the source-linked report check before confirming values.');
  // Confirmed values may correct OCR omissions or page associations after checking the original.
  // The immutable journal preserves exactly what the provider saw; this is never model-inferred data.
  if (Date.parse(candidate.testDate + 'T00:00:00Z') > Date.now()) throw Error('The printed test date cannot be in the future.');
 }

 if (!candidate.confirmed || candidate.status !== 'ready' || candidate.analysis !== null || !selectCurrentPanel([candidate]).panel)
  throw Error('Confirm extracted values and the printed test date before saving a new report.');
 return { snapshot: { ...snapshot, panels: [candidate, ...snapshot.panels] }, id: candidate.id, reused: false };
}
