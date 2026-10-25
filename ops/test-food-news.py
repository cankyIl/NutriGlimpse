import importlib.util, unittest, tempfile, json, threading, fcntl
from datetime import datetime,timezone,timedelta
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('news',Path(__file__).with_name('refresh-food-news.py'));n=importlib.util.module_from_spec(spec);spec.loader.exec_module(n)
NOW=datetime(2026,10,18,18,0,tzinfo=timezone.utc)
def feed(title='Nutrition and whole grains',date='Sat, 17 Oct 2026 12:00:00 +0000',url='https://www.nih.gov/story',extra=''):
 return f'<rss><channel><item><title>{title}</title><pubDate>{date}</pubDate><link>{url}</link>{extra}</item></channel></rss>'.encode()
def source_feed(url):
 publisher,_,host=next(s for s in n.SOURCES if s[1]==url)
 if publisher=='Tufts Now':return b'<article><h3 class="teaser__title"><a href="/2026/10/17/food">Food and nutrition studies</a></h3><p class="teaser__subtitle">October 17, 2026</p></article>'
 return feed(title={'EatingWell':'Dietitian tips for blood sugar','Clean Eating':'Vegetarian meal ideas','ScienceDaily':'Scientists explore fiber and diet','NIH Research Matters':'Nutrition and whole grains'}.get(publisher,'Healthy eating and vegetables'),url='https://'+host+'/story')
