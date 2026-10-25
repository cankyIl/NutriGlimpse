# First Mac / iPhone build and startup correction — October 15, 2026

## Outcome

The corrected Release simulator app launches, renders the “Before we begin” beta terms/privacy screen and survives a terminate/relaunch check. The initial unsigned physical-iPhone arm64 build also compiled. A subsequent Personal Team signed build is now installed and running on the physical iPhone 16; the user confirmed its initial screen. No beta agreement was accepted, no user data was entered and no full interactive acceptance was performed.

## Environment and source

- MacBook Air M2, 16 GiB RAM; macOS 27.0.1 (26A434); Xcode 27.0 (27A266a); iOS 27 simulator.
- SSH: developer@192.168.50.10. Build root: /Users/developer/CongressAppChallenge.
- Authoritative source: /path/to/NutriGlimpse on project-server.
- Initial source archive SHA-256: 0274b6d8cf16d91128461315e0e1bee33ddd2f19b3ce56329ef70eaf87a30239. All 451 original files were verified before subsequent source fixes were copied.
- Current server, simulator and unsigned device source SHA-256: 3e7a952bf6953a9e4ab2a09d3df801be211742a823f34e5b653ee69a7c52dae5.
- Project-local Node 24.15.0, Ruby 3.4.11, OpenSSL 3.0.22, libyaml 0.2.5 and CocoaPods 1.17.0. No administrator installation or system Ruby replacement.
- Node release checksum and ruby-build checksums verified. ruby-build commit: 7eacc0aaf063436f12eea006beaef5c629aa918e.

## Failures found and corrected

1. Swift fixture compilation exposed implicit CoreGraphics dependencies. Explicit imports were added to the native geometry/planner/reader and fixture sources.
2. The first full simulator build compiled but failed at launch: “UIScene life cycle is required for apps built with this SDK.” The user observed this crash. Its earlier successful compiler result was not treated as runtime acceptance.
3. A reproducible Expo SDK 57 config plugin now adopts the installed ExpoAppSceneDelegate and ExpoReactNativeFactoryProvider. It adds the scene manifest, disables additional application windows, preserves link handling and completes fail-closed private-storage setup before React starts. Generated iOS files are not the authoritative fix.

Four focused regression tests cover the migration, idempotence, unsupported/partial templates and manifest preservation. Three existing decoder tests also pass; lint and all workspace TypeScript checks pass.

## Actual native verification

- 32 Swift geometry cases passed.
- Five OpenCV pixel-reference fixtures passed; maximum channel difference 1/255.
- 33 Swift planner/text checks passed.
- Both diagnostic Core ML packages compiled with Apple's compiler.
- Simulator Release build succeeded at 2026-10-15T05:14:13.208385+00:00; bundled JavaScript verified.
- Simulator installed and launched on the dedicated iOS 27 / iPhone 17 virtual device. The process survived 20 seconds, with initial-screen rendering visually checked.
- A terminate/relaunch also survived 20 seconds and rendered the same initial screen. A later check confirmed it remained running. The runtime evaluated the bundled JavaScript; the original scene-lifecycle launch error did not recur.
- Unsigned arm64 iPhone Release build succeeded at 2026-10-15T05:19:10.646819+00:00; bundled JavaScript verified.
- Server and Mac build source snapshots match.

These checks do not establish physical camera accuracy, live GPS/store detection, on-phone Core ML performance, signing, end-to-end workflow acceptance or clinical validity. Simulator screenshots remain available in the evidence folder.

## Artifact records

| Target | Artifact tree SHA-256 | Signing |
|---|---|---|
| Simulator | 2d67ae92c161e16d66cb53b403202ca77a1b679b240ee7e415f6c269b9f78896 | Simulator ad hoc |
| Physical iPhone | 4629977ae3308d6796f2e868aaac3da875bef21b450a3126feba6aa6ff8b1131 | Unsigned; not installable yet |

