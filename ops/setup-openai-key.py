#!/usr/bin/env python3
"""Interactive server-only key installation; never prints the credential."""
import getpass
import os
from pathlib import Path
import sys

def save_key(directory: Path, key: str) -> None:
    if not key.startswith("sk-") or not 20 <= len(key) <= 1000 or any(c.isspace() for c in key):
        raise ValueError("Invalid API key format; nothing saved.")
    if directory.is_symlink():
        raise ValueError("Refusing a symbolic-link credential directory.")
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    directory.chmod(0o700)
    fd = os.open(directory / "api-key", os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as stream:
        stream.write(key)
        stream.flush()
        os.fsync(stream.fileno())

def main():
    if not sys.stdin.isatty():
        raise ValueError("Use an interactive SSH terminal (ssh -t).")
    root = Path(__file__).resolve().parents[1]
    if not root.is_dir():
        raise ValueError("Project directory unavailable.")
    destination = root / ".tools/openai"
    if (destination / "api-key").exists():
        raise ValueError("A key already exists; preserving it.")
    key = getpass.getpass("Paste the OpenAI project API key (hidden), then press Enter: ")
    save_key(destination, key)
    print("Key saved privately on the project server. No API calls made; personal processing remains disabled.")

if __name__ == "__main__":
    try:
        main()
    except (ValueError, FileExistsError):
        sys.exit("Setup stopped: invalid input, existing key, or unsupported terminal. No credential printed.")
    except (EOFError, KeyboardInterrupt):
        sys.exit("Setup cancelled.")

