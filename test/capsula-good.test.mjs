import test from 'node:test';
import assert from 'node:assert/strict';
import {parseKnowledgeDemo} from '../assets/capsula-good.mjs';
test('accepts ES/EN capsule commands and language overrides',()=>{
  assert.deepEqual(parseKnowledgeDemo('capsula conocimiento good'),{action:'play',lang:'es'});
  assert.deepEqual(parseKnowledgeDemo('cápsula conocimiento good en'),{action:'play',lang:'en'});
  assert.deepEqual(parseKnowledgeDemo('capsule knowledge good','en'),{action:'play',lang:'en'});
  assert.deepEqual(parseKnowledgeDemo('capsula cerrar'),{action:'close',lang:'es'});
});
test('unsupported qualities or commands cannot silently play GOOD',()=>{
  assert.equal(parseKnowledgeDemo('capsula conocimiento best').action,'help');
  assert.equal(parseKnowledgeDemo('taza'),null);
});

// —— Cápsula musical GOOD (encargo 5710) ——
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {runKnowledgeDemo} from '../assets/capsula-good.mjs';
const root = new URL('../', import.meta.url);
const bank = JSON.parse(await readFile(new URL('capsulas/capsulas-good.json', root), 'utf8'));
const musical = bank.capsulas.find(c => c.tipo === 'musical');
const knowledge = bank.capsulas.find(c => c.tipo === 'conocimiento');

test('accepts the musical capsule command in ES and EN', () => {
  assert.deepEqual(parseKnowledgeDemo('capsula musical good'), {action:'play', lang:'es', tipo:'musical'});
  assert.deepEqual(parseKnowledgeDemo('cápsula musical good en'), {action:'play', lang:'en', tipo:'musical'});
  assert.deepEqual(parseKnowledgeDemo('capsule musical good', 'en'), {action:'play', lang:'en', tipo:'musical'});
  assert.deepEqual(parseKnowledgeDemo('capsule music good es', 'en'), {action:'play', lang:'es', tipo:'musical'});
  assert.equal(parseKnowledgeDemo('capsula musical cerrar').action, 'close');
  assert.equal(parseKnowledgeDemo('capsule musical close', 'en').action, 'close');
  assert.equal(parseKnowledgeDemo('capsula musical ayuda').action, 'help');
  assert.equal(parseKnowledgeDemo('capsule musical help', 'en').action, 'help');
  assert.equal(parseKnowledgeDemo('capsula musical best').action, 'help');
});

test('knowledge capsule command and registry entry are unchanged', () => {
  assert.deepEqual(parseKnowledgeDemo('capsula conocimiento good'), {action:'play', lang:'es'});
  assert.deepEqual(parseKnowledgeDemo('capsule knowledge good en'), {action:'play', lang:'en'});
  assert.equal(bank.schema_version, 1);
  assert.equal(bank.seed, 5664);
  assert.equal(bank.cost_eur, 0);
  assert.equal(bank.capsulas[0], knowledge);
  assert.equal(knowledge.id, 'conocimiento-internet-web-good');
  assert.equal(knowledge.seed, 5664);
  assert.equal(knowledge.videos.es.src, '/capsulas/conocimiento-good-es.mp4');
  assert.equal(knowledge.videos.en.src, '/capsulas/conocimiento-good-en.mp4');
});

test('musical capsule registry: €0, seed 5710, Nemotron, sources and 30 s 720×1280 videos', () => {
  assert.match(musical.id, /^musical-[a-z0-9-]+-good$/);
  assert.equal(musical.calidad, 'good');
  assert.equal(musical.cost_eur, 0);
  assert.equal(musical.seed, 5710);
  assert.equal(musical.model, 'nvidia/nemotron-3-ultra-550b-a55b');
  assert.ok(musical.usage.total_tokens > 0);
  assert.equal(musical.usage.prompt_tokens + musical.usage.completion_tokens, musical.usage.total_tokens);
  assert.match(musical.guion.es, /^¿Sabías que/);
  assert.match(musical.guion.en, /^Did you know/);
  assert.deepEqual(musical.voices, {es:'Mónica', en:'Daniel'});
  assert.ok(musical.sources.length >= 2 && musical.sources.every(u => /^https:\/\/(science\.nasa\.gov|www\.jpl\.nasa\.gov)\//.test(u)));
  assert.equal(musical.fondo.seed, 5710);
  assert.equal(musical.fondo.steps, 4);
  assert.equal(musical.fondo.base_model, 'FLUX.1-schnell');
  assert.equal(musical.fondo.cost_eur, 0);
  for (const lang of ['es', 'en']) {
    const v = musical.videos[lang];
    assert.deepEqual([v.src, v.duration_s, v.width, v.height, v.cost_eur], [`/capsulas/musical-good-${lang}.mp4`, 30, 720, 1280, 0]);
  }
});

test('musical capsule files exist and the MP4s really are H.264/AAC 720×1280, 25 fps, 30 s', async t => {
  for (const src of [musical.poster, musical.fondo.src]) assert.ok((await readFile(new URL('.' + src, root))).length > 1000);
  let probe;
  try { execFileSync('ffprobe', ['-version'], {stdio:'ignore'}); probe = true; } catch { probe = false; }
  for (const lang of ['es', 'en']) {
    const file = new URL('.' + musical.videos[lang].src, root);
    const bytes = await readFile(file);
    assert.equal(bytes.subarray(4, 8).toString('latin1'), 'ftyp');
    if (!probe) { t.diagnostic('ffprobe no disponible: solo se comprueba la cabecera MP4'); continue; }
    const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file.pathname], {encoding:'utf8'}));
    const video = info.streams.find(s => s.codec_type === 'video');
    const audio = info.streams.find(s => s.codec_type === 'audio');
    assert.deepEqual([video.codec_name, video.width, video.height, video.r_frame_rate], ['h264', 720, 1280, '25/1']);
    assert.equal(audio.codec_name, 'aac');
    assert.equal(Number(info.format.duration), 30);
  }
});