CocoaPods lock SHA-256: 2331943073f111c1fef51cd0fa81be3188551d4f55e1e4efa76349bc2ccda8c7.

ops/build-ios-local.py records the source snapshot, CocoaPods lock, Xcode version, result bundle, build script hash and individual output-file hashes. It never selects a developer team, logs into Apple or uploads a build.

The earlier Android binaries remain valid historical artifacts from their own source checkpoint; they were not rebuilt during this iOS-only correction.

## Dependencies recorded at the initial unsigned-build checkpoint

The connection/signing items in this historical subsection were subsequently resolved; see the physical installation checkpoint below.

- Connect the iPhone to the Mac by USB, unlock it and accept Trust This Computer. Complete Developer Mode prompts if required.
- Xcode must have a usable signing identity/team and provisioning for the connected phone. The Apple account is listed, but the first identity probe found zero valid identities.
- App Store Connect remains pending. It is not required for simulator compilation or initial personal-device testing; TestFlight/App Store distribution requires it.
- Physical-device/privacy acceptance, detector distribution rights and clinical-review gates remain unchanged. General product/receipt media and personalized medical recommendations remain disabled.

## Evidence

Full logs and Xcode result bundles: artifacts/mac on the Mac.
Compact source-matched build manifests, runtime logs, screenshots and native fixture evidence: artifacts/mac-build on the server.

Relevant files: simulator-build.json, device-build.json, scene-startup.json, scene-runtime.log, scene-startup.png, scene-restart.png, geometry-check.log, scan-planner-check.log and coreml-compilation.json. The earlier failing simulator-runtime.log is retained separately.

## October 15 physical iPhone installation checkpoint

The Mac is reachable at developer@192.168.50.10 with the same verified SSH host key. The connected phone is an iPhone 16 running iOS 27.0.1. USB pairing, Developer Mode and the on-phone developer trust confirmation are complete.

The Release app was signed using the existing Personal Team, installed successfully and launched. Its signature, artifact hashes, exact bundle identifier and provisioning coverage for this phone were verified. The same process remained running after 15 seconds, and the user confirmed the “Before we begin” screen. No app agreement was accepted by the agent, and no full physical-feature acceptance is claimed.

The Personal Team provisioning expires on **October 22, 2026 at 10:50 p.m. America/New_York**. Re-sign/reinstall before continuing tests after expiry. This is a local personal-device installation, not TestFlight distribution. Apple account approval was handled in the Mac's logged-in desktop session; no passwords or private signing keys were copied into the project.

Evidence: artifacts/mac-build/phone-desktop-signing.json, phone-install-verification.json, phone-installed-app.json, phone-launch-trusted.json and phone-running-process.json. Full build log and signed app remain in artifacts/mac on the Mac.

Signed artifact tree SHA-256: a0d9f97ea97ff68d591a8d4863ca0ee9015e9d6e9c42619612f58a65332bece6.
Build source SHA-256: 3e7a952bf6953a9e4ab2a09d3df801be211742a823f34e5b653ee69a7c52dae5.

## October 15 follow-up: installed profile/store feedback update

The source-matched signed Release update was installed in place and launched on the same iPhone; no uninstall/reset was performed. Source: `3ff9299a86c34ea31eb2ec30b49120d6e23a1eba927e6f44ac2b9fa0e5479672`. App tree: `0304da9fa9dd10353924163bc6e13a9f3e135cf8a30f64ad16a6ebd2966cdb25`. Signature, device provisioning and unchanged profile expiry were verified; launch process 799 remained running. The user confirmed both immediate return after store selection and the single-number Wegmans address. Profile/gender additions are covered by automated checks but their full physical UX is not yet accepted. Evidence is mirrored under `artifacts/phone-feedback-2026-10-15`; the earlier first-install evidence remains preserved on the Mac in `artifacts/mac/before-phone-feedback-2026-10-15`.
