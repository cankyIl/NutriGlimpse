# App Store release checklist - October 29 finalization

NutriGlimpse 1.0 (29) was submitted to Apple on October 29 at 10:54 p.m. EDT and is WAITING_FOR_REVIEW. Free USA-only distribution and manual release are verified; it is not publicly released. The large-text home heading is corrected. Production backend and matching privacy policy are live. Existing owner TestFlight access is retained.

| Item | Current status |
|---|---|
| Restore points | Build27 encrypted baseline retained; build28 retained; fresh service/config checkpoint and 14 consistent SQLite backups verified. |
| Heading | Fixed in build29; whole-word wrapping visually checked at maximum text on iPhone/iPad. |
| Source and side-chat work | Frozen revision 0182f18020f57e38cdc399974b45b3d95dd219d0; 282 native inputs match; existing features and approved prompts preserved. |
| Security/dependencies | Reviewed dependency patches verify; production launcher deployed. Existing version-based audit findings and mitigations remain documented in dependency-review.md. No claim of an empty vulnerability report. |
| Backend/privacy | Live production mode; no new beta journals after live scans; legacy seven-day expiry; existing catalog/keys/usage preserved. |
| Support/privacy pages | Public HTTPS passes; seven-day Google project-log setting and separate provider/test-dataset retention accurately disclosed. |
| Native build | Signed build 29; 8 manifests, 10 declared data types, encryption=false, minimum iOS 16.4; iPhone/iPad retained. |
| Regression checks | 825 core/service, 21 tooling, 10 report-adapter and 76 photo-UI checks passed, alongside needs/news/shelf checks; eight focused runtime/privacy/expiry checks and two production-launcher checks pass. Typecheck/lint pass. All 282 native inputs, App Store signature, eight privacy manifests and ten declared data types verify. Five targeted build 29 simulator scenarios pass, including largest text on iPhone/iPad and profile persistence across installation over build 28. |
| Backup check | Native encrypted export and share cancellation also pass. The captured fictional-profile archive decrypts with the expected passphrase, rejects a wrong passphrase and is removed from the app cache when sharing closes. Full Files-picker restore on a physical phone remains untested. |
| Live scans | Product: 3 alternatives, first content 4.775s, final 23.223s. Shelf:9/9 cells,7 distinct products, first 5.959s, final 90.176s; supplemental GPT completion not established. |
| Screenshots | Ten complete and ordered:7 iPhone,3 iPad. Four use owner-approved build27 recordings; default layout unchanged. |
| Apple submission | Version1.0/build29 WAITING_FOR_REVIEW; submitted October29,10:54p.m.EDT. Free,USA-only,manual release verified; contact/age/listing saved. |
| TestFlight | Exact build 29 VALID and assigned to existing owner group; owner installation of29 not claimed. Build28 general acceptance retained. |
| Shelf models | Retained per owner decision. Licensing uncertainty documented; no new license grant claimed or replacement decision pending. |
| Dataset | Fictional/public-only; optional deletion, not a mandatory release gate. |
| Strong app-only access | Explicitly deferred by owner; no tester-key flow reintroduced. |
| App Privacy questionnaire | Owner confirmed publication October 29. Exact published entries were not independently read back; browser tool initialization failed. |
| Final submission | No owner input is required for the submitted version now. The owner confirmed saving the medical-device declaration; Apple accepted the authorized version 1.0 (29), listing and ten screenshots. Await Apple review and address any review feedback. Manual release after approval remains a separate action; the app stays free and USA-only. |

Full manual VoiceOver, device-specific physical interruptions/permissions and the full native Files-picker restore flow remain coverage limits. No new screenshot recording, Mac setup, support verification or seller/contact detail is needed. No tester was contacted.
