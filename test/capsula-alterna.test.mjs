import test from 'node:test';
import assert from 'node:assert/strict';
import {qualifies, pillarOf, targetFor, alternateTags, originalTagsWithPair, alreadyHasAlternate, pairTag, ALT_TAG, maybeGenerateAlternate} from '../assets/capsula-alterna.mjs';

test('etiquetas bilingües, sin mayúsculas ni tildes', () => {
  for (const tags of [['#Cápsula', '#Negocio'], ['capsule', 'business'], ['CAPSULA', 'creativida'], ['cápsula', 'Tecnología'], ['capsula', 'technology'], ['Capsule', 'Creativity']])
    assert.ok(qualifies({type: 'video', tags}), tags.join(','));
  assert.equal(pillarOf(['#Tecnología']), 'technology');
});
test('hacen falta las dos etiquetas y vídeo o imagen', () => {
  assert.ok(!qualifies({type: 'video', tags: ['capsula']}));
  assert.ok(!qualifies({type: 'video', tags: ['negocio']}));
  assert.ok(!qualifies({type: 'audio', tags: ['capsula', 'negocio']}));
  assert.ok(qualifies({type: 'image', tags: ['capsula', 'negocio']}));
});
test('la alterna no vuelve a disparar (anti-bucle)', () => {
  assert.ok(!qualifies({type: 'video', tags: ['capsula', 'negocio', ALT_TAG]}));
});
test('orientación contraria', () => {
  assert.deepEqual(targetFor(1920, 1080).format, '9:16');
  assert.deepEqual(targetFor(720, 1280).format, '16:9');
  assert.equal(targetFor(1000, 1000), null);
});
test('etiquetas de la alterna: mismas + par + orientación, tope 12 conservando cápsula y pilar', () => {
  const tags = ['vertical', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'portrait', 'capsula', 'negocio'];
  const out = alternateTags(tags, targetFor(720, 1280), '179-x');
  assert.ok(out.length <= 12);
  for (const t of ['capsula', 'negocio', ALT_TAG, pairTag('179-x'), 'horizontal']) assert.ok(out.includes(t), t);
  assert.ok(!out.includes('vertical') && !out.includes('portrait'));
  assert.equal(originalTagsWithPair(tags, '179-x'), null);
  assert.deepEqual(originalTagsWithPair(['capsula', 'negocio'], '179-x'), ['capsula', 'negocio', 'par-179-x']);
});
test('se salta si ya existe la alterna', async () => {
  const it = {id: '1-a', type: 'video', url: 'x', tags: ['capsula', 'negocio']};
  assert.ok(alreadyHasAlternate(it, [{id: '2-b', externalRef: '1-a', tags: [ALT_TAG]}]));
  assert.ok(!alreadyHasAlternate(it, [{id: '2-b', externalRef: '1-a', tags: ['adaptación']}]));
  assert.deepEqual(await maybeGenerateAlternate(it, {items: [{id: '2-b', externalRef: '1-a', tags: [ALT_TAG]}]}), {skipped: 'ya-existe'});
  assert.deepEqual(await maybeGenerateAlternate({...it, tags: [...it.tags, 'par-1-a']}, {items: []}), {skipped: 'ya-existe'});
});
