"""Bounded, resumable USDA discovery. Public label data only; never auto-imports."""
from pathlib import Path
import json, urllib.request, time, sys
from datetime import datetime, timezone
refresh=sys.argv[1:]==["--refresh"]
if sys.argv[1:] and not refresh:raise SystemExit("Usage: discover-broad-catalog.py [--refresh]")
r=Path(__file__).resolve().parents[1]
out=r/'artifacts/remote/catalog-broadening-supplement';out.mkdir(exist_ok=True)
k=r/'.tools/usda/api-key';assert k.stat().st_mode&0o077==0
key=k.read_text().strip()
queries=['penne','spaghetti','cheddar cheese','almonds','plain yogurt','flour tortillas']
brands=[]
requests=0
def get(path,body):
 global requests
 requests+=1
 if requests>450:raise ValueError('Request budget reached')
 req=urllib.request.Request('https://api.nal.usda.gov/fdc/v1/'+path,data=json.dumps(body).encode(),headers={'X-Api-Key':key,'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=45) as response:
  raw=response.read(16000001)
  if len(raw)>16000000:raise ValueError('Oversize response')
  data=json.loads(raw)
 time.sleep(.35)
 return data
try:
 manifest={}
 for q in queries+brands:
  path=out/('search-'+q.replace(' ','-')+'.json')
  if path.exists() and not refresh:data=json.loads(path.read_text())
  else:
   data=get('foods/search',{'query':'"'+q+'"','dataType':['Branded'],'pageSize':200 if q in brands else 100})
   path.write_text(json.dumps(data))
  manifest[q]={'totalHits':data.get('totalHits'), 'ids':[f['fdcId'] for f in data['foods']]}
 (out/'discovery.json').write_text(json.dumps(manifest,indent=2))
 ids=list(dict.fromkeys(i for v in manifest.values() for i in v['ids']))
 old=r/'artifacts/remote/catalog-broadening/raw.json'
 foods={f['fdcId']:{'_catalogFetchedAt':datetime.fromtimestamp(old.stat().st_mtime,timezone.utc).isoformat().replace('+00:00','Z'),**f} for f in json.loads(old.read_text())}
 existing=out/'raw.json'
 if existing.exists():foods.update({f['fdcId']:{'_catalogFetchedAt':datetime.fromtimestamp(existing.stat().st_mtime,timezone.utc).isoformat().replace('+00:00','Z'),**f} for f in json.loads(existing.read_text())})
 pending=ids if refresh else [i for i in ids if i not in foods]
 for start in range(0,len(pending),20):
  for f in get('foods',{'fdcIds':pending[start:start+20],'format':'full'}):foods[f['fdcId']]={**f,'_catalogFetchedAt':datetime.now(timezone.utc).isoformat().replace('+00:00','Z')}
  existing.write_text(json.dumps(list(foods.values())))
  if start%200==0:print(json.dumps({'downloaded':len(foods),'remaining':max(0,len(pending)-start-20)}),flush=True)
 print(json.dumps({'records':len(foods),'requests':requests,'complete':True}),flush=True)
except Exception as e:raise SystemExit('Discovery stopped: '+type(e).__name__+'; partial staging retained; credentials not logged.')