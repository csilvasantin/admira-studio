// Pruebas del esquema de lanzamiento: el JSON de la v2 valida, las palabras prohibidas paran,
// y el plan de escenas sale de la voz real.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validarLanzamiento, LanzamientoSchema } from '../src/props.ts';
import { planificar } from '../src/guion.ts';

const v2 = JSON.parse(fs.readFileSync(new URL('../props/un-prompt-una-tienda.json', import.meta.url), 'utf8'));

test('el props.json de la v2 valida y no nombra nada prohibido', () => {
  const l = validarLanzamiento(v2);
  assert.equal(l.escenas.length, 9);
  assert.equal(l.lineas.length, 7);
  assert.equal(l.marca.crea, 'admira.studio');
  assert.equal(l.marca.emite, 'admira.store');
});

test('una palabra prohibida en pantalla o en voz para la validación', () => {
  for (const campo of [
    (d) => { d.tutorial[0] = 'Abre Claude'; },
    (d) => { d.lineas[0].text = 'Lo monta Codex en un minuto.'; },
    (d) => { d.rotulos.curvas = 'Remotion Studio · curvas'; },
  ]) {
    const d = structuredClone(v2); campo(d);
    assert.throws(() => validarLanzamiento(d), /prohibida/);
  }
});

test('una escena con voz exige que la línea exista; sin voz exige segundos', () => {
  const a = structuredClone(v2); a.escenas[2].voz = 'v99';
  assert.throws(() => validarLanzamiento(a), /v99 no existe/);
  const b = structuredClone(v2); delete b.escenas[0].segundos;
  assert.throws(() => validarLanzamiento(b), /segundos/);
});

test('el plan de escenas sale de la duración real de cada línea más su respiro', () => {
  const l = validarLanzamiento(v2);
  const { escenas, total } = planificar(l);
  const fps = l.fps;
  assert.equal(escenas[0].frames, Math.round(4.5 * fps));
  const v1 = l.lineas.find((x) => x.id === 'v1');
  assert.equal(escenas[2].frames, Math.round((v1.durMs / 1000 + 0.6) * fps));
  const suma = escenas.reduce((s, e) => s + e.frames, 0);
  assert.equal(total, suma + fps);
  for (let i = 1; i < escenas.length; i++) assert.equal(escenas[i].desde, escenas[i - 1].desde + escenas[i - 1].frames);
});

test('el esquema rellena los valores por defecto', () => {
  const l = LanzamientoSchema.parse({ ...v2, voz: {}, musica: { fichero: 'musica/campanas.mp4' } });
  assert.equal(l.voz.volumen, 1.3);
  assert.equal(l.musica.volumen, 0.34);
});
