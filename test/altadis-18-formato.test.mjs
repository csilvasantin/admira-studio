// ?formato=cliente-NN: los gemelos de admira.store abren el Adaptador con su formato
// (misión DCL-d7966deb02734a6f34beb54e · 15-oct-2026).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {formatosPedidos, proyectoPorFormatos, encenderSolo, enlacesEspacio, esPaginaAdaptador, abrirVista, guardadoEnVista, seleccionAlTerminar, ALTADIS_18, PROYECTO_ALTADIS} from '../adaptaciones/formato-url.mjs';
import {snapshot, defaults} from '../adaptaciones/adapter-core.mjs';
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

test('?formato= solo actúa en la página del Adaptador, no en Creador', () => {
  for (const path of ['/adaptaciones/', '/adaptaciones', '/adaptaciones/index.html', '/en/adaptaciones/', '/en/adaptaciones/index.html']) assert.equal(esPaginaAdaptador(path), true, path);
  for (const path of ['/creador/', '/en/creador/', '/creador/index.html', '/adaptaciones/ensayos/2026-10-08/', '/', '', null, undefined]) assert.equal(esPaginaAdaptador(path), false, String(path));
});

test('vista temporal: el filtro no pisa la selección guardada y la recupera al soltar', () => {
  const formatos = catalogo(), state = {profile: 'proyecto', compat: 'uhd', modoGlobal: 'auto', fmt: Object.fromEntries(formatos.map(f => [f.id, defaults()]))};
  formatos.forEach(f => { f.on = ['9:16', 'cliente-03'].includes(f.id); });
  const foto = () => ({...snapshot(state, formatos), crear: {}});
  const antes = foto(), vista = abrirVista(antes, ['cliente-06']);
  encenderSolo(formatos, ['cliente-06']);
  // Pendiente (aún sin aplicar): no se escribe nada.
  assert.deepEqual(guardadoEnVista(foto(), {ids: ['cliente-06']}), {snap: null, fin: false});
  // Con el filtro puesto y nada más cambiado: no se escribe nada.
  assert.deepEqual(guardadoEnVista(foto(), vista), {snap: null, fin: false});
  // Cambiar el perfil durante la vista tampoco se guarda.
  state.profile = 'standard'; assert.deepEqual(guardadoEnVista(foto(), vista), {snap: null, fin: false}); state.profile = 'proyecto';
  // Un ajuste (zoom) sí se guarda, pero con la selección de antes del enlace.
  state.fmt['cliente-06'] = {...defaults(), zoom: 1.5};
  const ajuste = guardadoEnVista(foto(), vista);
  assert.equal(ajuste.fin, false); assert.deepEqual(ajuste.snap.selected, ['9:16', 'cliente-03']); assert.equal(ajuste.snap.fmt['cliente-06'].zoom, 1.5);
  // Si el usuario marca otro formato, la vista termina y su marca se suma a la selección previa.
  formatos.find(f => f.id === 'cliente-10').on = true;
  const suya = guardadoEnVista(foto(), vista);
  assert.equal(suya.fin, true); assert.equal(suya.snap, null);
  assert.deepEqual(suya.seleccion, {selected: ['9:16', 'cliente-03', 'cliente-10'], profile: 'proyecto'});
  // Sin vista, se guarda tal cual.
  assert.equal(guardadoEnVista(antes, null).snap, antes);
});

test('al terminar la vista por una marca manual, el cambio se aplica sobre la selección previa', () => {
  // Repro de la re-revisión: guardado en «standard» con formatos del proyecto y de la biblioteca.
  const previa = ['9:16', '16:9', 'cliente-01', 'cliente-02', 'cliente-03', 'cliente-esp-1'];
  const vista = abrirVista({profile: 'standard', selected: previa}, ['cliente-06']);
  // La × de cliente-06: no se pierde nada de lo previo y el perfil vuelve a «standard».
  assert.deepEqual(seleccionAlTerminar(vista, [], 'proyecto'), {selected: previa, profile: 'standard'});
  // Marcar cliente-10: previa + cliente-10.
  assert.deepEqual(seleccionAlTerminar(vista, ['cliente-06', 'cliente-10'], 'proyecto'), {selected: [...previa, 'cliente-10'], profile: 'standard'});
  // Desmarcar un formato del filtro que ya estaba en la previa lo quita también de ella.
  const conSeis = abrirVista({profile: 'proyecto', selected: ['cliente-03', 'cliente-06']}, ['cliente-06', 'cliente-10']);
  assert.deepEqual(seleccionAlTerminar(conSeis, ['cliente-10'], 'proyecto').selected, ['cliente-03']);
  // Si el usuario cambió el perfil a mano durante la vista, se respeta.
  assert.equal(seleccionAlTerminar(vista, ['cliente-06', 'cliente-10'], 'especiales').profile, 'especiales');
  // guardadoEnVista lo devuelve así al detectar la marca.
  const fin = guardadoEnVista({profile: 'proyecto', selected: []}, vista);
  assert.deepEqual(fin, {snap: null, fin: true, seleccion: {selected: previa, profile: 'standard'}});
});
