# Android emulator checkpoint

Project: /path/to/NutriGlimpse on project-server (project-server).



## Android emulator checkpoint — October 7, 2026 (EDT)

The administrator's kvm-group change is verified in a fresh SSH session. KVM is usable; no further administrator action is required for emulator testing. API 36 Google APIs x86_64 / Pixel 6 profile boots on project-server. Emulator 37.2.12 and all added runtime libraries are project-local. Official Ubuntu runtime packages were downloaded using isolated apt state; the pre-existing malformed NVIDIA apt-list entry was not modified. No portfolio service changes or server restart.

Native testing exposed and fixed two encrypted-storage startup defects: Android's SQLite absolute directory path needed a file URI for the File existence check; separate transaction connections needed their own SQLCipher key before BEGIN. Startup errors now identify a non-sensitive initialization stage.

Verified on the emulator: release APK installation/startup, fictional onboarding, persistence across force-stop/relaunch, navigation, native fictional image and two-page PDF OCR/reconstruction/cleanup, rejection of three invalid input types, report review/save/reopen from history after restart, product-result save, and personal-input gate. Image diagnostic: 8 lines read / 4 excluded / 4 retained. PDF diagnostic: 10 / 6 / 4. Private temporary directory empty afterward; database header not plaintext SQLite; SECURE window flag present. These checks do not certify physical-device security or general real-document sanitization.

**New independent engineering uncovered:** native receipt OCR dropped item rows (0 of 0 food lines), so receipt recognition acceptance FAILED. Product OCR left sugars unknown; complete fixture extraction remains pending. Do not describe all native workflows as passed. Root cause analysis and fixes for OCR layout/fixture matching remain work that can proceed without accounts or phones.

Verification: npm run check passed (typecheck, lint, 145 application tests, 3 tooling regression tests). Both x86_64 emulator and ARM64 phone release APKs rebuilt with storage fixes; source/artifact provenance verified. Physical-device verification remains false; personal processing remains disabled. Evidence: artifacts/remote/emulator-verification.json, emulator-*-pass.xml, emulator-report-restart.xml, emulator-storage-check.json, emulator-window-flags.txt, emulator-fix-check.log, emulator-fix-arm64-build.log. Emulator build and APK are under artifacts/emulator; phone build is under artifacts/android.

See docs/15-android-emulator-checkpoint.md for restart instructions and limits.

## Running the configured emulator

Start from a fresh SSH session so kvm membership applies:

```bash
cd /path/to/NutriGlimpse
python3 artifacts/remote/start-emulator.py
.tools/android-sdk/platform-tools/adb -s emulator-5580 shell getprop sys.boot_completed
```

Wait until boot_completed returns 1 before installation. The start script supplies project-local SDK, AVD and runtime-library paths. Do not start a duplicate emulator on port 5580. To install the emulator-specific build:

```bash
.tools/android-sdk/platform-tools/adb -s emulator-5580 install -r artifacts/emulator/health-grocery-beta0-preview-x86_64.apk
.tools/android-sdk/platform-tools/adb -s emulator-5580 shell am start -n org.cac.healthgrocery.beta0/.MainActivity
```

Use only emulator-5580 for these commands. The ARM64 phone APK is not the x86_64 emulator APK. UI hierarchy evidence contains fictional data only. The emulator was stopped after testing to release resources; its fictional state is retained.

Temporary engineering scripts under artifacts/remote support this checkpoint. build-emulator.py currently skips prebuild after the native project was generated; rerun Expo prebuild if native configuration changes before using it. The canonical phone build remains ops/build-preview.py.

## Remaining dependencies

No further administrator action is needed for this emulator. The system NVIDIA apt-list corruption remains an unrelated maintenance item, not a blocker for these tests. Physical Android/iPhone testing, iOS build/signing access, provider configuration, approved data sources, clinical review and beta access decisions remain as listed in the project plan. Receipt/product OCR fixes are engineering work, not external dependencies.


Receipt/product OCR failures described above were resolved in the October 8 checkpoint: see 17-beta0-android-server-checkpoint.md. Historical failed evidence is retained.
