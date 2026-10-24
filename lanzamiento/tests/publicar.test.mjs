import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fichaDe, partesDe, subirYPublicar } from '../scripts/lib/stock-subida.mjs';
import { resolverCampana } from '../scripts/lib/stock.mjs';
import { guionDesdeBrief } from '../scripts/lib/plantilla.mjs';
import { rellenarGuion } from '../scripts/lib/voz.mjs';
import { validarLanzamiento, PROHIBIDAS } from '../src/props.ts';

const indice = JSON.parse(fs.readFileSync(new URL('./datos/indice-ejemplo.json', import.meta.url), 'utf8'));
const brief = resolverCampana(indice, { campana: 'starbucks-gdg51-seven-20261015' });
const g = guionDesdeBrief(brief, { idioma: 'es', fecha: '22 oct 2026' });
const l = validarLanzamiento(rellenarGuion(g, Object.fromEntries(g.lineas.map((x) => [x.id, { fichero: `voz/x/es/${x.id}.mp3`, palabras: [{ text: 'a', startMs: 0, endMs: 1000 }] }]))));

test('la ficha lleva título claro y las etiquetas pedidas, sin palabras prohibidas', () => {
  const f = fichaDe(l, brief, { idioma: 'es', vertical: true, version: 'v1' });
  assert.match(f.titulo, /^Starbucks · Gran de Gràcia 51 · Siete mensajes · Lanzamiento ES · vertical 9:16 · v1$/);
  for (const t of ['lanzamiento', 'lanzamiento-vertical', 'campaign:starbucks-gdg51-seven-20261015', 'installation:starbucks-pg103', 'content-language:es', 'starbucks', 'admira-studio', 'admira-store']) assert.ok(f.tags.includes(t), t);
  assert.ok(f.tags.length <= 10);
  assert.ok(!PROHIBIDAS.test(f.titulo + f.comment + f.tags.join(' ')));
  assert.match(fichaDe(l, brief, { idioma: 'en', vertical: false }).titulo, /Lanzamiento EN · 16:9/);
});

test('las partes cubren el fichero entero sin solaparse', () => {
  const p = partesDe(60 * 1024 * 1024 + 7, 25 * 1024 * 1024);
  assert.equal(p.length, 3);
  assert.equal(p[0].desde, 0); assert.equal(p[2].hasta, 60 * 1024 * 1024 + 7);
  for (let i = 1; i < p.length; i++) assert.equal(p[i].desde, p[i - 1].hasta);
});

test('la subida sigue el protocolo init → part(n) → complete → publish con r2Staged, y para si algo falla', async () => {
  const llamadas = [];
  const fetchImpl = async (url, opts) => {
    llamadas.push({ url: String(url), method: opts.method, body: opts.body });
    const j = (o) => ({ ok: true, status: 200, json: async () => o });
    if (url.endsWith('/stock/upload/init')) return j({ ok: true, key: 'uploads/abc.mp4', uploadId: 'U1', partSize: 4 });
    if (url.includes('/stock/upload/part?')) { const n = Number(new URL(url).searchParams.get('n')); return j({ ok: true, partNumber: n, etag: `e${n}` }); }
    if (url.endsWith('/stock/upload/complete')) return j({ ok: true, key: 'uploads/abc.mp4', size: 10 });
    if (url.endsWith('/stock/publish')) { const b = JSON.parse(opts.body); assert.equal(b.r2Staged, 'uploads/abc.mp4'); assert.equal(b.type, 'video'); assert.ok(b.poster.startsWith('data:image/jpeg;base64,')); return j({ ok: true, id: '1-x', num: 9999, url: 'https://api.admira.store/stock/asset/1-x', tags: b.tags }); }
    throw new Error('ruta inesperada ' + url);
  };
  const r = await subirYPublicar({ buffer: Buffer.from('0123456789'), mime: 'video/mp4', ficha: fichaDe(l, brief, { idioma: 'es', vertical: false }), poster: Buffer.from('jpg'), dimensions: { ancho: 1920, alto: 1080 }, fetchImpl });
  assert.equal(r.num, 9999);
  const partes = llamadas.filter((c) => c.url.includes('/upload/part?'));
  assert.equal(partes.length, 3, '10 bytes en partes de 4');
  assert.ok(partes.every((c) => c.method === 'PUT' && /[&?]n=\d+/.test(c.url)));
  const fallo = async (url, opts) => (url.endsWith('/stock/upload/init') ? { ok: false, status: 500, json: async () => ({ error: 'r2-not-bound' }) } : fetchImpl(url, opts));
  await assert.rejects(subirYPublicar({ buffer: Buffer.from('x'), mime: 'video/mp4', ficha: fichaDe(l, brief, { idioma: 'es', vertical: false }), fetchImpl: fallo }), /init: HTTP 500/);
});
