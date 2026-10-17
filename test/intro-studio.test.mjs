// Intro en vídeo de la portada de admira.studio (17-oct-2026): look Matrix, solo en / y /en/, una vez por sesión,
// se salta, respeta «reducir movimiento», alterna dos músicas y sobrevive al sync de Pixeria. Contrato: assets/intro-studio/LEEME.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync, statSync} from 'node:fs';

const require = createRequire(import.meta.url);
const intro = require('../assets/intro-studio/intro.js');
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const TAG = '<h1>Admira Studio</h1><script defer src="/assets/intro-studio/intro.js?v=';

test('la portada en español y en inglés cargan la intro tras el título', () => {
  for (const page of ['index.html', 'en/index.html']) assert.ok(read(page).includes(TAG), page);
});

test('marca.json la protege del sync: carpeta propia y sustitución al final', () => {
  const marca = JSON.parse(read('marca.json'));
  assert.ok(marca.propios.includes('assets/intro-studio/'));
  const pares = marca.sustituciones;
  const i = pares.findIndex(([a, b]) => a === '<h1>Admira Studio</h1>' && b.startsWith(TAG));
  assert.ok(i >= 0, 'la sustitución existe');
  const pixeria = pares.findIndex(([a, b]) => a === 'Pixeria' && b === 'Admira Studio');
  assert.ok(pixeria >= 0 && i > pixeria, 'va después de Pixeria → Admira Studio');
});

test('solo arranca en la portada (/ y /en/), no en _cuadopen ni en el backoffice', () => {
  for (const path of ['/', '/index.html', '/en/', '/en/index.html']) assert.equal(intro.isHome(path), true, path);
  for (const path of ['/_cuadopen.html', '/backoffice/', '/backoffice/index.html', '/en/_cuadopen.html', '/stock.html']) assert.equal(intro.isHome(path), false, path);
});

test('sale la primera vez en cada idioma, no se repite, no sale con menos movimiento; ?intro=0 y ?intro=1', () => {
  const base = {search: '', path: '/', reducedMotion: false, seen: false};
  assert.equal(intro.shouldShow({...base, lang: 'es'}), true);
  assert.equal(intro.shouldShow({...base, path: '/en/', lang: 'en'}), true);
  assert.equal(intro.shouldShow({...base, lang: 'es', seen: true}), false);
  assert.equal(intro.shouldShow({...base, lang: 'es', reducedMotion: true}), false);
  assert.equal(intro.shouldShow({...base, lang: 'fr'}), false);
  assert.equal(intro.shouldShow({...base, lang: 'es', search: '?intro=0'}), false);
  assert.equal(intro.shouldShow({...base, lang: 'es', seen: true, reducedMotion: true, search: '?intro=1'}), true);
  assert.equal(intro.shouldShow({...base, path: '/_cuadopen.html', lang: 'es', search: '?intro=1'}), false, 'fuera de la portada ni forzada');
});

test('vídeo del idioma: 1080p desde 1600 píxeles reales, 720p en el resto', () => {
  assert.equal(intro.pickSource(1920, 1, 'es'), intro.SOURCES.es[1080]);
  assert.equal(intro.pickSource(390, 3, 'es'), intro.SOURCES.es[720]);
  assert.equal(intro.pickSource(1920, 1, 'en'), intro.SOURCES.en[1080]);
  assert.equal(intro.pickSource(1280, 1, 'en'), intro.SOURCES.en[720]);
});

test('la música alterna y se puede fijar o quitar', () => {
  assert.equal(intro.pickMusic('', ''), 'campanas');
  assert.equal(intro.pickMusic('', 'campanas'), 'pulso');
  assert.equal(intro.pickMusic('', 'pulso'), 'campanas');
  assert.equal(intro.pickMusic('?musica=pulso', 'pulso'), 'pulso');
  assert.equal(intro.pickMusic('?musica=0', 'campanas'), '');
});

test('los vídeos y las músicas existen y pesan lo razonable para la web', () => {
  for (const src of Object.values(intro.SOURCES).flatMap(set => Object.values(set))) {
    const size = statSync(new URL('..' + src, import.meta.url)).size;
    assert.ok(size > 1_000_000 && size < 12_000_000, src + ' pesa ' + size);
  }
  for (const src of Object.values(intro.MUSIC)) {
    assert.match(src, /\.mp4$/, 'la música va en .mp4: Cloudflare no sirve .m4a por rangos');
    const size = statSync(new URL('..' + src, import.meta.url)).size;
    assert.ok(size > 50_000 && size < 1_000_000, src + ' pesa ' + size);
  }
});

test('se salta con botón o Esc, el sonido tiene botón en los dos idiomas y se para al cerrar', () => {
  const src = read('assets/intro-studio/intro.js');
  for (const text of ['Saltar intro', 'Skip intro', 'Activar sonido', 'Turn sound on', 'Silenciar', 'Mute']) assert.ok(src.includes(text), text);
  assert.match(src, /e\.key === 'Escape'/);
  assert.match(src, /video\.addEventListener\('ended', close\)/);
  assert.match(src, /p\.catch\(close\)/);
  assert.match(src, /if \(audio\) \{ try \{ audio\.pause\(\); \} catch \(_\) \{\} \}/);
  assert.match(src, /#00ff41/, 'verde Matrix de admira.studio');
});

test('una vez por idioma: al pasar de /en/ a / (castellano) sale en castellano si aún no se ha visto', () => {
  assert.deepEqual(intro.parseSeen('1'), [], 'el «1» antiguo no dice el idioma');
  assert.deepEqual(intro.parseSeen('en'), ['en']);
  assert.deepEqual(intro.parseSeen('es,en'), ['es', 'en']);
  const src = read('assets/intro-studio/intro.js');
  assert.match(src, /const seen = seenLangs\.includes\(lang\);/);
  assert.match(src, /session\.setItem\(SEEN_KEY, seenLangs\.join\(','\)\)/);
});
