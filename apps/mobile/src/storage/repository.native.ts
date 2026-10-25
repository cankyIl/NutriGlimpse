import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';
import { parseSnapshot, storeDirectorySchema, parseFoodCache, mergeFoodCache, ruleTrustStateSchema, type BetaRepository } from '@grocery/core';

const databaseName = 'grocery-beta0.db';
const keyName = 'grocery-beta0-key-v1';
const keyOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY, keychainService: 'grocery-beta0' };
let connection: Promise<BetaRepository> | undefined;
export const storageDescription = 'Encrypted device database · compact results and preferences';
export function openRepository(): Promise<BetaRepository> {
  if (!connection) connection = open().catch(error => { connection = undefined; throw error; });
  return connection;
}
async function open(): Promise<BetaRepository> {
  // Android SQLite returns an absolute path; File requires a file URI.
  const directory = SQLite.defaultDatabaseDirectory;
  const directoryUri = directory.startsWith('/') ? 'file://' + directory : directory;
  const existing = new File(directoryUri, databaseName).exists;
  let key = await SecureStore.getItemAsync(keyName, keyOptions);
  if (existing && !key) throw new Error('The device storage key is unavailable. Existing data was preserved. Unlock the phone and retry.');
  if (!existing) {
    key = Array.from(await Crypto.getRandomBytesAsync(32), byte => byte.toString(16).padStart(2, '0')).join('');
    await SecureStore.setItemAsync(keyName, key, keyOptions);
  }
  if (!key || !/^[a-f0-9]{64}$/.test(key)) throw new Error('Invalid storage key. Data was not replaced.');
  const db = await SQLite.openDatabaseAsync(databaseName);
  // Expo's exclusive transaction helper opens an unkeyed connection.
  // Key each dedicated connection before BEGIN; never log the key.
  const transaction = async (task: (tx: SQLite.SQLiteDatabase) => Promise<void>) => {
    const tx = await SQLite.openDatabaseAsync(databaseName, { useNewConnection: true });
    let begun = false;
    try {
      await tx.execAsync(`PRAGMA key = "x'${key}'"; PRAGMA secure_delete = ON;`);
      await tx.execAsync('BEGIN IMMEDIATE');
      begun = true;
      await task(tx);
      await tx.execAsync('COMMIT');
      begun = false;
    } catch (error) {
      if (begun) await tx.execAsync('ROLLBACK');
      throw error;
    } finally { await tx.closeAsync(); }
  };
  try {
    // SQLCipher key syntax requires an interpolated literal; only generated 256-bit hex is accepted.
    await db.execAsync(`PRAGMA key = "x'${key}'";`);
    const cipher = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
    if (!cipher?.cipher_version) throw new Error('SQLCipher is unavailable. Install the native development build, not Expo Go.');
    await db.getFirstAsync('SELECT count(*) FROM sqlite_master');
    await db.execAsync('PRAGMA secure_delete = ON; PRAGMA journal_mode = DELETE;');
    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if ((version?.user_version ?? 0) > 4) throw new Error('Storage belongs to a newer app version.');
    if (!version?.user_version) await transaction(async tx => {
      await tx.execAsync('CREATE TABLE IF NOT EXISTS private_state (id INTEGER PRIMARY KEY CHECK(id = 1), payload TEXT NOT NULL); PRAGMA user_version = 1;');
    });
    if ((version?.user_version ?? 0) < 2) await transaction(async tx => {
      await tx.execAsync('CREATE TABLE IF NOT EXISTS rule_trust (id INTEGER PRIMARY KEY CHECK(id = 1), payload TEXT NOT NULL); PRAGMA user_version = 2;');
    });
    if ((version?.user_version ?? 0) < 3) await transaction(async tx => {
      await tx.execAsync('CREATE TABLE IF NOT EXISTS public_food_cache (id INTEGER PRIMARY KEY CHECK(id = 1), payload TEXT NOT NULL); PRAGMA user_version = 3;');
    });
    if ((version?.user_version ?? 0) < 4) await transaction(async tx => {
      await tx.execAsync('CREATE TABLE IF NOT EXISTS store_directory (id INTEGER PRIMARY KEY CHECK(id = 1), payload TEXT NOT NULL); PRAGMA user_version = 4;');
    });
    return {
      storeDirectory:{
        read:async()=>{const row=await db.getFirstAsync<{payload:string}>('SELECT payload FROM store_directory WHERE id=1');return row?storeDirectorySchema.parse(JSON.parse(row.payload)):null;},
        write:async value=>{const payload=JSON.stringify(storeDirectorySchema.parse(value));await transaction(async tx=>{await tx.runAsync('INSERT INTO store_directory(id,payload) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload',payload);});},
        clear:async()=>{await transaction(async tx=>{await tx.runAsync('DELETE FROM store_directory');});},
      },
      publicFoods: {
        read: async () => {
          const row=await db.getFirstAsync<{payload:string}>('SELECT payload FROM public_food_cache WHERE id=1');
          return row?parseFoodCache(JSON.parse(row.payload)):[];
        },
        save: async food => {
          await transaction(async tx=>{
            const row=await tx.getFirstAsync<{payload:string}>('SELECT payload FROM public_food_cache WHERE id=1');
            const payload=JSON.stringify(mergeFoodCache(row?JSON.parse(row.payload):[],food));
            await tx.runAsync('INSERT INTO public_food_cache(id,payload) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload',payload);
          });
        },
        clear: async()=>{await transaction(async tx=>{await tx.runAsync('DELETE FROM public_food_cache');});},
      },
      // Separate from private_state: personal exports/restores/reset never lower the accepted rule sequence.
      ruleTrust: {
        read: async () => {
          const row = await db.getFirstAsync<{ payload: string }>('SELECT payload FROM rule_trust WHERE id = 1');
          return row ? ruleTrustStateSchema.parse(JSON.parse(row.payload)) : null;
        },
        write: async state => {
          const payload = JSON.stringify(ruleTrustStateSchema.parse(state));
          await transaction(async tx => {
            await tx.runAsync('INSERT INTO rule_trust (id, payload) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload', payload);
          });
        },
      },
      read: async () => { const row = await db.getFirstAsync<{ payload: string }>('SELECT payload FROM private_state WHERE id = 1'); return row ? parseSnapshot(JSON.parse(row.payload)) : null; },
      write: async snapshot => {
        const payload = JSON.stringify(parseSnapshot(snapshot));
        await transaction(async tx => { await tx.runAsync('INSERT INTO private_state (id, payload) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload', payload); });
      },
      clear: async () => { await transaction(async tx => { await tx.runAsync('DELETE FROM private_state'); await tx.runAsync('DELETE FROM public_food_cache'); await tx.runAsync('DELETE FROM store_directory'); }); await db.execAsync('VACUUM'); },
    };
  } catch (error) { await db.closeAsync(); throw error; }
}
