#!/usr/bin/env python3
"""Compile a local iOS Release app; never logs in, uploads, or selects a paid team."""
import argparse, hashlib, json, os, platform, plistlib, subprocess
from datetime import datetime, timezone
from pathlib import Path
from build_provenance import snapshot_inputs
ROOT = Path(__file__).resolve().parents[1]
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--target", choices=["simulator", "device"], default="simulator")
    args = parser.parse_args()
    if platform.system() != "Darwin":
        raise SystemExit("This build requires the prepared Mac with Xcode.")
    inputs = snapshot_inputs(ROOT)
    env = os.environ.copy()
    env["PATH"] = ":".join([str(ROOT/".tools/node-v24.15.0-darwin-arm64/bin"), str(ROOT/".tools/ruby-3.4.11/bin"), env["PATH"]])
    env.update({"CI": "1", "LANG": "en_US.UTF-8", "EXPO_PUBLIC_BUILD_STAGE": "beta0", "NODE_ENV": "production", "FORCE_BUNDLING": "1"})
    workspace = ROOT/"apps/mobile/ios/HealthGroceryBeta0.xcworkspace"
    lock = ROOT/"apps/mobile/ios/Podfile.lock"
    if not workspace.is_dir() or not lock.is_file():
        raise SystemExit("Prepare the iOS project and install CocoaPods dependencies first.")
    output = ROOT/"artifacts/mac"
    output.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    logpath = output/(args.target+"-"+stamp+".log")
    resultpath = output/(args.target+"-"+stamp+".xcresult")
    derived = output/"DerivedData"
    destination = "generic/platform=iOS Simulator" if args.target == "simulator" else "generic/platform=iOS"
    command = ["xcodebuild", "-workspace", str(workspace), "-scheme", "HealthGroceryBeta0",
               "-configuration", "Release", "-destination", destination, "-derivedDataPath", str(derived),
               "-resultBundlePath", str(resultpath), "-jobs", "4", "ARCHS=arm64", "ONLY_ACTIVE_ARCH=YES"]
    command += ["CODE_SIGN_IDENTITY=-"] if args.target == "simulator" else ["CODE_SIGNING_ALLOWED=NO"]
    command += ["build"]
    print("Building "+args.target+"; log: "+str(logpath), flush=True)
    with logpath.open("w") as log:
        result = subprocess.run(["caffeinate", "-i", *command], cwd=ROOT/"apps/mobile", env=env, stdout=log, stderr=subprocess.STDOUT)
    if result.returncode:
        print("Build failed; see "+str(logpath), flush=True)
        raise SystemExit(result.returncode)
    folder = "Release-iphonesimulator" if args.target == "simulator" else "Release-iphoneos"
    app = derived/"Build/Products"/folder/"HealthGroceryBeta0.app"
    info = plistlib.loads((app/"Info.plist").read_bytes())
    if info["CFBundleIdentifier"] != "org.cac.healthgrocery.beta0":
        raise RuntimeError("Unexpected application identity")
    if not (app/"main.jsbundle").is_file():
        raise RuntimeError("Standalone JavaScript bundle missing")
    if snapshot_inputs(ROOT) != inputs:
        raise RuntimeError("Source changed during build; artifact not verified")
    entries = [{"path": p.relative_to(app).as_posix(), "sha256": digest(p)} for p in sorted(app.rglob("*")) if p.is_file()]
    report = {"builtAtUTC": datetime.now(timezone.utc).isoformat(), "target": args.target,
              "artifact": str(app), "sourceSha256": inputs["sha256"], "podLockSha256": digest(lock),
              "buildScriptSha256": digest(Path(__file__)), "fileCount": len(entries),
              "artifactTreeSha256": hashlib.sha256(json.dumps(entries, sort_keys=True, separators=(",", ":")).encode()).hexdigest(),
              "xcode": subprocess.check_output(["xcodebuild", "-version"], text=True).strip(),
              "log": str(logpath), "resultBundle": str(resultpath), "bundledJavaScript": True,
              "signing": "simulator ad hoc" if args.target == "simulator" else "unsigned; not installable on a physical phone",
              "physicalDeviceVerified": False, "personalMedicalRecommendationsEnabled": False,
              "generalMediaCaptureEnabled": False, "modelDistributionApproved": False}
    (output/(args.target+"-build-inputs.json")).write_text(json.dumps(inputs, indent=2)+"\n")
    (output/(args.target+"-artifact-files.json")).write_text(json.dumps(entries, indent=2)+"\n")
    (output/(args.target+"-build.json")).write_text(json.dumps(report, indent=2)+"\n")
    print(json.dumps(report, indent=2), flush=True)
if __name__ == "__main__":
    main()
