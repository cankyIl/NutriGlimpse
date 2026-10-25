> Active development has moved to project-server at /path/to/NutriGlimpse/. See [remote operations](docs/07-remote-development.md). The laptop copy is a recovery snapshot.

Latest Shelf Scan design: [detailed implementation specification](docs/26-shelf-scan-implementation-spec.md), October 14, 2026. Recommends shared TypeScript plus native Swift iPhone capture/preprocessing, with explicit physical-iPhone acceptance. The authorized YOLOE recovery test is complete and rejected; two shelf-specific candidates are prepared for device comparison. See the [decision and evidence](docs/31-shelf-recovery-and-detector-decision.md). The complete feature and physical-iPhone performance are not yet verified.

# Congressional App Challenge — implementation workspace

**Version:** 0.16 — implementation handoff baseline  
**Date:** October 5, 2026  
**Stage:** Beta 0 development in progress. Synthetic product, receipt and report workflows are runnable; the complete app is not finished.

Track current tasks, status and dependencies in the [Beta 0 Implementation Project Plan](docs/ImplementationProjectPlanDocument.md).

## Run and review

Requires Node.js 24 and npm. From this directory:

```powershell
npm.cmd ci
npm.cmd run web
npm.cmd run check
```

The browser preview uses the same React Native screens as the mobile app. It is a development review surface, not the later production website. Start the optional local fixture service with `npm.cmd run service` (loopback port 3001). The preview currently uses an in-process fixture adapter and does not need that service.

Implemented: warm ivory/forest visual system, scan-first navigation, sample product confirmation, explicit uncertainty, portion calculations, expandable evidence, sample alternatives, session history, sample needs and retailer/radius selection. Branding remains open for a separate discussion. “Grocery App Preview” is an engineering label only.

Synthetic receipt matching and report confirmation now save compact results to history. Native builds have SQLCipher/SecureStore repository code and encrypted archive export/restore controls; these require device verification. The browser remains memory-only. Real capture, OCR, clinical analysis, OpenAI and location connectors remain unavailable. All-platform JavaScript export and Android prebuild pass; installable phone builds are not yet produced. Testers will use one iPhone and one Android. Apple Developer enrollment and an OpenAI project are deferred until their integration stages.

See the [implementation log](docs/04-implementation-log.md) for decisions, checks and next steps, and the [requirement traceability](docs/05-requirement-traceability.md) for remaining acceptance work. The complete release scope below is unchanged.

For a new implementation chat, start with the [Session Handoff](docs/03-session-handoff.md), which includes repository state, approved decisions, remaining dependencies and a ready-to-use opening prompt. Then read:

1. [Requirements Specification](docs/01-requirements-specification.md) — approved scope, user journeys, acceptance criteria, clinical evidence, quality targets and decision register.
2. [Design and Implementation Specification](docs/02-design-and-implementation-specification.md) — proposed architecture, mobile experience, data models, AI workflows, privacy boundaries, integrations, verification and implementation work packages.

## Approved product scope

- A polished iPhone and Android app first; a website later sharing backend/public services. United States, age 21 or older including pregnancy, English initially, then Spanish and other languages.
- Diagnosed-condition and prevention use. Coverage includes type 2 diabetes/prediabetes, hypertension, high LDL/cardiovascular health, celiac disease, chronic kidney disease, MASLD/fatty liver, obesity/weight management and SIBO. Users select multiple conditions and one primary concern; all selected constraints apply.
- Grocery foods and beverages, including fresh/unpackaged foods with clearly labeled estimates. Restaurant meals, home-cooked recipes and supplements are excluded.
- Product-photo recognition, label fallback, condition-specific ratings, receipt analysis and mainstream alternatives. Ratings are Good fit, Neutral, Limit and Poor fit, with separate Restriction conflict and Insufficient information states. Brief explanations expand into nutrient details and sources.
- Same-retailer alternatives first, then nearby retailers. GPS suggests the current store, with manual correction. Nearby search defaults to an adjustable 10-mile radius, orders stores by distance and offers directions. Exact inventory, prices and budgets are not required. When no alternative fits, explain and offer a wider search without relaxing restrictions.
- Vegetarian, independent egg/dairy preferences, halal, kosher and gluten-free. Unverified required certification excludes products from compatible alternatives.

## Approved lipid-report behavior

Reports are optional, accepted as photos or PDFs at any time, with no standalone manual entry. Names, SSNs and identifying addresses must be automatically redacted before every LLM request, including initial extraction. There is no mandatory redaction-preview approval. Users confirm extracted clinical values before interpretation.

Support total cholesterol, LDL-C, HDL-C and triglycerides, plus ApoB and Lp(a) when present. Confirmed results automatically personalize future food ratings and alternatives using the most recent confirmed test date, regardless of upload order.

Reuse every successful saved analysis. Users may retry when no successful result was saved, including uncertain delivery after a connection failure. This can repeat remotely completed computation; it does not promise exactly-once provider execution. Prefer saving a valid result already in memory over requesting another analysis.

## Approved data handling

No login is required. Preferences, selected conditions and compact dated personal results remain on the phone until the user deletes them. Original product/receipt photos and report PDFs/photos are not retained by the app; temporary processing copies are removed, and user-owned originals remain untouched.

Optional user-controlled encrypted export/restore includes saved results and preferences for backup or phone transfer. This is an explicit exception to device-only storage, with no automatic cloud backup or synchronization. Transient sanitized AI processing is allowed; durable personal-data storage in the app backend is not.

## Review and remaining work

The planned product questionnaire is complete. Review these consolidated documents as a whole and identify changes by requirement ID, decision-register ID or design section. IDs remain stable across revisions.

The specifications distinguish **Confirmed**, **Proposed** and **Open**. Confirmed means approved product intent, not completed implementation, clinical validation or granted third-party access. Remaining work includes:

- Verify food/retailer data access, licensing, coverage and update mechanisms.
- Validate pre-upload redaction and actual provider-retention configuration against the privacy requirements; approval to use OpenAI does not establish retention compliance.
- Finalize clinical rules, measurement interpretation, certification evidence and overlapping-condition handling. Find a qualified clinical reviewer in parallel; reviewer availability does not block authorized development and testing.
- Validate stack/model choices, performance and device coverage; finalize report recovery, date conflicts, export/restore mechanics and proposed update schedules.

The work packages cover the complete polished app. Implementation begins after specification iteration and a subsequent instruction to start development.



## Shelf detector recovery — October 14

[Measured results and next detector comparison](docs/31-shelf-recovery-and-detector-decision.md) · [Mac/iPhone installation guide](docs/28-iphone-shelf-test-installation.md). The current diagnostic compares two candidates; no physical iPhone speed or complete ranked Shelf Scan acceptance is claimed.
