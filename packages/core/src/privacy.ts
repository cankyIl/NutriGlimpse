// There is deliberately no runtime flag that can enable personal uploads in this increment.
// Replace this boundary only after V-09/V-10 and actual provider controls pass review.
export const readiness = Object.freeze({ mode: 'synthetic' as const, liveCapture: false, personalUploads: false, clinicalRulesReviewed: false });
export function requirePersonalProcessing(): never {
  throw new Error('Personal processing is unavailable until redaction, retention, and device storage are verified.');
}
