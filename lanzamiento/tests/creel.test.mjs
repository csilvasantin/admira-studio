// creel · piezas por personaje del Hotel Creel: datos, plan de escenas, ficha del Stock y cama musical, sin red.
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { planPersonaje, validarPersonaje, PROHIBIDAS } from '../src/creel/props.ts';
import { PROHIBIDAS as PROHIBIDAS_CASA } from '../src/props.ts';
import { sintetiza } from '../scripts/lib/creel-musica.mjs';
import { fichaDe } from '../scripts/lib/creel-ficha.mjs';

const datos = JSON.parse(fs.readFileSync(new URL('../scripts/creel/personajes.json', import.meta.url), 'utf8'));
const linea = (text) => ({ text, fichero: 'voz/creel/es/x.mp3', durMs: 2600, palabras: text.split(' ').map((t, i) => ({ text: t, startMs: i * 250, endMs: i * 250 + 240 })) });

test('13 personajes del reparto del Hotel Creel, con slug único, celda, zona, colores, efecto y línea', () => {
  assert.equal(datos.personajes.length, 13);
  assert.equal(new Set(datos.personajes.map((p) => p.slug)).size, 13);
  for (const p of datos.personajes) {
    const v = validarPersonaje({ ...p, linea: linea(p.linea) });
    assert.equal(v.id, p.id); assert.equal(v.idioma, 'es'); assert.equal(v.musica.fichero, 'musica/creel-bed.mp3');
    assert.ok(/^[A-Z]\d\d$/.test(p.celda), p.celda);
  }
  assert.deepEqual(datos.personajes.map((p) => p.efecto), ['lago', 'sendero', 'linterna', 'radio', 'ventanas', 'flash', 'faros', 'frecuencia', 'porche', 'grieta', 'pulso', 'portal', 'cierre']);
});

test('el plan de escenas sale de la voz real: intro · ficha · línea (voz + 1,6 s) · cierre, y el póster es de la ficha', () => {
  const p = validarPersonaje({ ...datos.personajes[0], linea: { ...linea('a b'), durMs: 2000 } });
  const plan = planPersonaje(p);
  assert.equal(plan.intro, 78); assert.equal(plan.ficha, 84); assert.equal(plan.linea, 60 + 48); assert.equal(plan.cierre, 78);
  assert.equal(plan.total, 78 + 84 + 108 + 78);
  assert.deepEqual(plan.desde, { intro: 0, ficha: 78, linea: 162, cierre: 270 });
  assert.ok(plan.poster > plan.desde.ficha && plan.poster < plan.desde.linea);
});

test('para si hay una palabra prohibida en pantalla o en voz, con la misma lista que la casa', () => {
  assert.equal(String(PROHIBIDAS), String(PROHIBIDAS_CASA));
  assert.throws(() => validarPersonaje({ ...datos.personajes[0], linea: linea('Lo hizo Codex.') }), /prohibida/);
  assert.throws(() => validarPersonaje({ ...datos.personajes[0], zona: 'Sala Claude', linea: linea('a') }), /prohibida/);
});

test('la ficha del Stock lleva la etiqueta personaje:<slug> que lee la pared, idioma y versión, y no más de 10 etiquetas', () => {
  const f = fichaDe(datos.personajes[11], { idioma: 'es', version: 'v1' });
  assert.equal(f.titulo, 'Hotel Creel · Vecna · Estación de la torre · ES · 16:9 · v1');
  assert.ok(f.tags.includes('personaje:vecna') && f.tags.includes('hotel-creel') && f.tags.includes('creel-personaje') && f.tags.includes('horizontal') && f.tags.includes('content-language:es'));
  assert.ok(f.tags.length <= 10);
  assert.match(f.comment, /Admirito/); assert.doesNotMatch(f.titulo + f.comment, PROHIBIDAS);
});

test('la cama musical se sintetiza en casa: WAV mono de 48 kHz, 16 s, con señal y sin saturar', () => {
  const wav = sintetiza({ segundos: 2 });
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF'); assert.equal(wav.readUInt32LE(24), 48000); assert.equal(wav.readUInt16LE(22), 1);
  assert.equal(wav.length, 44 + 2 * 48000 * 2);
  let max = 0; for (let i = 44; i < wav.length; i += 2) max = Math.max(max, Math.abs(wav.readInt16LE(i)));
  assert.ok(max > 20000 && max <= 32767, String(max));
});
