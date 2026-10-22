// La cadena entera sin red: índice de ejemplo → brief → guion (es/en) → voz simulada → lanzamiento válido
// → plan de escenas → comprobación → ficha → subida y alta simuladas. Y lo mismo por los scripts de la terminal,
// con un servidor de voz falso y publicación en seco.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { resolverCampana } from '../scripts/lib/stock.mjs';
import { guionDesdeBrief } from '../scripts/lib/plantilla.mjs';
import { rellenarGuion } from '../scripts/lib/voz.mjs';
import { comprobar } from '../scripts/lib/revision.mjs';
import { fichaDe, subirYPublicar } from '../scripts/lib/stock-subida.mjs';
import { validarLanzamiento, PROHIBIDAS } from '../src/props.ts';
import { planificar } from '../src/guion.ts';

const raiz = path.resolve(new URL('..', import.meta.url).pathname);
const FIXTURE = path.join(raiz, 'tests/datos/indice-ejemplo.json');
const indice = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
const C = 'starbucks-gdg51-seven-20261015';
const vozFalsa = (text) => ({ fichero: 'voz/x.mp3', palabras: text.split(' ').map((w, i) => ({ text: w, startMs: i * 320, endMs: i * 320 + 280 })) });

test('biblioteca: de la campaña a la pieza publicada, en español y en inglés', async () => {
  const brief = resolverCampana(indice, { campana: C });
  for (const idioma of ['es', 'en']) {
    const g = guionDesdeBrief(brief, { idioma, fecha: '22 oct 2026' });
    const l = validarLanzamiento(rellenarGuion(g, Object.fromEntries(g.lineas.map((x) => [x.id, vozFalsa(x.text)]))));
    const { escenas, total } = planificar(l);
    assert.equal(escenas.length, 9);
    assert.ok(total / l.fps > 20 && total / l.fps < 120);
    const r = comprobar(l, { existe: () => true });
    assert.deepEqual(r.problemas, []);
    for (const vertical of [false, true]) {
      const ficha = fichaDe(l, brief, { idioma, vertical });
      assert.ok(!PROHIBIDAS.test(JSON.stringify(ficha)));
      let publicado = null;
      const fetchImpl = async (url, opts) => {
        const j = (o) => ({ ok: true, status: 200, json: async () => o });
        if (url.endsWith('/upload/init')) return j({ ok: true, key: 'uploads/k.mp4', uploadId: 'U', partSize: 1 << 20 });
        if (url.includes('/upload/part?')) return j({ ok: true, partNumber: 1, etag: 'e' });
        if (url.endsWith('/upload/complete')) return j({ ok: true, key: 'uploads/k.mp4', size: 3 });
        if (url.endsWith('/stock/publish')) { publicado = JSON.parse(opts.body); return j({ ok: true, id: 'id', num: 1, url: 'u', tags: publicado.tags }); }
        throw new Error(url);
      };
      await subirYPublicar({ buffer: Buffer.from('mp4'), mime: 'video/mp4', ficha, poster: Buffer.from('jpg'), dimensions: { ancho: 1, alto: 1 }, fetchImpl });
      assert.equal(publicado.r2Staged, 'uploads/k.mp4');
      assert.ok(publicado.tags.includes(`content-language:${idioma}`) && publicado.tags.includes(vertical ? 'lanzamiento-vertical' : 'lanzamiento-horizontal'));
    }
  }
});

