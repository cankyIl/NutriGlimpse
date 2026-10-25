"""Bounded read from the already pinned OFF export; no crawling or automatic retries."""
import duckdb,json,pathlib,time,threading,sqlite3
root=pathlib.Path('/path/to/NutriGlimpse')
out=root/'artifacts/remote/label-enrichment'
source=json.loads((root/'.tools/off/bulk-source.json').read_text())
sql=sqlite3.connect(root/'.tools/catalog/public.sqlite')
ids=[x[0] for x in sql.execute("SELECT id FROM foods WHERE provider='off' AND json_extract(payload,'$.reportedLabel') IS NULL")]
sql.close()
db=duckdb.connect()
db.execute("SET memory_limit='384MB'");db.execute('SET threads=2')
db.execute("SET extension_directory=?",[str(root/'.tools/off/bulk/extensions')])
db.execute('LOAD httpfs');db.execute('SET http_retries=0');db.execute('SET http_timeout=20')
db.execute('CREATE TABLE requested(code VARCHAR)')
db.executemany('INSERT INTO requested VALUES (?)',[(i,) for i in ids])
started=time.monotonic();timer=threading.Timer(120,db.interrupt);timer.start()
report={'requested':len(ids),'rows':0,'complete':False,'sourceRevision':source['revision'],'maximumSourceRows':250000}
try:
 rows=db.execute("SELECT p.code,p.last_modified_t,p.labels,p.labels_tags,p.allergens_tags,p.traces_tags FROM (SELECT code,last_modified_t,labels,labels_tags,allergens_tags,traces_tags FROM read_parquet(?) LIMIT 250000) p JOIN requested r ON lpad(p.code,14,'0')=r.code",[source['url']]).fetchall()
 with (out/'off-label-metadata.jsonl').open('w') as f:
  for row in rows:f.write(json.dumps(dict(zip(['code','last_modified_t','labels','labels_tags','allergens_tags','traces_tags'],row)))+'\n')
 report.update(rows=len(rows),complete=True)
except Exception as e:report['error']=type(e).__name__
finally:
 timer.cancel();db.close();report['seconds']=round(time.monotonic()-started,1)
 (out/'off-label-extraction.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
