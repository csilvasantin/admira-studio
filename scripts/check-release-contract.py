#!/usr/bin/env python3
"""Comprueba el contrato público de release de una superficie Admira."""
import json
import re
import sys
from pathlib import Path

version_path = Path(sys.argv[1] if len(sys.argv) > 1 else "version.json")
html_path = Path(sys.argv[2] if len(sys.argv) > 2 else "index.html")
release = json.loads(version_path.read_text(encoding="utf-8"))
errors = []
if not re.fullmatch(r"v\.\d{2}\.\d{2}\.\d{4}\.r\d+\.\d{2}:\d{2}", str(release.get("version", ""))):
    errors.append("version no canónica")
if not (release.get("author") or release.get("agent") or release.get("deployer")):
    errors.append("autor ausente")
if not re.fullmatch(r"[0-9a-f]{7,12}", str(release.get("gitShort", "")), re.I):
    errors.append("gitShort/SHA ausente o inválido")
if release.get("dirty") is not False:
    errors.append("dirty debe ser false")
if html_path.read_text(encoding="utf-8").count("data-release-signature") != 1:
    errors.append("debe haber un único sello visible")
if errors:
    raise SystemExit("✗ contrato de release: " + "; ".join(errors))
print(f"✓ contrato de release · {release['version']} · {release['gitShort']} · clean")
