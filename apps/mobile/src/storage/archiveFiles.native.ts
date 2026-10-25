import { File, Paths, Directory } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as Crypto from 'expo-crypto';
import { encryptArchive, decryptArchive, type BetaSnapshot } from '@grocery/core';
export const archivesAvailable = true;
const scratch = () => new Directory(Paths.cache, 'grocery-encrypted-exports');
export async function exportData(snapshot: BetaSnapshot, password: string): Promise<void> {
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this phone.');
  const folder = scratch();
  if (folder.exists) folder.delete();
  folder.create();
  const file = new File(folder, 'grocery-beta0.encrypted.json');
  try {
    const encrypted = await encryptArchive(snapshot, password, Crypto.getRandomBytes);
    file.write(encrypted);
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save encrypted backup' });
  } finally { if (folder.exists) folder.delete(); }
}
export async function importData(password: string): Promise<BetaSnapshot | null> {
  // Read the user-selected source in place: never create a plaintext app copy.
  const selection = await DocumentPicker.getDocumentAsync({ type: 'application/json', multiple: false, copyToCacheDirectory: false });
  if (selection.canceled) return null;
  const file = new File(selection.assets[0].uri);
  if (file.size > 17 * 1024 * 1024) throw new Error('The selected archive is too large.');
  return decryptArchive(await file.text(), password);
}
