import type { PublicFood } from './publicFood.ts';
import type { comparisonGroups } from './comparisonGroups.ts';

export type ShelfCategoryId = typeof comparisonGroups[number];
export type ShelfRunState = 'scanning' | 'paused' | 'finishing' | 'finished';
export interface ShelfBarcode { value: string; symbology: string }
/** Native OCR text is evidence for a review suggestion, never exact product identity. */
export interface ShelfObservation {
 observationId: string;
 text: readonly { value: string; confidence: number }[];
 barcodes: readonly ShelfBarcode[];
}
export interface ShelfIdentityOption { key: string; food: PublicFood; reason: string }
export interface ShelfIdentityResolution {
 status: 'confirmed' | 'needs_confirmation' | 'unmatched';
 food: PublicFood | null;
 identityMethod: 'barcode' | null;
 options: readonly ShelfIdentityOption[];
 displayName: string;
 reason: string;
 observationFingerprint: string;
}
export interface ShelfCandidate {
 id: string;
 displayName: string;
 status: 'confirmed' | 'needs_confirmation' | 'unmatched';
 food: PublicFood | null;
 identityMethod: 'barcode' | 'user-confirmed' | null;
 options: readonly ShelfIdentityOption[];
 reason: string;
 firstSeenAt: string;
 lastSeenAt: string;
 sightings: number;
}
export interface ShelfRun {
 id: string;
 categoryId: ShelfCategoryId;
 state: ShelfRunState;
 captureEpoch: number;
 createdAt: string;
 updatedAt: string;
 candidates: readonly ShelfCandidate[];
 pendingWorkCount: number;
 capacityReached: boolean;
}
export interface ShelfWorkToken { processNonce: string; runId: string; captureEpoch: number; workId: string }
export interface ShelfSnapshot {
 runs: readonly ShelfRun[];
 activeRunId: string | null;
 capacityReached: boolean;
}
export interface ShelfSessionLimits {
 maxRuns: number;
 maxCandidatesPerRun: number;
 maxCandidatesTotal: number;
 maxPendingWork: number;
 maxStructuredBytes: number;
}
