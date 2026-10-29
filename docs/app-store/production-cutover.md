# Production backend cutover - prepared, not executed

Build 28 owner testing uses the existing beta backend. Uploading an iPhone binary does not deploy the backend security/privacy changes. This procedure is for the coordinated public-release cutover after device acceptance and review of the remaining release decisions.

## Verified starting point

- The current app service is `congress-beta-backend.service`, started with `ops/run-beta-backend.sh` from the existing project root. It listens on loopback port 3002. Other services and the Cloudflare route must stay unchanged.
- The isolated release checkout already contains `ops/run-production-backend.sh`. It sets production stage and disables new beta answer/decision journals while preserving existing photo consent settings and model routing. Simply setting environment variables on the beta launcher is insufficient: that launcher overwrites the stage and diagnostics flags.
- Two launcher tests pass, including inherited beta flags, explicit report disablement and preserved consent requirements. No production deployment or paid model request was made by those tests.
- The build 27 rollback baseline is preserved. A fresh checkpoint is required immediately before cutover because databases, usage counters, keys, deletion requests and concurrent changes can advance after that baseline.

## Cutover sequence

1. Freeze and review the exact release revision, including dependency lockfile, pinned security patches and source. Reconcile any concurrent changes before promoting it; do not copy an old checkout over the active tree.
2. Capture the current service unit/drop-ins, runtime revision, dependency versions and consistent database backups in private storage. Verify hashes and restore integrity separately. Preserve current secrets and usage accounting. Never put private configuration or scans in Git.
3. Prepare the reviewed release and install its locked dependencies in a separate directory. Verify patches, regressions, privacy declarations and the production launcher. Preserve production data/key paths explicitly; do not silently start with fresh databases.
4. Change only the app service's launch target to the reviewed release's production launcher, retaining its current working/data configuration. Reload and restart only that service. Do not launch a second service on port 3002 or restart portfolio/website/tunnel services.
5. Verify loopback and public health endpoints, support/privacy pages, selected-store and no-store location paths, and a consented public-product single/shelf scan. Observe aggregate usage and response behavior. Confirm no new beta answer/decision journal or photo record is written; confirm legacy records still expire. Avoid logging credentials or raw personal data during the check.
6. Update the policy's planned-production wording only after these deployment checks pass. Include the confirmed Google project-log setting of 7 days; distinguish it from provider service/security retention. Accurately document any retained fictional/public test dataset. Its deletion is an optional owner preference, not an automatic release requirement. Do not mix real shopper requests into that test-only dataset. The support address remains help@serveforward.us.
7. Record deployed revision, configuration fingerprint without secrets, test evidence and rollback pointer in the project plan. Publish the reviewed Apple privacy label and submit the final listing/build only after the owner's final review. Keep the App Store release manual.

## Rollback

If startup, scan compatibility or privacy checks fail, stop only the app service and restore the recorded prior launch target/runtime. Keep current keys and usage counters, and honor deletion intents before any data restoration. If the failed cutover changed data formats, validate a consistent compatible database copy in isolation before switching. Recheck public health and an existing-beta request. Record the failure and the actual restored revision. Restoring a server snapshot does not roll back Apple distribution or phone-local data.

## Acceptance still needed

Actual-phone upgrade/persistence, camera and shelf batches, streaming, permissions/offline/retry and encrypted backup/restore; final product/shelf screenshots and accessibility review; shelf-detector distribution rights or an approved permitted replacement; owner review of listing/privacy/age answers. Native simulator checks and fixture tests do not replace these observations.
