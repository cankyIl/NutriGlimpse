import { z } from 'zod';
import { measurementSchema } from './beta.ts';
import { verifiedRuleContents, type VerifiedRulePack } from './signedRules.ts';
import type { Profile } from './types.ts';

export { sourceSchema, ruleSchema, rulePackSchema, type RulePack } from './ruleSchemas.ts';
import type { RulePack } from './ruleSchemas.ts';
/** Signature verification returns an opaque handle; a caller-supplied flag is never accepted. */
export function applicableRules(handle: VerifiedRulePack | null, profile: Profile, context: string[] = [], now = Date.now()) {
  const pack = verifiedRuleContents(handle, now);
  if (!pack) return [];
  const sources = new Map(pack.sources.map(source => [source.id, source]));
  return pack.rules.filter(rule => rule.status === 'approved' && rule.reviewedBy && rule.approvedAt && profile.conditions.includes(rule.condition) && profile.age >= rule.minimumAge && rule.pregnancy.includes(profile.pregnancy) && rule.requiredContext.every(item => context.includes(item)) && rule.sourceIds.every(id => sources.get(id)?.usage === 'permitted'));
}

export const extractionSchema = z.object({
  schemaVersion: z.literal(1), testDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(value + 'T00:00:00Z');
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'Invalid printed test date').nullable(),
  measurements: z.array(z.object({ measurement: measurementSchema, printedRange: z.string().max(100).nullable(), printedFlag: z.string().max(100).nullable(), sourcePage: z.number().int().min(1).max(10), uncertain: z.boolean() }).strict()).min(1).max(6),
  issues: z.array(z.enum(['date-missing', 'date-ambiguous', 'value-illegible', 'unit-ambiguous', 'partial-source'])).max(5),
}).strict().refine(value => new Set(value.measurements.map(m => m.measurement.analyte)).size === value.measurements.length, 'Duplicate analyte');
/** Parse only structured data. No tools, URLs, profile mutations or executable actions are accepted. */
export function parseExtraction(json: string, sourcePages: readonly number[]) {
  if (json.length > 24000) throw new Error('Extraction response exceeds the compact result limit.');
  if (!Array.isArray(sourcePages) || sourcePages.length < 1 || sourcePages.length > 10 ||
      new Set(sourcePages).size !== sourcePages.length ||
      sourcePages.some(page => !Number.isInteger(page) || page < 1 || page > 10))
    throw new Error('Supply the actual pages used for extraction.');
  const data = extractionSchema.parse(JSON.parse(json));
  if (data.measurements.some(item => !sourcePages.includes(item.sourcePage)))
    throw new Error('Extraction references a page that was not supplied.');
  if (data.testDate === null && !data.issues.some(issue => issue === 'date-missing' || issue === 'date-ambiguous'))
    throw new Error('Missing date must be reported for review.');
  if (data.testDate !== null && data.issues.some(issue => issue === 'date-missing' || issue === 'date-ambiguous'))
    throw new Error('An unresolved date must remain unknown.');
  return { ...data, status: 'needs-review' as const, confirmed: false as const, clinicalUseAllowed: false as const };
}
export const emptyRulePack: RulePack = { version: 'beta0-unreviewed', sources: [], rules: [] };
