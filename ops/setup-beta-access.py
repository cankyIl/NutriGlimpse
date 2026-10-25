#!/usr/bin/env python3
"""Create private tester invitation keys once; never print secrets."""
import os, json, secrets, hashlib
from pathlib import Path
root=Path('/path/to/NutriGlimpse/.tools/beta')
os.umask(0o077)
root.mkdir(mode=0o700,parents=True,exist_ok=True)
if root.is_symlink() or root.stat().st_mode & 0o077:
    raise SystemExit('Beta directory must be private and not a symlink')
private=root/'tester-invitations.json'
hashes=root/'access-hashes.json'
if private.exists() or hashes.exists():
    raise SystemExit('Existing access files preserved; rotation requires explicit operator action')
keys=[secrets.token_urlsafe(32) for _ in range(4)]
with private.open('x') as f:
    json.dump({'hostname':'grocery.serveforwad.com','testers':[{'label':f'tester-{i+1}','key':k} for i,k in enumerate(keys)]},f,indent=2)
with hashes.open('x') as f:
    json.dump({'version':1,'hashes':[hashlib.sha256(k.encode()).hexdigest() for k in keys]},f)
print('Four private tester invitations created. No keys displayed.')
