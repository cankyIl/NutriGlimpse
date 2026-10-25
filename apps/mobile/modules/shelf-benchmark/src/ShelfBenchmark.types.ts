import type { NativeSyntheticEvent, ViewProps } from 'react-native';

export type ShelfBenchmarkModelId = 'shelfset' | 'sku110k';
export type ShelfCameraMode = 'benchmark' | 'scan' | 'grid';

export type ShelfBenchmarkAvailability = {
  modelId: ShelfBenchmarkModelId;
  available: boolean;
  reason: 'ready' | 'model_missing' | 'native_module_missing' | 'ios_only' | 'native_device_required' | 'simulator_unsupported' | 'invalid_model';
  modelName: string;
  modelBundled: boolean;
};
export type ShelfBenchmarkStatus = {
  runId: string;
  state: 'loading' | 'permission_required' | 'ready' | 'running' | 'stopped' | 'interrupted' | 'completed' | 'error';
  message: string;
};
export type ShelfBenchmarkMetrics = {
  runId: string;
  elapsedSeconds: number;
  requestedDurationSeconds: number;
  completedFrames: number;
  acceptedFrames: number;
  scheduledSlots: number;
  busyDroppedSlots: number;
  missedCaptureSlots: number;
  cameraDroppedFrames: number;
  skippedCameraFrames: number;
  failedFrames: number;
  detectedBoxes: number;
  latestBoxes: number;
  completedFramesPerSecond: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  latencyMaxMs: number;
  thermalState: 'nominal' | 'fair' | 'serious' | 'critical' | 'unknown';
};
export type ShelfBenchmarkSummary = ShelfBenchmarkMetrics & {
  schemaVersion: 1;
  modelId: ShelfBenchmarkModelId;
  preprocessing: string;
  trueClassCount: number;
  scoreColumnCount: number;
  diagnosticOnly: true;
  licenseStatus: string;
  completedAt: string;
  termination: 'completed' | 'stopped' | 'background' | 'unmounted' | 'camera_interrupted' | 'memory_pressure' | 'error';
  durationComplete: boolean;
  targetFramesPerSecond: 2;
  timingGatePassed: boolean;
  accuracyValidated: false;
  modelName: string;
  modelFingerprint: string;
  modelExportFingerprint: string;
  modelLoadMilliseconds: number;
  inputSize: number;
  predictionMode: 'single-full-frame';
  confidenceThreshold: number;
  iouThreshold: number;
  computeUnits: string;
  prompts: string[];
  appVersion: string;
  appBuildNumber: string;
  buildConfiguration: 'debug' | 'release';
  deviceModel: string;
  operatingSystemVersion: string;
  thermalStatesObserved: string[];
  lowPowerMode: boolean;
  latencyScope: string;
  retainedImages: 0;
  networkRequests: 0;
};
export type ShelfBenchmarkError = {
  runId: string;
  code: string;
  message: string;
  canAskAgain: boolean;
};
export type ShelfScanObservation = {
  observationId: string;
  /** Scheduling hint only. Never use spatial overlap as proof of product identity. */
  trackIdHint?: string;
  rect: { x: number; y: number; width: number; height: number };
  detectorConfidence: number;
  barcodes: { value: string; symbology: string }[];
  text: { value: string; confidence: number }[];
  /** Every OCR interpretation needs confirmation; this flag does not validate barcode checksum/catalog identity. */
  needsConfirmation: true;
};
export type ShelfScanObservationBatch = {
  runId: string;
  sequence: number;
  observations: ShelfScanObservation[];
};
export type ShelfScanState = {
  runId: string;
  state: 'running' | 'stopped' | 'interrupted' | 'error';
  reason: 'started' | 'stopped' | 'background' | 'unmounted' | 'camera_interrupted' | 'memory_pressure' | 'error';
};
export type ShelfNativeGrid = {runId:string;batchId:string;capacity:number;columns:number;rows:number;width:number;height:number;imageBase64:string;cells:{cell:number;packageId:string;revision:number;photo:string}[]};
export type ShelfBenchmarkViewProps = ViewProps & {
  gridCapacity?: number;
  finishRequested?: boolean;
  acknowledgedBatchId?: string;
  onGrid?: (event: NativeSyntheticEvent<ShelfNativeGrid>) => void;
  onGridStatus?: (event: NativeSyntheticEvent<{runId:string;pending:number;total:number;skipped:number;blocked:boolean}>) => void;
  mode?: ShelfCameraMode;
  modelId: ShelfBenchmarkModelId;
  active: boolean;
  durationSeconds: 30 | 300;
  runId: string;
  onStatus?: (event: NativeSyntheticEvent<ShelfBenchmarkStatus>) => void;
  onMetrics?: (event: NativeSyntheticEvent<ShelfBenchmarkMetrics>) => void;
  onObservations?: (event: NativeSyntheticEvent<ShelfScanObservationBatch>) => void;
  onScanState?: (event: NativeSyntheticEvent<ShelfScanState>) => void;
  onComplete?: (event: NativeSyntheticEvent<ShelfBenchmarkSummary>) => void;
  onError?: (event: NativeSyntheticEvent<ShelfBenchmarkError>) => void;
};
