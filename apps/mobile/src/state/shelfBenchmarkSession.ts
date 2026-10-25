import { subscribeShelfBenchmarkCompletions, type ShelfBenchmarkSummary } from '../../modules/shelf-benchmark';

// Deliberately independent of the saved health repository. No disk writes or restore.
let summaries: readonly ShelfBenchmarkSummary[] = [];
const listeners = new Set<() => void>();
export const getShelfBenchmarkSummaries = () => summaries;
export function subscribeShelfBenchmarks(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function recordShelfBenchmark(summary: ShelfBenchmarkSummary) {
  if (summaries.some(item => item.runId === summary.runId)) return;
  summaries = [summary, ...summaries];
  listeners.forEach(listener => listener());
}

// Subscribe for the JS process lifetime so leaving the native view cannot lose a stopped run.
// Native notifications contain only compact measurements; duplicate view events are ignored above.
subscribeShelfBenchmarkCompletions(recordShelfBenchmark);

export function clearShelfBenchmarks() { summaries = []; listeners.forEach(listener => listener()); }
