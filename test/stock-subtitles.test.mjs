import test from 'node:test';
import assert from 'node:assert/strict';
import {splitCue, segmentsOf, onRequestPost} from '../functions/stock-subtitles.js';
import {burnArgs, audioArgs} from '../assets/capsula-traduce.mjs';
import {createHmac} from 'node:crypto';

test('parte frases largas repartiendo el tiempo', () => {
  const p = splitCue({start: 0, end: 10, text: 'a'.repeat(50) + ' ' + 'b'.repeat(50)});
  assert.equal(p.length, 2); assert.equal(p[0].start, 0); assert.ok(Math.abs(p[1].end - 10) < 1e-9);
  assert.deepEqual(segmentsOf({segments: [{start: 0, end: 1, text: ' hi '}, {start: 2, end: 1, text: 'x'}]}), [{start: 0, end: 1, text: 'hi'}]);
});
test('recupera un intervalo imposible solo de marcas por palabra completas, ordenadas y sin solapes',()=>{
  const words=[{word:'We',start:100,end:100.3},{word:'are',start:100.3,end:100.6},{word:'the',start:100.6,end:100.9},{word:'cows',start:100.9,end:101.3},{word:'of',start:101.3,end:101.5},{word:'the',start:101.5,end:101.8},{word:'future.',start:101.8,end:102.9}];
  const last={start:102.8,end:102.9,text:'We are the cows of the future.',words};
  const prev={start:97,end:99.8,text:'An earlier phrase.'};
  assert.deepEqual(segmentsOf({segments:[prev,last]}),[prev,{start:100,end:102.9,text:last.text,timingSource:'words'}]);
  for(const invalid of [words.slice(1),words.toReversed(),words.map(w=>({...w,start:w.start-2,end:w.end-2}))]){
    assert.deepEqual(segmentsOf({segments:[prev,{...last,words:invalid}]}).at(-1),{start:last.start,end:last.end,text:last.text});
  }
  assert.deepEqual(segmentsOf({segments:[{...prev,end:101},last]}).at(-1),{start:last.start,end:last.end,text:last.text});
  const repeated={start:100,end:102.9,text:last.text,words};
  assert.deepEqual(segmentsOf({segments:[{start:97,end:99.8,text:last.text},repeated]}).map(s=>s.text),[last.text,last.text]);
});
test('sin binding AI → 503; sin sesión → 401', async () => {
  const req = () => new Request('https://x.test/stock-subtitles', {method: 'POST', body: '{}'});
  assert.equal((await onRequestPost({request: req(), env: {}})).status, 503);
  const r = await onRequestPost({request: req(), env: {AI: {run() {}}, AUTH_DB: {prepare() { return {bind() { return {first: async () => null}; }}; }}}}).catch(() => ({status: 401}));
  assert.equal(r.status, 401);
});
test('argumentos de FFmpeg: audio mono 16k ≤180 s y quemado con fuente empaquetada', () => {
  assert.ok(audioArgs().includes('16000') && audioArgs().includes('180'));
  const a = burnArgs(1920, 1080).join(' ');
  assert.match(a, /subtitles=subs\.srt:fontsdir=fonts:force_style='FontName=DejaVu Sans,Bold=1.*BorderStyle=3/);
  assert.match(burnArgs(1080, 1920).join(' '), /MarginV=38/);
  assert.match(a, /-c:a copy/); assert.doesNotMatch(a, /-b:a|-ar|-ac\s|-r\s|-s\s/);
});

// Synthetic, local-only signed agent session: exercise the real authentication
// boundary without credentials, databases or outbound network requests.
const fixtureEnv = {PIXERIA_SIGNING_KEY: 'subtitle-test-signing-key', ADMIRA_AGENT_LOGIN_TOKEN: 'subtitle-fixture-token-never-used-outside-tests'};
function sessionCookie() {
  const sign = text => createHmac('sha256', fixtureEnv.PIXERIA_SIGNING_KEY).update(text).digest('base64url');
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({aud: 'admira.studio', email: 'agentes@silicio.admiranext.com', iat: now, exp: now + 600,
    agent: sign('agente:' + fixtureEnv.ADMIRA_AGENT_LOGIN_TOKEN).slice(0, 22)})).toString('base64url');
  return '__Host-pixeria_session=' + body + '.' + sign('px:' + body);
}
async function subtitleRequest(ai, body = {audio: 'YXVkaW8=', to: 'es'}, cookie = sessionCookie(), origin = 'https://www.admira.studio') {
  const request = new Request('https://www.admira.studio/stock-subtitles', {method: 'POST', headers: {Cookie: cookie, Origin: origin, 'Content-Type': 'application/json'}, body: JSON.stringify(body)});
  const response = await onRequestPost({request, env: {...fixtureEnv, AI: {run: ai}}});
  return {status: response.status, body: await response.json()};
}
const transcript = language => ({transcription_info: {language, duration: 2}, segments: [{start: 0, end: 1.8, text: language === 'es' ? 'Hola, mundo.' : 'Hello, world.'}]});

