# Android standalone preview — Beta 0 engineering build

This preview runs the sample journeys without Metro, Expo Go or a running backend. It is not the completed Beta 0 release: real report/receipt uploads, clinical interpretation and live catalog/store coverage remain disabled or unfinished. Use fictional information only.

## Build and artifact

On project-server, from /path/to/NutriGlimpse:

```bash
source ops/remote-env.sh
python3 ops/build-preview.py
```

The build runs Expo prebuild, assembles an ARM64 release variant, signs it with a dedicated internal key, verifies its signature and bundled JavaScript, and checks that debugging/backup are disabled and blocked permissions are absent.

APK: artifacts/android/health-grocery-beta0-preview-arm64.apk
Build details and SHA-256: artifacts/android/preview-build.json
Manifest evidence: artifacts/android/preview-manifest.xml

The signing key/password stay under .tools/signing with restricted permissions and are excluded from Git. Preserve them securely to install future updates over this preview. They are not app/API credentials and are never bundled in the APK. This is an internal preview certificate, not a Play Store enrollment.

## Installing on a phone

1. Confirm the phone is ARM64 and runs Android 7 or later. Its actual model/OS has not yet been recorded.
2. Transfer the APK privately to the phone using a USB cable or your chosen file-transfer method.
3. Open the APK and, if Android asks, allow that file-opening application to install this app. Turn that permission off again afterward if no longer needed.
4. Open Health & Grocery Beta 0. No account, Expo Go or development server is required.
5. Enter a fictional profile and use only the built-in sample journeys.

If an older development APK with the same package name was installed, its different signing key prevents an in-place update. Removing that old installation deletes its app data; preserve any wanted test data first. Subsequent previews signed with the same internal key should update in place.

## Storage upgrade note

The durable-rule-trust preview upgrades the encrypted database to schema 2 while preserving existing personal records. Older schema-1 builds intentionally refuse to open it. Keep an encrypted export of wanted fictional test records before changing builds; an APK packaging pass does not verify this migration on a phone. Personal archive restore and reset do not overwrite the separate rule-trust table.

## First phone verification checklist

Record phone model, Android version, build SHA-256, result and reproducible steps. Do not attach real reports or personal data to feedback.

- Upgrade: install over the previous internally signed preview and verify the fictional profile/history survive the schema-2 migration.
- Cold launch: onboarding displays; fictional age below 21 is rejected; valid setup reaches home.
- Relaunch: saved fictional profile and history remain after force-closing the app.
- Offline: enable airplane mode and cold-launch; sample products, receipts and saved reports remain usable.
- Receipt: edit apples to 1.25 lb, remove and undo a line, save and reopen. Zero/invalid quantities cannot save.
- Report: review fictional values/date, confirm, run the clearly marked simulation, then reopen the saved result without repeating analysis.
- Report correction: correct a fictional saved value, cancel and verify unchanged data; then confirm the change, verify the old result disappears, explicitly process, and reopen revision 2. Confirming unchanged values must retain the saved result.
- Barcode formats: scan UPC-E, UPC-A, EAN-8 and EAN-13 samples; compare normalized identifiers with printed codes. Manually select UPC-E when entering its full eight digits. A checksum pass does not establish a catalog match.
- Camera lifecycle: open then cancel a pending permission request, leave the screen, or background the app before replying. A late grant must not reopen capture. Return and explicitly reopen; one barcode should produce one result. Verify permission denial and phone-settings return separately.
- Camera: grant and deny permission separately; manual barcode entry remains usable. A real barcode does not establish a verified product match yet.
- Privacy: verify screenshot/app-switcher behavior; export a password-encrypted test archive, preview restore and confirm replacement.
- Restore recovery: preview one fictional backup, then select a wrong-password/corrupt backup. The earlier preview must disappear. Cancel selection and verify no replacement occurs; rapidly confirm a valid preview and verify only one restore.
- Delete: delete a saved result and relaunch; reset local data and confirm onboarding returns.
- Accessibility: large text, keyboard, back navigation and screen-reader labels remain usable.

These checks have not been performed on a physical phone. A successful build and manifest inspection do not prove SQLCipher operation, OS backup exclusion, screenshot protection or file-provider behavior at runtime.

## Remaining release gates

Native OCR/PDF rendering and automatic redaction; verified source coverage; reviewed clinical rules; OpenAI access and retention configuration; iOS builds/signing; two-phone privacy/usability checks; dependency advisory resolution and production backend configuration.

The updated APK includes Privacy > Local input test, with separate Run fictional image test and Run fictional PDF test buttons. Both generate fictional content only; PDF success must report two pages. Run each, then cancel a repeat attempt and verify cleanup. No personal file picker opens. It reports OCR/reconstruction counts and cleans temporary files. Real imports remain disabled. Current artifact hash is in preview-build.json.

### Invalid input diagnostic (latest preview)

In Privacy > Local input test, select **Test invalid file rejection**. The app generates empty, corrupt and just-over-20-MiB files without opening personal documents. Expected completion reports three rejections and cleaned temporary sessions. Any other error, cancellation, acceptance or cleanup failure must not display a passing result. Run again after a successful completion to check session recovery; test background/cancel separately. This check does not approve real-data privacy. Physical execution and file removal remain tester acceptance items.

### Resource cleanup follow-up

Exercise fictional image/PDF/invalid-file tests one at a time, cancel or background during work, and verify a subsequent test can run after cleanup completes. Engineering acceptance also needs native concurrent-call and allocation-failure injection; the automated JavaScript suite does not establish native low-memory behavior. Process-kill recovery uses startup cleanup and must be checked separately.

### Accessibility and save recovery

Enable TalkBack, then VoiceOver on the iPhone when that build is available. Verify selections announce checked/disabled state, draft controls cannot change during a save, validation/retry messages are announced, and controls re-enable after a failed save. Check hardware keyboard activation as well as touch. Test large text and focus order on real phones; these are still acceptance items, not completed accessibility certification.

### Receipt review conflicts

Using fictional data, save a receipt, edit and save it again, then reopen it from History to verify the second save. If two reviews of the same saved receipt remain on the navigation stack, save a change in the newer review, return to the older draft and try saving: the older draft must not overwrite the newer record. A deleted/reset record must not reappear through an old review. Failure guidance should retain the draft and direct you to History when needed.

### Verify the preview before distribution

On project-server, from /path/to/NutriGlimpse, run python3 ops/build_provenance.py. It must pass against the current source and APK. Build metadata and input digests are in artifacts/android/preview-build.json and preview-build-inputs.json. Rebuild if source verification fails; do not relabel an older APK as current. This does not replace physical device acceptance or authorize personal data.

## Updated fictional input checks

From Product, Receipt or Report, choose Read a fictional image. Confirm that extraction review appears only after temporary cleanup. Reports also offer the generated two-page PDF in the phone build. Personal camera/document and location controls stay locked. Test fresh-food preparation/weight and manual store area; no real branch source is enabled. Record device model/OS, camera/OCR behavior, storage/relaunch and privacy results separately from this packaging pass.


## Server AI examples and latest verification
See [Android/server checkpoint](17-beta0-android-server-checkpoint.md) for the current APK hash, USB tunnel instructions, verified receipt/product/PDF behavior and remaining phone acceptance. Offline sample journeys still work without the backend. Server examples use built-in fictional fixtures only.
