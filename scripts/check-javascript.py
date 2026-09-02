#!/usr/bin/env python3
"""Compile every JavaScript file and fail on the first generated syntax error."""
from pathlib import Path
import subprocess
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
files = sorted(path for path in root.rglob("*.js") if ".git" not in path.parts)
failures = []
for path in files:
    result = subprocess.run(
        ["node", "--check", str(path)],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode:
        failures.append((path, result.stderr.strip()))
if failures:
    for path, error in failures:
        print(f"✗ JavaScript syntax: {path}\n{error}")
    raise SystemExit(1)
print(f"✓ JavaScript syntax · {len(files)} files")
