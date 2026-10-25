"""Operator-only refresh. Source ops/remote-env.sh first; restart backend after successful import. Never called by a phone request."""
from pathlib import Path
import urllib.request,urllib.parse,json,subprocess,os
r=Path('/path/to/NutriGlimpse')
query='[out:json][timeout:40][maxsize:67108864];area["ISO3166-2"="US-MA"]["admin_level"="4"]->.a;(node["shop"~"^(supermarket|grocery|convenience)$"](area.a);way["shop"~"^(supermarket|grocery|convenience)$"](area.a);node["shop"="department_store"]["name"~"^(Target|Walmart|Wal-Mart)",i](area.a);way["shop"="department_store"]["name"~"^(Target|Walmart|Wal-Mart)",i](area.a););out tags center geom;'
request=urllib.request.Request('https://overpass-api.de/api/interpreter',data=urllib.parse.urlencode({'data':query}).encode(),headers={'User-Agent':'CongressGroceryBeta/0.1 (operator directory import; grocery.serveforwad.com)','Content-Type':'application/x-www-form-urlencoded'})
try:
 with urllib.request.urlopen(request,timeout=55) as response: raw=response.read(12000001)
 if len(raw)>12000000:raise ValueError('Directory exceeds size limit')
 data=json.loads(raw)
 if data.get('remark') or not data.get('elements'):raise ValueError('Incomplete OSM directory')
 raw_path=r/'artifacts/remote/osm-ma-raw.json'
 raw_path.parent.mkdir(parents=True,exist_ok=True)
 raw_path.write_text(json.dumps(data))
 subprocess.run(['node','--experimental-strip-types','ops/import-osm-directory.ts',str(raw_path)],cwd=r,check=True)
 print(json.dumps({'elements':len(data['elements']),'bytes':len(raw),'sourceTimestamp':data.get('osm3s',{}).get('timestamp_osm_base')}))
except Exception as e:raise SystemExit('OSM operator import failed: '+type(e).__name__)
