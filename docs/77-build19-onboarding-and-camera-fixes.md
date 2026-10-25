# Build 19 — onboarding navigation and camera crash fixes

Status: October 24, 2026. **Build 0.1.0 (19) is Apple VALID / IN_BETA_TESTING and available to the existing owner-only TestFlight group, verified at 3:44 p.m. Eastern.**

## Reported problems and diagnosis

- Build 18: saving age, health concerns, height and weight could leave the user on onboarding. Updating onboardingComplete remounts the StoreProvider/navigation tree; the old imperative navigation can be lost. The completed onboarding route now renders a state-driven home redirect, including on remount. Failed/pending saves stay on the form with the entered values.
- Apple TestFlight crash at 3:22 p.m. Eastern on October 24, build 18, iPhone18,5 / iOS 26.6.2: background MemoryPhotoEngine.stop called AVCaptureSession.stopRunning while the main thread detached AVCaptureVideoPreviewLayer.session and entered commitConfiguration. The resulting AVFoundation exception terminated the app. This was a native camera teardown race, not an AI/provider failure.
- Photo preview now binds once before session work and is owned by the engine through its queued stop. Main-thread unmount no longer changes the session connection. Preview orientation is configured on the session queue.
- Shelf Camera contained the same cross-thread detachment pattern. Its preview also has a stable binding, and the existing camera coordinator retains the preview until the blocking session stop finishes. Stale-owner stops still cannot stop a new run.

## Scope preserved

Gemini single-product flow, GPT-6 Luna shelf grids, prompts, nutrition checks, news, report/measurement features and privacy/clinical gates are unchanged. No new product search, model call or backend deployment. The 333-file release snapshot has seven changed files (including build number and test command), with no added or removed release paths. Test helpers remain outside the app archive.

## Verification

- Full workspace checks passed: 635 core/service tests, typechecks/lint, tooling/report/news checks and 60 photo/home scenarios.
- Additional 60 photo/home scenarios with timing enabled and ten shelf UI scenarios passed.
- The profile/onboarding interaction suite verifies pending and failed-save retention, duplicate-tap protection, successful save, optional measurements and navigation remount. The old onboarding source fails the new remount regression; corrected source passes.
- Mac native deterministic test executes production photo-view callbacks with AVFoundation/UIKit doubles: 200 old-code overlapping preview changes, zero with corrected code across 200 capture/unmount/background cycles. Production shelf coordinator tests verify preview retention through stop, stopping the old session before starting another, and ignoring stale-owner stop requests. This is a concurrency regression model, not physical camera acceptance.
- Source archive and all 333 files were hash-verified between project-server, laptop and Mac. Source SHA-256: 336b178583f7660ef98060e3f42171c589bd7117bce8e53e60dd9c63e30f5a28.

## Trial devices and next steps

User confirmed iPhone X with iOS 16.7.16 and iPhone 17. The older phone meets the current iOS 16.4 minimum; physical camera performance on both still needs a trial. Update both phones in TestFlight to build 19. On a phone still in setup, save once and verify the home screen opens. Then test repeated product photos, Back/reopen, background/foreground and Shelf Camera Finish. Do not reset existing profiles just to test onboarding; a fresh installation/device or already-incomplete setup is sufficient.

Evidence: artifacts/iphone-build19-fixes-2026-10-24/. Raw crash diagnostics are retained privately on the server; the laptop handoff will contain a concise diagnosis, tests and release status.

## Release submission

Submission: 15e3160a-9075-43c2-9113-ea2e4789d073. Signed IPA: 58,586,902 bytes; SHA-256 65daef48b03a4f1096145321e1a9ba086f3a0a25b3bd39329f75c99fa58fefbd. Minimum iOS 16.4. Mac deep/strict signature verification and server IPA/provisioning/content checks passed, retaining both compiled shelf detectors. All 333 Mac source files matched the frozen source after compilation. Physical-device acceptance remains pending.

Apple processing and distribution verified: build 4f8542e3-90d2-4a00-82a3-a8a31446cf14; version 0.1.0 (19); VALID / IN_BETA_TESTING. Submission completed successfully. Existing owner group 7f71e231-04c1-42e4-9911-f0cd52037323 contains this build; no new testers or external invitations. Encryption declaration is usesNonExemptEncryption=false, and en-US testing notes were read back and verified. A final check found no drift in the 333 frozen source files. Actual phone installation and post-fix capture trials are not claimed.
