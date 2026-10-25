# Draft evidence and uncertainty review cases

These are **draft engineering cases**, not approved medical rules. Candidate source pointers are carried forward from Requirements v0.16; their currency, licensing, interpretation and applicability must be checked by the clinical reviewer before activation. No numeric product thresholds, treatment targets or diagnoses are proposed here.

| Case | Selected context | Candidate evidence pointer | Required conservative result before approval |
|---|---|---|---|
| D-CV | Cardiovascular / high LDL | AHA 2026 dietary guidance in requirements source register | Extracted food facts may display; no clinical fit claim without approved rules and adequate product evidence. |
| D-DM | Type 2 diabetes / prediabetes | ADA Standards of Care 2026 section 5 | Do not turn a product or purchase into a glucose prediction or diagnosis; identify missing reviewed rules. |
| D-HTN | Hypertension | NHLBI DASH | Do not infer a complete dietary pattern from one item; no unreviewed disease score. |
| D-CD | Celiac disease | NIDDK celiac guidance and FDA gluten-free labeling | Unknown gluten-free evidence stays unknown and excludes a compatible alternative; a food photo is not certification. |
| D-CKD | CKD | KDIGO 2024 CKD guideline | Withhold conclusions that need unavailable clinical context; overlapping restrictions remain in force. |
| D-MASLD | Fatty liver / MASLD | NIDDK dietary guidance | No invented brand-specific disease rating; distinguish label facts from reviewed interpretation. |
| D-WM | Weight management | NIDDK weight-management guidance | Do not infer consumption from receipt purchases or prescribe a portion from a photo. |
| D-SIBO | SIBO | AGA SIBO dietary guidance | No unreviewed compatibility or treatment claim; uncertain evidence remains visible. |
| D-LAB | Confirmed lipid report | ACC/AHA 2026 dyslipidemia guidance | Preserve measured units/comparators and printed source provenance. No diagnosis or personal target inferred without reviewed context. |

## Cross-cutting cases

- Age 20 rejects onboarding; age 21 is the supported lower boundary. Older adults remain in scope; do not assume a rule covers them without the reviewer’s applicability decision.
- Pregnant and unspecified pregnancy contexts must not inherit a nonpregnant fixture conclusion.
- Every nonempty combination of eight conditions and every combination of six dietary restrictions is exercised at ages 21 and 80 with three pregnancy contexts: 97,920 software cases.
- Unknown or conflicting certification must not be relaxed to fill an alternatives list.
- A selected primary concern changes explanation priority, not the removal of secondary conditions.
- A newer confirmed report is selected by printed test date; equal-date conflicts need an explicit record choice. Corrections/new tied records invalidate an older choice.
- Lp(a) mass and particle units remain distinct; the implementation does not convert between them.
- Published rule packs must be signed by a pinned key, current, above the rollback floor, clinically approved, and linked to permitted sources. A valid signature alone is insufficient.

## Reviewer deliverables needed

For each eventual rule: exact source/version/section, permitted-use decision, intended populations, required clinical context, explanation wording, exceptions, positive/negative/uncertain reference examples, and explicit approval/version/date. Product-scoring thresholds and clinical interpretation remain absent until those decisions are supplied.

Executable engineering evidence: `applicabilityMatrix.test.ts`, `evidence.test.ts`, `signedRules.test.ts`, `ruleStore.test.ts`, `reportRevisions.test.ts`, and `resumedWork.test.ts`. These test software boundaries; they do not establish medical validity.
