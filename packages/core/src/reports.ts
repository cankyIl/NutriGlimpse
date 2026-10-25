import { panelSchema, type PanelRecord, type BetaSnapshot } from './beta.ts';
import type { ConfirmedPanel, ReportJob } from './types.ts';


/** Real report records take precedence over samples; ordinary caller panels remain supported. */
function sourcePanels<T extends ConfirmedPanel>(panels: T[]): T[] {
 const isReal = (panel: T) => (panel as T & { synthetic?: boolean }).synthetic === false;
 return panels.some(isReal) ? panels.filter(isReal) : panels;
}

function validDate(date: string | null): date is string {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}
export function panelConflictCandidates(panels: ConfirmedPanel[]): string {
  const dated = sourcePanels(panels).filter(p => p.confirmed && validDate(p.testDate));
  const latest = dated.map(p => p.testDate!).sort().at(-1);
  return JSON.stringify(dated.filter(p => p.testDate === latest).map(p => ({
    id: p.id, testDate: p.testDate, measurements: p.measurements,
    revision: (p as ConfirmedPanel & { revision?: number }).revision ?? 1,
  })).sort((a, b) => a.id.localeCompare(b.id)));
}
export function resolvePanelConflict(snapshot: BetaSnapshot, selectedId: string, expectedCandidates: string): BetaSnapshot {
  const currentCandidates = panelConflictCandidates(snapshot.panels);
  const conflict = selectCurrentPanel(snapshot.panels);
  if (currentCandidates !== expectedCandidates || conflict.panel || !conflict.unresolved.includes(selectedId))
    throw new Error('Reports changed. Review the current conflict before selecting.');
  const selected = sourcePanels(snapshot.panels).find(p => p.id === selectedId);
  const latest = sourcePanels(snapshot.panels).filter(p => p.confirmed && validDate(p.testDate)).map(p => p.testDate!).sort().at(-1);
  if (!selected || !validDate(selected.testDate) || selected.testDate !== latest)
    throw new Error('Select a confirmed report with the latest printed date.');
  return { ...snapshot, panelChoice: { selectedId, candidates: currentCandidates } };
}
export function selectCurrentPanel(panels: ConfirmedPanel[], choice?: BetaSnapshot['panelChoice']): { panel: ConfirmedPanel | null; unresolved: string[] } {
  const confirmed = sourcePanels(panels).filter(p => p.confirmed);
  const unresolved = confirmed.filter(p => !validDate(p.testDate)).map(p => p.id);
  const dated = confirmed.filter(p => validDate(p.testDate)).sort((a, b) => b.testDate!.localeCompare(a.testDate!));
  if (!dated.length) return { panel: null, unresolved };
  const sameDate = dated.filter(p => p.testDate === dated[0].testDate);
  if (sameDate.length > 1) {
    const selected = choice?.candidates === panelConflictCandidates(panels) ? sameDate.find(p => p.id === choice.selectedId) : undefined;
    return selected ? { panel: selected, unresolved } : { panel: null, unresolved: [...unresolved, ...sameDate.map(p => p.id)] };
  }
  return { panel: dated[0], unresolved };
}
export function nextReportAction(job: ReportJob, userRequestedRetry: boolean): 'reuse' | 'save-locally' | 'wait' | 'dispatch' | 'ask-to-retry' {
  if (job.status === 'completed') return 'reuse';
  if (job.status === 'save-pending') return 'save-locally';
  if (job.status === 'in-flight') return 'wait';
  if (job.status === 'ready') return 'dispatch';
  return userRequestedRetry ? 'dispatch' : 'ask-to-retry';
}

/** Source-linked correction, never a new manually created report. Old analysis is invalidated only on save. */
export function correctPanel(snapshot: BetaSnapshot, expected: PanelRecord, values: Pick<PanelRecord, 'testDate' | 'measurements'>, now: string): BetaSnapshot {
  const current = snapshot.panels.find(panel => panel.id === expected.id);
  if (!current || JSON.stringify(panelSchema.parse(current)) !== JSON.stringify(panelSchema.parse(expected))) throw new Error('Report changed. Reopen before correcting.');
  if (!current.confirmed) throw new Error('Only a confirmed report can be revised.');
  if (!validDate(values.testDate)) throw new Error('Confirm the printed test date.');
  if (!current.synthetic && Date.parse(values.testDate + 'T00:00:00Z') > Date.parse(now)) throw new Error('The printed test date cannot be in the future.');
  // The user may add omitted tests or correct page references from this same original report.
  // Typed panel validation still requires supported analytes/units and pages 1 through 10.
  const next = panelSchema.parse({ ...current, testDate: values.testDate, measurements: values.measurements,
    revision: (current.revision ?? 1) + 1, correctedAt: now, confirmed: true, status: 'ready', analysis: null });
  const unchanged = current.testDate === next.testDate && JSON.stringify(current.measurements) === JSON.stringify(next.measurements);
  if (unchanged) return snapshot;
  return { ...snapshot, panels: snapshot.panels.map(panel => panel.id === current.id ? next : panel) };
}
