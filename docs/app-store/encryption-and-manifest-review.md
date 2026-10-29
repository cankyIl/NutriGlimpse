# Encryption and privacy-manifest review - October 28, 2026

## Source inventory

| Use | Implementation | Release implication |
|---|---|---|
| Network transport | HTTPS through platform networking | Standard transport encryption; not the app's only cryptography |
| Device database | Expo SQLite with useSQLCipher:true; generated 256-bit database key stored using platform secure storage | Encrypted local storage must be tested in the rebuilt binary |
| User-exported backup | @noble/ciphers AES-GCM with 256-bit key; scrypt derivation N32768/r8/p1 | Bundled implementation of standard encryption, not just Apple OS HTTPS |
| Rules/integrity | Signature/digest verification | Integrity/authentication use; keep provenance and verification tests |
| Server diagnostic records | Server-side authenticated encryption, beta only | Not an additional client export algorithm; remains relevant to retention disclosures |

No proprietary/custom cryptographic algorithm was found in the inspected first-party source. Existing usesNonExemptEncryption=false is retained from the US-only beta; a final signed-binary/export answer review remains required. Do not describe the app as using only OS encryption. Apple's current documentation says an industry-standard algorithm outside the OS calls for a French declaration only when distributed in France. This release is US-only, and no France distribution is being enabled. That documentation is not a blanket determination of every applicable export obligation.

## Required-reason APIs

| Category | Reasons in candidate | Evidence |
|---|---|---|
| FileTimestamp | C617.1, 3B52.1 | App-owned file metadata and user-selected document/archive file metadata |
| UserDefaults | CA92.1 | App's own preferences/settings |
| SystemBootTime | 35F9.1 | Elapsed intervals within the app/runtime |

No first-party disk-space API use was found; an unused reason was not added. Candidate declares no tracking domains and ten collected-data types matching privacy-answers.md. The old signed28 root manifest's empty data array was an identified gap and is corrected in source. The final signed28 archive now verifies all ten collected types and required reasons against source; eight bundled manifests were inspected.

## Native verification and remaining checks

Final signed28: source and binary hashes, distribution entitlements/signature, all eight manifests, collected types/reasons, camera/while-in-use-location purpose strings and absence of temporary timing markers are verified; see native-verification.md. Production onboarding/debug-route guards pass in both stage configurations. Backup-exclusion behavior, secure-key accessibility and encrypted database/backup round trips on real devices remain acceptance work. Do not infer these from codesign or simulator compilation.

References: https://developer.apple.com/help/app-store-connect/reference/app-information/export-compliance-documentation-for-encryption and https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/.
