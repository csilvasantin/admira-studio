#!/usr/bin/env python3
"""Restore only this workflow's most recent report, without write permissions."""
import io
import json
import os
from pathlib import Path
import subprocess
import zipfile


def gh(path):
    return subprocess.check_output(['gh', 'api', path])


repo = os.environ['GITHUB_REPOSITORY']
runs = json.loads(gh(f'repos/{repo}/actions/workflows/availability.yml/runs?status=completed&per_page=5'))['workflow_runs']
for run in runs:
    if str(run['id']) == os.environ['GITHUB_RUN_ID']:
        continue
    artifacts = json.loads(gh(f'repos/{repo}/actions/runs/{run["id"]}/artifacts'))['artifacts']
    found = next((a for a in artifacts if a['name'] == 'studio-public-availability' and not a['expired']), None)
    if not found:
        continue
    archive = zipfile.ZipFile(io.BytesIO(gh(f'repos/{repo}/actions/artifacts/{found["id"]}/zip')))
    data = json.loads(archive.read('report.json'))
    if data.get('schema') != 1:
        raise RuntimeError('Unexpected observation schema')
    Path('availability/previous.json').write_text(json.dumps(data))
    print(f'Restored observation from run {run["id"]}')
    break
else:
    print('First observation: no previous report available')
