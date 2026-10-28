import test from 'node:test';
import assert from 'node:assert/strict';
import {directionOf, qualifiesTranslation, subtitledTags, alreadySubtitled, parseSrt, toSrt, maybeSubtitle} from '../assets/capsula-traduce.mjs';

test('#traduce EN→ES y #translate ES→EN, sin mayúsculas ni tildes', () => {
  assert.deepEqual(directionOf(['#Traduce']), {from: 'en', to: 'es'});
  assert.deepEqual(directionOf(['TRANSLATE']), {from: 'es', to: 'en'});
  assert.deepEqual(directionOf(['traducción']), {from: 'en', to: 'es'});
  assert.equal(directionOf(['capsula']), null);
});
test('solo vídeo y nunca una ya subtitulada (sin bucle)', () => {
  assert.ok(qualifiesTranslation({type: 'video', tags: ['traduce']}));
  assert.ok(!qualifiesTranslation({type: 'image', tags: ['traduce']}));
  assert.ok(!qualifiesTranslation({type: 'video', tags: ['traduce', 'subtitulado-es']}));
});
test('etiquetas: conserva cápsula/pilar/traduce, añade subtitulado y par, tope 12', () => {
  const t = subtitledTags(['capsula', 'tecnologia', 'traduce', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'], {from: 'en', to: 'es'}, 'abc');
  assert.equal(t.length, 12);
  assert.deepEqual(t.slice(0, 5), ['capsula', 'tecnologia', 'traduce', 'subtitulado-es', 'par-abc']);
});
test('detecta subtitulada existente', () => {
  const it = {id: 'o1', type: 'video', tags: ['traduce']};
  assert.ok(alreadySubtitled(it, [it, {id: 's1', tags: ['subtitulado-es', 'par-o1']}]));
  assert.ok(!alreadySubtitled(it, [it, {id: 's2', tags: ['subtitulado-es', 'formato-alterno', 'par-o1']}]));
});
test('SRT ida y vuelta', async () => {
  const srt = '1\n00:00:00,320 --> 00:00:02,600\nNunca en mi vida,\n\n2\n00:00:02,840 --> 00:00:07,990\nhola\n';
  const c = parseSrt(srt);
  assert.equal(c.length, 2); assert.equal(c[0].start, 0.32);
  assert.equal(toSrt(c), srt);
  assert.deepEqual((await maybeSubtitle({id: 'x', type: 'video', tags: ['translate']})), {skipped: 'sin-url'});
});
import {tagsOf, langOf, pendingInfo} from '../assets/capsula-traduce.mjs';
test('alias de importación: #traducir/#traducción/#traducir-es → ES; #translate-en → EN', () => {
  for (const t of ['#traducir', 'Traducción', 'traducir-es', 'TRADUCE']) assert.deepEqual(directionOf([t]), {from: 'en', to: 'es'}, t);
  for (const t of ['#translate', 'translation', 'translate-en']) assert.deepEqual(directionOf([t]), {from: 'es', to: 'en'}, t);
});
test('hashtags escritos en Comentarios al importar cuentan', () => {
  const it = {id: 'u1', type: 'video', tags: null, comment: 'cápsula de negocio #traducir'};
  assert.ok(tagsOf(it).includes('#traducir'));
  assert.ok(qualifiesTranslation(it));
});
test('el idioma real manda si se conoce', () => {
  assert.deepEqual(directionOf(['traducir'], 'es'), {from: 'es', to: 'en'});
  assert.deepEqual(directionOf(['translate'], 'en'), {from: 'en', to: 'es'});
  assert.equal(langOf({lang: 'es-ES'}), 'es');
});
test('insignia pendiente y desaparece cuando existe la subtitulada', () => {
  const it = {id: 'o9', type: 'video', tags: ['capsula', 'traducir']};
  assert.match(pendingInfo(it, [it]).label, /ES pendientes/);
  assert.equal(pendingInfo(it, [it, {id: 's9', tags: ['subtitulado-es', 'par-o9']}]), null);
});

test('destino explícito ES detecta el idioma y nunca cambia a inglés', () => {
  assert.deepEqual(directionOf(['capsula', 'subtitulos-es']), {from: 'auto', to: 'es'});
  assert.deepEqual(directionOf(['translate', 'subtitulos-es'], 'es'), {from: 'es', to: 'es'});
  assert.deepEqual(directionOf(['subtitulos-es'], 'en'), {from: 'en', to: 'es'});
  const it = {id: 'original', type: 'video', tags: ['capsula', 'subtitulos-es']};
  assert.equal(alreadySubtitled(it, [{id: 'english', tags: ['subtitulado-en', 'par-original']}]), false);
  assert.equal(alreadySubtitled(it, [{id: 'spanish', tags: ['subtitulado-es'], externalRef: 'original'}]), true);
});

test('las marcas de resultado y del original sobreviven al límite de etiquetas', () => {
  const tags = subtitledTags(Array(12).fill('traduce'), {to: 'es'}, 'original');
  assert.equal(tags.length, 12); assert.ok(tags.includes('subtitulado-es')); assert.ok(tags.includes('par-original'));
});

const original = () => ({id: 'capsule-fixture', url: 'https://media.example/capsule.mp4', type: 'video', title: 'Capsule', tags: ['capsula', 'subtitulos-es', 'cliente']});
function subtitleHarness(response = {ok: true, from: 'en', to: 'es', cues: [{start: 0, end: 1, text: 'Hola, mundo.'}]}) {
  const calls = {encodes: [], requests: [], published: []};
  const ctx = {
    items: [], videoMeta: async () => ({w: 640, h: 360, d: 2}),
    engine: {async encode(url, job, status, result) {
      calls.encodes.push({url, job});
      if (job.extraFiles) calls.srt = await (await fetch(job.extraFiles[0].url)).text();
      result({}, new Blob([job.outputs ? 'audio-fixture' : 'video-fixture']));
    }},
    fetch: async (url, init) => {calls.requests.push({url, body: JSON.parse(init.body)}); return Response.json(response, {status: response.ok ? 200 : 502});},
    publish: async (blob, meta, extra) => {calls.published.push({blob, meta, extra}); return {ok: true, id: 'spanish-version'};},
  };
  return {ctx, calls};
}

test('pipeline: audio → transcripción ES → subtítulos visibles → nueva versión enlazada, original intacto', async () => {
  const it = original(), before = structuredClone(it), {ctx, calls} = subtitleHarness();
  const result = await maybeSubtitle(it, ctx);
  assert.deepEqual(result, {ok: true, id: 'spanish-version', cues: 1});
  assert.deepEqual(it, before);
  assert.equal(calls.requests[0].url, '/stock-subtitles');
  assert.equal(calls.requests[0].body.to, 'es'); assert.equal(calls.requests[0].body.from, undefined);
  assert.equal(atob(calls.requests[0].body.audio), 'audio-fixture');
  assert.match(calls.srt, /Dialogue: 0,0:00:00.00,0:00:01.00,Default,,0,0,0,,Hola, mundo\./);
  const args = calls.encodes[1].job.args;
  assert.equal(args[args.indexOf('-c:a') + 1], 'copy');
  assert.equal(args[args.indexOf('-crf') + 1], '18');
  for (const option of ['-an', '-b:a', '-ar', '-ac', '-r', '-s']) assert.ok(!args.includes(option));
  const p = calls.published[0];
  assert.equal(p.meta.type, 'video'); assert.equal(p.extra.externalRef, it.id);
  assert.ok(p.extra.tags.includes('subtitulado-es')); assert.ok(p.extra.tags.includes('cliente'));
  assert.deepEqual(await maybeSubtitle({...it, id: 'spanish-version', tags: p.extra.tags}, ctx), {skipped: 'no-aplica'});
});

test('pipeline no publica si falla traducción, no hay voz o tiempos/idioma son incorrectos', async () => {
  for (const response of [
    {ok: false, error: 'translation-incomplete'},
    {ok: true, to: 'es', cues: []},
    {ok: true, to: 'en', cues: [{start: 0, end: 1, text: 'Hi'}]},
    {ok: true, to: 'es', cues: [{start: 0, end: 8, text: 'Hola'}]},
  ]) {
    const {ctx, calls} = subtitleHarness(response), result = await maybeSubtitle(original(), ctx);
    assert.ok(!result.ok); assert.equal(calls.published.length, 0); assert.equal(calls.encodes.length, 1);
  }
});

test('pipeline limita la duración completa y evita trabajos simultáneos duplicados', async () => {
  const {ctx, calls} = subtitleHarness();
  ctx.videoMeta = async () => ({w: 640, h: 360, d: 180.2});
  assert.deepEqual(await maybeSubtitle(original(), ctx), {skipped: 'largo'}); assert.equal(calls.encodes.length, 0);
  ctx.videoMeta = async () => ({w: 640, h: 360, d: 2});
  const results = await Promise.all([maybeSubtitle(original(), ctx), maybeSubtitle(original(), ctx)]);
  assert.equal(results.filter(r => r.ok).length, 1); assert.equal(results[1].skipped, 'en-curso');
});

test('metadatos: usa el sondeo del motor sin crear un reproductor de Chrome', async () => {
  const {ctx, calls} = subtitleHarness(); delete ctx.videoMeta;
  ctx.engine.probe = async url => {calls.probed = url; return {w: 640, h: 360, d: 2};};
  const result = await maybeSubtitle(original(), ctx);
  assert.equal(result.ok, true); assert.equal(calls.probed, original().url); assert.equal(calls.published.length, 1);
});

test('un sondeo fallido no llama a la IA ni publica', async () => {
  const {ctx, calls} = subtitleHarness(); delete ctx.videoMeta;
  ctx.engine.probe = async () => {throw new Error('media-metadata');};
  assert.deepEqual(await maybeSubtitle(original(), ctx), {ok: false, error: 'media-metadata'});
  assert.equal(calls.encodes.length, 0); assert.equal(calls.requests.length, 0); assert.equal(calls.published.length, 0);
});

test('un fallo deja de mostrarse en curso antes de repintar la insignia', async () => {
  const it = original(), {ctx} = subtitleHarness({ok: false, error: 'whisper'});
  let settled;
  ctx.onSettled = () => {settled = pendingInfo(it, []).running;};
  const result = await maybeSubtitle(it, ctx);
  assert.equal(result.ok, false); assert.equal(settled, false);
});

test('publicación confirmada actualiza la galería antes de repintar, sin esperar al índice', async () => {
  const it = original(), {ctx, calls} = subtitleHarness();
  ctx.onCreated = async (id, item) => {
    await Promise.resolve();
    assert.equal(item.id, id); assert.equal(item.externalRef, it.id);
    assert.deepEqual(item.validacion, {ok: true, ancho: 640, alto: 360, duracion: 2});
    ctx.items.push(item);
  };
  ctx.onSettled = () => {assert.equal(pendingInfo(it, ctx.items), null);};
  assert.equal((await maybeSubtitle(it, ctx)).ok, true);
  assert.deepEqual(await maybeSubtitle(it, ctx), {skipped: 'ya-existe'});
  assert.equal(calls.published.length, 1);
});