class News(unittest.TestCase):
 def parse(self,raw,publisher='NIH Research Matters',stats=None):
  s=next(x for x in n.SOURCES if x[0]==publisher);return n.parse_feed(raw,*s,NOW,stats)
 def test_dates_links_duplicates_and_unsafe_xml(self):
  self.assertEqual(len(self.parse(feed())),1)
  for raw in [feed(date='bad'),feed(date='Fri, 18 Oct 2030 12:00:00 +0000'),feed(url='https://www.nih.gov.evil.test/x'),feed(url='http://www.nih.gov/x'),feed(url='https://user@www.nih.gov/x'),feed(url='https://www.nih.gov:444/x'),feed(title='Miracle cure diet'),feed(title='Politics today'),feed(title='tRNA treatment may restore proteins'),feed(title='Scientists identify tau protein in brain diseases')]:self.assertEqual(self.parse(raw),[])
  self.assertEqual(len(n.select(self.parse(feed())*5)),1)
  with self.assertRaises(ValueError):self.parse(b'<!DOCTYPE rss [<!ENTITY a "x">]><rss/>')
  with self.assertRaises(ValueError):self.parse(b'x'*(n.MAX_BYTES+1))
 def test_freshness_boundary_and_stale_clean_eating(self):
  fmt=n.email.utils.format_datetime
  self.assertEqual(len(self.parse(feed(date=fmt(NOW-timedelta(days=7))))),1)
  self.assertEqual(self.parse(feed(date=fmt(NOW-timedelta(days=7,seconds=1)))),[])
  stats={};self.assertEqual(self.parse(feed(date='Mon, 15 Sep 2025 12:00:00 +0000',url='https://www.cleaneatingmag.com/food'),'Clean Eating',stats),[])
  self.assertEqual(stats['expired'],1);self.assertTrue(stats['newestPublishedAt'].startswith('2025-09-15'))
 def test_source_metadata_and_early_research(self):
  row=self.parse(feed(title='Diet and blood sugar tested',url='https://www.sciencedaily.com/releases/study',extra='<description>A study in mice.</description><category>Diabetes</category>'),'ScienceDaily')[0]
  self.assertEqual(row['evidence'],'early-research');self.assertEqual(row['tags'],['diabetes']);self.assertEqual(row['kind'],'research');self.assertNotIn('description',row)
  row=self.parse(feed(title='Dinner in 20 minutes',url='https://www.eatingwell.com/dinner',extra='<category>Vegetarian Recipes</category>'),'EatingWell')[0]
  self.assertEqual(row['kind'],'recipe');self.assertEqual(row['tags'],['vegetarian'])
  self.assertEqual(self.parse(feed(title='Sponsored healthy meals',url='https://www.eatingwell.com/ad'),'EatingWell'),[])
 def test_publisher_slogan_does_not_admit_unrelated_products(self):
  raw=feed(title='The best shoes to buy',url='https://www.eatingwell.com/shoes',extra='<category>EatingWell: Healthy Recipes, Healthy Eating</category><category>Product Picks &amp; Deals</category>')
  self.assertEqual(self.parse(raw,'EatingWell'),[])
  row=self.parse(feed(title='Zero sugar soda and blood sugar',url='https://www.eatingwell.com/soda',extra='<category>EatingWell: Healthy Recipes, Healthy Eating</category><category>Diabetes Diet</category>'),'EatingWell')[0]
  self.assertEqual(row['kind'],'news');self.assertEqual(row['tags'],['diabetes'])
  for title in ['How too much salt affects the brain','Eating late linked to liver disease','Gut bacteria changes how many calories you absorb']:
   self.assertEqual(len(self.parse(feed(title=title,url='https://www.sciencedaily.com/releases/story'),'ScienceDaily')),1)
 def test_dst_missed_duplicate_and_bounded_retries(self):
  self.assertFalse(n.due(datetime(2026,3,8,6,59,tzinfo=timezone.utc),None))
  self.assertTrue(n.due(datetime(2026,3,8,7,0,tzinfo=timezone.utc),None))
  self.assertFalse(n.due(datetime(2026,3,8,8,0,tzinfo=timezone.utc),{'editionDate':'2026-03-08','selectionPolicy':n.POLICY}))
  self.assertFalse(n.due(datetime(2026,11,1,6,30,tzinfo=timezone.utc),None))
  self.assertTrue(n.due(datetime(2026,11,1,7,0,tzinfo=timezone.utc),None))
  last={'editionDate':'2026-10-18','failedFeeds':[{}],'attempts':2}
  self.assertTrue(n.due(NOW,None,last));last['attempts']=3;self.assertFalse(n.due(NOW,None,last))
  self.assertTrue(n.due(NOW+timedelta(days=1),None,last))
 def test_parallel_collection_idempotence_and_v1_compatibility(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);barrier=threading.Barrier(6)
   def simultaneous(url):barrier.wait(timeout=4);return source_feed(url)
   first=n.refresh(root,NOW,fetcher=simultaneous);self.assertEqual(first['successfulFeeds'],6)
   pool=json.loads((root/'pool.json').read_text());old=json.loads((root/'daily.json').read_text())
   self.assertEqual(len(pool['articles']),6);self.assertEqual(pool['schemaVersion'],2)
   self.assertTrue(all(row['publisher'] in {s[0] for s in n.SOURCES[:3]} for row in old['articles']))
   self.assertTrue(all(set(row)=={'id','title','publisher','publishedAt','url','topic','feedUrl'} for row in old['articles']))
   before=(root/'pool.json').read_bytes()
   self.assertEqual(n.refresh(root,NOW,fetcher=lambda _:self.fail('duplicate network call'))['status'],'current-or-not-due')
   self.assertEqual((root/'pool.json').read_bytes(),before)
 def test_partial_outage_keeps_only_still_fresh_affected_source(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);n.refresh(root,NOW,fetcher=source_feed)
   def failed_one(url):
    if url==n.SOURCES[3][1]:raise TimeoutError()
    return b'<rss/>'
   result=n.refresh(root,NOW+timedelta(days=1),fetcher=failed_one)
   pool=json.loads((root/'pool.json').read_text())
   self.assertEqual(result['successfulFeeds'],5)
   self.assertEqual([a['publisher'] for a in pool['articles']],['EatingWell'])
   n.refresh(root,NOW+timedelta(days=8),fetcher=failed_one)
   self.assertEqual(json.loads((root/'pool.json').read_text())['articles'],[])
 def test_complete_failure_preserves_atomic_files(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);n.refresh(root,NOW,fetcher=source_feed);before={f:(root/f).read_bytes() for f in ['daily.json','pool.json']}
   def failed(_):raise TimeoutError()
   for i in range(3):self.assertEqual(n.refresh(root,NOW+timedelta(days=1),fetcher=failed)['status'],'failed-preserved')
   self.assertEqual(n.refresh(root,NOW+timedelta(days=1),fetcher=lambda _:self.fail('fourth attempt'))['status'],'current-or-not-due')
   for f,data in before.items():self.assertEqual((root/f).read_bytes(),data)
 def test_empty_feeds_and_lock(self):
  with tempfile.TemporaryDirectory() as temp:
   root=Path(temp);self.assertEqual(n.refresh(root,NOW,fetcher=lambda _:b'<rss/>')['articles'],0)
   with (root/'refresh.lock').open('a') as lock:
    fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    self.assertEqual(n.refresh(root,NOW,True,fetcher=lambda _:self.fail('parallel run'))['status'],'busy')
 def test_pool_is_bounded_and_sources_diverse(self):
  rows=[]
  for i in range(80):
   row=self.parse(feed(title=f'Nutrition topic {i}',url=f'https://www.nih.gov/story-{i}'))[0];rows.append(row)
  # Different headline words avoid intentionally deduplicated near-identical headlines.
  with patch.object(n,'unique_rows',side_effect=lambda values:values):
   pool=n.candidate_pool(rows);self.assertEqual(len(pool),50)
   self.assertEqual(len(n.select(rows)),3)
 def test_redirects_fail_closed(self):
  with self.assertRaises(ValueError):n.NoRedirect().redirect_request(None,None,302,'',{},'https://elsewhere.test')
if __name__=='__main__':unittest.main()
