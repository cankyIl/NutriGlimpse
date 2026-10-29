# Support and deletion procedure

Contact: help@serveforward.us. Do not request a full report, API key, account password or unnecessary health detail. Ask only for device/app build and approximate scan time/time zone. An email address by itself does not identify an anonymous scan; verify a trace using narrowly scoped private operational evidence before acting. Never delete another user's records based only on a guess.

## Records we control

Local app records are reset through Privacy & storage. Exported backups are separate user-owned files and must be deleted wherever saved/shared. Current beta diagnostics and encrypted model answers expire after seven days while their service runs. Production disables new beta journals; legacyJournalExpiry.ts continues pruning existing expired rows every minute without loading encryption keys or creating stores. No bulk deletion of current beta evidence was performed during preparation.

For a verified request trace on the server:

    python3 ops/delete-private-scan.py --root /path/to/NutriGlimpse --trace REQUEST-UUID

Inspect counts only. Then, for an authorized deletion:

    python3 ops/delete-private-scan.py --root /path/to/NutriGlimpse --trace REQUEST-UUID --execute

The helper validates the UUID, ownership and non-symlink paths. It deletes only matching trace rows in the events/responses SQLite tables, uses secure_delete, does not decrypt or print their content, and records a private deletion intent before touching either database. Repeating the command is safe. A partial failure across the two databases must be retried; the operation is not a cross-database transaction. Preserve the private intent ledger outside Git.

The two synthetic helper tests cover preview, execution, unrelated rows, retry/receipt, invalid trace and symlink rejection. Three service tests cover no new stores, expiry after beta-to-production transition, and symlink refusal. These are not claims that arbitrary provider data can be identified or deleted.

## Restores and providers

Before serving traffic from a restored backup, reapply every applicable private deletion intent, prune expired diagnostic records, and preserve current usage counters/keys. Do not overwrite an immutable recovery archive just to pretend deletion is global. The original build 27 restore point excluded expiring shopper diagnostics; any later backup must follow the same exclusion or enforce deletion on restore.

Reset does not delete Google/OpenAI or hosting records already retained. Use the providers' supported privacy/support process for identifiable records and explain any account, retention or legal limits to the requester. Do not promise immediate or universal erasure. Record only necessary case status in the monitored support inbox, and remove unnecessary attachments after resolution. No deletion request was sent externally and no real scan was deleted by this preparation.

## Google test dataset - October 28 owner follow-up

Owner confirms a separate Google AI Studio dataset contains only fictional/public test data and chooses deletion before public launch. Record its deletion confirmation before launch; do not treat7-day project-log expiry as dataset expiry. No dataset identifier/content or Google management credentials were provided, and deletion has not been performed or verified. Do not claim this deletes service-security/grounding records.
