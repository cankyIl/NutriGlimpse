import { gcm } from '@noble/ciphers/aes.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { parseSnapshot, type BetaSnapshot } from './beta.ts';
import { z } from 'zod';

const options = { N: 32768, r: 8, p: 1, dkLen: 32, maxmem: 64 * 1024 * 1024 };
const context = new TextEncoder().encode('grocery-beta0-archive-v1');
const envelope = z.object({ format: z.literal('grocery-beta0-archive'), version: z.literal(1),
  kdf: z.literal('scrypt-N32768-r8-p1'), salt: z.string().regex(/^[a-f0-9]{32}$/),
  nonce: z.string().regex(/^[a-f0-9]{24}$/), ciphertext: z.string().min(32).regex(/^(?:[a-f0-9]{2})+$/).max(16 * 1024 * 1024) }).strict();
export async function encryptArchive(snapshot: BetaSnapshot, password: string, random: (length: number) => Uint8Array): Promise<string> {
  if (password.length < 12 || password.length > 256) throw new Error('Use a passphrase of 12–256 characters.');
  const plain = new TextEncoder().encode(JSON.stringify(parseSnapshot(snapshot)));
  if (plain.length > 8 * 1024 * 1024 - 16) throw new Error('Archive is too large.');
  let key: Uint8Array | undefined;
  try {
    const salt = random(16); const nonce = random(12);
    if (salt.length !== 16 || nonce.length !== 12) throw new Error('Secure random generation failed.');
    key = await scryptAsync(password, salt, options);
    return JSON.stringify({ format: 'grocery-beta0-archive', version: 1, kdf: 'scrypt-N32768-r8-p1',
      salt: bytesToHex(salt), nonce: bytesToHex(nonce), ciphertext: bytesToHex(gcm(key, nonce, context).encrypt(plain)) });
  } finally { key?.fill(0); plain.fill(0); }
}
export async function decryptArchive(input: string, password: string): Promise<BetaSnapshot> {
  if (input.length > 17 * 1024 * 1024 || password.length > 256) throw new Error('Invalid archive or passphrase.');
  const data = envelope.parse(JSON.parse(input));
  const key = await scryptAsync(password, hexToBytes(data.salt), options);
  let plain: Uint8Array | undefined;
  try {
    plain = gcm(key, hexToBytes(data.nonce), context).decrypt(hexToBytes(data.ciphertext));
    return parseSnapshot(JSON.parse(new TextDecoder().decode(plain)));
  } catch { throw new Error('Wrong passphrase, damaged archive, or unsupported saved data. Nothing was imported.'); }
  finally { key.fill(0); plain?.fill(0); }
}
