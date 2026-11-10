#!/usr/bin/env python3
"""Delete one verified request trace from beta stores. Dry-run unless --execute."""
import argparse, datetime, json, os, sqlite3, stat, uuid
from pathlib import Path

def remove_trace(root, trace, execute=False):
    trace = str(uuid.UUID(trace))
    root = Path(root).resolve(strict=True)
    stores = [('.tools/beta-diagnostics/events.sqlite', 'events'), ('.tools/beta-response-journal/responses.sqlite', 'responses')]
    # Validate every existing path before any mutation; never follow a symlink.
    paths = []
    for relative, table in stores:
        p = root / relative
        for parent in [p, *p.parents]:
            if parent == root: break
            if parent.is_symlink(): raise ValueError('Symlink in private store path')
        if p.exists():
            st = p.stat()
            if not stat.S_ISREG(st.st_mode) or st.st_uid != os.getuid(): raise ValueError('Unexpected private store owner/type')
            paths.append((p, table))
    ledger = root / '.tools/privacy-deletions'
    if ledger.is_symlink() or (ledger.parent.is_symlink()): raise ValueError('Unsafe deletion ledger path')
    result = {'trace': trace, 'execute': execute, 'stores': {}}
    if execute:
        ledger.mkdir(mode=0o700, exist_ok=True)
        os.chmod(ledger, 0o700)
        # Persist intent before deleting either DB, so a crash/retry or restore remains safe.
        record = ledger / (trace + '.json')
        if record.is_symlink(): raise ValueError('Unsafe deletion receipt')
        if not record.exists():
            with record.open('x') as f:
                os.chmod(record, 0o600)
                json.dump({'trace':trace, 'requestedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(), 'scope':'beta events and encrypted responses; reapply after restore'},f)
                f.flush(); os.fsync(f.fileno())
    for p, table in paths:
        db = sqlite3.connect(p.as_uri() + ('?mode=rw' if execute else '?mode=ro'), uri=True, timeout=5)
        try:
            before = db.execute('SELECT count(*) FROM '+table+' WHERE trace=?', (trace,)).fetchone()[0]
            if execute:
                db.execute('PRAGMA secure_delete=ON')
                with db: db.execute('DELETE FROM '+table+' WHERE trace=?', (trace,))
            after = db.execute('SELECT count(*) FROM '+table+' WHERE trace=?', (trace,)).fetchone()[0]
            result['stores'][table] = {'matched':before, 'remaining':after}
        finally: db.close()
    return result

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',default=str(Path(__file__).resolve().parent.parent))
    parser.add_argument('--trace',required=True,help='Verified request UUID, never a name or medical value')
    parser.add_argument('--execute',action='store_true')
    args=parser.parse_args();os.umask(0o077)
    print(json.dumps(remove_trace(args.root,args.trace,args.execute),indent=2))
if __name__=='__main__': main()
