# Running your own NutriGlimpse checkout

Use Node.js 24 and npm, plus Python 3 for checks. Run `npm ci`, `npm run check`, and `npm run service` from the checkout root. The basic local service listens on loopback and does not require paid provider keys.

## Provider configuration

Provider credentials are local-only and never included in Git. Use an interactive terminal and the relevant helper: `python3 ops/setup-gemini-key.py`, `python3 ops/setup-openai-key.py`, `python3 ops/setup-anthropic-key.py`, or `python3 ops/setup-usda-key.py`. These helpers keep existing keys and write private files under `.tools`. Never place provider credentials in mobile config or `EXPO_PUBLIC_*` variables. Review each provider's billing/data terms before enabling calls. Existing provider enablement and consent gates are unchanged.

The optional `GROCERY_PROVIDER_CONTACT` environment variable is a public API contact, not a key. The beta service prefers the existing private Open Food Facts `contactEmail` so established installations send the same contact. See `.env.example`; it is a reference file, not an automatically loaded dotenv configuration. See `26-open-food-facts-setup.md` for the complete OFF configuration, including attribution/share-alike acceptance. Substitute your own contact and publication endpoint when adapting that integration.

## App endpoint and deployment

This cleanup deliberately preserves the current app endpoint and its validation rules. A fork must change `packages/core/src/catalogClient.ts` (`betaCatalogUrl`) and the store-directory URL in `packages/core/src/storeDetection.ts`, then review publication/source URLs and endpoint validation in the OFF configuration. These are not environment-configurable yet. Do not assume a downloaded build points to your server or that the project backend is a free hosted service. Backend app verification remains deferred by the owner.

Backend and operations helpers resolve their checkout directory instead of depending on the original developer's machine path. The three systemd units are examples using `%h/NutriGlimpse`; edit those paths to match your checkout before installing them. Existing deployed units are unchanged. `ops/remote-env.sh` points to optional locally provisioned tool versions; install your own tools or adjust those paths. Native iPhone builds need your own Apple/Expo signing setup and identifiers. The checked-in EAS submission key path is relative to `apps/mobile`; it contains no key.

## Optional reference downloads

`python3 ops/restore-reference-data.py --guidance` restores historical source snapshots only when their bytes still match the recorded checksums. Changed upstream pages are refused; obtain the authorized historical snapshot or create a new reviewed version rather than changing a checksum to bypass validation. The published guidance JSON used by the app remains bundled unchanged.

`python3 ops/restore-reference-data.py --cities` retrieves the public SerpApi location list and selects US city locations for local use. It does not call a paid search API. Reference files remain ignored by Git. Review upstream terms for your use. Existing deployments keep their exact original data files; this helper never silently overwrites them. Historical snapshot checksums are listed in `Reference-Downloads.json`.

## Shelf assets and diagnostics

The four licensed diagnostic photographs are included with original metadata and attribution. Model weights remain external; provision authorized copies using `Repository-External-Assets.sha256` and the resource notices. A source clone alone is not a fully provisioned native shelf build. Existing installed models are not changed by publication cleanup.

## Limitations

This is an experimental grocery comparison app. AI nutrition values, product identity, alternatives and store/aisle information can be incomplete or incorrect. Known quality and physical-device acceptance work remains in the project plan. General food guidance is not clinical validation or personalized medical advice. Student contributions and AI assistance remain documented in the competition materials.