test('terminal: brief → guion → voz (servidor falso) → montar → revisar → publicar en seco', async () => {
  // Servidor de voz falso: devuelve un mp3 de mentira y una alineación por caracteres.
  const servidor = http.createServer((req, res) => {
    let cuerpo = ''; req.on('data', (c) => (cuerpo += c)); req.on('end', () => {
      const { text } = JSON.parse(cuerpo);
      const chars = [...text]; const starts = chars.map((_, i) => i * 0.05); const ends = starts.map((s) => s + 0.045);
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: true, mime: 'audio/mpeg', audioBase64: Buffer.from('ID3fake').toString('base64'), alignment: { chars, starts, ends } }));
    });
  });
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  const puerto = servidor.address().port;
  const nombre = 'prueba-cadena';
  const env = { ...process.env, STOCK_INDEX: FIXTURE, TTS_URL: `http://127.0.0.1:${puerto}/tts`, NODE_OPTIONS: '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON' };
  // Asíncrono a propósito: el servidor de voz falso vive en este mismo proceso y necesita el bucle de eventos.
  const run = (script, ...args) => new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [path.join(raiz, 'scripts', script), ...args], { cwd: raiz, env });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`${script} ${args.join(' ')} → ${code}\n${out}\n${err}`))));
  });
  // Piezas de mentira para que `revisar` las encuentre.
  const brief0 = resolverCampana(indice, { campana: C });
  const falsos = [];
  for (const f of [brief0.piezas.horizontal.fichero, brief0.piezas.vertical.fichero, brief0.piezas.conjunto.fichero, ...brief0.piezas.posters, ...Object.values(brief0.piezasPorIdioma).flatMap((p) => [p.horizontal.fichero, p.vertical.fichero, p.conjunto.fichero, ...p.posters])]) {
    const ruta = path.join(raiz, 'public', f);
    if (!fs.existsSync(ruta)) { fs.mkdirSync(path.dirname(ruta), { recursive: true }); fs.writeFileSync(ruta, 'x'); falsos.push(ruta); }
  }
  try {
    assert.match(await run('brief.mjs', '--campana', C, '--nombre', nombre, '--sin-descargar'), /pantallas 7 · idiomas en\+es/);
    for (const idioma of ['es', 'en']) {
      assert.match(await run('guion.mjs', nombre, '--idioma', idioma, '--fecha', '22 oct 2026'), /7 líneas · 9 escenas/);
      assert.match(await run('voz.mjs', nombre, '--idioma', idioma), /7 líneas/);
      assert.match(await run('montar.mjs', nombre, '--idioma', idioma), /9 escenas/);
      assert.match(await run('revisar.mjs', nombre, '--idioma', idioma, '--sin-fotogramas'), /revisión OK/);
      // publicar exige un render comprobado: lo simulamos con un informe OK y ficheros de salida de mentira.
      const salidaH = `salida/${nombre}.${idioma}.mp4`, salidaV = `salida/${nombre}.${idioma}.vertical.mp4`;
      fs.mkdirSync(path.join(raiz, 'salida'), { recursive: true });
      // Vídeos mínimos de verdad (2 s, 64×64) para que publicar pueda sacar el póster con ffmpeg.
      for (const s of [salidaH, salidaV]) await new Promise((res, rej) => { const f = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=black:s=64x64:d=2', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', '2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', path.join(raiz, s)]); f.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))); });
      fs.writeFileSync(path.join(raiz, 'trabajo', nombre, `render.${idioma}.json`), JSON.stringify({ ok: true, salidas: { horizontal: { ok: true, fichero: salidaH }, vertical: { ok: true, fichero: salidaV } } }));
      const salida = await run('publicar.mjs', nombre, '--idioma', idioma, '--solo', 'horizontal');
      assert.match(salida, /EN SECO \(nada subido/);
      assert.match(salida, new RegExp(`content-language:${idioma}`));
    }
  } finally {
    servidor.close();
    for (const f of falsos) fs.rmSync(f, { force: true });
    fs.rmSync(path.join(raiz, 'trabajo', nombre), { recursive: true, force: true });
    fs.rmSync(path.join(raiz, 'public/voz', nombre), { recursive: true, force: true });
    for (const idioma of ['es', 'en']) { fs.rmSync(path.join(raiz, 'props', `${nombre}.${idioma}.json`), { force: true }); fs.rmSync(path.join(raiz, 'salida', `${nombre}.${idioma}.mp4`), { force: true }); fs.rmSync(path.join(raiz, 'salida', `${nombre}.${idioma}.vertical.mp4`), { force: true }); }
  }
});
