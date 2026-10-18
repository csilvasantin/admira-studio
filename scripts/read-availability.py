#!/usr/bin/env python3
"""Read the external runner's observations for the chat notification heartbeat."""
import argparse
import datetime as dt
import io
import json
from pathlib import Path
import subprocess
import zipfile

REPO = 'csilvasantin/admira-studio'


def gh(path):
    return subprocess.check_output(['gh', 'api', path], timeout=30)


def report(run):
    artifacts = json.loads(gh(f'repos/{REPO}/actions/runs/{run["id"]}/artifacts'))['artifacts']
    artifact = next((a for a in artifacts if a['name'] == 'studio-public-availability' and not a['expired']), None)
    if not artifact:
        return {'availability': 'unknown', 'warnings': [], 'confirmed_failures': [],
                'note': 'Runner did not publish a usable observation'}
    archive = zipfile.ZipFile(io.BytesIO(gh(f'repos/{REPO}/actions/artifacts/{artifact["id"]}/zip')))
    return json.loads(archive.read('report.json'))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--state', required=True)
    args = parser.parse_args()
    path = Path(args.state)
    previous = json.loads(path.read_text()) if path.exists() else {}
    runs = json.loads(gh(f'repos/{REPO}/actions/workflows/availability.yml/runs?status=completed&per_page=100'))['workflow_runs']
    if not runs:
        raise RuntimeError('No completed external monitor runs')
    latest = max(runs, key=lambda r: (r['id'], r.get('run_attempt', 1)))
    current = report(latest)
    instant = dt.datetime.now(dt.timezone.utc)
    checked = dt.datetime.fromisoformat(current.get('checked_at', latest['updated_at']).replace('Z', '+00:00'))
    stale = (instant - checked).total_seconds() > 1200
    availability = 'stale' if stale else current['availability']
    warnings = current.get('warnings', [])
    failures = current.get('confirmed_failures', [])
    signature = json.dumps([availability, warnings,
        sorted({(r['host'], r['probe']['country']) for r in failures})])
    missed = []
    last_id = previous.get('run_id', 0)
    # Surface incidents that occurred and recovered while the desktop was offline.
    for run in runs:
        if last_id and last_id < run['id'] < latest['id'] and run['conclusion'] == 'failure':
            old = report(run)
            if old.get('event') == 'incident':
                missed.append({'run_id': run['id'], 'url': run['html_url'],
                               'checked_at': old.get('checked_at')})
    notify = (signature != previous.get('signature') and
              (availability != 'healthy' or warnings or previous.get('availability') not in (None, 'healthy')))
    notify = bool(notify or missed)
    output = {'notify': notify, 'availability': availability,
              'checked_at': current.get('checked_at'), 'run_id': latest['id'],
              'run_url': latest['html_url'], 'warnings': warnings,
              'confirmed_failures': failures, 'missed_incidents': missed,
              'note': current.get('note'), 'external_checks_run_without_desktop': True,
              'chat_notifications_require_desktop_heartbeat': True}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({'run_id': latest['id'], 'availability': availability,
                                'signature': signature, 'checked_at': instant.isoformat()}, indent=2))
    print(json.dumps(output, ensure_ascii=False))


if __name__ == '__main__':
    main()
