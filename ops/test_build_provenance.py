import json, pathlib, tempfile, unittest
from build_provenance import snapshot_inputs, verify_record, sha256
class ProvenanceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)
        self.source = self.root / 'apps/mobile/src/app.ts'
        self.source.parent.mkdir(parents=True)
        self.source.write_text('fixture source')
    def test_source_and_config_changes_change_digest(self):
        original = snapshot_inputs(self.root)
        self.assertEqual(original, snapshot_inputs(self.root))
        self.source.write_text('changed source')
        self.assertNotEqual(original['sha256'], snapshot_inputs(self.root)['sha256'])
        (self.root / 'package-lock.json').write_text('{}')
        self.assertEqual(len(snapshot_inputs(self.root)['files']), 2)
    def test_generated_module_build_and_docs_are_excluded(self):
        before = snapshot_inputs(self.root)
        for name in ['apps/mobile/modules/example/android/build/output.bin', 'docs/plan.md']:
            path = self.root / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('generated')
        self.assertEqual(before, snapshot_inputs(self.root))
        native = self.root / 'apps/mobile/modules/example/android/source.kt'
        native.write_text('native source')
        self.assertNotEqual(before, snapshot_inputs(self.root))
    def test_verifier_rejects_changed_apk_or_sources(self):
        output = self.root / 'artifacts/android'
        output.mkdir(parents=True)
        apk = output / 'health-grocery-beta0-preview-arm64.apk'
        apk.write_bytes(b'fictional artifact')
        inputs = snapshot_inputs(self.root)
        record = {'bytes': apk.stat().st_size, 'sha256': sha256(apk), 'sourceSha256': inputs['sha256']}
        (output / 'preview-build.json').write_text(json.dumps(record))
        (output / 'preview-build-inputs.json').write_text(json.dumps(inputs))
        self.assertEqual(verify_record(self.root), record)
        self.source.write_text('changed')
        with self.assertRaisesRegex(ValueError, 'Build inputs'):
            verify_record(self.root)
        self.source.write_text('fixture source')
        apk.write_bytes(b'wrong artifact')
        with self.assertRaisesRegex(ValueError, 'APK differs'):
            verify_record(self.root)
if __name__ == '__main__':
    unittest.main()
