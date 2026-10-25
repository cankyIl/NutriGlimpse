# Private beta decision diagnostics

Status: implemented and enabled on project-server on October 17, 2026, 8:25 a.m. Eastern. Compatible with the existing TestFlight build 6; no native build or OTA update is required. User explicitly requested backend query/decision logging during beta testing. This supersedes earlier statements that no product-result diagnostics are retained. Raw photo retention remains disabled.

## What is recorded

- Random request ID, timestamp, operation, completion status, safe error code and elapsed time for normal-photo recognition, card-reference-image requests and optional USDA/OFF source checks.
- The recognition model, maximum output size, image-detail setting and hashes of the static prompt and nutrition-rule source. Static prompt/rules are archived privately so later changes do not obscure which rules were used. No uploaded image is archived.
- The identified product's brand/name/variant/visible package size, estimated serving weight and the model's structured nutrient estimates. These remain estimates, not verified label facts. The model rating, independently calculated rating and displayed rating are distinguished.
- All five proposed alternatives where valid: accepted, rejected or unused, with actual branch reason codes. Invalid schema rows get only a rejection code. Examples include missing trans-fat data, category mismatch, duplicate product, a worsened equal-weight nutrient, model/rule disagreement, no meaningful improvement, original already green, unavailable original rating, and no alternatives returned by the model.
- Image lookup query summary, cache/negative-cache outcome, candidate counts, aggregated identity/formulation/image-field rejection reasons, upstream status, timeout/rate-limit/failure and matched public source identifiers. Optional source checks record product identity and returned possible-match identifiers/counts.

These are observable request/response facts and application decisions. They do not expose an LLM's private internal reasoning, establish nutrition accuracy, or explain a visual recognition error from the original pixels (which are not retained).

## Privacy, bounds and access

Private database: `/path/to/NutriGlimpse/.tools/beta-diagnostics/events.sqlite` (0600), in a 0700 directory. Access is through the existing server SSH account. There is deliberately no public diagnostics endpoint, and diagnostics are excluded from reusable catalog exports.

Retention is **up to seven days or the newest 2,000 events**, whichever removes a record first. Expiry runs each minute, on writes, on private reads and at backend startup. Each event is limited to 16 KB; SQLite allocation is capped at approximately 32 MiB. Secure deletion clears deleted SQLite content; this is not a guarantee about external disk snapshots or backups. Do not back up or mirror the private diagnostic database. The operator viewer applies the age limit even if the backend is stopped. Static source/prompt archives contain no scan data and are not subject to the scan-history TTL.

No raw photos, image payloads, EXIF, OCR/visibleText arrays, ingredients/free-form model messages, full provider responses, health profiles, lab values, age, gender, weight, store/location, IP addresses, user/device identifiers, authorization headers, API keys or raw error bodies are passed to the log. Product text is bounded and strips obvious email/URL/token patterns; this is not a general PII-classification claim. Do not photograph personal documents. Product history itself is private, even without an attached tester identity.

Existing photo consent and clinical/privacy gates remain. Before inviting additional testers, explain this beta product-diagnostics retention; include that notice in the next native privacy-copy update. Resetting local phone data cannot identify/delete an unlinked server request; use the short expiry or an operator request using product/time/request ID.

## Reviewing a report

Run on the server after loading `ops/remote-env.sh`:

```sh
node --experimental-strip-types ops/read-beta-diagnostics.ts --product 'Land O Lakes' --limit 100
node --experimental-strip-types ops/read-beta-diagnostics.ts --trace '<request UUID>' --json
```

The first command shows human-readable reasons; JSON also contains the bounded nutrient snapshots. No paid API call is made by the viewer. Keep any manual export private and delete it after investigation.

A request ID is returned as `X-Grocery-Trace-Id`. Existing build 6 does not display or propagate this into subsequent image/source requests. Within one recognition request, transport/decision/completion share the exact ID. Related card requests can be located by product key/name and time; simultaneous scans of the same product cannot be uniquely joined across requests. Do not infer a tester's identity.

Backend image diagnostics establish whether a matching reference URL was supplied, not whether iOS downloaded/rendered the thumbnail. Direct image-download/render failures, local dietary-card filtering and actions that never reach the server still require phone-side diagnostics or tester feedback. Existing local Shelf Camera/barcode/nutrient-table processing is outside this log's scope.

To stop collection after beta: remove/set false `GROCERY_BETA_DIAGNOSTICS` in `ops/run-beta-backend.sh`, then restart only `congress-beta-backend.service`. Existing data must be expired or removed explicitly if the logger will remain off; do not claim it is physically purged while no cleanup process runs. No raw-query blanket logging should be enabled.

## Verification and limits

- Full check passes: **429 core/service tests**, seven tooling tests, ten report-adapter tests, 27 production photo/home component scenarios, workspace typecheck and mobile lint.
- Seven new diagnostics tests cover expiry, restart persistence, file permissions, strict field allowlisting, row bounds, failed logging isolation, request correlation, invalid private inputs, candidate-rejection reasons, upstream image outage/mismatch/cache results and no public diagnostics route.
- **12,000 deterministic boundary/missing-data comparisons** match the pre-change rating and benefit functions. Prompt/model settings, nutrition thresholds, dietary checks and three-alternative cap are unchanged.
- A fictional spread test demonstrates the existing generic green rule: a lower-saturated-fat spread with little fiber/protein remains neutral and is rejected as a green alternative. This explains a possible category limitation; it does not prove the outcome of the owner's earlier unlogged Land O Lakes scan. Category-specific comparison policy is a separate unresolved improvement.
- Deployed HTTPS capabilities, a rejected empty recognition request and a cached reference-image lookup pass. Their private diagnostic records and permissions were verified, public diagnostics access returns 404, public catalog contains no log data, and portfolio returns HTTP 200. No real photo, live model call or budget charge was used for this change; the AI reservation ledger was unchanged during deployment checks.
- Initial Python HTTPS verification could not read the response; Node fetch verification succeeded. This was an operator-check limitation, not an observed mobile/backend outage. A new physical scan with the enabled log is still needed to diagnose the owner's exact case.

Evidence: `artifacts/beta-diagnostics-2026-10-17/` (tests, parity result, deployment verification and source checkpoint). Private scan records stay outside this evidence folder. Existing side-chat changes, including the source-only quiet shutter enhancement, were preserved and were not rebuilt or uploaded.
