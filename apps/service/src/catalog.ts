import { normalizeBarcode } from '../../../packages/core/src/barcode.ts';
import { z } from 'zod';
const finite = z.number().finite().nonnegative();
const responseSchema = z.object({ product: z.object({ code: z.string(), product_name: z.string().max(500).optional(), brands: z.string().max(500).optional(), ingredients_text: z.string().max(10000).optional(), nutriments: z.record(z.unknown()).optional(), last_modified_t: finite.optional() }).passthrough().optional() }).passthrough();
export interface CatalogFact {
  barcode: string; name: string; brand: string | null; ingredients: string | null;
  basis: '100g'; saturatedFatG: number | null; fiberG: number | null; sodiumMg: number | null;
  source: { provider: 'Open Food Facts'; url: string; retrievedAt: string; modifiedAt: string | null; communityContributed: true };
  certifications: 'unverified'; retailerMembership: 'unverified';
}
export function mapPublicProduct(value: unknown, barcode: string, now: string): CatalogFact | null {
  const input = responseSchema.parse(value); const product = input.product;
  if (!product) return null;
  if (normalizeBarcode(product.code) !== normalizeBarcode(barcode) || !normalizeBarcode(barcode)) throw new Error('Catalog barcode mismatch.');
  if (!product.product_name?.trim()) return null;
  const nutrient = (name: string) => { const value = product.nutriments?.[name]; return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null; };
  const sodium = nutrient('sodium_100g');
  return { barcode: normalizeBarcode(barcode)!, name: product.product_name, brand: product.brands ?? null, ingredients: product.ingredients_text || null,
    basis: '100g', saturatedFatG: nutrient('saturated-fat_100g'), fiberG: nutrient('fiber_100g'), sodiumMg: sodium === null ? null : sodium * 1000,
    source: { provider: 'Open Food Facts', url: `https://world.openfoodfacts.org/product/${encodeURIComponent(product.code)}`, retrievedAt: now, modifiedAt: product.last_modified_t ? new Date(product.last_modified_t * 1000).toISOString() : null, communityContributed: true }, certifications: 'unverified', retailerMembership: 'unverified' };
}
/** Not exposed by the public service until source adoption/contact/terms are configured. */
export async function lookupPublicProduct(barcode: string, options: { userAgent: string; signal?: AbortSignal; staging: boolean; fetcher?: typeof fetch }): Promise<CatalogFact | null> {
  if (!normalizeBarcode(barcode)) throw new Error('Invalid barcode.');
  if (!/^.+\/.+ \(.+@.+\)$/.test(options.userAgent)) throw new Error('Configure the provider-required application contact first.');
  const host = options.staging ? 'world.openfoodfacts.net' : 'world.openfoodfacts.org';
  const signal = AbortSignal.any([AbortSignal.timeout(10000), ...(options.signal ? [options.signal] : [])]);
  const headers: Record<string, string> = { 'User-Agent': options.userAgent };
  if (options.staging) headers.Authorization = `Basic ${Buffer.from('off:off').toString('base64')}`;
  const response = await (options.fetcher ?? fetch)(`https://${host}/api/v3.4/product/${barcode}.json?fields=code,product_name,brands,ingredients_text,nutriments,last_modified_t`, { headers, signal, redirect: 'error' });
  if (response.status === 404) return null;
  if (!response.ok || !response.body) throw new Error('Product source is unavailable.');
  const reader = response.body.getReader(); const parts: Uint8Array[] = []; let size = 0;
  try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 256000) throw new Error('Product response exceeds limit.'); parts.push(part.value); } }
  finally { await reader.cancel(); }
  return mapPublicProduct(JSON.parse(Buffer.concat(parts).toString('utf8')), barcode, new Date().toISOString());
}
