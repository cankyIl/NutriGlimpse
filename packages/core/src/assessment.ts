import { conditions, hasValidHealthFocus, isCondition, restrictions } from './types.ts';
import type { Assessment, Product, Profile, Restriction } from './types.ts';

export function validateProfile(profile: Profile): string | null {
  if (!Number.isInteger(profile.age) || profile.age < 21) return 'This app supports adults aged 21 and older.';
  if (!hasValidHealthFocus(profile)) return 'Choose a primary concern from your selected needs.';
  return null;
}

// Display fixtures exercise state precedence. These are NOT clinical rules or nutrient cutoffs.
export function assessSample(product: Product, profile: Profile, portion = 1): Assessment {
  if (!Number.isFinite(portion) || portion <= 0) throw new Error('Choose a positive portion.');
  const required: Restriction[] = [...new Set([...profile.restrictions, ...(profile.conditions.includes('celiac') ? ['glutenFree' as const] : [])])];
  const conflicts = required.filter(key => product.compliance[key] === 'conflict');
  const unknown = required.filter(key => product.compliance[key] !== 'verified' && product.compliance[key] !== 'conflict');
  const missing: string[] = [];
  const profileError = validateProfile(profile);
  if (profileError) missing.push(profileError);
  if (product.ingredients === null) missing.push('Ingredients');
  if (Object.values(product.nutrients).some(n => n === null)) missing.push('Nutrition Facts');
  if (!isCondition(profile.primary)) missing.push('This sample has no reviewed rating for a general health focus');
  // No fixture claim is silently extended to additional populations or conditions.
  const unsupported = profile.conditions.filter(key => key !== 'cardiovascular');
  if (unsupported.length) missing.push(`Reviewed rules for ${unsupported.map(key => conditions[key]).join(', ')}`);
  if (profile.pregnancy !== 'not-pregnant') missing.push('Pregnancy applicability has not been reviewed');
  if (portion !== 1) missing.push('Reviewed rating for this portion');
  if (!product.fixtureRating) missing.push('Complete product evidence');
  const label = conflicts.length ? 'Restriction conflict' : unknown.length || missing.length ? 'Insufficient information' : product.fixtureRating!;
  const reason = conflicts.length
    ? `Conflicts with ${conflicts.map(key => restrictions[key].toLowerCase()).join(', ')}.`
    : unknown.length ? `${unknown.map(key => restrictions[key]).join(', ')} status is unverified. This item cannot be recommended as a compatible alternative.`
    : missing.length ? 'More information is needed before showing a fit rating. Available label facts are shown below.'
    : product.id === 'sample-granola'
      ? 'This sample highlights saturated fat. Compare a breakfast option with less saturated fat at an equivalent weight.'
      : product.id === 'sample-oats' ? 'This sample highlights whole grain oats and fiber, with less saturated fat than the sample granola.'
      : 'An example of a portion-based fresh-food result, with estimated nutrition.';
  return { productId: product.id, label, reason, conflicts, unknown, missing, primary: profile.primary,
    profileRevision: profile.revision, portion, ruleVersion: 'synthetic-ui-1', synthetic: true,
    contextNotes: ['Illustrative outcome only; not clinical advice or a validated rating.'] };
}

export function sampleAlternatives(original: Product, candidates: Product[], profile: Profile, retailer: string): Product[] {
  const originalAssessment = assessSample(original, profile);
  if (!['Limit', 'Poor fit', 'Restriction conflict'].includes(originalAssessment.label)) return [];
  return candidates.filter(p => p.id !== original.id && p.category === original.category && p.retailers.length > 0)
    .filter(p => {
      const assessment = assessSample(p, profile);
      const comparison = compareAtEqualWeight(original, p);
      const fat = comparison?.nutrients.find(n => n.key === 'saturatedFat');
      // This fixture highlights saturated fat; a 'Good fit' fixture tag alone is not an improvement.
      const improves = fat?.original !== null && fat?.candidate !== null &&
        fat?.original !== undefined && fat?.candidate !== undefined && fat.candidate < fat.original;
      return improves && assessment.label === 'Good fit' && assessment.conflicts.length === 0 && assessment.unknown.length === 0;
    }).sort((a, b) => Number(b.retailers.includes(retailer)) - Number(a.retailers.includes(retailer)));
}

/** Label arithmetic only: equal weight is not a clinical assessment or a recommended portion. */
export function compareAtEqualWeight(original: Product, candidate: Product, grams = original.servingGrams) {
  if (grams === null || !Number.isFinite(grams) || grams <= 0 ||
      original.servingGrams === null || candidate.servingGrams === null ||
      !Number.isFinite(original.servingGrams) || !Number.isFinite(candidate.servingGrams) ||
      original.servingGrams <= 0 || candidate.servingGrams <= 0) return null;
  const keys = ['calories', 'fiber', 'saturatedFat', 'sodium', 'sugars'] as const;
  const nutrients = keys.map(key => {
    const a = original.nutrients[key]; const b = candidate.nutrients[key];
    const valid = (n: number | null): n is number => n !== null && Number.isFinite(n) && n >= 0;
    const from = valid(a) ? a * grams / original.servingGrams! : null;
    const to = valid(b) ? b * grams / candidate.servingGrams! : null;
    return { key, original: from !== null && Number.isFinite(from) ? from : null,
      candidate: to !== null && Number.isFinite(to) ? to : null };
  });
  return { grams, nutrients };
}