test('API: sesión real firmada; Whisper detecta origen y LLM devuelve SRT en castellano', async () => {
  const calls = [];
  const response = await subtitleRequest(async (model, input) => {
    calls.push({model, input});
    return model.includes('whisper') ? transcript('en') : {response: '1. Hola, mundo.'};
  });
  assert.equal(response.status, 200); assert.equal(response.body.from, 'en'); assert.equal(response.body.to, 'es');
  assert.equal(calls[0].input.language, undefined);
  assert.equal(calls[0].input.condition_on_previous_text,false);
  assert.equal(response.body.cues[0].text, 'Hola, mundo.');
  assert.match(response.body.srt, /00:00:00,000 --> 00:00:01,800/);
});

test('API: audio español se subtitula en español sin traducción ni inversión', async () => {
  let calls = 0;
  const response = await subtitleRequest(async model => {calls++; assert.match(model, /whisper/); return transcript('es');}, {audio: 'YXVkaW8=', from: 'es', to: 'es'});
  assert.equal(response.status, 200); assert.equal(response.body.cues[0].text, 'Hola, mundo.'); assert.equal(calls, 1);
});
test('API: traduce una frase con marcas por palabra válidas y conserva el intervalo recuperado',async()=>{
  const r=await subtitleRequest(async(model,input)=>model.includes('whisper')?{
    transcription_info:{language:'en',duration:103},segments:[{start:102.8,end:102.9,text:'We are the cows of the future.',words:[
      {word:'We',start:100,end:100.3},{word:'are',start:100.3,end:100.6},{word:'the',start:100.6,end:100.9},
      {word:'cows',start:100.9,end:101.3},{word:'of',start:101.3,end:101.5},{word:'the',start:101.5,end:101.8},{word:'future.',start:101.8,end:102.9}]}]
    }:{response:'1. Somos las vacas del futuro.'});
  assert.equal(r.status,200);assert.equal(r.body.recognition.wordTimingRepairs,1);
  assert.deepEqual(r.body.cues,[{start:100,end:102.9,text:'Somos las vacas del futuro.',source:'We are the cows of the future.'}]);
  assert.match(r.body.srt,/00:01:40,000 --> 00:01:42,900/);
});

test('API: un origen francés no se trata como inglés y la ausencia de idioma no se adivina', async () => {
  const calls = [];
  const response = await subtitleRequest(async (model, input) => {calls.push({model, input}); return model.includes('whisper') ? transcript('fr') : {response: '1. Hola, mundo.'};});
  assert.equal(response.status, 200); assert.equal(response.body.from, 'fr');
  assert.match(calls[1].input.messages[0].content, /from fr to Spanish/);
  const missing = await subtitleRequest(async () => transcript(null));
  assert.equal(missing.status, 502); assert.equal(missing.body.error, 'language-undetected');
});

test('API: fallback traduce frases faltantes; fallo total no devuelve texto original como traducción', async () => {
  const calls = [];
  const fallback = await subtitleRequest(async (model, input) => {
    calls.push({model, input});
    if (model.includes('whisper')) return transcript('en');
    return model.includes('m2m100') ? {translated_text: 'Hola, mundo.'} : {response: ''};
  });
  assert.equal(fallback.status, 200); assert.equal(fallback.body.cues[0].text, 'Hola, mundo.');
  assert.equal(calls[2].input.target_lang, 'es');
  const failed = await subtitleRequest(async model => {if (model.includes('whisper')) return transcript('en'); throw new Error('fixture failure');});
  assert.equal(failed.status, 502); assert.equal(failed.body.error, 'translation-incomplete');
  assert.equal(failed.body.srt, undefined);
});

test('API: origen ajeno, sin sesión, silencio y límites nunca anuncian una versión traducida', async () => {
  let calls = 0;
  const ai = async () => {calls++; return transcript('en');};
  assert.equal((await subtitleRequest(ai, undefined, '', 'https://www.admira.studio')).status, 401);
  assert.equal((await subtitleRequest(ai, undefined, sessionCookie(), 'https://evil.example')).status, 403);
  assert.equal(calls, 0);
  const silence = await subtitleRequest(async () => ({segments: []}));
  assert.equal(silence.status, 200); assert.deepEqual(silence.body.cues, []);
  const tooMany = await subtitleRequest(async () => ({...transcript('en'), segments: Array(201).fill({start: 0, end: 1, text: 'Hi'})}));
  assert.equal(tooMany.status, 413); assert.equal(tooMany.body.error, 'too-many-segments');
  const tooLong = await subtitleRequest(async () => ({...transcript('en'), transcription_info: {language: 'en', duration: 186}}));
  assert.equal(tooLong.status, 413);
});
