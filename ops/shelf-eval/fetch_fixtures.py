"""Fetch licensed public evaluation photos; no training data or user photos."""
from pathlib import Path
import json,urllib.request,hashlib,time
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'artifacts/shelf-eval/fixtures';OUT.mkdir(parents=True,exist_ok=True)
fixtures=json.loads((Path(__file__).with_name('fixtures.json')).read_text())
for item in fixtures:
    dest=OUT/(item['id']+'.jpg')
    if not dest.exists():
        time.sleep(5)
        request=urllib.request.Request(item['url'],headers={'User-Agent':'CongressAppChallenge-ShelfEvaluation/1.0 (licensed photo evaluation)'})
        with urllib.request.urlopen(request,timeout=90) as response:dest.write_bytes(response.read())
    actual=hashlib.sha256(dest.read_bytes()).hexdigest()
    if item.get('sha256') and item['sha256']!=actual:raise ValueError('Fixture hash changed: '+item['id'])
    item['sha256']=actual
    item['bytes']=dest.stat().st_size
    print(item['id'],item['bytes'],item['sha256'],flush=True)
(OUT/'sources.json').write_text(json.dumps(fixtures,indent=2)+'\n')
