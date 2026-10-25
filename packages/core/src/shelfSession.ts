import { comparisonGroups } from './comparisonGroups.ts';
import type { PublicFood } from './publicFood.ts';
import { resolveShelfIdentity, shelfFoodKey, validateShelfObservation } from './shelfIdentity.ts';
import type { ShelfCandidate, ShelfCategoryId, ShelfObservation, ShelfRun, ShelfSessionLimits, ShelfSnapshot, ShelfWorkToken } from './shelfTypes.ts';

const defaultLimits: ShelfSessionLimits = { maxRuns: 50, maxCandidatesPerRun: 500, maxCandidatesTotal: 5000, maxPendingWork: 1, maxStructuredBytes: 20 * 1024 * 1024 };
const factSignature = (food: PublicFood): string => JSON.stringify([food.barcode, food.name.toLowerCase(), food.brand?.toLowerCase(), food.ingredients, food.comparisonGroup, food.categoryEvidence, food.servingGrams, food.nutrients]);
const sameIdentity = (a: PublicFood, b: PublicFood): boolean => shelfFoodKey(a) === shelfFoodKey(b) || !!(a.barcode && a.barcode === b.barcode);
const bytes = (value: unknown): number => JSON.stringify(value).length * 2;
const maxFingerprintsPerCandidate = 4;

