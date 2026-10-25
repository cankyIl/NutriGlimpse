# Store names and returned-answer diagnostics

October 25, 2026. Backend deployed and checked through public HTTPS. Build 21 is signed, uploaded and Apple VALID / IN_BETA_TESTING in the existing owner group; phone installation/acceptance remain pending. [Release record](83-build21-store-labels-and-diagnostics-release.md).

## User-visible behavior

Each product card shows **Store: Wegmans**, or another named retailer. For the current store only, a supported aisle number and/or section can appear underneath. Stock-status paragraphs and generated missing-stock/aisle boilerplate are removed from this Gemini card view. If Gemini supplies no usable store name, the final card says **Store: Not identified**; during processing it says **Store: Checking…**. Missing retailer information does not erase nutrients or alternatives.

A returned store name is a retailer suggestion. It remains usable without a product-page citation and is not treated as a live inventory assertion. Names for alternatives are kept when they match the current chain or a mapped chain within 15 miles of the selected public store. The existing Massachusetts directory supplies that nearby check; ambiguous/missing anchor data cannot establish an unfamiliar nearby chain. The app does not silently substitute the selected store for an omitted model store. Aisle numbers and names still require matching current-branch source evidence. Other retailers show their name only.

## Exact prompt addition

The approved first-person template, shopper context before the image sentence and Gemini native Google Search remain. The following paragraph was appended:

```text
For each healthier alternative, give me the store name. Prefer my current store; otherwise suggest a nearby store. For my current store, include the aisle name or number if available. Include the retailer product-page link in the structured response.
```

No request for stock counts, stock status or guaranteed availability was added. The full editable prompt is [Gemini-Single-Product-Prompt-Active.txt](Gemini-Single-Product-Prompt-Active.txt). The user draft is preserved.

## JSON contract

Gemini is explicitly requested to return application/json using response_format with a JSON schema. The exact contract is mirrored in [Gemini-Single-Product-Response-Schema.json](Gemini-Single-Product-Response-Schema.json). Top-level product and alternatives use the same food shape: title, nutrition, rating, reasons, uncertainties, source_url, retailer_url, image_url, store and aisle. The phone shows up to three alternatives. Missing numeric values and links remain null, never fabricated zeroes.

- source_url identifies the proposed nutrition source. Returned grounded citations can support source attribution. The existing native Gemini path still displays uncited values explicitly as AI estimates; a URL alone is not proof of nutrient correctness.
- retailer_url is an optional retailer product-page link. Its absence no longer erases a returned store name.
- store is a nullable retailer name. It is independent of retailer_url and has no stock-status field.
- aisle has nullable number, section, store, town, state and source_url. Branch/source fields support validation; only number/section are shown in the product card.
- Package/serving sizes were not restored as required fields. The existing quantity/accuracy limitations remain.

The model returns JSON text in its provider envelope. Streaming parses complete identity/food objects; raw JSON, incomplete numbers and model thoughts are not sent to the phone as display content.

## Bounded missing-store follow-up

When a final alternative still has no usable retailer name and a current store exists, the backend makes at most one additional Gemini-native-Google request for all missing names. It sends only the public product titles/IDs and store name/town/state, with no photo, health/lab context or original rendered prompt. It has a 12-second total bound and no automatic retry. Already returned store names do not trigger this request simply because a citation is absent. Existing streamed product/alternative cards stay visible during the follow-up. Failures preserve the nutrition and alternatives and leave the store unidentified.

The separate editable follow-up is apps/service/prompts/gemini-retailer-followup.txt. Its structured result maps each existing product ID/title to retailer names, optional product links and aisle evidence. Returned identities must match; supported source links must match their retailer domain. Current-store suggestions rank first, then nearby chains. Follow-up usage, search count and latency are recorded separately from the first model request. Native Google chooses its queries; this flow does not claim the retired Serper six-search cap.

## Response journal and privacy

The user requested retention of LLM return data for troubleshooting. New phone consent version scan-answer-diagnostics-2026-10-25.1 explains that returned answers may repeat voluntarily shared health details. Existing saved photo consent must be renewed; the separate choice to share or withhold health details remains. Build 20 and other clients without the new consent flag continue minimal diagnostics only.

