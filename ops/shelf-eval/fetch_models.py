"""Fetch pinned official public YOLOE weights for evaluation, no training."""
from pathlib import Path
import hashlib,urllib.request
R=Path(__file__).resolve().parents[2];M=R/'artifacts/shelf-eval/models';M.mkdir(parents=True,exist_ok=True)
files={'yoloe-11s-seg.pt':'8e439445c87338b79d9ce21dec109f4621e26df67e94d26ea1a98c1e64dce3e3','mobileclip_blt.ts':'a67804d1b0f07b8b9a20c1761ec0847f34660f5fa338ec70e8f3fce68ed95e54'}
for name,expected in files.items():
 p=M/name
 if not p.exists():
  with urllib.request.urlopen('https://github.com/ultralytics/assets/releases/download/v8.3.0/'+name,timeout=120) as response:p.write_bytes(response.read())
 if hashlib.sha256(p.read_bytes()).hexdigest()!=expected:raise ValueError('Model hash mismatch: '+name)
 print(name,expected)
