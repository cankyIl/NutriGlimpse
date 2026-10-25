#!/usr/bin/env python3
import urllib.request,hashlib,json,datetime
from pathlib import Path
ROOT=Path('/path/to/NutriGlimpse')
DEST=ROOT/'data/guidance/sources/2026-10-14'
SOURCES={
 'dash':('https://www.nhlbi.nih.gov/health/dash/following-dash','html'),
 'diabetes':('https://www.niddk.nih.gov/health-information/diabetes/overview/healthy-living-with-diabetes','html'),
 'ckd':('https://www.niddk.nih.gov/health-information/kidney-disease/chronic-kidney-disease-ckd/healthy-eating-adults-chronic-kidney-disease','html'),
 'dga':('https://cdn.realfood.gov/DGA.pdf','pdf'),
 'dga-servings':('https://cdn.realfood.gov/Daily%20Serving%20Sizes.pdf','pdf'),
 'dga-index':('https://www.dietaryguidelines.gov/','html'),
 'niddk-rights':('https://www.niddk.nih.gov/copyright','html'),
 'nhlbi-rights':('https://www.nhlbi.nih.gov/about/contact/trademark-branding-and-logo','html')
}
def main():
 DEST.mkdir(parents=True,exist_ok=True)
 if (DEST/'manifest.json').exists():raise SystemExit('Snapshot already exists; choose a new version rather than replace evidence.')
 manifest=[]
 for name,(url,ext) in SOURCES.items():
  req=urllib.request.Request(url,headers={'User-Agent':'HealthGroceryResearch/0.1 (+https://grocery.serveforwad.com/data-sources)'})
  with urllib.request.urlopen(req,timeout=45) as response:
   body=response.read(8_000_001)
   if len(body)>8_000_000:raise ValueError('Source exceeds bound')
   if ext=='pdf' and not body.startswith(b'%PDF-'):raise ValueError('Expected PDF')
   if ext=='html' and b'<html' not in body.lower():raise ValueError('Expected HTML')
   path=DEST/(name+'.'+ext);path.write_bytes(body)
   manifest.append({'id':name,'url':url,'finalUrl':response.url,'file':str(path.relative_to(ROOT)),'sha256':hashlib.sha256(body).hexdigest(),'bytes':len(body),'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'lastModified':response.headers.get('Last-Modified'),'contentType':response.headers.get('Content-Type')})
   print(name,len(body))
 (DEST/'manifest.json').write_text(json.dumps(manifest,indent=2))
if __name__=='__main__':main()
