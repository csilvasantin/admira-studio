// Same-origin voice relay for Stock gestures, including authenticated previews.
// The API bearer token stays on the server; callers choose only text and ES/EN.
import {sessionInfo, createApiToken} from './_auth.js';
import {stockBase, cabeceras, error} from './_stock-proxy.js';
import {VOICES} from '../assets/creativo-core.mjs';

async function boundedBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw Error('bad-json');
  const chunks = []; let length = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > 24000) throw Error('too-big');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

// Preview signing keys intentionally differ from production. Only an already
// verified agent session may exchange the configured agent credential at the
// fixed production login and token endpoints; no client credential is relayed.
async function voiceToken(request, env, session) {
  if (!session.agent || !new URL(request.url).hostname.endsWith('.admira-studio.pages.dev')) return createApiToken(env,session.email);
  // The API officially accepts a fleet credential for silicon agents. Its
  // preview-only binding is never used for customers or production requests.
  if (env.STOCK_AGENT_VOICE_KEY) return {token:env.STOCK_AGENT_VOICE_KEY};
  if (!env.ADMIRA_AGENT_LOGIN_TOKEN) throw Error('voice-preview-auth-unavailable');
  const login = await fetch('https://admira.studio/auth/agente', {method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),
    headers:cabeceras({Origin:'https://admira.studio', Referer:'https://admira.studio/', Authorization:'Bearer '+env.ADMIRA_AGENT_LOGIN_TOKEN,'X-Agente':'StockVideoPreview'})});
  const cookie = /(?:^|,\s*)(__Host-pixeria_session=[^;,\s]+)/.exec(login.headers.get('Set-Cookie') || '')?.[1];
  if (!login.ok || !cookie) {console.warn(JSON.stringify({message:'voice-preview-auth-unavailable',stage:'login',status:login.status,hasCookie:!!cookie}));throw Error('voice-preview-auth-unavailable');}
  const response = await fetch('https://admira.studio/auth/api-token', {redirect:'error',signal:AbortSignal.timeout(10000),
    headers:cabeceras({Origin:'https://admira.studio', Referer:'https://admira.studio/', Cookie:cookie,Accept:'application/json'})});
  const signed = await response.json().catch(() => ({}));
  if (!response.ok || !signed.ok || typeof signed.token !== 'string' || signed.token.length > 4096) {console.warn(JSON.stringify({message:'voice-preview-auth-unavailable',stage:'api-token',status:response.status}));throw Error('voice-preview-auth-unavailable');}
  return {token:signed.token};
}

export async function onRequestPost({request, env}) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return error(403, 'invalid-origin');
  const session = await sessionInfo(request, env);
  if (!session) return error(401, 'session-required');
  if (+request.headers.get('content-length') > 24000) return error(413, 'too-big');
  let body;
  try { body = await boundedBody(request); } catch (cause) { return error(cause.message === 'too-big' ? 413 : 400, cause.message === 'too-big' ? 'too-big' : 'bad-json'); }
  if (typeof body?.text !== 'string' || !body.text.trim() || body.text.length > 5000 || !['es','en'].includes(body.language)) return error(400, 'invalid-voice');
  let signed;
  try { signed = await voiceToken(request, env, session); } catch (cause) {
    console.warn(JSON.stringify({message:'voice-preview-auth-unavailable',stage:'exchange',name:String(cause?.name || 'Error').slice(0,40),code1042:/\b1042\b/.test(String(cause?.message || ''))}));
    return error(503, 'voice-preview-auth-unavailable');
  }
  let upstream;
  try {
    upstream = await fetch(stockBase(env) + '/tts', {method:'POST', signal:AbortSignal.timeout(60000),
      headers:cabeceras({'Content-Type':'application/json', Authorization:'Bearer ' + signed.token}),
      body:JSON.stringify({text:body.text.trim(), language_code:body.language,
        voice_id:VOICES[body.language === 'es' ? 'ESP' : 'ENG'].chica,
        model_id:'eleven_multilingual_v2', output_format:'mp3_44100_128', voice_settings:{stability:.5, similarity_boost:.75}})});
  } catch { return error(502, 'voice-unreachable'); }
  if (!upstream.ok) return error(upstream.status, 'voice-provider-' + upstream.status);
  if (!upstream.headers.get('Content-Type')?.startsWith('audio/')) return error(502, 'voice-invalid-audio');
  return new Response(upstream.body, {headers:{'Content-Type':upstream.headers.get('Content-Type'), 'Cache-Control':'no-store'}});
}
