#!/usr/bin/env python3
"""Install a USDA/data.gov key interactively without displaying it."""
import getpass
import os
from pathlib import Path
import re
import sys
import warnings

def save_key(directory: Path, key: str) -> None:
    if not re.fullmatch(r"[A-Za-z0-9_-]{20,200}", key):
        raise ValueError("Invalid key format.")
    if directory.is_symlink():
        raise ValueError("Symbolic-link directory refused.")
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    directory.chmod(0o700)
    fd = os.open(directory / "api-key", os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as stream:
        stream.write(key)
        stream.flush()
        os.fsync(stream.fileno())

def main():
    if not sys.stdin.isatty():
        raise ValueError("Interactive terminal required.")
    root = Path(__file__).resolve().parents[1]
    if not root.is_dir() or (root / ".tools").is_symlink():
        raise ValueError("Project credential location unavailable.")
    destination = root / ".tools/usda"
    if (destination / "api-key").exists():
        raise ValueError("Existing key preserved.")
    with warnings.catch_warnings():
        warnings.simplefilter("error", getpass.GetPassWarning)
        key = getpass.getpass("Paste USDA/data.gov API key (hidden), then press Enter: ")
    save_key(destination, key)
    print("USDA key saved privately on the project server. No API request made.")

if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, getpass.GetPassWarning):
        sys.exit("Setup stopped: invalid input, existing key, unavailable private location or unsupported terminal. No key printed.")
    except (EOFError, KeyboardInterrupt):
        sys.exit("Setup cancelled.")

