import { betaCatalogUrl, REAL_REPORT_CONSENT_VERSION, realReportEvidenceSchema, validateRealReportResult, type LipidEvidence } from '@grocery/core';

export type ReportCapabilities = { schemaVersion: 1; available: boolean; reason: string; consentVersion: string; model: string | null };
async function request(path: string, signal: AbortSignal, body?: unknown): Promise<unknown> {
  if (signal.aborted) throw Error('Report request cancelled.');
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, body ? 45000 : 12000);
  try {
    const response = await fetch(betaCatalogUrl + path, { method: body ? 'POST' : 'GET', redirect: 'error', signal: controller.signal,
      headers: body ? { 'Content-Type': 'application/json' } : undefined, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (signal.aborted || controller.signal.aborted) throw Error('Report request interrupted.');
    if (!response.ok) throw Error(body ? 'Report processing did not return a usable result. Retry only when you choose.' : 'Report processing is currently unavailable.');
    if (!response.headers.get('content-type')?.startsWith('application/json')) throw Error('Invalid report response.');
    const size = response.headers.get('content-length');
    if (size && Number(size) > 16384) { void response.body?.cancel().catch(() => {}); throw Error('Report response exceeds its limit.'); }
    const raw = await response.text();
    if (raw.length > 16384 || signal.aborted || controller.signal.aborted) throw Error('Report response could not be accepted.');
    return JSON.parse(raw) as unknown;
  } finally { clearTimeout(timer); signal.removeEventListener('abort', abort); }
}
export async function getReportCapabilities(signal: AbortSignal): Promise<ReportCapabilities> {
  const value = await request('/v1/reports/capabilities', signal) as ReportCapabilities;
  if (!value || value.schemaVersion !== 1 || typeof value.available !== 'boolean' || !['ready', 'disabled', 'budget-unavailable'].includes(value.reason) ||
      value.consentVersion !== REAL_REPORT_CONSENT_VERSION || (value.model !== null && value.model !== 'gpt-6-luna')) throw Error('The report service and app need matching versions.');
  return value;
}
export async function extractRealReport(evidence: LipidEvidence, signal: AbortSignal): Promise<LipidEvidence> {
  const safe = realReportEvidenceSchema.parse(evidence);
  const response = await request('/v1/reports/extract', signal, { consentVersion: REAL_REPORT_CONSENT_VERSION, evidence: safe }) as { schemaVersion: number; result: unknown };
  if (!response || response.schemaVersion !== 1) throw Error('Invalid report processing response.');
  return validateRealReportResult(response.result, safe);
}
