const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const folder = path.join(root, 'vendor/decode-uri-component');
const manifest = JSON.parse(fs.readFileSync(path.join(folder, 'provenance.json'), 'utf8'));
const source = fs.readFileSync(path.join(folder, 'upstream-0.5.0.js'), 'utf8');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
if (hash(source) !== manifest.sourceSha256) throw Error('Decoder vendor source changed; review provenance.');
const marker = 'export default function decodeUriComponent';
if (source.split(marker).length !== 2) throw Error('Unexpected upstream decoder export.');
const patched = "'use strict';\n// Locally maintained upstream 0.5.0 CommonJS compatibility patch; see vendor/decode-uri-component.\n" +
 source.replace(marker, 'function decodeUriComponent') +
 `
module.exports = input => {
 if (typeof input !== 'string') return decodeUriComponent(input);
 const normalized = input.replace(/\\+/g, ' ');
 if (normalized.length > 8192) {
  try { return decodeURIComponent(normalized); } catch { return normalized; }
 }
 return decodeUriComponent(normalized);
};
`;
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const entries = Object.keys(lock.packages).filter(key => /(^|\/)node_modules\/decode-uri-component$/.test(key));
if (!entries.length) throw Error('Decoder dependency changed; review patch removal.');
for (const relative of entries) {
 const directory = path.resolve(root, relative);
 if (!directory.startsWith(root + path.sep)) throw Error('Unexpected decoder path.');
 const metadata = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
 if (metadata.name !== 'decode-uri-component' || metadata.version !== '0.2.2') throw Error('Decoder version changed; review patch.');
 const target = path.join(directory, 'index.js');
 const actual = fs.readFileSync(target, 'utf8');
 if (actual !== patched && hash(actual) !== manifest.original022Sha256) throw Error('Unexpected decoder source; refusing replacement.');
 if (process.argv.includes('--check')) {
  if (actual !== patched) throw Error('Decoder patch absent; run npm install with scripts enabled.');
 } else if (actual !== patched) fs.writeFileSync(target, patched);
}
console.log('Decoder compatibility patch verified for ' + entries.length + ' installed package(s).');
