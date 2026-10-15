// ?formato=cliente-NN: los gemelos de admira.store abren el Adaptador con su formato
// (misión DCL-d7966deb02734a6f34beb54e · 15-oct-2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {formatosPedidos, proyectoPorFormatos, encenderSolo, enlacesEspacio, ALTADIS_18, PROYECTO_ALTADIS} from '../adaptaciones/formato-url.mjs';
import {projectFormats, initialProject, mergeProjects} from '../adaptaciones/proyectos-core.mjs';
import {createCatalog} from '../adaptaciones/format-catalog.mjs';
import {onRequest} from '../functions/_middleware.js';
import {handleAuth, safeReturnTo} from '../functions/_auth.js';

const read = path => JSON.parse(fs.readFileSync(new URL('../' + path, import.meta.url)));
const ficha = read('adaptaciones/proyectos/altadis-estancos-bcn.json');
const lists = {estandar: read('adaptaciones/perfil-cliente-18.json').formats, especiales: read('adaptaciones/perfil-cliente-especiales.json').layouts};
const index = read('adaptaciones/proyectos/index.json').proyectos;
const catalogo = () => [...createCatalog(), ...projectFormats(ficha, lists)];
const propios = catalogo().filter(f => f.proyecto).map(f => f.id);

test('los 18 formatos tipo son los 18 primeros de la ficha de Altadis', () => {
  assert.equal(ALTADIS_18.length, 18);
  assert.deepEqual(ALTADIS_18, lists.estandar.slice(0, 18).map(f => f.id));
  assert.equal(ALTADIS_18[5], 'cliente-06');
  assert(ALTADIS_18.every(id => propios.includes(id)));
});

test('?formato= admite uno o varios ids, en orden y sin repetir', () => {
  assert.deepEqual(formatosPedidos('?formato=cliente-06'), ['cliente-06']);
  assert.deepEqual(formatosPedidos('?formato=cliente-06,cliente-10'), ['cliente-06', 'cliente-10']);
  assert.deepEqual(formatosPedidos('formato=cliente-10&formato=cliente-06,cliente-10'), ['cliente-10', 'cliente-06']);
  assert.deepEqual(formatosPedidos(new URLSearchParams({formato: ' CLIENTE-06 , cliente-10 '})), ['cliente-06', 'cliente-10']);
  assert.deepEqual(formatosPedidos('?formato=cliente-esp-2', propios), ['cliente-esp-2']);
});

test('un id inválido se ignora sin romper nada', () => {
  for (const search of ['', '?', '?proyecto=altadis', '?formato=', '?formato=,,', '?formato=cliente-6', '?formato=cliente-006',
    '?formato=%3Cscript%3E', '?formato=../cliente-06', '?formato=9:16', '?formato=starbucks-vertical', null, undefined, 42])
    assert.deepEqual(formatosPedidos(search), [], String(search));
  assert.deepEqual(formatosPedidos('?formato=cliente-99,cliente-06', propios), ['cliente-06']);
  assert.deepEqual(formatosPedidos('?formato=cliente-99', propios), []);
  assert.equal(formatosPedidos('?formato=' + Array.from({length: 40}, (_, i) => `cliente-${String(i + 1).padStart(2, '0')}`).join(',')).length, 24);
});

test('sin ?proyecto=, un formato cliente-NN abre la ficha de Altadis; un ?proyecto= explícito manda', () => {
  assert.equal(proyectoPorFormatos(null, ['cliente-06']), PROYECTO_ALTADIS);
  assert.equal(proyectoPorFormatos('', ['cliente-06']), PROYECTO_ALTADIS);
  assert.equal(proyectoPorFormatos('pixeria-alsea', ['cliente-06']), 'pixeria-alsea');
  assert.equal(proyectoPorFormatos(null, []), null);
  const projects = mergeProjects([], index);
  assert.deepEqual(initialProject({query: proyectoPorFormatos(null, formatosPedidos('?formato=cliente-06')), saved: 'pixeria-alsea', projects, index}), {id: PROYECTO_ALTADIS, unknown: null});
  assert.deepEqual(initialProject({query: proyectoPorFormatos(null, formatosPedidos('?formato=x')), saved: 'pixeria-alsea', projects, index}), {id: 'pixeria-alsea', unknown: null});
});

test('encenderSolo deja solo los pedidos y apaga el resto; si no existe ninguno, no toca nada', () => {
  const formatos = catalogo();
  assert.deepEqual(encenderSolo(formatos, ['cliente-10', 'cliente-06']), ['cliente-10', 'cliente-06']);
  assert.deepEqual(formatos.filter(f => f.on).map(f => f.id).sort(), ['cliente-06', 'cliente-10']);
  const antes = formatos.map(f => f.on);
  assert.deepEqual(encenderSolo(formatos, ['cliente-99']), []);
  assert.deepEqual(formatos.map(f => f.on), antes);
});

test('«Ver en su espacio» lleva al gemelo de admira.store, en Xtanco y en Starbucks, solo para los 18', () => {
  assert.deepEqual(enlacesEspacio('cliente-06').map(e => [e.tipo, e.href, e.es]), [
    ['xtanco', 'https://www.admira.store/xpacios/altadis-18/?formato=cliente-06&tipo=xtanco', 'Ver en su espacio'],
    ['cafe', 'https://www.admira.store/xpacios/altadis-18/?formato=cliente-06&tipo=cafe', 'Ver en su espacio en Starbucks'],
  ]);
  assert.equal(enlacesEspacio('cliente-10')[1].href, 'https://www.admira.store/xpacios/altadis-18/?formato=cliente-10&tipo=cafe');
  for (const id of ALTADIS_18) assert.equal(enlacesEspacio(id).length, 2, id);
  for (const id of ['cliente-19', 'cliente-24', 'cliente-esp-1', '9:16', '', undefined]) assert.deepEqual(enlacesEspacio(id), [], String(id));
});

test('el parámetro sobrevive a la verja: return_to lleva la query entera', async () => {
  const response = await onRequest({request: new Request('https://admira.studio/adaptaciones/?formato=cliente-06,cliente-10'), env: {}, next: () => new Response('no')});
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), '/auth/login?return_to=' + encodeURIComponent('/adaptaciones/?formato=cliente-06,cliente-10'));
  assert.equal(safeReturnTo('/adaptaciones/?formato=cliente-06&proyecto=altadis-estancos-bcn'), '/adaptaciones/?formato=cliente-06&proyecto=altadis-estancos-bcn');
  // El login guarda ese destino completo en el reto que consume /auth/callback.
  const guardado = [];
  const AUTH_DB = {prepare: sql => ({bind(...v) { if (/INSERT INTO pixeria_login_challenges/.test(sql)) guardado.push(v[1]); return this; }, async run() { return {success: true}; }})};
  const login = await handleAuth(new Request('https://admira.studio' + response.headers.get('location')), {AUTH_DB, PIXERIA_SIGNING_KEY: 'test-signing-key'});
  assert.equal(login.status, 401);
  assert.deepEqual(guardado, ['/adaptaciones/?formato=cliente-06,cliente-10']);
});
