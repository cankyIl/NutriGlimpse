import { z } from 'zod';
import { ed25519 } from '@noble/curves/ed25519.js';
import { hexToBytes } from '@noble/hashes/utils.js';
import { rulePackSchema, type RulePack } from './ruleSchemas.ts';

const envelopeSchema = z.object({
  schemaVersion: z.literal(1), keyId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  payload: z.string().min(1).max(262144), signature: z.string().regex(/^[0-9a-f]{128}$/),
}).strict();
const payloadSchema = z.object({
  schemaVersion: z.literal(1), sequence: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  issuedAt: z.string().datetime(), expiresAt: z.string().datetime(), pack: rulePackSchema,
}).strict();
export type RuleTrustPolicy = {
  // Pins/revocations come from trusted application configuration, never the received envelope.
  keys: Readonly<Record<string, string>>;
  revokedKeyIds: readonly string[];
  minimumSequence: number;
  now?: number;
};
export type VerifiedRulePack = Readonly<{ keyId: string; sequence: number; issuedAt: string; expiresAt: string }>;
const verified = new WeakMap<VerifiedRulePack, RulePack>();

/** Exact UTF-8 payload and key identifier are signed with a fixed domain and Ed25519 algorithm. */
export function ruleSigningBytes(keyId: string, payload: string): Uint8Array {
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(keyId) || payload.length > 262144) throw new Error('Invalid signing input.');
  return new TextEncoder().encode('health-grocery-rulepack-v1\0' + keyId + '\0' + payload);
}
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
/** Verification is deliberately all-or-nothing. A signature is not clinical approval. */
export function verifyRuleEnvelope(json: string, policy: RuleTrustPolicy): VerifiedRulePack {
  if (json.length > 524288) throw new Error('Rule envelope exceeds the size limit.');
  const envelope = envelopeSchema.parse(JSON.parse(json));
  const pinned = Object.hasOwn(policy.keys, envelope.keyId) ? policy.keys[envelope.keyId] : undefined;
  if (!pinned || !/^[0-9a-f]{64}$/.test(pinned) || policy.revokedKeyIds.includes(envelope.keyId)) throw new Error('Untrusted rule signing key.');
  if (!Number.isSafeInteger(policy.minimumSequence) || policy.minimumSequence < 1) throw new Error('Invalid rule sequence floor.');
  const now = policy.now ?? Date.now();
  if (!Number.isFinite(now)) throw new Error('Invalid verification clock.');
  const bytes = ruleSigningBytes(envelope.keyId, envelope.payload);
  if (bytes.length > 262300 || !ed25519.verify(hexToBytes(envelope.signature), bytes, hexToBytes(pinned), { zip215: false }))
    throw new Error('Invalid rule signature.');
  const body = payloadSchema.parse(JSON.parse(envelope.payload));
  const issued = Date.parse(body.issuedAt); const expires = Date.parse(body.expiresAt);
  if (issued > now || expires <= now || expires <= issued) throw new Error('Rule validity interval is not current.');
  if (body.sequence < policy.minimumSequence) throw new Error('Rule rollback rejected.');
  const { pack } = body;
  const sources = new Map(pack.sources.map(source => [source.id, source]));
  if (sources.size !== pack.sources.length || new Set(pack.rules.map(rule => rule.id)).size !== pack.rules.length)
    throw new Error('Duplicate evidence identifiers.');
  if (pack.sources.some(source => Date.parse(source.checkedAt) > issued) ||
      pack.rules.some(rule => (rule.approvedAt !== null && Date.parse(rule.approvedAt) > issued) ||
        rule.sourceIds.some(id => !sources.has(id))))
    throw new Error('Invalid rule evidence provenance.');
  const handle = Object.freeze({ keyId: envelope.keyId, sequence: body.sequence, issuedAt: body.issuedAt, expiresAt: body.expiresAt });
  verified.set(handle, deepFreeze(pack));
  return handle;
}
/** Only handles produced in this process are accepted; serialized or caller-forged flags cannot confer trust. */
export function verifiedRuleContents(handle: VerifiedRulePack | null, now = Date.now()): RulePack | null {
  if (!handle || typeof handle !== 'object' || !Number.isFinite(now) || Date.parse(handle.expiresAt) <= now || Date.parse(handle.issuedAt) > now) return null;
  return verified.get(handle) ?? null;
}

/** Call when trusted key policy changes or a cached pack is superseded. */
export function invalidateVerifiedRulePack(handle: VerifiedRulePack): void {
  verified.delete(handle);
}
