import {DurableObject} from 'cloudflare:workers';
import {collect, finalize} from './checks.mjs';

const json = (body, status = 200) => Response.json(body, {status, headers: {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
}});
const instance = env => env.MONITOR.get(env.MONITOR.idFromName('admira.studio'));

export class AvailabilityMonitor extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/tick') {
      const {scheduledAt} = await request.json();
      const slot = Math.floor(scheduledAt / 300000);
      const claimed = await this.ctx.blockConcurrencyWhile(async () => {
        const prior = await this.ctx.storage.get('lastSlot');
        if (prior !== undefined && slot <= prior) return false;
        await this.ctx.storage.put('lastSlot', slot);
        return true;
      });
      if (!claimed) return json({duplicate: true});
      const previous = await this.ctx.storage.get('latest') || {};
      const report = finalize(await collect(), previous, scheduledAt);
      report.run_url = url.origin + '/report.json?sequence=' + report.sequence;
      const summary = {sequence: report.sequence, checked_at: report.checked_at, scheduled_at: report.scheduled_at,
        availability: report.availability, event: report.event, warnings: report.warnings,
        confirmed_failures: report.confirmed_failures.map(r => ({check: r.check, host: r.host, probe: r.probe})),
        run_url: report.run_url};
      // Each observation is separately durable. Public reads never initiate probes.
      await this.ctx.storage.put({latest: report, ['observation:' + report.checked_at]: summary});
      if (report.event !== 'unchanged') await this.ctx.storage.put('event:' + report.checked_at, summary);
      const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
      for (const prefix of ['observation:', 'event:']) {
        const old = await this.ctx.storage.list({prefix, end: prefix + cutoff, limit: 100});
        if (old.size) await this.ctx.storage.delete([...old.keys()]);
      }
      return json({sequence: report.sequence, availability: report.availability});
    }
    if (request.method !== 'GET') return json({error: 'Read only'}, 405);
    const latest = await this.ctx.storage.get('latest');
    if (!latest) return json({availability: 'unknown', note: 'Waiting for first automatic observation'}, 503);
    if (url.pathname === '/notification.json') {
      // Keep each page under Globalping's 10 KB response-body limit. This also
      // lets the desktop read reports from routes that cannot reach workers.dev.
      const compact = {...latest};
      const checks = latest.attempts.at(-1).checks;
      compact.attempts = [{errors: latest.attempts.at(-1).errors, checks: [...new Map(
        checks.map(r => [r.probe.country, {probe: r.probe}])).values()]}];
      const grouped = rows => [...rows.reduce((groups, row) => {
        const key = row.host + ':' + row.probe.country;
        const value = groups.get(key) || {host: row.host, probe: row.probe, checks: [], issues: []};
        value.checks.push(row.check);
        value.issues = [...new Set([...value.issues, ...row.issues])];
        groups.set(key, value);
        return groups;
      }, new Map()).values()];
      compact.confirmed_failures = grouped(latest.confirmed_failures);
      compact.pending_failures = grouped(latest.pending_failures);
      const after = Number(url.searchParams.get('after')) || 0;
      const events = await this.ctx.storage.list({prefix: 'event:', limit: 2016});
      const incidents = [...events.values()].filter(e => e.sequence > after && e.event === 'incident');
      const history = incidents.slice(0, 8).map(e => ({sequence: e.sequence, checked_at: e.checked_at,
        event: e.event, affected_countries: [...new Set(e.confirmed_failures.map(r => r.probe.country))], run_url: e.run_url}));
      return json({latest: compact, history, next_after: incidents.length > 8 ? history.at(-1).sequence : null});
    }
    // A sequence link returns the corresponding retained observation summary.
    const sequence = url.searchParams.get('sequence');
    if (sequence && Number(sequence) !== latest.sequence) {
      const entries = await this.ctx.storage.list({prefix: 'observation:', reverse: true, limit: 2016});
      const old = [...entries.values()].find(r => r.sequence === Number(sequence));
      return old ? json(old) : json({error: 'Observation outside seven-day retention'}, 404);
    }
    const history = await this.ctx.storage.list({prefix: url.pathname === '/history.json' ? 'observation:' : 'event:',
      reverse: true, limit: url.pathname === '/history.json' ? 2016 : 256});
    return json({latest, history: [...history.values()], scheduler: {
      service: 'Cloudflare Cron Trigger', interval_seconds: 300, independent_of_mac: true, retention_days: 7,
    }});
  }
}

export default {
  async scheduled(controller, env, ctx) {
    // Only platform scheduled events can reach the private mutation path.
    ctx.waitUntil(instance(env).fetch(new Request('https://monitor.internal/tick', {
      method: 'POST', body: JSON.stringify({scheduledAt: controller.scheduledTime}),
    })).then(async r => { if (!r.ok) throw new Error('Monitor tick failed'); }));
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method !== 'GET') return json({error: 'Read only'}, 405);
    if (!['/', '/report.json', '/history.json', '/notification.json'].includes(url.pathname)) return json({error: 'Not found'}, 404);
    // The public origin is substituted only in the sanitized response, never used as a probe target.
    const response = await instance(env).fetch(new Request('https://monitor.internal' +
      (url.pathname === '/' ? '/report.json' : url.pathname) + url.search));
    const body = await response.text();
    return new Response(body.replaceAll('https://monitor.internal', url.origin), response);
  },
};
