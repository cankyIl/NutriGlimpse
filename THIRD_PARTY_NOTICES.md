# Licensing and attribution

The root MIT license covers original NutriGlimpse code and original documentation. It does not relicense third-party material, model weights, datasets, source-page archives, or photographs. Existing notices and upstream conditions remain applicable. Dependency versions are pinned in package-lock.json; dependency packages retain their own licenses.

| Material | License / source | Treatment |
| --- | --- | --- |
| Expo template and private-input module template | MIT; existing apps/mobile/LICENSE and module LICENSE | Copyright and license texts preserved. |
| Vendored decode-uri-component patch | MIT; vendor/decode-uri-component/LICENSE | Original author attribution preserved. |
| Food catalog | Open Food Facts ODbL 1.0; USDA CC0 provenance | Catalog attribution, source URLs, per-record provenance and share-alike terms remain in the bundled JSON and catalog exports. The combined catalog is not MIT. |
| Four diagnostic photographs | Three CC BY-SA 4.0, one CC0 1.0 | See ops/shelf-eval/ATTRIBUTION.md and fixtures.json. Exact originals and metadata included. No tester photographs or medical reports are included. |
| ShelfSet / SKU110K / YOLOE integration | Source-specific notices and upstream Ultralytics AGPL-3.0 terms | Notices are preserved beside integrations. Model binaries are not distributed in Git. Model/export deployment clearance remains unresolved; MIT on this project's original wrapper code is not a license for the model or upstream dependency. |
| Guidance | Original summaries with source attribution; underlying sources have their own terms | Raw downloaded HTML/PDF archives are local-only. Retrieval URLs, dates and checksums remain available. No institutional endorsement or clinical validation is claimed. |
| SerpApi location reference | https://serpapi.com/locations | Raw downloaded city list is local-only pending redistribution clarification; optional retrieval helper provided. |
| App artwork | Project artwork and provenance records | Existing bytes and provenance metadata are retained; no rights in depicted third-party marks or endorsement are granted. |

Review the adjacent resource notices before building or distributing native shelf components. The repository license does not resolve conditions for models already present in separately distributed phone builds. No third-party license text has been removed or replaced.
