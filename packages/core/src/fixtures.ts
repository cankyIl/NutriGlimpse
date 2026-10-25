import type { Product, Profile } from './types.ts';

export const sampleProfile: Profile = {
  revision: 1, age: 35, pregnancy: 'not-pregnant', primary: 'cardiovascular',
  conditions: ['cardiovascular'], intent: 'prevention', restrictions: [],
};
const source = { id: 'fixture-label-v1', title: 'Invented package label for interface testing', version: '1', synthetic: true as const };
const plant = { vegetarian: 'verified', eggFree: 'verified', dairyFree: 'verified', halal: 'unverified', kosher: 'unverified', glutenFree: 'unverified' } as const;
export const products: Product[] = [
  {
    id: 'sample-granola', name: 'Maple & almond granola', variant: 'Sample pantry · 12 oz', category: 'breakfast cereal',
    form: 'packaged', serving: '½ cup (55 g)', servingGrams: 55, ingredients: 'Rolled oats, maple syrup, almonds, coconut oil, sea salt.',
    nutrients: { calories: 240, fiber: 4, saturatedFat: 5, sodium: 90, sugars: 12 }, compliance: plant,
    retailers: ['Wegmans', 'Target'], source, illustration: 'granola', fixtureRating: 'Limit',
  },
  {
    id: 'sample-oats', name: 'Old-fashioned rolled oats', variant: 'Sample pantry · 18 oz', category: 'breakfast cereal',
    form: 'packaged', serving: '½ cup dry (40 g)', servingGrams: 40, ingredients: 'Whole grain rolled oats.',
    nutrients: { calories: 150, fiber: 4, saturatedFat: 0.5, sodium: 0, sugars: 1 },
    compliance: { ...plant, glutenFree: 'verified' }, retailers: ['Wegmans', 'Walmart', 'Target'], source,
    illustration: 'oats', fixtureRating: 'Good fit',
  },
  {
    id: 'sample-apple', name: 'Fresh apple', variant: 'Generic food · estimated nutrition', category: 'fruit', form: 'fresh',
    serving: '1 medium apple (182 g)', servingGrams: 182, ingredients: 'Apple, raw, with skin.',
    nutrients: { calories: 95, fiber: 4.4, saturatedFat: 0.1, sodium: 2, sugars: 19 },
    compliance: plant, retailers: ['Wegmans'], source: { ...source, title: 'Synthetic reference estimate; not a measured portion' },
    illustration: 'apple', fixtureRating: 'Neutral',
  },
  {
    id: 'sample-unknown', name: 'Crunchy oat clusters', variant: 'Sample pantry · label incomplete', category: 'breakfast cereal',
    form: 'packaged', serving: 'Serving not yet confirmed', servingGrams: null, ingredients: null,
    nutrients: { calories: null, fiber: null, saturatedFat: null, sodium: null, sugars: null }, compliance: plant,
    retailers: [], source, illustration: 'granola', fixtureRating: null,
  },
];
export const retailers = ['Wegmans', 'Walmart', 'Price Chopper / Market 32', 'Target', 'Shaw’s', 'Trader Joe’s'];
export function getProduct(id: string): Product | undefined { return products.find(p => p.id === id); }
