> Current continuation: fixed HTTPS streaming transport, app-owned manager/update UI, offline signing preparation and reviewed public distribution are implemented and tested. Production signing keys, public endpoint and clinically approved content remain absent. See 13-beta0-resumed-implementation.md.

# Signed rule-pack checkpoint — October 6, 2026

## Implemented and tested

The core no longer accepts a caller-supplied signatureVerified boolean. applicableRules requires a process-local verified handle created only after Ed25519 verification against explicitly pinned public keys. The fixed signing domain includes the key identifier and exact UTF-8 payload; the envelope cannot choose its algorithm. Production signing keys are not created or embedded.

Verification rejects unknown/revoked keys, invalid signatures, extra schema fields, oversized payloads, expired or future-issued packs, sequences below the caller's trusted floor, duplicate evidence identifiers, missing source references and impossible provenance timestamps. Underlying verified contents are recursively frozen. Forged or serialized handles cannot confer trust. Expiry is checked again when rules are used, and invalidateVerifiedRulePack removes cached authorization.

Cryptographic authenticity is separate from clinical applicability. Draft/withdrawn rules, missing reviewer approval, unsupported age/pregnancy/context and unpermitted evidence sources remain excluded. The application still ships an empty unreviewed clinical pack.

Implementation: packages/core/src/signedRules.ts, ruleSchemas.ts and evidence.ts. Uses exact @noble/curves 2.4.0 with strict Ed25519 verification. Seven new tests use Node-generated Ed25519 signatures to exercise the portable verifier rather than comparing it only with itself. TypeScript, Expo lint and 55 automated tests pass. Log: artifacts/remote/signed-rules-check.log.

## Remaining integration and external gates

- Connect a rule-pack repository/update lifecycle with atomic persistence of the accepted sequence high-water mark. The current verifier enforces a supplied floor; it does not yet persist that floor or download packs.
- Define pinned production keys, offline signing custody, rotation/revocation distribution and expiry/clock handling. Call cached-handle invalidation whenever trust changes.
- Bind historical assessments to exact approved pack/source versions and surface unavailable/expired context.
- Obtain qualified clinical review and source-use approval before publishing any real rules.
- Complete native runtime/device validation. Successful packaging is not evidence of clinical safety or on-phone execution.

No clinical thresholds or new medical guidance were authored in this increment. Personal-data processing and provider routes remain disabled.


Standalone Android build passed in 2m 56s; signature, bundled JavaScript and manifest gates passed. APK size: 70308578 bytes; SHA-256: 0acbc2008c767e9d56c30c565f77d9949ff76038fe5578db3d297e4a5e2eca14. Physical-device verification remains pending. Backend synthetic health and existing portfolio HTTP 200 verified.

## Durable rule-trust checkpoint — October 6, 2026

- [x] RulePackStore serializes updates and verifies before saving; it activates a candidate only after durable write success.
- [x] Accepted sequence and payload digest persist with the envelope. Older sequences and different payloads reusing an accepted sequence are rejected.
- [x] Policy changes invalidate cached handles immediately. A revocation during an in-progress write cannot activate that pack afterward.
- [x] Restart re-verifies stored packs; expired/revoked packs remain inactive while retaining the rollback floor. Invalid metadata prevents initialization.
- [x] Native SQLCipher repository has a separate rule_trust table and transactional write adapter. Storage schema advances to version 2; personal-state reset and archive restore do not touch rule trust.
- [x] TypeScript/lint, 73 tests and tooling check pass; six new lifecycle cases cover restarts, failed saves, concurrency, revocation, expiry and policy mutation.
- [ ] Wire a single application-owned manager to the trusted update entry point; no production key or update source exists yet.
- [ ] Phone migration/SQLCipher persistence testing, trusted key lifecycle, clinical review and production rule publication.

Core and storage integration source are implemented, but the app does not download or activate clinical packs. Test restarts use repository fixtures; physical SQLite/SQLCipher durability remains device acceptance work. Uninstall or external rollback of the entire device database is outside this local high-water mechanism; a trusted release-provided minimum sequence is still required. Downgrading to an older app that supports only database schema 1 will intentionally refuse this newer database rather than rewriting it.


Durable trust Android checkpoint: BUILD SUCCESSFUL in 3m 43s. APK signature, bundled JavaScript and manifest gates pass. SHA-256: 44d859a27d663ae52057aaf9421335dab5fcdd277384b58350144272a830b585; 70320790 bytes. Evidence: artifacts/remote/rule-store-check.log and rule-store-build.log. Backend synthetic health and portfolio HTTP 200 verified. Phone migration and storage acceptance remain pending.

## Application rule lifecycle checkpoint — October 6, 2026

- [x] The app initializes one rule manager with the opened native repository; browser preview reports missing durable trust rather than creating fake persistence.
- [x] Initialization is shared; damaged rule metadata disables updates without preventing access to personal records.
- [x] Configured refresh calls coalesce into one request, verify/persist through RulePackStore, and preserve the prior valid pack on update failure.
- [x] Shutdown aborts the configured source and invalidates cached authorization. Late responses cannot write; a transaction already underway may finish retaining its sequence floor, but cannot activate after shutdown.
- [x] App cleanup/startup failure closes its manager. Personal reset/restore remains separate from rule trust.
- [x] TypeScript/lint, 105 application tests and tooling regression pass; seven manager tests cover disabled/missing/corrupt storage, shared requests, synchronous failure/retry, malformed/oversized responses, and shutdown races.
- [ ] Implement and review the actual trusted transport with byte/time limits, release pin/rotation/revocation configuration and persistent lifecycle across any future hot reconfiguration.
- [ ] Production signing custody, approved sources, clinical review and physical SQLCipher/runtime acceptance.

Current app configuration contains no production signing pins or update source. No downloads occur, no verified handle is exposed to the assessment UI, and clinical interpretation remains disabled. A valid signature by itself is not clinical approval. RuleUpdateSource is a trusted-configuration interface, not an HTTP transport or a user-selectable URL. This checkpoint does not complete real rule distribution.

Application rule lifecycle Android checkpoint: BUILD SUCCESSFUL in 2m 55s. APK signature, bundled JavaScript and manifest checks pass. SHA-256: e8c235dde6bfa66a1bda75eb4164fbe21d26fefc2a00d2bc019819a13bc75b6d; 70338994 bytes. Logs: artifacts/remote/rule-manager-check.log and rule-manager-build.log. Backend remains synthetic-only; portfolio HTTP 200 verified. Physical device execution and iOS compilation remain pending.
