import { z } from 'zod';
import { conditions, type Condition } from './types.ts';

const token = z.string().min(1).max(100);
export const sourceSchema = z.object({ id: token, title: z.string().min(1).max(300), url: z.string().url().startsWith('https://'), version: token, checkedAt: z.string().datetime(), usage: z.enum(['pending', 'permitted', 'restricted']) }).strict();
export const ruleSchema = z.object({ id: token, version: token, condition: z.enum(Object.keys(conditions) as [Condition, ...Condition[]]), sourceIds: z.array(token).min(1), status: z.enum(['draft', 'approved', 'withdrawn']), reviewedBy: token.nullable(), approvedAt: z.string().datetime().nullable(), minimumAge: z.number().int().min(21), pregnancy: z.array(z.enum(['pregnant', 'not-pregnant', 'unspecified'])).min(1), requiredContext: z.array(token).max(30) }).strict();
export const rulePackSchema = z.object({ version: token, sources: z.array(sourceSchema).max(300), rules: z.array(ruleSchema).max(1000) }).strict();
export type RulePack = z.infer<typeof rulePackSchema>;
