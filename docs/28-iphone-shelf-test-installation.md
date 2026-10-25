# Install Shelf Scan and its detector comparison on your iPhone from a Mac

Prepared October 14, 2026. Target readiness date: October 23, 2026.

You can use your Mac and an Apple Account to test on your own iPhone while paid Apple Developer membership is pending. Xcode calls this a **Personal Team**. This route does not require Expo login or an EAS cloud build. It does require compatible Xcode, device pairing, and successful local compilation/signing. [Apple account guidance](https://developer.apple.com/help/account/basics/about-your-developer-account)

Use the latest source archive **HealthGrocery-iPhone-Lipid-Import-2026-10-14.zip**. It includes the beta agreement, optional PDF/photo lipid import, compact local results and personalized Shelf Scan, plus the separate **ShelfSet / SKU-110K** detector benchmark. The benchmark still measures detection only. See [the integration checkpoint and device acceptance checklist](35-shelf-scan-integration.md). A successful installation alone does not establish two images per second, identification accuracy or medical suitability.

## Before starting

- Use the complete prepared source bundle, including both Core ML models, their manifests, source/license notices and test fixtures. Extract it into a **new folder on the Mac**, keeping any older source folder. Do not copy Linux or Windows `node_modules`, `.tools`, or generated `ios` directories into it.
- Install **Xcode 26.4 or newer** and finish its first launch, including any requested iOS components. Your macOS must support that Xcode. Open Xcode Settings > Locations and select the installed Xcode under Command Line Tools. The minimum comes from the project's [Expo SDK 57 requirements](https://docs.expo.dev/versions/v57.0.0/).
- Install **Node.js 24 LTS**, preferably 24.15.0 to match the tested project toolchain. Expo itself permits 22.13+, but this repository declares Node 24+. Obtain it from [Node.js](https://nodejs.org/en/download).
- Install **CocoaPods** if it is not already available, following its [installation guide](https://guides.cocoapods.org/using/getting-started.html). The helper checks for this tool and does not install system tools or request administrator access.
- Have the iPhone, a USB cable, and your Apple Account available. Enter credentials only in Apple's own sign-in interface.

## Prepare and open the app

Open Terminal in the extracted project folder (the folder containing `package.json` and `ops`). Run:

```bash
bash ops/mac-shelf-test.sh check
bash ops/mac-shelf-test.sh prepare
```

The first command checks the Mac, Xcode and Node; verifies both model packages against every size/SHA256 entry in their manifests; checks the input/class/threshold contract; and confirms accompanying notices exist. It does not download dependencies, compile Swift or require the old YOLOE model. The second is a foreground preparation command: it installs the locked project dependencies with `npm ci`, applies the project's checked-in compatibility patch, generates the iOS project if missing, installs its CocoaPods dependencies, and opens the Xcode workspace. Downloads require internet. It does not sign in to an account, buy anything, start EAS, or upload source.

If the helper stops, read its last error. Do not delete the project or installed phone app. The source remains available for fixing the issue. If either model is missing or a checksum differs, obtain the complete comparison bundle before proceeding; do not bypass the check or substitute another model.

The generated project is disposable build output, but this helper intentionally keeps an existing `ios` directory to preserve local signing choices. For an updated source bundle, use a new extracted folder and repeat the preparation. Never use `prebuild --clean` on a folder containing local changes you need to keep.

## Optional Swift preprocessing check

After `check` passes, you can verify the actual Swift geometry and pixel helper functions before building the app:

```bash
bash ops/mac-shelf-test.sh geometry
```

This compiles `ShelfLetterboxGeometry.swift` with the standalone `LetterboxFixtureCheck.swift` runner using Xcode's Swift compiler. It checks 32 geometry cases and five OpenCV reference pixel fixtures, including padding, inverse box mapping and asymmetric image sizes. The temporary executable is removed afterward. It uses Foundation only and does not need npm or CocoaPods dependencies installed.

A passing result covers those helper functions. It does **not** compile the native camera module or execute Core ML, and it does not establish phone speed. This Swift check has not been run on your Mac yet. If it fails, retain the error and resolve it before relying on the app's boxes.

## Optional reader and ownership check

```bash
bash ops/mac-shelf-test.sh scan-checks
```

This compiles the Foundation-only helpers used by the scanner and tests bounded package reading, token ownership, cooldown and compact text/barcode limits. It has not been run on a Mac yet. It does not compile the full native module or test Apple Vision/camera behavior.

## Sign and install through Xcode

1. In Xcode Settings > Accounts, sign in to your Apple Account. Your account can appear as **Personal Team** until paid membership is active.
2. Connect the unlocked iPhone by USB. Accept **Trust This Computer** on the phone if prompted, and let Xcode finish pairing/preparing it.
3. On the iPhone, enable **Settings > Privacy & Security > Developer Mode**. Follow the restart and confirmation prompts. This setting may appear only after pairing with Xcode. [Apple's instructions](https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device)
4. In the Xcode project navigator, select the app project, then the **HealthGroceryBeta0** app target. Open **Signing & Capabilities**, enable **Automatically manage signing**, and select your own Personal Team or active paid team. No team identifier is embedded in the source. If Apple rejects the bundle identifier or a capability, report the exact message so we can adjust the local test configuration deliberately.
5. Choose the **physical iPhone** as the run destination. The simulator cannot establish iPhone camera throughput or Neural Engine performance.
6. Open **Product > Scheme > Edit Scheme**, select **Run**, set **Build Configuration** to **Release**, and turn off **Debug executable** for the timing run. This builds optimized native code and bundled JavaScript.
7. Press **Run**. Xcode will compile and sign the app for your chosen team. Complete any Apple/device prompts. If signing needs attention, resolve it in Xcode; the helper does not choose accounts or teams.
8. Once installed, launch the app from the iPhone's Home Screen for the measurement, without a debugger attached. Read and accept the beta agreement if you choose to test. On the welcome screen, tap **Test shelf scanning on iPhone**. You can also find this entry on the product capture screen. No health profile is needed for this diagnostic. No Metro development server is needed for this Release build.

Expo documents local iOS compilation and the `--device --configuration Release` options in its [local build guide](https://docs.expo.dev/guides/local-app-development/). For repeat installation after signing is configured, the optional command is:

```bash
bash ops/mac-shelf-test.sh run
```

To reopen the generated workspace without rebuilding:

```bash
bash ops/mac-shelf-test.sh open
```

## Try the integrated Shelf Scan

1. Complete setup with a fictional test profile. Start with **Not pregnant**, **Heart health / high LDL**, and no dietary restrictions to exercise the available nutrient comparison. Unsupported contexts deliberately show an explanation instead of an unsubstantiated ranking.
2. Connect the existing beta tester access through **Search real food facts / Food catalog**. This access key is a beta catalog restriction, not a personal login. Keep it out of screenshots, messages and source files.
3. From Home, tap **Scan a shelf**. Choose the actual category, then **Load category facts**. The download contains public product facts; camera text, profile and report values stay on the phone.
4. Tap **Start scanning**, allow camera access, and move slowly across a well-lit shelf. The camera targets two detection frames per second. Reading one selected package takes place separately, at most once per second; it does not identify every visible box instantly.
5. Tap **Pause & review**. Check each suggested name, brand, flavor and original/reduced-sugar variant against the package before confirming. Text matches always require confirmation. A unique validated barcode may confirm automatically; **Check confirmed products** allows removal of an incorrect entry. Use **Read a label the camera missed** for a closer-view text/barcode fallback.
6. Inspect **Personalized nutrient comparison** and **Why it appears here**. This compares available label nutrients across up to ten confirmed products in the same category. It has no absolute disease-suitability rating; ties and missing evidence are explained. Guidance sources are linked in the policy card.
7. Change the profile through **Review your health needs**, then return. Earlier products remain and comparisons recalculate locally. Current sample lipid reports are excluded. Optional confirmed real reports are connected; use the report checks below before testing with personal data.
8. Resume, finish, and start another scan. Use **Scans this app session** to revisit earlier runs. Backgrounding pauses capture; it does not erase results. Terminating the app clears all shelf runs. No shelf photo, scan membership or ranking goes into saved History or backups.

Shelf Scan currently selects SKU-110K for cheese categories and ShelfSet for others. This is an experimental routing choice based on a small public-photo comparison, not a validated universal detector choice. The separate benchmark below lets you compare both on the same real shelf.

## Test the optional lipid report import

The real-report path now has implemented source and a protected live backend, but **the Swift module and actual iPhone import have not yet been compiled or exercised**. Use fictional reports first. See [the implementation, privacy contract and acceptance checks](36-real-lipid-import.md).

1. Read the initial beta agreement. It explains the optional OpenAI processing and default provider retention. There is no personal login. Connect the existing beta tester key through Food catalog; never put it in screenshots or source files.
2. Choose **Add a lipid report** from Home or My needs. Select a clear fictional JPEG/PNG or unlocked PDF of 1–10 pages, up to 20 MiB. A camera capture is one page. Use explicitly printed test/collection dates, numeric lipid rows and units for the first check.
3. The phone stages and fingerprints the file, reads it locally, and removes temporary copies. Only allowlisted lipid fields reach OpenAI; no original image/PDF, name, SSN, address, filename, raw OCR, profile or fingerprint is sent. OpenAI checks the structured fields. This is not an AI reading of the original page image.
4. Review every result against the fictional original. Correct date, units, signs, values and source-page numbers; add omitted tests only when present in the source. Confirm the results. The latest eligible **test date** drives supported shelf comparisons. Same-date conflicts need an explicit choice.
5. Reopen the result and import the exact same file. Verify reuse without a new AI request. A new photo or differently encoded PDF has different bytes and may be treated as a new report. Corrections and shelf reranking should remain local.
6. Exercise picker cancellation, permission denial, backgrounding during reading/network work, offline failures and force-quit/restart. An interrupted provider outcome must not retry automatically. A saved analysis awaiting confirmation should be available after restarting, without needing the original file again.
7. Inspect temporary-file cleanup, encrypted compact storage and outbound request contents using invented values. Verify the user's source remains unchanged. Failed cleanup must prevent further import until recovery succeeds. Check that deleting an unfinished import or saved report clears its local record; provider retention remains governed by the agreement.

The same limited shelf policy still applies: missing facts or unsupported clinical contexts can withhold rankings. The report import does not establish clinical accuracy or a diagnosis. Device validation and qualified review remain required.

## Compare both detectors on your iPhone

Keep lighting, distance, phone orientation and shelf contents as similar as practical between runs. Start with a well-lit shelf of individual packages. The detector selection is fixed during a run; change it after stopping or completing that run.

1. Leave **ShelfSet** selected and choose **30-second check**. Allow camera access and keep the app in the foreground. Watch whether outlines surround individual packages; move slowly sideways, stop, and reverse direction. Note missed packages, merged boxes and outlines that do not line up with the preview.
2. Select **SKU-110K** and repeat the same **30-second check** on the same shelf with similar movement. The earlier summary remains in the app; selecting another detector or starting another run does not delete it.
3. Run the **Five-minute test** separately for **each detector**, using the same shelf and similar movement. Keep the phone awake and the app visible throughout each run. Let it return to a comparable temperature before the second test and record Low Power Mode. Opening another app, locking the phone, a camera interruption or stopping early makes that run incomplete.
4. Copy each final screen's detector/model name, completed frames per second, 95th-percentile latency, missed test slots, failed frames, temperature state, model fingerprint, device/OS, app version/build and completion status into your test notes. Results stay **only in app memory**; save your notes before closing the app. Do not include health information.
5. A timing pass requires a completed Release run, at least **1.90 completed frames/second** (5% tolerance around the 2 Hz target), **95th-percentile latency below 500 ms**, no failed frames and no serious/critical thermal state. The measurement includes frame preparation, gray-114 square letterboxing, model inference, output decoding and duplicate-box suppression. It excludes model loading, camera exposure/startup, buffer erasure, preview/UI rendering, exact product identification, network calls and health ranking. Package accuracy requires separate review even when timing passes.

Repeat the short comparisons on cereal boxes, bags of snacks, cookies and cheese packages at different distances, including partially hidden items. The current public-photo results suggest ShelfSet for cereal/chips and SKU-110K for cheese, but the small test set does not validate automatic category routing or broad store coverage. Neither detector handled a severely overlapping, angled biscuit pile reliably. Use the same shelf for both detectors instead of comparing unrelated scenes.

The benchmark performs one selected detector inference per sampled frame. It does not run both models simultaneously, save camera frames, upload images, identify exact products or provide health rankings. Previous summaries remain while the app process is alive; closing or terminating the app discards them. The old YOLOE resource may remain in the source bundle as a historical reference, but it is not selected or used as an automatic fallback.

## Research artifact notices

These are evaluation builds. SKU-110K's published model terms retain academic/non-commercial dataset restrictions. ShelfSet's repository claims MIT, while underlying Ultralytics licensing and scraped training-image rights require separate review. The source cards, pinned model information and license notices are included with the resources. This comparison package does not establish unrestricted commercial or App Store distribution clearance; use it for the authorized local research test.

## Keep the test installed through October 23

Free Personal Team provisioning expires **seven days after issuance**. If a test installed October 14 expires before the deadline, rebuild and reinstall using the same local signing setup. Plan a fresh installation around **October 22**. Do not uninstall the app as a routine refresh step; uninstalling can remove its locally saved data. [Apple's seven-day limit](https://developer.apple.com/help/account/basics/about-your-developer-account)

Personal Team testing is for the developer's own devices. Paid membership is needed for the planned TestFlight distribution. Its activation can proceed in parallel with this personal iPhone test.

## What remains unverified

This guide and the helper are prepared instructions. No successful Mac compilation, Core ML execution on an iPhone, converted-model numerical equivalence, camera/overlay alignment, or measured two-images-per-second result is implied. Repeat actual camera tests for both selected model resources. Record the actual build and test outcome before marking physical-device verification complete. If installation fails, share the build error text without Apple credentials, signing files, device identifiers, or personal reports.
