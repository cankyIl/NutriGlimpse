import {profileSchema, type BetaSnapshot} from './beta.ts';
import {comparisonReady, nutrientUnits, type ComparisonGroup} from './catalogAlternatives.ts';
import {foodSchema, type PublicFood} from './publicFood.ts';
import {selectCurrentPanel} from './reports.ts';
import {conditions, isCondition, restrictions, type ConfirmedPanel, type LabMeasurement, type Profile} from './types.ts';

/** Comparative label facts, not the synthetic assessment engine or an approved clinical rule pack. */
export const shelfRankingPolicy = {
 version: 'shelf-comparison-2026-10-15.1', sourceCheckedOn: '2026-10-14',
 clinicalReviewStatus: 'pending', absoluteRatingsEnabled: false,
 maxInputFoods: 500, maxDisplayedFoods: 10, basis: '100g',
} as const;
export const shelfRankingSources = {
 tlc: {title: 'NHLBI: Therapeutic Lifestyle Changes', url: 'https://www.nhlbi.nih.gov/health/TLC-Therapeutic-Lifestyle-Changes-Lower-Cholesterol'},
 dash: {title: 'NHLBI: DASH Eating Plan', url: 'https://www.nhlbi.nih.gov/health/dash-eating-plan'},
 diabetes: {title: 'CDC: Diabetes Meal Planning', url: 'https://www.cdc.gov/diabetes/healthy-eating/diabetes-meal-planning.html'},
 weight: {title: 'NIDDK: Eating and Physical Activity to Lose or Maintain Weight', url: 'https://www.niddk.nih.gov/health-information/weight-management/adult-overweight-obesity/eating-physical-activity'},
 masld: {title: 'NIDDK: Eating, Diet and Nutrition for NAFLD and NASH', url: 'https://www.niddk.nih.gov/health-information/liver-disease/nafld-nash/eating-diet-nutrition'},
 triglycerides: {title: 'ACC: Hypertriglyceridemia Consensus Key Points', url: 'https://www.acc.org/Latest-in-Cardiology/ten-points-to-remember/2021/07/27/21/04/2021-ACC-ECDP-Hypertriglyceridemia'},
 dyslipidemia: {title: '2026 ACC/AHA Guideline on the Management of Dyslipidemia', url: 'https://doi.org/10.1161/CIR.0000000000001423'},
 ckd: {title: 'NIDDK: Healthy Eating for Adults with CKD', url: 'https://www.niddk.nih.gov/health-information/kidney-disease/chronic-kidney-disease-ckd/healthy-eating-adults-chronic-kidney-disease'},
 celiac: {title: 'NIDDK: Eating, Diet and Nutrition for Celiac Disease', url: 'https://www.niddk.nih.gov/health-information/digestive-diseases/celiac-disease/eating-diet-nutrition'},
 sibo: {title: 'AGA: SIBO and Diet', url: 'https://patient.gastro.org/small-intestinal-bacterial-overgrowth-sibo-managing-with-diet/'},
 pregnancy: {title: 'FDA: Dairy and Eggs, Food Safety for Moms-to-Be', url: 'https://www.fda.gov/food/people-risk-foodborne-illness/dairy-and-eggs-food-safety-moms-be'},
} as const;
export type ShelfRankingSourceId = keyof typeof shelfRankingSources;
export type ShelfNutrient = keyof PublicFood['nutrients'];
export interface ShelfPriority {
 metric: ShelfNutrient;
 label: string;
 direction: 'lower' | 'higher';
 origins: string[];
 sourceIds: ShelfRankingSourceId[];
}
export interface ShelfRankedFood {
 food: PublicFood;
 /** A shared tier means no supported ordering within that tier. This is not an absolute suitability rating. */
 tier: number;
 absoluteRating: null;
 reasons: string[];
 tradeoffs: {metric: ShelfNutrient; label: string; otherFoodId: string; otherFoodName: string; difference: number; unit: string}[];
}
export interface ShelfRankingResult {
 policyVersion: typeof shelfRankingPolicy.version;
 clinicalReviewStatus: 'pending';
 title: 'Personalized nutrient comparison';
 status: 'comparison' | 'needs-information';
 categoryId: ComparisonGroup;
 basis: '100g';
 profileRevision: number;
 primaryConcern: Profile['primary'];
 panelId: string | null;
 panelTestDate: string | null;
 priorities: ShelfPriority[];
 contextNotes: string[];
 sourceIds: ShelfRankingSourceId[];
 ranked: ShelfRankedFood[];
 excluded: {food: PublicFood; reasons: string[]}[];
 eligibleCount: number;
 remainingCount: number;
 boundaryTiedCount: number;
}
export interface ShelfRankingInput {
 /** Only resolved, confirmed members of the current run. Never pass catalog suggestions or pending matches. */
 foods: readonly PublicFood[];
 categoryId: ComparisonGroup;
 profile: Profile;
 panels?: readonly ConfirmedPanel[];
 panelChoice?: BetaSnapshot['panelChoice'];
 now?: number;
}
const labels: Record<ShelfNutrient, string> = {caloriesKcal: 'Calories', saturatedFatG: 'Saturated fat', fiberG: 'Fiber', sodiumMg: 'Sodium', sugarsG: 'Total sugars'};
const stableCompare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const foodKey = (food: PublicFood) => `${food.barcode ?? ''}:${food.provider}:${food.id}`;
const unique = <T,>(values: readonly T[]) => [...new Set(values)];
const measurementNumber = (measurement: LabMeasurement): number | null => {
 if (!/^\d+(\.\d+)?$/.test(measurement.rawValue) || !['mg/dL', 'mmol/L'].includes(measurement.unit) ||
     !['=', '<', '>'].includes(measurement.comparator)) return null;
 const value = Number(measurement.rawValue);
 return Number.isFinite(value) && value > 0 ? value : null;
};
function sameFoodFacts(food: PublicFood): string {
 // Different source/retrieval dates do not turn conflicting formulations into equivalent evidence.
 return JSON.stringify([food.name, food.brand, food.ingredients, food.comparisonGroup, food.categoryEvidence,
   food.servingGrams ?? null, food.basis, food.nutrients]);
}
function dominates(a: PublicFood, b: PublicFood, priorities: readonly ShelfPriority[]): boolean {
 let improved = false;
 for (const priority of priorities) {
  const aValue = a.nutrients[priority.metric]!;
  const bValue = b.nutrients[priority.metric]!;
  const difference = priority.direction === 'lower' ? bValue - aValue : aValue - bValue;
  if (difference < 0) return false;
  if (difference > 0) improved = true;
 }
 return improved;
}

