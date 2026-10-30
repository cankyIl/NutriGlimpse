# Encryption and privacy-manifest review - October 28, 2026

Current October 29 checkpoint: build 29 verifies the same reviewed dependency patches, eight manifests, ten declared data categories, required-reason APIs and encryption=false. All 282 native inputs match. The production backend now uses the reviewed dependencies. Earlier build28/source audit records below remain evidence; they do not mean cutover or the new archive is still pending. See native-verification.md and ../94-app-store-finalization-2026-10-29.md.

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

No first-party disk-space API use was found; an unused reason was not added. Candidate declares no tracking domains and ten collected-data types matching privacy-answers.md. The old signed 28 root manifest's empty data array was an identified gap and is corrected in source. The final signed 28 archive now verifies all ten collected types and required reasons against source; eight bundled manifests were inspected.

## Native verification and remaining checks

Latest signed 28: source/binary hashes, distribution signature, all eight manifests, ten collected types/reasons, camera/location and linked-SDK motion purpose strings and absence of timing markers are verified; see native-verification.md. The app does not request/use motion or fitness data. Apple accepted corrected build 28 and encryption=false was read back. Production guards pass in both stage configurations. Native simulator setup/restart persistence passes; its encrypted database header and Documents backup-exclusion attribute are checked. Secure-key accessibility and encrypted backup/export/restore on real devices remain acceptance work; simulator evidence is not a substitute.

References: https://developer.apple.com/help/app-store-connect/reference/app-information/export-compliance-documentation-for-encryption and https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/.
