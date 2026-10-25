import { newSnapshot, parseSnapshot, recoverSnapshot, panelSchema, type BetaSnapshot, type BetaRepository, type PanelRecord } from './beta.ts';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
export class LocalSession {
  private value = newSnapshot();
  private queue = Promise.resolve();
  private listeners = new Set<() => void>();
  epoch = 0;
  error = '';
  private repository: BetaRepository;
  constructor(repository: BetaRepository) { this.repository = repository; }
  get snapshot(): BetaSnapshot { return clone(this.value); }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private notify() { this.listeners.forEach(listener => listener()); }
  async initialize() {
    const saved = await this.repository.read();
    const next = saved ? recoverSnapshot(saved) : newSnapshot();
    await this.repository.write(next); this.value = next; this.error = ''; this.notify();
  }
  commit(change: (previous: BetaSnapshot) => BetaSnapshot): Promise<boolean> {
    let success = false;
    const task = this.queue.then(async () => {
      try {
        const next = parseSnapshot(change(this.snapshot));
        await this.repository.write(next); this.value = next; this.error = ''; success = true;
      } catch { this.error = 'Changes could not be saved. Existing saved data is unchanged. Please retry.'; }
      this.notify();
    });
    this.queue = task;
    return task.then(() => success);
  }
  async replace(snapshot: BetaSnapshot) {
    // Invalidate every old async operation before queuing restore/reset.
    this.epoch++;
    return this.commit(() => recoverSnapshot(snapshot));
  }
}

export type AnalysisAdapter = (panel: PanelRecord, signal: AbortSignal) => Promise<string>;
export type RunResult = 'saved' | 'reused' | 'busy' | 'retry-required' | 'not-confirmed' | 'not-found' | 'save-pending' | 'storage-failed' | 'outcome-unknown' | 'discarded' | 'real-report-local-only';
/** Device-local coordinator. Never promises exactly-once execution at the provider. */
export class ReportCoordinator {
  private running = new Map<string, AbortController>();
  private pending = new Map<string, { epoch: number; original: string; panel: PanelRecord }>();
  private session: LocalSession; private analyze: AnalysisAdapter; private timeoutMs: number;
  constructor(session: LocalSession, analyze: AnalysisAdapter, timeoutMs = 90000) { this.session = session; this.analyze = analyze; this.timeoutMs = timeoutMs; }
  hasPending(id: string) {
    const pending = this.pending.get(id);
    return !!pending && pending.epoch === this.session.epoch && !!this.session.snapshot.panels.find(p => p.id === id && JSON.stringify(p) === pending.original);
  }
  cancel(id: string) { this.running.get(id)?.abort(); }
  cancelAll() { this.running.forEach(controller => controller.abort()); this.pending.clear(); }
  async run(id: string, explicitRetry = false): Promise<RunResult> {
    if (this.running.has(id)) return 'busy';
    const panel = this.session.snapshot.panels.find(p => p.id === id);
    if (!panel) return 'not-found';
    if (!panel.synthetic) return 'real-report-local-only';
    if (panel.status === 'completed') return 'reused';
    if (!panel.confirmed) return 'not-confirmed';
    const controller = new AbortController(); this.running.set(id, controller);
    const epoch = this.session.epoch;
    try {
      const cached = this.pending.get(id);
      if (cached && this.hasPending(id)) return await this.persist(id, cached);
      this.pending.delete(id);

      if (panel.status === 'save-pending' && panel.analysis !== null) {
        return await this.persist(id, { epoch, original: JSON.stringify(panel), panel: { ...panel, status: 'completed' } });
      }
      if (['failed', 'outcome-unknown', 'in-flight'].includes(panel.status) && !explicitRetry) return 'retry-required';
      const active: PanelRecord = { ...panel, status: 'in-flight', analysis: null };
      let started = false;
      const written = await this.session.commit(data => {
        if (this.session.epoch !== epoch || JSON.stringify(data.panels.find(p => p.id === id)) !== JSON.stringify(panel)) return data;
        started = true;
        return { ...data, panels: data.panels.map(p => p.id === id ? active : p) };
      });
      if (!written) return 'storage-failed';
      if (!started || controller.signal.aborted) return await this.uncertain(active, epoch);
      let timer: ReturnType<typeof setTimeout> | undefined;
      const interrupted = new Promise<never>((_, reject) => {
        controller.signal.addEventListener('abort', () => reject(new Error('Interrupted')), { once: true });
        timer = setTimeout(() => controller.abort(), this.timeoutMs);
      });
      try {
        const analysis = await Promise.race([this.analyze(clone(active), controller.signal), interrupted]);
        const completed = panelSchema.parse({ ...active, status: 'completed', analysis });
        const pending = { epoch, original: JSON.stringify(active), panel: completed };
        this.pending.set(id, pending);
        return await this.persist(id, pending);
      } catch { return await this.uncertain(active, epoch); }
      finally { if (timer) clearTimeout(timer); }
    } finally { this.running.delete(id); }
  }
  private async persist(id: string, pending: { epoch: number; original: string; panel: PanelRecord }): Promise<RunResult> {
    let applicable = false;
    const saved = await this.session.commit(data => {
      if (this.session.epoch !== pending.epoch || JSON.stringify(data.panels.find(p => p.id === id)) !== pending.original) return data;
      applicable = true;
      return { ...data, panels: data.panels.map(p => p.id === id ? pending.panel : p) };
    });
    if (!applicable) { this.pending.delete(id); return 'discarded'; }
    if (!saved) { this.pending.set(id, pending); return 'save-pending'; }
    this.pending.delete(id); return 'saved';
  }
  private async uncertain(active: PanelRecord, epoch: number): Promise<RunResult> {
    if (!active.synthetic) return 'discarded';
    let applicable = false;
    const saved = await this.session.commit(data => {
      if (this.session.epoch !== epoch || JSON.stringify(data.panels.find(p => p.id === active.id)) !== JSON.stringify(active)) return data;
      applicable = true;
      return { ...data, panels: data.panels.map(p => p.id === active.id && p.synthetic ? { ...p, status: 'outcome-unknown' } : p) };
    });
    return !applicable ? 'discarded' : saved ? 'outcome-unknown' : 'storage-failed';
  }
}


