// Integración headless de ?formato=cliente-NN (PR #51 · misión DCL-d7966deb02734a6f34beb54e).
// Sirve el repositorio en local, sin sesión: /auth-gate.js vacío, /auth/session simulado y terceros
// bloqueados para que sea determinista. Necesita Playwright: PLAYWRIGHT_MODULE=/ruta/a/playwright
// (o `playwright` instalado). Sin él, el test se salta.
//   PLAYWRIGHT_MODULE=~/Claude/ainimation/node_modules/playwright node --test test/altadis-18-formato.e2e.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

let chromium = null;
try { ({chromium} = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright')); } catch (_) {}

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const KEY = 'pixeria.adapter.v1.proyecto.altadis-estancos-bcn', LAST = 'pixeria.adapter.proyecto';
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2'};

function servir() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://local');
    if (url.pathname === '/auth-gate.js') { res.writeHead(200, {'content-type': 'text/javascript'}); return res.end(''); }
    if (url.pathname === '/auth/session') { res.writeHead(200, {'content-type': 'application/json'}); return res.end('{"ok":true,"clientes":[]}'); }
    let file = path.join(ROOT, decodeURIComponent(url.pathname));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    try { if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); } catch (_) {}
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, {'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store'});
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

test('?formato= es una vista temporal: no pisa lo guardado, se suelta y no actúa fuera del Adaptador', {skip: !chromium && 'Playwright no disponible (PLAYWRIGHT_MODULE)', timeout: 180000}, async () => {
  const server = await servir(), base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless: true});
  try {
    const context = await browser.newContext({viewport: {width: 1400, height: 1000}});
    await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());
    const page = await context.newPage(), errores = [];
    page.on('pageerror', e => errores.push(e.message));
    const ir = async (ruta, {tarjetas = true} = {}) => {
      await page.goto(base + ruta);
      await page.waitForFunction(conTarjetas => document.querySelector('#adapter-project')?.options.length > 1 && (!conTarjetas || document.querySelectorAll('#grid .fmt[data-f]').length > 0), tarjetas, {timeout: 30000});
      await page.waitForTimeout(600);
    };
    const leer = () => page.evaluate(([key, last]) => ({
      proyecto: document.querySelector('#adapter-project').value,
      tarjetas: [...document.querySelectorAll('#grid .fmt[data-f]')].map(el => el.dataset.f),
      aviso: !!document.querySelector('#formato-url'), url: location.search,
      guardado: localStorage.getItem(key), ultimo: localStorage.getItem(last),
    }), [KEY, LAST]);
    // El selector vive en el panel del paso 2 (oculto en el paso 1): se elige como lo haría su change.
    const elegirProyecto = async id => { await page.evaluate(v => { const s = document.querySelector('#adapter-project'); s.value = v; s.dispatchEvent(new Event('change')); }, id); await page.waitForTimeout(1200); };
    const ultimoStarbucks = async () => { await ir('/adaptaciones/?proyecto=pixeria-alsea'); assert.equal((await leer()).ultimo, 'pixeria-alsea'); };

    // El usuario tenía en Altadis su propia selección (solo cliente-03 de los formatos del proyecto).
    await ir('/adaptaciones/?proyecto=altadis-estancos-bcn');
    await page.evaluate(() => document.querySelector('#clear-formats').click());
    await page.evaluate(() => document.querySelector('[data-select-key="size:cliente-03"]').click());
    await page.waitForTimeout(300);
    const suya = (await leer()).guardado, seleccion = JSON.parse(suya).selected;
    assert(seleccion.includes('cliente-03') && !seleccion.includes('cliente-06'));
    await ultimoStarbucks();

    // 1. Llega desde admira.store: ve solo cliente-06 y no cambia nada de lo guardado.
    await ir('/adaptaciones/?formato=cliente-06');
    let e = await leer();
    assert.equal(e.proyecto, 'altadis-estancos-bcn'); assert.deepEqual(e.tarjetas, ['cliente-06']); assert.equal(e.aviso, true);
    assert.equal(e.guardado, suya); assert.equal(e.ultimo, 'pixeria-alsea');

    // 2. Recargar sin parámetro: vuelve su último proyecto y, en Altadis, su selección.
    await ir('/adaptaciones/');
    assert.equal((await leer()).proyecto, 'pixeria-alsea');
    await ir('/adaptaciones/?proyecto=altadis-estancos-bcn');
    assert.deepEqual((await leer()).tarjetas, ['cliente-03']);
    await ultimoStarbucks();

    // 3. Cerrar el aviso: vuelve su selección, sin aviso ni parámetro.
    await ir('/adaptaciones/?formato=cliente-06');
    await page.click('.formato-url-cerrar'); await page.waitForTimeout(400);
    e = await leer();
    assert.equal(e.aviso, false); assert.doesNotMatch(e.url, /formato=/); assert.deepEqual(e.tarjetas, ['cliente-03']);
    assert.deepEqual(JSON.parse(e.guardado).selected, seleccion);
    await ultimoStarbucks();

    // 4. Elegir otro proyecto a mano y volver: su selección intacta.
    await ir('/adaptaciones/?formato=cliente-06,cliente-10');
    assert.deepEqual((await leer()).tarjetas, ['cliente-06', 'cliente-10']);
    await elegirProyecto('pixeria-alsea'); await elegirProyecto('altadis-estancos-bcn');
    e = await leer();
    assert.deepEqual(e.tarjetas, ['cliente-03']); assert.deepEqual(JSON.parse(e.guardado).selected, seleccion); assert.doesNotMatch(e.url, /formato=/);
    await ultimoStarbucks();

    // 5. Un id que no existe no toca el proyecto ni lo guardado.
    const antes = (await leer()).guardado;
    await ir('/adaptaciones/?formato=cliente-99');
    e = await leer();
    assert.equal(e.proyecto, 'pixeria-alsea'); assert.equal(e.ultimo, 'pixeria-alsea'); assert.equal(e.aviso, false); assert.equal(e.guardado, antes);
    assert.doesNotMatch(e.url, /formato=/);

    // 6. En Creador (mismo adaptaciones.js) el parámetro no actúa.
    await ir('/creador/?formato=cliente-06', {tarjetas: false});
    e = await leer();
    assert.equal(e.aviso, false); assert.notEqual(e.proyecto, 'altadis-estancos-bcn'); assert.equal(e.ultimo, 'pixeria-alsea'); assert.equal(e.guardado, antes);

    // 7. Si durante la vista marca otro formato, la vista termina y la marca se suma a su selección:
    //    cliente-03 se conserva y el aviso desaparece.
    await ir('/adaptaciones/?formato=cliente-06');
    await page.evaluate(() => document.querySelector('[data-select-key="size:cliente-10"]').click());
    await page.waitForTimeout(400);
    e = await leer();
    assert.deepEqual(JSON.parse(e.guardado).selected, [...seleccion, 'cliente-10']);
    assert.equal(e.aviso, false); assert.deepEqual(e.tarjetas, ['cliente-03', 'cliente-10']);
    assert.doesNotMatch(e.url, /formato=/); assert.equal(e.ultimo, 'altadis-estancos-bcn');
    await ir('/adaptaciones/');
    assert.deepEqual((await leer()).tarjetas, ['cliente-03', 'cliente-10']);

    // 8 y 9. Repro de la re-revisión: guardado en «standard» con formatos del proyecto y de la biblioteca.
    const previa = ['9:16', '16:9', 'cliente-01', 'cliente-02', 'cliente-03', 'cliente-esp-1'];
    const sembrar = () => page.evaluate(([key, sel]) => { const r = JSON.parse(localStorage.getItem(key)); localStorage.setItem(key, JSON.stringify({...r, profile: 'standard', selected: sel})); }, [KEY, previa]);
    const ordenada = list => [...list].sort();
    // 8. La × de cliente-06 no borra nada de lo previo; perfil «standard» y sin aviso.
    await sembrar(); await ir('/adaptaciones/?formato=cliente-06');
    assert.deepEqual((await leer()).tarjetas, ['cliente-06']);
    await page.evaluate(() => document.querySelector('#grid .fmt[data-f="cliente-06"] .remove-format').click());
    await page.waitForTimeout(400);
    e = await leer();
    assert.deepEqual(ordenada(JSON.parse(e.guardado).selected), ordenada(previa)); assert.equal(JSON.parse(e.guardado).profile, 'standard');
    assert.equal(e.aviso, false); assert.equal(await page.$('.formato-url-cerrar'), null);
    assert.deepEqual(e.tarjetas, ['9:16', '16:9']); assert.doesNotMatch(e.url, /formato=/);
    // 9. Marcar cliente-10: lo previo más cliente-10.
    await sembrar(); await ir('/adaptaciones/?formato=cliente-06');
    await page.evaluate(() => document.querySelector('[data-select-key="size:cliente-10"]').click());
    await page.waitForTimeout(400);
    e = await leer();
    assert.deepEqual(ordenada(JSON.parse(e.guardado).selected), ordenada([...previa, 'cliente-10'])); assert.equal(JSON.parse(e.guardado).profile, 'standard');
    assert.equal(e.aviso, false);

    assert.deepEqual(errores, []);
    await context.close();
  } finally {
    await browser.close(); server.close();
  }
});
