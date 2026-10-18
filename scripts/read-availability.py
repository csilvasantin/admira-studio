#!/usr/bin/env python3
"""Read sanitized cloud observations; this heartbeat never probes the website."""
import argparse
import datetime as dt
import fcntl
import json
import os
from pathlib import Path
import time
import urllib.error
import urllib.parse
import urllib.request

SOURCE = 'https://admira-studio-availability.csilvasantin.workers.dev/notification.json'
API = 'https://api.globalping.io/v1'


def get_json(url, timeout=6, payload=None):
    request = urllib.request.Request(url, data=None if payload is None else json.dumps(payload).encode(),
        headers={'Content-Type': 'application/json', 'User-Agent': 'AdmiraStudioMonitorReader/2.0'})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.load(response)


def read_cloud(source):
    try:
        return get_json(source), 'direct'
    except (OSError, ValueError):
        # Some residential routes cannot reach workers.dev. Read the SAME report
        # through a public external HTTPS probe, without changing DNS or /etc/hosts.
        url = urllib.parse.urlsplit(source)
        created = get_json(API + '/measurements', timeout=15, payload={
            'type': 'http', 'target': url.hostname, 'locations': [{'country': 'DE', 'limit': 1}],
            'timeout': 10, 'measurementOptions': {'protocol': 'HTTPS',
                'request': {'method': 'GET', 'path': url.path + ('?' + url.query if url.query else '')}}})
        for _ in range(15):
            time.sleep(2)
            result = get_json(API + '/measurements/' + created['id'], timeout=15)
            if result['status'] != 'in-progress':
                rows = result.get('results', [])
                if len(rows) == 1:
                    reply = rows[0].get('result', {})
                    if reply.get('status') == 'finished' and reply.get('statusCode') == 200 and reply.get('tls', {}).get('authorized') is True and not reply.get('truncated'):
                        return json.loads(reply.get('rawBody', '')), 'external-read-relay'
                break
        raise RuntimeError('External monitor report unavailable') from None


def notification(document, previous, instant=None, source=SOURCE):
    instant = instant or dt.datetime.now(dt.timezone.utc)
    current = document['latest']
    if current.get('schema') != 2 or current.get('scheduler') != 'cloudflare-cron':
        raise ValueError('Unexpected monitor report')
    checked = dt.datetime.fromisoformat(current['checked_at'].replace('Z', '+00:00'))
    availability = 'stale' if (instant - checked).total_seconds() > 1200 else current['availability']
    if availability not in ('healthy', 'down', 'unknown', 'suspect', 'stale'):
        raise ValueError('Unexpected monitor status')
    failures, warnings = current.get('confirmed_failures', []), current.get('warnings', [])
    signature = json.dumps([availability, warnings,
        sorted({(r['host'], r['probe']['country']) for r in failures})], sort_keys=True)
    last_id = previous.get('run_id', 0) if previous.get('source') == source else 0
    missed = [r for r in document.get('history', []) if last_id and
        last_id < r['sequence'] < current['sequence'] and r.get('event') == 'incident']
    # A first target failure is pending, not an incident. Preserve the last notified
    # status so a subsequent confirmed recovery is not lost during this state.
    pending = availability == 'suspect' and not warnings
    notify = not pending and signature != previous.get('signature') and (
        availability != 'healthy' or warnings or previous.get('availability') not in (None, 'healthy'))
    state = dict(previous) if pending else {'signature': signature, 'availability': availability}
    state.update(source=source, run_id=current['sequence'], checked_at=instant.isoformat())
    checks = current.get('attempts', [{}])[-1].get('checks', [])
    output = {'notify': bool(notify or missed), 'availability': availability,
        'checked_at': current['checked_at'], 'scheduled_at': current.get('scheduled_at'),
        'run_id': current['sequence'], 'run_url': current['run_url'], 'warnings': warnings,
        'confirmed_failures': failures, 'pending_failures': current.get('pending_failures', []),
        'missed_incidents': missed, 'networks': list({json.dumps(r['probe'], sort_keys=True): r['probe'] for r in checks}.values()),
        'note': '; '.join(current.get('attempts', [{}])[-1].get('errors', [])) or None,
        'external_checks_run_without_desktop': True, 'chat_notifications_require_desktop_heartbeat': True}
    return output, state


def failed_read(previous, error, source=SOURCE):
    cause = f'HTTP {error.code}' if isinstance(error, urllib.error.HTTPError) else type(error).__name__
    signature = json.dumps(['reader-unavailable', cause])
    output = {'notify': signature != previous.get('signature'), 'availability': 'unknown',
        'checked_at': None, 'run_url': source, 'warnings': [], 'confirmed_failures': [],
        'missed_incidents': [], 'note': 'Seguimiento interrumpido; estado de la web desconocido (' + cause + ')',
        'external_checks_run_without_desktop': True, 'chat_notifications_require_desktop_heartbeat': True}
    state = dict(previous, signature=signature, availability='unknown', source=source)
    return output, state


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--state', required=True)
    args = parser.parse_args()
    path = Path(args.state)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(str(path) + '.lock', 'a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        previous = json.loads(path.read_text()) if path.exists() else {}
        try:
            cursor = previous.get('run_id', 0) if previous.get('source') == SOURCE else 0
            document, transport = read_cloud(SOURCE + '?after=' + str(cursor))
            # Read every retained incident after an offline period, in bounded pages.
            seen = set()
            while document.get('next_after'):
                cursor = document['next_after']
                if cursor in seen:
                    raise ValueError('Repeated history cursor')
                seen.add(cursor)
                page, _ = read_cloud(SOURCE + '?after=' + str(cursor))
                document['history'].extend(page['history'])
                document['next_after'] = page.get('next_after')
            output, state = notification(document, previous)
            output['report_transport'] = transport
        except Exception as error:
            output, state = failed_read(previous, error)
        temp = path.with_name(path.name + f'.{os.getpid()}.tmp')
        temp.write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n')
        temp.replace(path)
        print(json.dumps(output, ensure_ascii=False))


if __name__ == '__main__':
    main()
