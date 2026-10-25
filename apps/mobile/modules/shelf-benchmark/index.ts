import { requireOptionalNativeModule, requireNativeView } from 'expo';
import { Platform, View } from 'react-native';
import { createElement, type ComponentType } from 'react';
import type { ShelfBenchmarkAvailability, ShelfBenchmarkModelId, ShelfBenchmarkSummary, ShelfBenchmarkViewProps, ShelfScanState } from './src/ShelfBenchmark.types';

export * from './src/ShelfBenchmark.types';
const nativeModule = (Platform.OS === 'ios' || Platform.OS === 'android')
  ? requireOptionalNativeModule<{
    getAvailabilityAsync(modelId: ShelfBenchmarkModelId): Promise<ShelfBenchmarkAvailability>;
    addListener(eventName: 'onShelfScanState', listener: (state: ShelfScanState) => void): { remove(): void };
    addListener(eventName: 'onBenchmarkComplete', listener: (summary: ShelfBenchmarkSummary) => void): { remove(): void };
  }>('ShelfBenchmark')
  : null;
export async function getShelfBenchmarkAvailabilityAsync(modelId: ShelfBenchmarkModelId = 'shelfset'): Promise<ShelfBenchmarkAvailability> {
  if (!nativeModule) return {
    available: false,
    modelId,
    reason: Platform.OS === 'web' ? 'native_device_required' : 'native_module_missing',
    modelName: modelId === 'shelfset' ? 'ShelfSetDiagnostic' : 'ShelfSKU11Diagnostic',
    modelBundled: false,
  };
  return nativeModule.getAvailabilityAsync(modelId);
}
export const ShelfBenchmarkView: ComponentType<ShelfBenchmarkViewProps> = nativeModule
  ? requireNativeView<ShelfBenchmarkViewProps>('ShelfBenchmark')
  : ({ style, testID, accessibilityLabel }: ShelfBenchmarkViewProps) => createElement(View, { style, testID, accessibilityLabel });

// Register once in the session-memory store so view removal cannot discard a completed summary.
export function subscribeShelfBenchmarkCompletions(listener: (summary: ShelfBenchmarkSummary) => void): () => void {
  const subscription = nativeModule?.addListener('onBenchmarkComplete', listener);
  return () => subscription?.remove();
}

// Keeps scan stop/interruption state observable after its camera view has been removed.
export function subscribeShelfScanStates(listener: (state: ShelfScanState) => void): () => void {
  const subscription = nativeModule?.addListener('onShelfScanState', listener);
  return () => subscription?.remove();
}
