#!/usr/bin/env python3
"""Save the Gemini key on this server without echo, shell history, or app changes."""
import getpass
import os
import re
import stat
import sys
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
expected = Path('/path/to/NutriGlimpse')
if root != expected or not sys.stdin.isatty():
    sys.exit('Run this helper interactively on project-server using ssh -t.')
directory = root / '.tools' / 'gemini'
if directory.is_symlink():
    sys.exit('Refusing a linked credential directory.')
directory.mkdir(mode=0o700, exist_ok=True)
info = directory.stat()
if info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o700:
    sys.exit('Credential directory must be owned by this user with permissions 0700.')
destination = directory / 'api-key'
if destination.exists() or destination.is_symlink():
    sys.exit('An Gemini key is already saved. It has not been changed.')
try:
    value = getpass.getpass('Paste your Gemini API key (input is hidden), then press Enter: ').strip()
except (EOFError, KeyboardInterrupt):
    sys.exit('\nCancelled. No key saved.')
if not re.fullmatch(r'[A-Za-z0-9_./+=-]{20,4096}', value):
    sys.exit('Paste only the API key, without quotes, spaces or a command. Nothing was saved.')
temporary = None
try:
    descriptor, temporary = tempfile.mkstemp(prefix='.key-', dir=directory)
    os.fchmod(descriptor, 0o600)
    with os.fdopen(descriptor, 'w') as output:
        output.write(value + '\n')
        output.flush()
        os.fsync(output.fileno())
    # Hard-link publication is atomic and refuses to replace an existing key.
    os.link(temporary, destination, follow_symlinks=False)
finally:
    value = ''
    if temporary is not None:
        os.unlink(temporary)
print('Gemini API key saved securely. No model call was made and the live app was not changed.')
