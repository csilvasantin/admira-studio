#!/usr/bin/env python3
"""Build a reviewable extension ZIP; never installs or submits it."""
import argparse
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

parser = argparse.ArgumentParser()
parser.add_argument('output', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1] / 'extensions/admira-studio-importer'
manifest = json.loads((root / 'manifest.json').read_text())
files = ['manifest.json', 'background.js', 'content.js', 'content.css', 'shared.js', 'sidepanel.html', 'sidepanel.css', 'sidepanel.js', *manifest['icons'].values()]
assert manifest['manifest_version'] == 3 and manifest['version'] == '1.0.2'
assert len(files) == len(set(files))
assert all((root / name).is_file() and (root / name).resolve().is_relative_to(root) for name in files)
args.output.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(args.output, 'w', compression=ZIP_DEFLATED) as archive:
    for name in files:
        archive.write(root / name, name)
with ZipFile(args.output) as archive:
    assert archive.testzip() is None
    assert json.loads(archive.read('manifest.json')) == manifest
print(f'{manifest["name"]} {manifest["version"]}: {len(files)} archivos; ZIP verificado, sin instalar ni enviar.')
