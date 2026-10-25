import type { LocalInputAdapter } from '../../../../packages/core/src/inputPrivacy';
export const inputAdapter: LocalInputAdapter|null = null;
export async function requestPersonalInput(_kind:'camera'|'document'):Promise<never> {throw Error('Personal capture is disabled.');}
