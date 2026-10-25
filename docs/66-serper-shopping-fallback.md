# Serper Google Shopping fallback — October 18, 2026

**Status:** Backend deployed; build **0.1.0 (13)** is Apple VALID and available to the existing owner TestFlight group. Physical installation/acceptance is not yet confirmed.
**Project:** /path/to/NutriGlimpse on project-server.
**Plan:** DEV-28 / FB-40.

## What changed

Serper's saved private key existed, but the nearby-availability path only dispatched SerpApi. The new client uses version 2 of the availability endpoint. It tries SerpApi first, preserving the selected-address query, then tries Serper Google Shopping when there is no confirmed local stock/pickup or the first provider fails, times out or reaches its request limit. Confirmed primary stock/pickup skips Serper.

The fallback query contains product brand, name, variant and package size with the nearest canonical city, US country and English language. It does not send photos, OCR text, health profiles, laboratory values, a person's name, exact coordinates or street address to Serper. The primary SerpApi query retains its previously disclosed selected-address/rounded-location behavior.

Results from both providers are combined, ranked and deduplicated to at most three retailer listings **per accepted alternative**. This does not change the separate limit of up to three nutritional alternatives. Brand/variant matching, package-size and multipack checks, safe links, local branch evidence and all existing nutrient/dietary checks remain.

Ordinary Shopping results show **Check location & stock**. Unknown package size remains explicit. A generic product listing, an “in stock” phrase without matching local-branch evidence, or a nearby chain name cannot establish branch inventory. Returned Google Shopping links may open Google rather than a direct retailer page. Provider-reported price/stock must still be confirmed with the retailer.

## Compatibility and bounded operation

- New /v2/availability/search returns schema version 2 and truthful SerpApi, Serper or combined attribution. New mobile footer uses that attribution; Privacy explains the fallback.
- Existing /v1/availability/search remains SerpApi-only with its strict version-1 response. Builds through 12 continue working without mislabeled Serper results. Build 13 is required for the new phone behavior.
- One primary call and at most one fallback, no retry loop. Primary has 10 seconds when fallback is available; fallback has seven seconds within an 18-second overall provider deadline. Server/client deadlines remain 20/22 seconds.
- Independent alternative cards, six concurrent search slots, shared in-flight requests, cancellation isolation, five-minute result cache, short failure cache and bounded response sizes remain.
- Primary's existing request quotas remain. Serper has a separate count-only local ledger and 45/hour guard; no assistant-invented monthly/dollar allowance. Provider spending is user-managed. Raw queries/locations are not persisted in these ledgers.
- Both keys remain server-only, private-file permissions checked. A missing fallback key does not disable primary searches. No new login/account is required.

## Verification completed

- 517 core/service tests; nine tooling tests; ten native-input adapter tests.
- 52 production-screen scenarios with temporary timing enabled and disabled; typecheck, lint and iOS JavaScript export pass.
- Added primary-success suppression, errors/deadlines/quota fallback, preserved primary results after secondary failure, exact matching, unsafe/overlarge responses, cache separation, shared/cancelled requests, old/new HTTP contracts and private-field rejection.
- Public Classico fixture replay accepted matching listings without asserting local stock.
- Bounded live fallback exercise deliberately supplied an empty primary fixture and used the real Serper Shopping service. Three matching retailer listings returned in 875 ms; all remained unconfirmed stock, with missing package size labeled. A repeated call used cache. This is one fixture measurement, not a general latency/coverage claim.
- Deployed public HTTPS request returned SerpApi's product-specific Walmart stock and Target nearby listing; fallback correctly skipped. Cache and old-endpoint private-field rejection verified.
- App health, both photo capability routes and portfolio returned HTTP 200. Only the project's user backend service restarted.
- No paid AI inference, personal photograph or medical data was used.

Evidence: artifacts/serper-fallback-2026-10-18/, including combined checks, live response and verification, public deployment verification, idle/deployment records and before-file snapshots. Provider-reported search credits are not dollar charges.

## iPhone release

EAS build 85e6fca9-c75b-4642-8977-5d61c202395f, version 0.1.0 (13), started from a verified 309-file source archive. Compared with build 12, only the build number, nearby-results footer, Privacy copy, shared client contract and related client test changed. No source removed. Corrected native home-image sizing, all prior side-chat changes, two-model recognition, preview, news, source toggle and shelf detectors are retained.

Release artifacts: artifacts/iphone-build13-2026-10-18/. Native compilation, IPA structure/provisioning/arm64/feature markers, exact bundled artwork, submission and Apple owner-group readiness verified. Linux package inspection does not claim full Apple signature-chain validation; Apple processing separately confirms VALID. No new testers, invitations or OTA update.

Build **0.1.0 (13)**: EAS 85e6fca9-c75b-4642-8977-5d61c202395f; submission e290d16c-d218-4b63-a872-039cae36627e; Apple 1203541c-4d04-41af-955f-dd91ccdbd34d (**VALID / IN_BETA_TESTING**). Existing owner-group access and encryption declaration verified. IPA SHA-256: 868bf1887910d79822c76e7811abc7f90afa25aa29ee4caff233dd530a8e9174.

Owner availability verified at 2026-10-18T18:28:49.097Z. TestFlight release notes verified. External distribution state: READY_FOR_BETA_SUBMISSION; no external beta approval or access is claimed.

## Remaining acceptance

Install build 13 from TestFlight. Scan a product and check each alternative's Find nearby results, correct product/size link, source attribution, store changes and cancellation. Serper improves search coverage; it does not provide an authorized retailer inventory feed or guarantee the selected store has stock. Physical accuracy is not yet verified.

Selected-chain candidate preference (FB-37), repeat-scan recovery (FB-36), shelf AI design and clinical/licensing decisions remain separate open work. This fallback does not implement them.
