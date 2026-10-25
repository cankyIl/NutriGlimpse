# OpenAI fictional-data validation


## OpenAI live fictional validation — October 8, 2026

User confirmed API credits. Verified the stored key can call gpt-6-luna through the Responses API. Three paid requests completed: fictional product, receipt and lipid report. Existing strict local schema/source validation and selected known-value checks passed. The report check initially expected seven measurements; the source contains six measurements plus a date, so the test assertion was corrected and the saved response revalidated without another API call. These smoke tests do not establish real-document accuracy or clinical suitability.

Added ops/openai-budget.py and ops/openai-fixtures.ts: fixed model, reasoning none, Standard processing, tools disabled, store:false, 4096 maximum output tokens, bounded request/response size, no retries. Persistent locked ledger reserves USD 0.02 before each attempt and never refunds failures or unknown outcomes; runner stops at USD 1.80 below the authorized USD 2 total. This guard covers this CLI runner, not unrelated account spending. Two budget regression tests passed, including cap persistence and malformed-ledger denial. Normal project checks passed: typecheck, lint, 145 application tests and 3 tooling tests.

Three attempts reserve USD 0.06 cumulatively. Reported usage: 2,182 input tokens and 1,024 output tokens, including 1,130 cache-write tokens and zero reasoning tokens. Conservative token-cost estimate is USD 0.00087145, excluding taxes; dashboard billing is authoritative. Ledger reservations deliberately exceed estimated actual charges.

No public/live app route enabled, no service restart, no real personal data transmitted. Both project services remained active. The backend adapter has now been exercised with live fictional responses, but phone-to-backend live integration, representative evaluations, receipt/product local OCR fixes, and existing privacy/clinical gates remain pending.
Evidence: artifacts/remote/openai/verification.json, usage.json, check.log and fictional request/response fixtures. Scripts: ops/openai-budget.py, ops/openai-fixtures.ts, ops/test_openai_budget.py.

Pricing reference: https://developers.openai.com/api/docs/models/gpt-6-luna
