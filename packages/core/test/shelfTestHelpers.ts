import type { PublicFood } from '../src/publicFood.ts';
import type { ShelfObservation } from '../src/shelfTypes.ts';
// Deliberately fictional unit-test catalog; never imported by production code.
export function code(index: number): string {
 const body = `100000${String(index).padStart(6, '0')}`;
 const sum = [...body].reverse().reduce((n, d, i) => n + Number(d) * (i % 2 ? 1 : 3), 0);
 return body + String((10 - sum % 10) % 10);
}
export function food(index = 1, overrides: Partial<PublicFood> = {}): PublicFood {
 return { provider: 'usda', id: `unit-${index}`, barcode: `0${code(index)}`, name: 'Testbrand Sunrise Original Cereal', brand: 'Testbrand', ingredients: 'UNIT TEST ONLY: oats', dataType: 'Branded', basis: '100g', comparisonGroup: 'breakfast-cereal', categoryEvidence: 'category-rules-v4', servingGrams: 30, nutrients: { caloriesKcal: 380, saturatedFatG: 1, fiberG: 10, sodiumMg: 110, sugarsG: 4 }, sourceUrl: 'https://example.test/food', retrievedAt: '2026-10-14T00:00:00.000Z', sourceDate: '2026-10-10', license: 'CC0-1.0', certifications: 'unverified', availability: 'unverified', ...overrides };
}
export const observation = (text = 'Testbrand Sunrise', index?: number, id = 'observation'): ShelfObservation => ({ observationId: id, text: text ? [{ value: text, confidence: 0.99 }] : [], barcodes: index === undefined ? [] : [{ value: code(index), symbology: 'ean13' }] });
