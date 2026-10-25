import { LocalSession } from './session.ts';
import { REAL_REPORT_CONSENT_VERSION, realReportEvidenceSchema, realReportImportSchema, validateRealReportResult, type LipidEvidence, type RealReportImport } from './realReportEvidence.ts';
export type RealReportExtractor = (evidence: LipidEvidence, signal: AbortSignal) => Promise<unknown>;
export type RealReportRunResult = 'saved' | 'reused' | 'busy' | 'retry-required' | 'save-pending' | 'storage-failed' | 'outcome-unknown' | 'failed' | 'discarded' | 'consent-required';
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
interface PendingResult { epoch: number; original: string; completed: RealReportImport; discarded?: boolean }
/** One active request, local intent before dispatch, and successful result reuse. No source media or transport identifiers. */
export class RealReportCoordinator {
 private readonly running = new Map<string, AbortController>();
 private readonly pending = new Map<string, PendingResult>();
 private readonly now: () => Date;
 private readonly timeoutMs: number;
 private readonly session: LocalSession;
 private readonly extract: RealReportExtractor;
 constructor(session: LocalSession, extract: RealReportExtractor, options: { now?: () => Date; timeoutMs?: number } = {}) {
  this.session = session; this.extract = extract;
  this.now = options.now ?? (() => new Date()); this.timeoutMs = options.timeoutMs ?? 90000;
 }
 lookup(fingerprint: string): RealReportImport | undefined { return this.session.snapshot.reportImports?.find(item => item.fingerprint === fingerprint); }
 result(fingerprint: string): LipidEvidence | null {
  const record = this.lookup(fingerprint); return record?.status === 'completed' ? clone(record.result) : null;
 }
 hasPending(fingerprint: string): boolean {
  const pending = this.pending.get(fingerprint);
  return !!pending && pending.epoch === this.session.epoch && JSON.stringify(this.lookup(fingerprint)) === pending.original;
 }
 cancel(fingerprint: string): void { this.running.get(fingerprint)?.abort(); }
 cancelAll(): void { for (const controller of this.running.values()) controller.abort(); }
 /** Privacy deletion/replacement only. Ordinary navigation uses cancel and retains a valid unsaved result. */
 discard(fingerprint: string): void {
  this.cancel(fingerprint); const cached = this.pending.get(fingerprint);
  if (cached) cached.discarded = true;
  this.pending.delete(fingerprint);
 }
 discardAll(): void {
  this.cancelAll(); for (const cached of this.pending.values()) cached.discarded = true;
  this.pending.clear();
 }
 async run(fingerprint: string, suppliedEvidence?: LipidEvidence, options: { explicitRetry?: boolean; signal?: AbortSignal } = {}): Promise<RealReportRunResult> {
  if (!/^sha256:[a-f0-9]{64}$/.test(fingerprint)) throw Error('A local report-source fingerprint is required.');
  const savedPanel = this.session.snapshot.panels.find(panel => !panel.synthetic && panel.fingerprint === fingerprint);
  const original = this.lookup(fingerprint);
  if (savedPanel || original?.status === 'completed') return 'reused';
  if (this.running.size) return 'busy';
  const cached = this.pending.get(fingerprint);
  if (cached && this.hasPending(fingerprint)) return await this.persist(fingerprint, cached);
  this.pending.delete(fingerprint);
  if (this.session.snapshot.betaConsent?.version !== REAL_REPORT_CONSENT_VERSION) return 'consent-required';
  if (original && !options.explicitRetry) return 'retry-required';
  if (options.signal?.aborted) return 'discarded';
  const evidence = realReportEvidenceSchema.parse(suppliedEvidence ?? original?.evidence);
  if (original && suppliedEvidence) validateRealReportResult(suppliedEvidence, original.evidence);
  const epoch = this.session.epoch, controller = new AbortController(); this.running.set(fingerprint, controller);
  const abort = () => controller.abort(); options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  const stamp = this.now().toISOString();
  const active = realReportImportSchema.parse({ fingerprint, evidence, result: null, status: 'in-flight', createdAt: original?.createdAt ?? stamp, updatedAt: stamp });
  let started = false;
  try {
   const written = await this.session.commit(data => {
    if (this.session.epoch !== epoch || data.betaConsent?.version !== REAL_REPORT_CONSENT_VERSION || controller.signal.aborted || JSON.stringify(data.reportImports?.find(item => item.fingerprint === fingerprint)) !== JSON.stringify(original) || data.panels.some(panel => !panel.synthetic && panel.fingerprint === fingerprint)) return data;
    const entries = data.reportImports ?? [];
    if (!original && entries.length >= 1000) throw Error('Report import capacity reached.');
    started = true;
    return { ...data, reportImports: [active, ...entries.filter(item => item.fingerprint !== fingerprint)] };
   });
   if (!written) return 'storage-failed';
   if (!started) return 'discarded';
   if (controller.signal.aborted) return await this.fail(active, epoch, 'failed');
   let timer: ReturnType<typeof setTimeout> | undefined;
   let received = false;
   const interrupted = new Promise<never>((_, reject) => {
    controller.signal.addEventListener('abort', () => reject(Error('Report request interrupted.')), { once: true });
    timer = setTimeout(abort, this.timeoutMs);
   });
   try {
    const output = await Promise.race([this.extract(clone(evidence), controller.signal), interrupted]);
    received = true;
    const result = validateRealReportResult(output, evidence);
    const completed = realReportImportSchema.parse({ ...active, status: 'completed', result, updatedAt: this.now().toISOString() });
    const pending = { epoch, original: JSON.stringify(active), completed };
    this.pending.set(fingerprint, pending);
    return await this.persist(fingerprint, pending);
   } catch { return await this.fail(active, epoch, received ? 'failed' : 'outcome-unknown'); }
   finally { if (timer) clearTimeout(timer); }
  } finally { this.running.delete(fingerprint); options.signal?.removeEventListener('abort', abort); }
 }
 private async persist(fingerprint: string, pending: PendingResult): Promise<RealReportRunResult> {
  let applicable = false;
  const saved = await this.session.commit(data => {
   if (pending.discarded || this.session.epoch !== pending.epoch || JSON.stringify(data.reportImports?.find(item => item.fingerprint === fingerprint)) !== pending.original) return data;
   applicable = true;
   return { ...data, reportImports: data.reportImports!.map(item => item.fingerprint === fingerprint ? pending.completed : item) };
  });
  if (!applicable) { this.pending.delete(fingerprint); return 'discarded'; }
  if (!saved) return 'save-pending';
  this.pending.delete(fingerprint); return 'saved';
 }
 private async fail(active: RealReportImport, epoch: number, status: 'failed' | 'outcome-unknown'): Promise<RealReportRunResult> {
  let applicable = false;
  const saved = await this.session.commit(data => {
   if (this.session.epoch !== epoch || JSON.stringify(data.reportImports?.find(item => item.fingerprint === active.fingerprint)) !== JSON.stringify(active)) return data;
   applicable = true;
   return { ...data, reportImports: data.reportImports!.map(item => item.fingerprint === active.fingerprint ? { ...item, status, updatedAt: this.now().toISOString() } : item) };
  });
  return !applicable ? 'discarded' : saved ? status : 'storage-failed';
 }
}
