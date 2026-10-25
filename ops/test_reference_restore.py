import importlib.util
from pathlib import Path
import hashlib, tempfile, unittest

spec = importlib.util.spec_from_file_location('restore_reference', Path(__file__).with_name('restore-reference-data.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ReferenceRestoreTest(unittest.TestCase):
    def test_preserves_existing_evidence_and_requires_hash(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            digest = hashlib.sha256(b'original').hexdigest()
            self.assertTrue(module.store_checked(root, 'data/source.html', b'original', digest))
            self.assertFalse(module.store_checked(root, 'data/source.html', b'original', digest))
            with self.assertRaises(ValueError): module.store_checked(root, 'data/source.html', b'changed')
            with self.assertRaises(ValueError): module.store_checked(root, 'data/new.html', b'changed', digest)
            self.assertEqual((root/'data/source.html').read_bytes(), b'original')
            self.assertFalse((root/'data/new.html').exists())

    def test_path_escape_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaises(ValueError): module.store_checked(Path(folder), '../outside', b'value')

    def test_city_filter_and_coordinate_order(self):
        valid = {'country_code':'US','target_type':'City','canonical_name':'Example,Massachusetts,United States','gps':[-71.6,42.3]}
        rows = [valid, {**valid,'country_code':'CA'}, {**valid,'target_type':'State'}, {**valid,'gps':[True,42]}, {**valid,'gps':[0,100]}]
        self.assertEqual(module.select_cities(rows), [{'name':valid['canonical_name'],'longitude':-71.6,'latitude':42.3}])
        with self.assertRaises(ValueError): module.select_cities([])

if __name__ == '__main__': unittest.main()