function fakeDoc() {
  const made = [];
  const el = tag => ({tag, style:{}, attrs:{}, children:[], setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute() {}, append(...c) { this.children.push(...c); }, addEventListener() {}, show() { this.open = true; }, close() { this.open = false; }, remove() {}, play: async () => {}, pause() {}, load() {}});
  return {made, body: el('body'), createElement(tag) { const e = el(tag); made.push(e); return e; }, addEventListener() {}, removeEventListener() {}};
}
const fetcher = async () => ({ok:true, json: async () => bank});

test('/demo capsula musical good plays the musical video in ES and EN; knowledge still plays its own', async () => {
  for (const [arg, lang, src, voice] of [
    ['capsula musical good', 'es', '/capsulas/musical-good-es.mp4', 'Mónica'],
    ['capsule musical good en', 'es', '/capsulas/musical-good-en.mp4', 'Daniel'],
    ['capsule musical good', 'en', '/capsulas/musical-good-en.mp4', 'Daniel'],
    ['capsula conocimiento good', 'es', '/capsulas/conocimiento-good-es.mp4', 'Mónica'],
    ['capsule knowledge good en', 'es', '/capsulas/conocimiento-good-en.mp4', 'Daniel'],
  ]) {
    const doc = fakeDoc();
    const message = await runKnowledgeDemo(arg, lang, {doc, fetcher});
    const video = doc.made.find(e => e.tag === 'video');
    assert.equal(video.src, src, arg);
    assert.ok(message.includes(voice), arg);
    assert.equal(video.poster, src.includes('musical') ? '/capsulas/musical-good-poster.png' : '/capsulas/conocimiento-good-poster.png');
    assert.equal(doc.made.find(e => e.tag === 'a').download, (src.includes('musical') ? 'capsula-musical-good-' : 'capsula-conocimiento-good-') + src.slice(-6, -4) + '.mp4');
    assert.equal(await runKnowledgeDemo('capsula cerrar', lang, {doc, fetcher}), src.endsWith('en.mp4') && lang === 'en' ? 'Capsule closed.' : 'Cápsula cerrada.');
  }
  assert.match(await runKnowledgeDemo('capsula ayuda', 'es', {doc: fakeDoc(), fetcher}), /capsula conocimiento good.*capsula musical good/);
  assert.match(await runKnowledgeDemo('capsule help', 'en', {doc: fakeDoc(), fetcher}), /capsula musical good/);
});

test('help, docs, MCP catalogue and capsule page mention the musical capsule', async () => {
  const read = p => readFile(new URL(p, root), 'utf8');
  assert.match(await read('assets/expert-cli.js'), /\/demo capsula musical good \[es\|en\]/);
  assert.match(await read('assets/expert-cli.js'), /\/demo capsula conocimiento good \[es\|en\] — vídeo vertical de 30 s/);
  assert.match(await read('docs/expert-cli.md'), /capsula-musical-good\.md/);
  assert.match(await read('docs/capsula-musical-good.md'), /\/demo capsule musical good/);
  const mcp = JSON.parse(await read('mcp/capsula-good.json'));
  assert.equal(mcp.command, '/demo capsula conocimiento good [es|en]');
  assert.deepEqual(mcp.capsulas.map(c => c.tipo), ['conocimiento', 'musical']);
  assert.ok(mcp.capsulas.every(c => c.cost_eur === 0));
  const page = await read('capsulas/index.html');
  assert.match(page, /tipo/);
  assert.match(page, /musical-good-es\.mp4/);
  assert.match(page, /conocimiento-good-es\.mp4/);
});
