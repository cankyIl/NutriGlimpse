# Massachusetts District 2 — competition and iPhone readiness
Updated October 13, 2026. Engineering preparation; not a submission or eligibility certification.

## Deadline and entrant confirmation
User selected Massachusetts District 2. District participation and district-specific instructions were not confirmed in this research pass.
National rules PDF lists October 26, 2026 at noon EDT; national registration page lists 9 p.m. ET that day. Work toward the earlier time and confirm through the entry portal/district. Proposed internal freeze: October 23, leaving time for upload problems.
Rules require substantial student technical contributions and disclosure of AI assistance. This project has substantial AI implementation assistance; eligibility needs clarification with the organizers based on the actual contribution record. Do not claim student authorship of agent-written code.
Sources checked October 13:
https://www.congressionalappchallenge.us/wp-content/uploads/2026/05/2026-CAC-Rules.pdf
https://www.congressionalappchallenge.us/students/student-registration/

## Current preparation completed
- apps/mobile/eas.json now has a dedicated testflight store-distribution Release profile and submit profile. Node 24.15.0 matches tested server tooling. Existing internal profiles are preserved.
- Credential-file exclusions expanded in root .gitignore, which EAS uses for source selection absent .easignore.
- Linux iOS prebuild with --no-install passed. Generated AppDelegate contains the private-storage backup exclusion. TypeScript and lint pass.
- Current Android artifact/source provenance still passes. No app/runtime source changed in this checkpoint.
- No Expo authentication, project creation/linking, source upload, Apple signing, cloud build, CocoaPods install or Swift compilation performed. No paid services started.
Evidence: artifacts/remote/ios-preparation-check.log and ios-preparation-prebuild.log.

## Order of work
1. Verify secure Expo login as buldygaur and link the intended EAS project. Confirm ownership before creation; do not guess project UUIDs.
2. After Apple activation, verify team and bundle-ID availability. Create the App Store Connect app record, configure signing and set actual app ID in the submit profile. Inspect the EAS source archive to exclude credentials, server data and build artifacts before upload.
3. Compile the iOS Release build; fix actual CocoaPods/Swift issues. Store-distribution configuration alone does not establish iOS compatibility.
4. Review encryption declarations accurately: SQLCipher is present; do not automatically declare only exempt HTTPS encryption. Complete TestFlight metadata, beta review information and privacy disclosures from actual behavior.
5. Give three iPhone testers explicit fictional-data tasks through TestFlight; external beta review may add time. Optional fourth Android tester uses the verified APK.
6. Select a dedicated HTTPS hostname and implement tester access/rate limits before off-home backend testing. No public endpoint is approved or deployed yet. Preserve no mandatory end-user login product intent; tester access design must be reconciled with that requirement.
7. Run physical-device checks, fix defects, then polish readability, large-text layout, recovery and first-run explanation. User preferences remain: lively colors, Your Health & Grocery Companion, bold introductory line, compact ingredients, 1x portion note and up to three immediate scrollable alternatives. Branding remains open.
8. Real grocery scanning needs verified source-backed product lookup and native camera/privacy acceptance. Fictional exact-line filtering is not general redaction. Do not unlock personal health documents or clinical claims to make the demo appear complete.
9. Capture an honest demonstration, written answers and student contribution record; retain reproducible source/build evidence.

## Proposed demo storyboard (approximately 2m45s)
- 0:00–0:20: student introduction, the shopping problem and intended adult user.
- 0:20–1:15: demonstrate a working product journey and explain the evidence behind its result; clearly label sample data.
- 1:15–1:45: compare immediate alternatives and show why a restriction or missing fact affects a suggestion.
- 1:45–2:10: show one reliable receipt or report workflow, including review rather than automatic trust.
- 2:10–2:35: explain a technical challenge, privacy design and actual student contributions.
- 2:35–2:45: measured tester finding and remaining work. Do not invent impact statistics or tester quotes.
Storyboard is a proposal, not a recorded video. Capture only fictional data; do not disable privacy controls globally for filming. Use web/emulator footage where necessary and label the platform.

## Tester evidence sheet
For each task record tester alias, device/OS, build ID, Wi-Fi/cellular, task completion, time, error, expected/actual result and fix/retest. Measure:
- Can a new tester understand the result and find an alternative without help?
- Does saved history survive restart?
- Does loss of network preserve a draft and avoid duplicate paid requests?
- Are partial/missing nutrition and unmatched receipt items visible?
- Do cancellation and privacy protections work on a physical iPhone?
No physical-iPhone results exist yet. Small-sample findings must be described as feedback from three testers, not population-level validation.

## Student contribution and AI disclosure worksheet
Student/team identity and district eligibility: awaiting user.
Personally authored code, design choices and tests: awaiting user; link exact files/commits.
AI assistance: Codex has assisted materially with requirements, implementation, fixes, tests and documentation; GPT-6 Luna is also used inside the fictional extraction workflow. These are different uses and both should be described accurately.
Learning explanation: student should explain data flow, schema/source checks, cancellation, local storage and one personally solved technical problem in their own words.
Never backdate contributions or manufacture development history. If the current assistance exceeds contest limits, ask organizers about eligibility; understanding generated code alone does not establish independent technical authorship.

## Dependencies and budget
Apple activation; Expo authentication; actual student contribution/eligibility details; physical iPhone access; HTTPS hostname/access decision; approved product sources; privacy/clinical review before real health processing.
User device: reported iPhone 12 / iOS 26.6.2. Three iPhone testers, possible fourth Android. Home and grocery-store access required.
OpenAI cap remains USD 2 total, with USD 0.06 conservatively reserved by prior calls. No budget increase is implied. Expo build allowance must be checked before any paid build.
