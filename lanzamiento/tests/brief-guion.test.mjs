// brief y guion sin red: índice de ejemplo → resolución de piezas → guion es/en válido.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { resolverCampana, orientacionDe, partesDelTitulo } from '../scripts/lib/stock.mjs';
import { guionDesdeBrief } from '../scripts/lib/plantilla.mjs';
import { validarGuion, PROHIBIDAS } from '../src/props.ts';

const indice = JSON.parse(fs.readFileSync(new URL('./datos/indice-ejemplo.json', import.meta.url), 'utf8'));
const C = 'starbucks-gdg51-seven-20261015';

test('orientación por medidas y lectura del título', () => {
  assert.equal(orientacionDe({ ancho: 4030, alto: 1130 }), 'panoramica');
  assert.equal(orientacionDe({ ancho: 1080, alto: 1920 }), 'vertical');
  assert.equal(orientacionDe({ ancho: 1920, alto: 1080 }), 'horizontal');
  assert.deepEqual(partesDelTitulo('Starbucks · Gran de Gràcia 51 · Siete mensajes · ES + EN · x'), { cliente: 'Starbucks', local: 'Gran de Gràcia 51', descripcion: 'Siete mensajes' });
});

test('la campaña de los siete mensajes se resuelve sola: 7 pantallas, 2 idiomas, conjunto panorámico', () => {
  const b = resolverCampana(indice, { campana: C });
  assert.equal(b.cliente, 'Starbucks');
  assert.equal(b.local, 'Gran de Gràcia 51');
  assert.equal(b.pantallas.length, 7);
  assert.deepEqual(b.idiomas, ['en', 'es']);
  assert.equal(b.piezas.conjunto.orientacion, 'panoramica');
  assert.equal(b.piezas.vertical.orientacion, 'vertical');
  assert.equal(b.piezas.conjunto.id, '1792152072921-uk9g2a', 'el previo conjunto entra aunque su etiqueta lleve el sufijo -travel');
  assert.equal(b.piezas.horizontal.orientacion, 'horizontal');
  assert.equal(b.instalacionPrincipal, 'starbucks-pg103');
  assert.ok(!b.pantallas.includes('landscape'), 'screen:landscape no es una pantalla');
  assert.deepEqual(b.avisos, []);
  assert.ok(b.todas.every((i) => i.tags.some((t) => t.startsWith(`campaign:${C}`))), 'no entra nada de otra campaña');
  assert.ok(b.piezas.posters.length <= 8 && b.piezas.posters.length >= 7);
  assert.ok(b.descargas.every((d) => d.url.startsWith('https://stock.admira.store/stock/')));
});

test('filtros por instalación, pantalla e idioma', () => {
  const b = resolverCampana(indice, { campana: C, idioma: 'en' });
  assert.equal(b.pantallas.length, 3);
  assert.deepEqual(b.idiomas, ['en']);
  const c = resolverCampana(indice, { campana: C, instalacion: 'starbucks-pg103' });
  assert.equal(c.pantallas.length, 7);
  assert.throws(() => resolverCampana(indice, { campana: 'no-existe' }), /sin piezas/);
});

test('el guion sale de la plantilla en español y en inglés, válido y sin palabras prohibidas', () => {
  const b = resolverCampana(indice, { campana: C });
  for (const idioma of ['es', 'en']) {
    const g = validarGuion(guionDesdeBrief(b, { idioma, fecha: '22 oct 2026' }));
    assert.equal(g.lineas.length, 7);
    assert.equal(g.escenas.length, 9);
    assert.match(g.prompt.texto, /Gran de Gràcia 51/);
    assert.match(g.prompt.texto, idioma === 'es' ? /Siete pantallas, español e inglés/ : /Seven screens, English and Spanish/);
    assert.match(g.lineas[4].text, idioma === 'es' ? /Siete pantallas, en español e inglés, en Gran de Gràcia 51/ : /Seven screens, in English and Spanish, at Gran de Gràcia 51/);
    assert.equal(g.rotulos.listo, idioma === 'es' ? 'admira.store · Siete mensajes · ES + EN' : 'admira.store · Siete mensajes · EN + ES');
    if (idioma === 'en') assert.ok(g.piezas.vertical.id.endsWith('-p5') || g.piezas.vertical.id.endsWith('-p6') || g.piezas.vertical.id.endsWith('-p7'), 'en inglés, la pieza vertical es una de las inglesas');
    const todo = JSON.stringify(g);
    assert.ok(!PROHIBIDAS.test(todo), 'nada prohibido en el guion');
  }
});
