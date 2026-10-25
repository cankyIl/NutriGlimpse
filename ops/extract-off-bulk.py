"""Select US public grocery records from a pinned official OFF Parquet snapshot.
Run with .tools/off/bulk-venv/bin/python; no live product API crawling.
"""
import duckdb,json,pathlib,time
from datetime import datetime,timezone
root=pathlib.Path('/path/to/NutriGlimpse')
out=root/'.tools/off/bulk';out.mkdir(exist_ok=True)
source=json.loads((root/'.tools/off/bulk-source.json').read_text())
db=duckdb.connect()
db.execute("SET memory_limit='768MB'");db.execute('SET threads=2')
db.execute("SET extension_directory=?",[str(out/'extensions')]);db.execute("SET temp_directory=?",[str(out/'temp')]);db.execute('INSTALL httpfs');db.execute('LOAD httpfs')
print('Inspecting pinned export schema',flush=True)
cols=db.execute('DESCRIBE SELECT * FROM read_parquet(?)',[source['url']]).fetchall()
(out/'schema.json').write_text(json.dumps(cols,indent=2))
print(json.dumps([c for c in cols if c[0] in ['product_name','nutriments','serving_size','nutrition_data_per','product_quantity_unit']]),flush=True)
fields=['code','product_name','brands','brands_tags','ingredients_text','categories_tags','countries_tags','nutrition_data_per','serving_quantity','serving_size','product_quantity_unit','last_modified_t','data_quality_errors_tags','labels_tags','allergens_tags','traces_tags','nutriments','obsolete','no_nutrition_data','stores_tags','unique_scans_n']
# Brand associations are selection hints only, never inventory or current assortment evidence.
pattern=r"(?i)(wegmans|great value|marketside|sam.s choice|price chopper|market 32|whole foods|365 |365$|^pics$|general mills|kellogg|quaker|cheerios|chobani|fage|dannon|danone|cab ot|cabot|sargento|barilla|rao.s|prego|ragu|bush.s|goya|sabra|jif|skippy|smucker|mission|tostitos|lay.s|doritos|cheez.it|triscuit|ritz|kashi|cascadian farm|annie.s|bob.s red mill|organic valley|nature valley|post|kettle|planters|blue diamond|pearl milling|nature.s path|kind|pepperidge farm|dave.s killer|thomas|sara lee|stonyfield|siggi|frito|nabisco)"
query="SELECT "+",".join(fields)+" FROM read_parquet(?) WHERE list_contains(countries_tags,'en:united-states') AND (regexp_matches(coalesce(brands,''),?) OR regexp_matches(array_to_string(stores_tags,','),'(?i)wegmans|walmart|wal-mart|price-chopper|whole-foods'))"
start=time.monotonic();cur=db.execute(query,[source['url'],pattern]);names=[c[0] for c in cur.description];n=0;stop='candidate-limit';complete=False
with (out/'candidates.jsonl.part').open('w') as f:
 try:
  while n<10000:
   batch=cur.fetchmany(min(1000,10000-n))
   if not batch:complete=True;stop='complete';break
   for row in batch:f.write(json.dumps(dict(zip(names,row)),ensure_ascii=False)+'\n');n+=1
   f.flush();print('Selected',n,flush=True)
 except duckdb.Error:
  stop='upstream-error-partial';print('Upstream export interrupted; preserving complete rows without retry.',flush=True)
if not n:raise RuntimeError('No rows downloaded; existing completed snapshot preserved')
(out/'candidates.jsonl.part').replace(out/'candidates.jsonl')
report={**source,'extractedAt':datetime.now(timezone.utc).isoformat(),'selected':n,'completeScan':complete,'stopReason':stop,'seconds':round(time.monotonic()-start,1),'duckdb':duckdb.__version__,'selection':'US brand/store hints only; bounded candidate snapshot, not comprehensive inventory'}
(out/'extract-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report),flush=True)
