import type { PrivateInputApi } from './PrivateInput.types';
const unavailable = async (): Promise<never> => { throw new Error('Native input processing requires an installed phone build.'); };
const api: PrivateInputApi = { beginSourcePickerAsync: unavailable, stageSourceAsync: unavailable, inspectStagedSourceAsync: unavailable, createSessionAsync: unavailable, cancelSession: () => {}, disposeSessionAsync: unavailable, cleanupInterruptedAsync: async () => {}, createInvalidFixtureAsync: unavailable, createSyntheticPdfAsync: unavailable, createSyntheticImageAsync: unavailable, inspectAsync: unavailable, renderTextAsync: unavailable };
export default api;
