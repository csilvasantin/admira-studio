// Ayudantes de voz y revisión, sin red ni render.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { palabrasDesdeAlineacion, rellenarGuion, duracionMs } from '../scripts/lib/voz.mjs';
import { comprobar, fotogramasClave } from '../scripts/lib/revision.mjs';
import { resolverCampana } from '../scripts/lib/stock.mjs';
import { guionDesdeBrief } from '../scripts/lib/plantilla.mjs';

const v2 = JSON.parse(fs.readFileSync(new URL('../props/un-prompt-una-tienda.json', import.meta.url), 'utf8'));
const indice = JSON.parse(fs.readFileSync(new URL('./datos/indice-ejemplo.json', import.meta.url), 'utf8'));

test('las palabras salen de la alineación por caracteres', () => {
  const chars = [...'Hola mundo'];
  const starts = chars.map((_, i) => i * 0.1), ends = chars.map((_, i) => i * 0.1 + 0.09);
  const p = palabrasDesdeAlineacion({ chars, starts, ends });
  assert.deepEqual(p.map((x) => x.text), ['Hola', 'mundo']);
  assert.equal(p[0].startMs, 0); assert.equal(p[0].endMs, 390);
  assert.equal(p[1].startMs, 500); assert.equal(duracionMs(p), 990);
});

test('rellenar el guion con la voz da un lanzamiento válido que pasa la comprobación', () => {
  const b = resolverCampana(indice, { campana: 'starbucks-gdg51-seven-20261015' });
  const g = guionDesdeBrief(b, { idioma: 'en', fecha: '22 Oct 2026' });
  const resultados = Object.fromEntries(g.lineas.map((l) => [l.id, { fichero: `voz/x/en/${l.id}.mp3`, palabras: l.text.split(' ').map((w, i) => ({ text: w, startMs: i * 300, endMs: i * 300 + 250 })) }]));
  const l = rellenarGuion(g, resultados);
  assert.equal(l.lineas.length, 7);
  assert.ok(l.lineas.every((x) => x.durMs > 0 && x.palabras.length > 0));
  const r = comprobar(l, { existe: () => true });
  assert.deepEqual(r.problemas, []);
  assert.equal(r.fotogramas.length, 9);
  assert.ok(r.duracionSeg > 20);
  assert.throws(() => rellenarGuion(g, { ...resultados, v3: undefined }), /v3: sin voz/);
});

test('la comprobación para por ficheros ausentes, palabras prohibidas o duración fuera de rango', () => {
  const r1 = comprobar(v2, { existe: (f) => !f.endsWith('campanas.mp4') });
  assert.ok(r1.problemas.some((p) => /musica\/campanas\.mp4/.test(p)));
  const malo = structuredClone(v2); malo.lineas[0].text = 'Lo hace Codex.';
  const r2 = comprobar(malo, { existe: () => true });
  assert.equal(r2.ok, false);
  const r3 = comprobar(v2, { existe: () => true, duracionMaxSeg: 30 });
  assert.ok(r3.problemas.some((p) => /más de 30/.test(p)));
});

test('un fotograma por escena, dentro de su tramo', () => {
  const f = fotogramasClave(v2);
  assert.equal(f.length, 9);
  for (let i = 1; i < f.length; i++) assert.ok(f[i].frame > f[i - 1].frame);
});
