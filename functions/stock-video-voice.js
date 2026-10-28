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

export async function onRequestPost({request, env}) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return error(403, 'invalid-origin');
  const session = await sessionInfo(request, env);
  if (!session) return error(401, 'session-required');
  if (+request.headers.get('content-length') > 24000) return error(413, 'too-big');
  let body;
  try { body = await boundedBody(request); } catch (cause) { return error(cause.message === 'too-big' ? 413 : 400, cause.message === 'too-big' ? 'too-big' : 'bad-json'); }
  if (typeof body?.text !== 'string' || !body.text.trim() || body.text.length > 5000 || !['es','en'].includes(body.language)) return error(400, 'invalid-voice');
  const signed = await createApiToken(env, session.email);
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
