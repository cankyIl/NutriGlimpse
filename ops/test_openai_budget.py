import importlib.util, tempfile, unittest, pathlib, json
spec=importlib.util.spec_from_file_location('budget',pathlib.Path(__file__).with_name('openai-budget.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class BudgetTests(unittest.TestCase):
 def test_legacy_history_and_attempts_beyond_old_cap(self):
  with tempfile.TemporaryFile(mode='w+') as f:
   previous=''.join(json.dumps({'kind':'fixture','reservedMicroUSD':20000})+'\n' for _ in range(450))
   f.write(previous);f.flush()
   m.reserve(f,'fictional');m.reserve(f,'fictional')
   f.seek(0);saved=f.read();self.assertTrue(saved.startswith(previous))
   added=[json.loads(line) for line in saved[len(previous):].splitlines()]
   self.assertEqual(len(added),2)
   self.assertTrue(all(row['attemptCount']==1 and 'reservedMicroUSD' not in row for row in added))
 def test_corruption_blocks_without_partial_write(self):
  for bad in ['not json\n','null\n','{"attemptCount":true}\n','{"attemptCount":2}\n','{"attemptCount":1,"reservedMicroUSD":20000}\n']:
   with self.subTest(bad=bad),tempfile.TemporaryFile(mode='w+') as f:
    f.write(bad);f.flush()
    with self.assertRaises(ValueError):m.reserve(f,'fictional')
    f.seek(0);self.assertEqual(f.read(),bad)
if __name__=='__main__':unittest.main()
