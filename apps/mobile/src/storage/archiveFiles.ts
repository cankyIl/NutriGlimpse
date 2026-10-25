import type { BetaSnapshot } from '@grocery/core';
export const archivesAvailable = false;
export async function exportData(_snapshot: BetaSnapshot, _password: string): Promise<void> { throw new Error('Use a native build for encrypted file export.'); }
export async function importData(_password: string): Promise<BetaSnapshot | null> { throw new Error('Use a native build for encrypted file restore.'); }
