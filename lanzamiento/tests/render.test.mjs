import test from 'node:test';
import assert from 'node:assert/strict';
import { comprobarMedidas, silenciosDe } from '../scripts/lib/render.mjs';

const bien = { duracionSeg: 52.4, esperadaSeg: 52.37, ancho: 1920, alto: 1080, anchoEsperado: 1920, altoEsperado: 1080, mediaDb: -27.5, silencios: [], pistas: ['video', 'audio'] };

test('un render correcto pasa', () => assert.deepEqual(comprobarMedidas(bien), { ok: true, problemas: [] }));

test('para por duración, tamaño, pistas, audio bajo o silencio largo en medio', () => {
  assert.match(comprobarMedidas({ ...bien, duracionSeg: 40 }).problemas[0], /se esperaban/);
  assert.match(comprobarMedidas({ ...bien, alto: 1088 }).problemas[0], /tamaño/);
  assert.match(comprobarMedidas({ ...bien, pistas: ['video'] }).problemas[0], /sin pista de audio/);
  assert.match(comprobarMedidas({ ...bien, mediaDb: -35 }).problemas[0], /audio bajo/);
  assert.match(comprobarMedidas({ ...bien, silencios: [{ inicio: 10, fin: 14 }] }).problemas[0], /silencio de 4.0 s/);
  assert.equal(comprobarMedidas({ ...bien, silencios: [{ inicio: 51.2, fin: 52.4 }] }).ok, true, 'el silencio final de cola no cuenta');
});

test('lee los tramos de silencio de ffmpeg', () => {
  const s = silenciosDe('[silencedetect] silence_start: 10.5\n[silencedetect] silence_end: 13.2 | silence_duration: 2.7\n');
  assert.deepEqual(s, [{ inicio: 10.5, fin: 13.2 }]);
});
