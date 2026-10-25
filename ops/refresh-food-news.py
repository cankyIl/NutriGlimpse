#!/usr/bin/env python3
"""Daily publisher headline links. No AI, profiles, article bodies or publisher images."""
import argparse, concurrent.futures, email.utils, fcntl, hashlib, html, json, os, re, sys, tempfile
import urllib.request, urllib.parse, xml.etree.ElementTree as ET
from html.parser import HTMLParser
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

EASTERN = ZoneInfo('America/New_York')
POLICY = 'publisher-news-2026-10-18.1'
LEGACY_POLICY = 'publisher-rss-2026-10-16.1'
MAX_DAYS, MAX_POOL, MAX_BYTES = 7, 50, 1024*1024
SOURCES = [
    ('Harvard — The Nutrition Source', 'https://nutritionsource.hsph.harvard.edu/feed/', 'nutritionsource.hsph.harvard.edu'),
    ('Tufts Now', 'https://now.tufts.edu/food-nutrition', 'now.tufts.edu'),
    ('NIH Research Matters', 'https://www.nih.gov/nih-research-matters/feed.xml', 'www.nih.gov'),
    ('EatingWell', 'https://feeds-api.dotdashmeredith.com/v1/rss/google/dcbd6d38-4ab3-42e8-a5f6-37a8a48ceb94', 'www.eatingwell.com'),
    ('Clean Eating', 'https://www.cleaneatingmag.com/feed/?scope=anon', 'www.cleaneatingmag.com'),
    ('ScienceDaily', 'https://www.sciencedaily.com/rss/health_medicine/nutrition.xml', 'www.sciencedaily.com'),
]
TOPICS = [('Food safety', r'food safety|foodborne|recall|contamina|undeclared allergen'), ('Nutrition', r'nutriti|diet|protein|fiber|fibre|sodium|whole grain|sugar|vegetable|fruit|bean|ultra.processed|healthy eat|tomato|yogurt|salad|\beat\b|\beating\b|\bsalt\b|calorie|supplement|amino acid|sweetener|carbohydrate|cholesterol|blood pressure'), ('Food & groceries', r'\bfood\b|grocery|grocer|meal|cooking|recipe|pantry')]
TAG_RULES = {
 'diabetes': r'diabet|prediabet|blood sugar|blood glucose|carbohydrate|glycemi',
 'hypertension': r'hypertension|blood pressure|sodium|\bsalt\b',
 'cardiovascular': r'heart.health|heart disease|cholesterol|cardiovascular|stroke|saturated fat|\bldl\b',
 'ckd': r'kidney|renal|\bckd\b',
 'masld': r'fatty liver|liver disease|\bmasld\b|\bnafld\b',
 'sibo': r'\bsibo\b|small intestinal bacterial',
 'celiac': r'celiac|coeliac|gluten.free',
 'weight': r'weight management|weight loss|lose weight|calorie|obesity',
 'generalFitness': r'fitness|muscle|exercise|workout|recovery|protein',
 'vegetarian': r'vegetarian|vegan|plant.based',
 'eggFree': r'egg.free|without eggs',
 'dairyFree': r'dairy.free|lactose.free|without dairy',
 'halal': r'\bhalal\b', 'kosher': r'\bkosher\b',
 'glutenFree': r'gluten.free',
 'pregnancy': r'pregnan|prenatal|breastfeed',
 'olderAdults': r'older adults|healthy aging|over 65|seniors',
}
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('Redirect not allowed')

class TuftsHeadlines(HTMLParser):
    def __init__(self):
        super().__init__(); self.rows=[]; self.article=None; self.title=False; self.date=False
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag=='article':self.article={'title':'','date':'','url':''}
        if self.article is None:return
        if tag=='h3' and 'teaser__title' in attrs.get('class',''):self.title=True
        if tag=='a' and self.title:self.article['url']=attrs.get('href','')
        if tag=='p' and 'teaser__subtitle' in attrs.get('class',''):self.date=True
    def handle_data(self, data):
        if self.article is not None:
            if self.title:self.article['title']+=data
            if self.date:self.article['date']+=data
    def handle_endtag(self, tag):
        if tag=='h3':self.title=False
        if tag=='p':self.date=False
        if tag=='article' and self.article is not None:self.rows.append(self.article);self.article=None

