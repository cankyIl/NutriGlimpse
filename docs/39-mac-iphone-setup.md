# Mac and iPhone setup

## Current preferred route — October 18, 2026

The user has chosen local Mac builds after exhausting the free Expo cloud iOS allowance. Development/source and backend remain on project-server; use the Mac only for native compilation/signing, and retain TestFlight for installation. Do not purchase an Expo plan or retry the cloud build automatically.

The Mac is now reachable at developer@192.168.50.10 using the laptop's existing congress_iphone_mac SSH identity. macOS 27.0.1 and Xcode 27.1 are verified. Build 17's credential-free source is transferred into /Users/developer/CongressAppChallenge/releases/build17/HealthGroceryBuild17; all 326 hashes match the server and mobile/core typechecks plus mobile lint pass. Node 24.15.0, Ruby 3.4.11 and CocoaPods 1.17.0 are available, with Fastlane 2.241.1 installed in this release's isolated tool folder.

The Mac's fresh Expo device login completed as buldygaur, existing distribution credentials were retrieved, and build 17 compiled locally. Signature and release-content verification passed; EAS submission finished, and Apple VALID / IN_BETA_TESTING with existing owner-group access is verified for 0.1.0 (17). No cloud compilation allowance or subscription purchase was needed. Existing Personal Team device signing is historical and must not be reused for TestFlight. See [current build status](73-gpt-only-reviews-build17.md) and [project plan](ImplementationProjectPlanDocument.md).

## Earlier cloud route — October 16, 2026

Apple Developer membership is now active according to the user. Prefer Expo EAS cloud builds and TestFlight for routine installation and the three iPhone testers. A connection to the local Mac is optional for this route. App Store Connect Apps access is confirmed. Expo authentication/project linking, paid-team signing, native cloud compilation and signed-package inspection are complete. The App Store Connect app record and upload authentication are verified. The US-only encryption assessment is recorded, both shelf detectors are retained by user decision, and signed build 0.1.0 (1) is processed and ready for internal testing with compliance cleared. Owner testing setup/invitation is complete; invitation acceptance and device installation remain; use the [cloud setup guide](44-expo-cloud-testflight-setup.md). See the current [project plan](ImplementationProjectPlanDocument.md) for the exact queue.

The local Mac setup below remains a working fallback and historical evidence. Membership activation alone does not replace the currently installed development build or extend its existing provisioning profile.

## Local installation status — October 15, 2026

The app is signed, installed and running on the first physical iPhone. The user confirmed its “Before we begin” screen.

- Mac: M2 MacBook Air, macOS 27.0.1, Xcode 27.0; current SSH address developer@192.168.50.10.
- Build workspace: /Users/developer/CongressAppChallenge. Authoritative source remains on project-server.
- Phone actually connected: iPhone 16, iOS 27.0.1.
- USB pairing, Developer Mode, development certificate, phone-specific provisioning and developer trust are complete.
- The app's signature and provisioning coverage were verified before installation. The same app process remained running after 15 seconds.

Project-local Node 24.15.0, Ruby 3.4.11 and CocoaPods 1.17.0 are installed. Both simulator and physical-device Release compilation pass. The iOS 27 startup correction is generated through the Expo scene-lifecycle config plugin.

## Current build lifetime

The Personal Team profile expires on **October 22, 2026 at 10:50 p.m. Eastern**. The app must be re-signed and installed again to continue using this development build after expiry. This does not grant TestFlight distribution to other testers.

Signed artifact: artifacts/mac/SignedDeviceDerivedData/Build/Products/Release-iphoneos/HealthGroceryBeta0.app on the Mac.

## Signing lesson from the first install

Signing through the SSH session returned “User interaction is not allowed” because Apple account/keychain approval needed the logged-in desktop session. Running the authorized automatic-signing build in Terminal on the Mac created the development certificate/profile successfully.

The local helper is .tools/sign-iphone-desktop.command on this Mac. It uses the existing Personal Team and this paired phone. It does not contain passwords or private signing keys. Keep the Mac awake and the phone connected/unlocked when preparing another install. New Apple account/keychain prompts must be completed directly on the Mac.

## Next device work

Read the beta terms and privacy screen on the phone. Remaining acceptance covers camera/barcodes, OCR, GPS/store detection, storage/export/deletion, accessibility and performance with permitted inputs. First installation/startup does not complete those checks.

Apple membership is now active per the user. The user retained both shelf detectors and deferred licensing; source publication remains undecided. TestFlight upload and Apple processing are complete, and the US-only encryption answer is verified on the build. Owner invitation acceptance/installation, external Beta App Review where applicable and device acceptance remain. App Store Connect access, paid-team signing and the first cloud build are verified. Personalized medical recommendations and the general product/receipt media route remain gated as documented in the project plan.

See [first Mac build and physical installation evidence](40-first-mac-iphone-build.md) and [current project plan](ImplementationProjectPlanDocument.md).
