# Public release review - October 25, 2026

**Repository:** cankyIl/NutriGlimpse  
**Reviewed source:** `bb2c9d7da640d1f93effb733de430af68f454f63`  
**Scope:** 694 tracked files, both uploaded commits reachable from main, remote refs, tracked data/media and existing backend controls.  
**Conclusion:** Keep private until the owner chooses the disclosure/history and licensing approach. No credential emergency was found. This review does not change visibility, rewrite history or establish complete legal/security clearance.

## Verified findings

| Area | Evidence | Required or recommended treatment |
| --- | --- | --- |
| Credentials | Gitleaks 8.30.1 scanned both uploaded commits; one finding is the non-secret Apple Issuer ID. No unresolved detected credential. Protected-path audit found no keys, signing material, credential document, runtime database, retained scan responses or model weights in either uploaded tree. | No key rotation is indicated by this review. Keep existing exclusions and repeat the scan after cleanup. Automated detection has limits. |
| Personal contacts | Two project contact addresses occur in seven project files. Six are documentation/history files; one is the backend's provider-contact argument. A separate email in the vendored dependency license belongs to its upstream author. | Redact owner/tester invitation details; move provider contact to private configuration or a deliberately public project contact. Preserve upstream license attribution. |
| Infrastructure and portability | LAN addresses occur in nine documentation files; user-specific filesystem paths occur in 55 documentation files and additional operational/source files. Some other private-network strings are intentional SSRF test fixtures. | Replace deployment-specific examples with placeholders and runtime configuration. Preserve real operations through local configuration; do not blindly replace test addresses, source URLs or stable app identifiers. These paths are not passwords. |
| History | Initial commit still contains the now-untracked mobile assistant instruction file and older personal/operator details. Current tree has no development-assistant directories/instruction files. Only HEAD/main are advertised by GitHub; local tooling refs were not pushed. | A new deletion/redaction commit alone cannot remove old values. To remove them before publication, prepare and verify sanitized history with a private backup and explicit owner approval before updating the shared branch. |
| License clarity | No root project license exists. `apps/mobile/LICENSE` and the private-input module retain an Expo MIT/template notice; the vendored patch has its own notice. Detector notices include separate upstream terms. | Decide whether publication is for viewing or also for open-source reuse. Specify original-code ownership and scope without replacing third-party notices or pretending one license covers all code/data/models. Existing component licenses remain applicable. |
| Product catalog | Bundled catalog has 4,677 records and already carries Open Food Facts ODbL attribution/license link plus USDA CC0 attribution and per-record provenance. | Preserve that data license separately from any application-code license; add a clear root-level third-party/data inventory. Do not relabel the combined catalog as unrestricted MIT code. |
| Other reference data | Government guidance HTML/PDF snapshots and the downloaded SerpApi city list are tracked. The guidance metadata describes snapshots as research evidence; the cities file identifies its source but has no redistribution notice. | Confirm applicable redistribution terms or replace raw archives/data with reproducible retrieval instructions while retaining permitted factual summaries, URLs and checksums. The absence of a notice is not proof that reuse is prohibited. |
| Detector assets | Compiled weights and diagnostic photographs are already excluded from both uploaded commits; integration source, export scripts and notices remain. SKU110K and upstream Ultralytics conditions are still unresolved for unrestricted model distribution. | Continue excluding restricted binaries. Review copied/adapted export code and preserve notices. Public source publication does not itself clear the detector weights already used by phone builds. |
| Image metadata | Seven tracked PNGs have no EXIF/text metadata chunks; the hero retains a provenance chunk. No tracked product/report photographs or runtime user-media files were found by path/inventory inspection. | Preserve provenance and existing artwork records. This was not an exhaustive semantic audit of every binary/document or every possible personal-data format. |
| Live service exposure | Public health and v6 capability GETs return 200 without credentials. Source intentionally sets open-beta access; the latest provider is available. Global bucket defaults to 60 requests, replenishing one per second, with photo concurrency limits and provider-level serialization. The current Gemini/GPT path does not impose a caller identity check or app-enforced cumulative spending ceiling. | Review abuse/spend controls before broadly advertising the repository/service. Existing limits bound bursts, not who can consume paid inference. Public publication increases discoverability of an already-public endpoint; it does not newly create that endpoint. Provider-console/Cloudflare account protections were not audited. Do not reintroduce manual tester keys without the user's approval. |