def tufts_feed(raw):
    if len(raw)>MAX_BYTES:raise ValueError('Page limit')
    parser=TuftsHeadlines();parser.feed(raw.decode('utf-8'))
    rss=ET.Element('rss');channel=ET.SubElement(rss,'channel')
    for row in parser.rows[:50]:
        try:date=datetime.strptime(row['date'].strip(),'%B %d, %Y').replace(hour=12,tzinfo=timezone.utc)
        except ValueError:continue
        url=urllib.parse.urljoin('https://now.tufts.edu',row['url'])
        if urllib.parse.urlsplit(url).hostname!='now.tufts.edu':continue
        item=ET.SubElement(channel,'item');ET.SubElement(item,'title').text=row['title'].strip()
        ET.SubElement(item,'link').text=url;ET.SubElement(item,'pubDate').text=email.utils.format_datetime(date)
    return ET.tostring(rss)

def due(now, edition, last=None):
    local=now.astimezone(EASTERN)
    if local.hour<2:return False
    if last and last.get('editionDate')==local.date().isoformat() and last.get('failedFeeds') and last.get('attempts',0)>=3:return False
    if not edition or edition.get('editionDate')!=local.date().isoformat() or edition.get('selectionPolicy')!=POLICY:return True
    # Retry incomplete source collection, at most three attempts/day; the timer checks hourly.
    return bool(last and last.get('editionDate')==local.date().isoformat() and last.get('failedFeeds') and last.get('attempts',3)<3)

def clean(value):
    return html.unescape(re.sub('<[^>]*>', '', value)).strip()

def parse_feed(raw, publisher, feed, host, now, stats=None):
    if len(raw)>MAX_BYTES or b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():raise ValueError('Unsafe feed')
    tree=ET.fromstring(raw);result=[]
    if stats is not None:stats.update(items=0,expired=0,future=0,rejected=0,eligible=0,newestPublishedAt=None)
    for item in tree.findall('.//item')[:200]:
        if stats is not None:stats['items']+=1
        try:
            title=clean(''.join(item.find('title').itertext()) if item.find('title') is not None else '')
            url=(item.findtext('link') or '').strip();parsed=urllib.parse.urlsplit(url)
            if parsed.scheme!='https' or parsed.hostname!=host or parsed.username or parsed.password or parsed.port not in (None,443) or len(url)>1500:raise ValueError('Unsafe link')
            if not 5<=len(title)<=240 or any(ord(c)<32 or ord(c)==127 for c in title):raise ValueError('Invalid title')
            raw_date=item.findtext('pubDate') or ''
            if host=='www.nih.gov' and re.fullmatch(r'\d{2}/\d{2}/\d{4} - \d{2}:\d{2}',raw_date):
                stamp=datetime.strptime(raw_date[:10],'%m/%d/%Y').replace(hour=12,tzinfo=timezone.utc)
            else:stamp=email.utils.parsedate_to_datetime(raw_date)
            if stamp.tzinfo is None:raise ValueError('Undated')
            stamp=stamp.astimezone(timezone.utc)
            stamp_text=stamp.isoformat().replace('+00:00','Z')
            if stats is not None and (not stats['newestPublishedAt'] or stamp_text>stats['newestPublishedAt']):stats['newestPublishedAt']=stamp_text
            if stamp>now:
                if stats is not None:stats['future']+=1
                continue
            if stamp<now-timedelta(days=MAX_DAYS):
                if stats is not None:stats['expired']+=1
                continue
            # EatingWell includes its site-wide slogan in every item, even shoe adverts.
            # Ignore that generic category before deciding relevance, kind or interests.
            categories=' '.join(clean(x.text or '') for x in item.findall('category') if not clean(x.text or '').lower().startswith('eatingwell:'))[:2000]
            if re.search(r'product picks.*deals|celebrity.*entertainment',categories,re.I) or re.search(r'\bshoes?\b|kitchen tool|pumpkin carving',title,re.I):raise ValueError('Unrelated shopping or entertainment')
            if re.search(r'\bcure[sd]?\b|miracle|sponsored|coupon|promo code|shopping deals|best deals|amazon prime',title+' '+categories,re.I):raise ValueError('Promotional')
            topic=next((topic for topic,pattern in TOPICS if re.search(pattern,title,re.I)),None)
            if not topic and publisher in ('EatingWell','Clean Eating') and re.search(r'recipe|meal|nutrition|healthy eat|special diet',categories,re.I):topic='Food & groceries'
            if not topic:raise ValueError('Irrelevant')
            if host=='www.nih.gov' and not re.search(r'diet|\bfood\b|\beat\b|\beating\b|nutriti|meal|sugar|grain|vegetable|fruit|sodium',title,re.I):raise ValueError('Irrelevant')
            metadata=title+' '+categories
            tags=sorted(tag for tag,pattern in TAG_RULES.items() if re.search(pattern,metadata,re.I))
            # Description is used only to label early research; no description/body is retained or sent to AI.
            description=clean(item.findtext('description') or '')[:5000]
            early=publisher in ('ScienceDaily','NIH Research Matters') and bool(re.search(r'\bmice\b|\bmouse\b|\brats\b|animal stud|animal model|laboratory|test.tube|cell culture',title+' '+description,re.I))
            kind='research' if publisher in ('ScienceDaily','NIH Research Matters') else 'recipe' if re.search(r'recipe|meal plan',metadata,re.I) else 'news'
            audience='children' if re.search(r'\bchildren\b|\btoddlers?\b|\binfants?\b',title,re.I) else 'general'
            url=urllib.parse.urlunsplit((parsed.scheme,parsed.netloc,parsed.path.rstrip('/'),'',''))
            row={'id':hashlib.sha256(url.encode()).hexdigest()[:20],'title':title,'publisher':publisher,'publishedAt':stamp_text,'url':url,'topic':topic,'feedUrl':feed,'tags':tags,'kind':kind,'evidence': 'early-research' if early else 'publisher-report','audience':audience}
            result.append(row)
            if stats is not None:stats['eligible']+=1
        except (ValueError,TypeError,OverflowError,AttributeError):
            if stats is not None:stats['rejected']+=1
    return result

