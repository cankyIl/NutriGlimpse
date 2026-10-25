import { normalizeBarcode, normalizeScannedBarcode } from './barcode.ts';
import { catalogCandidateLimit } from './comparisonGroups.ts';
import { foodSchema, type PublicFood } from './publicFood.ts';
import type { ShelfIdentityOption, ShelfIdentityResolution, ShelfObservation } from './shelfTypes.ts';

export const shelfFoodKey = (food: PublicFood): string => `${food.provider}:${food.id}`;
const clean = (value: string): string => value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
const normalized = (value: string): string => clean(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = (value: string): string[] => [...new Set(normalized(value).split(' ').filter(Boolean))];
const generic = new Set('a an and the of with for from to in no net wt oz ounces ounce g grams lb lbs family size pack value new sale save price organic natural original classic regular reduced low less free zero sugar sugars fat saturated whole grain grains gluten cereal cereals cheese cookies cookie snack snacks breakfast milk food foods nutrition serving servings'.split(' '));

/** Reject oversized/malformed bridge messages before retaining their text in session memory. */
export function validateShelfObservation(raw: unknown): ShelfObservation | null {
 if (!raw || typeof raw !== 'object') return null;
 const value = raw as Record<string, unknown>;
 if (typeof value.observationId !== 'string' || !value.observationId.trim() || value.observationId.length > 128 || !Array.isArray(value.text) || value.text.length > 12 || !Array.isArray(value.barcodes) || value.barcodes.length > 2) return null;
 let chars = 0;
 const text: { value: string; confidence: number }[] = [];
 for (const line of value.text) {
  if (!line || typeof line.value !== 'string' || typeof line.confidence !== 'number' || !Number.isFinite(line.confidence) || line.confidence < 0 || line.confidence > 1) return null;
  chars += line.value.length;
  if (chars > 240) return null;
  const cleaned = clean(line.value);
  if (cleaned) text.push({ value: cleaned, confidence: line.confidence });
 }
 const barcodes: { value: string; symbology: string }[] = [];
 for (const barcode of value.barcodes) {
  if (!barcode || typeof barcode.value !== 'string' || barcode.value.length > 64 || typeof barcode.symbology !== 'string' || barcode.symbology.length > 32) return null;
  barcodes.push({ value: clean(barcode.value), symbology: barcode.symbology });
 }
 return { observationId: clean(value.observationId), text, barcodes };
}

function validatedBarcode(value: string, symbology: string): string | null {
 return symbology === 'itf14' && /^\d{14}$/.test(value) ? normalizeBarcode(value) : normalizeScannedBarcode(value, symbology);
}

/** Same-source duplicates may be coalesced only when their identity and nutrition facts agree. */
function catalogRecords(catalog: readonly PublicFood[]): { foods: PublicFood[]; conflictingBarcodes: Set<string> } {
 if (catalog.length > catalogCandidateLimit) return { foods: [], conflictingBarcodes: new Set() };
 const records = new Map<string, PublicFood>();
 const conflicts = new Set<string>(), conflictingBarcodes = new Set<string>();
 const facts = (food: PublicFood) => JSON.stringify([food.barcode, food.name, food.brand, food.ingredients, food.comparisonGroup, food.categoryEvidence, food.servingGrams, food.nutrients]);
 for (const raw of catalog) {
  const result = foodSchema.safeParse(raw);
  if (!result.success) continue;
  const food = result.data, key = shelfFoodKey(food), previous = records.get(key);
  if (previous && facts(previous) !== facts(food)) {
   conflicts.add(key);
   if (previous.barcode) conflictingBarcodes.add(previous.barcode);
   if (food.barcode) conflictingBarcodes.add(food.barcode);
  }
  if (!previous || Date.parse(food.retrievedAt) > Date.parse(previous.retrievedAt)) records.set(key, food);
 }
 return { foods: [...records].filter(([key]) => !conflicts.has(key)).map(([, food]) => food), conflictingBarcodes };
}

/** Pure local matching. Neither OCR text nor a recognition score can confirm an exact product. */
export function resolveShelfIdentity(raw: ShelfObservation, catalog: readonly PublicFood[]): ShelfIdentityResolution {
 const observation = validateShelfObservation(raw);
 if (!observation) return { status: 'unmatched', food: null, identityMethod: null, options: [], displayName: 'Unreadable package', reason: 'Take a closer view of one package.', observationFingerprint: '' };
 const barcodes = [...new Set(observation.barcodes.map(b => validatedBarcode(b.value, b.symbology)).filter((b): b is string => b !== null))].sort();
 const evidence = observation.text.filter(line => line.confidence >= 0.5).map(line => line.value);
 const phrase = normalized(evidence.join(' '));
 const observationFingerprint = JSON.stringify([barcodes, [...new Set(evidence.map(normalized).filter(Boolean))].sort()]);
 const displayName = clean(evidence.join(' ')).slice(0, 140) || (barcodes.length ? 'Barcode found' : 'Unreadable package');
 const { foods, conflictingBarcodes } = catalogRecords(catalog);
 const exact = foods.filter(food => food.barcode && barcodes.includes(food.barcode));
 if (barcodes.length === 1 && exact.length === 1 && !conflictingBarcodes.has(barcodes[0])) {
  const food = exact[0];
  return { status: 'confirmed', food, identityMethod: 'barcode', options: [], displayName: food.name, reason: 'A valid package barcode matches one public catalog record. Check that the package label agrees.', observationFingerprint };
 }
 if (exact.length) {
  const options = exact.slice(0, 5).map(food => ({ key: shelfFoodKey(food), food, reason: 'Barcode evidence is ambiguous; confirm the exact package and variant.' }));
  return { status: 'needs_confirmation', food: null, identityMethod: null, options, displayName, reason: barcodes.length > 1 ? 'More than one barcode was visible. Confirm one package at a time.' : 'More than one catalog record matches this barcode. Confirm the exact record and variant.', observationFingerprint };
 }
 const observed = new Set(tokens(phrase));
 const significant = [...observed].filter(word => word.length >= 3 && !generic.has(word));
 const explicitBrands = new Set(foods.filter(food => {
  const words = tokens(food.brand ?? '').filter(word => word.length >= 3 && !generic.has(word));
  return words.length > 0 && words.every(word => observed.has(word));
 }).map(food => normalized(food.brand ?? '')));
 const scored: { food: PublicFood; score: number }[] = [];
 if (significant.length) for (const food of foods) {
  if (explicitBrands.size && !explicitBrands.has(normalized(food.brand ?? ''))) continue;
  const name = tokens(food.name), brand = tokens(food.brand ?? ''), all = new Set([...name, ...brand]);
  const hits = significant.filter(word => all.has(word));
  const brandHit = brand.some(word => word.length >= 4 && !generic.has(word) && observed.has(word));
  if (hits.length < 2 && !(brandHit && hits.length >= 1) && !(hits.length === 1 && hits[0].length >= 6)) continue;
  const unexplainedWords = name.filter(word => word.length >= 3 && !generic.has(word) && !observed.has(word));
  // A complete visible name is stronger than a longer listing with added pack-size words.
  // This changes suggestion ordering only; OCR still cannot confirm identity.
  const exactNameLine = evidence.some(line => normalized(line) === normalized(food.name));
  const score = hits.length * 10 + name.filter(word => observed.has(word)).length * 3 + (brandHit ? 3 : 0) + (exactNameLine ? 30 : 0) - unexplainedWords.length;
  scored.push({ food, score });
 }
 scored.sort((a, b) => b.score - a.score || shelfFoodKey(a.food).localeCompare(shelfFoodKey(b.food)));
 const options: ShelfIdentityOption[] = scored.slice(0, 5).map(({ food }) => ({ key: shelfFoodKey(food), food, reason: 'Some visible text matches. Confirm brand, product and exact variant on the shelf.' }));
 return { status: options.length ? 'needs_confirmation' : 'unmatched', food: null, identityMethod: null, options, displayName, reason: options.length ? 'Package text suggests possible matches. Your confirmation is required.' : barcodes.length ? 'This barcode is not in the downloaded category catalog. Try another category or a closer package view.' : 'No reliable match in the downloaded category catalog. Move closer to the product name or barcode.', observationFingerprint };
}
