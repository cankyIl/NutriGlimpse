"""Bounded, resumable OFF export acquisition. Never crawls product endpoints.
Uses official immutable Parquet row groups; 429 ends the run and records Retry-After.
Run with .tools/shelf-eval-venv/bin/python ops/resume-off-bulk.py --groups 2.
"""
from pathlib import Path
import argparse,hashlib,json,re,time,os
from datetime import datetime,timezone
from email.utils import parsedate_to_datetime
ROOT=Path(__file__).resolve().parents[1]
FIELDS=['code','product_name','brands','brands_tags','ingredients_text','categories_tags','countries_tags','nutrition_data_per','serving_quantity','serving_size','product_quantity_unit','last_modified_t','data_quality_errors_tags','labels','labels_tags','allergens_tags','traces_tags','nutriments','obsolete','no_nutrition_data','stores_tags','unique_scans_n']
PATTERN=re.compile(r"wegmans|great value|marketside|sam.s choice|price chopper|market 32|whole foods|365 |365$|^pics$|general mills|kellogg|quaker|cheerios|chobani|fage|dannon|danone|cabot|sargento|barilla|rao.s|prego|ragu|bush.s|goya|sabra|jif|skippy|smucker|mission|tostitos|lay.s|doritos|cheez.it|triscuit|ritz|kashi|cascadian farm|annie.s|bob.s red mill|organic valley|nature valley|post|kettle|planters|blue diamond|pearl milling|nature.s path|kind|pepperidge farm|dave.s killer|thomas|sara lee|stonyfield|siggi|frito|nabisco",re.I)
def atomic_json(path,value):
 tmp=path.with_suffix('.json.part');tmp.write_text(json.dumps(value,indent=2)+'\n');tmp.replace(path)
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def load_state(folder,source):
 path=folder/'manifest.json'
 if not path.exists():return {'schemaVersion':1,**source,'completed':[],'retryAfterEpoch':0,'completeScan':False}
 state=json.loads(path.read_text())
 if state['schemaVersion']!=1 or any(state[k]!=source[k] for k in ['revision','url']):raise ValueError('Snapshot identity changed; use a separate revision folder')
 indexes=set()
 for entry in state['completed']:
  if not isinstance(entry['group'],int) or entry['group']<0 or entry['group'] in indexes:raise ValueError('Invalid completed row group')
  indexes.add(entry['group'])
  expected=f"group-{entry['group']:05d}.jsonl"
  if entry['file']!=expected or digest(folder/expected)!=entry['sha256']:raise ValueError('Completed shard integrity failed')
  datetime.fromisoformat(entry['extractedAt'])
 return state
def select(row):
 return 'en:united-states' in (row.get('countries_tags') or []) and (PATTERN.search(row.get('brands') or '') is not None or re.search(r'wegmans|walmart|wal-mart|price-chopper|whole-foods',','.join(row.get('stores_tags') or []),re.I) is not None)
def retry_at(error,now):
 chain=error
 while chain:
  if getattr(chain,'status',None)==429:
   value=(getattr(chain,'headers',None) or {}).get('Retry-After','3600')
   try:return now+max(1,float(value))
   except ValueError:
    try:return max(now+1,parsedate_to_datetime(value).timestamp())
    except (TypeError,ValueError):return now+3600
  chain=chain.__cause__
 return now+3600 # no immediate blind retry after other upstream failures either
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--groups',type=int,default=2);parser.add_argument('--start-group',type=int,default=0);args=parser.parse_args()
 if not 1<=args.groups<=20:raise ValueError('Choose 1–20 row groups per bounded run')
 source=json.loads((ROOT/'.tools/off/bulk-source.json').read_text())
 if not re.fullmatch(r'[a-f0-9]{40}',source['revision']) or source['url']!=f"https://huggingface.co/datasets/openfoodfacts/product-database/resolve/{source['revision']}/food.parquet":raise ValueError('Official pinned snapshot required')
 folder=ROOT/'.tools/off/resumable'/source['revision'];folder.mkdir(parents=True,exist_ok=True)
 import fcntl
 lock=(folder/'acquisition.lock').open('a')
 fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 state=load_state(folder,source)
 if state.get('retryAfterEpoch',0)>time.time():
  print(json.dumps({'state':'cooldown','resumeAfterUTC':datetime.fromtimestamp(state['retryAfterEpoch'],timezone.utc).isoformat()}));return
 import aiohttp,pyarrow.parquet as pq
 from fsspec.implementations.http import HTTPFileSystem
 fs=HTTPFileSystem(block_size=1024*1024,client_kwargs={'timeout':aiohttp.ClientTimeout(total=120)},headers={'User-Agent':'HealthGroceryCompanion/0.1 catalog-research'})
 try:
  with fs.open(source['url'],'rb',cache_type='readahead') as handle:
   parquet=pq.ParquetFile(handle,pre_buffer=False);done={x['group'] for x in state['completed']}
   state['totalGroups']=parquet.num_row_groups
   if not 0<=args.start_group<parquet.num_row_groups:raise ValueError('Start group outside snapshot')
   parquet.metadata.write_metadata_file(str(folder/'metadata.parquet'))
   order=list(range(args.start_group,parquet.num_row_groups))+list(range(args.start_group))
   for group in [i for i in order if i not in done][:args.groups]:
    if parquet.metadata.row_group(group).num_rows>150000:raise ValueError('Row group exceeds bounded memory policy')
    hints=parquet.read_row_group(group,columns=['countries_tags','brands','stores_tags'],use_threads=False).to_pylist()
    chosen={i for i,row in enumerate(hints) if select(row)}
    selected=[]
    if chosen:
     for i,row in enumerate(parquet.read_row_group(group,columns=FIELDS,use_threads=False).to_pylist()):
      if i in chosen:selected.append(row)
    target=folder/f'group-{group:05d}.jsonl'
    # Incomplete orphan output is never used as proof of a completed group.
    temp=target.with_suffix('.jsonl.part')
    with temp.open('w') as out:
     for row in selected:
      line=json.dumps(row,ensure_ascii=False,allow_nan=False)
      if len(line)>1000000:raise ValueError('Export row exceeds input limit')
      out.write(line+'\n')
     out.flush();os.fsync(out.fileno())
    temp.replace(target)
    entry={'group':group,'file':target.name,'rows':len(selected),'scanned':len(hints),'sha256':digest(target),'extractedAt':datetime.now(timezone.utc).isoformat()}
    state['completed'].append(entry);state['retryAfterEpoch']=0;state['stopReason']='bounded-run'
    state['completeScan']=len(state['completed'])==parquet.num_row_groups
    atomic_json(folder/'manifest.json',state);print(json.dumps(entry),flush=True)
 except Exception as error:
  state['stopReason']='upstream-or-format-error';state['retryAfterEpoch']=retry_at(error,time.time())
  state['errorType']=type(error).__name__;atomic_json(folder/'manifest.json',state)
  print(json.dumps({'state':'paused','completedGroups':len(state['completed']),'errorType':type(error).__name__,'resumeAfterUTC':datetime.fromtimestamp(state['retryAfterEpoch'],timezone.utc).isoformat()}),flush=True)
  raise SystemExit(2)
 print(json.dumps({'state':'complete' if state['completeScan'] else 'checkpoint','groups':len(state['completed']),'rows':sum(x['rows'] for x in state['completed'])}))
if __name__=='__main__':main()
