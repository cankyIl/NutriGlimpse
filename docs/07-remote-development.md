# Remote development and hosting

October 6, 2026. Authoritative workspace: `/path/to/NutriGlimpse/` on `project-server`, user `developer`, SSH alias `project-server`. The laptop is the Codex/browser interface; its original source remains a recovery snapshot. Future source edits and builds belong on the server. Do not overwrite newer server files with the laptop snapshot.

## Migration and verification

Transferred source, documents, Git metadata, generated Android source and saved audit artifacts. The transfer archive SHA-256 is `22d26b4910febe027c280a783795076f4a3cc8b07e2ac0d7f5785c78bdc70ad7`. All 442 files matched the archive before subsequent remote edits. Windows read-only attributes were normalized to Linux writable modes. Reproducible dependencies, Expo caches, exports and native build caches were excluded and rebuilt as needed.

Remote TypeScript, lint and all 31 tests passed. Web, Android and iOS JavaScript exports passed. Preview and backend HTTP checks passed from the server and laptop through SSH. Logs and migration verification are in `artifacts/remote/`. Native compilation status is recorded separately in the implementation log.

## Daily operation

Connect with `ssh project-server`. In remote Bash:

```bash
cd /path/to/NutriGlimpse
source ops/remote-env.sh
npm run check
```

Laptop browser forwarding (leave the terminal running):

```powershell
ssh -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -L 18081:127.0.0.1:8081 -L 13001:127.0.0.1:3001 project-server
```

Preview: http://localhost:18081/ . Backend: http://localhost:13001/health . A hidden SSH forwarding process is currently running on the laptop; reconnect after reboot, and do not start duplicate forwarding on occupied ports.

User services `congress-preview` and `congress-backend` are enabled with existing user lingering. Unit files are in `ops/`. Use `systemctl --user status congress-preview congress-backend`, `systemctl --user restart congress-backend` after backend edits, and `journalctl --user -u congress-preview -n 50` for logs. Preview watches source changes. Services use loopback interfaces, CPU quota 200%, memory high 3G/max 5G, and nice 5. No public app routing was added.

## Server inventory and existing workloads

Ubuntu 26.04 LTS x86_64; Intel i5-10400F, 6 cores/12 threads; 30 GiB RAM; 8 GiB swap; initially 277 GB free. NVIDIA GTX 1660 SUPER, 6 GiB VRAM, driver 595.58.03. GPU model serving has not been installed or benchmarked.

Existing Cloudflare Tunnel, system portfolio-dashboard-restricted, and user portfolio-dashboard services were left unchanged. The restricted dashboard runs as portfolio-web on 127.0.0.1:8766. The user dashboard works under `/home/developer/Finances/CodexPortfolioResearch/Live/insured4_z2_dual_2026_09_01`. Python services also use LAN ports 8765–8768 and loopback 8877. Public https://portfolio.serveforwad.com/ and both checked local dashboard endpoints returned HTTP 200 after migration. Tunnel credentials were not read.

## Installed tools and outstanding dependencies

Project-local Node 24.15.0/npm 11.12.1, Temurin JDK 17.0.20.1, Android command-line tools 22.0, platform-tools, API 36 and build-tools 36.0.0 are installed under `.tools/`. Download checksums matched vendor metadata. SDK licenses were accepted during authorized installation. Environment and cache paths are in `ops/remote-env.sh`. npm dependencies were installed from the preserved lockfile.

Noninteractive sudo needs administrator authentication. The existing apt index reports a malformed NVIDIA repository Packages file; an administrator must repair/update apt before system package installation. Native React Native DevTools GUI reports missing libasound.so.2; the web preview works independently. The user lacks write access to /dev/kvm; accelerated Android emulation needs administrator configuration. No emulator/device verification yet. iOS compilation/signing still requires macOS access.

This machine is the selected backend host. The current backend only serves synthetic fixtures, and personal processing remains disabled. Public HTTPS routing, operational metadata/retention, abuse controls and production configuration remain unfinished. OpenAI access and clinical/source approvals remain separate dependencies.

To reproduce the ARM64 development build, run `bash ops/build-android.sh`. Gradle also provisioned NDK 27.1.12297006, build-tools 35.0.0 and CMake 3.22.1 under the project SDK. A development APK uses Metro and is not the standalone beta distribution build. Known npm advisories remain 19 high and 11 moderate; migration does not resolve release security gates.

### Android build result — October 6, 2026

Native ARM64 development build passed on project-server: BUILD SUCCESSFUL in 8m 13s, 664 tasks. APK: /path/to/NutriGlimpse/apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk (approximately 97 MB). APK signature verified using v2. SHA-256: dd4478eb02083aeceb03873c7724e04adac8ba5d96d634fea07eff25f3367f97. This supersedes the earlier missing-Java/no-APK checkpoint. It is a debug development-client build requiring Metro, not the standalone beta release. No physical phone testing or native privacy acceptance has been performed.

## Standalone Android preview

Build with: source ops/remote-env.sh && python3 ops/build-preview.py. The preview bundles JavaScript and does not require Metro. See [installation guide](08-android-preview-guide.md). Key/password remain restricted under .tools/signing; preserve them for compatible updates. The app is still synthetic-only and device verification is pending.
