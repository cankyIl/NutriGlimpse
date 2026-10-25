import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { AppState } from 'react-native';
import PrivateInput from '../../modules/private-input';
import { ocrPagesSchema } from '../../../../packages/core/src/inputPrivacy';
import type { PreparedReportSource } from './reportInput';

let activeImport = false;
const supportedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
const maximumBytes = 20 * 1024 * 1024;

/** Specialized authorized report path. The separate general capture gate remains unchanged.
 * No source URI, image, filename, raw bytes or OCR text is sent to a network API here. */
export async function prepareReportSource(kind: 'camera' | 'document', signal: AbortSignal): Promise<PreparedReportSource | null> {
  if (activeImport) throw Error('Finish or cancel the current report import first.');
  if (signal.aborted) throw Error('Report import cancelled.');
  activeImport = true;
  let session: string | undefined;
  let closed = false;
  let picking = false;
  let readUsed = false;
  let nativePending: Promise<unknown> | undefined;
  let pickerPending: Promise<unknown> | undefined;
  let disposal: Promise<void> | undefined;
  const check = () => {
    if (closed || signal.aborted) throw Error('Report import cancelled.');
  };
  const runNative = async <T,>(operation: Promise<T>): Promise<T> => {
    nativePending = operation;
    try { return await operation; }
    finally { if (nativePending === operation) nativePending = undefined; }
  };
  let appStateSubscription: ReturnType<typeof AppState.addEventListener> | undefined;
  const dispose = (): Promise<void> => {
    if (disposal) return disposal;
    closed = true;
    if (session) PrivateInput.cancelSession(session);
    disposal = (async () => {
      // A picker may create its cache copy only when it returns. Keep its native cleanup
      // journal alive until then, even when navigation or cancellation happens first.
      await pickerPending?.catch(() => undefined);
      await nativePending?.catch(() => undefined);
      if (session && !await PrivateInput.disposeSessionAsync(session)) {
        throw Error('Private file cleanup is still running. Close and reopen the app before another import.');
      }
      signal.removeEventListener('abort', abort);
      appStateSubscription?.remove();
      activeImport = false;
    })().catch(() => {
      disposal = undefined; // Explicit dispose/finally can retry. Never log source-specific errors.
      throw Error('Private file cleanup could not finish. Reopen the app before another import.');
    });
    return disposal;
  };
  const abort = () => { void dispose().catch(() => undefined); };
  signal.addEventListener('abort', abort, { once: true });
  appStateSubscription = AppState.addEventListener('change', state => {
    // Android's system document/camera activity backgrounds this app while it is open.
    // Its empty owned session/journal remains; cancellation cleans any eventual picker copy.
    if (state === 'background' && !picking) abort();
  });
  try {
    const createdSession = await runNative(PrivateInput.createSessionAsync().then(id => {
      session = id; // Assign before cancellation can finish waiting for native creation.
      return id;
    }));
    check();
    await runNative(PrivateInput.beginSourcePickerAsync(createdSession));
    check();
    let selected: { uri: string; mime: string; size?: number } | null = null;
    if (kind === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      check();
      if (!permission.granted) throw Error('Camera permission is needed to photograph a report.');
      picking = true;
      const pending = ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: false, exif: false, base64: false, quality: 1 });
      pickerPending = pending;
      try {
        const result = await pending;
        if (!result.canceled) {
          const asset = result.assets[0];
          selected = { uri: asset.uri, mime: asset.mimeType ?? 'image/jpeg', size: asset.fileSize };
        }
      } finally { picking = false; pickerPending = undefined; }
    } else {
      picking = true;
      const pending = DocumentPicker.getDocumentAsync({ type: supportedTypes, multiple: false, copyToCacheDirectory: true });
      pickerPending = pending;
      try {
        const result = await pending;
        if (!result.canceled) {
          const asset = result.assets[0];
          selected = { uri: asset.uri, mime: asset.mimeType ?? '', size: asset.size };
        }
      } finally { picking = false; pickerPending = undefined; }
    }
    check();
    // A system picker may return after the user backgrounds the app; do not begin
    // staging when the earlier background event was intentionally ignored for it.
    if (AppState.currentState === 'background') {
      await dispose();
      throw Error('Report import cancelled.');
    }
    if (!selected) { await dispose(); return null; }
    if (!supportedTypes.includes(selected.mime) || (selected.size !== undefined && (selected.size <= 0 || selected.size > maximumBytes))) {
      throw Error('Choose a JPEG, PNG or PDF report up to 20 MiB and ten pages.');
    }
    const staged = await runNative(PrivateInput.stageSourceAsync(createdSession, selected.uri, selected.mime));
    selected = null;
    check();
    if (!/^sha256:[a-f0-9]{64}$/.test(staged.fingerprint) || !staged.sourceHandle || !Number.isInteger(staged.pageCount) || staged.pageCount < 1 || staged.pageCount > 10) {
      throw Error('The report could not be prepared privately.');
    }
    const ownedSession = createdSession;
    return {
      fingerprint: staged.fingerprint,
      read: async () => {
        check();
        if (readUsed) throw Error('This report source has already been read.');
        readUsed = true;
        try {
          const raw = await runNative(PrivateInput.inspectStagedSourceAsync(ownedSession, staged.sourceHandle));
          check();
          const pages = ocrPagesSchema.parse(raw);
          if (pages.length !== staged.pageCount) throw Error('Some report pages could not be read.');
          return pages;
        } catch {
          throw Error(signal.aborted || closed ? 'Report import cancelled.' : 'The report could not be read clearly. Choose a clearer report or enter its values.');
        } finally { await dispose(); }
      },
      dispose,
    };
  } catch (error) {
    await dispose();
    if (error instanceof Error && ['Report import cancelled.', 'Camera permission is needed to photograph a report.', 'Choose a JPEG, PNG or PDF report up to 20 MiB and ten pages.'].includes(error.message)) throw error;
    throw Error('The report could not be opened privately. Choose a clear JPEG, PNG or unlocked PDF up to 20 MiB and ten pages.');
  }
}
