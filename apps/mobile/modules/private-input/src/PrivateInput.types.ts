export type OcrLine = { id: string; text: string; x: number; y: number; width: number; height: number; confidence?: number };
export type OcrPage = { page: number; width: number; height: number; lines: OcrLine[] };
export type StagedReportSource = { sourceHandle: string; fingerprint: string; pageCount: number };
export interface PrivateInputApi {
  beginSourcePickerAsync(id: string): Promise<void>;
  stageSourceAsync(id: string, uri: string, mime: string): Promise<StagedReportSource>;
  inspectStagedSourceAsync(id: string, sourceHandle: string): Promise<OcrPage[]>;
  createSessionAsync(): Promise<string>;
  cancelSession(id: string): void;
  disposeSessionAsync(id: string): Promise<boolean>;
  cleanupInterruptedAsync(): Promise<void>;
  createInvalidFixtureAsync(id: string, kind: 'empty' | 'corrupt' | 'oversized'): Promise<string>;
  createSyntheticPdfAsync(id: string): Promise<string>;
  createSyntheticImageAsync(id: string): Promise<string>;
  inspectAsync(id: string, uri: string, mime: string): Promise<OcrPage[]>;
  renderTextAsync(id: string, page: number, lines: string[]): Promise<string>;
}
