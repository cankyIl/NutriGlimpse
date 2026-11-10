# Dependency hardening

Local compatibility patches applied by ops/apply-security-patches.cjs after every install. Original and patched SHA-256 digests are pinned in provenance.json; unknown versions/source fail closed. Package versions remain truthful and npm audit will still flag these versions.

- deepmerge 4.3.1: exclude prototype mutation keys in both target and source enumeration, including nested merges. Patch source, CommonJS and UMD entries. No upstream fixed release was available on October 28, 2026. MIT license retained.
- Zod v3 compatibility entries in 3.25.76 and 4.6.7: stop before traversing an array or set that exceeds its declared maximum/exact size, after recording the original size issue. v3 maps have no maximum-size API. Unconstrained collections are not made bounded by this patch; application request/response limits and schema maxima remain required. First-party runtime code uses upstream-fixed Zod 4.6.7. Expo retains v3 compatibility. MIT license retained.

The upstream v4 size-check fix is https://github.com/colinhacks/zod/commit/a0ebf97. Regression tests exercise actual installed entry points, malicious merge inputs and oversized collection parsing. Remove patches only after verifying upstream fixes and the real consumers.
