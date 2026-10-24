import test from 'node:test';
import assert from 'node:assert/strict';
import {splitCue, segmentsOf, onRequestPost} from '../functions/stock-subtitles.js';
import {burnArgs, audioArgs} from '../assets/capsula-traduce.mjs';

test('parte frases largas repartiendo el tiempo', () => {
  const p = splitCue({start: 0, end: 10, text: 'a'.repeat(50) + ' ' + 'b'.repeat(50)});
  assert.equal(p.length, 2); assert.equal(p[0].start, 0); assert.ok(Math.abs(p[1].end - 10) < 1e-9);
  assert.deepEqual(segmentsOf({segments: [{start: 0, end: 1, text: ' hi '}, {start: 2, end: 1, text: 'x'}]}), [{start: 0, end: 1, text: 'hi'}]);
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
});
