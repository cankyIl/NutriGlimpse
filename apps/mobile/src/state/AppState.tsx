import React, { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import * as Crypto from 'expo-crypto';
import { internalWeightCategory, clearBodyMeasurements, saveLocalFoodReview, type LocalFoodReview, LocalSession, ReportCoordinator, RealReportCoordinator, REAL_REPORT_CONSENT_VERSION, RulePackManager, newSnapshot, correctPanel, resolvePanelConflict, registerPanelImport, saveReviewedReceipt, type BetaSnapshot, type Profile, type Product, type Assessment, type ReceiptRecord, type PanelRecord, type LipidEvidence } from '@grocery/core';
import { clearShelfCapture, shelfSession } from './ShelfScanState';
import { clearShelfCatalog } from './shelfCatalog';
import { clearShelfBenchmarks } from './shelfBenchmarkSession';
import { configuredRuleSource, ruleTrustPolicy } from './ruleConfiguration';
import { openRepository } from '../storage/repository';
import { extractRealReport } from '../storage/realReportClient';
import { preparePrivateSession } from '../storage/privacyLifecycle';
import { Body, Status, Button, Page, Title } from '../ui/components';

export const recordId = () => Crypto.randomUUID();
function useBetaState() {
  const [snapshot, setSnapshot] = useState(newSnapshot);
  const session = useRef<LocalSession | null>(null);
  const ruleManager = useRef<RulePackManager | null>(null);
  const [ruleStatus, setRuleStatus] = useState('loading');
  const reports = useRef<ReportCoordinator | null>(null);
  const realReports = useRef<RealReportCoordinator | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true; let unsubscribe: (() => void) | undefined;
    let rules: RulePackManager | undefined;
    async function load() {
      let stage = 'privacy';
      try {
        await preparePrivateSession();
        stage = 'storage';
        const repository = await openRepository();
        if (!active) return;
        // No production pins/source: lifecycle is wired, clinical use remains disabled.
        rules = new RulePackManager(repository.ruleTrust, ruleTrustPolicy, configuredRuleSource());
        stage = 'rules';
        await rules.initialize();
        ruleManager.current = rules;
        if (active) setRuleStatus(rules.status.state);
        if (!active) { rules.close(); return; }
        const local = new LocalSession(repository);
        stage = 'saved-state';
        await local.initialize();
        if (!active) return;
        session.current = local;
        realReports.current = new RealReportCoordinator(local, extractRealReport);
        reports.current = new ReportCoordinator(local, async (_panel, signal) => {
          await new Promise<void>((resolve, reject) => { const timer = setTimeout(resolve, 400); signal.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('Cancelled')); }, { once: true }); });
          return 'Sample workflow complete. Confirmed values and test date are saved together. This demonstration does not interpret cardiovascular risk or supply medical advice. Live analysis is not configured.';
        });
        unsubscribe = local.subscribe(() => { setSnapshot(local.snapshot); setError(local.error); });
        setSnapshot(local.snapshot); setError(''); setReady(true);
      } catch { rules?.close(); if (active) setError('Could not open private storage or initialize privacy controls (' + stage + '). Existing data was preserved. Unlock your phone and retry. Native builds require SQLCipher.'); }
    }
    void load();
    return () => { active = false; rules?.close(); unsubscribe?.(); reports.current?.cancelAll(); realReports.current?.cancelAll(); };
  }, [attempt]);
  const cancelAllReportImports = useCallback(() => realReports.current?.cancelAll(), []);
  const commit = (change: (p: BetaSnapshot) => BetaSnapshot) => session.current ? session.current.commit(change) : Promise.resolve(false);
  async function saveScan(product: Product, assessment: Assessment) {
    const id = recordId(); const profile = snapshot.profile;
    const ok = await commit(p => ({ ...p, scans: [{ id, kind: 'product', product, assessment, profile, createdAt: new Date().toISOString() }, ...p.scans] }));
    return ok ? id : undefined;
  }
  return { ...snapshot, snapshot, weightCategory: internalWeightCategory(snapshot.profile), ruleStatus, refreshRules: async () => {
    const manager = ruleManager.current;
    if (!manager) return false;
    try { await manager.refresh(); setRuleStatus(manager.status.state); return true; }
    catch { setRuleStatus(manager.status.state); return false; }
  }, ready, error, load: () => setAttempt(a => a + 1), saveScan,
    acceptBetaTerms: () => commit(p => ({ ...p, betaConsent: { version: REAL_REPORT_CONSENT_VERSION, acceptedAt: new Date().toISOString() } })),
    findSavedReport: (fingerprint: string) => session.current?.snapshot.panels.find(p => p.fingerprint === fingerprint),
    lookupReportImport: (fingerprint: string) => realReports.current?.lookup(fingerprint),
    importedReportResult: (fingerprint: string) => realReports.current?.result(fingerprint) ?? null,
    runReportImport: (fingerprint: string, evidence: LipidEvidence, explicitRetry = false) => realReports.current!.run(fingerprint, evidence, { explicitRetry }),
    cancelReportImport: (fingerprint: string) => realReports.current?.cancel(fingerprint),
    cancelAllReportImports,
    hasPendingReportImport: (fingerprint: string) => realReports.current?.hasPending(fingerprint) ?? false,
    deleteReportImport: async (fingerprint: string) => { realReports.current?.cancel(fingerprint); const ok = await commit(p => ({ ...p, reportImports: p.reportImports?.filter(item => item.fingerprint !== fingerprint) })); if (ok) realReports.current?.discard(fingerprint); return ok; },
    updateProfile: (profile: Profile) => commit(p => ({ ...p, onboardingComplete: true, profile: { ...profile, revision: p.profile.revision + 1 } })),
    clearBodyMeasurements: () => commit(clearBodyMeasurements),
    saveFoodReview:(record:LocalFoodReview,expected:LocalFoodReview|null)=>commit(p=>saveLocalFoodReview(p,record,expected)),
    deleteFoodReview:(id:string)=>commit(p=>({...p,foodReviews:p.foodReviews?.filter(record=>record.id!==id)})),
    setAutoStoreDetection:(value:boolean)=>commit(p=>({...p,autoStoreDetection:value})),
    setNewsPersonalization: (value: boolean) => commit(p => ({ ...p, newsPersonalization: value })),
    setSearchArea: (searchArea: string) => commit(p => ({ ...p, searchArea })),
    setStore: (store: string) => commit(p => ({ ...p, store })), setRadius: (radius: number) => commit(p => ({ ...p, radius })),
    deleteScan: (id: string) => commit(p => ({ ...p, scans: p.scans.filter(s => s.id !== id) })),
    saveReceipt: (record: ReceiptRecord, expected: ReceiptRecord | null) => commit(p => saveReviewedReceipt(p, record, expected)),
    savePanel: async (record: PanelRecord) => {
      let result: { id: string; reused: boolean } | undefined;
      const ok = await commit(p => {
        const imported = registerPanelImport(p, record);
        result = { id: imported.id, reused: imported.reused };
        return imported.snapshot;
      });
      return ok ? result : undefined;
    },
    choosePanel: (id: string, candidates: string) => commit(p => resolvePanelConflict(p, id, candidates)),
    correctReport: (expected: PanelRecord, values: Pick<PanelRecord, 'testDate' | 'measurements'>) =>
      commit(p => correctPanel(p, expected, values, new Date().toISOString())),
    deleteReceipt: (id: string) => commit(p => ({ ...p, receipts: p.receipts.filter(r => r.id !== id) })),
    deletePanel: async (id: string) => { reports.current?.cancel(id); const fingerprint = session.current!.snapshot.panels.find(p => p.id === id)?.fingerprint; if (fingerprint) realReports.current?.cancel(fingerprint); const ok = await commit(p => ({ ...p, panels: p.panels.filter(r => r.id !== id), reportImports: p.reportImports?.filter(item => item.fingerprint !== fingerprint) })); if (ok && fingerprint) realReports.current?.discard(fingerprint); return ok; },
    runReport: (id: string, retry = false) => reports.current!.run(id, retry),
    cancelReport: (id: string) => reports.current?.cancel(id),
    hasPendingReport: (id: string) => reports.current?.hasPending(id) ?? false,
    restore: async (next: BetaSnapshot) => { reports.current?.cancelAll(); realReports.current?.cancelAll(); const ok = await session.current!.replace(next); if (ok) realReports.current?.discardAll(); return ok; },
    reset: async () => { reports.current?.cancelAll(); realReports.current?.cancelAll(); const repo=await openRepository();await repo.publicFoods?.clear();await repo.storeDirectory?.clear();const ok = await session.current!.replace(newSnapshot()); if (ok) { realReports.current?.discardAll(); clearShelfCapture(); shelfSession.reset(); clearShelfCatalog(); clearShelfBenchmarks(); } return ok; },
  };
}
type State = ReturnType<typeof useBetaState>;
const Context = createContext<State | null>(null);
export function AppStateProvider({ children }: { children: ReactNode }) {
  const value = useBetaState();
  if (!value.ready) return <Page><Title>Opening your companion</Title><Body>{value.error || 'Loading private storage…'}</Body>{!!value.error && <Button label="Retry" onPress={value.load} />}</Page>;
  return <Context.Provider value={value}>{!!value.error && <Status>{value.error}</Status>}{children}</Context.Provider>;
}
export function useAppState() { const value = useContext(Context); if (!value) throw new Error('Missing app provider'); return value; }