For consented v6 product-photo requests, the server keeps the public model answer text, returned citation links, search queries, numeric usage, prompt/schema/adapter hashes, any retailer-follow-up answer, final displayed review and enumerated processing decisions. Malformed/incomplete answers can be retained with their failure code. This lets us distinguish model omissions from adapter decisions. Photos, submitted profiles/lab records, complete rendered prompts, private provider envelopes, hidden reasoning and signatures are excluded. Returned public answers/search queries can nevertheless echo health information, as stated in the notice.

Records use AES-256-GCM with a per-server mode-0600 key, a mode-0700 directory and mode-0600 SQLite file, schema validation and bounded writes. Retention is up to seven days, at most 200 scan records and 40 MiB of encrypted record payload; pruning runs on writes, reads and every minute. Access is through SSH only; no public download route exists. A logging failure must not break a scan. Clearing phone data does not immediately remove this seven-day server journal. The retained v6 Gemini path is covered here; older compatibility routes and shelf scans retain their existing minimal diagnostics, not this new raw-answer journal.

Operator tool: `node --experimental-strip-types ops/read-scan-response.ts --list`, or supply a trace ID; `--full` displays its decrypted public answer and final review only in the authorized SSH session. Older responses cannot be reconstructed retroactively.

## Verification

- Full workspace checks passed: **712 core/service tests**, typechecks/lint, tooling/report/onboarding/news checks. The pre-existing AiProductCard hook warning remains.
- Final photo harness: **68 scenarios** in both timing modes, including named store without citation, no returned store, nearby store, named aisle without number, consent notice and diagnostic request flag. Ten shelf scenarios and iOS JavaScript export pass. Native/network boundaries are mocked in those UI checks.
- New tests cover current/nearby ranking, wrong-state/distant stores, changed identity and ungrounded links, no extra call for an existing store, failed follow-up without losing three alternatives, encrypted round-trip, file permissions, expiry/row/byte bounds, unexpected-input rejection, hidden-reasoning exclusion, old/new consent, malformed output and logging failure isolation.
- Initial public-photo test retained the full answers and showed precisely why link-based gating erased two Wegmans suggestions. The gate was corrected before deployment: retailer suggestions are separate from citations/stock.
- Final deployed HTTPS public cereal test: title **4.999 s**, original card **5.811 s**, first alternative **6.661 s**, second **7.558 s**, final **7.599 s**. Both alternatives retained **Wegmans**. Four native queries; no retailer follow-up. Aisles were omitted because branch evidence was absent. This is one measured run, not a speed/accuracy guarantee.
- The production journal recovered all **3,671 characters** of that public answer, final review and store-suggestion decisions. No personal profile was used in the test. Record trace f929d77d-a3cd-4563-b726-14771b9d280e.
- Only congress-beta-backend restarted (443324 → 455830); main backend, preview and both portfolio services retained their PIDs. Public health and Gemini/GPT compatibility capabilities return HTTP 200.
- Build 21 freezes all **336** prior source files. Exactly seven intended phone/shared files changed; none were removed. Existing news, report/lipid features, artwork, shelf grids/models and camera fixes are preserved.

Evidence: artifacts/retailer-response-journal-2026-10-25/ and artifacts/iphone-build21-retailers-2026-10-25/. Live answer completeness is not exact-label validation; known nutrient/formulation and physical-device acceptance gaps remain open.

## Missing-field behavior — user follow-up

The complete editable table is [Gemini-Response-JSON-Field-Handling-Draft.txt](Gemini-Response-JSON-Field-Handling-Draft.txt). Explicit regressions cover omitted/null/invalid/ungrounded nutrition links without losing original nutrients/rating or three valid alternatives. Missing reasons omit the explanation rather than the rating; malformed/unnamed alternative objects are isolated instead of rejecting the entire answer. Missing nutrition remains unknown and cannot create a health rating. Partial aisle objects cannot fail the whole scan. All 712 core/service tests and full workspace checks pass. This is a backend-only change compatible with build 20/21; the schema description clarifies source_url is optional evidence. The user's prose prompt was not changed again. Only the Beta backend restarted again (455830 → 458602); unrelated service PIDs remained unchanged.
