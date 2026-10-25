# US beta: TestFlight release and encryption decision

Updated 2026-10-16T15:13:51+00:00. This records the initial private beta decision, not a public-release approval or a general legal classification.

## User decisions

- Initial testers will all use the app in the **United States**.
- **Retain both shelf detector models**; defer permission/licensing resolution for now.
- Publishing source code is **undecided**. No repository has been published or relicensed, no license purchased and no model owner contacted.

## Encryption inventory and Apple answer

| App use | Implementation verified in source |
|---|---|
| Local database | SQLCipher via expo-sqlite; random 256-bit key stored in iOS Keychain |
| Encrypted backups | AES-256-GCM with scrypt-derived key, random salt/nonce; application records only |
| Network and file protection | HTTPS, Apple Keychain and platform file protection |
| Integrity checks | Standard hash/signature verification, including signed rule verification |

The app includes standard encryption outside Apple's operating system. It does not use a proprietary encryption algorithm. A custom backup JSON layout does not itself make AES a proprietary cipher. Encryption remains enabled.

The Apple declaration inputs examined were: `containsThirdPartyCryptography=true`, `containsProprietaryCryptography=false`, `availableOnFrenchStore=false`. The app description explicitly includes SQLCipher, AES-256-GCM/scrypt and US-only testing. Apple's [documentation table](https://developer.apple.com/help/app-store-connect/reference/app-information/export-compliance-documentation-for-encryption) makes the French document requirement conditional on French App Store distribution. Its [configuration guidance](https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations) permits the false plist flag for encryption exempt from its documentation requirement.

An app-specific declaration-record request returned HTTP 409: records require proprietary cryptography, or third-party cryptography together with French availability. No declaration was created. This matches the documentation requirement for the submitted facts; it is not an approval or an export-classification ruling.

Future app configuration now sets `ios.config.usesNonExemptEncryption=false`. Expo configuration introspection confirms generated `ITSAppUsesNonExemptEncryption=false`. SQLCipher, camera/location descriptions and the original IPA hash are unchanged. Typecheck/lint pass. The existing build now reports **usesNonExemptEncryption=false**, verified through App Store Connect; its missing-compliance status is cleared.

This answer is scoped to the recorded US-only beta. Distribution geography or encryption changes require reassessment. No government report was filed or assertion made that every future export obligation is satisfied. SQLCipher's [own export guidance](https://www.zetetic.net/sqlcipher/export-compliance/) does not transfer the library's classification automatically to an application.

## Retained shelf detectors

These local models locate product boxes on a shelf before OCR/barcode matching. They are separate from the GPT-6 Luna normal-photo flow.

| Resource | Source/publisher | Deferred issue |
|---|---|---|
| ShelfSetDiagnostic | [ShelfSet LLC / Data Science UA](https://github.com/ShelfSet/shelf-object-detector), pinned commit `b1dfbd2f67e38a0ead05d0b653c675569ef8a02a` | Publisher repository uses MIT; upstream YOLO/Ultralytics model terms still need reconciliation for the chosen distribution approach |
| ShelfSKU11Diagnostic | [chistopat model repository](https://huggingface.co/chistopat/sku110k-yolo11-object-detector), revision `ee1b8ac34eb3b68969ffa8165e50c43457fe4e35` | Model card preserves [SKU110K](https://github.com/eg4000/SKU110K_CVPR19) research/data restrictions; no unrestricted redistribution permission established |
| Shared YOLO lineage | [Ultralytics licensing](https://www.ultralytics.com/license) | Source-publication/AGPL or another permitted route is undecided; publishing source alone may not resolve dataset-specific terms |

Existing model notices remain bundled. The user's retention instruction is recorded as a decision to defer licensing, not a claim that permission has been granted.

## Upload and next verification

[Submission](https://expo.dev/accounts/buldygaur/projects/grocery-app-preview/submissions/e95b2ae3-5ba2-419c-a343-82fb173c593f) uses the previously signed build **0.1.0 (1)**. Upload job **FINISHED** at 11:25 a.m. Eastern on October 16. Apple processing is **VALID**. At 11:56 a.m. Eastern, the verified build became **READY_FOR_BETA_TESTING** internally and **READY_FOR_BETA_SUBMISSION** externally. The existing build now reports **usesNonExemptEncryption=false**, verified through App Store Connect; its missing-compliance status is cleared.

The existing upload completed without a retry. Apple accepted and returned the false build-level encryption answer, clearing MISSING_EXPORT_COMPLIANCE. This does not turn the earlier not-applicable declaration request into a general legal ruling. Internal testing eligibility and owner group setup are verified; the owner invitation has been sent, and acceptance/installation remain. External testing awaits Beta App Review submission/approval. Only the account holder has been invited following the explicit request; no external testers or public release. Device testing is still required.

Evidence folder: `artifacts/testflight-release-2026-10-16/`. Key files: `user-release-scope.json`, `prepared-encryption-declaration.json`, `apple-declaration-api-response.json`, `apple-encryption-declaration-result.json`, `release-config-verification.json`, `eas-submit.log`, `eas-submit-status.json`, and `apple-build-status.json`. Credentials stay outside this documentation and source archives.
