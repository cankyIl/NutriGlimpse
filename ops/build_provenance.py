#!/usr/bin/env python3
import hashlib, json, os, pathlib
ROOTS = ('apps/mobile/src', 'apps/mobile/modules', 'apps/mobile/plugins', 'apps/mobile/assets',
         'packages/core/src', 'vendor')
FILES = ('package.json', 'package-lock.json', 'apps/mobile/package.json', 'apps/mobile/app.json',
         'apps/mobile/tsconfig.json', 'apps/mobile/babel.config.js', 'apps/mobile/metro.config.js',
         'packages/core/package.json', 'packages/core/tsconfig.json', 'ops/build-preview.py',
         'ops/build_provenance.py', 'ops/internal-signing.gradle', 'ops/apply-decoder-patch.cjs',
         'ops/remote-env.sh')
# Editor/assistant instructions and local state are not application build inputs.
DEVELOPMENT_DIRS = {'codex', '.codex', '.agents', '.claude', '.cursor', '.gemini'}
DEVELOPMENT_FILES = {'agents.md', 'claude.md', 'gemini.md', '.cursorrules', 'copilot-instructions.md'}
IGNORED = {'node_modules', 'build', '.gradle', '.expo', '__pycache__'}
def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def snapshot_inputs(root):
    root = pathlib.Path(root).resolve()
    paths = {root / name for name in FILES if (root / name).is_file()}
    for name in ROOTS:
        directory = root / name
        if not directory.is_dir():
            continue
        for base, dirs, files in os.walk(directory):
            dirs[:] = sorted(d for d in dirs if d not in IGNORED and d.casefold() not in DEVELOPMENT_DIRS)
            for filename in files:
                if filename.casefold() in DEVELOPMENT_FILES:
                    continue
                path = pathlib.Path(base) / filename
                if path.is_symlink():
                    raise ValueError('Build input symlinks require explicit review.')
                paths.add(path)
    entries = [{'path': path.relative_to(root).as_posix(), 'sha256': sha256(path)} for path in sorted(paths)]
    digest = hashlib.sha256(json.dumps(entries, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
    return {'sha256': digest, 'files': entries}
def verify_record(root):
    root = pathlib.Path(root)
    output = root / 'artifacts/android'
    record = json.loads((output / 'preview-build.json').read_text())
    artifact = output / 'health-grocery-beta0-preview-arm64.apk'
    if artifact.stat().st_size != record['bytes'] or sha256(artifact) != record['sha256']:
        raise ValueError('APK differs from the verified build record.')
    inputs = snapshot_inputs(root)
    saved = json.loads((output / 'preview-build-inputs.json').read_text())
    if inputs != saved or inputs['sha256'] != record['sourceSha256']:
        raise ValueError('Build inputs changed; rebuild before distributing this APK.')
    return record
if __name__ == '__main__':
    record = verify_record(pathlib.Path(__file__).resolve().parent.parent)
    print(json.dumps({key: record[key] for key in ['sha256', 'sourceSha256', 'builtAtUTC', 'deviceVerified', 'personalProcessingEnabled']}, indent=2))
