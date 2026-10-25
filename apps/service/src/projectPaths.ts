import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
/** Installation root, resolved once; no network or per-request work. */
export const projectRoot=resolve(fileURLToPath(new URL('../../../',import.meta.url)));
