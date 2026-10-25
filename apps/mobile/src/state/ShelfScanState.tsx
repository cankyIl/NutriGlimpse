import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { ShelfSession } from '@grocery/core';
import { subscribeShelfScanStates } from '../../modules/shelf-benchmark';
import * as Crypto from 'expo-crypto';

// This archive is deliberately outside LocalSession, SQLite, backup and restored app state.
export const shelfSession = new ShelfSession({ processNonce: Crypto.randomUUID() });
let captureOwner: { captureId: string; runId: string } | null = null;
export function bindShelfCapture(runId: string, captureId: string) { captureOwner = { runId, captureId }; }
export function clearShelfCapture() { captureOwner = null; }
subscribeShelfScanStates(event => {
  if (captureOwner?.captureId !== event.runId || event.state === 'running') return;
  const runId = captureOwner.runId; captureOwner = null;
  shelfSession.pause(runId);
});
export function useShelfSession() {
  return useSyncExternalStore(shelfSession.subscribe, shelfSession.getSnapshot, shelfSession.getSnapshot);
}
export function ShelfScanLifecycle() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      // Native capture handles inactive transitions while distinguishing the first permission alert.
      if (state === 'background') { clearShelfCapture(); shelfSession.pauseAll(); }
    });
    return () => { subscription.remove(); shelfSession.pauseAll(); };
  }, []);
  return null;
}
