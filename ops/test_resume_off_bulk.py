import importlib.util,json,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('resume',Path(__file__).with_name('resume-off-bulk.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ResumeTests(unittest.TestCase):
 def test_integrity_identity_and_cursor(self):
  with tempfile.TemporaryDirectory() as name:
   root=Path(name);source={'revision':'a'*40,'url':'pinned'};state=m.load_state(root,source)
   p=root/'group-00001.jsonl';p.write_text('{}\n')
   state['completed']=[{'group':1,'file':p.name,'sha256':m.digest(p),'extractedAt':'2026-10-14T00:00:00+00:00'}]
   m.atomic_json(root/'manifest.json',state);self.assertEqual(m.load_state(root,source)['completed'][0]['group'],1)
   with self.assertRaises(ValueError):m.load_state(root,{**source,'revision':'b'*40})
   p.write_text('changed')
   with self.assertRaises(ValueError):m.load_state(root,source)
 def test_market_hints_never_inventory(self):
  self.assertTrue(m.select({'countries_tags':['en:united-states'],'brands':'Wegmans'}))
  self.assertFalse(m.select({'countries_tags':['en:france'],'brands':'Wegmans'}))
  self.assertFalse(m.select({'countries_tags':['en:united-states'],'brands':'Unrelated'}))
 def test_rate_limit_cooldown(self):
  class Error(Exception):status=429;headers={'Retry-After':'120'}
  self.assertEqual(m.retry_at(Error(),100),220)
  Error.headers={'Retry-After':'bad'};self.assertEqual(m.retry_at(Error(),100),3700)
if __name__=='__main__':unittest.main()
