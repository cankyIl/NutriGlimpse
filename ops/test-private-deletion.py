import importlib.util, json, sqlite3, tempfile, unittest, uuid
from pathlib import Path
spec=importlib.util.spec_from_file_location('deletion',Path(__file__).with_name('delete-private-scan.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class DeletionTests(unittest.TestCase):
 def test_dry_run_delete_retry_and_restore_tombstone(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder);trace=str(uuid.uuid4());other=str(uuid.uuid4())
   for path,table in [('.tools/beta-diagnostics/events.sqlite','events'),('.tools/beta-response-journal/responses.sqlite','responses')]:
    p=root/path;p.parent.mkdir(parents=True);db=sqlite3.connect(p);db.execute('CREATE TABLE '+table+'(trace TEXT,payload BLOB)');db.executemany('INSERT INTO '+table+' VALUES(?,?)',[(trace,b'private'),(other,b'keep')]);db.commit();db.close()
   dry=module.remove_trace(root,trace);self.assertTrue(all(v['remaining']==1 for v in dry['stores'].values()));self.assertFalse((root/'.tools/privacy-deletions').exists())
   done=module.remove_trace(root,trace,True);self.assertTrue(all(v['matched']==1 and v['remaining']==0 for v in done['stores'].values()))
   self.assertTrue(all(v['matched']==0 for v in module.remove_trace(root,trace,True)['stores'].values()))
   self.assertTrue(all(v['remaining']==1 for v in module.remove_trace(root,other)['stores'].values()))
   receipt=root/'.tools/privacy-deletions'/(trace+'.json');self.assertEqual(json.loads(receipt.read_text())['trace'],trace);self.assertEqual(receipt.stat().st_mode&0o777,0o600)
 def test_invalid_trace_and_symlink_do_not_delete(self):
  with tempfile.TemporaryDirectory() as folder:
   root=Path(folder)
   with self.assertRaises(ValueError):module.remove_trace(root,"' OR 1=1 --",True)
   (root/'.tools').symlink_to(root,target_is_directory=True)
   with self.assertRaises(ValueError):module.remove_trace(root,str(uuid.uuid4()),True)
if __name__=='__main__':unittest.main()
