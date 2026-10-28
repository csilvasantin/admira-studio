// Read-only credential diagnostics. Never emit tokens, account IDs or request headers.
import {mkdir, writeFile} from 'node:fs/promises';

const raw = process.env.CLOUDFLARE_API_TOKEN || '';
const token = raw.trim();
const account = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
const report = {
  checkedAt: new Date().toISOString(),
  credential: {present: !!token, trimWouldChange: raw !== token, prefixedBearer: /^Bearer\s/i.test(token)},
  accountPresent: !!account,
  probes: {},
};
async function probe(path) {
  try {
    const r = await fetch('https://api.cloudflare.com/client/v4' + path, {
      headers: {Authorization: `Bearer ${token}`}, signal: AbortSignal.timeout(20000),
    });
    const d = await r.json().catch(() => ({}));
    return {http: r.status, success: r.ok && d.success === true,
      errorCodes: (d.errors || []).map(e => e.code),
      ...(typeof d.result?.status === 'string' ? {tokenStatus: d.result.status} : {}),
      ...(path.endsWith('/pages/projects/admira-studio') && d.success === true
        ? {productionAiBinding: !!Object.keys(d.result?.deployment_configs?.production?.ai_bindings || {}).length} : {})};
  } catch {return {http: null, success: false, networkError: true};}
}
if (token && account && !report.credential.prefixedBearer) {
  report.probes.userToken = await probe('/user/tokens/verify');
  if (!report.probes.userToken.success) report.probes.accountToken = await probe(`/accounts/${account}/tokens/verify`);
  report.probes.pagesProject = await probe(`/accounts/${account}/pages/projects/admira-studio`);
  report.probes.aiCatalog = await probe(`/accounts/${account}/ai/models/search?per_page=1`);
}
report.conclusion = !token || !account ? 'missing-credential'
  : report.credential.prefixedBearer ? 'invalid-token-format'
  : report.probes.pagesProject?.success && report.probes.aiCatalog?.success ? 'pages-and-ai-read-access'
  : report.probes.pagesProject?.success ? 'pages-access-ai-not-authorized'
  : report.probes.userToken?.tokenStatus === 'active' || report.probes.accountToken?.tokenStatus === 'active'
    ? 'active-token-project-or-account-not-authorized' : 'credential-not-validated';
await mkdir('/tmp/importer-subtitles-real', {recursive: true});
await writeFile('/tmp/importer-subtitles-real/auth-audit.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
