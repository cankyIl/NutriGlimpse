# Expo cloud build and TestFlight setup

Updated October 16, 2026, checkpoint 2026-10-16T15:13:51+00:00. Authoritative workspace: `/path/to/NutriGlimpse` on project-server. A local Mac is optional.

## Completed setup

- Expo **buldygaur**, project `bef5554a-3cae-4c5e-92ff-5510a7600685`.
- Paid Apple team **A9Q6Z8Y58M**; bundle **org.cac.healthgrocery.beta0**.
- App Store provisioning profile **DRTHL992Y2**, expires October 16, 2027 at 13:56:49 UTC.
- App Store Connect app **Health & Grocery Beta 0**, ID **6823645787**.
- Signed native cloud build **0.1.0 (1)** finished at 14:18:27 UTC: [build and logs](https://expo.dev/accounts/buldygaur/projects/grocery-app-preview/builds/7e715d3d-8968-450e-9cd4-4bfc2a294be8). Store Release profile, Node 24.15.0, Xcode 27.0. Free Expo allowance checked before dispatch; no paid upgrade.
- Upload authentication verified against this exact app. The .p8 stays under `.secrets/apple/` on project-server, mode 0600, and is excluded from Git/EAS source archives. It was provided only to the authorized upload service; no private material was displayed or mirrored to the laptop.
- Both shelf detectors retained by explicit user decision; model licensing deferred and source publication undecided.
- US-only standard-encryption assessment and future-build plist setting complete. [Decision and evidence](45-testflight-release-and-encryption.md).

## Current submission

[Submission e95b2ae3-5ba2-419c-a343-82fb173c593f](https://expo.dev/accounts/buldygaur/projects/grocery-app-preview/submissions/e95b2ae3-5ba2-419c-a343-82fb173c593f) was queued on October 16 at 15:07:05 UTC. Upload job **FINISHED** at 11:25 a.m. Eastern on October 16. Apple processing is **VALID**. At 11:56 a.m. Eastern, the verified build became **READY_FOR_BETA_TESTING** internally and **READY_FOR_BETA_SUBMISSION** externally. The existing build now reports **usesNonExemptEncryption=false**, verified through App Store Connect; its missing-compliance status is cleared.

The earlier submission incident did not prevent this job from finishing. No retry or second upload was needed.

The upload disabled automatic tester setup. The user subsequently explicitly requested owner setup and an invitation; those are complete. No external tester invitations, Beta App Review submission, App Store public release or phone installation have been performed.

Owner group **Beta 0 - Owner Testing** is created, contains the verified account holder **owner@example.invalid** and build **0.1.0 (1)** only, and has automatic access to future builds disabled. Apple accepted the explicit invitation request (HTTP 201) on October 16, 2026 at 09:54 PM Eastern. Email delivery, invitation acceptance and phone installation are not yet verified. No other testers were invited.

## Next release steps

1. **Complete:** EAS submission FINISHED; exact Apple app/version/build verified VALID.
2. **Complete:** set and verified `usesNonExemptEncryption=false` for this build. Internal testing is ready; external testing is ready for Beta App Review submission. This build-level acceptance is not a general export-classification ruling.
3. **Owner setup/invitation complete:** accept the email invitation on the iPhone. Additional testers use the appropriate external group and required Beta App Review; no developer roles are granted to bypass review. Invitations to additional people need explicit instruction.
4. Install with TestFlight; check photo recognition, facts/ratings/alternatives, shelf camera, location, persistence/deletion, accessibility and performance. The old Personal Team installation is unchanged and expires October 22 at 10:50 p.m. Eastern.
5. Revisit licensing/source publication and encryption geography before broadening distribution. User deferral does not establish a license or approve publishing source.

## Verified artifacts

Retained IPA: `artifacts/eas-ios-2026-10-16/health-grocery-beta0-0.1.0-build1.ipa`; **56,289,827 bytes**, SHA-256 **f0727c9c880725973797c5b886f6d633508c750f5e07ed3419c9f51efae34b12**.

Verified: bundle/version/team, arm64, minimum iOS 16.4, iPhoneOS 27 SDK, camera/location permission text, scene lifecycle, non-debug store profile without device list, ZIP integrity and provisioning CMS signature. Full application signature and Apple issuer trust-chain checks were not performed on Linux. Both detector model resources are present. The original IPA has no encryption declaration key; configuration changes affect future builds only, and App Store Connect now records the verified exemption answer for this build.

Original source archive: **282 files / 139,794,172 bytes**, tree hash `4d418b5b9f487bd08afc99a625d5eb707dc141e63ec76c7d3c53c1621d2524cb`. Keys, environments, databases, backend source, documents, logs, tools/artifacts and generated native projects are excluded. Required native resources, vendored decoder patch and notices remain.

Workspace typecheck, mobile lint and Expo's full configuration introspection pass after the encryption change. SQLCipher and permission descriptions remain enabled. The retained IPA hash is unchanged. Evidence: `artifacts/testflight-release-2026-10-16/`, with original build evidence under `artifacts/eas-ios-2026-10-16/`.

## References

- [EAS iOS submission](https://docs.expo.dev/submit/ios/)
- [Expo TestFlight](https://docs.expo.dev/submit/testflight/)
- [Apple encryption documentation table](https://developer.apple.com/help/app-store-connect/reference/app-information/export-compliance-documentation-for-encryption)
- [Apple encryption configuration](https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations)
