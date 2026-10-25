import { RulePackStore, type RuleTrustRepository } from './ruleStore.ts';
import type { RuleTrustPolicy, VerifiedRulePack } from './signedRules.ts';

/** This callback belongs to trusted app configuration, never an archive or received pack.
 * It must enforce transport, response-byte and time limits before returning text. */
export type RuleUpdateSource = (signal: AbortSignal) => Promise<string>;
export class RulePackManager {
 private store: RulePackStore | null;
 private source: RuleUpdateSource | undefined;
 private started: Promise<void> | null = null;
 private pending: Promise<void> | null = null;
 private controller: AbortController | null = null;
 private closed = false;
 private initialized = false;
 private failed = false;
 private updateFailed = false;
 constructor(repository: RuleTrustRepository | undefined, policy: RuleTrustPolicy, source?: RuleUpdateSource, clock = Date.now) {
  this.store = repository ? new RulePackStore(repository, policy, clock) : null;
  this.source = source;
 }
 get verifiedPack(): VerifiedRulePack | null { return this.closed ? null : this.store?.active ?? null; }
 get status() {
  return Object.freeze({
   state: this.closed ? 'closed' : this.failed ? 'unavailable' : !this.initialized ? 'loading' : !this.store ? 'unavailable' : !this.source ? 'updates-disabled' : 'ready',
   sequence: this.verifiedPack?.sequence ?? null,
   updateFailed: this.updateFailed,
  });
 }
 initialize(): Promise<void> {
  if (this.closed) return Promise.reject(Error('Rule manager is closed.'));
  if (!this.started) this.started = (async () => {
   try { await this.store?.initialize(); }
   catch { this.failed = true; } // Rule failure must not prevent access to personal records.
   finally { this.initialized = true; }
  })();
  return this.started;
 }
 refresh(): Promise<void> {
  if (this.closed || !this.initialized || this.failed || !this.store || !this.source)
   return Promise.reject(Error('Rule updates are unavailable.'));
  if (this.pending) return this.pending;
  const store = this.store; const source = this.source;
  const controller = new AbortController(); this.controller = controller;
  this.pending = (async () => {
   try {
    const text = await Promise.resolve().then(() => {
     if (this.closed || controller.signal.aborted) throw Error('Rule update cancelled.');
     return source(controller.signal);
    });
    if (this.closed || controller.signal.aborted) throw Error('Rule update cancelled.');
    if (typeof text !== 'string' || text.length > 524288) throw Error('Rule envelope exceeds the size limit.');
    await store.install(text);
    this.updateFailed = false;
   } catch (error) { this.updateFailed = true; throw error; }
   finally { this.pending = null; this.controller = null; }
  })();
  return this.pending;
 }
 close(): void {
  this.closed = true;
  this.controller?.abort();
  // Invalidates outstanding handles and prevents activation after a pending durable write.
  this.store?.updatePolicy({ keys: {}, revokedKeyIds: [], minimumSequence: 1 });
 }
}
