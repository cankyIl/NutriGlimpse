#!/usr/bin/env python3
"""Save only the requested SerpApi credential; never echo it."""
import getpass
import os
from pathlib import Path
import socket
import sys

ROOT = Path("/path/to/NutriGlimpse")
TARGET = ROOT / ".secrets" / "serpapi-availability-test.key"

def main():
    if socket.gethostname().split(".")[0] != "project-server":
        raise SystemExit("Run this helper on project-server.")
    if not sys.stdin.isatty():
        raise SystemExit("Use ssh -t so key entry stays hidden.")
    if TARGET.parent.resolve() != ROOT / ".secrets":
        raise SystemExit("Unexpected secrets directory.")
    if TARGET.exists() or TARGET.is_symlink():
        raise SystemExit("A key file already exists; it was not changed.")
    key = getpass.getpass("Paste your SerpApi key (input is hidden): ").strip()
    if not key or any(c.isspace() for c in key):
        raise SystemExit("No valid key entered; nothing saved.")
    fd = os.open(TARGET, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    with os.fdopen(fd, "w") as output:
        output.write(key + "\n")
    print("SerpApi key saved privately. No API calls or purchases were made.")

if __name__ == "__main__":
    main()
