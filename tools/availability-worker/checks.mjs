// Public observations only: never store headers, response bodies or login nonces.
export const CHECKS = [
  ['version', 'admira.studio', '/version.json', 'version'],
  ['home', 'admira.studio', '/', 'redirect'],
  ['login', 'admira.studio', '/auth/login', 'login'],
  ['www', 'www.admira.studio', '/', 'redirect'],
  ['dns-apex', 'admira.studio', null, 'dns'],
  ['dns-www', 'www.admira.studio', null, 'dns'],
];
const COUNTRIES = ['DE', 'ES', 'US'];
const API = 'https://api.globalping.io/v1';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function api(path, payload, fetcher) {
  const response = await fetcher(API + path, {
    method: payload ? 'POST' : 'GET',
    headers: {'Content-Type': 'application/json', 'User-Agent': 'AdmiraStudioAvailability/2.0'},
    ...(payload ? {body: JSON.stringify(payload)} : {}),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Globalping HTTP ${response.status}`);
  return response.json();
}

export async function selectLocations(fetcher = fetch) {
  const probes = await api('/probes', null, fetcher);
  const spanish = probes.filter(p => p.location.country === 'ES' && p.tags?.includes('eyeball-network'));
  if (!spanish.length) throw new Error('No Spanish residential probe available');
  const asns = spanish.map(p => p.location.asn);
  const asn = [3352, 12479, 12430].find(a => asns.includes(a)) ?? Math.min(...asns);
  return [{country: 'ES', asn, limit: 1}, {country: 'DE', limit: 1}, {country: 'US', limit: 1}];
}

async function measure(check, selected, fetcher) {
  const [key, host, path, kind] = check;
  const payload = {type: kind === 'dns' ? 'dns' : 'http', target: host, locations: selected, timeout: 15,
    measurementOptions: kind === 'dns' ? {query: {type: 'A'}} :
      {protocol: 'HTTPS', request: {method: 'GET', path}}};
  const deadline = Date.now() + 50000;
  const created = await api('/measurements', payload, fetcher);
  while (Date.now() < deadline) {
    await sleep(2000);
    const result = await api('/measurements/' + encodeURIComponent(created.id), null, fetcher);
    if (result.status !== 'in-progress') return {id: created.id, data: result};
  }
  throw new Error(`Measurement ${key} did not finish`);
}

function hostnameMatches(host, subject = {}) {
  const names = [...(subject.alt || '').matchAll(/DNS:([^,\s]+)/g)].map(m => m[1]);
  if (!names.length) names.push(subject.CN || '');
  return names.some(name => host === name || (name.startsWith('*.') &&
    host.split('.').length === name.split('.').length && host.endsWith(name.slice(1))));
}

export function publicIPv4(address) {
  if (typeof address !== 'string' || !/^\d+\.\d+\.\d+\.\d+$/.test(address)) return false;
  const [a,b,c,d] = address.split('.').map(Number);
  if ([a,b,c,d].some(x => x > 255)) return false;
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 ||
      (b === 0 && (c === 0 || c === 2)))) || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113));
}

export function evaluate(check, item, instant = Date.now()) {
  const [key, host, path, kind] = check;
  const p = item.probe || {}, result = item.result || {};
  const row = {check: key, host, path, probe: Object.fromEntries(
    ['country', 'city', 'asn', 'network'].map(k => [k, p[k] ?? null])), outcome: 'healthy', issues: [], warnings: []};
  if (result.status !== 'finished') {
    const source = result.failureSource || 'unknown';
    row.outcome = ['target', 'resolver'].includes(source) ? 'down' : 'unknown';
    row.issues.push(`probe ${result.status || 'missing'} (${source})`);
    return row;
  }
  if (kind === 'dns') {
    row.addresses = (result.answers || []).filter(a => a.type === 'A').map(a => a.value);
    if (result.statusCode !== 0 || !row.addresses.length || !row.addresses.every(publicIPv4))
      row.issues.push('DNS has no successful public A answer');
  } else {
    Object.assign(row, {http_status: result.statusCode, address: result.resolvedAddress,
      duration_ms: result.timings?.total, tls_authorized: result.tls?.authorized === true,
      certificate_expires: result.tls?.expiresAt});
    if (!row.tls_authorized || !hostnameMatches(host, result.tls?.subject))
      row.issues.push('TLS certificate untrusted or hostname mismatch');
    const days = (Date.parse(row.certificate_expires) - instant) / 86400000;
    if (!Number.isFinite(days)) row.issues.push('TLS expiry unavailable');
    else if (days <= 0) row.issues.push('TLS certificate expired');
    else if (days <= 14) row.warnings.push('TLS certificate expires within 14 days');
    let good = false;
    if (kind === 'version') {
      try {
        const release = JSON.parse(result.rawBody || '');
        good = result.statusCode === 200 && /^[0-9a-f]{40}$/.test(release.gitFull || release.git || '');
        row.release = typeof release.version === 'string' ? release.version.slice(0, 100) : null;
      } catch {}
    } else if (kind === 'redirect') {
      const headers = Object.fromEntries(Object.entries(result.headers || {}).map(([k,v]) => [k.toLowerCase(),v]));
      try {
        const target = new URL(headers.location || '', 'https://' + host);
        good = [302,303].includes(result.statusCode) && target.protocol === 'https:' &&
          target.hostname === host && target.pathname === '/auth/login';
      } catch {}
    } else good = result.statusCode === 401 && (result.rawBody || '').includes('Admira Studio') &&
      (result.rawBody || '').includes('Acceso con Google');
    if (!good) row.issues.push(`Unexpected ${kind} response`);
  }
  if (row.issues.length) row.outcome = 'down';
  return row;
}

export async function collect(fetcher = fetch) {
  const attempt = {checked_at: new Date().toISOString(), checks: [], measurements: {}, errors: []};
  try {
    const selected = await selectLocations(fetcher);
    const seed = await measure(CHECKS[0], selected, fetcher);
    attempt.measurements.version = seed.id;
    attempt.checks.push(...(seed.data.results || []).map(item => evaluate(CHECKS[0], item)));
    await Promise.all(CHECKS.slice(1).map(async check => {
      try {
        const result = await measure(check, seed.id, fetcher);
        attempt.measurements[check[0]] = result.id;
        attempt.checks.push(...(result.data.results || []).map(item => evaluate(check, item)));
      } catch (error) {
        attempt.errors.push(`${check[0]}: ${safeError(error)}`);
      }
    }));
  } catch (error) { attempt.errors.push(safeError(error)); }
  for (const [key] of CHECKS) {
    const rows = attempt.checks.filter(row => row.check === key);
    if (rows.length !== 3 || JSON.stringify(rows.map(r => r.probe.country).sort()) !== JSON.stringify(COUNTRIES))
      attempt.errors.push(key + ': incomplete ES/DE/US coverage');
  }
  return attempt;
}

function safeError(error) {
  // Never serialize upstream response bodies or arbitrary exception messages.
  const message = String(error?.message || '');
  if (/^Globalping HTTP \d{3}$/.test(message) || message === 'No Spanish residential probe available' ||
    /^Measurement [a-z-]+ did not finish$/.test(message)) return message;
  return 'External measurement unavailable';
}

const issueKey = row => `${row.check}:${row.host}:${row.probe.country}`;
export function finalize(attempt, previous = {}, scheduledAt, instant = Date.now()) {
  // Confirmation is across two consecutive cron cycles, not additional quota-consuming retries.
  const previousAttempt = previous.attempts?.at(-1);
  const consecutive = instant - Date.parse(previous.checked_at || '') < 11 * 60000;
  const priorBad = new Set(consecutive ? (previousAttempt?.checks || []).filter(r => r.outcome === 'down').map(issueKey) : []);
  const bad = attempt.checks.filter(r => r.outcome === 'down');
  const confirmed = bad.filter(r => priorBad.has(issueKey(r)));
  const unknown = attempt.errors.length > 0 || attempt.checks.some(r => r.outcome === 'unknown');
  const availability = confirmed.length ? 'down' : unknown ? 'unknown' : bad.length ? 'suspect' : 'healthy';
  const known = ['down', 'healthy'].includes(availability) ? availability : previous.last_known_availability ?? null;
  let event = 'unchanged';
  if (availability === 'down' && previous.last_known_availability !== 'down') event = 'incident';
  else if (availability === 'healthy' && previous.last_known_availability === 'down') event = 'recovered';
  else if (availability === 'unknown' && previous.availability !== 'unknown') event = 'monitor-degraded';
  const warnings = [...new Set(attempt.checks.flatMap(r => r.warnings))].sort();
  if (warnings.length && !previous.warnings?.length && event === 'unchanged') event = 'certificate-warning';
  return {schema: 2, checked_at: new Date(instant).toISOString(), scheduled_at: new Date(scheduledAt).toISOString(),
    scheduler: 'cloudflare-cron', sequence: (previous.sequence || 0) + 1,
    availability, last_known_availability: known, event, warnings, confirmed_failures: confirmed,
    pending_failures: bad.filter(r => !priorBad.has(issueKey(r))), attempts: [attempt]};
}
