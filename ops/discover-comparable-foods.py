"""Operator-only USDA discovery; outputs staging data, never imports automatically. No personal queries or AI calls."""
from pathlib import Path
import json,urllib.request,time,os,sys
r=Path('/path/to/NutriGlimpse')
keypath=r/'.tools/usda/api-key'
assert keypath.stat().st_mode&0o077==0
key=keypath.read_text().strip()
out=r/'artifacts/remote/catalog-expansion';out.mkdir(exist_ok=True)
queries={'plain-oats':'rolled oats','granola':'granola','breakfast-cereal':'breakfast cereal','peanut-butter':'peanut butter','sliced-bread':'whole wheat bread','plain-yogurt':'plain yogurt'}
recent=sys.argv[1:]==['--recent']
if sys.argv[1:] and not recent:raise SystemExit('Usage: discover-comparable-foods.py [--recent]')
if recent:queries={k:v for k,v in queries.items() if k not in ['breakfast-cereal','plain-yogurt']}
def get(path,body):
 req=urllib.request.Request('https://api.nal.usda.gov/fdc/v1/'+path,data=json.dumps(body).encode(),headers={'X-Api-Key':key,'Content-Type':'application/json'})
 with urllib.request.urlopen(req,timeout=30) as response:
  raw=response.read(8000001)
  if len(raw)>8000000:raise ValueError('Oversize')
  return json.loads(raw)
try:
 candidates={}
 for group,query in queries.items():
  data=get('foods/search',{'query':'"'+query+'"','dataType':['Branded'],'pageSize':100 if recent else 50,**({'sortBy':'fdcId','sortOrder':'desc'} if recent else {})})
  candidates[group]=[f['fdcId'] for f in data['foods']]
  time.sleep(.3)
 (out/'discovery.json').write_text(json.dumps(candidates))
 ids=list(dict.fromkeys(i for group in candidates.values() for i in group))
 foods=json.loads((out/'raw.json').read_text()) if recent and (out/'raw.json').exists() else []
 for start in range(0,len(ids),20):
  foods.extend(get('foods',{'fdcIds':ids[start:start+20],'format':'full'}));time.sleep(.3)
 foods=list({f['fdcId']:f for f in foods}.values())
 (out/'raw.json').write_text(json.dumps(foods))
 print(json.dumps({'queries':len(queries),'records':len(foods),'requests':len(queries)+(len(ids)+19)//20}))
except Exception as e:raise SystemExit('USDA expansion download failed: '+type(e).__name__+'; credentials not logged.')

