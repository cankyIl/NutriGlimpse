# NutriGlimpse GitHub repository

**Prepared:** October 25, 2026, America/New_York  
**Owner:** `cankyIl`  
**Target:** `https://github.com/cankyIl/NutriGlimpse`  
**Initial visibility:** Private; owner now intends public publication after cleanup  
**Status:** Connected on `main`. The initial private setup is historical; [publication cleanup](Publication-Cleanup-2026-10-25.md) records the current MIT/privacy/history treatment.

## Project-specific connection

Development remains at `/path/to/NutriGlimpse` on project-server. The laptop is an interface/document mirror. GitHub stores the versioned source; this setup does not migrate the backend, deploy code, upload an iPhone build or authorize public access.

Only this repository's `.git/config` is configured:

- Remote `origin`: `git@github.com:cankyIl/NutriGlimpse.git`
- Branch: `main`
- Commit identity: `cankyIl <263544697+cankyIl@users.noreply.github.com>`
- A dedicated Ed25519 deploy key, with explicit identity selection and host verification. Other projects' remotes, Git identities and global authentication are unchanged.
- GitHub's host keys were obtained from its official HTTPS metadata API and pinned in a project-private known-hosts file. The private deploy key remains under the ignored `.secrets/github` directory.

The public-key fingerprint is `SHA256:VZxrWcz4QHICNQgIRMwGl1wC0UWVqHYn1qi3nu6yITM`.

## One-time owner action - completed October 25

1. Sign into GitHub as **cankyIl** and create a **Private** repository named **nutriglimpse**. Do not initialize a README, .gitignore or license; these sources already exist.
2. Open repository **Settings > Deploy keys > Add deploy key**.
3. Title it **NutriGlimpse server**, paste the public key supplied with this handoff, and enable **Allow write access**.
4. Tell the assistant when saved. It will check authenticated access and visibility before pushing, then verify the remote commit.

The public key is shareable. Never paste a private key, Google password, GitHub password or access token into chat. A deploy key applies only to the selected repository. It supports Git pushes/pulls; it does not provide GitHub API access for creating pull requests, administering collaborators or managing issues.

## Included and excluded

Included: mobile/backend/shared source, tests, approved prompt templates, setup scripts, current documentation, versioned catalog/reference data, app artwork and existing third-party notices.

Excluded and preserved on the server: `.secrets`, `.env` files, `docs/AppleCredentials`, signing keys/certificates/profiles, machine tooling/caches, generated native projects, databases, retained diagnostics, artifacts/installers and separately managed shelf model binaries and raw reference downloads. Git/source-package/cloud-archive exclusions now also omit development-assistant metadata. Native model asset provisioning and application behavior are unchanged.

The initial source snapshot was scanned with **Gitleaks 8.30.1**, obtained from its official GitHub release and checked against the published SHA-256 manifest. Its only initial finding was the non-secret Apple App Store Connect Issuer ID in `apps/mobile/eas.json`; reviewed supplemental matches were deliberately fake test credentials/URLs. Final index scan and commit evidence are stored in the ignored `artifacts/github-private-setup-2026-10-25` directory. This is a bounded source review, not a guarantee that every possible secret format can be detected.

## Reproducing native shelf resources

Detector integration code, metadata and existing license notices are versioned. Binary weights remain separately provisioned because their redistribution/permission decisions remain unresolved. The four documented Creative Commons diagnostic photographs are now included unchanged with attribution and metadata. An absent model fails closed in the native module; cloning alone is not a complete shelf-camera installation.

The exact currently provisioned asset paths and SHA-256 values are in `Repository-External-Assets.sha256`. Obtain authorized copies from the existing controlled project workspace, restore them at those relative paths, then run from the repository root:

```sh
sha256sum --check docs/Repository-External-Assets.sha256
```

Do not fetch an arbitrary similarly named model or silently substitute weights. Review the preserved ShelfSet, SKU110K and Ultralytics notices and the release/licensing record in `45-testflight-release-and-encryption.md` before any wider distribution.

## Public release remains separate

The owner selected MIT licensing for original project code and authorized publication cleanup. Existing third-party notices remain intact; model permissions are not declared resolved. The history/contact cleanup and data treatment are documented in Publication-Cleanup-2026-10-25.md. Git visibility itself requires a repository administrator; the deploy key only grants Git read/write access.

## Normal updates

Review changes and run relevant checks before commits. Push only reviewed source to this repository. Keep secrets/runtime files excluded. A Git push does not deploy the backend or publish an iPhone build; those remain explicit release steps. Another project can use a separate repository and deploy key under a different account.

## Initial source checkpoint

The first private-source snapshot contains 694 files (about 18.2 MB uncompressed). Exact staged-source scanning found no unresolved detected credentials; the single Gitleaks finding is the reviewed public Apple Issuer ID. The existing operational source was not changed. The owner completed repository creation and key authorization. Initial commit `8a47b1591be2e56741cd6fce15825cc91cb33967` was pushed and matched the remote branch. Authenticated Git access succeeds and the unauthenticated GitHub API returns 404, consistent with the owner-selected private visibility.

## Tool-neutral source - October 25

The initial upload contained no `codex` or `.codex` directory. On the user's follow-up, the current tree also removes the tracked `apps/mobile/AGENTS.md` instruction file while keeping the server-local copy. Ignore rules exclude assistant directories and instructions at any depth, including Codex, Claude, Cursor and Gemini development state. No account-wide settings were changed.

Source packaging no longer explicitly includes the assistant instruction file; source-package discovery and build provenance ignore development metadata. The archive helper also excludes the existing `docs/AppleCredentials` operator file. Five focused packaging/provenance tests pass, and a real-tree package-input audit found no development metadata or that credential document. These changes do not alter mobile/backend runtime code, app prompts or deployed builds.

The app's intentional Gemini/OpenAI integrations remain application features. Historical design/release records can still mention tools used during development; those mentions do not create a runtime dependency. The original history was privately backed up; the publication history removes the first snapshot's assistant instruction file. There was no Codex directory in that snapshot.
