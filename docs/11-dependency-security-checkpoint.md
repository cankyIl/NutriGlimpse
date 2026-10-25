> Current continuation audit: 22 findings (19 high, 3 moderate) after image-picker/location integration. Decoder/UUID tooling regression checks still pass. No clean-audit or real-data release claim; see 13-beta0-resumed-implementation.md.

# Dependency security checkpoint — October 6, 2026

## Applied change

The workspace pins uuid 11.1.1 and explicitly declares the xcode 3.0.1 build tool so npm applies the transitive override consistently. Expo 57 and React Native 0.86 remain unchanged. An override declaration alone was insufficient: npm initially retained uuid 7.0.3. The resolved tree, lockfile and actual xcode consumer now use 11.1.1.

ops/verify-tooling.cjs is part of npm run check. It resolves UUID through xcode, asserts the patched version, generates 1,000 valid unique project identifiers and verifies rejection of an undersized v5 output buffer. This checks the actual consumer and the advisory behavior. It does not constitute an iOS compile.

TypeScript, Expo lint, all 67 application tests and the new tooling check pass. Full workspace npm audit: **22 findings, 19 high and 3 moderate**, down from 30 (19 high and 11 moderate). npm counts affected dependency paths, not only distinct root advisories. This is not a clean security audit.

## Remaining advisory roots

| Package | Finding | Current disposition |
| --- | --- | --- |
| braces 3.0.3 | Nested-pattern stack exhaustion | No published patched version in registry/advisory on this checkpoint. Used by Metro/build tooling. Development server stays loopback-only with SSH access; do not expose it as the public backend. |
| node-forge 1.4.0 | RSA signature-verification parsing weakness | No published patched version in registry/advisory. Used by Expo tooling; APK signing/verification uses Android tooling, and rule verification uses Ed25519 separately. OTA/signing-provider integration is not enabled. This is exposure analysis, not a patch or acceptance of release risk. |
| decode-uri-component 0.2.2 | Malformed-input decoding denial of service | 0.5.0 fixes the issue but is ESM, while the installed query-string consumer requires a callable CommonJS export. A blind override is not API compatible. Needs a tested upstream-compatible router dependency update or maintained compatibility patch, plus malformed-link runtime checks. Remains engineering work. |

UUID advisory: https://github.com/advisories/GHSA-w5hq-g745-h8pq
Braces advisory: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
Forge advisory: https://github.com/advisories/GHSA-86w9-cpqp-85rv
Decoder advisory: https://github.com/advisories/GHSA-vcc3-ghjq-m6fr

Evidence: artifacts/remote/security-install.log, security-check.log, security-audit.json and security-build.log. Registry/advisory status is time-specific and must be rechecked before release. No force downgrade, advisory suppression or claim of complete security acceptance was made.


Security checkpoint validation: BUILD SUCCESSFUL in 3m 50s. Signature, bundled-JS and manifest gates pass. A final npm ci reproduces the patched UUID tree and passes check:tooling. APK SHA-256: 8a5a2234a20489a8476d1a4b8fdf6f0d076baff9eead434e1fa3c4aad1bbcc0f; 70313498 bytes. Device checks remain pending. Loopback-only bindings verified; backend personal uploads false and portfolio HTTP 200.

## URI-decoder compatibility remediation — October 6, 2026

- [x] Added a maintained local patch based on the exact upstream decode-uri-component 0.5.0 npm tarball. SHA-512 download integrity and source SHA-256 are pinned; upstream source and MIT license are retained in vendor/decode-uri-component.
- [x] Postinstall converts the upstream default export to a callable CommonJS wrapper and preserves legacy literal-plus-to-space behavior for query-string 7.1.3. Unknown installed versions/source hashes stop the patch for review.
- [x] Added a fallback bound: above 8,192 characters, valid components use native decodeURIComponent; malformed components stay encoded after plus normalization. This avoids a large dynamic-regex failure observed in the upstream fallback. It is not a global request limit.
- [x] Clean npm ci reproduced the patch. npm run check passes 117 application tests, TypeScript/lint, UUID tooling checks, patch-presence validation and three decoder consumer/parity/resource regression tests. The latter tests exercise the actual Expo Router query-string resolution, 169 mixed-token combinations, a 6,003-character malformed fallback, and 90,003-character malformed/90,000-character valid components in a timeout-bounded child process.
- [x] The development preview service was restarted to discard the previously loaded dependency. Existing portfolio services were not restarted.
- [ ] Physical malformed-link/navigation acceptance on Android/iPhone and eventual replacement with a compatible upstream dependency release.

npm audit still identifies installed decode-uri-component 0.2.2 metadata. This patch does not rename versions, suppress advisories or claim a clean audit; raw findings remain tracked separately. Node-forge and braces advisories remain unresolved. Long malformed components intentionally lose best-effort partial decoding. Remove the local patch once upstream consumer compatibility is available, after repeating consumer and native bundle tests.

Sources: https://github.com/advisories/GHSA-vcc3-ghjq-m6fr and https://github.com/SamVerschueren/decode-uri-component/releases/tag/v0.5.0 .

Decoder remediation Android checkpoint: BUILD SUCCESSFUL in 3m 50s. APK signature, bundled JavaScript and manifest checks pass. Packager source map contains the exact patched decoder including the 8,192-character fallback bound. Browser opens the app with malformed query bytes without a startup error (onboarding redirect observed). SHA-256: 5bc3be328463c039032838febd87fb13fc87e14d53c68cf54c648ebc12332680; 70346110 bytes. Raw audit: 22 findings (19 high, 3 moderate). Evidence: artifacts/remote/decoder-install.log, decoder-check.log, decoder-tooling-final.log, decoder-build.log and decoder-audit.json. Backend synthetic-only and portfolio HTTP 200 confirmed. Physical link navigation and iOS compile remain pending.
