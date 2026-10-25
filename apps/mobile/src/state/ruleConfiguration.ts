import { createRuleUpdateSource, type RuleTrustPolicy } from '@grocery/core';
// Release-owned public configuration only. Never load trust roots from archives,
// update envelopes, query parameters, remote config, or personal storage.
export const ruleTrustPolicy: RuleTrustPolicy = { keys: {}, revokedKeyIds: [], minimumSequence: 1 };
export const ruleEndpoint: string | null = null;
export function configuredRuleSource() {
 return ruleEndpoint ? createRuleUpdateSource(ruleEndpoint) : undefined;
}