/** Process-lifetime archive only. Deliberately has no storage, serialization or repository hook. */
export class ShelfSession {
 private snapshot: ShelfSnapshot = { runs: [], activeRunId: null, capacityReached: false };
 private readonly listeners = new Set<() => void>();
 private readonly pending = new Map<string, ShelfWorkToken>();
 private readonly fingerprints = new Map<string, Map<string, string>>();
 private readonly limits: ShelfSessionLimits;
 private readonly now: () => Date;
 private readonly processNonce: string;
 private counter = 0;
 constructor(options: { limits?: Partial<ShelfSessionLimits>; now?: () => Date; processNonce?: string } = {}) {
  this.limits = { ...defaultLimits, ...options.limits };
  for (const limit of Object.values(this.limits)) if (!Number.isSafeInteger(limit) || limit < 1) throw Error('Invalid shelf session limit');
  this.now = options.now ?? (() => new Date());
  this.processNonce = options.processNonce ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  if (!this.processNonce || this.processNonce.length > 128) throw Error('Invalid process nonce');
 }
 getSnapshot = (): ShelfSnapshot => this.snapshot;
 subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
 private stamp(): string { return this.now().toISOString(); }
 private id(prefix: string): string { return `${prefix}-${++this.counter}`; }
 private run(id: string): ShelfRun | undefined { return this.snapshot.runs.find(run => run.id === id); }
 private structuredBytes(runs: readonly ShelfRun[], extraFingerprint = ''): number {
  return bytes(runs) + bytes([...this.pending.values()]) + [...this.fingerprints.values()].reduce((total, map) => total + bytes([...map]), 0) + extraFingerprint.length * 2;
 }
 private publish(runs: readonly ShelfRun[], activeRunId = this.snapshot.activeRunId): void {
  const count = runs.reduce((total, run) => total + run.candidates.length, 0);
  this.snapshot = { runs, activeRunId, capacityReached: count >= this.limits.maxCandidatesTotal || this.structuredBytes(runs) >= this.limits.maxStructuredBytes };
  for (const listener of this.listeners) listener();
 }
 private replace(next: ShelfRun, activeRunId = this.snapshot.activeRunId): void {
  this.publish(this.snapshot.runs.map(run => run.id === next.id ? next : run), activeRunId);
 }
 private cancelPending(runId: string): void {
  for (const [id, token] of this.pending) if (token.runId === runId) this.pending.delete(id);
 }
 private stopRun(run: ShelfRun): ShelfRun {
  this.cancelPending(run.id);
  return { ...run, state: run.state === 'finishing' || run.state === 'finished' ? 'finished' : 'paused', captureEpoch: run.captureEpoch + 1, pendingWorkCount: 0, updatedAt: this.stamp() };
 }
 start(categoryId: ShelfCategoryId): string | null {
  if (!comparisonGroups.includes(categoryId) || this.snapshot.runs.length >= this.limits.maxRuns || this.snapshot.capacityReached) return null;
  const id = this.id('shelf'), stamp = this.stamp();
  const run: ShelfRun = { id, categoryId, state: 'scanning', captureEpoch: 1, createdAt: stamp, updatedAt: stamp, candidates: [], pendingWorkCount: 0, capacityReached: false };
  if (this.structuredBytes([...this.snapshot.runs, run]) > this.limits.maxStructuredBytes) return null;
  const runs = this.snapshot.runs.map(current => current.state === 'scanning' ? this.stopRun(current) : current);
  this.fingerprints.set(id, new Map());
  this.publish([...runs, run], id);
  return id;
 }
 pause(runId: string): boolean {
  const run = this.run(runId);
  if (!run || (run.state !== 'scanning' && run.state !== 'finishing')) return false;
  this.replace(this.stopRun(run)); return true;
 }
 pauseAll(): void {
  if (!this.pending.size && !this.snapshot.runs.some(run => run.state === 'scanning' || run.state === 'finishing')) return;
  this.pending.clear();
  this.publish(this.snapshot.runs.map(run => run.state === 'scanning' || run.state === 'finishing' ? this.stopRun(run) : run));
 }
 resume(runId: string): boolean {
  const run = this.run(runId);
  if (!run || run.state !== 'paused' || run.capacityReached || this.snapshot.capacityReached) return false;
  this.publish(this.snapshot.runs.map(current => current.id === runId ? { ...run, state: 'scanning', captureEpoch: run.captureEpoch + 1, updatedAt: this.stamp() } : current.state === 'scanning' ? this.stopRun(current) : current), runId);
  return true;
 }
 finish(runId: string): boolean {
  const run = this.run(runId);
  if (!run || run.state === 'finished' || run.state === 'finishing') return false;
  this.replace({ ...run, state: run.pendingWorkCount ? 'finishing' : 'finished', updatedAt: this.stamp() }); return true;
 }
 openRun(runId: string): boolean {
  if (!this.run(runId)) return false;
  this.publish(this.snapshot.runs.map(run => run.state === 'scanning' ? this.stopRun(run) : run), runId); return true;
 }
 updateCategory(runId: string, categoryId: ShelfCategoryId): boolean {
  const run = this.run(runId);
  if (!run || !comparisonGroups.includes(categoryId)) return false;
  this.replace({ ...this.stopRun(run), categoryId }); return true;
 }
 beginWork(runId: string): ShelfWorkToken | null {
  const run = this.run(runId);
  if (!run || this.snapshot.activeRunId !== runId || run.state !== 'scanning' || run.capacityReached || this.pending.size >= this.limits.maxPendingWork) return null;
  const token = { processNonce: this.processNonce, runId, captureEpoch: run.captureEpoch, workId: this.id('work') };
  this.pending.set(token.workId, token);
  this.replace({ ...run, pendingWorkCount: run.pendingWorkCount + 1 });
  return { ...token };
 }
 private acceptToken(token: ShelfWorkToken): ShelfRun | null {
  const pending = this.pending.get(token.workId), run = this.run(token.runId);
  return pending && run && token.processNonce === this.processNonce && pending.runId === token.runId && pending.captureEpoch === token.captureEpoch && run.captureEpoch === token.captureEpoch && (run.state === 'scanning' || run.state === 'finishing') ? run : null;
 }
 cancelWork(token: ShelfWorkToken): boolean {
  const run = this.acceptToken(token);
  if (!run) return false;
  this.pending.delete(token.workId);
  const count = run.pendingWorkCount - 1;
  this.replace({ ...run, pendingWorkCount: count, state: run.state === 'finishing' && count === 0 ? 'finished' : run.state }); return true;
 }
 completeWork(token: ShelfWorkToken, observations: readonly ShelfObservation[], catalog: readonly PublicFood[]): boolean {
  const run = this.acceptToken(token);
  if (!run) return false;
  this.pending.delete(token.workId);
  let next: ShelfRun = { ...run, candidates: [...run.candidates], pendingWorkCount: run.pendingWorkCount - 1, updatedAt: this.stamp() };
  if (next.state === 'finishing' && next.pendingWorkCount === 0) next = { ...next, state: 'finished' };
  if (!Array.isArray(observations) || observations.length > 12) { this.replace(next); return false; }
  this.replace(this.applyObservations(next, observations, catalog)); return true;
 }
 /** Explicit user-entered package evidence; does not activate capture or admit asynchronous work. */
 reviewObservation(runId: string, observation: ShelfObservation, catalog: readonly PublicFood[]): boolean {
  const run = this.run(runId);
  if (!run || (run.state !== 'paused' && run.state !== 'finished') || run.capacityReached || !validateShelfObservation(observation)) return false;
  if (resolveShelfIdentity(observation, catalog).observationFingerprint === '[[],[]]') return false;
  const next = this.applyObservations({ ...run, updatedAt: this.stamp() }, [observation], catalog);
  this.replace(next); return !next.capacityReached;
 }
 /** Explicit privacy reset only; starting another scan never invokes this. */
 reset(): void {
  this.pending.clear(); this.fingerprints.clear();
  this.publish([], null);
 }
 private applyObservations(next: ShelfRun, observations: readonly ShelfObservation[], catalog: readonly PublicFood[]): ShelfRun {
  const fingerprints = this.fingerprints.get(next.id)!;
  for (const raw of observations) {
   const observation = validateShelfObservation(raw);
   if (!observation) continue;
   const resolution = resolveShelfIdentity(observation, catalog), fingerprint = resolution.observationFingerprint;
   if (!fingerprint || fingerprint === '[[],[]]') continue;
   const existingTextId = fingerprints.get(fingerprint);
   const existingText = next.candidates.find(candidate => candidate.id === existingTextId);
   const identityMatch = resolution.food ? next.candidates.find(candidate => candidate.food && sameIdentity(candidate.food, resolution.food!)) : undefined;
   if (identityMatch?.food && resolution.food && factSignature(identityMatch.food) === factSignature(resolution.food)) {
    next = { ...next, candidates: next.candidates.map(candidate => candidate.id === identityMatch.id ? { ...candidate, lastSeenAt: this.stamp(), sightings: candidate.sightings + 1 } : candidate) };
    // Keep a small set of repeated evidence patterns, never an unbounded per-frame history.
    if (!existingTextId && [...fingerprints.values()].filter(id => id === identityMatch.id).length < maxFingerprintsPerCandidate && this.structuredBytes(this.snapshot.runs, fingerprint) < this.limits.maxStructuredBytes) fingerprints.set(fingerprint, identityMatch.id);
    continue;
   }
   if (identityMatch?.food && resolution.food) {
    // Contradictory facts revoke automatic eligibility. A later barcode cannot silently restore it.
    next = { ...next, candidates: next.candidates.map(candidate => candidate.id === identityMatch.id ? { ...candidate, status: 'needs_confirmation', identityMethod: null, options: [], reason: 'Conflicting catalog facts for this barcode. Check the exact package and remove this entry before reviewing it again.' } : candidate) };
    continue;
   }
   // Repeated OCR is suppressed only as repeated evidence, never promoted to another confirmed sighting.
   if (existingText?.status === 'confirmed') continue;
   if (existingText && !resolution.food) {
    const updated = { ...existingText, status: resolution.status, options: resolution.options, reason: resolution.reason, displayName: resolution.displayName, lastSeenAt: this.stamp(), sightings: existingText.sightings + 1 };
    const proposed = { ...next, candidates: next.candidates.map(candidate => candidate.id === existingText.id ? updated : candidate) };
    if (this.structuredBytes(this.snapshot.runs.map(current => current.id === next.id ? proposed : current)) <= this.limits.maxStructuredBytes) next = proposed;
    continue;
   }
   const candidate: ShelfCandidate = {
    id: existingText?.id ?? this.id('item'), displayName: resolution.displayName, status: resolution.status, food: resolution.food,
    identityMethod: resolution.identityMethod, options: resolution.options, reason: resolution.reason,
    firstSeenAt: existingText?.firstSeenAt ?? this.stamp(), lastSeenAt: this.stamp(), sightings: (existingText?.sightings ?? 0) + 1,
   };
   const proposed = { ...next, candidates: [...next.candidates.filter(item => item.id !== candidate.id), candidate] };
   const runs = this.snapshot.runs.map(current => current.id === next.id ? proposed : current);
   const total = runs.reduce((sum, current) => sum + current.candidates.length, 0);
   if (proposed.candidates.length > this.limits.maxCandidatesPerRun || total > this.limits.maxCandidatesTotal || this.structuredBytes(runs, existingText ? '' : fingerprint) > this.limits.maxStructuredBytes) {
    this.cancelPending(next.id);
    next = { ...next, state: next.state === 'finished' ? 'finished' : 'paused', captureEpoch: next.captureEpoch + 1, pendingWorkCount: 0, capacityReached: true };
    break;
   }
   fingerprints.set(fingerprint, candidate.id); next = proposed;
  }
  return next;
 }
 confirm(runId: string, candidateId: string, foodKey: string): boolean {
  const run = this.run(runId), candidate = run?.candidates.find(item => item.id === candidateId);
  if (!run || !candidate || candidate.status === 'confirmed') return false;
  const choice = candidate.options.find(option => option.key === foodKey);
  if (!choice) return false;
  const duplicate = run.candidates.find(item => item.id !== candidateId && item.food && sameIdentity(item.food, choice.food));
  if (duplicate?.food && factSignature(duplicate.food) !== factSignature(choice.food)) return false;
  const fingerprints = this.fingerprints.get(runId)!;
  let candidates: readonly ShelfCandidate[];
  if (duplicate) {
   candidates = run.candidates.filter(item => item.id !== candidateId);
   // Remember that this repeated OCR pattern was explicitly confirmed, without asserting later sightings.
   let kept = [...fingerprints.values()].filter(id => id === duplicate.id).length;
   for (const [fingerprint, id] of fingerprints) if (id === candidateId) {
    if (kept < maxFingerprintsPerCandidate) { fingerprints.set(fingerprint, duplicate.id); kept++; } else fingerprints.delete(fingerprint);
   }
  } else candidates = run.candidates.map(item => item.id === candidateId ? { ...candidate, status: 'confirmed', food: choice.food, identityMethod: 'user-confirmed', displayName: choice.food.name, options: [], reason: 'You confirmed this exact product and variant against the shelf package.' } : item);
  this.replace({ ...run, candidates, updatedAt: this.stamp() }); return true;
 }
 dismissCandidate(runId: string, candidateId: string): boolean {
  const run = this.run(runId);
  if (!run || !run.candidates.some(candidate => candidate.id === candidateId)) return false;
  const fingerprints = this.fingerprints.get(runId)!;
  for (const [fingerprint, id] of fingerprints) if (id === candidateId) fingerprints.delete(fingerprint);
  this.replace({ ...run, candidates: run.candidates.filter(candidate => candidate.id !== candidateId), capacityReached: false, updatedAt: this.stamp() }); return true;
 }
}
