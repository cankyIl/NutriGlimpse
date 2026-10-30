# Production backend - deployed October 29

Frozen source: releases/backend-production-2026-10-29, revision 0182f18020f57e38cdc399974b45b3d95dd219d0. The production launcher runs against the existing project runtime through GROCERY_RUNTIME_ROOT, not fresh catalogs or keys. Staging used a separate port and consistent database copies; copied staging secrets were removed after shutdown. Fourteen database checkpoint copies passed integrity checks. Fifteen credential/configuration hashes were unchanged. The existing production journal files gained no new records across live calls; old records still expire after seven days.

Only congress-beta-backend.service was restarted. Portfolio, website and other user services remain active. Runtime prompt files match the reviewed release; the approved shopper prompts did not change. Public support/privacy pages, catalog, photo capabilities and selected/no-selected-store location logic pass.

Rollback: the private backend-checkpoint contains the exact former unit, database backups, source/config hashes and service state. Restore the prior unit and restart only the app service if needed; keep current keys and usage, and honor deletion intents before restoring data. The older encrypted build 27 baseline and all build 28 IPAs/source packages remain preserved.


Public privacy wording now describes deployed production behavior and Google project-log expiry of seven days, separately from provider retention and the fictional/public test dataset. Public-fixture checks and no-new-journal evidence are saved in artifacts/appstore-finalization-2026-10-29. App Review submission remains unperformed.
