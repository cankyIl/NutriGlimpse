#!/usr/bin/env python3
"""Fictional-only validation. User-managed spending; attempts are not billed usage. No retries."""
import fcntl, json, os, pathlib, sys, urllib.request, urllib.error
from datetime import datetime, timezone
ROOT=pathlib.Path('/path/to/NutriGlimpse')
# Legacy fields are accepted for history only; no dollar amount gates requests.
def valid_attempt(row):
    if not isinstance(row,dict):return False
    legacy='attemptCount' not in row and type(row.get('reservedMicroUSD')) is int and row['reservedMicroUSD']==20000
    current='reservedMicroUSD' not in row and type(row.get('attemptCount')) is int and row['attemptCount']==1
    return legacy or current
def reserve(stream, kind):
    stream.seek(0)
    rows=[json.loads(line) for line in stream if line.strip()]
    if any(not valid_attempt(r) for r in rows):
        raise ValueError('Invalid ledger; refusing requests')
    row={'kind':kind,'attemptCount':1,'at':datetime.now(timezone.utc).isoformat()}
    stream.seek(0,2);stream.write(json.dumps(row)+'\n');stream.flush();os.fsync(stream.fileno())
def main():
    os.chdir(ROOT);os.umask(0o077)
    private=ROOT/'.tools/openai'
    key=(private/'api-key').read_text().strip()
    if not key.startswith('sk-') or any(c.isspace() for c in key):raise ValueError('Invalid credential format')
    selected=sys.argv[1:] or ['product','receipt','report']
    if any(k not in ['product','receipt','report'] for k in selected) or len(selected)>3:raise ValueError('Invalid fictional selection')
    results=[]
    with open(private/'testing-ledger.jsonl','a+') as ledger:
        fcntl.flock(ledger,fcntl.LOCK_EX|fcntl.LOCK_NB)
        for kind in selected:
            path=ROOT/'artifacts/remote/openai'
            body=(path/(kind+'-request.json')).read_bytes()
            req=json.loads(body)
            assert len(body)<=40000 and req['model']=='gpt-6-luna'
            assert req['max_output_tokens']==4096 and req['reasoning']=={'effort':'none'}
            assert req['tools']==[] and req['store'] is False and req['background'] is False
            assert req['service_tier']=='default'
            # Only generated, fixed synthetic payloads from the preceding fixture builder.
            reserve(ledger,kind)
            request=urllib.request.Request('https://api.openai.com/v1/responses',data=body,
                headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'},method='POST')
            class NoRedirect(urllib.request.HTTPRedirectHandler):
                def redirect_request(self,*args,**kwargs):return None
            try:
                with urllib.request.build_opener(NoRedirect).open(request,timeout=45) as response:
                    raw=response.read(524289)
                    if len(raw)>524288:raise ValueError('Response too large')
                parsed=json.loads(raw)
                (path/(kind+'-response.json')).write_bytes(raw)
                usage=parsed.get('usage',{})
                results.append({'kind':kind,'status':parsed.get('status'),'usage':usage})
                print(kind+': received '+str(parsed.get('status')),flush=True)
            except urllib.error.HTTPError as error:
                print('API request failed: HTTP '+str(error.code)+'; no retry; attempt recorded',flush=True)
                raise SystemExit(1)
            except Exception:
                print('API outcome unavailable; no retry; attempt recorded',flush=True)
                raise SystemExit(1)
        (ROOT/'artifacts/remote/openai/usage.json').write_text(json.dumps(results,indent=2))
        ledger.seek(0)
        total=sum(1 for line in ledger if line.strip())
        print('Recorded dispatch attempts (not billed usage): '+str(total))
if __name__=='__main__':main()
