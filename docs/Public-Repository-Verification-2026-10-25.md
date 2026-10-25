# Public repository verification - October 25, 2026

The owner changed [cankyIl/NutriGlimpse](https://github.com/cankyIl/NutriGlimpse) to public. Anonymous HTTPS access and a fresh credential-free clone of `main` both succeeded. GitHub reports `private: false`, `visibility: public` and recognizes the MIT license.

## Verified

- Reviewed source checkpoint: `bd741718eab975c0a106e3308570177ce50d0634`. All 701 tracked files in the anonymous clone matched the authoritative checkout byte for byte.
- README rendered with the NutriGlimpse tagline and MIT license. All 15 checked repository-relative links in the entry documents resolved.
- No credential files, excluded local configuration, developer-harness directories or excluded model binaries were found in the clone. The cleanup's full reachable-history scan remains applicable to this unchanged source checkpoint; it detected no unresolved credentials.
- One branch (`main`), no tags, no pull requests and no forks were returned by the public API at verification time. No GitHub Actions runs or packaged GitHub releases existed. This does not prevent source downloads; it does mean GitHub is not independently reporting a CI build or hosting an installable app release.
- The previous cleanup's complete test results are recorded in [Publication-Cleanup-2026-10-25.md](Publication-Cleanup-2026-10-25.md). This access check did not rerun those tests or claim a new native build.

## Remaining historical-data issue

A removed, pre-cleanup commit was still accessible anonymously through GitHub's commit API and a raw-file URL. That old file still contains the removed owner contact address. It is absent from the current files and ordinary branch history, but rewriting `main` did not remove GitHub's retained object/cache.

Exact affected identifiers and evidence are kept in the private verification artifacts, together with a ready-to-submit support request. The repository owner can ask [GitHub Support](https://support.github.com/) to remove retained sensitive data. [GitHub's instructions](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) explain that support eligibility depends on sensitivity; removal of contact information is not guaranteed. No support message has been sent, and removal has not been verified.

The existing hosted-backend access policy and detector redistribution questions remain as documented in the cleanup. This verification makes no runtime, credential, deployment, repository-visibility or license changes.
