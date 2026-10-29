# Release dependency review - October 28, 2026

The isolated release source is remediated and tested. These dependency changes are included in the final signed 1.0 (28) archive and successful simulator compile. They are not yet installed in the public beta backend. Physical-device acceptance remains pending.

| Finding | Completed remediation | Verification |
|---|---|---|
| Zod oversized constrained collection validation | First-party core upgraded from 3.25.76 to upstream-fixed 4.6.7. Migrated record schema and refined-schema access. Retained Expo v3 compatibility entries now reject oversized arrays/sets before visiting elements. | Actual CJS/ESM entries, async arrays, bounded maps in v4, and a 250,000-cell shelf manifest under a 96 MB heap. Unconstrained collections still need application limits. |
| deepmerge prototype poisoning | Hash-pinned patch excludes __proto__, constructor and prototype in target and source, recursively. Source, CommonJS and UMD entries patched; no compatible upstream fix available at review. | Actual runtime consumers, nested target/source poisoning, null-prototype objects, arrays, symbols and custom array merging. |
| node-forge RSA verification advisory | Pinned override upgraded 1.4.0 to 1.4.2. | Clean install and dependency audit no longer flag node-forge. Native Apple signing is not claimed to use this JS library. |
| decode-uri-component malformed-input issue | Existing reviewed CommonJS-compatible decoder replacement and bounded malformed-input guard retained. | Existing actual query-string/router consumer tests continue to pass. |
| Expo SDK patch mismatch | Expo 57.0.31 and compatible SDK57 package patches installed via Expo's alignment command. | Expo Doctor 21/21; clean install, typecheck, UI checks and production Hermes export. |

Postinstall applies decoder and security patches on every npm install/ci. Security patch provenance records original and patched SHA-256, upstream references and MIT notices. Unknown version, source or layout fails installation instead of silently skipping a patch. ops/apply-security-patches.cjs --check verifies all seven patched security entry files.

npm audit --omit=dev still reports **11 version-based entries: 3 high, 3 moderate, 5 low, 0 critical**. These cover the patched decoder/deepmerge/Zod3 versions and their parent dependency chains. We keep truthful package versions: the scanner does not recognize local patches. This is neither eleven independent untreated runtime bugs nor a zero-findings audit. Replace local patches only after testing an upstream fix in the actual consumers.

Evidence in artifacts/app-store-preparation-2026-10-27: dependency-audit-after-security.json, security-clean-install-and-check.log, security-hardening-tests.log, expo-doctor-security.log, production-hermes-security.log, final-security-release-check.log. The final IPA hash6687b560f56a1ef5aebca9b35a9ba34bf0a5d356bad6c92a76d478cf8e1076cb contains these updates; earlier 28 archives are superseded.

References: [Zod advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), [upstream size-check fix](https://github.com/colinhacks/zod/commit/a0ebf97), [deepmerge advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4), [node-forge release](https://github.com/digitalbazaar/forge/releases/tag/v1.4.2), [decoder advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr).
