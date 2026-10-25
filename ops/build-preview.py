#!/usr/bin/env python3
"""Run after sourcing ops/remote-env.sh; credentials never appear in command output."""
import argparse
import json, os, pathlib, secrets, subprocess, shutil, hashlib, zipfile, tempfile
from datetime import datetime, timezone
from build_provenance import snapshot_inputs
import xml.etree.ElementTree as ET
root = pathlib.Path('/path/to/NutriGlimpse')
os.chdir(root)
parser=argparse.ArgumentParser();parser.add_argument('--architecture',choices=['arm64-v8a','x86_64'],default='arm64-v8a');args=parser.parse_args()
architecture=args.architecture
inputs = snapshot_inputs(root)
assert os.environ.get('JAVA_HOME'), 'Source ops/remote-env.sh first'
private = root / '.tools/signing'
private.mkdir(mode=0o700, exist_ok=True)
private.chmod(0o700)
password_file = private / 'internal-password'
key = private / 'internal-preview.p12'
if not password_file.exists():
    assert not key.exists(), 'Existing key has no password file; preserve it and recover credentials'
    descriptor = os.open(password_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w') as stream:
        stream.write(secrets.token_urlsafe(48))
env = dict(os.environ, CONGRESS_SIGNING_PASSWORD=password_file.read_text(),
           CONGRESS_SIGNING_STORE=str(key), NODE_ENV='production', CI='1',
           CMAKE_BUILD_PARALLEL_LEVEL='2')
if not key.exists():
    subprocess.run(['keytool', '-genkeypair', '-keystore', str(key), '-storetype', 'PKCS12',
        '-alias', 'congress-internal', '-keyalg', 'RSA', '-keysize', '3072', '-validity', '3650',
        '-storepass:env', 'CONGRESS_SIGNING_PASSWORD', '-keypass:env', 'CONGRESS_SIGNING_PASSWORD',
        '-dname', 'CN=Congress App Internal Preview', '-noprompt'], env=env, check=True)
    key.chmod(0o600)
subprocess.run(['npx', 'expo', 'prebuild', '--platform', 'android', '--no-install'],
               cwd=root/'apps/mobile', env=env, check=True)
gradlew=root/'apps/mobile/android/gradlew'
gradlew.chmod(0o755)
subprocess.run([str(gradlew), 'assembleRelease', '--no-daemon', '--max-workers=2',
               '-PreactNativeArchitectures='+architecture, '--init-script', str(root/'ops/internal-signing.gradle')],
               cwd=gradlew.parent, env=env, check=True)
output=root/('artifacts/android' if architecture=='arm64-v8a' else 'artifacts/emulator')
output.mkdir(parents=True, exist_ok=True)
staging = tempfile.TemporaryDirectory(prefix='preview-', dir=output)
apk=pathlib.Path(staging.name)/('health-grocery-beta0-preview-arm64.apk' if architecture=='arm64-v8a' else 'health-grocery-beta0-preview-x86_64.apk')
shutil.copy2(root/'apps/mobile/android/app/build/outputs/apk/release/app-release.apk', apk)
sdk=pathlib.Path(os.environ['ANDROID_HOME'])
subprocess.run([str(sdk/'build-tools/36.0.0/apksigner'), 'verify', '--verbose', str(apk)], env=env, check=True)
with zipfile.ZipFile(apk) as archive:
    assert 'assets/index.android.bundle' in archive.namelist(), 'Standalone JS bundle missing'
    assert any('lib/'+architecture+'/' in name for name in archive.namelist())
manifest = subprocess.check_output([str(sdk/'cmdline-tools/latest/bin/apkanalyzer'), 'manifest', 'print', str(apk)], env=env, text=True)
tree = ET.fromstring(manifest)
ns = '{http://schemas.android.com/apk/res/android}'
app = tree.find('application')
assert app is not None
assert app.get(ns+'debuggable', 'false') == 'false', 'Preview must not be debuggable'
assert app.get(ns+'allowBackup') == 'false', 'Backup exclusion missing'
assert app.get(ns+'dataExtractionRules'), 'Device-transfer rules missing'
permissions = [p.get(ns+'name') for p in tree.findall('uses-permission')]
blocked = json.loads((root/'apps/mobile/app.json').read_text())['expo']['android']['blockedPermissions']
assert not set(blocked).intersection(permissions), 'Unexpected broad storage/overlay permission'
assert snapshot_inputs(root) == inputs, 'Source changed during build; staged APK was not published'
(pathlib.Path(staging.name)/'preview-manifest.xml').write_text(manifest)
record={'artifact':str(output/apk.name), 'sourceSha256':inputs['sha256'], 'sourceFileCount':len(inputs['files']),
        'builtAtUTC':datetime.now(timezone.utc).isoformat(), 'sha256':hashlib.sha256(apk.read_bytes()).hexdigest(),
        'bytes':apk.stat().st_size, 'architecture':architecture, 'bundledJavaScript':True,
        'signing':'project-specific internal preview key', 'deviceVerified':False,
        'personalProcessingEnabled':True, 'personalMedicalRecommendationsEnabled':False, 'generalMediaCaptureEnabled':False, 'reportProcessing':'consented-numeric-evidence-only', 'shelfModels':'diagnostic-only; distribution-rights-pending', 'debuggable':False, 'allowBackup':False, 'permissions':permissions}
(pathlib.Path(staging.name)/'preview-build.json').write_text(json.dumps(record, indent=2))
(pathlib.Path(staging.name)/'preview-build-inputs.json').write_text(json.dumps(inputs, indent=2))
# Individual atomic replacements; verifier detects interruption between artifact and record publication.
for name in [apk.name, 'preview-manifest.xml', 'preview-build-inputs.json', 'preview-build.json']:
    os.replace(pathlib.Path(staging.name)/name, output/name)
staging.cleanup()
print(json.dumps(record, indent=2))
