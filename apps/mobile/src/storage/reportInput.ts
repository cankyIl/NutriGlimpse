import type { OcrPage } from '../../../../packages/core/src/inputPrivacy';

export type PreparedReportSource = {
  /** Exact-source identity, kept on device. Never include in an analysis request. */
  fingerprint: string;
  /** Single local OCR pass; raw text is transient and must enter the allowlist immediately. */
  read(): Promise<OcrPage[]>;
  dispose(): Promise<void>;
};
export async function prepareReportSource(_kind: 'camera' | 'document', _signal: AbortSignal): Promise<PreparedReportSource | null> {
  throw Error('Report import requires the installed iPhone or Android app.');
}
