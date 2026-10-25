# Publication cleanup - October 25, 2026

The owner authorized the publication cleanup, MIT licensing of original code, inclusion of diagnostic photographs and retention of image metadata. App verification and restrictions on use of the hosted paid backend remain explicitly deferred. Public GitHub visibility is a separate repository setting; this checkpoint does not claim it was changed.

## Completed source changes

- Private owner/tester and provider contact addresses replaced in published source/docs. The provider uses the same existing private OFF contact configuration on the live server. Upstream license author addresses and student attribution are preserved.
- Personal usernames, LAN addresses and machine paths removed from operational examples. Runtime/operations project paths resolve from their installed file location; installed service units and their running processes are unchanged. An SSRF fixture still uses a private-range address unrelated to the operator network.
- MIT license for original NutriGlimpse material, with copyright credit to Viraank Gaur and contributors. Existing upstream license texts are unchanged. Root third-party/data notices explain the separate catalog, photo and model terms.
- Four licensed diagnostic originals included, unchanged including metadata, with CC BY-SA/CC0 credits and checksum verification. No tester scan, lab report, provider response journal, database or credential is included.
- Nine raw reference downloads removed from version control: eight government source-page/PDF snapshots and the downloaded city list. Their exact live-server copies remain in place. Provenance/checksums and explicit retrieval/validation instructions are provided. The published app guidance and 4,677-food catalog remain unchanged.
- Model binaries remain external, with resource licenses and export/integration source preserved. Model redistribution clearance is not claimed and is not solved by the root MIT license.
- Private backup of all original Git history retained outside tracked files. Publication history is sanitized to remove private contact/machine details, the old assistant instruction file and the excluded raw reference downloads. Original commit IDs change; other clones must use the cleaned history and must not merge/push the private backup. Any pre-existing third-party copies or GitHub cache retention cannot be controlled by a Git rewrite.

## Verification

- Full `npm run check`: TypeScript, lint, 740 core/service tests, nine tooling tests, ten native-input adapter tests, 70 photo UI scenarios, onboarding/needs scenarios, eleven news tests and news UI checks passed.
- Eight focused Python packaging/provenance/reference-restoration tests passed; source evidence validation covered eight original snapshots, 26 guidance entries and 128 serving-table cells. Ten shelf UI scenarios passed.
- 181 phone/shared runtime and prompt files are byte-identical to the baseline. Artwork bytes/provenance, detector weights, private reference data and existing backend access/provider settings are preserved. Root path resolution is performed once at module load; no new model calls, searches or per-request network steps were added.
- A targeted relocation test verifies that the backend follows its checkout rather than the caller's working directory or the previous machine path. Python/shell syntax and operational root resolutions were checked.
- Final secret scans cover cleaned source and all reachable publication history. The known Apple Issuer ID is a public identifier, not a credential.

No TestFlight build, service restart, paid model request, credential rotation or backend access-policy change is part of this cleanup. No new on-device latency measurement is claimed; the running service and installed phone build were not replaced.

## Remaining boundaries

The hosted backend remains open beta by owner decision. The source still contains its endpoint; `SELF-HOSTING.md` identifies the changes a fork needs to use its own server. Automated app verification and environment-configurable mobile URLs are not implemented here. Clinical review, real-device acceptance and nutrition quality work remain in the implementation plan. Model distribution clearance remains a separate issue for compiled releases.
