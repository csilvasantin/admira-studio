import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {textos, videoItems, sourceURL, voiceRequest, recorderMime, publishMeta, VOZ_TAG, STOREOS_TAG} from '../assets/vozcontenido.mjs';

test('nombre ES/EN', () => { assert.equal(textos('es').name, 'VozContenido'); assert.equal(textos('en').name, 'Voice Content'); });
test('solo vídeos y búsqueda por título o etiqueta', () => {
  const items = [{id:'a',url:'u',type:'video',title:'Hawkins'},{id:'b',url:'u',type:'image'},{id:'c',url:'u',mime:'video/mp4',tags:['benny']},{id:'d',type:'video'}];
  assert.deepEqual(videoItems(items).map(i => i.id), ['a','c']);
  assert.deepEqual(videoItems(items, 'BENNY').map(i => i.id), ['c']);
});
test('fuente CORS segura del Stock', () => {
  assert.equal(sourceURL({id:'abc-1',url:'x'}), 'https://api.admira.store/stock/asset/abc-1');
  assert.equal(sourceURL({id:'../x',url:'x'}), 'x');
});
test('petición de voz validada', () => {
  assert.deepEqual(voiceRequest('  hola ', 'fr'), {text:'hola', language:'es'});
  assert.throws(() => voiceRequest(' ', 'es'), /text-required/);
  assert.throws(() => voiceRequest('x'.repeat(5001), 'en'), /text-too-long/);
});
test('prefiere MP4 y cae a WebM', () => {
  assert.match(recorderMime(() => true), /^video\/mp4/);
  assert.equal(recorderMime(m => m === 'video/webm'), 'video/webm');
});
test('salida etiquetada para storeos.com', () => {
  const {meta, extra} = publishMeta({id:'v1',title:'Casa Creel'}, {lang:'en', text:'Welcome', width:720, height:1280, duration:8, mime:'video/mp4;codecs=x'});
  assert.equal(meta.originId, 'v1'); assert.equal(meta.type, 'video');
  assert.deepEqual(extra.tags, [VOZ_TAG, STOREOS_TAG, 'voz-en', 'par-v1']);
  assert.equal(extra.mime, 'video/mp4'); assert.match(extra.comment, /Welcome/);
});
test('botón junto a «Nueva campaña» y enlace en el menú del Stock', () => {
  const s = readFileSync(new URL('../adaptaciones/campaign-studio.mjs', import.meta.url), 'utf8');
  assert.match(s, /id="campaign-voz" href="\/vozcontenido\//);
  assert.match(readFileSync(new URL('../stock.html', import.meta.url), 'utf8'), /href="\/vozcontenido\/" data-nav="vozcontenido">VozContenido</);
  assert.match(readFileSync(new URL('../en/stock.html', import.meta.url), 'utf8'), />Voice Content</);
  assert.match(readFileSync(new URL('../vozcontenido/index.html', import.meta.url), 'utf8'), /GATE-INICIO/);
});
