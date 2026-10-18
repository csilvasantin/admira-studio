#!/usr/bin/env python3
"""Public, credential-free probes. Never generates content or changes the site."""
import argparse
import concurrent.futures
import datetime as dt
import ipaddress
import json
import os
from pathlib import Path
import re
import time
import urllib.error
import urllib.parse
import urllib.request

API = 'https://api.globalping.io/v1'
UTC = dt.timezone.utc
CHECKS = [
    ('version', 'admira.studio', '/version.json', 'version'),
    ('home', 'admira.studio', '/', 'redirect'),
    ('login', 'admira.studio', '/auth/login', 'login'),
    ('www', 'www.admira.studio', '/', 'redirect'),
    ('dns-apex', 'admira.studio', None, 'dns'),
    ('dns-www', 'www.admira.studio', None, 'dns'),
]


def now():
    return dt.datetime.now(UTC)


def api(path, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(API + path, data=data, headers={
        'Content-Type': 'application/json', 'User-Agent': 'AdmiraStudioAvailability/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        # Do not expose service response bodies or credentials in public artifacts.
        raise RuntimeError(f'Globalping HTTP {exc.code}') from None


def locations():
    probes = api('/probes')
    spanish = [p for p in probes if p['location']['country'] == 'ES'
               and 'eyeball-network' in p.get('tags', [])]
    if not spanish:
        raise RuntimeError('No Spanish residential probe available')
    asns = {p['location']['asn'] for p in spanish}
    selected = next((a for a in (3352, 12479, 12430) if a in asns), min(asns))
    return [{'country': 'ES', 'asn': selected, 'limit': 1},
            {'country': 'DE', 'limit': 1}, {'country': 'US', 'limit': 1}]


def measure(check, selected):
    key, host, path, kind = check
    payload = {'type': 'dns' if kind == 'dns' else 'http', 'target': host,
               'locations': selected, 'timeout': 15}
    payload['measurementOptions'] = ({'query': {'type': 'A'}} if kind == 'dns' else
        {'protocol': 'HTTPS', 'request': {'method': 'GET', 'path': path}})
    created = api('/measurements', payload)
    measurement_id = created['id']
    deadline = time.monotonic() + 50
    while time.monotonic() < deadline:
        result = api('/measurements/' + measurement_id)
        if result['status'] != 'in-progress':
            return measurement_id, result
        time.sleep(2)
    raise RuntimeError(f'Measurement {key} did not finish')


def valid_hostname(host, subject):
    names = re.findall(r'DNS:([^,\s]+)', subject.get('alt', ''))
    if not names:
        names = [subject.get('CN', '')]
    return any(host == name or (name.startswith('*.') and
               host.count('.') == name.count('.') and host.endswith(name[1:]))
               for name in names)


def evaluate(check, item, instant=None):
    key, host, path, kind = check
    probe, result = item['probe'], item['result']
    row = {'check': key, 'host': host, 'path': path,
           'probe': {k: probe.get(k) for k in ('country', 'city', 'asn', 'network')},
           'outcome': 'healthy', 'issues': [], 'warnings': []}
    if result.get('status') != 'finished':
        source = result.get('failureSource', 'unknown')
        row['outcome'] = 'down' if source in ('target', 'resolver') else 'unknown'
        row['issues'] = [f'probe {result.get("status", "missing")} ({source})']
        return row
    if kind == 'dns':
        addresses = [a['value'] for a in result.get('answers', []) if a['type'] == 'A']
        row['addresses'] = addresses
        try:
            good = result.get('statusCode') == 0 and addresses and all(
                ipaddress.ip_address(a).is_global for a in addresses)
        except ValueError:
            good = False
        if not good:
            row['issues'].append('DNS has no successful public A answer')
    else:
        row.update(http_status=result.get('statusCode'),
                   address=result.get('resolvedAddress'),
                   duration_ms=result.get('timings', {}).get('total'))
        cert = result.get('tls') or {}
        row['tls_authorized'] = cert.get('authorized') is True
        row['certificate_expires'] = cert.get('expiresAt')
        if not row['tls_authorized'] or not valid_hostname(host, cert.get('subject', {})):
            row['issues'].append('TLS certificate untrusted or hostname mismatch')
        try:
            days = (dt.datetime.fromisoformat(cert['expiresAt'].replace('Z', '+00:00'))
                    - (instant or now())).total_seconds() / 86400
            if days <= 0:
                row['issues'].append('TLS certificate expired')
            elif days <= 14:
                row['warnings'].append('TLS certificate expires within 14 days')
        except (KeyError, ValueError, TypeError):
            row['issues'].append('TLS expiry unavailable')
        body = result.get('rawBody') or ''
        headers = {k.lower(): v for k, v in result.get('headers', {}).items()}
        if kind == 'version':
            try:
                release = json.loads(body)
                good = result.get('statusCode') == 200 and re.fullmatch(
                    r'[0-9a-f]{40}', release.get('gitFull', release.get('git', '')))
                row['release'] = release.get('version')
            except (ValueError, TypeError, AttributeError):
                good = False
        elif kind == 'redirect':
            target = urllib.parse.urlsplit(urllib.parse.urljoin('https://' + host, headers.get('location', '')))
            good = result.get('statusCode') in (302, 303) and target.scheme == 'https' and \
                target.hostname == host and target.path == '/auth/login'
        else:
            good = result.get('statusCode') == 401 and 'Admira Studio' in body and 'Acceso con Google' in body
        if not good:
            row['issues'].append(f'Unexpected {kind} response')
    if row['issues']:
        row['outcome'] = 'down'
    return row


def collect(selected=None):
    report = {'checked_at': now().isoformat(), 'checks': [], 'measurements': {}, 'errors': []}
    try:
        seed_id, seed = measure(CHECKS[0], selected or locations())
        report['measurements'][CHECKS[0][0]] = seed_id
        report['checks'].extend(evaluate(CHECKS[0], x) for x in seed.get('results', []))
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
            futures = {pool.submit(measure, check, seed_id): check for check in CHECKS[1:]}
            for future in concurrent.futures.as_completed(futures):
                check = futures[future]
                try:
                    mid, data = future.result()
                    report['measurements'][check[0]] = mid
                    report['checks'].extend(evaluate(check, x) for x in data.get('results', []))
                except Exception as exc:
                    report['errors'].append(type(exc).__name__ + ': measurement ' + check[0] + ' unavailable')
        for key, *_ in CHECKS:
            rows = [x for x in report['checks'] if x['check'] == key]
            if len(rows) != 3 or {x['probe']['country'] for x in rows} != {'ES', 'DE', 'US'}:
                report['errors'].append(key + ': incomplete ES/DE/US coverage')
    except Exception as exc:
        report['errors'].append(str(exc) if isinstance(exc, RuntimeError) else type(exc).__name__)
    return report


def issue_key(row):
    p = row['probe']
    return (row['check'], p['country'], p['asn'], p['city'])


def finalize(first, second=None, previous=None):
    previous = previous or {}
    latest = second or first
    initial_bad = {issue_key(x) for x in first['checks'] if x['outcome'] == 'down'}
    confirmed = [x for x in latest['checks'] if x['outcome'] == 'down'
                 and second is not None and issue_key(x) in initial_bad]
    unknown = latest['errors'] or any(x['outcome'] != 'healthy' for x in latest['checks'])
    availability = 'down' if confirmed else ('unknown' if unknown else 'healthy')
    previous_availability = previous.get('last_known_availability')
    known = previous_availability if availability == 'unknown' else availability
    event = 'unchanged'
    if availability == 'down' and previous_availability != 'down':
        event = 'incident'
    elif availability == 'healthy' and previous_availability == 'down':
        event = 'recovered'
    elif availability == 'unknown' and previous.get('availability') != 'unknown':
        event = 'monitor-degraded'
    warnings = sorted({w for x in latest['checks'] for w in x['warnings']})
    if warnings and not previous.get('warnings') and event == 'unchanged':
        event = 'certificate-warning'
    return {'schema': 1, 'checked_at': now().isoformat(), 'availability': availability,
            'last_known_availability': known, 'event': event, 'warnings': warnings,
            'confirmed_failures': confirmed, 'attempts': [first] + ([second] if second else []),
            'run_url': os.environ.get('GITHUB_SERVER_URL', 'https://github.com') + '/' +
                os.environ.get('GITHUB_REPOSITORY', 'csilvasantin/admira-studio') + '/actions/runs/' +
                os.environ.get('GITHUB_RUN_ID', 'local')}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default='availability/report.json')
    parser.add_argument('--previous', default='availability/previous.json')
    args = parser.parse_args()
    previous = json.loads(Path(args.previous).read_text()) if Path(args.previous).exists() else {}
    first = collect()
    second = None
    if any(x['outcome'] == 'down' for x in first['checks']):
        time.sleep(10)
        second = collect(first['measurements'].get('version'))
    report = finalize(first, second, previous)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'availability': report['availability'], 'event': report['event'],
                      'checks': len(report['attempts'][-1]['checks']), 'warnings': report['warnings']}))
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a') as stream:
            stream.write('## admira.studio: ' + report['availability'] + '\n\n')
            stream.write('| Check | Country / network | Result |\n|---|---|---|\n')
            for row in report['attempts'][-1]['checks']:
                stream.write('| ' + row['check'] + ' | ' + row['probe']['country'] + ' / AS' +
                             str(row['probe']['asn']) + ' | ' + row['outcome'] + ' |\n')
    return 0 if report['availability'] == 'healthy' and not report['warnings'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
