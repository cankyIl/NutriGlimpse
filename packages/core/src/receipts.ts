import { assessSample } from './assessment.ts';
import { getProduct } from './fixtures.ts';
import { receiptSchema, type BetaSnapshot, type ReceiptLine, type ReceiptRecord } from './beta.ts';
import type { AssessmentLabel } from './types.ts';
export function parsePurchaseQuantity(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
  const quantity = Number(normalized);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : null;
}
// Flag possible repeated purchases; never automatically merge or remove them.
export function possibleDuplicateLineIds(lines: ReceiptLine[]): string[] {
  const groups = new Map<string, string[]>();
  for (const line of lines) {
    const text = line.text.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!text) continue;
    const key = JSON.stringify([text, line.kind, line.productId, line.quantity, line.unit]);
    groups.set(key, [...(groups.get(key) ?? []), line.id]);
  }
  return [...groups.values()].filter(ids => ids.length > 1).flat();
}
export function summarizeReceipt(receipt: ReceiptRecord) {
  const food = receipt.lines.filter(line => line.kind === 'food');
  const matched = food.filter(line => line.productId && getProduct(line.productId));
  const labels: Record<AssessmentLabel, number> = {
    'Good fit': 0, Neutral: 0, Limit: 0, 'Poor fit': 0,
    'Restriction conflict': 0, 'Insufficient information': 0,
  };
  for (const line of matched) labels[assessSample(getProduct(line.productId!)!, receipt.profile, 1).label]++;
  const unresolved = receipt.lines.filter(line => line.kind === 'unknown' ||
    (line.kind === 'food' && (!line.productId || !getProduct(line.productId)))).length;
  return {
    food: food.length, matched: matched.length, unresolved,
    excluded: receipt.lines.length - food.length - receipt.lines.filter(line => line.kind === 'unknown').length,
    refunds: receipt.lines.filter(line => line.kind === 'refund').length,
    weighted: food.filter(line => line.unit !== 'item').length,
    duplicateLineIds: possibleDuplicateLineIds(receipt.lines), labels,
    state: food.length === 0 && unresolved === 0 ? 'no-food' as const
      : unresolved > 0 ? 'partial' as const : 'matched' as const,
  };
}

/** Compare the reviewed base inside LocalSession.commit so stale reviews cannot overwrite newer saves. */
export function saveReviewedReceipt(snapshot: BetaSnapshot, input: ReceiptRecord, expected: ReceiptRecord | null): BetaSnapshot {
 const next = receiptSchema.parse(input);
 const current = snapshot.receipts.find(receipt => receipt.id === next.id);
 if (expected === null) {
  if (current || snapshot.panels.some(item => item.id === next.id) || snapshot.scans.some(item => item.id === next.id))
   throw Error('Receipt identifier is already saved.');
  return { ...snapshot, receipts: [next, ...snapshot.receipts] };
 }
 const base = receiptSchema.parse(expected);
 if (base.id !== next.id || !current || JSON.stringify(receiptSchema.parse(current)) !== JSON.stringify(base))
  throw Error('Receipt changed or was deleted. Reopen it from History before saving.');
 if (next.createdAt !== base.createdAt || JSON.stringify(next.profile) !== JSON.stringify(base.profile))
  throw Error('Receipt review cannot replace its original context.');
 if (JSON.stringify(next) === JSON.stringify(base)) return snapshot;
 return { ...snapshot, receipts: snapshot.receipts.map(receipt => receipt.id === next.id ? next : receipt) };
}
