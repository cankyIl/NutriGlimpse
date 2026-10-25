import importlib.util
import pathlib
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('package_ios_source', pathlib.Path(__file__).with_name('package-ios-source.py'))
packager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(packager)

class SourcePackageTests(unittest.TestCase):
    def test_source_package_excludes_development_metadata_and_credentials(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            paths = [
                'package.json', 'apps/mobile/src/app.ts', 'apps/service/src/server.ts',
                'apps/mobile/AGENTS.md', 'apps/mobile/src/AGENTS.md', 'docs/CLAUDE.md',
                'apps/mobile/src/.codex/state.json', 'docs/codex/local.txt',
                'apps/mobile/modules/demo/.cursor/rules.md', 'docs/AppleCredentials',
                'docs/README.md',
            ]
            for relative in paths:
                path = root / relative
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text('fixture')
            previous = packager.ROOT
            try:
                packager.ROOT = root
                actual = {path.relative_to(root).as_posix() for path in packager.paths()}
            finally:
                packager.ROOT = previous
            self.assertEqual(actual, {'package.json', 'apps/mobile/src/app.ts', 'apps/service/src/server.ts', 'docs/README.md'})

if __name__ == '__main__':
    unittest.main()