def unique_rows(rows):
    rows=sorted(rows,key=lambda r:(r['publishedAt'],r['id']),reverse=True)
    chosen=[];urls=set();titles=[]
    for row in rows:
        tokens=set(re.findall(r'[a-z]{4,}',row['title'].lower()))
        if row['url'] in urls or any(len(tokens&t)/max(1,len(tokens|t))>0.7 for t in titles):continue
        chosen.append(row);urls.add(row['url']);titles.append(tokens)
    return chosen

def select(rows, limit=5):
    # Hard maximum of three per publisher; sparse collections may honestly contain fewer than five.
    counts={};chosen=[]
    for row in unique_rows(rows):
        publisher=row['publisher']
        if counts.get(publisher,0)>=3:continue
        counts[publisher]=counts.get(publisher,0)+1;chosen.append(row)
        if len(chosen)==limit:break
    return chosen

def candidate_pool(rows):
    buckets={}
    for row in unique_rows(rows):buckets.setdefault(row['publisher'],[]).append(row)
    # Round-robin source coverage prevents the largest feed from monopolizing a bounded pool.
    pool=[]
    while buckets and len(pool)<MAX_POOL:
        for publisher in list(buckets):
            pool.append(buckets[publisher].pop(0))
            if not buckets[publisher]:del buckets[publisher]
            if len(pool)==MAX_POOL:break
    return sorted(pool,key=lambda r:(r['publishedAt'],r['id']),reverse=True)

def read_edition(path):
    try:
        if path.stat().st_size>160000:return None
        data=json.loads(path.read_text())
        if data.get('schemaVersion') in (1,2) and isinstance(data.get('articles'),list) and len(data['articles'])<=MAX_POOL:return data
    except (OSError,ValueError,TypeError):pass
    return None

