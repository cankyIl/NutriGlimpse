import unittest,importlib.util,tempfile,shutil,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('validator',Path(__file__).with_name('validate-guidance.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class GuidanceTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(dir=module.ROOT/'artifacts/remote/guidance');self.root=Path(self.temp.name)
  shutil.copytree(module.ROOT/'data/guidance',self.root/'data/guidance')
 def tearDown(self):self.temp.cleanup()
 def mutate(self,file,edit):
  p=self.root/'data/guidance'/file;x=json.loads(p.read_text());edit(x);p.write_text(json.dumps(x))
 def test_collected_library(self):self.assertEqual(module.validate(self.root)['entries'],26)
 def test_tampered_snapshot(self):
  p=self.root/'data/guidance/sources/2026-10-14/ckd.html';p.write_text('tampered')
  with self.assertRaises(AssertionError):module.validate(self.root)
 def test_no_unreviewed_activation(self):
  self.mutate('library.json',lambda x:x.update(personalizedRecommendationsEnabled=True))
  with self.assertRaises(AssertionError):module.validate(self.root)
 def test_broken_reference(self):
  self.mutate('library.json',lambda x:x['entries'][0].update(sourceId='unverified'))
  with self.assertRaises(AssertionError):module.validate(self.root)
 def test_daily_weekly_confusion(self):
  self.mutate('serving-tables.json',lambda x:x['tables'][0]['rows'][5].update(periods=['day']*7))
  with self.assertRaises(AssertionError):module.validate(self.root)
 def test_missing_calorie_column(self):
  self.mutate('serving-tables.json',lambda x:x['tables'][1]['rows'][0]['ranges'].pop())
  with self.assertRaises(AssertionError):module.validate(self.root)
 def test_invented_kidney_target(self):
  self.mutate('library.json',lambda x:next(e for e in x['entries'] if e['id']=='ckd-potassium').update(publishedValue={'max':2000}))
  with self.assertRaises(AssertionError):module.validate(self.root)
if __name__=='__main__':unittest.main()
