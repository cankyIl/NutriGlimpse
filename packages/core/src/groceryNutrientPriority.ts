import type {GroceryFood} from './groceryReview.ts';
type Nutrient=keyof GroceryFood['nutrition'];
// Presentation order only. Missing values remain unknown and no new rating threshold is implied.
export const GROCERY_TIER1=['sugarsG','addedSugarsG','carbohydrateG','proteinG','transFatG','saturatedFatG','sodiumMg'] as const satisfies readonly Nutrient[];
export const GROCERY_TIER2=['caloriesKcal','totalFatG','fiberG','potassiumMg','calciumMg','ironMg','magnesiumMg','phosphorusMg','vitaminDmcg'] as const satisfies readonly Nutrient[];
export const GROCERY_NUTRIENT_ORDER=[...GROCERY_TIER1,...GROCERY_TIER2] as const;