/** Pure, bounded and local. No network, storage, LLM calls or report reanalysis. */
export function rankShelfFoods(input: ShelfRankingInput): ShelfRankingResult {
 const now = input.now ?? Date.now();
 const profile = input.profile;
 const priorities: ShelfPriority[] = [];
 const notes: string[] = [
  'These are same-category label comparisons at 100 g, not recommended portions or overall disease-suitability ratings.',
  'Products in the same tier have different tradeoffs or matching selected values; their display order does not establish a health advantage.',
  'The comparison policy is awaiting clinical review. Good fit, Neutral, Limit and Poor fit ratings are not assigned.',
 ];
 const blocks: string[] = [];
 const sourceIds: ShelfRankingSourceId[] = [];
 const add = (metric: ShelfNutrient, origin: string, source: ShelfRankingSourceId) => {
  const existing = priorities.find(priority => priority.metric === metric);
  if (existing) {existing.origins = unique([...existing.origins, origin]); existing.sourceIds = unique([...existing.sourceIds, source]);}
  else priorities.push({metric, label: labels[metric], direction: metric === 'fiberG' ? 'higher' : 'lower', origins: [origin], sourceIds: [source]});
  sourceIds.push(source);
 };
 const parsedProfile = profileSchema.safeParse(profile);
 if (!parsedProfile.success) blocks.push('A valid profile for an adult aged 21 or older is needed.');
 if (!Number.isFinite(now)) blocks.push('The current date could not be verified.');
 if (input.foods.length > shelfRankingPolicy.maxInputFoods) blocks.push('This comparison exceeds the session product limit.');
 const selectedConditions = parsedProfile.success ? unique(profile.conditions) : [];
 if (parsedProfile.success) {
  // Primary concern changes explanatory order only; it cannot override any other selected concern.
  const ordered = isCondition(profile.primary) ? [profile.primary, ...selectedConditions.filter(condition => condition !== profile.primary)] : selectedConditions;
  for (const condition of ordered) {
   const origin = conditions[condition];
   if (condition === 'cardiovascular') add('saturatedFatG', origin, 'tlc');
   if (condition === 'hypertension') add('sodiumMg', origin, 'dash');
   if (condition === 'diabetes') {
    add('fiberG', origin, 'diabetes');
    notes.push('For diabetes, the available comparison is total fiber only. Total carbohydrate, added sugars, portions and medication context are unavailable, so this does not predict glucose response.');
   }
   if (condition === 'masld') {
    add('saturatedFatG', origin, 'masld');
    notes.push('For MASLD, saturated fat is only one available comparison. Unsaturated fats, added sugars and the overall eating pattern are not assessed.');
   }
   if (condition === 'weight') {
    add('caloriesKcal', origin, 'weight');
    notes.push('For weight management, calories are compared at equal food weight. This does not prescribe weight loss, a calorie target or a serving size.');
   }
   if (condition === 'ckd') {blocks.push('Kidney-specific nutrition and care-plan information are missing; sodium alone cannot establish a suitable kidney choice.'); sourceIds.push('ckd');}
   if (condition === 'sibo') {blocks.push('SIBO diet phase, individual tolerances and relevant carbohydrate evidence are missing; a general fiber or sugar ranking is not suitable.'); sourceIds.push('sibo');}
  }
  const required = unique([...profile.restrictions, ...(selectedConditions.includes('celiac') ? ['glutenFree' as const] : [])]);
  if (required.length) blocks.push(`Required evidence is unverified: ${required.map(key => restrictions[key]).join(', ')}. Catalog names and ingredients alone do not confirm compatibility.`);
  if (selectedConditions.includes('celiac')) sourceIds.push('celiac');
  if (profile.pregnancy !== 'not-pregnant') {
   blocks.push(profile.pregnancy === 'pregnant' ? 'Pregnancy-specific food-safety and nutrition evidence is missing.' : 'Confirm pregnancy applicability before using this comparison.');
   sourceIds.push('pregnancy');
  }
 }
 const suppliedPanels = input.panels ?? [];
 const realPanels = suppliedPanels.filter(panel => (panel as ConfirmedPanel & {synthetic?: boolean}).synthetic !== true);
 if (realPanels.length !== suppliedPanels.length) notes.push('Sample lipid reports are not used for real-food comparisons.');
 const selection = selectCurrentPanel([...realPanels], input.panelChoice);
 let panel = selection.panel;
 if (selection.unresolved.length) notes.push('Some confirmed reports have an unconfirmed date or a same-date conflict. Unresolved reports are not used for lipid personalization.');
 // A future test date must not replace the latest actual test, and an older report is never silently substituted.
 if (panel && Date.parse(`${panel.testDate}T00:00:00Z`) > now) {
  notes.push('The selected report has a future test date. Lipid personalization is withheld until the date is corrected.');
  panel = null;
 }
 if (panel) {
  notes.push(`Lipid context uses the confirmed report dated ${panel.testDate}; import date does not determine which report is current.`);
  for (const analyte of ['ldl', 'triglycerides'] as const) {
   const measurements = panel.measurements.filter(measurement => measurement.analyte === analyte);
   if (measurements.length === 0) continue;
   if (measurements.length !== 1) {notes.push(`The ${analyte === 'ldl' ? 'LDL' : 'triglyceride'} result is duplicated and is not interpreted.`); continue;}
   const measurement = measurements[0];
   const value = measurementNumber(measurement);
   if (value === null) {notes.push(`The ${analyte === 'ldl' ? 'LDL' : 'triglyceride'} result has unsupported units or an invalid value; no normal result is assumed.`); continue;}
   // This hold uses a conservative published severe-TG boundary, not a diagnosis from one report.
   if (analyte === 'triglycerides' && ['=', '>'].includes(measurement.comparator) && value >= (measurement.unit === 'mg/dL' ? 500 : 5.6)) {
    blocks.push('This triglyceride result needs an individualized nutrition plan before foods are ranked. Review the confirmed result with your clinician.');
    sourceIds.push('dyslipidemia');
    continue;
   }
   if (measurement.comparator !== '=') {
    notes.push(`The ${analyte === 'ldl' ? 'LDL' : 'triglyceride'} result is a bound rather than an exact value; it is not treated as an exact or normal result.`);
    continue;
   }
   if (analyte === 'ldl') {
    add('saturatedFatG', 'Confirmed LDL context', 'tlc');
    notes.push('LDL context adds a saturated-fat comparison without diagnosing high LDL or assuming an individual target. Total fiber is not substituted for soluble fiber.');
   } else {
    add('saturatedFatG', 'Confirmed triglyceride context', 'triglycerides');
    notes.push('Triglyceride context adds a saturated-fat comparison. Added sugars, refined carbohydrate, total fat and fasting context are missing; total sugars are not substituted for those fields.');
   }
  }
 }
 if (!priorities.length && !blocks.length) {
  if (parsedProfile.success && !isCondition(profile.primary) && !selectedConditions.length) notes.push('General food facts are shown without a preferred nutrient or a health ranking. General Fitness and No Concern do not imply a medical condition or a calorie target.');
  else blocks.push('No supported nutrient comparison is available for this profile.');
 }
 const excluded: ShelfRankingResult['excluded'] = [];
 const qualified: PublicFood[] = [];
 for (const food of input.foods.slice(0, shelfRankingPolicy.maxInputFoods)) {
  const reasons = [...blocks];
  if (!foodSchema.safeParse(food).success || !comparisonReady(food, now)) reasons.push('Complete, current and comparable catalog evidence is needed, including all five nutrition values, ingredients and an exact package identifier.');
  if (food.comparisonGroup !== input.categoryId) reasons.push('This item belongs to a different comparison category.');
  if (reasons.length) excluded.push({food, reasons: unique(reasons)});
  else qualified.push(food);
 }
 const byBarcode = new Map<string, PublicFood[]>();
 for (const food of qualified) byBarcode.set(food.barcode!, [...(byBarcode.get(food.barcode!) ?? []), food]);
 const eligible: PublicFood[] = [];
 for (const records of byBarcode.values()) {
  if (new Set(records.map(sameFoodFacts)).size > 1) {
   for (const food of records) excluded.push({food, reasons: ['Conflicting catalog facts exist for this package identifier. Confirm the label before comparison.']});
  } else {
   const ordered = [...records].sort((a, b) => Date.parse(b.retrievedAt) - Date.parse(a.retrievedAt) || stableCompare(foodKey(a), foodKey(b)));
   eligible.push(ordered[0]);
  }
 }
 eligible.sort((a, b) => stableCompare(foodKey(a), foodKey(b)));
 // Compute nondominated fronts in O(n^2 * nutrients), bounded to 500 inputs.
 const incoming = eligible.map(() => 0);
 const outgoing = eligible.map(() => [] as number[]);
 for (let a = 0; a < eligible.length; a++) for (let b = a + 1; b < eligible.length; b++) {
  if (dominates(eligible[a], eligible[b], priorities)) {outgoing[a].push(b); incoming[b]++;}
  else if (dominates(eligible[b], eligible[a], priorities)) {outgoing[b].push(a); incoming[a]++;}
 }
 let front = eligible.map((_, index) => index).filter(index => incoming[index] === 0);
 let tier = 1;
 const allRanked: ShelfRankedFood[] = [];
 while (front.length) {
  const next: number[] = [];
  for (const index of front.sort((a, b) => stableCompare(foodKey(eligible[a]), foodKey(eligible[b])))) {
   const food = eligible[index];
   const reference = allRanked.find(item => item.food.barcode !== food.barcode)?.food ?? eligible.find(other => other.barcode !== food.barcode);
   const tradeoffs: ShelfRankedFood['tradeoffs'] = [];
   if (reference) for (const metric of Object.keys(labels) as ShelfNutrient[]) {
    const difference = food.nutrients[metric]! - reference.nutrients[metric]!;
    if (metric === 'fiberG' ? difference < 0 : difference > 0) tradeoffs.push({metric, label: labels[metric], otherFoodId: `${reference.provider}:${reference.id}`, otherFoodName: reference.name, difference: Math.abs(difference), unit: nutrientUnits[metric]});
   }
   allRanked.push({food, tier, absoluteRating: null,
    reasons: priorities.length ? priorities.map(priority => `${priority.label}: ${food.nutrients[priority.metric]} ${nutrientUnits[priority.metric]} per 100 g; comparing ${priority.direction} values for ${priority.origins.join(' and ')}.`) : ['Label facts only; no preferred product is assigned for this general health focus.'], tradeoffs});
   for (const other of outgoing[index]) if (--incoming[other] === 0) next.push(other);
  }
  front = next; tier++;
 }
 const ranked = allRanked.slice(0, shelfRankingPolicy.maxDisplayedFoods);
 const boundaryTier = ranked.at(-1)?.tier;
 const boundaryTiedCount = allRanked.slice(ranked.length).filter(item => item.tier === boundaryTier).length;
 if (boundaryTiedCount) notes.push(`${boundaryTiedCount} additional product${boundaryTiedCount === 1 ? '' : 's'} share the last displayed tier; the ten-item display limit is not a clinical distinction.`);
 return {policyVersion: shelfRankingPolicy.version, clinicalReviewStatus: 'pending', title: 'Personalized nutrient comparison',
  status: ranked.length ? 'comparison' : 'needs-information', categoryId: input.categoryId, basis: '100g',
  profileRevision: profile.revision, primaryConcern: profile.primary, panelId: panel?.id ?? null, panelTestDate: panel?.testDate ?? null,
  priorities, contextNotes: unique([...notes, ...blocks]), sourceIds: unique(sourceIds), ranked, excluded,
  eligibleCount: allRanked.length, remainingCount: allRanked.length - ranked.length, boundaryTiedCount};
}