## Concrete examples for cleanup

- Owner invitation details: `docs/44-expo-cloud-testflight-setup.md:24`, `docs/46-testflight-evening-handoff.md:31` and its historical plan record.
- Provider contact: `apps/service/src/startBeta.ts:40`, `docs/26-open-food-facts-setup.md` and older handoffs.
- Machine-specific paths: `apps/service/src/startBeta.ts:23`, `ops/remote-env.sh`, server unit files and older Mac/setup documents.
- Non-secret signing identifiers/path: `apps/mobile/eas.json:58-60`; optional portability cleanup, not evidence of exposed signing credentials.
- Historical development instructions: `apps/mobile/AGENTS.md` in initial commit `8a47b15`, absent from the current tree.
- Existing licensing/attribution: `apps/mobile/LICENSE`, `vendor/decode-uri-component/LICENSE`, shelf `Resources/*NOTICE.txt`, `apps/mobile/assets/catalog/public-foods.json`.

Raw matching contact values and scanner evidence are retained only under the ignored `artifacts/publication-review-2026-10-25` directory, not copied into this report.

## What the assistant can do

Prepare a sanitized candidate in isolation; parameterize deployment settings with preserved local values; retain all app/backend functionality; add accurate third-party/data notices and clone/setup instructions; separate raw reference snapshots if rights remain unclear; run relevant tests plus history/secret scans; keep the active server, phone builds and side-chat work intact. Prepare a private backup and exact before/after history before requesting approval to replace any shared history. No force push or visibility change has been performed.

## Decisions needed from the owner

1. **Disclosure and history:** Confirm that owner/tester contacts and machine details should be removed from the public version and its history. Recommend retaining the current history privately and publishing a sanitized history. A history rewrite changes commit IDs; existing clones need coordination and remote cached copies may persist. A separate new public repository is an alternative if preserving the original private history is preferred.
2. **Reuse and attribution:** Choose public viewing for now or an open-source reuse license for original code. Confirm the copyright holder when selecting a license; the student contributor is already documented and need not be re-identified. Existing third-party permissions remain separate. Public visibility alone does not make all contents open source.
3. **Paid service exposure:** Decide whether to address automatic abuse/spend controls before public launch or accept the existing open-beta exposure. The assistant can propose controls without requiring manual tester activation. No provider-console permissions or spending limit were changed during this review.

## Evidence and limits

- Repository remained private: authenticated Git access succeeds; unauthenticated repository API returns 404.
- No paid LLM requests, personal-data uploads, service restarts, mobile builds, credential changes, history rewrites or visibility changes occurred.
- This is a targeted publication review of the identified source/history, not a complete penetration test, clinical assessment or legal opinion. Detailed dependency/license compatibility and account-side billing/edge controls remain outside verified scope.
- Existing nutrition accuracy and physical-phone acceptance issues remain in the project plan; public source does not change those statuses.

## Official references

- [GitHub: licensing a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)
- [GitHub: removing sensitive data from history](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Open Food Facts: API reuse conditions](https://support.openfoodfacts.org/help/en-gb/12-donnees-api/94-y-a-t-il-des-conditions-pour-utiliser-l-api) (official search-index excerpt retrieved; direct page fetch failed during review)
- [SKU110K model card](https://huggingface.co/chistopat/sku110k-yolo11-object-detector)
- [Ultralytics licensing](https://www.ultralytics.com/license)
- [NIDDK copyright and exceptions](https://www.niddk.nih.gov/copyright)
- [SerpApi locations reference](https://serpapi.com/locations) (retrieval documentation, not a confirmed redistribution license)
