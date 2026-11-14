import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {adaptationFormats, GENERAL, formatRef, projectLibrary, resolveRef} from '../adaptaciones/proyectos-core.mjs';
import {createCatalog} from '../adaptaciones/format-catalog.mjs';
import {twinGeometry} from '../adaptaciones/gemelo-core.mjs';
import {clientInstallations} from '../adaptaciones/client-installations.mjs';

const load = path => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const library = createCatalog(false);

function project(id) {
  const path = 'adaptaciones/proyectos/' + id + '.json';
  const ficha = load(path);
  const lists = Object.fromEntries(Object.entries(ficha.formatos).map(([key, value]) => {
    const ref = formatRef(value);
    return [key, ref.inline ?? load(resolveRef(path, ref.archivo))[ref.clave]];
  }));
  return {ficha, formats: adaptationFormats(id, projectLibrary(library, ficha, lists))};
}

test('general keeps the library and a project without destinations only offers the two orientations', () => {
  assert.equal(adaptationFormats(GENERAL, library), library);
  assert.deepEqual(adaptationFormats('another-project', library).map(format => format.id).sort(), ['16:9', '9:16']);
});

test('Altadis provides all 29 destinations with valid wall geometry for 3D', () => {
  const {formats} = project('altadis-estancos-bcn');
  assert.equal(formats.length, 29);
  assert.equal(formats.filter(format => format.myblu).length, 6);
  assert.equal(formats.filter(format => format.especial).length, 5);
  for (const format of formats) {
    const [ancho, alto] = format.custom;
    const twin = twinGeometry(format, {ancho, alto});
    assert.ok(twin.segments.length > 0);
    if (format.especial) assert.equal(twin.segments.length, format.layout.pantallas);
  }
});

test('Starbucks retains its two output presets and its five installed layouts have screen geometry', () => {
  const {ficha, formats} = project('pixeria-alsea');
  assert.equal(formats.length, 2);
  const layouts = clientInstallations(ficha);
  assert.equal(layouts.length, 5);
  for (const installation of layouts) {
    const wall = twinGeometry({installation});
    assert.equal(wall.segments.length, installation.screens.length);
  }
});

test('MacStudio has its own three-screen V-H-V layout, without the Mac Mini or laptop', async()=>{
 const doc=JSON.parse(readFileSync(new URL('../adaptaciones/proyectos/pixeria-alsea.json',import.meta.url),'utf8'));
 const layout=doc.instalaciones.find(i=>i.id==='macstudio-vhv');
 assert.equal(layout.pattern,'V-H-V');assert.equal(layout.screens.length,3);
 assert.deepEqual(layout.screens.map(s=>s.w>s.h?'H':'V'),['V','H','V']);
 assert.deepEqual(layout.screens.map(s=>s.x),[0,1080,3000]);
 assert.ok(layout.screens.every(s=>s.id.startsWith('macstudio-')));
});