def atomic_json(path, data):
    fd,name=tempfile.mkstemp(prefix='edition-',suffix='.json',dir=path.parent)
    try:
        with os.fdopen(fd,'w') as file:json.dump(data,file);file.flush();os.fsync(file.fileno())
        os.replace(name,path)
    finally:
        if os.path.exists(name):os.unlink(name)

def collect(source, now, fetcher):
    publisher,feed,host=source;stats={'publisher':publisher}
    try:
        if fetcher:raw=fetcher(feed)
        else:
            req=urllib.request.Request(feed,headers={'User-Agent':'HealthGroceryNews/0.1 (RSS headline links)','Accept':'application/rss+xml, application/xml, text/xml, text/html'})
            with urllib.request.build_opener(NoRedirect()).open(req,timeout=8) as response:
                if response.status!=200:raise ValueError('Feed unavailable')
                raw=response.read(MAX_BYTES+1)
        rows=parse_feed(tufts_feed(raw) if host=='now.tufts.edu' else raw,publisher,feed,host,now,stats)
        return rows,{**stats,'status':'ok' if rows else 'no-current-stories'}
    except Exception as error:return [],{**stats,'status':'failed','error':type(error).__name__}

def refresh(directory, now=None, force=False, fetcher=None):
    now=now or datetime.now(timezone.utc);directory.mkdir(parents=True,exist_ok=True,mode=0o700)
    with (directory/'refresh.lock').open('a') as lock:
        try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
        except BlockingIOError:return {'status':'busy'}
        path=directory/'pool.json';old=read_edition(path)
        try:last=json.loads((directory/'last-run.json').read_text())
        except (OSError,ValueError):last=None
        if not force and not due(now,old,last):return {'status':'current-or-not-due'}
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:results=list(executor.map(lambda s:collect(s,now,fetcher),SOURCES))
        rows=[row for found,_ in results for row in found];statuses=[s for _,s in results]
        failures=[{'publisher':s['publisher'],'error':s['error']} for s in statuses if s['status']=='failed']
        success=len(SOURCES)-len(failures)
        date=now.astimezone(EASTERN).date().isoformat()
        attempts=(last.get('attempts',0) if last and last.get('editionDate')==date else 0)+1
        status={'at':now.isoformat(),'editionDate':date,'attempts':attempts,'successfulFeeds':success,'failedFeeds':failures,'sources':statuses}
        if not success:status['status']='failed-preserved'
        else:
            # On partial outages retain only still-current metadata from the affected source.
            failed_publishers={s['publisher'] for s in failures}
            if old and old.get('schemaVersion')==2:
                for row in old['articles']:
                    try:
                        stamp=datetime.fromisoformat(row['publishedAt'].replace('Z','+00:00'))
                        if row['publisher'] in failed_publishers and now-timedelta(days=MAX_DAYS)<=stamp<=now:rows.append(row)
                    except (ValueError,KeyError,TypeError):pass
            pool=candidate_pool(rows)
            edition={'schemaVersion':2,'editionDate':date,'timeZone':'America/New_York','generatedAt':now.isoformat().replace('+00:00','Z'),'selectionPolicy':POLICY,'maxAgeDays':MAX_DAYS,'articles':pool}
            atomic_json(path,edition)
            # Installed v1 apps accept only the original three publishers and strict v1 fields.
            legacy_keys=['id','title','publisher','publishedAt','url','topic','feedUrl']
            legacy={'schemaVersion':1,'editionDate':date,'timeZone':'America/New_York','generatedAt':edition['generatedAt'],'selectionPolicy':LEGACY_POLICY,
              'articles':[{k:row[k] for k in legacy_keys} for row in select([x for x in pool if x['publisher'] in {s[0] for s in SOURCES[:3]}])]}
            atomic_json(directory/'daily.json',legacy)
            status.update(status='published',candidates=len(pool),articles=len(select(pool)),legacyArticles=len(legacy['articles']))
        atomic_json(directory/'last-run.json',status)
        return status

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--force',action='store_true');parser.add_argument('--directory',default=str(Path(__file__).resolve().parents[1]/'.tools/news'));args=parser.parse_args()
    result=refresh(Path(args.directory),force=args.force);print(json.dumps(result))
    if result['status']=='failed-preserved':sys.exit(1)
