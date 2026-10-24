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
