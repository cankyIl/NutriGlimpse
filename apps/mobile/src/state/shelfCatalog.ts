import { fetchComparableFoods, type ComparisonGroup, type PublicFood } from '@grocery/core';
import {productCatalog} from './productCatalog';

// Public category pools only. This cache has no observations, profile or run membership.
const pools = new Map<ComparisonGroup, { loadedAt: number; foods: PublicFood[] }>();
export function clearShelfCatalog() { pools.clear(); }
export async function loadShelfCatalog(category: ComparisonGroup, signal: AbortSignal, refresh = false) {
  const cached = pools.get(category);
  if (signal.aborted) throw new Error('Cancelled');
  if (!refresh && cached && Date.now() - cached.loadedAt < 15 * 60_000) return cached.foods;
  const included=productCatalog().filter(food=>food.comparisonGroup===category).slice(0,500);
  if(!refresh&&included.length){
    pools.delete(category); pools.set(category,{loadedAt:Date.now(),foods:included});
    while(pools.size>2)pools.delete(pools.keys().next().value!);
    return included;
  }
  if (signal.aborted) throw new Error('Cancelled');
  // Only this public category leaves the device. Never send camera text.
  const foods = await fetchComparableFoods(category, signal).catch(error => { if (!signal.aborted && included.length) return included; throw error; });
  if (signal.aborted) throw new Error('Cancelled');
  pools.delete(category);
  pools.set(category, { loadedAt: Date.now(), foods });
  while (pools.size > 2) pools.delete(pools.keys().next().value!);
  return foods;
}
